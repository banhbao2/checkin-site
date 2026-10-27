# Team Check-in Website: Requirements

_Status: draft v0.1 (2026-10-26). Open questions are listed at the end._

## 1. Purpose

A small web app for the opening "check-in" of team meetings. Each team member picks a smiley or reaction for how they feel today. Once everyone has picked one, the team goes through the reactions and each person explains **why** they chose it.

The check-in is the first agenda item. The app should be fast, need no setup, and be usable on laptop and phone.

## 2. Roles

| Role | Description |
|---|---|
| **Participant** | Team member who joins the session and submits a reaction. |
| **Facilitator** | Person running the meeting (usually screen-sharing). Controls the reveal, the "why" round and the reset. Can also take part. |

## 3. Meeting flow

1. **Open session**: The facilitator opens the site and gets a session (room) with a shareable link or short code.
2. **Join**: Participants open the link and enter a display name.
3. **Pick a reaction**: Each participant picks one smiley/reaction. They can change it until the reveal.
4. **Waiting state**: Everyone sees how many people have submitted (e.g. "5 of 7 checked in"). The reactions stay hidden so nobody is influenced by others.
5. **Reveal**: The facilitator clicks "Reveal" (or "Finish check-in"). All reactions appear together on a shared board.
6. **"Why" round**: The app goes through participants one at a time and highlights who is up ("Anna: 😴, why?"). The facilitator clicks Next to move on. The explanation is spoken, not typed.
7. **Reset**: A **Reset** button clears every reaction in the session so it can be reused for the next meeting.

## 4. Functional requirements

### 4.1 Reactions
- FR-1: A fixed set of reactions (proposal: 😄 🙂 😐 😕 😢 😴 🤯 🔥 🤒 🎉, about 8–12 in total).
- FR-2: One reaction per participant per session. Picking again replaces the earlier one.
- FR-3 (optional): Short optional text note ("one word for today").

### 4.2 Session
- FR-4: The facilitator can create a session. Each session has a unique ID/code and a link.
- FR-5: Participants join with a display name. No login or account.
- FR-6: Session state is shared live by all connected clients (submission count, reveal state, current speaker).
- FR-7: Reactions stay hidden until the reveal.

### 4.3 Board / reveal
- FR-8: After the reveal, show every participant's name and reaction.
- FR-9: Show a summary, e.g. a count per reaction (3× 🙂, 2× 😴, …).
- FR-10: "Why" round mode: highlight the current person, with Next and Previous buttons and an option to shuffle the order.

### 4.4 Reset
- FR-11: The **Reset** button deletes all reactions (and participants, if needed) for the session and returns it to step 3.
- FR-12: Reset asks for confirmation ("Are you sure?").
- FR-13: Only the facilitator can reset (see open questions).

## 5. Non-functional requirements

- NFR-1 **Hosting**: Cloudflare (Pages for the frontend, Workers/Pages Functions for the API). The user connects the Cloudflare account and deploys.
- NFR-2 **Storage**: Session reactions are stored in Cloudflare. They are short-lived data, not a long-term archive.
- NFR-3 **Real-time feel**: Updates show up on other screens within about 1–2 seconds.
- NFR-4 **Team size**: Built for up to about 30 participants per session.
- NFR-5 **Responsive**: Works on desktop (for screen-sharing) and on mobile (for voting).
- NFR-6 **Low cost**: Stays within the Cloudflare free tier.
- NFR-7 **Privacy**: Only display names and reactions are stored. Data is removed on reset, or automatically after a set time (proposal: 24 h).

## 6. Proposed technical approach

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Static HTML/CSS/JS (or a light framework) on **Cloudflare Pages** | Simple to deploy |
| API | **Cloudflare Workers / Pages Functions** | Endpoints: join, react, reveal, next, reset, state |
| Storage | **Durable Objects** (recommended) or **D1** | See below |

