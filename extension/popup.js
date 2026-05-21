// ── State ──
let selectedText  = "";
let selectedGender = "female";
let selectedTone  = "natural";
let speechRate    = 1.0;
let sentences     = [];
let currentSentenceIndex = 0;
let isPlaying     = false;
let isPaused      = false;
let allVoices     = [];
let stopFlag      = false;
let currentAPIAudio = null;
let provider      = "browser";
let openaiKey     = "";
let elevenLabsKey = "";

// ── Voice maps ──
const TONE_PRESETS = {
  natural:  { rateMulti: 1.00, pitch: null },
  podcast:  { rateMulti: 0.95, pitch: 1.05 },
  calm:     { rateMulti: 0.78, pitch: 0.88 },
  professor:{ rateMulti: 1.08, pitch: 1.12 },
  news:     { rateMulti: 1.15, pitch: 1.00 }
};

const OPENAI_VOICES = {
  male:   { natural:"echo",   podcast:"onyx",    calm:"echo",   professor:"onyx",   news:"onyx"    },
  female: { natural:"nova",   podcast:"shimmer", calm:"alloy",  professor:"fable",  news:"shimmer" }
};

const EL_VOICES = {
  male:   { natural:"pNInz6obpgDQGcFmaJgB", podcast:"ErXwobaYiN019PkySvjV", calm:"ErXwobaYiN019PkySvjV", professor:"pNInz6obpgDQGcFmaJgB", news:"pNInz6obpgDQGcFmaJgB" },
  female: { natural:"21m00Tcm4TlvDq8ikWAM", podcast:"EXAVITQu4vr4xnSDxMaL", calm:"21m00Tcm4TlvDq8ikWAM", professor:"EXAVITQu4vr4xnSDxMaL", news:"21m00Tcm4TlvDq8ikWAM" }
};

const MALE_KW   = ["male","david","mark","daniel","james","tom","fred","albert","ralph","bruce","zarvox","junior","bad news","boing","bubbles","deranged","hysterical","trinoids","cellos","bahh","aaron"];
const FEMALE_KW = ["female","samantha","victoria","karen","moira","tessa","fiona","kate","susan","alice","veena","ava","allison","emily","joanna","salli","kendra","kimberly","ivy","amy","emma","olivia","aria"];

// ── DOM ──
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

// ── Voice loading ──
function loadVoices() {
  return new Promise(r => {
    const v = window.speechSynthesis.getVoices();
    if (v.length) { allVoices = v; r(); }
    else { window.speechSynthesis.onvoiceschanged = () => { allVoices = window.speechSynthesis.getVoices(); r(); }; }
  });
}

function pickVoice(gender) {
  const kw = gender === "male" ? MALE_KW : FEMALE_KW;
  const eng = allVoices.filter(v => v.lang.startsWith("en"));
  const pool = eng.length ? eng : allVoices;
  return pool.find(v => kw.some(k => v.name.toLowerCase().includes(k))) || pool[0] || null;
}

