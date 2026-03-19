// ── STATE ──────────────────────────────────────────────────────────────────
const STORE = "wordie_v2";
const COLORS = ["c-violet", "c-mint", "c-amber", "c-coral", "c-sky"];

let words = [];
let activeTab = "today";
let dailyGoal = 5;
let session = [];
let sessionIndex = 0;
let sessionRevealed = false;

function load() {
  try {
    words = JSON.parse(localStorage.getItem(STORE)) || [];
  } catch {
    words = [];
  }
  dailyGoal = parseInt(localStorage.getItem("wordie_goal") || "5", 10);
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
  }, 80);
}

function closeAllSheets() {
  closeSheet();
  closeSettingsSheet();
  closeIosSheet();
}

function closeSheet() {
  document.getElementById("addSheet").classList.remove("open");
  document.getElementById("addSheet").style.transform = "";
  document.getElementById("modalOverlay").classList.remove("open");
  const inp = document.getElementById("wordInput");
  if (inp) {
    inp.value = "";
    inp.blur();
  }
  const fs = document.getElementById("fetchStatus");
  if (fs) {
    fs.textContent = "";
    fs.className = "fetch-status";
  }
}

// iOS keyboard push
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", () => {
    const sheet = document.getElementById("addSheet");
    if (!sheet.classList.contains("open")) return;
    const kb = window.innerHeight - window.visualViewport.height;
    sheet.style.transform =
      kb > 50
        ? `translateX(-50%) translateY(-${kb}px)`
        : "translateX(-50%) translateY(0)";
  });
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
    if (!res.ok) throw 0;
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
      audio:
        entry.phonetics?.find((p) => p.audio && p.audio.trim())?.audio || "",
      meanings,
      date: todayKey(),
      color: COLORS[words.length % COLORS.length],
      ratings: [],
    };
    words.unshift(obj);
    save();
    inp.value = "";
    status.className = "fetch-status ok";
    status.textContent = `✓ "${obj.word}" added`;
    haptic("light");
    updateStreak();
    if (activeTab === "today") renderToday();
    if (activeTab === "library") renderLibrary();
    setTimeout(() => {
      if (status) {
        status.textContent = "";
        status.className = "fetch-status";
      }
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
  const pct = Math.min(100, Math.round((today.length / dailyGoal) * 100));
  const goalMet = today.length >= dailyGoal;
  const wotd = getWordOfDay();

  let html = `
    <div class="today-hero">
      <div class="today-time">${greeting}</div>
      <div class="today-count${goalMet ? " goal-met" : ""}">${
    today.length
  }</div>
      <div class="today-label">${
        today.length === 1 ? "word recorded" : "words recorded"
      } today</div>
      <div class="today-date">${dateStr}</div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="today-goal">Goal: ${today.length} / ${dailyGoal} words${
    goalMet ? " 🎉" : ""
  }</div>
    </div>`;

  if (wotd) {
    html += `<div class="section-hd"><h3>Word of the day</h3></div>
      <div class="cards-list">${buildCard(wotd, false)}</div>
      <div style="height:12px"></div>`;
  }

  if (!today.length) {
    html += `<div class="empty-state">
      <div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></div>
      <div class="empty-title">Nothing yet today</div>
      <div class="empty-sub">Tap the + button to record your first word.</div>
      <button class="empty-cta" onclick="openSheet()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
        Add first word
      </button></div>`;
    const fab = document.getElementById("todayFab");
    if (fab) fab.remove();
  } else {
    html += `<div class="section-hd"><h3>Today's words</h3><span class="badge">${
      today.length
    }</span></div>
      <div class="cards-list">${today
        .map((w) => buildCard(w, true))
        .join("")}</div>
      <div style="height:88px"></div>`;
    showFab();
  }
  document.getElementById("todayContent").innerHTML = html;
}

function getWordOfDay() {
  const today = todayKey();
  const candidates = words.filter((w) => w.date !== today);
  if (!candidates.length) return null;
  return (
    [...candidates].sort(
      (a, b) => (a.ratings?.length || 0) - (b.ratings?.length || 0)
    )[0] || null
  );
}

function showFab() {
  if (document.getElementById("todayFab")) return;
  const fab = document.createElement("button");
  fab.id = "todayFab";
  fab.className = "fab";
  fab.onclick = openSheet;
  fab.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`;
  document.getElementById("app").appendChild(fab);
}

// ── LIBRARY SEARCH ─────────────────────────────────────────────────────────
function toggleSearch() {
  const wrap = document.getElementById("searchWrap");
  const btn = document.getElementById("searchToggleBtn");
  const inp = document.getElementById("searchInput");
  if (!wrap) return;
  const isOpen = wrap.classList.contains("search-open");
  if (isOpen) {
    wrap.classList.remove("search-open");
    btn.classList.remove("active");
    if (inp) {
      inp.value = "";
      inp.blur();
    }
    renderLibrary();
  } else {
    wrap.classList.add("search-open");
    btn.classList.add("active");
    setTimeout(() => inp?.focus(), 200);
  }
}

function clearSearch() {
  const inp = document.getElementById("searchInput");
  if (inp) {
    inp.value = "";
    inp.focus();
  }
  renderLibrary();
}

// ── LIBRARY ────────────────────────────────────────────────────────────────
function renderLibrary() {
  const query = (document.getElementById("searchInput")?.value || "")
    .trim()
    .toLowerCase();
  const clearBtn = document.getElementById("searchClearBtn");
  if (clearBtn) clearBtn.style.display = query ? "flex" : "none";
  const filtered = query
    ? words.filter((w) => w.word.toLowerCase().includes(query))
    : words;
  const container = document.getElementById("libraryContent");

  if (!words.length) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 19V6a2 2 0 012-2h13"/><path d="M4 19a2 2 0 002 2h13V4"/></svg></div>
      <div class="empty-title">Library is empty</div>
      <div class="empty-sub">Words you add will appear here, grouped by day.</div></div>`;
    showFab();
    return;
  }

  if (query && !filtered.length) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg></div>
      <div class="empty-title">No results</div>
      <div class="empty-sub">No words match "<strong>${query}</strong>"</div></div>`;
    return;
  }

  const grouped = {};
  filtered.forEach((w) => {
    (grouped[w.date] = grouped[w.date] || []).push(w);
  });
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  let html = "";
  dates.forEach((date) => {
    const g = grouped[date];
    html += `<div class="section-hd mt8"><h3>${dateLabel(
      date
    )}</h3><span class="badge">${g.length}</span></div>
      <div class="cards-list">${g
        .map((w) => buildCard(w, true))
        .join("")}</div>`;
  });
  html += '<div style="height:88px"></div>';
  container.innerHTML = html;
  showFab();
}

function clearSearch() {
  const inp = document.getElementById("searchInput");
  if (inp) {
    inp.value = "";
    inp.focus();
  }
  renderLibrary();
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
function toggleCard(cardEl) {
  if (!cardEl) return;
  const body = cardEl.querySelector(".card-body");
  const arrow = cardEl.querySelector(".card-arrow");
  if (!body) return;
  const isOpen = body.classList.contains("card-body-open");
  // Close other open cards within the same screen only
  const screen = cardEl.closest(".screen");
  if (screen) {
    screen.querySelectorAll(".card-body-open").forEach((el) => {
      if (el === body) return;
      el.classList.remove("card-body-open");
      const oArrow = el.closest(".wcard")?.querySelector(".card-arrow");
      if (oArrow) oArrow.style.transform = "rotate(0deg)";
    });
  }
  if (!isOpen) {
    body.classList.add("card-body-open");
    if (arrow) arrow.style.transform = "rotate(180deg)";
  } else {
    body.classList.remove("card-body-open");
    if (arrow) arrow.style.transform = "rotate(0deg)";
  }
}

let _didSwipe = false;
function handleCardTap(e, id) {
  if (
    e.target.closest(".audio-btn") ||
    e.target.closest(".swipe-del-btn") ||
    e.target.closest(".card-body")
  )
    return;
  if (_didSwipeMove) return;
  toggleCard(e.currentTarget);
}

function buildCard(w, showDel) {
  const ratingDot = "";
  const sparkline = "";
  const delBtn = showDel
    ? `<button class="swipe-del-btn" onclick="deleteWord(${w.id})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg></button>`
    : "";

  return `<div class="swipe-wrap" id="swipe-${w.id}">${delBtn}
    <div class="wcard ${w.color || "c-violet"}" id="wcard-${
    w.id
  }" onclick="handleCardTap(event,${w.id})">
      <div class="wcard-top">
        <div class="wcard-left">${ratingDot}
          <div>
            <div class="wcard-word">${w.word}</div>
            <div style="display:flex;align-items:center;gap:6px;">
              ${
                w.phonetic
                  ? `<div class="wcard-phonetic">${w.phonetic}</div>`
                  : ""
              }
              ${
                w.audio
                  ? `<button class="audio-btn" onclick="event.stopPropagation();playAudio('${w.audio}',this)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/><path d="M19.07 4.93a10 10 0 010 14.14"/></svg></button>`
                  : ""
              }
            </div>
          </div>
        </div>
        <div class="wcard-actions">
          <div class="wcard-date">${dateLabel(w.date)}</div>
          <div class="card-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg></div>
        </div>
      </div>
      <div class="card-body" onclick="event.stopPropagation()">
        <div class="wcard-meanings">
          ${w.meanings
            .map(
              (m) =>
                `<div><span class="pos-tag ${posClass(m.pos)}">${
                  m.pos
                }</span><div class="def-text">${m.def}</div>${
                  m.ex ? `<div class="ex-text">"${m.ex}"</div>` : ""
                }</div>`
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
    area.innerHTML = `<div class="study-home"><div class="empty-state">
      <div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M12 5v14M2 12h20"/></svg></div>
      <div class="empty-title">No words yet</div>
      <div class="empty-sub">Add words to start a study session.</div>
    </div></div>`;
    return;
  }
  const total = words.length;
  const blanks = words.filter((w) => lastRating(w) === "blank").length;
  const fuzzies = words.filter((w) => lastRating(w) === "fuzzy").length;
  const easies = words.filter((w) => lastRating(w) === "easy").length;
  const opts = [5, 10, 15, 20].filter((n) => n <= total);
  if (!opts.includes(total)) opts.push(total);

  let html = `<div class="study-home">
    <div class="study-stats-row">
      <div class="study-stat"><div class="study-stat-num">${total}</div><div class="study-stat-label">Total</div></div>
      <div class="study-stat"><div class="study-stat-num stat-blank">${blanks}</div><div class="study-stat-label">Blank</div></div>
      <div class="study-stat"><div class="study-stat-num stat-fuzzy">${fuzzies}</div><div class="study-stat-label">Fuzzy</div></div>
      <div class="study-stat"><div class="study-stat-num stat-easy">${easies}</div><div class="study-stat-label">Easy</div></div>
    </div>
    <div class="session-config">
      <div class="session-config-label">Words per session</div>
      <div class="session-size-row" id="sessionSizeRow">
        ${opts
          .map(
            (n, i) =>
              `<button class="size-btn ${
                i === 0 ? "active" : ""
              }" onclick="selectSize(${n},this)">${
                n === total ? "All " + n : n
              }</button>`
          )
          .join("")}
      </div>
    </div>
    <div class="session-config" style="margin-top:12px">
      <div class="session-config-label">Study from</div>
      <div class="session-size-row">
        <button class="size-btn active" id="filter-all"     onclick="selectFilter('all',this)">All</button>
        <button class="size-btn"        id="filter-blank"   onclick="selectFilter('blank',this)">Blank</button>
        <button class="size-btn"        id="filter-fuzzy"   onclick="selectFilter('fuzzy',this)">Fuzzy</button>
        <button class="size-btn"        id="filter-unrated" onclick="selectFilter('unrated',this)">New</button>
      </div>
    </div>
    <button class="start-session-btn" onclick="startSession()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      Start session
    </button>`;

  // Resume saved session?
  const saved = sessionStorage.getItem("wordie_session");
  if (saved) {
    try {
      const s = JSON.parse(saved);
      if (s.ids?.length && s.index < s.ids.length) {
        html += `<button class="reshuffle-btn" style="margin-top:10px;width:100%" onclick="resumeSession()">Resume last session (${s.index}/${s.ids.length})</button>`;
      }
    } catch {}
  }

  if (blanks + fuzzies > 0) {
    html += `<div class="weak-words-section">
      <div class="section-hd" style="padding:0;margin-bottom:10px"><h3>Needs work</h3><span class="badge">${
        blanks + fuzzies
      }</span></div>
      <div class="cards-list" style="padding:0">${words
        .filter((w) => lastRating(w) === "blank" || lastRating(w) === "fuzzy")
        .map((w) => buildCard(w, false))
        .join("")}</div>
    </div>`;
  }
  html += "</div>";
  area.innerHTML = html;
  window._sessionSize = opts[0];
  window._sessionFilter = "all";
}

