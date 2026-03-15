// ── STATE ──────────────────────────────────────────────────────────────────
const STORE = "wordie_v2";
const COLORS = ["c-violet", "c-mint", "c-amber", "c-coral", "c-sky"];

let words = [];
let activeTab = "today";

// Study session state
let session = []; // array of word objects for this session
let sessionIndex = 0;
let sessionRevealed = false;

function load() {
  try {
    words = JSON.parse(localStorage.getItem(STORE)) || [];
  } catch {
    words = [];
  }
}
function save() {
  localStorage.setItem(STORE, JSON.stringify(words));
}
load();

// ── TABS ───────────────────────────────────────────────────────────────────
function switchTab(tab) {
  activeTab = tab;
  document
    .querySelectorAll(".screen")
    .forEach((s) => s.classList.remove("active"));
  document
    .querySelectorAll(".tab-item")
    .forEach((t) => t.classList.remove("active"));
  document.getElementById("screen-" + tab).classList.add("active");
  document.getElementById("tab-" + tab).classList.add("active");

  const fab = document.getElementById("todayFab");
  if (tab === "study" || tab === "settings") {
    if (fab) fab.remove();
  }

  if (tab === "today") renderToday();
  if (tab === "library") renderLibrary();
  if (tab === "study") renderStudyHome();
  updateStreak();
}

// ── STREAK ─────────────────────────────────────────────────────────────────
function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getStreak() {
  const days = [...new Set(words.map((w) => w.date))].sort();
  if (!days.length) return 0;
  let streak = 0,
    d = new Date();
  for (let i = days.length - 1; i >= 0; i--) {
    const k = d.toISOString().slice(0, 10);
    if (days[i] === k) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else if (i === days.length - 1) break;
    else break;
  }
  return streak;
}

function updateStreak() {
  const el = document.getElementById("streakCount");
  if (el) el.textContent = getStreak();
}
updateStreak();

// ── ADD SHEET ──────────────────────────────────────────────────────────────
function openSheet() {
  document.getElementById("addSheet").classList.add("open");
  document.getElementById("modalOverlay").classList.add("open");
  setTimeout(() => {
    const i = document.getElementById("wordInput");
    if (i) i.focus();
  }, 380);
}

function closeAllSheets() {
  closeSheet();
  closeSettingsSheet();
}

function closeSheet() {
  document.getElementById("addSheet").classList.remove("open");
  document.getElementById("modalOverlay").classList.remove("open");
  const inp = document.getElementById("wordInput");
  if (inp) {
    inp.value = "";
    inp.blur();
  }
  const fs = document.getElementById("fetchStatus");
  fs.textContent = "";
  fs.className = "fetch-status";
}

document.getElementById("wordInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") addWord();
});

