# Wordie

A personal English vocabulary journal — built as a PWA, designed for mobile.

Add words throughout the day, review them in the evening, and study with flashcards that track how well you know each one.

---

## Features

**Today tab**

- Morning/afternoon/evening greeting with today's word count
- Daily goal tracker (3, 5, or 10 words) — progress bar turns green when hit
- Word of the Day — surfaces your least-recently-studied word as a passive reminder
- FAB button to quickly add a word from any screen

**Library tab**

- All words grouped by day with live search (filters by word and definition)
- Swipe left on any card to reveal the delete button
- Tap any card to expand and see meanings, examples, and pronunciation

**Study tab**

- Choose session size and filter by All / Blank / Fuzzy / New words
- Full-screen flashcard session — tap to reveal meaning, then rate each word
- Three ratings: **Easy** ✓ · **Fuzzy** ~ · **Blank** ✗
- Session config is remembered between visits
- Summary screen after each session
- "Needs work" list shows your Blank and Fuzzy words

**Settings tab**

- Daily goal selector
- Theme: Light · Dark · Auto (follows system)
- Export all words as CSV
- Check for updates (unregisters service worker and reloads)

**General**

- Audio pronunciation on card expand and study flashcard (from Free Dictionary API)
- Haptic feedback on key actions (iOS/Android)
- Onboarding overlay on first launch
- Sticky header with blur effect on scroll
- Swipe-to-delete with no tap/swipe conflict

---

## Stack

- Vanilla HTML, CSS, JavaScript — no build step
- [Free Dictionary API](https://dictionaryapi.dev/) for definitions and audio
- `localStorage` for word storage
- `sessionStorage` for study session state
- Service worker for offline support

---

## File structure

```
wordie/
├── index.html      # App shell and markup
├── style.css       # All styles
├── main.js         # All logic
├── sw.js           # Service worker
├── manifest.json   # PWA manifest
├── icon.svg        # Favicon (SVG)
├── icon-192.png    # PWA icon
└── icon-512.png    # PWA icon
```

---

## Data

All data is stored locally in your browser via `localStorage` under the key `wordie_v2`. Nothing is sent to any server. Exporting via Settings → Export words produces a CSV file.