**Storage options:**
- **Durable Objects (recommended)**: One object per session. State is consistent, and WebSockets give instant live updates. Works on the free plan (SQLite-backed DOs).
- **D1 (SQLite)**: A simple SQL table. Clients poll every 1–2 s. Easier to inspect, but not truly live.
- **KV (not recommended)**: Changes can take up to about 60 s to appear everywhere, which is too slow for live voting.

**Draft data model:**
```
Session      { id, code, state: "collecting" | "revealed", currentSpeakerIndex, createdAt }
Participant  { id, sessionId, name, reaction, note?, updatedAt }
```

**Draft API:**
```
POST /api/session                 -> create session, returns code + facilitator token
POST /api/session/:id/join        -> { name } returns participantId
PUT  /api/session/:id/reaction    -> { participantId, reaction }
POST /api/session/:id/reveal      (facilitator)
POST /api/session/:id/next        (facilitator)
POST /api/session/:id/reset       (facilitator)
GET  /api/session/:id             -> current state (or WebSocket /ws)
```

## 7. Out of scope (v1)

- User accounts, SSO, or company login
- History or trend charts across meetings
- Other agenda items (the check-in is the first one; more may follow later)
- Integrations (Teams, Slack, calendar)

## 7a. Revision v2 (2026-10-26): simplified

The user asked for less. v2 replaces the session model in sections 3–6 and 8:

- **One fixed URL** for the team. No "start a check-in", no session codes, no facilitator key.
- **Fixed name list**: set once by the owner in `team.json` in the codebase (changes rarely; redeploy after editing). Participants pick their name from the list instead of typing it. Opening the link always starts at the name list; the choice is kept until the tab is closed.
- **Anyone** can reveal, run the why-round and reset (with confirmation).
- "Just watching" mode for the shared screen.
- Storage: one Durable Object (`CheckinRoom`) holds `{ phase, reactions: {name: reaction}, order, speaker }`.

## 7b. Revision v3 (2026-10-26): live

- **No hiding, no reveal button**: reactions are visible to everyone the moment they're chosen.
- **Live presence**: online indicator per person, "x of y here", feed messages when someone joins or picks a reaction, emoji burst animation on their tile.
- **24 reactions** in 4 mood groups (Flying high, Feeling good, So-so, Rough day); the headline shows the team vibe.
- Why-round and Reset unchanged.

## 8. Decisions taken for v1 (2026-10-26, partly replaced by v2)

Defaults chosen while building. Change them if they don't fit the team.

| Question | v1 decision |
|---|---|
| Anonymity | Names are shown next to reactions after the reveal |
| Facilitator control | Only the facilitator can reveal, run the why-round and reset. The facilitator key is stored in the creating browser and can be shared via a "facilitator link" |
| "Why" answers | Spoken in the call. No text input |
| Sessions | New session per "Start", but a session can be reused with Reset. Auto-deleted after 24 h idle |
| Reaction set | 9 emoji with text labels: Great, Good, Okay, Meh, Down, Tired, Overwhelmed, Energized, Unwell |
| Storage | Durable Objects (SQLite) + WebSockets |
| UI / branding | Based on `styleguide/` (Mercedes-Benz design system): light mode default with dark toggle, Pure Blue CTAs, serif headlines and sans body, 14px minimum. Star/wordmark not used |
| Language | English |
| Extras | Facilitator can take part or only facilitate, remove people, go back to voting, and start the why-round in random order (with a slot-machine spin to pick the first speaker) |

## 9. Open questions (original)

1. **Anonymity**: Are names shown next to reactions after the reveal, or are reactions anonymous? (The "why" round suggests names are shown.)
2. **Facilitator control**: Should only the facilitator (via a secret link or token) be able to reveal and reset, or anyone?
3. **"Why" answers**: Spoken only in the call, or typed into the app as well?
4. **Sessions**: A new session each meeting, or one fixed room for the team (e.g. `/team-x`) that is reset each time?
5. **Reaction set**: Use the proposed emoji, or a custom set or scale (e.g. weather icons, 1–5)?
6. **Storage**: Durable Objects (live) or D1 (polling)?
7. **Branding**: Any colours, logo, or language requirements (English or German UI)?
