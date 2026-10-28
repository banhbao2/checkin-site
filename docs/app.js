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
    title: { de: "Im Höhenflug", en: "Flying high" }, score: 4, reactions: [
      { id: "fire", emoji: "🔥", label: { de: "Brennt drauf", en: "On fire" } },
      { id: "rocket", emoji: "🚀", label: { de: "Startklar", en: "Ready to launch" } },
      { id: "starstruck", emoji: "🤩", label: { de: "Begeistert", en: "Excited" } },
      { id: "party", emoji: "🥳", label: { de: "In Feierlaune", en: "Celebrating" } },
      { id: "cool", emoji: "😎", label: { de: "Selbstbewusst", en: "Confident" } },
      { id: "unicorn", emoji: "🦄", label: { de: "Magisch", en: "Magical" } },
    ],
  },
  {
    title: { de: "Gut drauf", en: "Feeling good" }, score: 3, reactions: [
      { id: "happy", emoji: "😊", label: { de: "Glücklich", en: "Happy" } },
      { id: "zen", emoji: "🧘", label: { de: "Zen", en: "Zen" } },
      { id: "sunny", emoji: "☀️", label: { de: "Sonnig", en: "Sunny" } },
      { id: "focus", emoji: "🎧", label: { de: "Im Flow", en: "In the zone" } },
      { id: "growing", emoji: "🌱", label: { de: "Am Wachsen", en: "Growing" } },
      { id: "strong", emoji: "💪", label: { de: "Stark", en: "Strong" } },
    ],
  },
  {
    title: { de: "Geht so", en: "So-so" }, score: 2, reactions: [
      { id: "neutral", emoji: "😐", label: { de: "Neutral", en: "Neutral" } },
      { id: "thinking", emoji: "🤔", label: { de: "Nachdenklich", en: "Pondering" } },
      { id: "coffee", emoji: "☕", label: { de: "Brauche Kaffee", en: "Need coffee" } },
      { id: "cloudy", emoji: "🌥️", label: { de: "Bewölkt", en: "Cloudy" } },
      { id: "turtle", emoji: "🐢", label: { de: "Langsamer Start", en: "Slow start" } },
      { id: "melting", emoji: "🥵", label: { de: "Am Schmelzen", en: "Melting" } },
    ],
  },
  {
    title: { de: "Harter Tag", en: "Rough day" }, score: 1, reactions: [
      { id: "tired", emoji: "😴", label: { de: "Müde", en: "Tired" } },
      { id: "overwhelmed", emoji: "🤯", label: { de: "Überfordert", en: "Overwhelmed" } },
      { id: "frustrated", emoji: "😤", label: { de: "Frustriert", en: "Frustrated" } },
      { id: "sad", emoji: "😢", label: { de: "Niedergeschlagen", en: "Down" } },
      { id: "sick", emoji: "🤒", label: { de: "Angeschlagen", en: "Unwell" } },
      { id: "storm", emoji: "⛈️", label: { de: "Stürmisch", en: "Stormy" } },
    ],
  },
  {
    // Fun extras; they don't count towards the team vibe.
    title: { de: "Joker", en: "Wildcards" }, score: null, reactions: [
      { id: "juggling", emoji: "🤹", label: { de: "Viel zu jonglieren", en: "Juggling a lot" } },
      { id: "octopus", emoji: "🐙", label: { de: "Multitasking", en: "Multitasking" } },
      { id: "brain", emoji: "🧠", label: { de: "Geistesblitz-Tag", en: "Big brain day" } },
      { id: "sloth", emoji: "🦥", label: { de: "Faultier-Modus", en: "Sloth mode" } },
      { id: "pizza", emoji: "🍕", label: { de: "Hungrig", en: "Hungry" } },
      { id: "beach", emoji: "🏖️", label: { de: "Urlaubsstimmung", en: "Holiday mood" } },
    ],
  },
];
const REACTION = Object.fromEntries(GROUPS.flatMap((g) =>
  g.reactions.map((r) => [r.id, { ...r, score: g.score }])));

