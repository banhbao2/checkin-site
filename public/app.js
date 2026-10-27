// Reactions, grouped from best to roughest. `score` drives the team vibe headline.
const GROUPS = [
  {
    title: "Flying high", score: 4, reactions: [
      { id: "fire", emoji: "🔥", label: "On fire" },
      { id: "rocket", emoji: "🚀", label: "Ready to launch" },
      { id: "starstruck", emoji: "🤩", label: "Excited" },
      { id: "party", emoji: "🥳", label: "Celebrating" },
      { id: "cool", emoji: "😎", label: "Confident" },
      { id: "unicorn", emoji: "🦄", label: "Magical" },
    ],
  },
  {
    title: "Feeling good", score: 3, reactions: [
      { id: "happy", emoji: "😊", label: "Happy" },
      { id: "zen", emoji: "🧘", label: "Zen" },
      { id: "sunny", emoji: "☀️", label: "Sunny" },
      { id: "focus", emoji: "🎧", label: "In the zone" },
      { id: "growing", emoji: "🌱", label: "Growing" },
      { id: "strong", emoji: "💪", label: "Strong" },
    ],
  },
  {
    title: "So-so", score: 2, reactions: [
      { id: "neutral", emoji: "😐", label: "Neutral" },
      { id: "thinking", emoji: "🤔", label: "Pondering" },
      { id: "coffee", emoji: "☕", label: "Need coffee" },
      { id: "cloudy", emoji: "🌥️", label: "Cloudy" },
      { id: "turtle", emoji: "🐢", label: "Slow start" },
      { id: "melting", emoji: "🫠", label: "Melting" },
    ],
  },
  {
    title: "Rough day", score: 1, reactions: [
      { id: "tired", emoji: "😴", label: "Tired" },
      { id: "overwhelmed", emoji: "🤯", label: "Overwhelmed" },
      { id: "frustrated", emoji: "😤", label: "Frustrated" },
      { id: "sad", emoji: "😢", label: "Down" },
      { id: "sick", emoji: "🤒", label: "Unwell" },
      { id: "storm", emoji: "⛈️", label: "Stormy" },
    ],
  },
  {
    // Fun extras; they don't count towards the team vibe.
    title: "Wildcards", score: null, reactions: [
      { id: "juggling", emoji: "🤹", label: "Juggling a lot" },
      { id: "octopus", emoji: "🐙", label: "Multitasking" },
      { id: "brain", emoji: "🧠", label: "Big brain day" },
      { id: "sloth", emoji: "🦥", label: "Sloth mode" },
      { id: "pizza", emoji: "🍕", label: "Hungry" },
      { id: "beach", emoji: "🏖️", label: "Holiday mood" },
    ],
  },
];
const REACTION = Object.fromEntries(GROUPS.flatMap((g) =>
  g.reactions.map((r) => [r.id, { ...r, score: g.score }])));

// Quick cheers during the why-round. Keep in sync with CHEERS in src/index.js.
const CHEERS = ["👏", "❤️", "😂", "💯", "🙌", "🫶"];

const VIBES = [
  { min: 3.5, emoji: "🚀", text: "The team is flying high" },
  { min: 2.75, emoji: "😊", text: "The team is feeling good" },
  { min: 2, emoji: "🌤️", text: "A mixed bag today" },
  { min: 0, emoji: "🫂", text: "A tough day. Be kind." },
];

const ICONS = {
  theme: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2v16a8 8 0 0 1 0-16Z"/></svg>',
};

const WATCHING = "\u0000watching"; // stored instead of a name by people who only watch

// ── Small helpers ───────────────────────────────

// `store` survives across visits; `tabStore` only lasts while this tab is open.
function makeStore(storage) {
  return {
    get(key) {
      try { return storage().getItem(key); } catch { return null; }
    },
    set(key, value) {
      try { storage().setItem(key, value); } catch {}
    },
  };
}
const store = makeStore(() => localStorage);
const tabStore = makeStore(() => sessionStorage);

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

function confirmDialog({ title, body, ok }) {
  const dialog = document.getElementById("confirm-dialog");
  dialog.querySelector("#confirm-title").textContent = title;
  dialog.querySelector("#confirm-body").textContent = body;
  dialog.querySelector("#confirm-ok").textContent = ok;
  dialog.returnValue = "";
  dialog.showModal();
  return new Promise((resolve) => {
    dialog.addEventListener("close", () => resolve(dialog.returnValue === "ok"), { once: true });
  });
}

