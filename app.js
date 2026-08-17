/* AEVARANNA – App-Logik v2 */

const STORAGE_KEYS = {
  learn: "aevaranna-tarot.learn.v2",
  favorites: "aevaranna-tarot.favorites.v1",
  customSpreads: "aevaranna-tarot.customSpreads.v1",
  settings: "aevaranna-tarot.settings.v1",
  streak: "aevaranna-tarot.streak.v1",
  achievements: "aevaranna-tarot.achievements.v1",
  onboarded: "aevaranna-tarot.onboarded.v1",
  drawStats: "aevaranna-tarot.drawstats.v1",
  wishes: "aevaranna-tarot.wishes.v1"
};

function loadJSON(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch (e) { return fallback; }
}
function saveJSON(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
}

const DEFAULT_SETTINGS = { reverseChance: 35, theme: "dark", haptics: true, sound: true };

const state = {
  tab: "legen",
  learn: loadJSON(STORAGE_KEYS.learn, {}), // { cardId: { seen, level, known } }
  favorites: loadJSON(STORAGE_KEYS.favorites, []),
  customSpreads: loadJSON(STORAGE_KEYS.customSpreads, []),
  settings: Object.assign({}, DEFAULT_SETTINGS, loadJSON(STORAGE_KEYS.settings, {})),
  lexFilter: "",
  lexArcana: "all",
  lexFavOnly: false,
  learnMode: "flash",
  learnQueue: [],
  learnIndex: 0,
  learnRevealed: false,
  learnQuiz: null
};

/* ---------- Zieh-Statistik (nur anonyme Zähler, keine Liste vergangener Legungen) ---------- */
function getDrawStats() { return loadJSON(STORAGE_KEYS.drawStats, { spreads: 0, cards: 0 }); }
function addDrawStats(cardCount) {
  const s = getDrawStats();
  s.spreads += 1;
  s.cards += cardCount;
  saveJSON(STORAGE_KEYS.drawStats, s);
  return s;
}

const BASE_SPREADS = {
  tage: { label: "Tageskarte", desc: "Eine Karte als Impuls für den Tag.", positions: ["Impuls für heute"], builtin: true },
  drei: { label: "Drei-Karten-Legung", desc: "Situation – Herausforderung – Rat. Vielseitig einsetzbar für jede Fragestellung.", positions: ["Situation", "Herausforderung", "Rat"], builtin: true },
  woche: {
    label: "Wochenlegung",
    desc: "Sieben Karten als Ausblick für die kommende Woche – eine Karte pro Tag.",
    positions: ["Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag","Sonntag"],
    builtin: true
  },
  kreuz: {
    label: "Keltisches Kreuz",
    desc: "Zehn Karten für eine ausführliche, vielschichtige Betrachtung einer Frage oder Lebenslage.",
    positions: ["Gegenwärtige Situation","Herausforderung","Bewusste Grundlage","Unbewusste Grundlage","Vergangenheit","Nahe Zukunft","Deine Haltung","Umfeld & Einflüsse","Hoffnung oder Furcht","Ergebnis"],
    builtin: true
  }
};

function allSpreads() {
  const custom = {};
  state.customSpreads.forEach(cs => { custom[cs.id] = { label: cs.label, desc: "Eigene Legung", positions: cs.positions, builtin: false, id: cs.id }; });
  return Object.assign({}, BASE_SPREADS, custom);
}

function haptic(ms) {
  if (state.settings.haptics && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} }
}

/* ---------- Klang-Feedback (Web Audio API, keine externen Dateien) ---------- */
let audioCtx = null;
function chime(freqs = [660, 880]) {
  if (!state.settings.sound) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const now = audioCtx.currentTime;
    freqs.forEach((f, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0, now + i * 0.09);
      gain.gain.linearRampToValueAtTime(0.09, now + i * 0.09 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.09 + 0.7);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(now + i * 0.09);
      osc.stop(now + i * 0.09 + 0.75);
    });
  } catch (e) {}
}

/* ---------- Nutzungs-Streak ---------- */
function todayKey(d = new Date()) { return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }
function updateStreak() {
  const data = loadJSON(STORAGE_KEYS.streak, { count: 0, lastDay: null });
  const today = todayKey();
  if (data.lastDay === today) return data.count;
  const yesterday = todayKey(new Date(Date.now() - 86400000));
  data.count = data.lastDay === yesterday ? data.count + 1 : 1;
  data.lastDay = today;
  saveJSON(STORAGE_KEYS.streak, data);
  return data.count;
}
function getStreak() { return loadJSON(STORAGE_KEYS.streak, { count: 0 }).count; }

/* ---------- Achievements ---------- */
const ACHIEVEMENTS = [
  { id: "erste_legung", label: "Erster Schritt", desc: "Deine erste Legung gemacht", icon: "M4 12 L12 5 L20 12", check: () => getDrawStats().spreads >= 1 },
  { id: "streak7", label: "Serientäter", desc: "7 Tage in Folge geöffnet", icon: "circle", check: () => getStreak() >= 7 },
  { id: "sammler", label: "Sammler", desc: "10 Karten als Favorit markiert", icon: "heart", check: () => state.favorites.length >= 10 },
  { id: "vieltuer", label: "Vieltuer", desc: "50 gezogene Karten insgesamt", icon: "cards", check: () => getDrawStats().cards >= 50 },
  { id: "major_meister", label: "Arkana-Meister", desc: "Alle 22 Trümpfe sicher gelernt", icon: "star", check: () => CARDS.filter(c => c.arcana === "major").every(c => cardLevel(c.id) >= 4) },
  { id: "kartenmeister", label: "Kartenmeister", desc: "Alle 78 Karten sicher gelernt", icon: "crown", check: () => CARDS.every(c => cardLevel(c.id) >= 4) }
];

function getUnlockedAchievements() { return loadJSON(STORAGE_KEYS.achievements, []); }

function checkAchievements() {
  const unlocked = getUnlockedAchievements();
  let newly = [];
  ACHIEVEMENTS.forEach(a => {
    if (!unlocked.includes(a.id) && a.check()) { unlocked.push(a.id); newly.push(a); }
  });
  if (newly.length) {
    saveJSON(STORAGE_KEYS.achievements, unlocked);
    newly.forEach((a, i) => setTimeout(() => showAchievementToast(a), i * 1400));
  }
}

function showAchievementToast(achievement) {
  fireConfetti();
  haptic([20, 40, 20]);
  chime([659, 880, 1046]);
  const toast = document.createElement("div");
  toast.className = "achievement-toast";
  toast.innerHTML = `<div class="achievement-toast-icon">🏆</div>
    <div><strong>Erfolg freigeschaltet</strong><br/>${achievement.label} – ${achievement.desc}</div>`;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add("show"), 20);
  setTimeout(() => { toast.classList.remove("show"); setTimeout(() => toast.remove(), 400); }, 3400);
}

function fireConfetti() {
  const colors = ["#E3B563", "#9B5FC7", "#6FA57A", "#F5EFE0"];
  const container = document.createElement("div");
  container.className = "confetti-container";
  for (let i = 0; i < 26; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    piece.style.left = Math.random() * 100 + "%";
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = (Math.random() * 0.3) + "s";
    piece.style.animationDuration = (1.6 + Math.random() * 1) + "s";
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    container.appendChild(piece);
  }
  document.body.appendChild(container);
  setTimeout(() => container.remove(), 3000);
}


function applyTheme() {
  document.documentElement.setAttribute("data-theme", state.settings.theme);
}

/* ---------- Kartenlogik ---------- */
function drawCards(n) {
  const pool = [...CARDS];
  const drawn = [];
  const chance = (state.settings.reverseChance ?? 35) / 100;
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    const card = pool.splice(idx, 1)[0];
    drawn.push({ id: card.id, reversed: Math.random() < chance });
  }
  return drawn;
}

function isFavorite(id) { return state.favorites.includes(id); }
function toggleFavorite(id) {
  if (isFavorite(id)) state.favorites = state.favorites.filter(f => f !== id);
  else state.favorites.push(id);
  saveJSON(STORAGE_KEYS.favorites, state.favorites);
  checkAchievements();
}

function cardFace(entry, positionLabel, animate, delay) {
  const card = getCard(entry.id);
  const art = generateCardArt(card);
  return `
    <div class="card ${entry.reversed ? "is-reversed" : ""} ${animate ? "flip-init" : ""}" data-card-id="${card.id}" style="${animate ? `animation-delay:${delay}ms` : ""}">
      <div class="card-inner">
        <div class="card-back-face"><svg viewBox="0 0 200 240"><rect width="200" height="240" rx="14" fill="#1B1530"/><circle cx="100" cy="120" r="30" fill="none" stroke="#C9A46A" stroke-width="1.5"/><circle cx="100" cy="120" r="4" fill="#C9A46A"/></svg></div>
        <div class="card-front-face">
          <div class="card-art">${art}<div class="card-glare"></div></div>
        </div>
      </div>
      <div class="card-name-bar">${card.name}</div>
      ${positionLabel ? `<div class="card-pos">${positionLabel}</div>` : ""}
      <div class="card-orientation">${entry.reversed ? "Umgekehrt" : "Aufrecht"}</div>
    </div>`;
}

function attachTilt(cardEl) {
  const art = cardEl.querySelector(".card-art");
  if (!art) return;
  const maxTilt = 10;
  function handleMove(x, y) {
    const rect = art.getBoundingClientRect();
    const px = (x - rect.left) / rect.width;
    const py = (y - rect.top) / rect.height;
    const rotY = (px - 0.5) * maxTilt * 2;
    const rotX = (0.5 - py) * maxTilt * 2;
    art.style.transform = `perspective(600px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.03)`;
    art.classList.add("tilting");
    const glare = art.querySelector(".card-glare");
    if (glare) glare.style.background = `radial-gradient(circle at ${px*100}% ${py*100}%, rgba(255,255,255,.4), transparent 60%)`;
  }
  function reset() {
    art.style.transform = "";
    art.classList.remove("tilting");
  }
  cardEl.addEventListener("touchmove", (e) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    handleMove(t.clientX, t.clientY);
  }, { passive: true });
  cardEl.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    handleMove(t.clientX, t.clientY);
  }, { passive: true });
  cardEl.addEventListener("touchend", reset);
  cardEl.addEventListener("mousemove", (e) => handleMove(e.clientX, e.clientY));
  cardEl.addEventListener("mouseleave", reset);
}

function renderLegen(root) {
  const spreads = allSpreads();
  root.innerHTML = `
    <section class="panel">
      <h2>Karten legen</h2>
      <div class="spread-picker">
        ${Object.keys(spreads).map(k => `<button class="chip" data-spread="${k}">${spreads[k].label}</button>`).join("")}
        <button class="chip chip-add" id="addSpreadBtn">+ Eigene Legung</button>
      </div>
      <div id="spreadArea"></div>
    </section>`;

  root.querySelectorAll("[data-spread]").forEach(btn => {
    btn.addEventListener("click", () => startSpread(btn.dataset.spread));
  });
  document.getElementById("addSpreadBtn").addEventListener("click", openCustomSpreadForm);
}

function openCustomSpreadForm() {
  const area = document.getElementById("spreadArea");
  area.innerHTML = `
    <div class="custom-spread-form">
      <h3 style="margin-top:0">Eigene Legung erstellen</h3>
      <input type="text" id="csName" placeholder="Name der Legung (z. B. Beziehungs-Legung)"/>
      <div id="csPositions"></div>
      <button class="btn-ghost" id="csAddPos">+ Position hinzufügen</button>
      <div class="cs-actions">
        <button class="btn-primary" id="csSave">Legung speichern</button>
      </div>
      ${state.customSpreads.length ? `<h3>Vorhandene eigene Legungen</h3><div id="csExisting" class="cs-existing"></div>` : ""}
    </div>`;
  const posWrap = document.getElementById("csPositions");
  function addPosRow(val) {
    const row = document.createElement("div");
    row.className = "cs-pos-row";
    row.innerHTML = `<input type="text" class="csPosInput" placeholder="Positionsname" value="${val || ""}"/><button class="btn-ghost cs-remove">×</button>`;
    row.querySelector(".cs-remove").addEventListener("click", () => row.remove());
    posWrap.appendChild(row);
  }
  addPosRow("Position 1"); addPosRow("Position 2");
  document.getElementById("csAddPos").addEventListener("click", () => addPosRow(""));
  document.getElementById("csSave").addEventListener("click", () => {
    const name = document.getElementById("csName").value.trim();
    const positions = Array.from(document.querySelectorAll(".csPosInput")).map(i => i.value.trim()).filter(Boolean);
    if (!name || positions.length < 1) { alert("Bitte einen Namen und mindestens eine Position angeben."); return; }
    const id = "custom_" + Date.now();
    state.customSpreads.push({ id, label: name, positions });
    saveJSON(STORAGE_KEYS.customSpreads, state.customSpreads);
    renderLegen(document.getElementById("view"));
  });
  if (state.customSpreads.length) renderExistingCustomSpreads();
}

function renderExistingCustomSpreads() {
  const el = document.getElementById("csExisting");
  if (!el) return;
  el.innerHTML = state.customSpreads.map(cs => `
    <div class="cs-existing-item">
      <span>${cs.label} (${cs.positions.length} Karten)</span>
      <button class="btn-ghost" data-del-spread="${cs.id}">Löschen</button>
    </div>`).join("");
  el.querySelectorAll("[data-del-spread]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.customSpreads = state.customSpreads.filter(cs => cs.id !== btn.dataset.delSpread);
      saveJSON(STORAGE_KEYS.customSpreads, state.customSpreads);
      renderLegen(document.getElementById("view"));
    });
  });
}