// Quick cheers during the lightning round. Sent live to everyone, not stored.
const CHEERS = ["👏", "❤️", "😂", "💯", "🙌", "🤗"];
const CHEER_INTERVAL_MS = 250;

const VIBES = [
  { min: 3.5, emoji: "🚀", text: { de: "Das Team ist im Höhenflug", en: "The team is flying high" } },
  { min: 2.75, emoji: "😊", text: { de: "Das Team ist gut drauf", en: "The team is feeling good" } },
  { min: 2, emoji: "🌤️", text: { de: "Heute ein bunter Mix", en: "A mixed bag today" } },
  { min: 0, emoji: "🤗", text: { de: "Ein harter Tag. Seid nett zueinander.", en: "A tough day. Be kind." } },
];

// UI text. Callers escape names and labels before passing them in.
const STRINGS = {
  de: {
    locale: "de-DE",
    langBtn: "EN", langTitle: "Switch to English",
    homeTitle: "Zurück zum Start", share: "Teilen", shareTitle: "Link zu diesem Check-in kopieren",
    themeTitle: "Hell / Dunkel wechseln",
    live: "Live", offline: "Offline", reconnecting: "Verbinde neu…", connecting: "Verbinde…",
    hereCount: (n, total) => `${n} von ${total} da`,
    startTitle: "Check-in starten", missingTitle: "Diesen Raum gibt es nicht.",
    startLead: "Erstelle einen Raum, teile den Link und füge die Teilnehmenden hinzu. Alle mit dem Link können alles.",
    missingLead: "Prüfe den Link oder erstelle einen neuen Raum. Räume, die 90 Tage niemand öffnet, werden gelöscht.",
    createRoom: "Raum erstellen", lastRoom: "Zurück zum letzten Raum",
    howIsEveryone: "Wie geht’s euch heute?",
    ofCheckedIn: (total) => `von ${total} eingecheckt`,
    whoAreYou: "Wer bist du?",
    whoHint: "Tippe zuerst auf dem Board auf deinen Namen. Dann wähle hier deine Stimmung.",
    whoHintEmpty: "Füge unter dem Board deinen Namen hinzu und tippe ihn dann an.",
    yourVibe: (name) => `Deine Stimmung, ${name}`,
    notMe: (name) => `Nicht ${name}?`,
    notMeTitle: "Entfernt deine Auswahl, damit du deinen richtigen Namen wählen kannst",
    pickHint: "Tippe eine an. Alle sehen es live.",
    speakingNow: "Ist dran", done: "✓ Fertig", choosing: "Wählt…", notHere: "Noch nicht da",
    online: "Online", away: "Abwesend", you: "du", unpick: "Nochmal tippen zum Abwählen",
    remove: (name) => `${name} entfernen`,
    iAm: (name) => `Ich bin ${name}`,
    boardRound: "Das Team · Blitzlicht", boardChoosing: "Wer bist du? Tippe deinen Namen an", boardLive: "Das Team, live",
    boardEmpty: "Noch niemand da. Füge unten Namen hinzu und teile dann den Link.",
    addPlaceholder: "Name hinzufügen", addAria: "Name zum Hinzufügen", add: "Hinzufügen", invite: "Einladungslink kopieren",
    nameTaken: (name) => `„${name}“ ist schon auf dem Board. Tippe den Namen dort an.`,
    startRound: "Blitzlicht starten", randomOrder: "Zufällige Reihenfolge", reset: "Zurücksetzen",
    roundDone: "Blitzlicht · fertig", thanks: "Danke, Team.", back: "Zurück", close: "Schließen",
    spinTitle: "Zufällige Reihenfolge · wer fängt an?", spinning: "Dreht…",
    roundStep: (i, total) => `Blitzlicht · ${i} von ${total}`,
    yourTurn: "Du bist dran",
    question: (label) => label ? `Was steckt hinter „${label}“?` : "Was steckt dahinter?",
    sendCheer: "Jubel senden", cheer: (c) => `Jubel ${c}`,
    previous: "Zurück", next: "Nächste Person", finish: "Abschließen", endRound: "Blitzlicht beenden",
    joined: (name) => `<strong>${name}</strong> ist dabei`,
    picked: (name, label) => `<strong>${name}</strong>: ${label}`,
    linkCopied: "Link kopiert. Alle mit dem Link können beitreten und bearbeiten.", copyPrompt: "Diesen Link kopieren:",
    removeTitle: (name) => `${name} entfernen?`,
    removeBody: (name) => `${name} und die Auswahl werden für alle entfernt.`,
    removeOk: "Entfernen", cancel: "Abbrechen",
    resetTitle: "Check-in zurücksetzen?",
    resetBody: "Alle Reaktionen werden für alle gelöscht. Das lässt sich nicht rückgängig machen.",
    qrTitle: "Scannen zum Beitreten",
  },
  en: {
    locale: "en-GB",
    langBtn: "DE", langTitle: "Auf Deutsch umstellen",
    homeTitle: "Back to start", share: "Share", shareTitle: "Copy the link to this check-in",
    themeTitle: "Switch light / dark mode",
    live: "Live", offline: "Offline", reconnecting: "Reconnecting…", connecting: "Connecting…",
    hereCount: (n, total) => `${n} of ${total} here`,
    startTitle: "Start a check-in", missingTitle: "This room doesn't exist.",
    startLead: "Create a room, share its link and add the people joining. Everyone with the link can do everything.",
    missingLead: "Check the link, or create a new room. Rooms nobody opens for 90 days are deleted.",
    createRoom: "Create a room", lastRoom: "Back to your last room",
    howIsEveryone: "How is everyone today?",
    ofCheckedIn: (total) => `of ${total} checked in`,
    whoAreYou: "Who are you?",
    whoHint: "Tap your name on the board first. Then pick your vibe here.",
    whoHintEmpty: "Add your name under the board, then tap it.",
    yourVibe: (name) => `Your vibe, ${name}`,
    notMe: (name) => `Not ${name}?`,
    notMeTitle: "Removes your pick so you can choose your real name",
    pickHint: "Tap one. Everyone sees it live.",
    speakingNow: "Speaking now", done: "✓ Done", choosing: "Choosing…", notHere: "Not here yet",
    online: "Online", away: "Away", you: "you", unpick: "Tap again to un-pick",
    remove: (name) => `Remove ${name}`,
    iAm: (name) => `I'm ${name}`,
    boardRound: "The team · lightning round", boardChoosing: "Who are you? Tap your name", boardLive: "The team, live",
    boardEmpty: "Nobody here yet. Add names below, then share the link.",
    addPlaceholder: "Add a name", addAria: "Name to add", add: "Add", invite: "Copy link to invite",
    nameTaken: (name) => `“${name}” is already on the board. Tap it there instead.`,
    startRound: "Start lightning round", randomOrder: "Random order", reset: "Reset",
    roundDone: "Lightning round · done", thanks: "Thanks, team.", back: "Back", close: "Close",
    spinTitle: "Random order · who goes first?", spinning: "Spinning…",
    roundStep: (i, total) => `Lightning round · ${i} of ${total}`,
    yourTurn: "Your turn",
    question: (label) => label ? `What’s behind “${label}”?` : "What’s behind it?",
    sendCheer: "Send a cheer", cheer: (c) => `Cheer ${c}`,
    previous: "Previous", next: "Next person", finish: "Finish", endRound: "End lightning round",
    joined: (name) => `<strong>${name}</strong> joined`,
    picked: (name, label) => `<strong>${name}</strong> is ${label.toLowerCase()}`,
    linkCopied: "Link copied. Anyone with it can join and edit.", copyPrompt: "Copy this link:",
    removeTitle: (name) => `Remove ${name}?`,
    removeBody: (name) => `${name} and their reaction are removed for everyone.`,
    removeOk: "Remove", cancel: "Cancel",
    resetTitle: "Reset check-in?",
    resetBody: "All reactions are cleared for everyone. This cannot be undone.",
    qrTitle: "Scan to join",
  },
};

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
  dialog.querySelector("#confirm-cancel").textContent = t("cancel");
  dialog.returnValue = "";
  dialog.showModal();
  return new Promise((resolve) => {
    dialog.addEventListener("close", () => resolve(dialog.returnValue === "ok"), { once: true });
  });
}