// ── Text chunking ──
function splitSentences(text) {
  const raw = text.match(/[^.!?]+[.!?]*["'\u201d]?\s*/g) || [text];
  return raw.map(s => s.trim()).filter(s => s.length > 0);
}

function chunkSentences(sents, maxChars = 3800) {
  const chunks = []; let cur = "";
  for (const s of sents) {
    if (cur.length + s.length > maxChars) { if (cur.trim()) chunks.push(cur.trim()); cur = s; }
    else cur += " " + s;
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks.length ? chunks : [sents.join(" ")];
}

// ── API TTS ──
async function fetchTTSChunk(text) {
  if (provider === "openai" && openaiKey) {
    const voice = OPENAI_VOICES[selectedGender]?.[selectedTone] || "nova";
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { "Authorization": `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "tts-1", input: text, voice, response_format: "mp3" })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `OpenAI error ${res.status}`);
    }
    return await res.arrayBuffer();

  } else if (provider === "elevenlabs" && elevenLabsKey) {
    const voiceId = EL_VOICES[selectedGender]?.[selectedTone] || "21m00Tcm4TlvDq8ikWAM";
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: { "xi-api-key": elevenLabsKey, "Content-Type": "application/json" },
      body: JSON.stringify({ text, model_id: "eleven_monolingual_v1", voice_settings: { stability: 0.5, similarity_boost: 0.75 } })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.detail?.message || `ElevenLabs error ${res.status}`);
    }
    return await res.arrayBuffer();
  }
  throw new Error("No API provider configured");
}

function playBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const blob = new Blob([buffer], { type: "audio/mpeg" });
    const url  = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.playbackRate = speechRate;
    currentAPIAudio = audio;
    audio.play().catch(reject);
    audio.onended = () => { URL.revokeObjectURL(url); currentAPIAudio = null; resolve(); };
    audio.onerror = () => { URL.revokeObjectURL(url); currentAPIAudio = null; reject(new Error("Playback error")); };
  });
}

async function playWithAPI() {
  stopFlag = false;
  setStatus("loading");
  const chunks = chunkSentences(sentences, provider === "elevenlabs" ? 2400 : 3800);

  for (let i = 0; i < chunks.length; i++) {
    if (stopFlag) break;
    updateTracker(i, chunks.length, chunks[i]);
    try {
      const buffer = await fetchTTSChunk(chunks[i]);
      if (stopFlag) break;
      setStatus("playing");
      await playBuffer(buffer);
    } catch (e) {
      showError(e.message);
      break;
    }
  }
  if (!stopFlag) setStatus("done");
}

// ── Browser TTS ──
function speakFrom(index) {
  if (index >= sentences.length || stopFlag) { setStatus("done"); return; }
  const tone = TONE_PRESETS[selectedTone] || TONE_PRESETS.natural;
  const utt  = new SpeechSynthesisUtterance(sentences[index]);
  utt.rate   = speechRate * tone.rateMulti;
  utt.pitch  = tone.pitch !== null ? tone.pitch : (selectedGender === "female" ? 1.2 : 0.85);
  const voice = pickVoice(selectedGender);
  if (voice) utt.voice = voice;
  currentSentenceIndex = index;
  updateTracker(index, sentences.length, sentences[index]);
  utt.onend   = () => speakFrom(index + 1);
  utt.onerror = (e) => { if (e.error !== "interrupted") setStatus("stopped"); };
  window.speechSynthesis.speak(utt);
}

// ── Tracker ──
function updateTracker(index, total, sentence) {
  const pct = total ? Math.round(((index + 1) / total) * 100) : 0;
  progressFill.style.width = pct + "%";
  progressLbl.textContent  = total > 1 ? `${index + 1} / ${total}` : "";
  nowReading.classList.add("visible");
  nowReadingText.textContent = sentence || "";
}

// ── Status machine ──
function setStatus(state) {
  statusDot.className = "dot";
  isPaused = false;
  hideError();

  if (state === "loading") {
    statusText.textContent = "Generating audio…";
    playIcon.textContent = "⏳";
    playLabel.textContent = "Loading";
    btnPlay.disabled = false;
    btnPause.disabled = true;
    btnSkip.disabled  = true;
    btnReplay.disabled = true;

  } else if (state === "playing") {
    isPlaying = true;
    statusDot.classList.add("playing");
    statusText.textContent = "Playing";
    playIcon.textContent = "⏹";
    playLabel.textContent = "Stop";
    btnPlay.disabled = false;
    btnPause.disabled = false;
    btnPause.textContent = "⏸";
    btnSkip.disabled  = false;
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
    progressLbl.textContent  = "";

  } else if (state === "done") {
    isPlaying = false;
    statusText.textContent = "Done ✓";
    progressFill.style.width = "100%";
    playIcon.textContent = "▶";
    playLabel.textContent = "Play Again";
    btnPlay.disabled = false;
    btnPause.disabled = true;
    btnSkip.disabled  = true;
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

function showError(msg) {
  errorMsg.textContent = "⚠ " + msg;
  errorMsg.classList.add("visible");
  setStatus("stopped");
}
function hideError() { errorMsg.classList.remove("visible"); }

// ── Controls ──
function handlePlayStop() {
  if (isPlaying || statusText.textContent === "Generating audio…") {
    stopFlag = true;
    if (currentAPIAudio) { currentAPIAudio.pause(); currentAPIAudio = null; }
    window.speechSynthesis.cancel();
    setStatus("stopped");
    return;
  }
  if (!selectedText) return;
  sentences = splitSentences(selectedText);
  currentSentenceIndex = 0;
  stopFlag = false;

  if (provider !== "browser") {
    isPlaying = true;
    playWithAPI();
  } else {
    setStatus("playing");
    speakFrom(0);
  }
}

function handlePause() {
  if (!isPlaying) return;
  if (isPaused) {
    if (currentAPIAudio) currentAPIAudio.play();
    else window.speechSynthesis.resume();
    setStatus("playing");
  } else {
    if (currentAPIAudio) currentAPIAudio.pause();
    else window.speechSynthesis.pause();
    setStatus("paused");
  }
}

function handleSkip() {
  if (!isPlaying || provider !== "browser") return;
  window.speechSynthesis.cancel();
  const next = currentSentenceIndex + 1;
  if (next < sentences.length) speakFrom(next);
  else setStatus("done");
}

function handleReplay() {
  if (!isPlaying || provider !== "browser") return;
  window.speechSynthesis.cancel();
  speakFrom(currentSentenceIndex);
}

function selectGender(g) {
  selectedGender = g;
  $("btnMale").className   = "tog-btn" + (g === "male"   ? " active" : "");
  $("btnFemale").className = "tog-btn" + (g === "female" ? " active" : "");
  if (isPlaying) { stopFlag = true; window.speechSynthesis.cancel(); setStatus("stopped"); }
  chrome.storage.local.set({ voiceGender: g });
}

function selectTone(t) {
  selectedTone = t;
  document.querySelectorAll(".tone-btn").forEach(b => b.classList.toggle("active", b.dataset.tone === t));
  if (isPlaying) { stopFlag = true; window.speechSynthesis.cancel(); setStatus("stopped"); }
  chrome.storage.local.set({ toneMode: t });
}

function updateSpeed(val) {
  speechRate = parseFloat(val);
  $("speedVal").textContent = speechRate.toFixed(2).replace(/\.?0+$/, "") + "×";
  chrome.storage.local.set({ speechRate });
}

// ── Listen for right-click updates ──
chrome.runtime.onMessage.addListener((req) => {
  if (req.action === "sentenceStart") {
    nowReading.classList.add("visible");
    nowReadingText.textContent = req.sentence;
    const pct = req.total ? Math.round(((req.index + 1) / req.total) * 100) : 0;
    progressFill.style.width = pct + "%";
    progressLbl.textContent  = req.total > 1 ? `${req.index + 1} / ${req.total}` : "";
    statusDot.className = "dot playing";
    statusText.textContent = "Playing";
    btnPause.disabled = false;
  }
  if (req.action === "playbackEnded") {
    nowReading.classList.remove("visible");
    statusDot.className = "dot";
    statusText.textContent = "Done ✓";
    progressFill.style.width = "100%";
  }
});

// ── Init ──
async function init() {
  await loadVoices();

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
    $("speedSlider").value = speechRate;
    $("speedVal").textContent = parseFloat(speechRate).toFixed(2).replace(/\.?0+$/, "") + "×";
  }

  // Update API badge
  if (provider === "openai" && openaiKey) {
    apiBadge.textContent = "OpenAI";
    apiBadge.className = "api-badge active";
  } else if (provider === "elevenlabs" && elevenLabsKey) {
    apiBadge.textContent = "ElevenLabs";
    apiBadge.className = "api-badge active";
  } else {
    apiBadge.textContent = "Browser";
    apiBadge.className = "api-badge browser";
  }

  // Get selected text from active tab
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
          wordCountEl.textContent = words.toLocaleString() + " words";
          charCountEl.textContent = text.length.toLocaleString() + " chars";
          btnPlay.disabled = false;
        } else {
          textBox.textContent = "Select text on any page, then click Play — or right-click for instant audio.";
          textBox.classList.add("empty");
          wordCountEl.textContent = "";
          charCountEl.textContent = "";
          btnPlay.disabled = true;
        }
      }
    );
  });

  setStatus("ready");
}

init();
