import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.1/+esm";
import { SUPABASE_URL, SUPABASE_KEY } from "./config.js";

// Each check-in is a room at ?room=<code>. The code is the only key, so it's long and random.
const CODE_CHARS = "abcdefghjkmnpqrstuvwxyz23456789"; // no 0/o, 1/l/i look-alikes
function newCode() {
  return Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => CODE_CHARS[b % CODE_CHARS.length]).join("");
}
const roomParam = new URLSearchParams(location.search).get("room")?.toLowerCase() ?? "";
const ROOM = /^[a-z0-9]{10}$/.test(roomParam) ? roomParam : null; // null = start page

// The database only shows a room's rows to requests carrying its code (see supabase.sql).
function client(code) {
  return createClient(SUPABASE_URL, SUPABASE_KEY, { global: { headers: { "x-room": code } } });
}
const db = ROOM && client(ROOM);

// Rooms are only created by the button, never by opening a page.
async function createRoom() {
  const code = newCode();
  const { error } = await client(code).from("rooms").insert({ code });
  if (error) return console.error(error);
  location.assign(`?room=${code}`);
}

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
      { id: "melting", emoji: "🥵", label: "Melting" },
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

// Quick cheers during the why-round. Sent live to everyone, not stored.
const CHEERS = ["👏", "❤️", "😂", "💯", "🙌", "🤗"];
const CHEER_INTERVAL_MS = 250;

const VIBES = [
  { min: 3.5, emoji: "🚀", text: "The team is flying high" },
  { min: 2.75, emoji: "😊", text: "The team is feeling good" },
  { min: 2, emoji: "🌤️", text: "A mixed bag today" },
  { min: 0, emoji: "🤗", text: "A tough day. Be kind." },
];

const ICONS = {
  theme: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2v16a8 8 0 0 1 0-16Z"/></svg>',
};


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

// Emoji are drawn as Microsoft Fluent 3D images (docs/emoji/<code point>.png), so they look the same on every system.
function emo(emoji) {
  const file = [...emoji].filter((c) => c !== "️").map((c) => c.codePointAt(0).toString(16)).join("-");
  return `<img class="emoji" src="emoji/${file}.png" alt="" draggable="false">`;
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
  // Regions nested inside are replaced by new, empty elements, so forget what they showed.
  for (const child of el.querySelectorAll("[id]")) rendered.delete(child.id);
  rendered.set(id, html);
  el.innerHTML = html;
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
    p.innerHTML = emo(emoji);
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
      feed(`<span class="feed-emoji">${emo("👋")}</span><span><strong>${esc(name)}</strong> joined</span>`);
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
    feed(`<span class="feed-emoji">${emo(r?.emoji ?? "✨")}</span><span><strong>${esc(name)}</strong> is ${esc((r?.label ?? "here").toLowerCase())}</span>`);
  }
}

// ── State & connection ──────────────────────────

const S = {
  me: tabStore.get("checkin:me"), // the name this tab joined as, or null (just watching the board)
  state: null,
  data: null, // { reactions, order, speaker, shuffled } as last read from the database
  here: [], // names with the page open, from Realtime presence
  online: false,
  missing: false, // the ?room= link points to no room
  loads: 0,
  lastCheer: 0,
  pickedHere: new Set(), // names this device has reacted as since loading
  spin: null, // name shown while the random-order wheel spins, else null
};