// Made in the browser, so the room link never goes to a third-party QR service. Filled in at boot.
let qrSvg = "";

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

// Language is per device: switching only changes what this viewer sees. German by default.
let lang = store.get("checkin:lang") === "en" ? "en" : "de";
document.documentElement.lang = lang;

function t(key, ...args) {
  const value = STRINGS[lang][key];
  return typeof value === "function" ? value(...args) : value;
}
/** Picks this viewer's language from a `{ de, en }` text. */
const L = (text) => text[lang];

function toggleLang() {
  lang = lang === "de" ? "en" : "de";
  document.documentElement.lang = lang;
  store.set("checkin:lang", lang);
  render();
}

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
      feed(`<span class="feed-emoji">${emo("👋")}</span><span>${t("joined", esc(name))}</span>`);
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
    if (r) feed(`<span class="feed-emoji">${emo(r.emoji)}</span><span>${t("picked", esc(name), esc(L(r.label)))}</span>`);
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

  patch("header", headerHtml());
  patch("live", st ? `
    <span class="live-badge ${S.online ? "" : "is-off"}" title="${S.online ? t("live") : t("reconnecting")}">
      <span class="live-dot"></span>${S.online ? t("live") : t("offline")}
    </span>
    <span class="live-count">${t("hereCount", st.online.length, st.team.length)}</span>` : "");

  if (!ROOM || S.missing) {
    patch("main", startHtml());
    return;
  }

  if (!st) {
    patch("main", `<p class="muted connecting">${t("connecting")}</p>`);
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
          <input class="input" name="name" maxlength="60" required autocomplete="off" placeholder="${t("addPlaceholder")}" aria-label="${t("addAria")}">
          <button class="btn btn-secondary">${t("add")}</button>
          <button class="btn btn-ghost" type="button" data-action="share">${t("invite")}</button>
        </form>
        <div id="controls"></div>
      </section>
    </div>`);
  // Until a name is picked, the board (where you pick it) comes first on narrow screens.
  document.querySelector(".layout").classList.toggle("is-choosing", !isMember);
  // During the lightning round everyone sees the same focused view: spotlight + board, no picker.
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
      <h1 class="headline">${S.missing ? t("missingTitle") : t("startTitle")}</h1>
      <p class="lead">${S.missing ? t("missingLead") : t("startLead")}</p>
      <div class="btn-row start-actions">
        <button class="btn btn-primary" data-action="create-room">${t("createRoom")}</button>
        ${last && last !== ROOM ? `<a class="btn btn-secondary" href="?room=${esc(last)}">${t("lastRoom")}</a>` : ""}
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
      <div class="hero-text">
      <p class="eyebrow">${esc(today())} · Check-in</p>
      <h1 class="headline">${vibe
        ? `${esc(L(vibe.text))} <span class="vibe-emoji" aria-hidden="true">${emo(vibe.emoji)}</span>`
        : t("howIsEveryone")}</h1>
      <div class="meter" aria-label="${picked.length} ${t("ofCheckedIn", total)}">
        <div class="meter-track"><div class="meter-fill" style="width: ${total ? Math.round((picked.length / total) * 100) : 0}%"></div></div>
        <span class="meter-label"><strong>${picked.length}</strong> ${t("ofCheckedIn", total)}</span>
      </div>
      </div>
      ${qrSvg ? `<figure class="hero-qr">${qrSvg}<figcaption>${t("qrTitle")}</figcaption></figure>` : ""}
    </section>`;
}