function startSpread(key) {
  const spread = allSpreads()[key];
  const area = document.getElementById("spreadArea");
  area.innerHTML = `
    <div class="spread-desc">${spread.desc}</div>
    <div class="question-block">
      <label for="questionInput">Deine Frage (optional)</label>
      <input type="text" id="questionInput" maxlength="140" placeholder="Wonach möchtest du schauen?"/>
    </div>
    <button class="btn-primary" id="drawBtn">Karten ziehen</button>
    <div id="drawResult"></div>`;
  document.getElementById("drawBtn").addEventListener("click", () => {
    const question = document.getElementById("questionInput").value.trim();
    haptic(30);
    chime([440, 523]);
    const resultEl = document.getElementById("drawResult");

    // Misch-Animation: kurzer Kartenfächer, bevor aufgedeckt wird
    resultEl.innerHTML = `<div class="shuffle-stack" aria-hidden="true">
      ${Array.from({length: 5}).map((_, i) => `<div class="shuffle-card" style="--i:${i}"></div>`).join("")}
    </div>
    <p class="shuffle-hint">Die Karten werden gemischt…</p>`;

    setTimeout(() => {
      const drawn = drawCards(spread.positions.length);
      resultEl.innerHTML = `<div class="spread-grid spread-${spread.positions.length <= 1 ? "one" : spread.positions.length <= 3 ? "three" : "many"}">
        ${drawn.map((e, i) => cardFace(e, spread.positions[i], true, i * 140)).join("")}
      </div>
      <div id="combineReading" class="combine-reading"></div>
      <div id="drawMeanings" class="draw-meanings"></div>
      <div class="note-block">
        <label for="drawNote">Notiz zu dieser Legung</label>
        <textarea id="drawNote" placeholder="Erste Gedanken, was dir auffällt…"></textarea>
      </div>
      <div class="draw-export-row">
        <button class="btn-secondary" id="exportBtn">Legung exportieren</button>
      </div>`;

      setTimeout(() => {
        resultEl.querySelectorAll(".card").forEach(el => el.classList.add("flip-done"));
        haptic(15);
        chime([784, 988]);
      }, 120 + drawn.length * 140);

      if (drawn.length > 1) {
        const combineEl = document.getElementById("combineReading");
        combineEl.innerHTML = `<h3>Zusammenspiel der Karten</h3><p>${combineReadingText(drawn)}</p>`;
      }

      const meaningsEl = document.getElementById("drawMeanings");
      meaningsEl.innerHTML = (question ? `<div class="question-echo">„${question}"</div>` : "") + drawn.map((e, i) => {
        const card = getCard(e.id);
        const text = e.reversed ? card.reversed : card.upright;
        return `<div class="meaning-block">
          <strong>${spread.positions[i]}: ${card.name}${e.reversed ? " (umgekehrt)" : ""}</strong>
          <p>${text}</p>
        </div>`;
      }).join("");

      resultEl.querySelectorAll(".card").forEach(el => {
        el.addEventListener("click", () => {
          const id = parseInt(el.dataset.cardId, 10);
          const entry = drawn.find(d => d.id === id);
          openCardModal(id, entry?.reversed);
        });
        attachTilt(el);
      });

      const entry = { id: Date.now(), spread: key, spreadLabel: spread.label, date: new Date().toISOString(), cards: drawn, note: "", question };
      addDrawStats(drawn.length);
      checkAchievements();

      const noteArea = document.getElementById("drawNote");
      noteArea.addEventListener("change", () => { entry.note = noteArea.value; });

      document.getElementById("exportBtn").addEventListener("click", () => exportReading(entry, spread));
    }, 680);
  });
}

/* ---------- Karten-Kombination-Deutung ---------- */
function combineReadingText(drawn) {
  const cards = drawn.map(d => getCard(d.id));
  const majors = cards.filter(c => c.arcana === "major").length;
  const reversedCount = drawn.filter(d => d.reversed).length;
  const elements = {};
  cards.forEach(c => { const e = c.element === "Geist" ? "Geist" : c.element; elements[e] = (elements[e] || 0) + 1; });
  const dominant = Object.entries(elements).sort((a, b) => b[1] - a[1])[0];
  const elementText = {
    Feuer: "Antrieb, Wille und Handlungsdrang stehen im Vordergrund",
    Wasser: "Gefühle und Beziehungen prägen das Bild",
    Luft: "Gedanken, Kommunikation und Klarheit sind zentral",
    Erde: "Es geht um Konkretes, Körperliches und Bodenständiges",
    Geist: "Große, übergeordnete Themen bestimmen die Legung"
  };
  const parts = [];
  if (majors >= Math.ceil(cards.length / 2)) {
    parts.push("Auffällig viele Karten der Großen Arkana zeigen: Hier geht es um ein bedeutsames Thema, keine Nebensächlichkeit.");
  } else if (majors === 0) {
    parts.push("Nur Karten der Kleinen Arkana – die Situation dreht sich eher um konkrete, alltägliche Umstände als um ein großes Schicksalsthema.");
  }
  if (dominant && dominant[1] >= Math.ceil(cards.length / 2) && cards.length > 2) {
    parts.push(`${elementText[dominant[0]]}.`);
  }
  if (reversedCount >= Math.ceil(cards.length * 0.6)) {
    parts.push("Mehrere umgekehrte Karten deuten auf blockierte oder nach innen gewendete Energien hin – vieles will erst noch reifen.");
  } else if (reversedCount === 0) {
    parts.push("Alle Karten stehen aufrecht – die Energien fließen offen und direkt.");
  }
  if (!parts.length) parts.push("Die Karten zeigen ein vielschichtiges Bild – lies jede Position einzeln und achte darauf, wo sich Themen wiederholen oder ergänzen.");
  return parts.join(" ");
}



function exportReading(entry, spread) {
  const lines = [];
  lines.push(`AEVARANNA – ${spread.label}`);
  lines.push(new Date(entry.date).toLocaleString("de-DE"));
  if (entry.question) { lines.push(""); lines.push(`Frage: ${entry.question}`); }
  lines.push("");
  entry.cards.forEach((c, i) => {
    const card = getCard(c.id);
    const text = c.reversed ? card.reversed : card.upright;
    lines.push(`${spread.positions[i]}: ${card.name}${c.reversed ? " (umgekehrt)" : ""}`);
    lines.push(text);
    lines.push("");
  });
  if (entry.cards.length > 1) { lines.push("Zusammenspiel:"); lines.push(combineReadingText(entry.cards)); lines.push(""); }
  if (entry.note) { lines.push("Notiz:"); lines.push(entry.note); }
  const text = lines.join("\n");

  if (navigator.share) {
    navigator.share({ title: `AEVARANNA – ${spread.label}`, text }).catch(() => downloadText(text));
  } else {
    downloadText(text);
  }
}

function downloadText(text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `aevaranna-tarot-legung-${Date.now()}.txt`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

/* ---------- Tab: Lexikon ---------- */
function renderLexikon(root) {
  root.innerHTML = `
    <section class="panel">
      <h2>Kartenlexikon</h2>
      <input type="search" id="lexSearch" placeholder="Karte suchen…" value="${state.lexFilter}"/>
      <div class="filter-row">
        <button class="chip ${state.lexArcana==='all'?'active':''}" data-arc="all">Alle</button>
        <button class="chip ${state.lexArcana==='major'?'active':''}" data-arc="major">Große Arkana</button>
        <button class="chip ${state.lexArcana==='staebe'?'active':''}" data-arc="staebe">Stäbe</button>
        <button class="chip ${state.lexArcana==='kelche'?'active':''}" data-arc="kelche">Kelche</button>
        <button class="chip ${state.lexArcana==='schwerter'?'active':''}" data-arc="schwerter">Schwerter</button>
        <button class="chip ${state.lexArcana==='muenzen'?'active':''}" data-arc="muenzen">Münzen</button>
        <button class="chip ${state.lexFavOnly?'active':''}" id="lexFavChip">★ Favoriten</button>
      </div>
      <div id="lexGrid" class="lex-grid"></div>
    </section>`;

  const search = root.querySelector("#lexSearch");
  search.addEventListener("input", () => { state.lexFilter = search.value; renderLexGrid(); });
  root.querySelectorAll("[data-arc]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.lexArcana = btn.dataset.arc;
      root.querySelectorAll("[data-arc]").forEach(b => b.classList.toggle("active", b === btn));
      renderLexGrid();
    });
  });
  document.getElementById("lexFavChip").addEventListener("click", (e) => {
    state.lexFavOnly = !state.lexFavOnly;
    e.target.classList.toggle("active", state.lexFavOnly);
    renderLexGrid();
  });
  renderLexGrid();
}

function renderLexGrid() {
  const grid = document.getElementById("lexGrid");
  if (!grid) return;
  const q = state.lexFilter.trim().toLowerCase();
  const list = CARDS.filter(c => {
    const arcMatch = state.lexArcana === "all" || (state.lexArcana === "major" ? c.arcana === "major" : c.suit === state.lexArcana);
    const qMatch = !q || c.name.toLowerCase().includes(q) || c.keywords.join(" ").toLowerCase().includes(q);
    const favMatch = !state.lexFavOnly || isFavorite(c.id);
    return arcMatch && qMatch && favMatch;
  });
  grid.innerHTML = list.map(c => `
    <div class="lex-card">
      <button class="lex-fav ${isFavorite(c.id) ? "is-fav" : ""}" data-fav-id="${c.id}" aria-label="Favorit umschalten" aria-pressed="${isFavorite(c.id)}">★</button>
      <button class="lex-open" data-id="${c.id}">
        <div class="lex-art">${generateCardArt(c)}</div>
        <span>${c.name}</span>
      </button>
    </div>`).join("") || `<p class="empty">Keine Karten gefunden.</p>`;
  grid.querySelectorAll("[data-id]").forEach(btn => {
    btn.addEventListener("click", () => openCardModal(parseInt(btn.dataset.id, 10), false));
  });
  grid.querySelectorAll("[data-fav-id]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.favId, 10);
      toggleFavorite(id);
      haptic(10);
      renderLexGrid();
    });
  });
}

/* ---------- Kartendetail-Modal ---------- */
function openCardModal(id, reversed) {
  const card = getCard(id);
  const modal = document.getElementById("cardModal");
  modal.innerHTML = `
    <div class="modal-backdrop" id="modalBackdrop">
      <div class="modal-box" role="dialog" aria-modal="true" aria-label="${card.name}">
        <button class="modal-close" id="modalClose" aria-label="Schließen">×</button>
        <button class="modal-fav ${isFavorite(card.id) ? "is-fav" : ""}" id="modalFav" aria-label="Favorit umschalten" aria-pressed="${isFavorite(card.id)}">★</button>
        <div class="modal-art">${generateCardArt(card)}</div>
        <h3>${card.name}</h3>
        <p class="modal-element">${card.arcana === "major" ? "Große Arkana" : `Kleine Arkana · ${SUITS[card.suit].label} · Element ${card.element}`}</p>
        <div class="modal-keywords">${card.keywords.map(k => `<span>${k}</span>`).join("")}</div>
        <div class="modal-tabs">
          <button class="mtab active" data-o="up">Aufrecht</button>
          <button class="mtab" data-o="rev">Umgekehrt</button>
        </div>
        <p id="modalMeaning">${card.upright}</p>
        <button class="btn-secondary" id="modalShareImg" style="width:100%;margin-top:6px;">Als Bild teilen</button>
      </div>
    </div>`;
  modal.classList.add("open");
  const close = () => modal.classList.remove("open");
  document.getElementById("modalClose").addEventListener("click", close);
  document.getElementById("modalBackdrop").addEventListener("click", (e) => { if (e.target.id === "modalBackdrop") close(); });
  document.getElementById("modalFav").addEventListener("click", () => {
    toggleFavorite(card.id);
    haptic(10);
    const btn = document.getElementById("modalFav");
    btn.classList.toggle("is-fav", isFavorite(card.id));
    btn.setAttribute("aria-pressed", isFavorite(card.id));
  });
  modal.querySelectorAll(".mtab").forEach(t => t.addEventListener("click", () => {
    modal.querySelectorAll(".mtab").forEach(x => x.classList.remove("active"));
    t.classList.add("active");
    document.getElementById("modalMeaning").textContent = t.dataset.o === "up" ? card.upright : card.reversed;
  }));
  document.getElementById("modalShareImg").addEventListener("click", () => {
    const isRev = modal.querySelector('.mtab.active').dataset.o === "rev";
    shareCardImage(card, isRev);
  });
  if (reversed) modal.querySelector('[data-o="rev"]').click();
}

/* ---------- Karte als Bild exportieren ---------- */
function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  const words = text.split(" ");
  let line = "", lines = [];
  words.forEach(word => {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; }
    else line = test;
  });
  if (line) lines.push(line);
  if (maxLines && lines.length > maxLines) { lines = lines.slice(0, maxLines); lines[maxLines - 1] += "…"; }
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight));
  return lines.length * lineHeight;
}

function shareCardImage(card, reversed) {
  const W = 640, H = 900;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, "#241A3E");
  bgGrad.addColorStop(1, "#0D0A16");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  const svgStr = generateCardArt(card);
  const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();
  img.onload = () => {
    const cardW = 380, cardH = cardW * 1.2;
    const cx = (W - cardW) / 2, cy = 60;
    ctx.save();
    if (reversed) { ctx.translate(cx + cardW/2, cy + cardH/2); ctx.rotate(Math.PI); ctx.translate(-(cx + cardW/2), -(cy + cardH/2)); }
    ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = 30; ctx.shadowOffsetY = 14;
    ctx.drawImage(img, cx, cy, cardW, cardH);
    ctx.restore();
    URL.revokeObjectURL(url);

    ctx.textAlign = "center";
    ctx.fillStyle = "#E3B563";
    ctx.font = "700 15px Georgia, serif";
    ctx.fillText("AEVARANNA · TAROT", W/2, cy + cardH + 46);

    ctx.fillStyle = "#F5EFE0";
    ctx.font = "700 32px Georgia, serif";
    ctx.fillText(card.name + (reversed ? " (umgekehrt)" : ""), W/2, cy + cardH + 86);

    ctx.fillStyle = "#B6AFC6";
    ctx.font = "400 18px -apple-system, sans-serif";
    ctx.textAlign = "left";
    const text = reversed ? card.reversed : card.upright;
    wrapCanvasText(ctx, text, 50, cy + cardH + 130, W - 100, 27, 6);

    canvas.toBlob(async (blob) => {
      const file = new File([blob], `aevaranna-${card.id}.png`, { type: "image/png" });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: card.name }); return; } catch (e) {}
      }
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = dlUrl; a.download = `aevaranna-${card.id}-${card.name.replace(/\s+/g,"-")}.png`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(dlUrl);
    }, "image/png");
  };
  img.src = url;
}

