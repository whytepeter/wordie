# Wordie

A minimal vocabulary journal PWA. Add words daily, review them in the evening, and study with spaced recall sessions.

## Features

- **Daily word log** — add any English word and get up to 3 definitions + examples pulled automatically from the Free Dictionary API
- **Collapsible cards** — tap a card to expand its meanings; swipe left to delete
- **Study sessions** — full-screen flashcard mode with Easy / Fuzzy / Blank ratings, session size picker, and filter by difficulty
- **Library** — all words grouped by day with a colour-coded accent per word
- **Streak tracking** — daily streak counter based on your activity
- **Light / Dark / System theme** — persisted across sessions
- **PWA** — installable on iOS and Android, works offline

## Files

```
wordie/
├── index.html      # App shell (markup only)
├── style.css       # All styles
├── main.js         # All logic
├── sw.js           # Service worker (offline + caching)
├── manifest.json   # PWA manifest
├── icon.svg        # Favicon (Fraunces italic W)
├── icon-192.png    # PWA icon
└── icon-512.png    # PWA icon
```
