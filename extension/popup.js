let selectedText = "";
let selectedGender = "female";
let selectedTone = "natural";
let speechRate = 1.0;
let sentences = [];
let currentSentenceIndex = 0;
let isPlaying = false;
let isPaused = false;
let allVoices = [];

const TONE_PRESETS = {
  natural:  { rateMulti: 1.00, pitch: null },
  podcast:  { rateMulti: 0.95, pitch: 1.05 },
  calm:     { rateMulti: 0.78, pitch: 0.88 },
  professor:{ rateMulti: 1.08, pitch: 1.12 },
  news:     { rateMulti: 1.15, pitch: 1.00 }
};

const MALE_KEYWORDS   = ["male","david","mark","daniel","james","tom","fred","albert","ralph","bruce","zarvox","junior","bad news","pipe organ","boing","bubbles","deranged","hysterical","trinoids","cellos","bahh","aaron"];
const FEMALE_KEYWORDS = ["female","samantha","victoria","karen","moira","tessa","fiona","kate","susan","alice","veena","ava","allison","emily","joanna","salli","kendra","kimberly","ivy","amy","emma","olivia","aria","google us english","google uk english female"];

// ── DOM refs ──
const textBox        = document.getElementById("textBox");
const wordCount      = document.getElementById("wordCount");
const charCount      = document.getElementById("charCount");
const nowReading     = document.getElementById("nowReading");
const nowReadingText = document.getElementById("nowReadingText");
const btnPlay        = document.getElementById("btnPlay");
const playIcon       = document.getElementById("playIcon");
const playLabel      = document.getElementById("playLabel");
const btnPause       = document.getElementById("btnPause");
const btnReplay      = document.getElementById("btnReplay");
const btnSkip        = document.getElementById("btnSkip");
const statusDot      = document.getElementById("statusDot");
const statusText     = document.getElementById("statusText");
const progressFill   = document.getElementById("progressFill");
const progressLabel  = document.getElementById("progressLabel");

// ── Voice helpers ──
function loadVoices() {
  return new Promise(resolve => {
    const v = window.speechSynthesis.getVoices();
    if (v.length) { allVoices = v; resolve(); }
    else { window.speechSynthesis.onvoiceschanged = () => { allVoices = window.speechSynthesis.getVoices(); resolve(); }; }
  });
}

function pickVoice(gender) {
  const kw = gender === "male" ? MALE_KEYWORDS : FEMALE_KEYWORDS;
  const eng = allVoices.filter(v => v.lang.startsWith("en"));
  const pool = eng.length ? eng : allVoices;
  return pool.find(v => kw.some(k => v.name.toLowerCase().includes(k))) || pool[0] || null;
}