/* ---------- Tab: Lernen ---------- */
const ELEMENTS = ["Feuer", "Wasser", "Luft", "Erde", "Geist"];

function cardLevel(id) { return (state.learn[id] && state.learn[id].level) || 0; }

function weightedPool(pool) {
  // niedrigeres Level = höheres Gewicht (Spaced Repetition)
  const withWeight = pool.map(c => ({ c, w: Math.max(1, 6 - cardLevel(c.id)) }));
  const out = [];
  withWeight.forEach(({ c, w }) => { for (let i = 0; i < w; i++) out.push(c); });
  return out;
}

function renderLernen(root) {
  root.innerHTML = `
    <section class="panel">
      <h2>Lernmodus</h2>
      <p class="hint">Übe alle 78 Karten. Unsichere Karten kommen häufiger dran (Spaced Repetition). Der Fortschritt wird nur lokal gespeichert.</p>
      <div class="learn-stats" id="learnStats"></div>
      <div class="mode-picker">
        <button class="chip ${state.learnMode==='flash'?'active':''}" data-mode="flash">Karteikarten</button>
        <button class="chip ${state.learnMode==='quiz'?'active':''}" data-mode="quiz">Namen-Quiz</button>
        <button class="chip ${state.learnMode==='element'?'active':''}" data-mode="element">Element-Quiz</button>
      </div>
      <div class="learn-actions">
        <button class="btn-primary" id="learnAllBtn">Alle Karten üben</button>
        <button class="btn-secondary" id="learnWeakBtn">Nur unsichere Karten üben</button>
        <button class="btn-secondary" id="learnMajorBtn">Nur Große Arkana</button>
      </div>
      <div id="learnArea"></div>
    </section>`;
  renderLearnStats();
  root.querySelectorAll("[data-mode]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.learnMode = btn.dataset.mode;
      root.querySelectorAll("[data-mode]").forEach(b => b.classList.toggle("active", b === btn));
      document.getElementById("learnArea").innerHTML = "";
    });
  });
  document.getElementById("learnAllBtn").addEventListener("click", () => startLearnSession(CARDS));
  document.getElementById("learnWeakBtn").addEventListener("click", () => {
    const weak = CARDS.filter(c => cardLevel(c.id) < 4);
    startLearnSession(weak.length ? weak : CARDS);
  });
  document.getElementById("learnMajorBtn").addEventListener("click", () => startLearnSession(CARDS.filter(c => c.arcana === "major")));
}

function renderLearnStats() {
  const el = document.getElementById("learnStats");
  if (!el) return;
  const known = CARDS.filter(c => cardLevel(c.id) >= 4).length;
  el.innerHTML = `<div class="ring-gauge">
    ${ringGauge((known/78)*100, known)}
    <p style="margin:0">${known} von 78 Karten<br/>sicher gelernt</p>
  </div>`;
}

function startLearnSession(pool) {
  const weighted = weightedPool(pool);
  const shuffled = weighted.sort(() => Math.random() - 0.5);
  const seen = new Set();
  const queue = [];
  for (const c of shuffled) { if (queue.length >= Math.min(20, pool.length * 2) ) break; queue.push(c); }
  // sicherstellen, dass jede Karte im Pool mindestens einmal vorkommt, wenn Pool klein ist
  state.learnQueue = queue.length ? queue : [...pool];
  state.learnIndex = 0;
  state.learnRevealed = false;
  renderLearnStep();
}

function renderLearnStep() {
  if (state.learnMode === "flash") renderLearnCard();
  else renderLearnQuiz();
}

function renderLearnCard() {
  const area = document.getElementById("learnArea");
  if (state.learnIndex >= state.learnQueue.length) { finishLearnSession(area); return; }
  const card = state.learnQueue[state.learnIndex];
  area.innerHTML = `
    <div class="flash-card">
      <div class="flash-art">${generateCardArt(card)}</div>
      <h3>${card.name}</h3>
      ${state.learnRevealed ? `
        <p><strong>Aufrecht:</strong> ${card.upright}</p>
        <p><strong>Umgekehrt:</strong> ${card.reversed}</p>
        <div class="learn-answer-row">
          <button class="btn-secondary" id="learnUnsure">Nochmal üben</button>
          <button class="btn-primary" id="learnKnown">Kenne ich sicher</button>
        </div>
      ` : `<button class="btn-primary" id="revealBtn">Bedeutung zeigen</button>`}
      <p class="learn-progress">Karte ${state.learnIndex + 1} von ${state.learnQueue.length}</p>
    </div>`;
  if (!state.learnRevealed) {
    document.getElementById("revealBtn").addEventListener("click", () => { state.learnRevealed = true; renderLearnCard(); });
  } else {
    document.getElementById("learnKnown").addEventListener("click", () => markLearn(card.id, true));
    document.getElementById("learnUnsure").addEventListener("click", () => markLearn(card.id, false));
  }
}

function renderLearnQuiz() {
  const area = document.getElementById("learnArea");
  if (state.learnIndex >= state.learnQueue.length) { finishLearnSession(area); return; }
  const card = state.learnQueue[state.learnIndex];
  let options, correct, question;
  if (state.learnMode === "quiz") {
    correct = card.name;
    const others = CARDS.filter(c => c.id !== card.id).sort(() => Math.random() - 0.5).slice(0, 3).map(c => c.name);
    options = [correct, ...others].sort(() => Math.random() - 0.5);
    question = "Wie heißt diese Karte?";
  } else {
    correct = card.element;
    const others = ELEMENTS.filter(e => e !== correct).sort(() => Math.random() - 0.5).slice(0, 3);
    options = [correct, ...others].sort(() => Math.random() - 0.5);
    question = `Welches Element passt zu „${card.name}“?`;
  }
  area.innerHTML = `
    <div class="quiz-card">
      <div class="flash-art">${generateCardArt(card)}</div>
      <p class="quiz-question">${question}</p>
      <div class="quiz-options">
        ${options.map(o => `<button class="quiz-opt" data-opt="${o}">${o}</button>`).join("")}
      </div>
      <p id="quizFeedback" class="quiz-feedback" aria-live="polite"></p>
      <p class="learn-progress">Karte ${state.learnIndex + 1} von ${state.learnQueue.length}</p>
    </div>`;
  area.querySelectorAll(".quiz-opt").forEach(btn => {
    btn.addEventListener("click", () => {
      const isCorrect = btn.dataset.opt === correct;
      area.querySelectorAll(".quiz-opt").forEach(b => {
        b.disabled = true;
        if (b.dataset.opt === correct) b.classList.add("opt-correct");
        else if (b === btn) b.classList.add("opt-wrong");
      });
      document.getElementById("quizFeedback").textContent = isCorrect ? "Richtig!" : `Leider nicht – richtig wäre: ${correct}`;
      haptic(isCorrect ? 15 : [20, 40, 20]);
      setTimeout(() => markLearn(card.id, isCorrect), 900);
    });
  });
}

function finishLearnSession(area) {
  area.innerHTML = `<p class="empty">Session beendet – gut gemacht. Wähle oben eine neue Übung.</p>`;
  renderLearnStats();
}

function markLearn(id, known) {
  const cur = state.learn[id] || { seen: 0, level: 0 };
  const level = known ? Math.min(5, cur.level + 1) : 0;
  state.learn[id] = { seen: cur.seen + 1, level, known };
  saveJSON(STORAGE_KEYS.learn, state.learn);
  state.learnIndex++;
  state.learnRevealed = false;
  renderLearnStep();
  checkAchievements();
}

/* ---------- Tab: Anleitung ---------- */
function renderAnleitung(root) {
  root.innerHTML = `
    <section class="panel prose">
      <h2>Anleitung</h2>

      <h3>Was ist AEVARANNA?</h3>
      <p>AEVARANNA ist eine eigenständige App mit dem vollständigen klassischen 78-Karten-Tarot: 22 Karten der Großen Arkana und 56 Karten der Kleinen Arkana in den vier Farben Stäbe, Kelche, Schwerter und Münzen. Die App dient der Selbstreflexion, dem Lernen der Kartenbedeutungen und dem Legen von Karten für eigene Fragestellungen.</p>
      <p><strong>Wichtiger Hinweis:</strong> AEVARANNA ersetzt keine medizinische, rechtliche, finanzielle oder psychologische Beratung. Die Deutungen sind als Impuls zur Selbstreflexion gedacht, nicht als Vorhersage oder Tatsachenaussage.</p>

      <h3>Aufbau der App</h3>
      <ul>
        <li><strong>Start:</strong> Impuls-Tageskarte, Kurzüberblick über Lernfortschritt/Favoriten/Legungen und Schnellzugriff auf alle Bereiche.</li>
        <li><strong>Legen:</strong> Karten für eine konkrete Frage ziehen, eigene Notizen dazu festhalten, Legesysteme auch selbst zusammenstellen.</li>
        <li><strong>Lexikon:</strong> Alle 78 Karten mit Bild, Schlüsselwörtern und Bedeutung – aufrecht und umgekehrt. Karten lassen sich als Favoriten markieren.</li>
        <li><strong>Lernen:</strong> Drei Übungsformen – Karteikarten, Namen-Quiz und Element-Quiz – mit Spaced Repetition.</li>
        <li><strong>Anleitung:</strong> Diese Seite.</li>
        <li><strong>Mehr:</strong> Rechtliches, Einstellungen (Umkehr-Quote, Hell/Dunkel, Haptik) sowie Datensicherung.</li>
      </ul>

      <h3>Aufrecht und umgekehrt</h3>
      <p>Jede Karte kann aufrecht oder umgekehrt gezogen werden. Aufrecht steht meist für die direkte, aktive Ausprägung eines Themas, umgekehrt für eine blockierte, verzögerte oder nach innen gewendete Variante desselben Themas. Wie häufig Karten umgekehrt erscheinen, kannst du unter „Mehr“ selbst einstellen.</p>

      <h3>Die vier Farben der Kleinen Arkana</h3>
      <ul>
        <li><strong>Stäbe (Feuer):</strong> Antrieb, Wille, Kreativität, Handeln.</li>
        <li><strong>Kelche (Wasser):</strong> Gefühle, Beziehungen, Intuition.</li>
        <li><strong>Schwerter (Luft):</strong> Gedanken, Kommunikation, Klarheit, Konflikte.</li>
        <li><strong>Münzen (Erde):</strong> Materielles, Körper, Arbeit, Sicherheit.</li>
      </ul>

      <h3>Legesysteme</h3>
      <p><strong>Tageskarte:</strong> Eine einzelne Karte als Impuls oder Frage an den Tag.</p>
      <p><strong>Drei-Karten-Legung:</strong> Situation – Herausforderung – Rat. Flexibel einsetzbar für nahezu jede Fragestellung.</p>
      <p><strong>Wochenlegung:</strong> Sieben Karten, eine pro Wochentag – ein Ausblick für die kommende Woche.</p>
      <p><strong>Keltisches Kreuz:</strong> Zehn Karten für eine ausführliche Betrachtung mit fest definierten Positionen.</p>
      <p><strong>Eigene Legung:</strong> Über „+ Eigene Legung“ im Tab „Legen“ kannst du eigene Positionsnamen und deren Anzahl frei festlegen, z. B. für ein Jahres-Rad oder eine Beziehungs-Legung. Eigene Legungen erscheinen danach dauerhaft in der Auswahl und lassen sich dort auch wieder löschen.</p>

      <h3>Frage & Zusammenspiel der Karten</h3>
      <p>Vor dem Ziehen kannst du optional deine Frage eintragen – sie wird bei den Deutungen angezeigt und ist Teil des Exports dieser Legung. Bei Legungen mit mehreren Karten fasst ein kurzer „Zusammenspiel“-Text automatisch zusammen, was auffällt (z. B. viele Karten der Großen Arkana, ein dominantes Element oder viele umgekehrte Karten).</p>

      <h3>Notizen zu Legungen</h3>
      <p>Nach jedem Ziehen kannst du eine Notiz zu deiner Frage oder ersten Eindrücken eintragen. Sie ist Teil dieser einen Legung und wird beim Export mit ausgegeben – es wird kein Verlauf vergangener Legungen gespeichert.</p>

      <h3>Legungen exportieren</h3>
      <p>Über „Legung exportieren“ lässt sich eine Legung inklusive Frage, Zusammenspiel-Text und Notiz als Text teilen (z. B. per Nachricht) oder als Textdatei herunterladen.</p>

      <h3>Lernmodus</h3>
      <p>Im Lernmodus stehen drei Übungsformen zur Wahl: <strong>Karteikarten</strong> (Bedeutung selbst erinnern, dann aufdecken), <strong>Namen-Quiz</strong> (Karte am Bild erkennen) und <strong>Element-Quiz</strong> (Element einer Karte zuordnen). Karten, die du als „nochmal üben“ markierst oder im Quiz falsch beantwortest, kommen in künftigen Sessions häufiger dran; sicher gelernte Karten erscheinen seltener (Spaced Repetition). Der Fortschritt wird ausschließlich lokal auf deinem Gerät gespeichert.</p>

      <h3>Favoriten</h3>
      <p>Im Lexikon kannst du Karten über den Stern markieren, die dich gerade beschäftigen, und sie über den Filter „★ Favoriten“ schnell wiederfinden.</p>

      <h3>Erfolge</h3>
      <p>Unter „Mehr“ sammelst du nach und nach Erfolge – z. B. für deine erste Legung, eine 7-Tage-Nutzungsserie oder wenn du alle 78 Karten sicher gelernt hast. Ein neuer Erfolg wird mit einer kurzen Animation gefeiert.</p>

      <h3>Einstellungen</h3>
      <p>Unter „Mehr“ lässt sich die Wahrscheinlichkeit für umgekehrte Karten einstellen, zwischen drei Farbthemen (Mitternacht, Bernstein, Rosenquarz) gewechselt sowie haptisches Feedback (Vibration) und ein sanfter Klang beim Ziehen/Aufdecken ein- oder ausgeschaltet werden. Dort findest du auch die Möglichkeit, deine Daten (Lernfortschritt, Favoriten, eigene Legungen) als Datei zu sichern und auf einem anderen Gerät wieder einzuspielen, die Willkommens-Tour erneut aufzurufen, sowie Lernfortschritt und Legungs-Zähler separat zurückzusetzen.</p>
      <h3>Start-Übersicht</h3>
      <p>Die Startseite zeigt eine tägliche Impulskarte, deinen aktuellen Lernfortschritt, deine Nutzungs-Serie (aufeinanderfolgende Tage mit App-Nutzung) sowie die Anzahl deiner Legungen als reinen Zähler – ohne Liste einzelner vergangener Legungen.</p>
      <h3>Karte als Bild teilen</h3>
      <p>In der Kartendetail-Ansicht lässt sich jede Karte über „Als Bild teilen“ als Bild exportieren – zum Sichern oder Versenden.</p>

      <h3>Weitere Programme</h3>
      <p>Auf der Startseite findest du unter „Weitere Programme“ nach und nach zusätzliche kleine Werkzeuge, die AEVARANNA ergänzen:</p>
      <p><strong>Ja/Nein-Orakel:</strong> eine schnelle, spielerische Pendel-Antwort auf eine einfache Frage.</p>
      <p><strong>Mondphasen-Kalender:</strong> zeigt den aktuellen Mondstand (Phase, Beleuchtungsgrad, Alter im Mondzyklus), die nächsten Vollmond-/Neumond-Termine sowie eine Vorschau der kommenden sieben Tage. Die Berechnung erfolgt rein astronomisch nach einer Standardformel, komplett offline und ohne externe Quelle.</p>
      <p><strong>Wunsch-Board:</strong> eine einfache Liste für Ziele und Wünsche, die du dir merken möchtest. Abhaken markiert einen Wunsch als erfüllt, ohne ihn zu löschen. Bei Neumond bzw. Vollmond zeigt die Seite einen kleinen Hinweis, da diese Zeitpunkte klassisch mit dem Setzen neuer Wünsche bzw. dem Zurückblicken verbunden werden.</p>
      <p><strong>Hexenbrett:</strong> stell eine Frage, und eine Antwort buchstabiert sich Buchstabe für Buchstabe auf dem Brett – mal ein direktes „Ja“/„Nein“, mal ein kurzes Wort. Rein spielerisch und zufallsbasiert, keine reale Verbindung zu irgendetwas – ein Impuls zum Nachdenken, kein Orakel im ernsten Sinn.</p>
      <p><strong>Numerologie-Rechner:</strong> berechnet aus deinem Geburtsdatum eine Lebenszahl und optional aus einem Namen eine Namenszahl (nach dem klassischen pythagoreischen System). Geburtsdatum und Name werden nirgends gespeichert – die Berechnung passiert nur im Moment der Eingabe auf dieser Seite. Auch hier gilt: eine symbolische Deutungstradition, kein wissenschaftlich belegtes Verfahren.</p>
      <p><strong>Horoskop:</strong> wähle dein Sternzeichen und erhalte einen kurzen Tagesimpuls, der sich täglich neu berechnet (am selben Tag bleibt er gleich). Rein offline, ohne externe Quelle, ebenfalls eine symbolische Deutungstradition ohne wissenschaftlichen Anspruch.</p>
      <p>Wie beim Tarot gilt auch hier: Es handelt sich um Impulse zur Reflexion bzw. um sachliche astronomische Information, nicht um verlässliche Vorhersagen oder einen Ersatz für eigene Entscheidungen.</p>

      <h3>Speicherung & Datenschutz</h3>
      <p>Favoriten, eigene Legesysteme, Lernfortschritt und anonyme Zähler (z. B. für Erfolge) werden ausschließlich lokal im Speicher deines Browsers (localStorage) abgelegt. Es wird kein Verlauf einzelner vergangener Legungen gespeichert – jede Legung existiert nur, solange du auf ihrer Seite bist. Es findet keine Übertragung an einen Server statt. Details siehe Datenschutzerklärung.</p>

      <h3>Installation auf dem Homescreen</h3>
      <p><strong>iPhone / iPad (Safari):</strong> Seite öffnen → Teilen-Symbol → „Zum Home-Bildschirm“.</p>
      <p><strong>Android (Chrome):</strong> Seite öffnen → Menü (⋮) → „App installieren“ bzw. „Zum Startbildschirm hinzufügen“.</p>
      <p>Nach der Installation funktioniert AEVARANNA wie eine eigenständige App und lässt sich auch offline nutzen, sobald sie einmal geladen wurde. Erscheint ein Update-Hinweis am oberen Bildschirmrand, tippe auf „Aktualisieren“, um die neueste Version zu laden.</p>
    </section>`;
}

