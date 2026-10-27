# Team Check-in

One shared link for the team's meeting check-in. Everyone opens the link, picks their name, and picks a reaction. Everything is live: you see people join and their reactions pop up the moment they choose. Then the app walks through a "why" round one person at a time. **Reset** clears everything for the next meeting.

Runs on Cloudflare: a Worker serves the page, and a single Durable Object stores the reactions and pushes live updates to every open browser.

## 1. Set your team names

In [team.json](team.json):

```json
["Anna", "Ben", "Chloé", "David"]
```

Then run `npm run deploy`. Nobody can change the names from the website.

## 2. Run locally

```sh
npm install
npm run dev
```

Open http://localhost:8787. To act as different people, use a private window or another browser for each one.

## 3. Deploy and share

```sh
npx wrangler login   # one time
npm run deploy
```

Wrangler prints the URL (`https://team-checkin.<your-subdomain>.workers.dev`). Share it with the team; it stays the same every meeting. To use your own domain, go to Cloudflare dashboard → Workers & Pages → team-checkin → Settings → Domains & Routes.

Changing the team later: edit `team.json` and run `npm run deploy` again.

## How it works

- Everyone starts at the name list when they open the link. The chosen name is kept until the tab is closed, so a refresh keeps your place. To pick a different name: click **Team Check-in** (top left), **Change** next to your name, **Not <name>?** in the picker, or use the browser's back button. Going back keeps your reaction. Only **Not <name>?** also removes the reaction you just picked on this device, for when you chose the wrong name.
- **Just watching** is for the screen that's shared in the meeting: it shows progress and the board without picking a name.
- Reactions are visible to everyone immediately. Joins and new reactions appear in a live feed (bottom left) with a small emoji burst on the person's tile.
- The headline shows the team vibe, based on which group the chosen reactions are in. Wildcards don't count.
- During the why-round anyone can send cheers (👏 ❤️ 😂 💯 🙌 🫶) that float up on everyone's screen. They aren't stored.
- Anyone with the link can run the why-round and reset. Reset asks for confirmation first.

## Customising

- **Reactions:** edit `GROUPS` in `public/app.js` (30 emoji: 4 mood groups + Wildcards). Nothing to change on the server. Cheers: `CHEERS` in both `public/app.js` and `src/index.js`.
- **Look:** design tokens at the top of `public/styles.css`, based on `styleguide/`. The MB Corpo fonts are used only if installed locally; otherwise Georgia and the system font are used.