// ── Sentence splitting ──
function splitSentences(text) {
  const raw = text.match(/[^.!?]+[.!?]*["']?/g) || [text];
  return raw.map(s => s.trim()).filter(s => s.length > 0);
}

// ── Playback ──
function speakFrom(index) {
  if (index >= sentences.length) {
    setStatus("done");
    return;
  }
  const tone = TONE_PRESETS[selectedTone] || TONE_PRESETS.natural;
  const utt  = new SpeechSynthesisUtterance(sentences[index]);
  utt.rate   = speechRate * tone.rateMulti;
  utt.pitch  = tone.pitch !== null ? tone.pitch : (selectedGender === "female" ? 1.2 : 0.85);
  utt.volume = 1;
  const voice = pickVoice(selectedGender);
  if (voice) utt.voice = voice;

  currentSentenceIndex = index;
  updateTracker(index);

  utt.onend = () => { speakFrom(index + 1); };
  utt.onerror = (e) => { if (e.error !== "interrupted") setStatus("stopped"); };

  window.speechSynthesis.speak(utt);
}

function updateTracker(index) {
  const pct = sentences.length ? Math.round(((index + 1) / sentences.length) * 100) : 0;
  progressFill.style.width = pct + "%";
  progressLabel.textContent = sentences.length > 1 ? `${index + 1} / ${sentences.length}` : "";
  if (sentences[index]) {
    nowReading.classList.add("visible");
    nowReadingText.textContent = sentences[index];
  }
}

// ── UI state machine ──
function setStatus(state) {
  statusDot.className = "dot";
  isPaused = false;

  if (state === "playing") {
    isPlaying = true;
    statusDot.classList.add("playing");
    statusText.textContent = "Playing";
    playIcon.textContent = "⏹";
    playLabel.textContent = "Stop";
    btnPlay.disabled = false;
    btnPause.disabled = false;
    btnPause.textContent = "⏸";
    btnSkip.disabled = false;
    btnReplay.disabled = false;
  } else if (state === "paused") {
    isPaused = true;
    statusDot.className = "dot paused";
    statusText.textContent = "Paused";
    btnPause.textContent = "▶";
  } else if (state === "stopped") {
    isPlaying = false;
    statusText.textContent = "Stopped";
    resetControls();
    nowReading.classList.remove("visible");
    progressFill.style.width = "0%";
    progressLabel.textContent = "";
  } else if (state === "done") {
    isPlaying = false;
    statusText.textContent = "Done ✓";
    progressFill.style.width = "100%";
    progressLabel.textContent = `${sentences.length} / ${sentences.length}`;
    playIcon.textContent = "▶";
    playLabel.textContent = "Play Again";
    btnPlay.disabled = false;
    btnPause.disabled = true;
    btnSkip.disabled = true;
    btnReplay.disabled = true;
    nowReading.classList.remove("visible");
  } else if (state === "ready") {
    isPlaying = false;
    statusText.textContent = "Ready";
    resetControls();
  }
}

function resetControls() {
  btnPlay.disabled = !selectedText;
  playIcon.textContent = "▶";
  playLabel.textContent = "Play";
  btnPause.disabled = true;
  btnPause.textContent = "⏸";
  btnSkip.disabled = true;
  btnReplay.disabled = true;
}

// ── Button handlers ──
function handlePlayStop() {
  if (isPlaying) {
    window.speechSynthesis.cancel();
    setStatus("stopped");
  } else {
    if (!selectedText) return;
    window.speechSynthesis.cancel();
    sentences = splitSentences(selectedText);
    currentSentenceIndex = 0;
    setStatus("playing");
    speakFrom(0);
  }
}

function handlePause() {
  if (!isPlaying) return;
  if (isPaused) {
    window.speechSynthesis.resume();
    setStatus("playing");
  } else {
    window.speechSynthesis.pause();
    setStatus("paused");
  }
}

function handleSkip() {
  if (!isPlaying) return;
  window.speechSynthesis.cancel();
  const next = currentSentenceIndex + 1;
  if (next < sentences.length) {
    speakFrom(next);
  } else {
    setStatus("done");
  }
}

function handleReplay() {
  if (!isPlaying) return;
  window.speechSynthesis.cancel();
  speakFrom(currentSentenceIndex);
}

// ── Gender / Tone / Speed ──
function selectGender(gender) {
  selectedGender = gender;
  document.getElementById("btnMale").className   = "tog-btn" + (gender === "male"   ? " active" : "");
  document.getElementById("btnFemale").className = "tog-btn" + (gender === "female" ? " active" : "");
  if (isPlaying) { window.speechSynthesis.cancel(); setStatus("stopped"); }
  chrome.storage.local.set({ voiceGender: gender });
}

function selectTone(tone) {
  selectedTone = tone;
  document.querySelectorAll(".tone-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.tone === tone);
  });
  if (isPlaying) { window.speechSynthesis.cancel(); setStatus("stopped"); }
  chrome.storage.local.set({ toneMode: tone });
}

function updateSpeed(val) {
  speechRate = parseFloat(val);
  document.getElementById("speedVal").textContent = speechRate.toFixed(2).replace(/0$/, "") + "×";
  chrome.storage.local.set({ speechRate });
}

// ── Listen for sentence updates from content script (context menu flow) ──
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "sentenceStart") {
    nowReading.classList.add("visible");
    nowReadingText.textContent = request.sentence;
    const pct = request.total ? Math.round(((request.index + 1) / request.total) * 100) : 0;
    progressFill.style.width = pct + "%";
    progressLabel.textContent = request.total > 1 ? `${request.index + 1} / ${request.total}` : "";
    statusDot.className = "dot playing";
    statusText.textContent = "Playing via right-click";
    btnPause.disabled = false;
    btnSkip.disabled = false;
    btnReplay.disabled = false;
  }
  if (request.action === "playbackEnded") {
    nowReading.classList.remove("visible");
    statusDot.className = "dot";
    statusText.textContent = "Done ✓";
  }
});

// ── Init ──
async function init() {
  await loadVoices();

  chrome.storage.local.get(["voiceGender", "speechRate", "toneMode"], (prefs) => {
    if (prefs.voiceGender) selectGender(prefs.voiceGender);
    if (prefs.toneMode)   selectTone(prefs.toneMode);
    if (prefs.speechRate) {
      speechRate = prefs.speechRate;
      document.getElementById("speedSlider").value = speechRate;
      document.getElementById("speedVal").textContent = parseFloat(speechRate).toFixed(2).replace(/0$/, "") + "×";
    }
  });

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]?.id) return;
    chrome.scripting.executeScript(
      { target: { tabId: tabs[0].id }, func: () => window.getSelection().toString().trim() },
      (results) => {
        const text = results?.[0]?.result || "";
        selectedText = text;
        if (text) {
          textBox.textContent = text;
          textBox.classList.remove("empty");
          const words = text.trim().split(/\s+/).length;
          wordCount.textContent = words.toLocaleString() + " words";
          charCount.textContent = text.length.toLocaleString() + " chars";
          btnPlay.disabled = false;
        } else {
          textBox.textContent = "Select text on any page, then click Play — or right-click to listen instantly.";
          textBox.classList.add("empty");
          wordCount.textContent = "";
          charCount.textContent = "";
          btnPlay.disabled = true;
        }
      }
    );
  });

  setStatus("ready");
}

init();