/* ---------- Tab: Mehr (rechtliches + Einstellungen) ---------- */
function renderMehr(root) {
  const unlockedIds = getUnlockedAchievements();
  root.innerHTML = `
    <section class="panel prose">
      <h2>Mehr</h2>

      <h3>Erfolge</h3>
      <div class="achv-grid">
        ${ACHIEVEMENTS.map(a => `
          <div class="achv-badge ${unlockedIds.includes(a.id) ? "unlocked" : ""}">
            <div class="achv-icon">${unlockedIds.includes(a.id) ? "🏆" : "🔒"}</div>
            <span class="achv-label">${a.label}</span>
            <span class="achv-desc">${a.desc}</span>
          </div>`).join("")}
      </div>

      <h3>Rechtliches</h3>
      <div class="legal-buttons">
        <button class="legal-btn" data-legal="impressum.html">
          <span class="legal-icon"><svg viewBox="0 0 24 24"><path d="M6 4 H16 L19 7 V20 H6 Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg></span>
          <span>Impressum</span>
          <span class="legal-arrow">›</span>
        </button>
        <button class="legal-btn" data-legal="datenschutz.html">
          <span class="legal-icon"><svg viewBox="0 0 24 24"><path d="M12 3 L19 6 V11 C19 16 16 19.5 12 21 C8 19.5 5 16 5 11 V6 Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg></span>
          <span>Datenschutz</span>
          <span class="legal-arrow">›</span>
        </button>
        <button class="legal-btn" data-legal="lizenz.html">
          <span class="legal-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M9 11.5 L7 21 L12 18.5 L17 21 L15 11.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg></span>
          <span>Lizenz</span>
          <span class="legal-arrow">›</span>
        </button>
      </div>

      <h3>Einstellungen</h3>
      <div class="settings-block">
        <label class="setting-row">
          <span>Farbthema</span>
          <div class="theme-swatches">
            <div class="theme-swatch-col">
              <button class="theme-swatch ${state.settings.theme==='dark'?'active':''}" data-theme-btn="dark" data-swatch="dark" aria-label="Mitternacht"></button>
              <span class="theme-swatch-label">Mitternacht</span>
            </div>
            <div class="theme-swatch-col">
              <button class="theme-swatch ${state.settings.theme==='bernstein'?'active':''}" data-theme-btn="bernstein" data-swatch="bernstein" aria-label="Bernstein"></button>
              <span class="theme-swatch-label">Bernstein</span>
            </div>
            <div class="theme-swatch-col">
              <button class="theme-swatch ${state.settings.theme==='light'?'active':''}" data-theme-btn="light" data-swatch="light" aria-label="Rosenquarz"></button>
              <span class="theme-swatch-label">Rosenquarz</span>
            </div>
          </div>
        </label>
        <label class="setting-row">
          <span>Umgekehrte Karten: <strong id="reverseVal">${state.settings.reverseChance}%</strong></span>
          <input type="range" id="reverseRange" min="0" max="100" step="5" value="${state.settings.reverseChance}"/>
        </label>
        <label class="setting-row setting-toggle">
          <span>Haptisches Feedback (Vibration)</span>
          <input type="checkbox" id="hapticsToggle" ${state.settings.haptics ? "checked" : ""}/>
        </label>
        <label class="setting-row setting-toggle">
          <span>Klang-Feedback beim Ziehen</span>
          <input type="checkbox" id="soundToggle" ${state.settings.sound ? "checked" : ""}/>
        </label>
      </div>

      <h3>Daten sichern</h3>
      <p class="hint">Lernfortschritt, Favoriten und eigene Legungen als Datei sichern oder auf einem anderen Gerät wieder einspielen.</p>
      <div class="backup-actions">
        <button class="btn-secondary" id="exportDataBtn">Daten exportieren</button>
        <label class="btn-secondary file-btn">Daten importieren<input type="file" id="importDataInput" accept="application/json" hidden/></label>
      </div>

      <h3>Über AEVARANNA</h3>
      <p>AEVARANNA ist eine eigenständige, vollständige Tarot-App mit 78 selbst gestalteten Karten in einer eigenen, modernen Bildsprache – ohne Bezug zu bestehenden historischen Tarot-Illustrationen.</p>
      <button class="btn-ghost" id="tourAgainBtn">Willkommens-Tour erneut ansehen</button>
      <button class="btn-ghost" id="resetAllBtn">Lernfortschritt zurücksetzen</button>
      <button class="btn-ghost" id="resetStatsBtn">Legungs-Zähler zurücksetzen</button>
    </section>`;

  root.querySelectorAll("[data-legal]").forEach(btn => {
    btn.addEventListener("click", () => window.open(btn.dataset.legal, "_blank", "noopener"));
  });
  document.getElementById("tourAgainBtn").addEventListener("click", showOnboarding);
  root.querySelectorAll("[data-theme-btn]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.settings.theme = btn.dataset.themeBtn;
      saveJSON(STORAGE_KEYS.settings, state.settings);
      applyTheme();
      root.querySelectorAll("[data-theme-btn]").forEach(b => b.classList.toggle("active", b === btn));
    });
  });
  const range = document.getElementById("reverseRange");
  range.addEventListener("input", () => {
    document.getElementById("reverseVal").textContent = range.value + "%";
    state.settings.reverseChance = parseInt(range.value, 10);
    saveJSON(STORAGE_KEYS.settings, state.settings);
  });
  document.getElementById("hapticsToggle").addEventListener("change", (e) => {
    state.settings.haptics = e.target.checked;
    saveJSON(STORAGE_KEYS.settings, state.settings);
  });
  document.getElementById("soundToggle").addEventListener("change", (e) => {
    state.settings.sound = e.target.checked;
    saveJSON(STORAGE_KEYS.settings, state.settings);
    if (e.target.checked) chime([659]);
  });

  document.getElementById("exportDataBtn").addEventListener("click", () => {
    const payload = {
      learn: state.learn, favorites: state.favorites, drawStats: getDrawStats(),
      customSpreads: state.customSpreads, settings: state.settings, exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `aevaranna-tarot-backup-${Date.now()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  });

  document.getElementById("importDataInput").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (data.learn) { state.learn = data.learn; saveJSON(STORAGE_KEYS.learn, state.learn); }
        if (data.favorites) { state.favorites = data.favorites; saveJSON(STORAGE_KEYS.favorites, state.favorites); }
        if (data.drawStats) { saveJSON(STORAGE_KEYS.drawStats, data.drawStats); }
        if (data.customSpreads) { state.customSpreads = data.customSpreads; saveJSON(STORAGE_KEYS.customSpreads, state.customSpreads); }
        if (data.settings) { state.settings = Object.assign({}, DEFAULT_SETTINGS, data.settings); saveJSON(STORAGE_KEYS.settings, state.settings); applyTheme(); }
        alert("Daten erfolgreich importiert.");
        renderTab("mehr");
      } catch (err) { alert("Diese Datei konnte nicht gelesen werden."); }
    };
    reader.readAsText(file);
  });

  document.getElementById("resetAllBtn").addEventListener("click", () => {
    if (confirm("Wirklich Lernfortschritt auf diesem Gerät löschen?")) {
      localStorage.removeItem(STORAGE_KEYS.learn);
      state.learn = {};
      alert("Zurückgesetzt.");
    }
  });

  document.getElementById("resetStatsBtn").addEventListener("click", () => {
    if (confirm("Wirklich den Legungs-Zähler (Anzahl Legungen & gezogener Karten) auf diesem Gerät auf null zurücksetzen?")) {
      saveJSON(STORAGE_KEYS.drawStats, { spreads: 0, cards: 0 });
      alert("Zurückgesetzt.");
      renderTab("mehr");
    }
  });
}

/* ---------- Tab: Start ---------- */
function timeGreeting() {
  const h = new Date().getHours();
  if (h < 5) return "Eine ruhige Nachtstunde";
  if (h < 11) return "Guten Morgen";
  if (h < 17) return "Guten Tag";
  if (h < 22) return "Guten Abend";
  return "Eine ruhige Nachtstunde";
}

function dailyCard() {
  const d = new Date();
  const key = `${d.getFullYear()}${d.getMonth()}${d.getDate()}`;
  let seed = 0;
  for (let i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) >>> 0;
  const rnd = mulberry32(seed);
  const card = CARDS[Math.floor(rnd() * CARDS.length)];
  const reversed = rnd() < (state.settings.reverseChance ?? 35) / 100;
  return { card, reversed };
}

function ringGauge(percent, centerLabel) {
  const r = 26, c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, percent) / 100) * c;
  return `<svg viewBox="0 0 64 64">
    <circle class="ring-gauge-track" cx="32" cy="32" r="${r}"/>
    <circle class="ring-gauge-fill" cx="32" cy="32" r="${r}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}"/>
    <text x="32" y="38" class="ring-gauge-num">${centerLabel}</text>
  </svg>`;
}

function renderStart(root) {
  root.classList.add("no-pad-top");
  const streak = updateStreak();
  checkAchievements();
  const { card, reversed } = dailyCard();
  const learned = CARDS.filter(c => cardLevel(c.id) >= 4).length;
  const favCount = state.favorites.length;
  const spreadCount = getDrawStats().spreads;
  const stars = Array.from({length: 20}).map(() =>
    `<circle cx="${(Math.random()*100).toFixed(1)}%" cy="${(Math.random()*100).toFixed(1)}%" r="${(0.5+Math.random()*1.2).toFixed(1)}" fill="#EFE7D6" style="animation-delay:${(Math.random()*4).toFixed(1)}s"/>`
  ).join("");

  root.innerHTML = `
    <div class="hero">
      <svg class="hero-stars" aria-hidden="true">${stars}</svg>
      <div class="hero-content">
        <svg class="hero-mark" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="17" fill="none" stroke="#C9A46A" stroke-width="1.4"/>
          <circle cx="20" cy="20" r="4" fill="#C9A46A"/>
          <path d="M20 2 L20 10 M20 30 L20 38 M2 20 L10 20 M30 20 L38 20" stroke="#C9A46A" stroke-width="1.2"/>
        </svg>
        <p class="hero-greeting">${timeGreeting()}</p>
        <h2 class="hero-title">AEVARANNA</h2>
        <p class="hero-sub">Das vollständige Tarot – 78 Karten, ganz für dich</p>
        ${streak > 1 ? `<div class="hero-streak">🔥 ${streak} Tage in Folge</div>` : ""}
      </div>
    </div>

    <section class="panel">
      <div class="daily-card fade-up" id="dailyCardBtn">
        <div class="daily-card-art">${generateCardArt(card)}</div>
        <div class="daily-card-text">
          <p class="daily-card-label">Impuls für heute</p>
          <p class="daily-card-name">${card.name}${reversed ? " (umgekehrt)" : ""}</p>
          <p class="daily-card-hint">Antippen für die Deutung</p>
        </div>
      </div>

      <div class="stat-row">
        <div class="stat-tile fade-up">
          <div class="stat-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="11" r="6.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M9 20 L9 16.5 M15 20 L15 16.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></div>
          <span class="stat-num">${learned}</span><span class="stat-label">von 78 gelernt</span>
        </div>
        <div class="stat-tile fade-up">
          <div class="stat-icon"><svg viewBox="0 0 24 24"><path d="M12 20 C6 16 3 12.5 3 8.8 C3 6.1 5.1 4 7.7 4 C9.4 4 10.9 4.9 12 6.3 C13.1 4.9 14.6 4 16.3 4 C18.9 4 21 6.1 21 8.8 C21 12.5 18 16 12 20 Z" fill="currentColor"/></svg></div>
          <span class="stat-num">${favCount}</span><span class="stat-label">Favoriten</span>
        </div>
        <div class="stat-tile fade-up">
          <div class="stat-icon"><svg viewBox="0 0 24 24"><rect x="4" y="6" width="10" height="14" rx="1.6" transform="rotate(-8 9 13)" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="10" y="5" width="10" height="14" rx="1.6" transform="rotate(8 15 12)" fill="none" stroke="currentColor" stroke-width="1.8"/></svg></div>
          <span class="stat-num">${spreadCount}</span><span class="stat-label">Legungen</span>
        </div>
      </div>

      <div class="quick-grid">
        <button class="quick-card qc-wide fade-up" data-goto="legen">
          <div class="qc-icon-wrap"><svg viewBox="0 0 24 24"><rect x="4" y="6" width="10" height="14" rx="1.6" transform="rotate(-8 9 13)" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="10" y="5" width="10" height="14" rx="1.6" transform="rotate(8 15 12)" fill="none" stroke="currentColor" stroke-width="1.8"/></svg></div>
          <div><span class="qc-title">Karten legen</span><span class="qc-sub">Tageskarte, Wochenlegung, Keltisches Kreuz &amp; eigene Legesysteme</span></div>
        </button>
        <button class="quick-card fade-up" data-goto="lexikon">
          <div class="qc-icon-wrap"><svg viewBox="0 0 24 24"><path d="M5 5 H12 V19 H5 Z M12 5 H19 V19 H12 Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg></div>
          <span class="qc-title">Lexikon</span>
          <span class="qc-sub">Alle 78 Bedeutungen</span>
        </button>
        <button class="quick-card fade-up" data-goto="lernen">
          <div class="qc-icon-wrap"><svg viewBox="0 0 24 24"><circle cx="12" cy="11" r="6.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M9 20 L9 16.5 M15 20 L15 16.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></div>
          <span class="qc-title">Lernen</span>
          <span class="qc-sub">Karteikarten &amp; Quiz</span>
        </button>
        <button class="quick-card fade-up" data-goto="anleitung">
          <div class="qc-icon-wrap"><svg viewBox="0 0 24 24"><path d="M6 4 H16 L19 7 V20 H6 Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8.5 12 H15.5 M8.5 15.5 H15.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg></div>
          <span class="qc-title">Anleitung</span>
          <span class="qc-sub">Grundlagen &amp; Tipps</span>
        </button>
        <button class="quick-card fade-up" data-goto="mehr">
          <div class="qc-icon-wrap"><svg viewBox="0 0 24 24"><circle cx="6" cy="12" r="1.8" fill="currentColor"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/><circle cx="18" cy="12" r="1.8" fill="currentColor"/></svg></div>
          <span class="qc-title">Mehr</span>
          <span class="qc-sub">Einstellungen &amp; Rechtliches</span>
        </button>
      </div>

      <h3 class="hub-section-title">Weitere Programme</h3>
      <div class="quick-grid">
        <button class="quick-card fade-up" data-goto="orakel">
          <div class="qc-icon-wrap qc-icon-alt"><svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.6" fill="currentColor"/><line x1="12" y1="6.5" x2="12" y2="14" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="17" r="3.4" fill="none" stroke="currentColor" stroke-width="1.8"/></svg></div>
          <span class="qc-title">Ja/Nein-Orakel</span>
          <span class="qc-sub">Schnelle Antwort per Pendel</span>
        </button>
        <button class="quick-card fade-up" data-goto="mond">
          <div class="qc-icon-wrap qc-icon-alt"><svg viewBox="0 0 24 24"><path d="M9 2c-1.05 0-2.05.16-3 .46 4.06 1.27 7 5.06 7 9.54s-2.94 8.27-7 9.54c.95.3 1.95.46 3 .46 5.52 0 10-4.48 10-10S14.52 2 9 2z" fill="currentColor"/></svg></div>
          <span class="qc-title">Mondphasen</span>
          <span class="qc-sub">Aktueller Mondstand &amp; Kalender</span>
        </button>
        <button class="quick-card fade-up" data-goto="wunsch">
          <div class="qc-icon-wrap qc-icon-alt"><svg viewBox="0 0 24 24"><path d="M12 20.5 C7 16.5 3.5 13.2 3.5 9.2 C3.5 6.4 5.7 4.2 8.4 4.2 C10 4.2 11.3 5 12 6.1 C12.7 5 14 4.2 15.6 4.2 C18.3 4.2 20.5 6.4 20.5 9.2 C20.5 13.2 17 16.5 12 20.5 Z" fill="currentColor"/></svg></div>
          <span class="qc-title">Wunsch-Board</span>
          <span class="qc-sub">Ziele &amp; Wünsche festhalten</span>
        </button>
        <button class="quick-card fade-up" data-goto="hexenbrett">
          <div class="qc-icon-wrap qc-icon-alt"><svg viewBox="0 0 24 24"><rect x="3.5" y="4" width="17" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="2.4" fill="currentColor"/><path d="M7 8 H9 M15 8 H17 M7 16 H9 M15 16 H17" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></div>
          <span class="qc-title">Hexenbrett</span>
          <span class="qc-sub">Antworten buchstabieren lassen</span>
        </button>
        <button class="quick-card fade-up" data-goto="numerologie">
          <div class="qc-icon-wrap qc-icon-alt"><svg viewBox="0 0 24 24"><text x="12" y="16" font-family="Georgia,serif" font-size="13" font-weight="700" fill="currentColor" text-anchor="middle">7</text><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="1.4"/></svg></div>
          <span class="qc-title">Numerologie</span>
          <span class="qc-sub">Lebens- &amp; Namenszahl</span>
        </button>
        <button class="quick-card fade-up" data-goto="horoskop">
          <div class="qc-icon-wrap qc-icon-alt"><svg viewBox="0 0 24 24"><text x="12" y="17" font-family="Georgia,serif" font-size="15" font-weight="700" fill="currentColor" text-anchor="middle">☉</text><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="1.4"/></svg></div>
          <span class="qc-title">Horoskop</span>
          <span class="qc-sub">Dein Tagesimpuls</span>
        </button>
      </div>
    </section>`;

  document.getElementById("dailyCardBtn").addEventListener("click", () => openCardModal(card.id, reversed));
  root.querySelectorAll("[data-goto]").forEach(btn => {
    btn.addEventListener("click", () => renderTab(btn.dataset.goto));
  });
}

/* ---------- Tab: Ja/Nein-Orakel ---------- */
const ORACLE_ANSWERS = [
  { label: "Ja", tone: "yes", texts: [
    "Die Zeichen stehen günstig – vertraue dieser Richtung.",
    "Ein klares Ja. Der Weg ist frei, wenn du ihn gehen willst.",
    "Die Energie unterstützt dich gerade in dieser Sache."
  ]},
  { label: "Nein", tone: "no", texts: [
    "Gerade eher nicht – vielleicht ist noch nicht die richtige Zeit.",
    "Ein Nein als Impuls: Schau genauer hin, bevor du weitermachst.",
    "Die Zeichen raten eher zur Zurückhaltung."
  ]},
  { label: "Vielleicht", tone: "maybe", texts: [
    "Unklar – die Antwort liegt gerade eher bei dir selbst als in den Zeichen.",
    "Weder klares Ja noch Nein. Frag dich, was du dir eigentlich wünschst.",
    "Die Lage ist im Fluss – frag in ein paar Tagen noch einmal."
  ]}
];

function renderOrakel(root) {
  root.classList.add("no-pad-top");
  root.innerHTML = `
    <div class="tool-header">
      <button class="back-btn" id="backToHub">← Zurück</button>
      <h2>Ja/Nein-Orakel</h2>
      <p class="tool-intro">Stell eine Frage, die sich mit Ja oder Nein beantworten lässt, und lass das Pendel entscheiden. Ein Impuls zur Reflexion – keine Tatsachenaussage und kein Ersatz für eine eigene Entscheidung.</p>
    </div>
    <section class="panel">
      <div class="question-block">
        <label for="oracleQuestion">Deine Frage (optional)</label>
        <input type="text" id="oracleQuestion" maxlength="140" placeholder="Soll ich …?"/>
      </div>
      <div class="pendulum-stage" id="pendulumStage">
        <div class="pendulum-arm">
          <div class="pendulum-string"></div>
          <div class="pendulum-bob" id="pendulumBob"></div>
        </div>
      </div>
      <button class="btn-primary" id="askOracleBtn" style="width:100%">Antwort erhalten</button>
      <div id="oracleResult" class="oracle-result"></div>
    </section>`;

  document.getElementById("backToHub").addEventListener("click", () => renderTab("start"));

  document.getElementById("askOracleBtn").addEventListener("click", () => {
    const question = document.getElementById("oracleQuestion").value.trim();
    const stage = document.getElementById("pendulumStage");
    const resultEl = document.getElementById("oracleResult");
    resultEl.innerHTML = "";
    stage.classList.remove("settled");
    stage.classList.add("swinging");
    haptic(20);
    chime([440, 554]);

    setTimeout(() => {
      stage.classList.remove("swinging");
      const answer = ORACLE_ANSWERS[Math.floor(Math.random() * ORACLE_ANSWERS.length)];
      const text = answer.texts[Math.floor(Math.random() * answer.texts.length)];
      stage.classList.add("settled", `tone-${answer.tone}`);
      haptic([20, 30, 20]);
      chime(answer.tone === "yes" ? [659, 880] : answer.tone === "no" ? [440, 349] : [523, 494]);
      resultEl.innerHTML = `
        ${question ? `<p class="question-echo">„${question}"</p>` : ""}
        <p class="oracle-answer tone-${answer.tone}">${answer.label}</p>
        <p class="oracle-text">${text}</p>`;
    }, 2600);
  });
}

/* ---------- Mondphasen-Kalender (rein astronomisch berechnet, keine externe Quelle) ---------- */
const SYNODIC_MONTH = 29.530588853;
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14, 0); // bekannter Referenz-Neumond

const MOON_PHASE_NAMES = [
  "Neumond", "Zunehmende Sichel", "Erstes Viertel", "Zunehmender Mond",
  "Vollmond", "Abnehmender Mond", "Letztes Viertel", "Abnehmende Sichel"
];

function moonPhaseAt(date) {
  const days = (date.getTime() - KNOWN_NEW_MOON) / 86400000;
  let p = (days % SYNODIC_MONTH) / SYNODIC_MONTH;
  if (p < 0) p += 1;
  const illumination = (1 - Math.cos(2 * Math.PI * p)) / 2;
  const nameIndex = Math.round(p * 8) % 8;
  const ageDays = p * SYNODIC_MONTH;
  return { p, illumination, name: MOON_PHASE_NAMES[nameIndex], ageDays };
}

function nextMoonEvents(p) {
  const daysToFull = p < 0.5 ? (0.5 - p) * SYNODIC_MONTH : (1.5 - p) * SYNODIC_MONTH;
  const daysToNew = (1 - p) * SYNODIC_MONTH;
  const fmt = (d) => d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  const fullDate = new Date(Date.now() + daysToFull * 86400000);
  const newDate = new Date(Date.now() + daysToNew * 86400000);
  return { fullDate: fmt(fullDate), newDate: fmt(newDate), daysToFull: Math.round(daysToFull), daysToNew: Math.round(daysToNew) };
}

function moonSVG(p, size) {
  const r = 42, cx = 50, cy = 50;
  const k = (1 - Math.cos(2 * Math.PI * p)) / 2;
  const offset = p <= 0.5 ? -2 * r * k : 2 * r * k;
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="Mondphase">
    <defs>
      <radialGradient id="moonlit" cx="35%" cy="30%" r="80%">
        <stop offset="0%" stop-color="#FFFDF2"/>
        <stop offset="100%" stop-color="#E8DFC0"/>
      </radialGradient>
    </defs>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#moonlit)"/>
    <circle cx="${cx + offset}" cy="${cy}" r="${r}" fill="#100C1A"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#C9A46A" stroke-opacity=".3" stroke-width="1.5"/>
  </svg>`;
}

function renderMond(root) {
  root.classList.add("no-pad-top");
  const now = new Date();
  const { p, illumination, name, ageDays } = moonPhaseAt(now);
  const events = nextMoonEvents(p);
  const pct = Math.round(illumination * 100);

  const strip = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(now.getTime() + i * 86400000);
    const mp = moonPhaseAt(d);
    const label = i === 0 ? "Heute" : d.toLocaleDateString("de-DE", { weekday: "short" });
    return `<div class="moon-strip-day">
      <div class="moon-strip-icon">${moonSVG(mp.p, 40)}</div>
      <span>${label}</span>
    </div>`;
  }).join("");

  root.innerHTML = `
    <div class="tool-header">
      <button class="back-btn" id="backToHub">← Zurück</button>
      <h2>Mondphasen-Kalender</h2>
      <p class="tool-intro">Der aktuelle Mondstand, rein astronomisch berechnet – ganz ohne Internetverbindung.</p>
    </div>
    <section class="panel">
      <div class="moon-hero">
        <div class="moon-hero-icon">${moonSVG(p, 150)}</div>
        <p class="moon-hero-name">${name}</p>
        <p class="moon-hero-sub">${pct}% beleuchtet · ${Math.round(ageDays)}. Tag im Mondzyklus</p>
      </div>
      <div class="moon-events">
        <div class="moon-event-tile">
          <span class="moon-event-label">Nächster Vollmond</span>
          <span class="moon-event-date">${events.fullDate}</span>
          <span class="moon-event-days">in ${events.daysToFull} Tagen</span>
        </div>
        <div class="moon-event-tile">
          <span class="moon-event-label">Nächster Neumond</span>
          <span class="moon-event-date">${events.newDate}</span>
          <span class="moon-event-days">in ${events.daysToNew} Tagen</span>
        </div>
      </div>
      <h3>Die nächsten Tage</h3>
      <div class="moon-strip">${strip}</div>
    </section>`;

  document.getElementById("backToHub").addEventListener("click", () => renderTab("start"));
}