/** Slot-machine spin through the speakers, slowing down until it lands on the first one. */
function spinWheel(order) {
  if (order.length < 2 || reducedMotion.matches) return render(); // no spin, but still show the round
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

/** Combines database rows and presence into the state the page renders, and plays effects. */
function publish() {
  if (!S.data) return;
  const prev = S.state;
  const next = { online: S.data.team.filter((n) => S.here.includes(n)), ...S.data };
  S.state = next;
  if (prev && prev.speaker < 0 && next.speaker === 0 && next.shuffled) spinWheel(next.order);
  else render();
  announce(prev, next);
}

// Both tables are tiny, so every change just re-reads them.
async function load() {
  const seq = ++S.loads;
  const [members, round] = await Promise.all([
    db.from("members").select("name, reaction").eq("room", ROOM).order("added_at"),
    db.from("rooms").select("order:speakers, speaker, shuffled").eq("code", ROOM).single(),
  ]);
  if (seq !== S.loads) return; // a newer read is on its way
  if (members.error || round.error) return console.error(members.error ?? round.error);
  S.data = {
    team: members.data.map((m) => m.name),
    reactions: Object.fromEntries(members.data.filter((m) => m.reaction).map((m) => [m.name, m.reaction])),
    ...round.data,
  };
  if (S.me && !S.data.team.includes(S.me)) leave(); // our name was removed
  publish();
}

const channel = db?.channel(`room:${ROOM}`, { config: { broadcast: { self: true } } });

async function connect() {
  // Marks the room as used so the cleanup job keeps it. No row back: wrong link or deleted room.
  const { data, error } = await db.from("rooms")
    .update({ last_used: new Date().toISOString() }).eq("code", ROOM).select("code");
  if (error) return console.error(error);
  if (!data.length) {
    S.missing = true;
    return render();
  }
  store.set("checkin:room", ROOM);
  channel
    // The database can't push changes past the room rules, so pages ping each other after writing.
    .on("broadcast", { event: "changed" }, load)
    .on("presence", { event: "sync" }, () => {
      S.here = Object.values(channel.presenceState()).flat().map((p) => p.name);
      publish();
    })
    .on("broadcast", { event: "cheer" }, ({ payload }) => {
      if (!CHEERS.includes(payload?.emoji)) return;
      burst(document.querySelector(".spotlight-emoji") ?? document.querySelector(".tiles"), payload.emoji, 4);
    })
    // Supabase reconnects by itself; re-read on every (re)connect to catch missed changes.
    .subscribe((status) => {
      S.online = status === "SUBSCRIBED";
      if (S.online) {
        channel.track({ name: S.me });
        load();
      }
      render();
    });
}

// Writes go to the database, then tell every open page (this one too) to re-read.
async function write(query, { notify = true } = {}) {
  const { error } = await query;
  if (error) return console.error(error);
  if (notify) channel.send({ type: "broadcast", event: "changed", payload: {} });
}

function setReaction(reaction) {
  return write(db.from("members").update({ reaction }).eq("room", ROOM).eq("name", S.me));
}

function addName(name) {
  return write(db.from("members").upsert({ room: ROOM, name }, { ignoreDuplicates: true }));
}

function removeName(name) {
  return write(db.from("members").delete().eq("room", ROOM).eq("name", name));
}

// With `fromSpeaker`, only applies if nobody moved the round on meanwhile (double clicks).
function setRound(fields, fromSpeaker) {
  let query = db.from("rooms").update(fields).eq("code", ROOM);
  if (fromSpeaker !== undefined) query = query.eq("speaker", fromSpeaker);
  return write(query);
}

function startRound(shuffled) {
  const order = S.state.team.filter((name) => S.state.reactions[name]);
  if (!order.length) return;
  if (shuffled) shuffle(order);
  return setRound({ speakers: order, speaker: 0, shuffled });
}

function endRound() {
  return setRound({ speakers: [], speaker: -1, shuffled: false });
}

function moveSpeaker(delta) {
  const { speaker, order } = S.state;
  if (speaker < 0 || speaker + delta < 0 || speaker + delta > order.length) return;
  return setRound({ speaker: speaker + delta }, speaker);
}

async function reset() {
  await write(db.from("members").update({ reaction: null }).eq("room", ROOM));
  await endRound();
}

function shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [list[i], list[j]] = [list[j], list[i]];
  }
}

function setMe(name) {
  S.me = name;
  tabStore.set("checkin:me", name ?? "");
  if (S.online) channel.track({ name });
  render();
  scrollTo({ top: 0 });
}

// Tapping a tile picks that name; tapping your own tile again un-picks it.
// The first pick adds a history entry, so the back button returns to "Who are you?".
function pickName(name) {
  if (name === S.me) return leave();
  if (!history.state?.picked) history.pushState({ picked: true }, "");
  setMe(name);
}

