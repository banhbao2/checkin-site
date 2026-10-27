# Team Check-in

One shared link for the team's meeting check-in. Everyone opens the link, picks their name, and picks a reaction. Everything is live: you see people join and their reactions pop up the moment they choose. Then the app walks through a "why" round one person at a time. **Reset** clears everything for the next meeting.

A static page on GitHub Pages (the `docs/` folder). Supabase stores the reactions and pushes live updates, who's online and cheers to every open browser. No build step, no server.

## 1. Set up Supabase (once)

1. In your Supabase project: **SQL Editor → New query**, paste [supabase.sql](supabase.sql), **Run**.
2. **Project Settings → API**: copy the Project URL and the **anon / publishable** key into [docs/config.js](docs/config.js). That key is public by design; the rules in `supabase.sql` decide what it can do. Never use the `service_role` key.

## 2. Set your team names

In [docs/config.js](docs/config.js):

```js
export const TEAM_NAMES = ["Anna", "Ben", "Chloé", "David"];
```

Commit and push. Nobody can change the names from the website.

## 3. Run locally

Any static server works, for example:

```sh
npx serve docs
```

To act as different people, use a private window or another browser for each one.

## 4. Publish on GitHub Pages

GitHub repo → **Settings → Pages → Deploy from a branch → `main` / `/docs` → Save**. A minute later the page is at `https://<user>.github.io/<repo>/`. Every push to `main` updates it. On the free GitHub plan the repo must be public.

Free Supabase projects pause after about a week without use; unpause from the Supabase dashboard.

## How it works

- Everyone starts at the name list when they open the link. The chosen name is kept until the tab is closed, so a refresh keeps your place. To pick a different name: click **Team Check-in** (top left), **Change** next to your name, **Not <name>?** in the picker, or use the browser's back button. Going back keeps your reaction. Only **Not <name>?** also removes the reaction you just picked on this device, for when you chose the wrong name.
- **Just watching** is for the screen that's shared in the meeting: it shows progress and the board without picking a name.
- Reactions are visible to everyone immediately. Joins and new reactions appear in a live feed (bottom left) with a small emoji burst on the person's tile.
- The headline shows the team vibe, based on which group the chosen reactions are in. Wildcards don't count.
- During the why-round anyone can send cheers (👏 ❤️ 😂 💯 🙌 🫶) that float up on everyone's screen. They aren't stored.
- Anyone with the link can run the why-round and reset. Reset asks for confirmation first.

## Customising

- **Reactions:** edit `GROUPS` in `docs/app.js` (30 emoji: 4 mood groups + Wildcards). Cheers: `CHEERS` in the same file.
- **Look:** design tokens at the top of `docs/styles.css`, based on `styleguide/`. The MB Corpo fonts are used only if installed locally; otherwise Georgia and the system font are used.