function whoHtml(st) {
  return `
    <div class="picker-head">
      <h2 class="section-label">${t("whoAreYou")}</h2>
      <p class="picker-current">${st.team.length ? t("whoHint") : t("whoHintEmpty")}</p>
    </div>`;
}

function pickerHeadHtml(st) {
  const r = REACTION[st.reactions[S.me]];
  return `
    <div class="picker-head">
      <div class="picker-head-row">
        <h2 class="section-label">${t("yourVibe", esc(S.me))}</h2>
        <button class="link-btn" data-action="wrong-name" title="${t("notMeTitle")}">${t("notMe", esc(S.me))}</button>
      </div>
      <p class="picker-current" aria-live="polite">${r
        ? `<span class="picker-current-emoji">${emo(r.emoji)}</span> ${esc(L(r.label))}`
        : t("pickHint")}</p>
    </div>`;
}

function pickerHtml(st, isMember) {
  const mine = isMember ? st.reactions[S.me] : null;
  return GROUPS.map((g) => `
    <div class="picker-group">
      <h3 class="picker-title">${L(g.title)}</h3>
      <div class="reactions" role="radiogroup" aria-label="${L(g.title)}">
        ${g.reactions.map((x) => `
          <button class="reaction" role="radio" aria-checked="${mine === x.id}" data-action="react" data-id="${x.id}" title="${L(x.label)}" ${isMember ? "" : "disabled"}>
            <span class="reaction-emoji" aria-hidden="true">${emo(x.emoji)}</span>
            <span class="reaction-label">${L(x.label)}</span>
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
    const label = speaking ? t("speakingNow") : done ? t("done") : r ? L(r.label) : here ? t("choosing") : t("notHere");
    return `
      <li class="tile ${cls}" data-name="${esc(name)}">
        <button class="tile-remove" data-action="remove-name" data-name="${esc(name)}" aria-label="${t("remove", esc(name))}" title="${t("remove", esc(name))}">×</button>
        <span class="tile-presence" title="${here ? t("online") : t("away")}"></span>
        <span class="tile-emoji" aria-hidden="true">${r ? emo(r.emoji) : `<span class="tile-waiting"><i></i><i></i><i></i></span>`}</span>
        <button class="tile-name" data-action="pick-name" data-name="${esc(name)}" aria-pressed="${name === S.me}" title="${name === S.me ? t("unpick") : t("iAm", esc(name))}">${esc(name)}${name === S.me ? ` · ${t("you")}` : ""}</button>
        <span class="tile-label">${esc(label)}</span>
      </li>`;
  }).join("");
  const choosing = !st.team.includes(S.me);
  return `
    <h2 class="section-label">${inRound ? t("boardRound") : choosing && tiles ? t("boardChoosing") : t("boardLive")}</h2>
    ${tiles ? `<ul class="tiles ${choosing ? "is-choosing" : ""}">${tiles}</ul>` : `<p class="muted">${t("boardEmpty")}</p>`}`;
}