// ── ADD WORD ───────────────────────────────────────────────────────────────
async function addWord() {
  const inp = document.getElementById("wordInput");
  const word = inp.value.trim().toLowerCase().replace(/\s+/g, " ");
  if (!word) return;
  if (words.find((w) => w.word === word)) {
    showToast("Already in your library");
    return;
  }

  const btn = document.getElementById("addBtn");
  const status = document.getElementById("fetchStatus");
  btn.disabled = true;
  status.className = "fetch-status loading";
  status.textContent = "Looking it up…";

  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(
        word
      )}`
    );
    if (!res.ok) throw new Error("not found");
    const data = await res.json();
    const entry = data[0];
    const meanings = [];
    for (const m of entry.meanings) {
      for (const d of m.definitions) {
        if (meanings.length >= 3) break;
        meanings.push({
          pos: m.partOfSpeech,
          def: d.definition,
          ex: d.example || null,
        });
      }
      if (meanings.length >= 3) break;
    }
    const obj = {
      id: Date.now(),
      word: entry.word || word,
      phonetic:
        entry.phonetic || entry.phonetics?.find((p) => p.text)?.text || "",
      meanings,
      date: todayKey(),
      color: COLORS[words.length % COLORS.length],
      ratings: [], // 'easy' | 'fuzzy' | 'blank'
    };
    words.unshift(obj);
    save();
    inp.value = "";
    status.className = "fetch-status ok";
    status.textContent = `✓ "${obj.word}" added`;
    updateStreak();
    if (activeTab === "today") renderToday();
    // auto-clear status after 2s then close sheet
    setTimeout(() => {
      status.textContent = "";
      status.className = "fetch-status";
    }, 1800);
  } catch {
    status.className = "fetch-status error";
    status.textContent = "Word not found. Check spelling?";
  } finally {
    btn.disabled = false;
  }
}

// ── TODAY ──────────────────────────────────────────────────────────────────
function renderToday() {
  const today = words.filter((w) => w.date === todayKey());
  const hr = new Date().getHours();
  const greeting =
    hr < 12 ? "Good morning" : hr < 17 ? "Good afternoon" : "Good evening";
  const dateStr = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const pct = Math.min(100, today.length * 10);

  let html = `
    <div class="today-hero">
      <div class="today-time">${greeting}</div>
      <div class="today-count">${today.length}</div>
      <div class="today-label">${
        today.length === 1 ? "word recorded" : "words recorded"
      } today</div>
      <div class="today-date">${dateStr}</div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
    </div>`;

  if (!today.length) {
    html += `
      <div class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
        </div>
        <div class="empty-title">Nothing yet today</div>
        <div class="empty-sub">Tap the + button to record your first word.</div>
        <button class="empty-cta" onclick="openSheet()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Add first word
        </button>
      </div>`;
  } else {
    html += `
      <div class="section-hd">
        <h3>Today's words</h3>
        <span class="badge">${today.length}</span>
      </div>
      <div class="cards-list">
        ${today.map((w) => buildCard(w, true)).join("")}
      </div>
      <div style="height:88px"></div>`;
  }

  document.getElementById("todayContent").innerHTML = html;

  showFab();
}

// ── FAB HELPER ─────────────────────────────────────────────────────────────
function showFab() {
  const existing = document.getElementById("todayFab");
  if (existing) existing.remove();
  const fab = document.createElement("button");
  fab.id = "todayFab";
  fab.className = "fab";
  fab.onclick = openSheet;
  fab.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`;
  document.getElementById("app").appendChild(fab);
}

