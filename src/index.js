import { DurableObject } from "cloudflare:workers";
import teamNames from "../team.json";

// The team's names, shown on the "Who are you?" screen. Edit team.json and redeploy.
const TEAM = [...new Set(teamNames.map((n) => String(n).trim()).filter(Boolean))];

// Reaction ids are defined in public/app.js; the server only checks their shape.
const REACTION_RE = /^[a-z-]{1,24}$/;

// Quick cheers during the why-round. Keep in sync with CHEERS in public/app.js.
const CHEERS = new Set(["👏", "❤️", "😂", "💯", "🙌", "🫶"]);
const CHEER_INTERVAL_MS = 250;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/ws") {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected WebSocket", { status: 426 });
      }
      // The whole team shares a single room.
      return env.CHECKIN.get(env.CHECKIN.idFromName("team")).fetch(request);
    }
    return Response.json({ error: "Not found" }, { status: 404 });
  },
};

function freshState() {
  return {
    reactions: {}, // name -> reaction id
    order: [], // names in speaking order for the why-round
    speaker: -1, // -1 = no why-round, order.length = finished
    shuffled: false, // order was randomised; browsers spin a wheel before the first speaker
  };
}

/** Holds the team's reactions and pushes every change live to all open browsers. */
export class CheckinRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    // Answered by the runtime without waking the object from hibernation.
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
    ctx.blockConcurrencyWhile(async () => {
      this.state = { ...freshState(), ...(await ctx.storage.get("state")) };
    });
  }

  async fetch() {
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ name: null });
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, raw) {
    if (typeof raw !== "string" || raw.length > 1000) return;
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    if (msg.type === "iam") {
      ws.serializeAttachment({ name: TEAM.includes(msg.name) ? msg.name : null });
      this.broadcast(); // presence changed
      return;
    }

    // Cheers are passed straight through to everyone and not stored.
    if (msg.type === "cheer") {
      const att = ws.deserializeAttachment() ?? {};
      const now = Date.now();
      if (!CHEERS.has(msg.emoji) || now - (att.lastCheer ?? 0) < CHEER_INTERVAL_MS) return;
      ws.serializeAttachment({ ...att, lastCheer: now });
      const event = JSON.stringify({ type: "cheer", emoji: msg.emoji });
      for (const other of this.ctx.getWebSockets()) {
        try {
          other.send(event);
        } catch {}
      }
      return;
    }

    if (!this.handle(msg, ws)) return;
    await this.ctx.storage.put("state", this.state);
    this.broadcast();
  }

  /** Applies a message to the state. Returns true if anything changed. */
  handle(msg, ws) {
    const s = this.state;
    switch (msg.type) {
      case "react": {
        const { name } = ws.deserializeAttachment() ?? {};
        if (!name) return false;
        if (msg.reaction === null) delete s.reactions[name];
        else if (typeof msg.reaction === "string" && REACTION_RE.test(msg.reaction)) s.reactions[name] = msg.reaction;
        else return false;
        return true;
      }
      case "start": {
        const order = TEAM.filter((name) => s.reactions[name]);
        if (order.length === 0) return false;
        if (msg.shuffle) shuffle(order);
        s.shuffled = Boolean(msg.shuffle);
        s.order = order;
        s.speaker = 0;
        return true;
      }
      case "next": {
        if (s.speaker < 0 || s.speaker >= s.order.length) return false;
        s.speaker += 1;
        return true;
      }
      case "prev": {
        if (s.speaker <= 0) return false;
        s.speaker -= 1;
        return true;
      }
      case "end": {
        s.order = [];
        s.speaker = -1;
        s.shuffled = false;
        return true;
      }
      case "reset": {
        this.state = freshState();
        return true;
      }
    }
    return false;
  }

  broadcast() {
    const sockets = this.ctx.getWebSockets().filter((ws) => ws.readyState === WebSocket.OPEN);
    const online = new Set(sockets.map((ws) => ws.deserializeAttachment()?.name).filter(Boolean));
    const message = JSON.stringify({
      type: "state",
      team: TEAM,
      online: TEAM.filter((n) => online.has(n)),
      watchers: sockets.length,
      ...this.state,
    });
    for (const ws of sockets) {
      try {
        ws.send(message);
      } catch {}
    }
  }

  async webSocketClose(ws) {
    try {
      ws.close(1000, "Closed");
    } catch {}
    this.broadcast();
  }
}

function shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [list[i], list[j]] = [list[j], list[i]];
  }
}
