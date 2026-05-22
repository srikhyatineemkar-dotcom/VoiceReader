// ── popup.js is a pure remote control — all playback is in content.js ──
let selectedText   = "";
let selectedGender = "female";
let selectedTone   = "natural";
let speechRate     = 1.0;
let provider       = "browser";
let openaiKey      = "";
let elevenLabsKey  = "";
let activeTabId    = null;

// ── DOM refs ──
const $ = id => document.getElementById(id);
const textBox        = $("textBox");
const wordCountEl    = $("wordCount");
const charCountEl    = $("charCount");
const nowReading     = $("nowReading");
const nowReadingText = $("nowReadingText");
const errorMsg       = $("errorMsg");
const btnPlay        = $("btnPlay");
const playIcon       = $("playIcon");
const playLabel      = $("playLabel");
const btnPause       = $("btnPause");
const btnReplay      = $("btnReplay");
const btnSkip        = $("btnSkip");
const statusDot      = $("statusDot");
const statusText     = $("statusText");
const progressFill   = $("progressFill");
const progressLbl    = $("progressLbl");
const apiBadge       = $("apiBadge");
const speedSlider    = $("speedSlider");
const speedVal       = $("speedVal");

// ── Send command to content script ──
function send(msg) {
  if (!activeTabId) return;
  chrome.tabs.sendMessage(activeTabId, msg, () => {
    if (chrome.runtime.lastError) {} // popup may open before content is ready
  });
}

// ── Event listeners ──
$("btnSettings").addEventListener("click", () => chrome.runtime.openOptionsPage());
$("btnMale").addEventListener("click",   () => selectGender("male"));
$("btnFemale").addEventListener("click", () => selectGender("female"));
btnPlay.addEventListener("click",   handlePlayStop);
btnPause.addEventListener("click",  handlePause);
btnReplay.addEventListener("click", () => send({ action: "replay" }));
btnSkip.addEventListener("click",   () => send({ action: "skip" }));
speedSlider.addEventListener("input", () => updateSpeed(speedSlider.value));
document.querySelectorAll(".tone-btn").forEach(btn => {
  btn.addEventListener("click", () => selectTone(btn.dataset.tone));
});

// ── Play / Stop ──
function handlePlayStop() {
  const isActive = playLabel.textContent === "Stop" || playLabel.textContent === "Loading";
  if (isActive) {
    send({ action: "stop" });
    setStatus("stopped");
  } else {
    if (!selectedText) return;
    send({
      action:   "startPlayback",
      text:     selectedText,
      settings: {
        provider,
        gender:        selectedGender,
        rate:          speechRate,
        tone:          selectedTone,
        openaiKey,
        elevenLabsKey
      }
    });
    setStatus(provider !== "browser" ? "loading" : "playing");
  }
}

// ── Pause / Resume ──
function handlePause() {
  if (btnPause.textContent === "⏸") {
    send({ action: "pause" });
    setStatus("paused");
  } else {
    send({ action: "resume" });
    setStatus("playing");
  }
}

// ── UI state ──
function setStatus(state) {
  statusDot.className = "dot";
  if (state === "loading") {
    statusText.textContent = "Generating audio…";
    playIcon.textContent = "⏳"; playLabel.textContent = "Loading";
    btnPlay.disabled = false;
    btnPause.disabled = true; btnSkip.disabled = true; btnReplay.disabled = true;
  } else if (state === "playing") {
    statusDot.classList.add("playing");
    statusText.textContent = "Playing";
    playIcon.textContent = "⏹"; playLabel.textContent = "Stop";
    btnPlay.disabled = false;
    btnPause.disabled = false; btnPause.textContent = "⏸";
    btnSkip.disabled = false; btnReplay.disabled = false;
  } else if (state === "paused") {
    statusDot.className = "dot paused";
    statusText.textContent = "Paused";
    btnPause.textContent = "▶";
  } else if (state === "stopped") {
    statusText.textContent = "Stopped";
    resetButtons();
    nowReading.classList.remove("visible");
    progressFill.style.width = "0%";
    progressLbl.textContent = "";
  } else if (state === "done") {
    statusText.textContent = "Done ✓";
    progressFill.style.width = "100%";
    playIcon.textContent = "▶"; playLabel.textContent = "Play Again";
    btnPlay.disabled = false;
    btnPause.disabled = true; btnSkip.disabled = true; btnReplay.disabled = true;
    nowReading.classList.remove("visible");
  } else if (state === "ready") {
    statusText.textContent = "Ready";
    resetButtons();
  }
}

function resetButtons() {
  btnPlay.disabled = !selectedText;
  playIcon.textContent = "▶"; playLabel.textContent = "Play";
  btnPause.disabled = true; btnPause.textContent = "⏸";
  btnSkip.disabled = true; btnReplay.disabled = true;
}

function showError(msg) {
  errorMsg.textContent = "⚠ " + msg;
  errorMsg.classList.add("visible");
  setStatus("stopped");
}