/* ---------- Wunsch-Board ---------- */
function loadWishes() { return loadJSON(STORAGE_KEYS.wishes, []); }
function saveWishes(list) { saveJSON(STORAGE_KEYS.wishes, list); }

function renderWunsch(root) {
  root.classList.add("no-pad-top");
  const wishes = loadWishes();
  const open = wishes.filter(w => !w.done);
  const done = wishes.filter(w => w.done);
  const moon = moonPhaseAt(new Date());
  let moonHint = "";
  if (moon.illumination < 0.08) moonHint = "🌑 Neumond ist nah – ein klassisch guter Moment, um neue Wünsche zu setzen.";
  else if (moon.illumination > 0.92) moonHint = "🌕 Vollmond ist nah – ein guter Moment, zurückzuschauen, was sich schon erfüllt hat.";

  root.innerHTML = `
    <div class="tool-header">
      <button class="back-btn" id="backToHub">← Zurück</button>
      <h2>Wunsch-Board</h2>
      <p class="tool-intro">Halte fest, wofür du gerade offen bist oder woran du arbeitest. Ganz für dich – nur auf diesem Gerät gespeichert.</p>
      ${moonHint ? `<p class="moon-hint">${moonHint}</p>` : ""}
    </div>
    <section class="panel">
      <div class="wish-add-row">
        <input type="text" id="wishInput" maxlength="140" placeholder="Ein Wunsch oder Ziel…"/>
        <button class="btn-primary" id="wishAddBtn">+</button>
      </div>

      <h3>Offen (${open.length})</h3>
      <div class="wish-list" id="wishOpenList">
        ${open.length ? open.map(wishItemHTML).join("") : `<p class="empty">Noch keine Wünsche eingetragen.</p>`}
      </div>

      ${done.length ? `
      <h3>Erfüllt (${done.length})</h3>
      <div class="wish-list">
        ${done.map(wishItemHTML).join("")}
      </div>` : ""}
    </section>`;

  document.getElementById("backToHub").addEventListener("click", () => renderTab("start"));

  function addWish() {
    const input = document.getElementById("wishInput");
    const text = input.value.trim();
    if (!text) return;
    const list = loadWishes();
    list.unshift({ id: Date.now(), text, done: false, createdAt: new Date().toISOString() });
    saveWishes(list);
    haptic(15);
    renderWunsch(root);
  }
  document.getElementById("wishAddBtn").addEventListener("click", addWish);
  document.getElementById("wishInput").addEventListener("keydown", (e) => { if (e.key === "Enter") addWish(); });

  root.querySelectorAll("[data-wish-toggle]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = parseInt(btn.dataset.wishToggle, 10);
      const list = loadWishes();
      const w = list.find(x => x.id === id);
      if (w) { w.done = !w.done; saveWishes(list); if (w.done) { haptic([15,20,15]); chime([659,880]); } renderWunsch(root); }
    });
  });
  root.querySelectorAll("[data-wish-delete]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = parseInt(btn.dataset.wishDelete, 10);
      saveWishes(loadWishes().filter(x => x.id !== id));
      renderWunsch(root);
    });
  });
}