function selectSize(n, btn) {
  document
    .querySelectorAll("#sessionSizeRow .size-btn")
    .forEach((b) => b.classList.remove("active"));
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
  return w.ratings?.length ? w.ratings[w.ratings.length - 1] : null;
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
  session = pool.sort(() => Math.random() - 0.5).slice(0, size);
  sessionIndex = 0;
  sessionRevealed = false;
  saveSessionState();
  openStudyModal();
}

function resumeSession() {
  const saved = sessionStorage.getItem("wordie_session");
  if (!saved) return;
  try {
    const s = JSON.parse(saved);
    session = s.ids.map((id) => words.find((w) => w.id === id)).filter(Boolean);
    sessionIndex = s.index;
    sessionRevealed = false;
    openStudyModal();
  } catch {
    sessionStorage.removeItem("wordie_session");
  }
}

function saveSessionState() {
  sessionStorage.setItem(
    "wordie_session",
    JSON.stringify({ ids: session.map((w) => w.id), index: sessionIndex })
  );
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
  sessionStorage.removeItem("wordie_session");
  if (activeTab === "study") renderStudyHome();
  if (activeTab === "today") renderToday();
  if (activeTab === "library") renderLibrary();
}

function renderSessionCard() {
  const modal = document.getElementById("studyModal");
  if (!modal) return;
  if (sessionIndex >= session.length) {
    sessionStorage.removeItem("wordie_session");
    const ratings = session.map((w) => lastRating(w));
    const easy = ratings.filter((r) => r === "easy").length,
      fuzzy = ratings.filter((r) => r === "fuzzy").length,
      blank = ratings.filter((r) => r === "blank").length;
    modal.innerHTML = `<div class="sm-summary">
      <div class="sm-summary-title">Session complete</div>
      <div class="sm-summary-sub">${session.length} words reviewed</div>
      <div class="sm-result-row">
        <div class="sm-result-item"><div class="sm-result-num sm-easy">${easy}</div><div class="sm-result-label">Easy</div></div>
        <div class="sm-result-item"><div class="sm-result-num sm-fuzzy">${fuzzy}</div><div class="sm-result-label">Fuzzy</div></div>
        <div class="sm-result-item"><div class="sm-result-num sm-blank">${blank}</div><div class="sm-result-label">Blank</div></div>
      </div>
      <button class="sm-done-btn" onclick="closeStudyModal()">Done</button>
      <button class="sm-again-btn" onclick="startSession()">Study again</button>
    </div>`;
    return;
  }
  const w = session[sessionIndex],
    num = sessionIndex + 1,
    tot = session.length,
    pct = (sessionIndex / tot) * 100;
  modal.innerHTML = `
    <div class="sm-header">
      <button class="sm-close" onclick="closeStudyModal()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
      <div class="sm-progress-bar"><div class="sm-progress-fill" style="width:${pct}%"></div></div>
      <div class="sm-counter">${num} / ${tot}</div>
    </div>
    <div class="sm-body">
      <div class="sm-card" id="smCard" onclick="revealCard()">
        <div class="sm-card-front">
          <div class="sm-word">${w.word}</div>
          <div style="display:flex;align-items:center;gap:8px;margin-top:8px;">
            ${
              w.phonetic
                ? `<div class="sm-phonetic" style="margin-top:0">${w.phonetic}</div>`
                : ""
            }
            ${
              w.audio
                ? `<button class="audio-btn" onclick="event.stopPropagation();playAudio('${w.audio}',this)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/><path d="M19.07 4.93a10 10 0 010 14.14"/></svg></button>`
                : ""
            }
          </div>
        </div>
        <div class="sm-card-divider"></div>
        <div class="sm-card-back" id="smReveal">
          <button class="sm-reveal-btn">Tap to reveal meaning</button>
        </div>
      </div>
    </div>
    <div class="sm-rating-row" id="smRatingRow" style="display:none">
      <button class="rating-btn r-blank" onclick="rateWord('blank')"><span class="r-icon">✗</span><span class="r-label">Blank</span></button>
      <button class="rating-btn r-fuzzy" onclick="rateWord('fuzzy')"><span class="r-icon">~</span><span class="r-label">Fuzzy</span></button>
      <button class="rating-btn r-easy"  onclick="rateWord('easy')"><span class="r-icon">✓</span><span class="r-label">Easy</span></button>
    </div>`;
  sessionRevealed = false;
}

function revealCard() {
  if (sessionRevealed) return;
  const w = session[sessionIndex],
    revealArea = document.getElementById("smReveal"),
    ratingRow = document.getElementById("smRatingRow");
  if (!revealArea) return;
  revealArea.innerHTML = `<div class="sm-meanings">${w.meanings
    .map(
      (m) =>
        `<div class="sm-meaning-block"><span class="pos-tag ${posClass(
          m.pos
        )}">${m.pos}</span><div class="def-text">${m.def}</div>${
          m.ex ? `<div class="ex-text">"${m.ex}"</div>` : ""
        }</div>`
    )
    .join("")}</div>`;
  const card = document.getElementById("smCard");
  if (card) card.style.cursor = "default";
  if (ratingRow) ratingRow.style.display = "flex";
  sessionRevealed = true;
}

function rateWord(rating) {
  haptic(rating === "easy" ? "medium" : "light");
  const w = session[sessionIndex],
    ws = words.find((x) => x.id === w.id);
  if (ws) {
    if (!ws.ratings) ws.ratings = [];
    ws.ratings.push(rating);
    save();
  }
  sessionIndex++;
  saveSessionState();
  renderSessionCard();
}

// ── SWIPE TO DELETE ────────────────────────────────────────────────────────
let swipeStartX = 0,
  swipeStartY = 0,
  swipingCard = null,
  swipeOpen = null,
  _didSwipeMove = false;
const SWIPE_THRESHOLD = 55,
  DELETE_BTN_W = 72;

document.addEventListener(
  "touchstart",
  (e) => {
    const card = e.target.closest(".wcard");
    if (!card) return;
    if (swipeOpen && swipeOpen !== card) {
      closeSwipe(swipeOpen);
      swipeOpen = null;
    }
    swipeStartX = e.touches[0].clientX;
    swipeStartY = e.touches[0].clientY;
    swipingCard = card;
    _didSwipeMove = false;
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
    if (Math.abs(dx) > 8) {
      _didSwipeMove = true;
      const wrap = swipingCard.closest(".swipe-wrap");
      if (wrap) wrap.classList.add("swiping");
    }
    if (dx > 0 && swipeOpen === swipingCard) {
      swipingCard.style.transform = `translateX(-${Math.max(
        0,
        DELETE_BTN_W - dx
      )}px)`;
      return;
    }
    if (dx < -4)
      swipingCard.style.transform = `translateX(-${Math.min(
        DELETE_BTN_W,
        Math.abs(dx)
      )}px)`;
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

    if (!_didSwipeMove) {
      // Pure tap — let onclick handle it, just return
      return;
    }

    // Was a swipe
    card.style.transition = "transform 0.22s cubic-bezier(.4,0,.2,1)";
    if (dx < -SWIPE_THRESHOLD) {
      card.style.transform = `translateX(-${DELETE_BTN_W}px)`;
      swipeOpen = card;
    } else {
      card.style.transform = "translateX(0)";
      if (swipeOpen === card) swipeOpen = null;
      const wrap = card.closest(".swipe-wrap");
      if (wrap) setTimeout(() => wrap.classList.remove("swiping"), 220);
    }
    setTimeout(() => {
      card.style.transition = "";
      _didSwipeMove = false;
    }, 350);
  },
  { passive: true }
);

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
  const wrap = card.closest(".swipe-wrap");
  if (wrap) setTimeout(() => wrap.classList.remove("swiping"), 200);
  setTimeout(() => {
    card.style.transition = "";
  }, 220);
}

// ── DELETE ─────────────────────────────────────────────────────────────────
function deleteWord(id) {
  words = words.filter((w) => w.id !== id);
  save();
  haptic("light");
  if (activeTab === "today") renderToday();
  if (activeTab === "library") renderLibrary();
  if (activeTab === "study") renderStudyHome();
  updateStreak();
  showToast("Word removed");
}

// ── AUDIO ──────────────────────────────────────────────────────────────────
let _audio = null;
function playAudio(url, btn) {
  if (!url) return;
  if (_audio) {
    _audio.pause();
    _audio = null;
  }
  _audio = new Audio(url);
  _audio.play().catch(() => showToast("Audio unavailable"));
  btn.classList.add("audio-playing");
  _audio.addEventListener("ended", () => btn.classList.remove("audio-playing"));
  _audio.addEventListener("error", () => {
    btn.classList.remove("audio-playing");
    showToast("Audio unavailable");
  });
}

// ── HAPTICS ────────────────────────────────────────────────────────────────
function haptic(type = "light") {
  if (!("vibrate" in navigator)) return;
  navigator.vibrate({ light: [10], medium: [20], heavy: [30] }[type] || [10]);
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

// ── SETTINGS ───────────────────────────────────────────────────────────────
function openSettingsSheet() {
  document
    .querySelectorAll(".tab-item")
    .forEach((t) => t.classList.remove("active"));
  document.getElementById("tab-settings").classList.add("active");
  document.getElementById("settingsSheet").classList.add("open");
  document.getElementById("modalOverlay").classList.add("open");
  updateThemeButtons();
  updateGoalButtons();
}
function closeSettingsSheet() {
  document.getElementById("settingsSheet").classList.remove("open");
  document.getElementById("modalOverlay").classList.remove("open");
  document
    .querySelectorAll(".tab-item")
    .forEach((t) => t.classList.remove("active"));
  document.getElementById("tab-" + activeTab).classList.add("active");
}

function setGoal(n) {
  dailyGoal = n;
  localStorage.setItem("wordie_goal", n);
  updateGoalButtons();
  if (activeTab === "today") renderToday();
}
function updateGoalButtons() {
  [3, 5, 10].forEach((n) => {
    const el = document.getElementById("goal-" + n);
    if (el) el.classList.toggle("active", dailyGoal === n);
  });
}

// ── THEME ───────────────────────────────────────────────────────────────────
const systemDark = window.matchMedia("(prefers-color-scheme: dark)");
function applyTheme(mode) {
  document.body.classList.toggle(
    "light",
    mode === "light" || (mode === "system" && !systemDark.matches)
  );
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
systemDark.addEventListener("change", () => {
  if ((localStorage.getItem("wordie_theme") || "system") === "system")
    applyTheme("system");
});
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

// ── EXPORT CSV ─────────────────────────────────────────────────────────────
function exportCSV() {
  if (!words.length) {
    showToast("No words to export");
    return;
  }
  const header =
    "Word,Phonetic,Part of Speech,Definition,Example,Date Added,Last Rating";
  const rows = words.map((w) => {
    const m = w.meanings[0] || {};
    const esc = (s) => `"${(s || "").replace(/"/g, '""')}"`;
    return [
      esc(w.word),
      esc(w.phonetic),
      esc(m.pos),
      esc(m.def),
      esc(m.ex),
      esc(w.date),
      esc(lastRating(w) || ""),
    ].join(",");
  });
  const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(blob),
    download: "wordie-words.csv",
  });
  a.click();
  URL.revokeObjectURL(a.href);
  showToast("Exported!");
}