// ── Preferences ──
function selectGender(g) {
  selectedGender = g;
  $("btnMale").classList.toggle("active",   g === "male");
  $("btnFemale").classList.toggle("active", g === "female");
  chrome.storage.local.set({ voiceGender: g });
  // Apply immediately if already playing
  send({ action: "updateSettings", gender: g });
}

function selectTone(t) {
  selectedTone = t;
  document.querySelectorAll(".tone-btn").forEach(b => b.classList.toggle("active", b.dataset.tone === t));
  chrome.storage.local.set({ toneMode: t });
  // Apply immediately if already playing
  send({ action: "updateSettings", tone: t });
}

function updateSpeed(val) {
  speechRate = parseFloat(val);
  speedVal.textContent = speechRate.toFixed(2).replace(/\.?0+$/, "") + "×";
  chrome.storage.local.set({ speechRate });
  // Speed applies instantly to current audio — no restart needed
  send({ action: "updateSettings", rate: speechRate });
}

// ── Listen for updates pushed from content.js ──
chrome.runtime.onMessage.addListener((req) => {
  if (req.action === "sentenceStart") {
    nowReading.classList.add("visible");
    nowReadingText.textContent = req.sentence || "";
    const pct = req.total ? Math.round(((req.index + 1) / req.total) * 100) : 0;
    progressFill.style.width = pct + "%";
    progressLbl.textContent  = req.total > 1 ? `${req.index + 1} / ${req.total}` : "";
    setStatus("playing");
  }
  if (req.action === "statusChange") {
    if (req.state === "loading")  setStatus("loading");
    if (req.state === "playing")  setStatus("playing");
    if (req.state === "paused")   setStatus("paused");
    if (req.state === "stopped")  setStatus("stopped");
  }
  if (req.action === "playbackEnded") setStatus("done");
  if (req.action === "playbackError") showError(req.error || "Unknown error");
});

// ── Init: sync with content.js on open ──
async function init() {
  const prefs = await new Promise(r => chrome.storage.local.get([
    "voiceGender", "speechRate", "toneMode",
    "provider", "openaiKey", "elevenLabsKey"
  ], r));

  provider      = prefs.provider      || "browser";
  openaiKey     = prefs.openaiKey     || "";
  elevenLabsKey = prefs.elevenLabsKey || "";

  if (prefs.voiceGender) selectGender(prefs.voiceGender);
  if (prefs.toneMode)    selectTone(prefs.toneMode);
  if (prefs.speechRate) {
    speechRate = prefs.speechRate;
    speedSlider.value = speechRate;
    speedVal.textContent = parseFloat(speechRate).toFixed(2).replace(/\.?0+$/, "") + "×";
  }

  if (provider === "openai" && openaiKey) {
    apiBadge.textContent = "OpenAI"; apiBadge.className = "api-badge active";
  } else if (provider === "elevenlabs" && elevenLabsKey) {
    apiBadge.textContent = "ElevenLabs"; apiBadge.className = "api-badge active";
  } else {
    apiBadge.textContent = "Browser"; apiBadge.className = "api-badge browser";
  }

  // Get active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) { setStatus("ready"); return; }
  activeTabId = tab.id;

  // Get selected text
  chrome.scripting.executeScript(
    { target: { tabId: tab.id }, func: () => window.getSelection().toString().trim() },
    (results) => {
      const text = results?.[0]?.result || "";
      selectedText = text;
      if (text) {
        textBox.textContent = text;
        textBox.classList.remove("empty");
        const words = text.trim().split(/\s+/).length;
        wordCountEl.textContent = words.toLocaleString() + " words";
        charCountEl.textContent = text.length.toLocaleString() + " chars";
      } else {
        textBox.textContent = "Select text on any page, then click Play — or right-click for instant audio.";
        textBox.classList.add("empty");
        wordCountEl.textContent = "";
        charCountEl.textContent = "";
      }
    }
  );

  // Sync state: ask content.js if already playing
  chrome.tabs.sendMessage(tab.id, { action: "getStatus" }, (resp) => {
    if (chrome.runtime.lastError || !resp) { setStatus("ready"); return; }

    if (resp.state === "playing" || resp.state === "loading") {
      btnPlay.disabled = false;
      setStatus(resp.state);
      if (resp.currentSentence) {
        nowReading.classList.add("visible");
        nowReadingText.textContent = resp.currentSentence;
        const pct = resp.total ? Math.round(((resp.currentIndex + 1) / resp.total) * 100) : 0;
        progressFill.style.width = pct + "%";
        progressLbl.textContent  = resp.total > 1 ? `${resp.currentIndex + 1} / ${resp.total}` : "";
      }
    } else if (resp.state === "paused") {
      btnPlay.disabled = false;
      setStatus("paused");
    } else {
      setStatus("ready");
    }
    if (!selectedText) btnPlay.disabled = true;
  });
}

init();