function wishItemHTML(w) {
  return `<div class="wish-item ${w.done ? "is-done" : ""}">
    <button class="wish-check" data-wish-toggle="${w.id}" aria-label="Als erfüllt markieren">${w.done ? "✓" : ""}</button>
    <span class="wish-text">${w.text}</span>
    <button class="wish-delete" data-wish-delete="${w.id}" aria-label="Löschen">×</button>
  </div>`;
}

/* ---------- Hexenbrett ---------- */
const HEXENBRETT_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const HEXENBRETT_NUMBERS = "0123456789".split("");

const HEXENBRETT_ANSWERS = {
  JA: "Ein klares Ja – die Zeichen stehen gerade günstig für diese Sache.",
  NEIN: "Ein klares Nein – gerade eher nicht, auch wenn das nicht für immer gelten muss.",
  BALD: "Nicht sofort, aber auch nicht mehr lange. Etwas braucht noch einen kurzen Moment, um zu reifen.",
  WARTE: "Diese Frage will noch nicht beantwortet werden. Manchmal ist Abwarten selbst schon die Antwort.",
  MUT: "Was hier fehlt, ist weniger Klarheit als der erste Schritt. Trau dich – der Rest ergibt sich oft unterwegs.",
  GEDULD: "Es ist bereits auf dem Weg, nur eben langsamer, als du es dir wünschst. Dranbleiben lohnt sich.",
  KLARHEIT: "Die eigentliche Antwort liegt schon in dir – du weißt vermutlich mehr, als du dir gerade eingestehst.",
  VERTRAUEN: "Weniger eine Sache des Wissens als des Loslassens. Nicht alles lässt sich vorab absichern.",
  LOSLASSEN: "Etwas hält dich gerade fest, das dir eigentlich nicht mehr guttut. Ein Ende kann auch Erleichterung sein.",
  VIELLEICHT: "Die Lage ist wirklich noch offen – frag in ein paar Tagen noch einmal, wenn sich mehr gezeigt hat.",
  STILLE: "Bevor du weitermachst, hilft dir gerade eher Ruhe als eine weitere Aktion.",
  ZEIT: "Es geht hier weniger um das Ob als um das Wann. Der richtige Moment ist noch nicht ganz da.",
  RUHE: "Der Trubel um die Frage herum überdeckt gerade die eigentliche Antwort. Erst zur Ruhe kommen, dann entscheiden.",
  WEITER: "Der eingeschlagene Weg stimmt. Die Antwort ist: einfach dranbleiben."
};
const HEXENBRETT_WORDS = Object.keys(HEXENBRETT_ANSWERS).filter(w => w !== "JA" && w !== "NEIN");

function renderHexenbrett(root) {
  root.classList.add("no-pad-top");
  root.innerHTML = `
    <div class="tool-header">
      <button class="back-btn" id="backToHub">← Zurück</button>
      <h2>Hexenbrett</h2>
      <p class="tool-intro">Stell eine Frage und beobachte, welche Antwort sich buchstabiert. Ein Spiel zur Reflexion – keine echte Kommunikation mit dem Jenseits und keine Tatsachenaussage.</p>
    </div>
    <section class="panel">
      <div class="question-block">
        <label for="hbQuestion">Deine Frage (optional)</label>
        <input type="text" id="hbQuestion" maxlength="140" placeholder="Was möchtest du wissen?"/>
      </div>

      <div class="hb-board" id="hbBoard">
        <div class="hb-row hb-row-words">
          <div class="hb-tile hb-tile-word" data-letter="JA">JA</div>
          <div class="hb-tile hb-tile-word" data-letter="NEIN">NEIN</div>
        </div>
        <div class="hb-letters">
          ${HEXENBRETT_LETTERS.map(l => `<div class="hb-tile" data-letter="${l}">${l}</div>`).join("")}
        </div>
        <div class="hb-numbers">
          ${HEXENBRETT_NUMBERS.map(n => `<div class="hb-tile hb-tile-num" data-letter="${n}">${n}</div>`).join("")}
        </div>
        <div class="hb-row hb-row-words">
          <div class="hb-tile hb-tile-word hb-tile-wide" data-letter="HALLO">HALLO</div>
          <div class="hb-tile hb-tile-word hb-tile-wide" data-letter="TSCHÜSS">TSCHÜSS</div>
        </div>
        <div class="hb-planchette" id="hbPlanchette"></div>
      </div>

      <button class="btn-primary" id="hbAskBtn" style="width:100%">Antwort erhalten</button>
      <div class="hb-spelled" id="hbSpelled"></div>
    </section>`;

  document.getElementById("backToHub").addEventListener("click", () => renderTab("start"));

  document.getElementById("hbAskBtn").addEventListener("click", () => {
    const question = document.getElementById("hbQuestion").value.trim();
    const btn = document.getElementById("hbAskBtn");
    const spelledEl = document.getElementById("hbSpelled");
    btn.disabled = true;
    spelledEl.innerHTML = question ? `<p class="question-echo">„${question}"</p><p class="hb-building" id="hbBuilding"></p>` : `<p class="hb-building" id="hbBuilding"></p>`;

    const useDirect = Math.random() < 0.35;
    const answer = useDirect
      ? (Math.random() < 0.5 ? "JA" : "NEIN")
      : HEXENBRETT_WORDS[Math.floor(Math.random() * HEXENBRETT_WORDS.length)];

    const letters = useDirect ? [answer] : answer.split("");
    const board = document.getElementById("hbBoard");
    let i = 0;
    let built = "";

    function highlightNext() {
      board.querySelectorAll(".hb-tile.active").forEach(t => t.classList.remove("active"));
      if (i >= letters.length) {
        btn.disabled = false;
        haptic([15, 25, 15]);
        chime([659, 880]);
        const info = HEXENBRETT_ANSWERS[answer];
        if (info) {
          const infoEl = document.createElement("p");
          infoEl.className = "hb-answer-text";
          infoEl.textContent = info;
          document.getElementById("hbSpelled").appendChild(infoEl);
        }
        return;
      }
      const letter = letters[i];
      const tile = useDirect
        ? board.querySelector(`.hb-tile-word[data-letter="${letter}"]`)
        : board.querySelector(`.hb-letters [data-letter="${letter}"]`);
      if (tile) {
        tile.classList.add("active");
        tile.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
      }
      built += letter;
      document.getElementById("hbBuilding").textContent = built;
      haptic(10);
      chime([494]);
      i++;
      setTimeout(highlightNext, useDirect ? 1400 : 680);
    }
    highlightNext();
  });
}