// Re-render a region only when its markup changed, so running animations aren't restarted.
const rendered = new Map();
function patch(id, html) {
  const el = document.getElementById(id);
  if (!el || rendered.get(id) === html) return;
  rendered.set(id, html);
  el.innerHTML = html;
  // Regions nested inside were replaced too.
  for (const key of rendered.keys()) {
    if (key !== id && !document.getElementById(key)?.isConnected) rendered.delete(key);
  }
}

function toggleTheme() {
  const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
  document.documentElement.dataset.theme = next;
  store.set("checkin:theme", next);
}
document.documentElement.dataset.theme = store.get("checkin:theme") || "light";

// ── Live effects ────────────────────────────────

/** Floats a few copies of an emoji up from an element. */
function burst(el, emoji, count = 7) {
  if (!el || reducedMotion.matches) return;
  const rect = el.getBoundingClientRect();
  const layer = document.getElementById("fx");
  for (let i = 0; i < count; i++) {
    const p = document.createElement("span");
    p.className = "fx-emoji";
    p.textContent = emoji;
    p.style.left = `${rect.left + rect.width / 2}px`;
    p.style.top = `${rect.top + rect.height / 2}px`;
    p.style.setProperty("--dx", `${(Math.random() - 0.5) * 160}px`);
    p.style.setProperty("--dy", `${-120 - Math.random() * 140}px`);
    p.style.setProperty("--rot", `${(Math.random() - 0.5) * 70}deg`);
    p.style.setProperty("--size", `${20 + Math.random() * 18}px`);
    p.style.animationDelay = `${i * 45}ms`;
    layer.append(p);
    setTimeout(() => p.remove(), 1800);
  }
}

/** Short message in the live feed (bottom left). */
function feed(html) {
  const list = document.getElementById("feed");
  const item = document.createElement("li");
  item.className = "feed-item";
  item.innerHTML = html;
  list.prepend(item);
  while (list.children.length > 4) list.lastElementChild.remove();
  setTimeout(() => item.classList.add("is-leaving"), 3600);
  setTimeout(() => item.remove(), 4000);
}

function tileFor(name) {
  return document.querySelector(`.tile[data-name="${CSS.escape(name)}"]`);
}

function pulse(el, cls) {
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth; // restart the animation
  el.classList.add(cls);
}

/** Compares the new state to the previous one and plays join / reaction effects. */
function announce(prev, next) {
  if (!prev) return;
  for (const name of next.online) {
    if (!prev.online.includes(name) && name !== S.me) {
      feed(`<span class="feed-emoji">👋</span><span><strong>${esc(name)}</strong> joined</span>`);
      pulse(tileFor(name), "is-joined");
    }
  }
  for (const name of next.team) {
    const before = prev.reactions[name];
    const after = next.reactions[name];
    if (!after || after === before) continue;
    const r = REACTION[after];
    pulse(tileFor(name), "is-popped");
    if (name === S.me) continue; // own picks already burst from the picker
    burst(tileFor(name)?.querySelector(".tile-emoji"), r?.emoji ?? "✨");
    feed(`<span class="feed-emoji">${r?.emoji ?? "✨"}</span><span><strong>${esc(name)}</strong> is ${esc((r?.label ?? "here").toLowerCase())}</span>`);
  }
}

// ── State & connection ──────────────────────────

const S = {
  me: tabStore.get("checkin:me"), // a team name, WATCHING, or null; fresh visits start at the name list
  ws: null,
  state: null,
  online: false,
  retries: 0,
  pickedHere: new Set(), // names this device has reacted as since loading
  spin: null, // name shown while the random-order wheel spins, else null
};

/** Slot-machine spin through the speakers, slowing down until it lands on the first one. */
function spinWheel(order) {
  if (order.length < 2 || reducedMotion.matches) return;
  const ticks = 14 + order.length; // ends on order[0]
  let i = 0;
  const step = () => {
    // Stop if the round was ended or moved on meanwhile.
    if (S.state?.speaker !== 0 || S.state.order[0] !== order[0]) {
      S.spin = null;
      return render();
    }
    if (i >= ticks) {
      S.spin = null;
      render();
      return burst(document.querySelector(".spotlight-emoji"), "🎉", 10);
    }
    S.spin = order[(i + order.length - (ticks % order.length)) % order.length];
    render();
    i += 1;
    setTimeout(step, 50 + 260 * (i / ticks) ** 3);
  };
  step();
}