// ── ONBOARDING ─────────────────────────────────────────────────────────────
function dismissOnboarding() {
  localStorage.setItem("wordie_onboarded", "1");
  const el = document.getElementById("onboardOverlay");
  if (!el) return;
  el.classList.remove("show");
  el.classList.add("dismissed");
  setTimeout(() => el.remove(), 400);
}
if (!localStorage.getItem("wordie_onboarded")) {
  const el = document.getElementById("onboardOverlay");
  if (el) el.classList.add("show");
} else {
  const el = document.getElementById("onboardOverlay");
  if (el) el.remove();
}

// ── STICKY HEADER BLUR ─────────────────────────────────────────────────────
document.querySelectorAll(".screen").forEach((screen) => {
  screen.addEventListener(
    "scroll",
    () => {
      const tb = screen.querySelector(".topbar");
      if (!tb) return;
      tb.classList.toggle("scrolled", screen.scrollTop > 10);
    },
    { passive: true }
  );
});

// ── INSTALL ────────────────────────────────────────────────────────────────
let _installPrompt = null;

// Capture the install prompt (Android/Chrome)
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  _installPrompt = e;
  showInstallSection();
});

// Check if already installed
function isInstalled() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function showInstallSection() {
  const sec = document.getElementById("installSection");
  if (sec) sec.style.display = "block";
}