// ── LIBRARY ────────────────────────────────────────────────────────────────
function renderLibrary() {
  if (!words.length) {
    document.getElementById("libraryContent").innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
            <path d="M4 19V6a2 2 0 012-2h13"/><path d="M4 19a2 2 0 002 2h13V4"/>
          </svg>
        </div>
        <div class="empty-title">Library is empty</div>
        <div class="empty-sub">Words you add will appear here, grouped by day.</div>
      </div>`;
    return;
  }
  const grouped = {};
  words.forEach((w) => {
    (grouped[w.date] = grouped[w.date] || []).push(w);
  });
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  let html = "";
  dates.forEach((date) => {
    const g = grouped[date];
    html += `
      <div class="section-hd mt8">
        <h3>${dateLabel(date)}</h3><span class="badge">${g.length}</span>
      </div>
      <div class="cards-list">${g
        .map((w) => buildCard(w, true))
        .join("")}</div>`;
  });
  html += '<div style="height:88px"></div>';
  document.getElementById("libraryContent").innerHTML = html;
  showFab();
}

function dateLabel(ds) {
  const t = todayKey();
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yk = y.toISOString().slice(0, 10);
  if (ds === t) return "Today";
  if (ds === yk) return "Yesterday";
  return new Date(ds).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

// ── COLLAPSIBLE CARD ───────────────────────────────────────────────────────
function toggleCard(id) {
  const body = document.getElementById("card-body-" + id);
  const arrow = document.getElementById("card-arrow-" + id);
  if (!body) return;
  const isOpen = body.classList.contains("card-body-open");
  // collapse all open cards first
  document.querySelectorAll(".card-body-open").forEach((el) => {
    el.classList.remove("card-body-open");
    const otherId = el.id.replace("card-body-", "");
    const otherArrow = document.getElementById("card-arrow-" + otherId);
    if (otherArrow) otherArrow.style.transform = "rotate(0deg)";
  });
  // if it wasn't open, open it now
  if (!isOpen) {
    body.classList.add("card-body-open");
    if (arrow) arrow.style.transform = "rotate(180deg)";
  }
}

function buildCard(w, showDel) {
  const lastRating =
    w.ratings && w.ratings.length ? w.ratings[w.ratings.length - 1] : null;
  const ratingDot = lastRating
    ? `<span class="rating-dot rating-${lastRating}"></span>`
    : "";

  const delBtn = showDel
    ? `
    <button class="swipe-del-btn" onclick="deleteWord(${w.id})">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
        <path d="M10 11v6M14 11v6"/>
      </svg>
    </button>`
    : "";

  return `
    <div class="swipe-wrap" id="swipe-${w.id}">
      ${delBtn}
      <div class="wcard ${w.color || "c-violet"}" id="wcard-${
    w.id
  }" onclick="toggleCard(${w.id})">
        <div class="wcard-top">
          <div class="wcard-left">
            ${ratingDot}
            <div>
              <div class="wcard-word">${w.word}</div>
              ${
                w.phonetic
                  ? `<div class="wcard-phonetic">${w.phonetic}</div>`
                  : ""
              }
            </div>
          </div>
          <div class="wcard-actions">
            <div class="wcard-date">${dateLabel(w.date)}</div>
            <div class="card-arrow" id="card-arrow-${w.id}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </div>
          </div>
        </div>
        <div class="card-body" id="card-body-${
          w.id
        }" onclick="event.stopPropagation()">
          <div class="wcard-meanings">
            ${w.meanings
              .map(
                (m) => `
              <div>
                <span class="pos-tag ${posClass(m.pos)}">${m.pos}</span>
                <div class="def-text">${m.def}</div>
                ${m.ex ? `<div class="ex-text">"${m.ex}"</div>` : ""}
              </div>`
              )
              .join("")}
          </div>
        </div>
      </div>
    </div>`;
}

// ── STUDY HOME ─────────────────────────────────────────────────────────────
function renderStudyHome() {
  const area = document.getElementById("studyContent");
  if (!words.length) {
    area.innerHTML = `
      <div class="study-home">
        <div class="empty-state">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="2" y="5" width="20" height="14" rx="3"/><path d="M12 5v14M2 12h20"/>
            </svg>
          </div>
          <div class="empty-title">No words yet</div>
          <div class="empty-sub">Add words to start a study session.</div>
        </div>
      </div>`;
    return;
  }

  const total = words.length;
  const blanks = words.filter((w) => lastRating(w) === "blank").length;
  const fuzzies = words.filter((w) => lastRating(w) === "fuzzy").length;
  const easies = words.filter((w) => lastRating(w) === "easy").length;
  const unrated = words.filter((w) => !lastRating(w)).length;

  // Session size options — max out at total
  const opts = [5, 10, 15, 20].filter((n) => n <= total);
  if (!opts.includes(total)) opts.push(total);

  area.innerHTML = `
    <div class="study-home">
      <div class="study-stats-row">
        <div class="study-stat">
          <div class="study-stat-num">${total}</div>
          <div class="study-stat-label">Total</div>
        </div>
        <div class="study-stat">
          <div class="study-stat-num stat-blank">${blanks}</div>
          <div class="study-stat-label">Blank</div>
        </div>
        <div class="study-stat">
          <div class="study-stat-num stat-fuzzy">${fuzzies}</div>
          <div class="study-stat-label">Fuzzy</div>
        </div>
        <div class="study-stat">
          <div class="study-stat-num stat-easy">${easies}</div>
          <div class="study-stat-label">Easy</div>
        </div>
      </div>

      <div class="session-config">
        <div class="session-config-label">Words per session</div>
        <div class="session-size-row" id="sessionSizeRow">
          ${opts
            .map(
              (n, i) => `
            <button class="size-btn ${
              i === 0 ? "active" : ""
            }" onclick="selectSize(${n}, this)">${
                n === total ? "All " + n : n
              }</button>
          `
            )
            .join("")}
        </div>
      </div>

      <div class="session-config" style="margin-top:12px">
        <div class="session-config-label">Study from</div>
        <div class="session-size-row">
          <button class="size-btn active" id="filter-all"    onclick="selectFilter('all', this)">All</button>
          <button class="size-btn"        id="filter-blank"  onclick="selectFilter('blank', this)">Blank</button>
          <button class="size-btn"        id="filter-fuzzy"  onclick="selectFilter('fuzzy', this)">Fuzzy</button>
          <button class="size-btn"        id="filter-unrated" onclick="selectFilter('unrated', this)">New</button>
        </div>
      </div>

      <button class="start-session-btn" onclick="startSession()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
        Start session
      </button>

      ${
        blanks + fuzzies > 0
          ? `
        <div class="weak-words-section">
          <div class="section-hd" style="padding:0;margin-bottom:10px">
            <h3>Needs work</h3>
            <span class="badge">${blanks + fuzzies}</span>
          </div>
          <div class="cards-list" style="padding:0">
            ${words
              .filter(
                (w) => lastRating(w) === "blank" || lastRating(w) === "fuzzy"
              )
              .map((w) => buildCard(w, false))
              .join("")}
          </div>
        </div>`
          : ""
      }
    </div>`;

  // default selections
  window._sessionSize = opts[0];
  window._sessionFilter = "all";
}

function selectSize(n, btn) {
  document.querySelectorAll(".size-btn").forEach((b) => {
    if (b.closest("#sessionSizeRow")) b.classList.remove("active");
  });
  btn.classList.add("active");
  window._sessionSize = n;
}

function selectFilter(f, btn) {
  ["all", "blank", "fuzzy", "unrated"].forEach((id) => {
    const el = document.getElementById("filter-" + id);
    if (el) el.classList.remove("active");
  });
  btn.classList.add("active");
  window._sessionFilter = f;
}

function lastRating(w) {
  return w.ratings && w.ratings.length ? w.ratings[w.ratings.length - 1] : null;
}

// ── SESSION ────────────────────────────────────────────────────────────────
function startSession() {
  const size = window._sessionSize || 10;
  const filter = window._sessionFilter || "all";

  let pool = [...words];
  if (filter === "blank") pool = pool.filter((w) => lastRating(w) === "blank");
  if (filter === "fuzzy") pool = pool.filter((w) => lastRating(w) === "fuzzy");
  if (filter === "unrated") pool = pool.filter((w) => !lastRating(w));

  if (!pool.length) {
    showToast("No words match that filter");
    return;
  }

  // Shuffle and slice
  pool = pool.sort(() => Math.random() - 0.5).slice(0, size);
  session = pool;
  sessionIndex = 0;
  sessionRevealed = false;

  openStudyModal();
}

// ── STUDY MODAL ────────────────────────────────────────────────────────────
function openStudyModal() {
  let modal = document.getElementById("studyModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "studyModal";
    modal.className = "study-modal";
    document.body.appendChild(modal);
  }
  modal.classList.add("open");
  document.body.style.overflow = "hidden";
  renderSessionCard();
}

function closeStudyModal() {
  const modal = document.getElementById("studyModal");
  if (modal) modal.classList.remove("open");
  document.body.style.overflow = "";
  if (activeTab === "study") renderStudyHome();
  if (activeTab === "today") renderToday();
  if (activeTab === "library") renderLibrary();
}

function renderSessionCard() {
  const modal = document.getElementById("studyModal");
  if (!modal) return;

  if (sessionIndex >= session.length) {
    // Summary screen
    const ratings = session.map((w) => lastRating(w));
    const easy = ratings.filter((r) => r === "easy").length;
    const fuzzy = ratings.filter((r) => r === "fuzzy").length;
    const blank = ratings.filter((r) => r === "blank").length;

    modal.innerHTML = `
      <div class="sm-summary">
        <div class="sm-summary-title">Session complete</div>
        <div class="sm-summary-sub">${session.length} words reviewed</div>
        <div class="sm-result-row">
          <div class="sm-result-item">
            <div class="sm-result-num sm-easy">${easy}</div>
            <div class="sm-result-label">Easy</div>
          </div>
          <div class="sm-result-item">
            <div class="sm-result-num sm-fuzzy">${fuzzy}</div>
            <div class="sm-result-label">Fuzzy</div>
          </div>
          <div class="sm-result-item">
            <div class="sm-result-num sm-blank">${blank}</div>
            <div class="sm-result-label">Blank</div>
          </div>
        </div>
        <button class="sm-done-btn" onclick="closeStudyModal()">Done</button>
        <button class="sm-again-btn" onclick="startSession()">Study again</button>
      </div>`;
    return;
  }

  const w = session[sessionIndex];
  const num = sessionIndex + 1;
  const tot = session.length;
  const pct = (sessionIndex / tot) * 100;

  modal.innerHTML = `
    <div class="sm-header">
      <button class="sm-close" onclick="closeStudyModal()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
      <div class="sm-progress-bar"><div class="sm-progress-fill" style="width:${pct}%"></div></div>
      <div class="sm-counter">${num} / ${tot}</div>
    </div>

    <div class="sm-body">
      <div class="sm-card" onclick="revealCard()">
        <div class="sm-card-front">
          <div class="sm-word">${w.word}</div>
          ${w.phonetic ? `<div class="sm-phonetic">${w.phonetic}</div>` : ""}
        </div>
        <div class="sm-card-divider"></div>
        <div class="sm-card-back" id="smReveal">
          <button class="sm-reveal-btn" id="smRevealBtn">
            Tap to reveal meaning
          </button>
        </div>
      </div>
    </div>

    <div class="sm-rating-row" id="smRatingRow" style="display:none">
      <button class="rating-btn r-blank" onclick="rateWord('blank')">
        <span class="r-icon">✗</span>
        <span class="r-label">Blank</span>
      </button>
      <button class="rating-btn r-fuzzy" onclick="rateWord('fuzzy')">
        <span class="r-icon">~</span>
        <span class="r-label">Fuzzy</span>
      </button>
      <button class="rating-btn r-easy" onclick="rateWord('easy')">
        <span class="r-icon">✓</span>
        <span class="r-label">Easy</span>
      </button>
    </div>`;

  sessionRevealed = false;
}

function revealCard() {
  if (sessionRevealed) return;
  const w = session[sessionIndex];
  const revealArea = document.getElementById("smReveal");
  const ratingRow = document.getElementById("smRatingRow");
  if (!revealArea) return;

  revealArea.innerHTML = `
    <div class="sm-meanings">
      ${w.meanings
        .map(
          (m) => `
        <div class="sm-meaning-block">
          <span class="pos-tag ${posClass(m.pos)}">${m.pos}</span>
          <div class="def-text">${m.def}</div>
          ${m.ex ? `<div class="ex-text">"${m.ex}"</div>` : ""}
        </div>`
        )
        .join("")}
    </div>`;

  // disable card click after revealed so ratings don't conflict
  const card = revealArea.closest(".sm-card");
  if (card) card.style.cursor = "default";
  if (ratingRow) ratingRow.style.display = "flex";
  sessionRevealed = true;
}

function rateWord(rating) {
  const w = session[sessionIndex];
  const wordInStore = words.find((x) => x.id === w.id);
  if (wordInStore) {
    if (!wordInStore.ratings) wordInStore.ratings = [];
    wordInStore.ratings.push(rating);
    save();
  }
  sessionIndex++;
  renderSessionCard();
}

// ── SWIPE TO DELETE ────────────────────────────────────────────────────────
let swipeStartX = 0,
  swipeStartY = 0,
  swipingCard = null,
  swipeOpen = null;
const SWIPE_THRESHOLD = 60;
const DELETE_BTN_W = 72;

document.addEventListener(
  "touchstart",
  (e) => {
    const card = e.target.closest(".wcard");
    if (!card) return;
    // close any other open swipe
    if (swipeOpen && swipeOpen !== card) {
      closeSwipe(swipeOpen);
      swipeOpen = null;
    }
    swipeStartX = e.touches[0].clientX;
    swipeStartY = e.touches[0].clientY;
    swipingCard = card;
  },
  { passive: true }
);

document.addEventListener(
  "touchmove",
  (e) => {
    if (!swipingCard) return;
    const dx = e.touches[0].clientX - swipeStartX;
    const dy = e.touches[0].clientY - swipeStartY;
    if (Math.abs(dy) > Math.abs(dx) + 8) {
      swipingCard = null;
      return;
    }
    if (dx > 0 && swipeOpen === swipingCard) {
      const pct = Math.max(0, DELETE_BTN_W - dx);
      swipingCard.style.transform = `translateX(-${pct}px)`;
      return;
    }
    if (dx < -4) {
      const shift = Math.min(DELETE_BTN_W, Math.abs(dx));
      swipingCard.style.transform = `translateX(-${shift}px)`;
    }
  },
  { passive: true }
);

document.addEventListener(
  "touchend",
  (e) => {
    if (!swipingCard) return;
    const dx = e.changedTouches[0].clientX - swipeStartX;
    const card = swipingCard;
    swipingCard = null;
    card.style.transition = "transform 0.22s cubic-bezier(.4,0,.2,1)";
    if (dx < -SWIPE_THRESHOLD) {
      card.style.transform = `translateX(-${DELETE_BTN_W}px)`;
      swipeOpen = card;
    } else {
      card.style.transform = "translateX(0)";
      if (swipeOpen === card) swipeOpen = null;
    }
    setTimeout(() => {
      card.style.transition = "";
    }, 240);
  },
  { passive: true }
);

// Tap outside any open card — close it
document.addEventListener("click", (e) => {
  if (swipeOpen && !swipeOpen.closest(".swipe-wrap")?.contains(e.target)) {
    closeSwipe(swipeOpen);
    swipeOpen = null;
  }
});

function closeSwipe(card) {
  if (!card) return;
  card.style.transition = "transform 0.2s cubic-bezier(.4,0,.2,1)";
  card.style.transform = "translateX(0)";
  setTimeout(() => {
    card.style.transition = "";
  }, 220);
}

// ── DELETE ─────────────────────────────────────────────────────────────────
function deleteWord(id) {
  words = words.filter((w) => w.id !== id);
  save();
  if (activeTab === "today") renderToday();
  if (activeTab === "library") renderLibrary();
  if (activeTab === "study") renderStudyHome();
  updateStreak();
  showToast("Word removed");
}

// ── HELPERS ────────────────────────────────────────────────────────────────
function posClass(pos) {
  if (!pos) return "pos-other";
  const p = pos.toLowerCase();
  if (p.includes("noun")) return "pos-noun";
  if (p.includes("verb")) return "pos-verb";
  if (p.includes("adj")) return "pos-adj";
  if (p.includes("adv")) return "pos-adv";
  return "pos-other";
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2200);
}

// ── SETTINGS SHEET ─────────────────────────────────────────────────────────
function openSettingsSheet() {
  // deactivate all tabs visually (settings isn't a real screen)
  document
    .querySelectorAll(".tab-item")
    .forEach((t) => t.classList.remove("active"));
  document.getElementById("tab-settings").classList.add("active");
  document.getElementById("settingsSheet").classList.add("open");
  document.getElementById("modalOverlay").classList.add("open");
  updateThemeButtons();
}
function closeSettingsSheet() {
  document.getElementById("settingsSheet").classList.remove("open");
  document.getElementById("modalOverlay").classList.remove("open");
  // restore active tab
  document
    .querySelectorAll(".tab-item")
    .forEach((t) => t.classList.remove("active"));
  document.getElementById("tab-" + activeTab).classList.add("active");
}

// ── THEME ───────────────────────────────────────────────────────────────────
const systemDark = window.matchMedia("(prefers-color-scheme: dark)");

function applyTheme(mode) {
  const isLight =
    mode === "light" || (mode === "system" && !systemDark.matches);
  document.body.classList.toggle("light", isLight);
}

function setTheme(mode) {
  localStorage.setItem("wordie_theme", mode);
  applyTheme(mode);
  updateThemeButtons();
}

function updateThemeButtons() {
  const saved = localStorage.getItem("wordie_theme") || "system";
  ["light", "dark", "system"].forEach((m) => {
    const el = document.getElementById("theme-" + m);
    if (el) el.classList.toggle("active", saved === m);
  });
}

// Listen for system preference changes
systemDark.addEventListener("change", () => {
  if ((localStorage.getItem("wordie_theme") || "system") === "system")
    applyTheme("system");
});

// Apply on load
applyTheme(localStorage.getItem("wordie_theme") || "system");

// ── UPDATE ───────────────────────────────────────────────────────────────────
function checkForUpdate() {
  const icon = document.getElementById("updateIcon");
  if (icon) {
    icon.style.animation = "spin 0.7s linear";
    setTimeout(() => {
      icon.style.animation = "";
    }, 700);
  }
  if (!("serviceWorker" in navigator)) {
    showToast("No service worker");
    return;
  }
  navigator.serviceWorker.getRegistration().then((reg) => {
    if (!reg) {
      showToast("Not installed as PWA yet");
      return;
    }
    reg.unregister().then(() => {
      showToast("Updated! Reloading…");
      setTimeout(() => location.reload(true), 1200);
    });
  });
}

// ── STICKY HEADER BLUR ─────────────────────────────────────────────────────
document.querySelectorAll(".screen").forEach((screen) => {
  screen.addEventListener(
    "scroll",
    () => {
      const topbar = screen.querySelector(".topbar");
      if (!topbar) return;
      topbar.classList.toggle("scrolled", screen.scrollTop > 10);
    },
    { passive: true }
  );
});

// ── INIT ───────────────────────────────────────────────────────────────────
renderToday();

// spin animation injected via style
const _style = document.createElement("style");
_style.textContent = "@keyframes spin { to { transform: rotate(360deg); } }";
document.head.appendChild(_style);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () =>
    navigator.serviceWorker.register("sw.js")
  );
}