function connect() {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  const ws = new WebSocket(`${proto}://${location.host}/api/ws`);
  S.ws = ws;

  ws.addEventListener("open", () => {
    S.retries = 0;
    S.online = true;
    ws.send(JSON.stringify({ type: "iam", name: S.me }));
    render();
  });

  ws.addEventListener("message", (event) => {
    let msg;
    try { msg = JSON.parse(event.data); } catch { return; }
    if (msg.type === "cheer") {
      burst(document.querySelector(".spotlight-emoji") ?? document.querySelector(".tiles"), msg.emoji, 4);
      return;
    }
    if (msg.type !== "state") return;
    const prev = S.state;
    S.state = msg;
    if (prev && prev.speaker < 0 && msg.speaker === 0 && msg.shuffled) spinWheel(msg.order);
    else render();
    announce(prev, msg);
  });

  ws.addEventListener("close", () => {
    S.online = false;
    render();
    setTimeout(connect, Math.min(10000, 500 * 2 ** S.retries++));
  });
}

function send(msg) {
  if (S.ws?.readyState !== WebSocket.OPEN) return false;
  S.ws.send(JSON.stringify(msg));
  return true;
}

function setMe(name) {
  S.me = name;
  tabStore.set("checkin:me", name ?? "");
  send({ type: "iam", name });
  render();
  scrollTo({ top: 0 });
}

// Picking a name adds a history entry, so the back button returns to "Who are you?".
function pickName(name) {
  setMe(name);
  history.pushState({ picked: true }, "");
}

/**
 * Back to "Who are you?". With `wrongName`, also removes a reaction this device
 * made under that name, so it doesn't stay on the board for the wrong person.
 */
function leave({ wrongName = false } = {}) {
  if (wrongName && S.pickedHere.has(S.me) && S.state?.reactions[S.me]) {
    send({ type: "react", reaction: null });
  }
  S.pickedHere.delete(S.me);
  setMe(null);
  if (history.state?.picked) history.replaceState(null, "");
}

addEventListener("popstate", () => {
  if (S.me) leave();
});

// ── Rendering ───────────────────────────────────

function render() {
  const st = S.state;
  const isMember = Boolean(st?.team.includes(S.me));

  patch("live", st ? `
    <span class="live-badge ${S.online ? "" : "is-off"}" title="${S.online ? "Live" : "Reconnecting…"}">
      <span class="live-dot"></span>${S.online ? "Live" : "Offline"}
    </span>
    <span class="live-count">${st.online.length} of ${st.team.length} here</span>` : "");

  patch("who", isMember || S.me === WATCHING
    ? `<button class="who-chip" data-action="switch" title="Back to the name list">
        <span class="who-name">${isMember ? esc(S.me) : "Watching"}</span><span class="who-change">Change</span>
      </button>`
    : "");

  if (!st) {
    patch("main", `<p class="muted connecting">Connecting…</p>`);
    return;
  }

  if (!st.team.length) {
    patch("main", `
      <section class="hero">
        <h1 class="headline">No team yet.</h1>
        <p class="lead">The team list hasn't been set up yet. Ask the person who runs this check-in to add the names.</p>
      </section>`);
    return;
  }

  if (!isMember && S.me !== WATCHING) {
    patch("main", whoHtml(st));
    return;
  }

  patch("main", `
    <div id="top"></div>
    <div class="layout ${isMember ? "" : "is-watching"}">
      ${isMember ? `<aside class="picker-col" id="picker"></aside>` : ""}
      <section class="board-col">
        <div id="board"></div>
        <div id="controls"></div>
      </section>
    </div>`);
  patch("top", st.speaker >= 0 ? spotlightHtml(st) : heroHtml(st));
  if (isMember) patch("picker", pickerHtml(st));
  patch("board", boardHtml(st));
  patch("controls", controlsHtml(st));
}

function whoHtml(st) {
  const names = st.team.map((name) => {
    const r = REACTION[st.reactions[name]];
    const here = st.online.includes(name);
    const status = r ? r.label : here ? "Already here" : "";
    return `
      <button class="name-btn" data-action="pick-name" data-name="${esc(name)}">
        <span class="name-avatar ${here ? "is-online" : ""}">${r ? r.emoji : esc(initials(name))}</span>
        <span class="name-text">
          <span>${esc(name)}</span>
          ${status ? `<span class="name-status">${esc(status)}</span>` : ""}
        </span>
      </button>`;
  }).join("");
  return `
    <section class="hero">
      <p class="eyebrow">${esc(today())}</p>
      <h1 class="headline">Who are you?</h1>
      <p class="lead">Pick your name to join the check-in.</p>
      <div class="names">${names}</div>
      <button class="btn btn-ghost" data-action="watch" style="margin-top: var(--space-lg); padding-left: 0">Just watching (for screen sharing)</button>
    </section>`;
}

