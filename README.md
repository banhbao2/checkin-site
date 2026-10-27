# Team Check-in

Live check-in for any team's meeting. Click **Create a room** to get a check-in room with its own link (`?room=<code>`). Share the link; anyone in the room can add themselves and others, and everyone picks their name and a reaction. Everything is live: you see people join and their reactions pop up the moment they choose. Then the app walks through a "why" round one person at a time. **Reset** clears the reactions for the next meeting.

A static page on GitHub Pages (the `docs/` folder). Supabase stores the reactions and pushes live updates, who's online and cheers to every open browser. No build step, no server.

## 1. Set up Supabase (once)

1. In your Supabase project: **SQL Editor → New query**, paste [supabase.sql](supabase.sql), **Run**. Running it again deletes all rooms.
2. **Project Settings → API**: copy the Project URL and the **anon / publishable** key into [docs/config.js](docs/config.js). That key is public by design; the rules in `supabase.sql` decide what it can do. Never use the `service_role` key.

## 2. Run locally

Any static server works, for example:

```sh
npx serve docs
```

To act as different people, use a private window or another browser for each one.

## 3. Publish on GitHub Pages

GitHub repo → **Settings → Pages → Deploy from a branch → `main` / `/docs` → Save**. A minute later the page is at `https://<user>.github.io/<repo>/`. Every push to `main` updates it. On the free GitHub plan the repo must be public.

Free Supabase projects pause after about a week without use; unpause from the Supabase dashboard.

## How it works

- **Rooms:** the site without `?room=` shows a start page with **Create a room** (and **Back to your last room** on devices that opened one before). Opening a page never creates a room; a wrong or deleted room link says so. The room code is the only key: anyone with the link can add and remove names, check in, run the why-round and reset; nobody without it can see or list rooms. Bookmark the link to reuse the same room (and its names) every meeting. Rooms nobody opens for 90 days are deleted automatically (weekly job in `supabase.sql`). Reset clears reactions but keeps the names.
- Opening a room shows the reaction picker next to the live board. Names are added in one place, **Add a name** under the board. To react, tap your tile on the board; the picker unlocks. Tap another tile to switch, or your own tile again to un-pick (the browser's back button does the same). **Not <name>?** in the picker also removes the reaction you just picked on this device, for when you chose the wrong name. The chosen name is kept until the tab is closed, so a refresh keeps your place. If your name is removed, the tab goes back to "Who are you?".
- Without picking a name you just watch the board, which is what the screen shared in the meeting should do.
- Reactions are visible to everyone immediately. Joins and new reactions appear in a live feed (bottom left) with a small emoji burst on the person's tile.
- The headline shows the team vibe, based on which group the chosen reactions are in. Wildcards don't count.
- **Why-round:** one **Start why-round** button. **Random order** is ticked by default (remembered per device); untick it to go through the board left to right. Only people who reacted take part. While the round runs, everyone's picker is hidden, the spotlight shows who's speaking, and tiles show **Speaking now** / **✓ Done**. **Previous** / **Next person** move through the round, **End why-round** stops it any time.
- During the why-round anyone can send cheers (👏 ❤️ 😂 💯 🙌 🤗) that float up on everyone's screen. They aren't stored.
- Anyone with the link can run the why-round and reset. Reset asks for confirmation first.

## Customising

- **Reactions:** edit `GROUPS` in `docs/app.js` (30 emoji: 4 mood groups + Wildcards). Cheers: `CHEERS` in the same file.
- **Look:** design tokens at the top of `docs/styles.css`, based on `styleguide/`. The MB Corpo fonts are used only if installed locally; otherwise Georgia and the system font are used.