// Random order is the default; unticked, the round goes through the board left to right. Remembered per device.
const randomOrder = () => store.get("checkin:in-order") !== "1";

function controlsHtml(st) {
  if (st.speaker >= 0) return ""; // the spotlight has the round's buttons
  const any = st.team.some((n) => st.reactions[n]);
  return `
    <div class="controls">
      <button class="btn btn-primary" data-action="start" ${any ? "" : "disabled"}>${t("startRound")}</button>
      <label class="toggle"><input type="checkbox" data-action="random-order" ${randomOrder() ? "checked" : ""}> ${t("randomOrder")}</label>
      <button class="btn btn-danger" data-action="reset">${t("reset")}</button>
    </div>`;
}

function spotlightHtml(st) {
  const total = st.order.length;
  if (st.speaker >= total) {
    return `
      <section class="glass spotlight">
        <p class="eyebrow">${t("roundDone")}</p>
        <div class="spotlight-emoji" aria-hidden="true">${emo("🎉")}</div>
        <h1 class="spotlight-name">${t("thanks")}</h1>
        <div class="btn-row">
          <button class="btn btn-secondary" data-action="prev">${t("back")}</button>
          <button class="btn btn-primary" data-action="end">${t("close")}</button>
        </div>
      </section>`;
  }
  if (S.spin) {
    const r = REACTION[st.reactions[S.spin]];
    return `
      <section class="glass spotlight is-spinning">
        <p class="eyebrow">${t("spinTitle")}</p>
        <div class="spotlight-emoji" aria-hidden="true">${emo(r?.emoji ?? "❔")}</div>
        <h1 class="spotlight-name">${esc(S.spin)}</h1>
        <p class="spotlight-question">${emo("🎰")} ${t("spinning")}</p>
      </section>`;
  }
  const name = st.order[st.speaker];
  const r = REACTION[st.reactions[name]];
  const isMe = name === S.me;
  return `
    <section class="glass spotlight" aria-live="polite">
      <p class="eyebrow">${t("roundStep", st.speaker + 1, total)}</p>
      <div class="spotlight-emoji" aria-hidden="true" data-k="${esc(name)}">${emo(r?.emoji ?? "❔")}</div>
      <h1 class="spotlight-name">${isMe ? t("yourTurn") : esc(name)}</h1>
      <p class="spotlight-question">${t("question", r && esc(L(r.label)))}</p>
      <div class="cheers" role="group" aria-label="${t("sendCheer")}">
        ${CHEERS.map((c) => `<button class="cheer" data-action="cheer" data-emoji="${c}" aria-label="${t("cheer", c)}">${emo(c)}</button>`).join("")}
      </div>
      <div class="btn-row">
        <button class="btn btn-secondary" data-action="prev" ${st.speaker === 0 ? "disabled" : ""}>${t("previous")}</button>
        <button class="btn btn-primary" data-action="next">${st.speaker === total - 1 ? t("finish") : t("next")}</button>
      </div>
      <button class="btn btn-ghost spotlight-end" data-action="end">${t("endRound")}</button>
    </section>`;
}