function heroHtml(st) {
  const picked = st.team.filter((n) => st.reactions[n]);
  const total = st.team.length;
  const scores = picked.map((n) => REACTION[st.reactions[n]]?.score).filter((s) => s != null);
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  const vibe = avg === null ? null : VIBES.find((v) => avg >= v.min);
  return `
    <section class="hero hero-compact">
      <p class="eyebrow">${esc(today())} · Check-in</p>
      <h1 class="headline">${vibe
        ? `${esc(vibe.text)} <span class="vibe-emoji" aria-hidden="true">${vibe.emoji}</span>`
        : "How is everyone today?"}</h1>
      <div class="meter" aria-label="${picked.length} of ${total} checked in">
        <div class="meter-track"><div class="meter-fill" style="width: ${Math.round((picked.length / total) * 100)}%"></div></div>
        <span class="meter-label"><strong>${picked.length}</strong> of ${total} checked in</span>
      </div>
    </section>`;
}

function pickerHtml(st) {
  const mine = st.reactions[S.me];
  const r = REACTION[mine];
  const groups = GROUPS.map((g) => `
    <div class="picker-group">
      <h3 class="picker-title">${g.title}</h3>
      <div class="reactions" role="radiogroup" aria-label="${g.title}">
        ${g.reactions.map((x) => `
          <button class="reaction" role="radio" aria-checked="${mine === x.id}" data-action="react" data-id="${x.id}" title="${x.label}">
            <span class="reaction-emoji" aria-hidden="true">${x.emoji}</span>
            <span class="reaction-label">${x.label}</span>
          </button>`).join("")}
      </div>
    </div>`).join("");
  return `
    <div class="glass picker">
      <div class="picker-head">
        <div class="picker-head-row">
          <h2 class="section-label">Your vibe, ${esc(S.me)}</h2>
          <button class="link-btn" data-action="wrong-name" title="Removes your pick and goes back to the name list">Not ${esc(S.me)}?</button>
        </div>
        <p class="picker-current" aria-live="polite">${r
          ? `<span class="picker-current-emoji">${r.emoji}</span> ${esc(r.label)}`
          : "Tap one. Everyone sees it live."}</p>
      </div>
      ${groups}
    </div>`;
}

function boardHtml(st) {
  const inRound = st.speaker >= 0;
  const tiles = st.team.map((name) => {
    const r = REACTION[st.reactions[name]];
    const here = st.online.includes(name);
    const idx = st.order.indexOf(name);
    const cls = [
      r ? "has-reaction" : "",
      here ? "is-online" : "",
      name === S.me ? "is-me" : "",
      inRound && idx === st.speaker ? "is-current" : "",
      inRound && idx !== -1 && idx < st.speaker ? "is-shared" : "",
    ].join(" ");
    return `
      <li class="tile ${cls}" data-name="${esc(name)}">
        <span class="tile-presence" title="${here ? "Online" : "Away"}"></span>
        <span class="tile-emoji" aria-hidden="true">${r ? r.emoji : `<span class="tile-waiting"><i></i><i></i><i></i></span>`}</span>
        <span class="tile-name">${esc(name)}${name === S.me ? " · you" : ""}</span>
        <span class="tile-label">${r ? esc(r.label) : here ? "Choosing…" : "Not here yet"}</span>
      </li>`;
  }).join("");
  return `
    <h2 class="section-label">The team, live</h2>
    <ul class="tiles">${tiles}</ul>`;
}

function controlsHtml(st) {
  const any = st.team.some((n) => st.reactions[n]);
  const inRound = st.speaker >= 0;
  return `
    <div class="controls">
      ${inRound
        ? `<button class="btn btn-secondary" data-action="end">End why-round</button>`
        : `<button class="btn btn-primary" data-action="start" ${any ? "" : "disabled"}>Start why-round</button>
           <button class="btn btn-secondary" data-action="start-shuffled" ${any ? "" : "disabled"}>Random order</button>`}
      <button class="btn btn-ghost" data-action="reset">Reset</button>
    </div>`;
}

