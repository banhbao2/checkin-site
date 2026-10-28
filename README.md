# Team Check-in

A small web app for the opening check-in of a team meeting.

Each person picks an emoji for how they feel today. The board updates live for everyone, so the person sharing their screen can show it to the whole team. When everyone has picked one, the app goes through the team one person at a time and each person shares what's behind their pick. Afterwards, **Reset** clears the reactions so the room is ready for the next meeting.

No accounts and no install. Anyone with the room link can join from a laptop or phone.

The interface is in German by default. The **EN / DE** button in the header switches the language for that browser only, so everyone else keeps their own setting.

### A typical check-in

1. Someone opens the site, clicks **Raum erstellen** (Create a room) and shares the link (`?room=<code>`). The team bookmarks it and reuses it every meeting.
2. Everyone taps their name on the board (or adds it once) and picks one of 30 emoji in four mood groups, plus some wildcards.
3. The board fills up live. The headline shows the overall team vibe.
4. **Blitzlicht starten** (Start lightning round): the app highlights one speaker at a time, in random or board order. Others can send cheers (👏 ❤️ 😂 …).
5. **Zurücksetzen** (Reset) at the end. The names stay, the reactions are cleared.

### Tech

A static site (the `docs/` folder) hosted on GitHub Pages. Supabase stores the rooms and reactions and sends live updates, online status and cheers to every open browser. No build step and no server of our own.