/**
 * Back to "Who are you?". With `wrongName`, also removes a reaction this device
 * made under that name, so it doesn't stay on the board for the wrong person.
 */
function leave({ wrongName = false } = {}) {
  if (wrongName && S.pickedHere.has(S.me) && S.state?.reactions[S.me]) {
    setReaction(null);
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

  if (!ROOM || S.missing) {
    patch("main", startHtml());
    return;
  }

  if (!st) {
    patch("main", `<p class="muted connecting">Connecting…</p>`);
    return;
  }

  // The add form sits outside the live regions, so a name being typed isn't wiped by updates.
  patch("main", `
    <div id="top"></div>
    <div class="layout">
      <aside class="picker-col">
        <div class="glass picker">
          <div id="picker-head"></div>
          <div id="picker"></div>
        </div>
      </aside>
      <section class="board-col">
        <div id="board"></div>
        <form class="add-name" data-form="add-name">
          <input class="input" name="name" maxlength="60" required autocomplete="off" placeholder="Add a name" aria-label="Name to add">
          <button class="btn btn-secondary">Add</button>
          <button class="btn btn-ghost" type="button" data-action="share">Copy link to invite</button>
        </form>
        <div id="controls"></div>
      </section>
    </div>`);
  // Until a name is picked, the board (where you pick it) comes first on narrow screens.
  document.querySelector(".layout").classList.toggle("is-choosing", !isMember);
  // During the why-round everyone sees the same focused view: spotlight + board, no picker.
  document.querySelector(".layout").classList.toggle("is-round", st.speaker >= 0);
  patch("top", st.speaker >= 0 ? spotlightHtml(st) : heroHtml(st));
  patch("picker-head", isMember ? pickerHeadHtml(st) : whoHtml(st));
  patch("picker", pickerHtml(st, isMember));
  patch("board", boardHtml(st));
  patch("controls", controlsHtml(st));
}

function startHtml() {
  const last = store.get("checkin:room");
  return `
    <section class="hero">
      <p class="eyebrow">${esc(today())}</p>
      <h1 class="headline">${S.missing ? "This room doesn't exist." : "Start a check-in"}</h1>
      <p class="lead">${S.missing
        ? "Check the link, or create a new room. Rooms nobody opens for 90 days are deleted."
        : "Create a room, share its link and add the people joining. Everyone with the link can do everything."}</p>
      <div class="btn-row start-actions">
        <button class="btn btn-primary" data-action="create-room">Create a room</button>
        ${last && last !== ROOM ? `<a class="btn btn-secondary" href="?room=${esc(last)}">Back to your last room</a>` : ""}
      </div>
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
        ? `${esc(vibe.text)} <span class="vibe-emoji" aria-hidden="true">${emo(vibe.emoji)}</span>`
        : "How is everyone today?"}</h1>
      <div class="meter" aria-label="${picked.length} of ${total} checked in">
        <div class="meter-track"><div class="meter-fill" style="width: ${total ? Math.round((picked.length / total) * 100) : 0}%"></div></div>
        <span class="meter-label"><strong>${picked.length}</strong> of ${total} checked in</span>
      </div>
    </section>`;
}

function whoHtml(st) {
  return `
    <div class="picker-head">
      <h2 class="section-label">Who are you?</h2>
      <p class="picker-current">${st.team.length
        ? "Tap your name on the board first. Then pick your vibe here."
        : "Add your name under the board, then tap it."}</p>
    </div>`;
}

function pickerHeadHtml(st) {
  const r = REACTION[st.reactions[S.me]];
  return `
    <div class="picker-head">
      <div class="picker-head-row">
        <h2 class="section-label">Your vibe, ${esc(S.me)}</h2>
        <button class="link-btn" data-action="wrong-name" title="Removes your pick so you can choose your real name">Not ${esc(S.me)}?</button>
      </div>
      <p class="picker-current" aria-live="polite">${r
        ? `<span class="picker-current-emoji">${emo(r.emoji)}</span> ${esc(r.label)}`
        : "Tap one. Everyone sees it live."}</p>
    </div>`;
}

function pickerHtml(st, isMember) {
  const mine = isMember ? st.reactions[S.me] : null;
  return GROUPS.map((g) => `
    <div class="picker-group">
      <h3 class="picker-title">${g.title}</h3>
      <div class="reactions" role="radiogroup" aria-label="${g.title}">
        ${g.reactions.map((x) => `
          <button class="reaction" role="radio" aria-checked="${mine === x.id}" data-action="react" data-id="${x.id}" title="${x.label}" ${isMember ? "" : "disabled"}>
            <span class="reaction-emoji" aria-hidden="true">${emo(x.emoji)}</span>
            <span class="reaction-label">${x.label}</span>
          </button>`).join("")}
      </div>
    </div>`).join("");
}

function boardHtml(st) {
  const inRound = st.speaker >= 0;
  const tiles = st.team.map((name) => {
    const r = REACTION[st.reactions[name]];
    const here = st.online.includes(name);
    const idx = st.order.indexOf(name);
    const speaking = inRound && idx === st.speaker;
    const done = inRound && idx !== -1 && idx < st.speaker;
    const cls = [
      r ? "has-reaction" : "",
      here ? "is-online" : "",
      name === S.me ? "is-me" : "",
      speaking ? "is-current" : "",
      done ? "is-shared" : "",
    ].join(" ");
    const label = speaking ? "Speaking now" : done ? "✓ Done" : r ? r.label : here ? "Choosing…" : "Not here yet";
    return `
      <li class="tile ${cls}" data-name="${esc(name)}">
        <button class="tile-remove" data-action="remove-name" data-name="${esc(name)}" aria-label="Remove ${esc(name)}" title="Remove ${esc(name)}">×</button>
        <span class="tile-presence" title="${here ? "Online" : "Away"}"></span>
        <span class="tile-emoji" aria-hidden="true">${r ? emo(r.emoji) : `<span class="tile-waiting"><i></i><i></i><i></i></span>`}</span>
        <button class="tile-name" data-action="pick-name" data-name="${esc(name)}" aria-pressed="${name === S.me}" title="${name === S.me ? "Tap again to un-pick" : `I'm ${esc(name)}`}">${esc(name)}${name === S.me ? " · you" : ""}</button>
        <span class="tile-label">${esc(label)}</span>
      </li>`;
  }).join("");
  const choosing = !st.team.includes(S.me);
  return `
    <h2 class="section-label">${inRound ? "The team · why-round" : choosing && tiles ? "Who are you? Tap your name" : "The team, live"}</h2>
    ${tiles ? `<ul class="tiles ${choosing ? "is-choosing" : ""}">${tiles}</ul>` : `<p class="muted">Nobody here yet. Add names below, then share the link.</p>`}`;
}

// Random order is the default; unticked, the round goes through the board left to right. Remembered per device.
const randomOrder = () => store.get("checkin:in-order") !== "1";

function controlsHtml(st) {
  if (st.speaker >= 0) return ""; // the spotlight has the round's buttons
  const any = st.team.some((n) => st.reactions[n]);
  return `
    <div class="controls">
      <button class="btn btn-primary" data-action="start" ${any ? "" : "disabled"}>Start why-round</button>
      <label class="toggle"><input type="checkbox" data-action="random-order" ${randomOrder() ? "checked" : ""}> Random order</label>
      <button class="btn btn-ghost" data-action="reset">Reset</button>
    </div>`;
}

function spotlightHtml(st) {
  const total = st.order.length;
  if (st.speaker >= total) {
    return `
      <section class="glass spotlight">
        <p class="eyebrow">Why-round · done</p>
        <div class="spotlight-emoji" aria-hidden="true">${emo("🎉")}</div>
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
        <div class="spotlight-emoji" aria-hidden="true">${emo(r?.emoji ?? "❔")}</div>
        <h1 class="spotlight-name">${esc(S.spin)}</h1>
        <p class="spotlight-question">${emo("🎰")} Spinning…</p>
      </section>`;
  }
  const name = st.order[st.speaker];
  const r = REACTION[st.reactions[name]];
  const isMe = name === S.me;
  return `
    <section class="glass spotlight" aria-live="polite">
      <p class="eyebrow">Why-round · ${st.speaker + 1} of ${total}</p>
      <div class="spotlight-emoji" aria-hidden="true" data-k="${esc(name)}">${emo(r?.emoji ?? "❔")}</div>
      <h1 class="spotlight-name">${isMe ? "Your turn" : esc(name)}</h1>
      <p class="spotlight-question">Why ${isMe ? "did you" : `did ${esc(name)}`} pick “${esc(r?.label ?? "this")}”?</p>
      <div class="cheers" role="group" aria-label="Send a cheer">
        ${CHEERS.map((c) => `<button class="cheer" data-action="cheer" data-emoji="${c}" aria-label="Cheer ${c}">${emo(c)}</button>`).join("")}
      </div>
      <div class="btn-row">
        <button class="btn btn-secondary" data-action="prev" ${st.speaker === 0 ? "disabled" : ""}>Previous</button>
        <button class="btn btn-primary" data-action="next">${st.speaker === total - 1 ? "Finish" : "Next person"}</button>
      </div>
      <button class="btn btn-ghost spotlight-end" data-action="end">End why-round</button>
    </section>`;
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
    case "wrong-name": return leave({ wrongName: true });
    case "react": {
      if (!S.online || !S.state.team.includes(S.me)) return;
      const id = target.dataset.id;
      const unpick = S.state.reactions[S.me] === id;
      S.pickedHere.add(S.me);
      if (!unpick) burst(target, REACTION[id].emoji);
      return setReaction(unpick ? null : id);
    }
    case "cheer": {
      if (Date.now() - S.lastCheer < CHEER_INTERVAL_MS) return;
      S.lastCheer = Date.now();
      return channel.send({ type: "broadcast", event: "cheer", payload: { emoji: target.dataset.emoji } });
    }
    case "share":
      try {
        await navigator.clipboard.writeText(location.href);
        feed(`<span class="feed-emoji">${emo("🔗")}</span><span>Link copied. Anyone with it can join and edit.</span>`);
      } catch {
        prompt("Copy this link:", location.href);
      }
      return;
    case "create-room":
      target.disabled = true;
      await createRoom();
      target.disabled = false; // only reached if creating failed
      return;
    case "remove-name": {
      const name = target.dataset.name;
      if (await confirmDialog({
        title: `Remove ${name}?`,
        body: `${name} and their reaction are removed for everyone.`,
        ok: "Remove",
      })) removeName(name);
      return;
    }
    case "start": return startRound(randomOrder());
    case "random-order": return store.set("checkin:in-order", target.checked ? "" : "1");
    case "next": return moveSpeaker(1);
    case "prev": return moveSpeaker(-1);
    case "end": return endRound();
    case "reset":
      if (await confirmDialog({
        title: "Reset check-in?",
        body: "All reactions are cleared for everyone. This cannot be undone.",
        ok: "Reset",
      })) reset();
      return;
  }
});

document.addEventListener("submit", async (event) => {
  if (event.target.dataset.form !== "add-name") return;
  event.preventDefault();
  const input = event.target.elements.name;
  const typed = input.value.trim().replace(/\s+/g, " ");
  if (!typed) return;
  input.value = "";
  // "ingrida" joins as the existing "Ingrida" instead of adding a second one.
  const name = S.state?.team.find((n) => n.toLowerCase() === typed.toLowerCase()) ?? typed;
  if (!S.state?.team.includes(name)) await addName(name);
});

// ── Boot ────────────────────────────────────────

document.getElementById("app").innerHTML = `
  <div class="glow" aria-hidden="true"></div>
  <header class="site-header">
    <div class="container">
      <a class="brand" href="${ROOM ? `?room=${ROOM}` : "./"}" data-action="home" title="Back to start">Team Check-in</a>
      <div class="header-live" id="live"></div>
      <div class="header-actions">
        ${ROOM ? `<button class="btn btn-ghost" data-action="share" title="Copy the link to this check-in">Share</button>` : ""}
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
if (ROOM) connect();