/* ---------- Numerologie-Rechner (rein lokal, nichts wird gespeichert) ---------- */
const NUMEROLOGY_LIFE_MEANINGS = {
  1: { title: "Der Anfänger", text: "Deine Lebenszahl steht für Eigenständigkeit, Führungskraft und den Mut, neue Wege zu gehen. Über die Jahre lernst du, deinen eigenen Kopf durchzusetzen, statt dich an anderen zu orientieren. Deine Stärke ist der erste Schritt – dort, wo andere zögern, gehst du los. Die Herausforderung dieser Zahl ist, dabei nicht ungeduldig oder rücksichtslos zu werden: Führung gelingt am besten, wenn sie andere mitnimmt statt sie zu überrollen." },
  2: { title: "Der Vermittler", text: "Deine Lebenszahl steht für Feingefühl, Kooperation und diplomatisches Geschick. Dein Weg führt dich immer wieder in die Rolle des Ausgleichs zwischen gegensätzlichen Positionen – in Beziehungen, im Beruf, in der Familie. Deine Stärke liegt darin, genau hinzuhören und Brücken zu bauen, wo andere nur Fronten sehen. Die Herausforderung ist, dabei die eigene Stimme nicht zu verlieren – Vermitteln heißt nicht, sich selbst zurückzustellen." },
  3: { title: "Der Ausdrucksstarke", text: "Deine Lebenszahl steht für Kreativität, Kommunikation und Lebensfreude. Du bist hier, um dich auszudrücken – in Worten, Bildern, Musik oder einfach in der Art, wie du mit Menschen sprichst. Deine Stärke ist es, Schwere leichter zu machen und andere mit deiner Energie anzustecken. Die Herausforderung besteht darin, dranzubleiben: Deine Ideen sprudeln oft schneller, als du sie zu Ende führst." },
  4: { title: "Der Baumeister", text: "Deine Lebenszahl steht für Struktur, Verlässlichkeit und Ausdauer. Dein Lebensweg belohnt geduldige, systematische Arbeit – du baust dir etwas Beständiges auf, Stein für Stein, statt auf schnelle Erfolge zu hoffen. Deine Stärke ist, dass man sich auf dich verlassen kann. Die Herausforderung ist, dabei nicht zu starr zu werden – manchmal muss ein Plan sich ändern dürfen, ohne dass gleich alles zusammenbricht." },
  5: { title: "Der Freiheitsliebende", text: "Deine Lebenszahl steht für Abwechslung, Neugier und Anpassungsfähigkeit. Dein Weg ist selten geradlinig – du lernst durch Erfahrung, durch Ausprobieren, durch Veränderung. Routine wird für dich schnell eng, neue Umgebungen und Menschen ziehen dich an. Die Herausforderung ist, genug Kontinuität zu finden, damit aus deiner Vielseitigkeit auch etwas Tragfähiges entsteht." },
  6: { title: "Der Fürsorgliche", text: "Deine Lebenszahl steht für Verantwortung, Harmonie und Sinn für Gemeinschaft. Dein Weg führt dich oft in Rollen, in denen andere sich auf dich verlassen – Familie, Freundeskreis, Team. Deine Stärke ist echte Fürsorge, die spürbar ist. Die Herausforderung ist, dabei nicht die eigenen Bedürfnisse hintenanzustellen, bis nichts mehr übrig ist, das du geben kannst." },
  7: { title: "Der Denker", text: "Deine Lebenszahl steht für Analyse, Rückzug und die Suche nach tieferem Verständnis. Dein Weg führt oft nach innen – du willst Dinge wirklich verstehen, nicht nur oberflächlich kennen. Deine Stärke ist eine seltene gedankliche Tiefe. Die Herausforderung ist, dich nicht zu sehr zu isolieren – manche Antworten findest du nur im Austausch mit anderen, nicht allein am Schreibtisch." },
  8: { title: "Der Gestalter", text: "Deine Lebenszahl steht für Tatkraft, Ehrgeiz und Sinn fürs Große. Dein Weg dreht sich oft um Verantwortung, Einfluss und darum, spürbar etwas zu bewirken – beruflich wie persönlich. Deine Stärke ist strategisches Denken kombiniert mit echtem Durchhaltevermögen. Die Herausforderung ist, Erfolg nicht mit dem eigenen Wert gleichzusetzen – auch Pausen und Rückschläge gehören zu einem großen Weg dazu." },
  9: { title: "Der Idealist", text: "Deine Lebenszahl steht für Mitgefühl, Weitblick und den Wunsch, etwas Bedeutsames beizutragen. Dein Weg führt dich oft über den eigenen Horizont hinaus – du denkst in größeren Zusammenhängen als nur in deinem eigenen Leben. Deine Stärke ist echte Großzügigkeit. Die Herausforderung ist, loslassen zu lernen: Nicht jedes Kapitel, das endet, ist ein Verlust – manches muss abgeschlossen werden, damit Neues entstehen kann." },
  11: { title: "Die Meisterzahl der Intuition", text: "Eine Meisterzahl – sie trägt die Themen der 2 (Feingefühl, Vermittlung) in gesteigerter, oft herausfordernder Form. Dein Weg ist geprägt von besonderer Sensibilität und einer Art innerem Antennensystem für Stimmungen und Zusammenhänge, die andere übersehen. Diese Empfänglichkeit ist Gabe und Bürde zugleich – sie macht dich inspirierend, aber auch leicht überreizt. Die Aufgabe dieser Zahl ist, die eigene Intuition ernst zu nehmen, ohne sich von ihr überwältigen zu lassen." },
  22: { title: "Die Meisterzahl des Gestalters", text: "Eine Meisterzahl – sie trägt die Themen der 4 (Struktur, Ausdauer) in gesteigerter, oft herausfordernder Form. Dein Weg verbindet große Visionen mit der seltenen Fähigkeit, sie tatsächlich praktisch umzusetzen, nicht nur zu träumen. Das macht dich potenziell zu jemandem, der wirklich etwas Bleibendes schafft. Die Aufgabe dieser Zahl ist, sich vom eigenen Anspruch nicht erdrücken zu lassen – nicht jedes Projekt muss ein Lebenswerk sein." },
  33: { title: "Die Meisterzahl der Fürsorge", text: "Eine Meisterzahl – sie trägt die Themen der 6 (Verantwortung, Fürsorge) in gesteigerter, oft herausfordernder Form. Dein Weg ist geprägt von einem tiefen Mitgefühl, das oft über das gewöhnliche Maß hinausgeht – du fühlst mit anderen, manchmal fast so, als wäre es dein eigenes Erleben. Das macht dich zu jemandem, bei dem sich Menschen wirklich gesehen fühlen. Die Aufgabe dieser Zahl ist, diese Fürsorge auch dir selbst zukommen zu lassen." }
};

const NUMEROLOGY_NAME_MEANINGS = {
  1: { title: "Der Anfänger", text: "Deine Namenszahl beschreibt, wie du nach außen wirkst: eigenständig, direkt und mit klarer eigener Meinung. Andere nehmen dich als jemanden wahr, der Initiative ergreift und ungern nur abwartet. Das verschafft dir schnell Respekt – kann in der Wirkung aber auch dominant erscheinen, wenn du es nicht abmilderst." },
  2: { title: "Der Vermittler", text: "Deine Namenszahl beschreibt, wie du nach außen wirkst: einfühlsam, kooperativ und ausgleichend. Andere erleben dich als jemanden, mit dem man gut reden kann, der zuhört statt zu dominieren. Diese Wirkung öffnet dir viele Türen – achte nur darauf, dass du dabei nicht als unentschlossen missverstanden wirst." },
  3: { title: "Der Ausdrucksstarke", text: "Deine Namenszahl beschreibt, wie du nach außen wirkst: lebendig, kommunikativ und kreativ. Andere nehmen dich schnell als unterhaltsam und inspirierend wahr – du bringst Leichtigkeit in Gespräche und Situationen. Die Kehrseite: Manche nehmen dich dadurch nicht immer ernst genug, wenn es wirklich ernst wird." },
  4: { title: "Der Baumeister", text: "Deine Namenszahl beschreibt, wie du nach außen wirkst: verlässlich, bodenständig und organisiert. Andere vertrauen dir schnell wichtige Aufgaben an, weil du den Ruf hast, Dinge wirklich zu Ende zu bringen. Achte darauf, dabei nicht zu ernst oder unnahbar zu wirken." },
  5: { title: "Der Freiheitsliebende", text: "Deine Namenszahl beschreibt, wie du nach außen wirkst: lebendig, offen und schwer festzulegen. Andere erleben dich als spannend und abwechslungsreich – man weiß nie ganz genau, was als Nächstes kommt. Die Kehrseite: Manche empfinden dich dadurch als schwer greifbar oder unzuverlässig, selbst wenn du es nicht bist." },
  6: { title: "Der Fürsorgliche", text: "Deine Namenszahl beschreibt, wie du nach außen wirkst: warmherzig, verantwortungsbewusst und einladend. Andere fühlen sich in deiner Nähe schnell aufgehoben und gut behandelt. Achte darauf, dass diese Fürsorge nicht als Erwartungshaltung bei dir selbst zur Belastung wird." },
  7: { title: "Der Denker", text: "Deine Namenszahl beschreibt, wie du nach außen wirkst: nachdenklich, unabhängig und ein wenig geheimnisvoll. Andere spüren, dass in dir mehr vorgeht, als du zeigst – das macht dich interessant, aber auch schwer einzuschätzen. Ein bewusst offeneres Auftreten hilft, näher an andere heranzukommen." },
  8: { title: "Der Gestalter", text: "Deine Namenszahl beschreibt, wie du nach außen wirkst: zielstrebig, kompetent und mit natürlicher Autorität. Andere trauen dir schnell Führung und Verantwortung zu. Achte darauf, dass diese Wirkung nicht einschüchternd wird, wenn Nähe gefragt ist statt Führung." },
  9: { title: "Der Idealist", text: "Deine Namenszahl beschreibt, wie du nach außen wirkst: großzügig, weltoffen und mit einem Gespür fürs große Ganze. Andere erleben dich als jemanden mit Weitblick, der über den Tellerrand hinausdenkt. Die Kehrseite: Manche empfinden dich dadurch als etwas distanziert vom Alltäglichen." },
  11: { title: "Die Meisterzahl der Intuition", text: "Eine Meisterzahl in deiner Außenwirkung – du wirkst auf andere oft ungewöhnlich sensibel und aufmerksam, fast so, als würdest du mehr wahrnehmen als der Durchschnitt. Das macht dich für manche faszinierend, für andere schwer einzuordnen." },
  22: { title: "Die Meisterzahl des Gestalters", text: "Eine Meisterzahl in deiner Außenwirkung – andere trauen dir große Vorhaben zu und nehmen dich als jemanden wahr, der Visionen tatsächlich umsetzen kann, nicht nur davon spricht. Das bringt Vertrauen, aber auch hohe Erwartungen mit sich." },
  33: { title: "Die Meisterzahl der Fürsorge", text: "Eine Meisterzahl in deiner Außenwirkung – andere spüren bei dir eine Fürsorge, die über das Übliche hinausgeht, fast familiär. Das macht dich zu einer Vertrauensperson, kann aber auch dazu führen, dass Menschen viel von dir erwarten." }
};

function reduceNumerology(n) {
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
    n = String(n).split("").reduce((s, d) => s + parseInt(d, 10), 0);
  }
  return n;
}

const PYTHAGOREAN_MAP = { A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8,I:9, J:1,K:2,L:3,M:4,N:5,O:6,P:7,Q:8,R:9, S:1,T:2,U:3,V:4,W:5,X:6,Y:7,Z:8 };

function nameNumerology(name) {
  const normalized = name.toUpperCase()
    .replace(/Ä/g, "A").replace(/Ö/g, "O").replace(/Ü/g, "U").replace(/ß/g, "SS")
    .replace(/[^A-Z]/g, "");
  if (!normalized) return null;
  const sum = normalized.split("").reduce((s, ch) => s + (PYTHAGOREAN_MAP[ch] || 0), 0);
  return reduceNumerology(sum);
}

function lifePathNumerology(dateStr) {
  const digits = dateStr.replace(/-/g, "");
  if (!digits) return null;
  const sum = digits.split("").reduce((s, d) => s + parseInt(d, 10), 0);
  return reduceNumerology(sum);
}

function renderNumerologie(root) {
  root.classList.add("no-pad-top");
  root.innerHTML = `
    <div class="tool-header">
      <button class="back-btn" id="backToHub">← Zurück</button>
      <h2>Numerologie-Rechner</h2>
      <p class="tool-intro">Lebenszahl aus deinem Geburtsdatum und optional eine Namenszahl. Rein symbolische Deutungstradition, keine wissenschaftlich anerkannte Methode – und nichts davon wird gespeichert, nur auf dieser Seite berechnet.</p>
    </div>
    <section class="panel">
      <div class="question-block">
        <label for="numBirthdate">Geburtsdatum</label>
        <input type="date" id="numBirthdate"/>
      </div>
      <div class="question-block">
        <label for="numName">Name (optional, für die Namenszahl)</label>
        <input type="text" id="numName" maxlength="60" placeholder="Vor- und Nachname"/>
      </div>
      <button class="btn-primary" id="numCalcBtn" style="width:100%">Berechnen</button>
      <div id="numResult" class="num-result"></div>
    </section>`;

  document.getElementById("backToHub").addEventListener("click", () => renderTab("start"));

  document.getElementById("numCalcBtn").addEventListener("click", () => {
    const dateVal = document.getElementById("numBirthdate").value;
    const nameVal = document.getElementById("numName").value.trim();
    const resultEl = document.getElementById("numResult");

    if (!dateVal) {
      resultEl.innerHTML = `<p class="empty">Bitte trage zuerst ein Geburtsdatum ein.</p>`;
      return;
    }
    haptic(15);
    chime([523, 659, 784]);

    const life = lifePathNumerology(dateVal);
    const lifeM = NUMEROLOGY_LIFE_MEANINGS[life];
    let html = `
      <div class="num-card">
        <span class="num-big">${life}</span>
        <div>
          <p class="num-title">Lebenszahl · ${lifeM.title}</p>
          <p class="num-text">${lifeM.text}</p>
        </div>
      </div>`;

    if (nameVal) {
      const nn = nameNumerology(nameVal);
      if (nn) {
        const nnM = NUMEROLOGY_NAME_MEANINGS[nn];
        html += `
          <div class="num-card">
            <span class="num-big">${nn}</span>
            <div>
              <p class="num-title">Namenszahl · ${nnM.title}</p>
              <p class="num-text">${nnM.text}</p>
            </div>
          </div>`;
      }
    }
    resultEl.innerHTML = html;
  });
}