function spotlightHtml(st) {
  const total = st.order.length;
  if (st.speaker >= total) {
    return `
      <section class="glass spotlight">
        <p class="eyebrow">Why-round · done</p>
        <div class="spotlight-emoji" aria-hidden="true">🎉</div>
        <h1 class="spotlight-name">Thanks, team.</h1>
        <div class="btn-row">
          <button class="btn btn-secondary" data-action="prev">Back</button>
          <button class="btn btn-primary" data-action="end">Close</button>
        </div>
      </section>`;
  }
  if (S.spin) {
    const r = REACTION[st.reactions[S.spin]];
    return `
      <section class="glass spotlight is-spinning">
        <p class="eyebrow">Random order · who goes first?</p>
        <div class="spotlight-emoji" aria-hidden="true">${r?.emoji ?? "❔"}</div>
        <h1 class="spotlight-name">${esc(S.spin)}</h1>
        <p class="spotlight-question">🎰 Spinning…</p>
      </section>`;
  }
  const name = st.order[st.speaker];
  const r = REACTION[st.reactions[name]];
  const isMe = name === S.me;
  return `
    <section class="glass spotlight" aria-live="polite">
      <p class="eyebrow">Why-round · ${st.speaker + 1} of ${total}</p>
      <div class="spotlight-emoji" aria-hidden="true" data-k="${esc(name)}">${r?.emoji ?? "❔"}</div>
      <h1 class="spotlight-name">${isMe ? "Your turn" : esc(name)}</h1>
      <p class="spotlight-question">Why ${isMe ? "did you" : `did ${esc(name)}`} pick “${esc(r?.label ?? "this")}”?</p>
      <div class="cheers" role="group" aria-label="Send a cheer">
        ${CHEERS.map((c) => `<button class="cheer" data-action="cheer" data-emoji="${c}" aria-label="Cheer ${c}">${c}</button>`).join("")}
      </div>
      <div class="btn-row">
        <button class="btn btn-secondary" data-action="prev" ${st.speaker === 0 ? "disabled" : ""}>Previous</button>
        <button class="btn btn-primary" data-action="next">${st.speaker === total - 1 ? "Finish" : "Next person"}</button>
      </div>
    </section>`;
}

function initials(name) {
  return name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function today() {
  return new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

// ── Events ──────────────────────────────────────

document.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-action]");
  if (!target || target.disabled) return;
  const { action } = target.dataset;

  switch (action) {
    case "theme": return toggleTheme();
    case "home":
      event.preventDefault();
      return leave();
    case "pick-name": return pickName(target.dataset.name);
    case "watch": return pickName(WATCHING);
    case "switch": return leave();
    case "wrong-name": return leave({ wrongName: true });
    case "react": {
      const id = target.dataset.id;
      const unpick = S.state?.reactions[S.me] === id;
      if (send({ type: "react", reaction: unpick ? null : id })) {
        S.pickedHere.add(S.me);
        if (!unpick) burst(target, REACTION[id].emoji);
      }
      return;
    }
    case "cheer": return send({ type: "cheer", emoji: target.dataset.emoji });
    case "start": return send({ type: "start", shuffle: false });
    case "start-shuffled": return send({ type: "start", shuffle: true });
    case "next": return send({ type: "next" });
    case "prev": return send({ type: "prev" });
    case "end": return send({ type: "end" });
    case "reset":
      if (await confirmDialog({
        title: "Reset check-in?",
        body: "All reactions are cleared for everyone. This cannot be undone.",
        ok: "Reset",
      })) send({ type: "reset" });
      return;
  }
});

// ── Boot ────────────────────────────────────────

document.getElementById("app").innerHTML = `
  <div class="glow" aria-hidden="true"></div>
  <header class="site-header">
    <div class="container">
      <a class="brand" href="/" data-action="home" title="Back to start">Team Check-in</a>
      <div class="header-live" id="live"></div>
      <div class="header-actions">
        <div id="who"></div>
        <button class="icon-btn" data-action="theme" title="Switch light / dark mode" aria-label="Switch light or dark mode">${ICONS.theme}</button>
      </div>
    </div>
  </header>
  <main class="page">
    <div class="container" id="main"></div>
  </main>
  <ul class="feed" id="feed" aria-live="polite"></ul>
  <div class="fx" id="fx" aria-hidden="true"></div>`;

render();
connect();
setInterval(() => S.ws?.readyState === WebSocket.OPEN && S.ws.send("ping"), 25000);