function headerHtml() {
  return `
    <div class="container">
      <a class="brand" href="./" data-action="home" title="${t("homeTitle")}">Team Check-in</a>
      <div class="header-live" id="live"></div>
      <div class="header-actions">
        ${ROOM ? `<button class="btn btn-ghost" data-action="share" title="${t("shareTitle")}">${t("share")}</button>` : ""}
        <button class="icon-btn lang-btn" data-action="lang" title="${t("langTitle")}" aria-label="${t("langTitle")}">${t("langBtn")}</button>
        <button class="icon-btn" data-action="theme" title="${t("themeTitle")}" aria-label="${t("themeTitle")}">${ICONS.theme}</button>
      </div>
    </div>`;
}

function today() {
  return new Date().toLocaleDateString(t("locale"), { weekday: "long", day: "numeric", month: "long" });
}

// ── Events ──────────────────────────────────────

document.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-action]");
  if (!target || target.disabled) return;
  const { action } = target.dataset;

  switch (action) {
    case "theme": return toggleTheme();
    case "lang": return toggleLang();
    case "home":
      if (!S.me) return; // name picker or start page: follow the link to the start page
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
        feed(`<span class="feed-emoji">${emo("🔗")}</span><span>${t("linkCopied")}</span>`);
      } catch {
        prompt(t("copyPrompt"), location.href);
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
        title: t("removeTitle", name),
        body: t("removeBody", name),
        ok: t("removeOk"),
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
        title: t("resetTitle"),
        body: t("resetBody"),
        ok: t("reset"),
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
  // "ingrida" counts as the existing "Ingrida": shown in the browser's own bubble, like an empty field.
  const existing = S.state?.team.find((n) => n.toLowerCase() === typed.toLowerCase());
  if (existing) {
    input.setCustomValidity(t("nameTaken", existing));
    input.reportValidity();
    return;
  }
  input.value = "";
  await addName(typed);
});

// Typing again clears the "already on the board" message, so the form can be sent.
document.addEventListener("input", (event) => {
  if (event.target.form?.dataset.form === "add-name") event.target.setCustomValidity("");
});

// ── Boot ────────────────────────────────────────

document.getElementById("app").innerHTML = `
  <div class="glow" aria-hidden="true"></div>
  <header class="site-header" id="header"></header>
  <main class="page">
    <div class="container" id="main"></div>
  </main>
  <ul class="feed" id="feed" aria-live="polite"></ul>
  <div class="fx" id="fx" aria-hidden="true"></div>`;

render();
if (ROOM) {
  connect();
  import("https://cdn.jsdelivr.net/npm/qrcode@1.5.4/+esm")
    .then(({ toString }) => toString(`${location.origin}${location.pathname}?room=${ROOM}`, { type: "svg", margin: 2 }))
    .then((svg) => { qrSvg = svg; render(); })
    .catch(console.error);
}