/* ---------- Horoskop (Sonnenzeichen, rein offline berechnet) ---------- */
const ZODIAC_SIGNS = [
  { id: "widder", name: "Widder", symbol: "♈", range: "21.03.–19.04.", element: "Feuer", trait: "Du gehst Dinge mit Schwung, Mut und einem klaren Kopf für Neues an. Deine Stärke ist der erste Schritt – du zauderst selten lange. Achte darauf, dass dieser Tatendrang nicht in Ungeduld mit anderen umschlägt, die etwas langsamer sind als du." },
  { id: "stier", name: "Stier", symbol: "♉", range: "20.04.–20.05.", element: "Erde", trait: "Beständigkeit, Genussfähigkeit und ein feines Gespür für das, was wirklich trägt, prägen deine Art. Du lässt dich ungern hetzen und triffst Entscheidungen lieber gründlich als schnell. Deine Herausforderung: manchmal darf auch etwas Unfertiges gut genug sein." },
  { id: "zwillinge", name: "Zwillinge", symbol: "♊", range: "21.05.–20.06.", element: "Luft", trait: "Neugier, Wortgewandtheit und Freude am Austausch treiben dich an. Du erfasst neue Zusammenhänge schnell und wechselst mühelos zwischen Themen. Die Kehrseite: Manchmal tut es gut, eine Sache wirklich zu Ende zu bringen, bevor die nächste lockt." },
  { id: "krebs", name: "Krebs", symbol: "♋", range: "21.06.–22.07.", element: "Wasser", trait: "Gefühl, Fürsorge und ein starkes Gespür für Zwischentöne stehen bei dir im Vordergrund. Du merkst oft, wie es anderen wirklich geht, noch bevor sie es sagen. Achte darauf, dass du dabei die eigene Stimmung nicht aus den Augen verlierst." },
  { id: "loewe", name: "Löwe", symbol: "♌", range: "23.07.–22.08.", element: "Feuer", trait: "Herzlichkeit, Ausdruckskraft und eine natürliche Präsenz zeichnen dich aus. Du übernimmst gern die Bühne, wenn es etwas zu gestalten gibt. Die Kunst besteht darin, auch anderen bewusst Raum zu geben, ohne dass es sich für dich wie Verzicht anfühlt." },
  { id: "jungfrau", name: "Jungfrau", symbol: "♍", range: "23.08.–22.09.", element: "Erde", trait: "Genauigkeit, Verlässlichkeit und ein Sinn fürs Praktische leiten dich durch den Alltag. Du siehst Details, die anderen entgehen, und sorgst dafür, dass Dinge wirklich funktionieren. Achte darauf, dass der eigene Anspruch dich nicht härter behandelt als jeden anderen." },
  { id: "waage", name: "Waage", symbol: "♎", range: "23.09.–22.10.", element: "Luft", trait: "Ausgleich, Ästhetik und der Wunsch nach Harmonie prägen deine Entscheidungen. Du wägst gern beide Seiten ab, bevor du dich festlegst. Die Herausforderung: nicht jede Entscheidung braucht Einstimmigkeit – manchmal ist eine klare eigene Position wichtiger als der Kompromiss." },
  { id: "skorpion", name: "Skorpion", symbol: "♏", range: "23.10.–21.11.", element: "Wasser", trait: "Intensität, Tiefgang und ein untrügliches Gespür für das Wesentliche prägen deine Herangehensweise. Oberflächliches reicht dir selten – du willst verstehen, was wirklich dahintersteckt. Achte darauf, dass dieses Bedürfnis nach Tiefe andere nicht überfordert." },
  { id: "schuetze", name: "Schütze", symbol: "♐", range: "22.11.–21.12.", element: "Feuer", trait: "Weitblick, Optimismus und Freiheitsliebe treiben dich an. Du denkst gern groß und lässt dich von Grenzen selten abschrecken. Die Kehrseite: Manchmal lohnt sich ein zweiter Blick auf die Details, bevor du weiterziehst." },
  { id: "steinbock", name: "Steinbock", symbol: "♑", range: "22.12.–19.01.", element: "Erde", trait: "Disziplin, Zielstrebigkeit und ein langer Atem tragen dich durch anspruchsvolle Phasen. Du gibst nicht schnell auf, wenn du dir etwas vorgenommen hast. Achte darauf, dass Erfolg nicht der einzige Maßstab wird, an dem du dich misst." },
  { id: "wassermann", name: "Wassermann", symbol: "♒", range: "20.01.–18.02.", element: "Luft", trait: "Eigenständigkeit, Ideenreichtum und ein Gespür für das, was noch kommt, zeichnen dich aus. Du denkst gern quer zu gewohnten Wegen. Die Herausforderung: auch mal Nähe zulassen, statt alles auf Distanz zu analysieren." },
  { id: "fische", name: "Fische", symbol: "♓", range: "19.02.–20.03.", element: "Wasser", trait: "Einfühlungsvermögen, Fantasie und eine feine Wahrnehmung für Stimmungen prägen dich. Du spürst oft mehr, als sich in Worte fassen lässt. Achte darauf, dich dabei nicht in den Gefühlen anderer zu verlieren." }
];

const ELEMENT_MOODS = {
  Feuer: [
    "Heute lohnt es sich, einen ersten Schritt zu wagen, den du schon länger vor dir herschiebst.",
    "Deine Energie ist heute spürbar hoch – nutze sie für etwas, das dir wirklich wichtig ist.",
    "Ein spontaner Impuls könnte dich heute weiterbringen als jeder durchdachte Plan.",
    "Heute darfst du ruhig auch mal Nein sagen, ohne ein schlechtes Gewissen.",
    "Etwas Angefangenes wartet darauf, heute endlich fertig zu werden.",
    "Trau dich heute, etwas offen auszusprechen, das du sonst für dich behältst."
  ],
  Erde: [
    "Kleine, konkrete Schritte bringen dich heute weiter als große Pläne.",
    "Der Tag eignet sich gut, um etwas Praktisches zu ordnen, das schon länger liegen bleibt.",
    "Geduld ist heute dein bester Verbündeter, auch wenn es schwerfällt.",
    "Achte heute besonders auf deinen Körper – er sagt dir gerade etwas Wichtiges.",
    "Ein bewährter Weg trägt dich heute weiter als ein neues Experiment.",
    "Heute darfst du dir ruhig auch mal etwas Beständiges gönnen, statt ständig etwas Neues zu suchen."
  ],
  Luft: [
    "Ein Gespräch könnte heute mehr klären, als du erwartest – trau dich, es zu suchen.",
    "Ein unerwarteter Moment könnte dir heute eine ganz neue Perspektive schenken.",
    "Deine Gedanken sind heute besonders klar – ein guter Tag, um etwas zu planen.",
    "Heute lohnt es sich, aktiv nach dem Austausch mit anderen zu suchen.",
    "Eine Idee, die dir heute kommt, ist es wert, aufgeschrieben zu werden.",
    "Achte heute darauf, nicht zu viele Dinge gleichzeitig anzufangen."
  ],
  Wasser: [
    "Achte heute auf ein Gefühl, das du sonst schnell beiseiteschiebst.",
    "Kleine Pausen tun dir heute besonders gut, auch wenn der Tag voll wirkt.",
    "Ein Blick zurück zeigt dir heute, wie weit du eigentlich schon gekommen bist.",
    "Vertrau heute etwas mehr auf deinen ersten Impuls, auch wenn er sich nicht logisch anfühlt.",
    "Heute ist ein guter Tag, um jemandem zu sagen, was er dir bedeutet.",
    "Gönn dir heute bewusst einen Moment für dich allein, auch wenn es schwerfällt, ihn dir zu nehmen."
  ]
};

const FOCUS_AREAS = ["Beziehungen", "Arbeit & Ziele", "Energie & Gesundheit", "Gedanken & Klarheit", "Zuhause & Rückzug", "Neue Begegnungen"];

function horoscopeToday(signId, element) {
  const d = new Date();
  const key = `${d.getFullYear()}${d.getMonth()}${d.getDate()}-${signId}`;
  let seed = 0;
  for (let i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) >>> 0;
  const rnd = mulberry32(seed);
  const pool = ELEMENT_MOODS[element];
  const mood = pool[Math.floor(rnd() * pool.length)];
  const focus = FOCUS_AREAS[Math.floor(rnd() * FOCUS_AREAS.length)];
  return { mood, focus };
}

function renderHoroskop(root) {
  root.classList.add("no-pad-top");
  root.innerHTML = `
    <div class="tool-header">
      <button class="back-btn" id="backToHub">← Zurück</button>
      <h2>Horoskop</h2>
      <p class="tool-intro">Wähle dein Sternzeichen für einen kurzen Tagesimpuls. Rein symbolische Deutungstradition, keine wissenschaftlich anerkannte Methode – jeden Tag neu berechnet, komplett offline.</p>
    </div>
    <section class="panel">
      <div class="zodiac-grid" id="zodiacGrid">
        ${ZODIAC_SIGNS.map(z => `
          <button class="zodiac-tile" data-zodiac="${z.id}">
            <span class="zodiac-symbol">${z.symbol}</span>
            <span class="zodiac-name">${z.name}</span>
            <span class="zodiac-range">${z.range}</span>
          </button>`).join("")}
      </div>
      <div id="zodiacResult" class="zodiac-result"></div>
    </section>`;

  document.getElementById("backToHub").addEventListener("click", () => renderTab("start"));

  root.querySelectorAll("[data-zodiac]").forEach(btn => {
    btn.addEventListener("click", () => {
      root.querySelectorAll("[data-zodiac]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const sign = ZODIAC_SIGNS.find(z => z.id === btn.dataset.zodiac);
      haptic(15);
      const { mood, focus } = horoscopeToday(sign.id, sign.element);
      document.getElementById("zodiacResult").innerHTML = `
        <div class="zodiac-card">
          <span class="zodiac-card-symbol">${sign.symbol}</span>
          <p class="zodiac-card-name">${sign.name} <span class="zodiac-card-element">· Element ${sign.element}</span></p>
          <p class="zodiac-card-trait">${sign.trait}</p>
          <p class="zodiac-card-mood">${mood}</p>
          <p class="zodiac-card-focus">Besonders im Fokus heute: <strong>${focus}</strong></p>
        </div>`;
    });
  });
}

/* ---------- Navigation ---------- */
const TAB_RENDERERS = { start: renderStart, legen: renderLegen, lexikon: renderLexikon, lernen: renderLernen, anleitung: renderAnleitung, mehr: renderMehr, orakel: renderOrakel, mond: renderMond, wunsch: renderWunsch, hexenbrett: renderHexenbrett, numerologie: renderNumerologie, horoskop: renderHoroskop };

function renderTab(tab) {
  state.tab = tab;
  document.querySelectorAll(".navbtn").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  const root = document.getElementById("view");
  root.classList.remove("no-pad-top");
  TAB_RENDERERS[tab](root);
  root.scrollTop = 0;
  window.scrollTo(0, 0);
}

function initNav() {
  document.querySelectorAll(".navbtn").forEach(btn => {
    btn.addEventListener("click", () => renderTab(btn.dataset.tab));
  });
  renderTab("start");
  if (!loadJSON(STORAGE_KEYS.onboarded, false)) showOnboarding();
}

/* ---------- Onboarding ---------- */
const ONBOARDING_SLIDES = [
  { icon: "🔮", title: "Willkommen bei AEVARANNA", text: "Das vollständige 78-Karten-Tarot – zum Legen, Nachschlagen und Lernen, mit eigens gestalteten Kartenmotiven." },
  { icon: "🃏", title: "Karten legen", text: "Tageskarte, Wochenlegung, Keltisches Kreuz oder eine eigene Legung – stelle deine Frage und ziehe Karten." },
  { icon: "📖", title: "Lexikon & Lernen", text: "Alle 78 Bedeutungen zum Nachschlagen, plus Karteikarten und Quiz, um sie dir zu merken." },
  { icon: "✨", title: "Ganz für dich", text: "Alles bleibt nur auf deinem Gerät. Los geht's – schau dir gern deine erste Tageskarte an." }
];

function showOnboarding() {
  let step = 0;
  const backdrop = document.createElement("div");
  backdrop.className = "onboarding-backdrop";
  document.body.appendChild(backdrop);

  function render() {
    const s = ONBOARDING_SLIDES[step];
    backdrop.innerHTML = `
      <div class="onboarding-box">
        <div class="onboarding-icon">${s.icon}</div>
        <h3>${s.title}</h3>
        <p>${s.text}</p>
        <div class="onboarding-dots">
          ${ONBOARDING_SLIDES.map((_, i) => `<span class="onboarding-dot ${i === step ? "active" : ""}"></span>`).join("")}
        </div>
        <div class="onboarding-actions">
          ${step < ONBOARDING_SLIDES.length - 1
            ? `<button class="btn-ghost" id="obSkip">Überspringen</button><button class="btn-primary" id="obNext">Weiter</button>`
            : `<button class="btn-primary" id="obDone" style="width:100%">Los geht's</button>`}
        </div>
      </div>`;
    const next = document.getElementById("obNext");
    if (next) next.addEventListener("click", () => { step++; render(); });
    const skip = document.getElementById("obSkip");
    if (skip) skip.addEventListener("click", finish);
    const done = document.getElementById("obDone");
    if (done) done.addEventListener("click", finish);
  }
  function finish() {
    saveJSON(STORAGE_KEYS.onboarded, true);
    backdrop.remove();
  }
  render();
}

/* ---------- Update-Hinweis ---------- */
function showUpdateBanner(reg) {
  if (document.getElementById("updateBanner")) return;
  const banner = document.createElement("div");
  banner.id = "updateBanner";
  banner.className = "update-banner";
  banner.innerHTML = `<span>Neue Version verfügbar.</span><button id="updateBtn">Aktualisieren</button>`;
  document.body.prepend(banner);
  document.getElementById("updateBtn").addEventListener("click", () => {
    if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  applyTheme();
  initNav();
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").then(reg => {
      if (reg.waiting) showUpdateBanner(reg);
      reg.addEventListener("updatefound", () => {
        const nw = reg.installing;
        nw.addEventListener("statechange", () => {
          if (nw.state === "installed" && navigator.serviceWorker.controller) showUpdateBanner(reg);
        });
      });
    }).catch(() => {});
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }
});