function triggerInstall() {
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (_installPrompt) {
    // Android / Chrome — native prompt
    _installPrompt.prompt();
    _installPrompt.userChoice.then((choice) => {
      if (choice.outcome === "accepted") {
        const sec = document.getElementById("installSection");
        if (sec) sec.style.display = "none";
        showToast("Wordie installed!");
      }
      _installPrompt = null;
    });
  } else if (isIos) {
    // iOS — show instructions sheet
    openIosSheet();
  } else {
    showToast("Open in Chrome or Safari to install");
  }
}

function openIosSheet() {
  document.getElementById("iosInstallSheet").classList.add("open");
  document.getElementById("modalOverlay").classList.add("open");
}
function closeIosSheet() {
  document.getElementById("iosInstallSheet").classList.remove("open");
  document.getElementById("modalOverlay").classList.remove("open");
}

// Show install button on iOS if not installed
if (!isInstalled() && /iphone|ipad|ipod/i.test(navigator.userAgent)) {
  showInstallSection();
}

// ── INIT ───────────────────────────────────────────────────────────────────
renderToday();
const _style = document.createElement("style");
_style.textContent = "@keyframes spin{to{transform:rotate(360deg)}}";
document.head.appendChild(_style);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () =>
    navigator.serviceWorker.register("sw.js")
  );
}
