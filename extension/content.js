// ── Playback state (persists while page is open) ──
let playState    = "stopped"; // stopped | loading | playing | paused
let sentences    = [];
let chunks       = [];
let currentIndex = 0;
let stopFlag     = false;
let currentAudio = null;
let cfg          = {};

const TONE_PRESETS = {
  natural:  { rateMulti: 1.00, pitch: null },
  podcast:  { rateMulti: 0.95, pitch: 1.05 },
  calm:     { rateMulti: 0.78, pitch: 0.88 },
  professor:{ rateMulti: 1.08, pitch: 1.12 },
  news:     { rateMulti: 1.15, pitch: 1.00 }
};

const OPENAI_VOICES = {
  male:   { natural:"echo",  podcast:"onyx",    calm:"echo",  professor:"onyx",  news:"onyx"    },
  female: { natural:"nova",  podcast:"shimmer", calm:"alloy", professor:"fable", news:"shimmer" }
};
const EL_VOICES = {
  male:   { natural:"pNInz6obpgDQGcFmaJgB", podcast:"ErXwobaYiN019PkySvjV", calm:"ErXwobaYiN019PkySvjV", professor:"pNInz6obpgDQGcFmaJgB", news:"pNInz6obpgDQGcFmaJgB" },
  female: { natural:"21m00Tcm4TlvDq8ikWAM", podcast:"EXAVITQu4vr4xnSDxMaL", calm:"21m00Tcm4TlvDq8ikWAM", professor:"EXAVITQu4vr4xnSDxMaL", news:"21m00Tcm4TlvDq8ikWAM" }
};

const MALE_KW   = ["male","david","mark","daniel","james","tom","fred","albert","ralph","bruce","zarvox","junior","bad news","boing","bubbles","deranged","hysterical","trinoids","cellos","bahh","aaron","eric","liam","ryan"];
const FEMALE_KW = ["female","samantha","victoria","karen","moira","tessa","fiona","kate","susan","alice","veena","ava","allison","emily","joanna","salli","kendra","kimberly","ivy","amy","emma","olivia","aria","zira","hazel"];

// ── Push update to popup (if open) ──
function notify(action, data) {
  chrome.runtime.sendMessage({ action, ...data }).catch(() => {});
}

// ── Voice picker ──
function pickVoice(gender) {
  const kw   = gender === "male" ? MALE_KW : FEMALE_KW;
  const all  = window.speechSynthesis.getVoices();
  const eng  = all.filter(v => v.lang.startsWith("en"));
  const pool = eng.length ? eng : all;
  return pool.find(v => kw.some(k => v.name.toLowerCase().includes(k))) || pool[0] || null;
}

// ── Split text ──
function splitSentences(text) {
  const raw = text.match(/[^.!?]+[.!?]*["'\u201d]?\s*/g) || [text];
  return raw.map(s => s.trim()).filter(s => s.length > 0);
}

function chunkText(sents, maxChars) {
  const out = []; let cur = "";
  for (const s of sents) {
    if (cur.length + s.length > maxChars) { if (cur.trim()) out.push(cur.trim()); cur = s; }
    else cur += " " + s;
  }
  if (cur.trim()) out.push(cur.trim());
  return out.length ? out : [sents.join(" ")];
}

// ── Fetch TTS audio via background (avoids CORS issues) ──
function fetchAudioChunk(text) {
  return new Promise((resolve, reject) => {
    const voice   = OPENAI_VOICES[cfg.gender]?.[cfg.tone] || "nova";
    const voiceId = EL_VOICES[cfg.gender]?.[cfg.tone]     || "21m00Tcm4TlvDq8ikWAM";
    chrome.runtime.sendMessage({
      action:       "fetchTTS",
      text,
      provider:     cfg.provider,
      openaiKey:    cfg.openaiKey,
      elevenLabsKey:cfg.elevenLabsKey,
      voice,
      voiceId
    }, (resp) => {
      if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
      if (resp?.error) reject(new Error(resp.error));
      else             resolve(resp.base64);
    });
  });
}

function playBase64(base64) {
  return new Promise((resolve, reject) => {
    if (stopFlag) { resolve(); return; }
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const blob  = new Blob([bytes], { type: "audio/mpeg" });
    const url   = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.playbackRate = parseFloat(cfg.rate) || 1;
    currentAudio = audio;
    audio.play().catch(reject);
    audio.onended = () => { URL.revokeObjectURL(url); currentAudio = null; resolve(); };
    audio.onerror = () => { URL.revokeObjectURL(url); currentAudio = null; reject(new Error("Audio playback error")); };
  });
}

// ── Browser TTS playback ──
function speakBrowserFrom(index) {
  if (index >= sentences.length || stopFlag) {
    playState = "stopped";
    notify("playbackEnded", {});
    return;
  }
  const tone = TONE_PRESETS[cfg.tone] || TONE_PRESETS.natural;
  const utt  = new SpeechSynthesisUtterance(sentences[index]);
  utt.rate   = (parseFloat(cfg.rate) || 1) * tone.rateMulti;
  utt.pitch  = tone.pitch !== null ? tone.pitch : (cfg.gender === "female" ? 1.2 : 0.85);
  const voice = pickVoice(cfg.gender);
  if (voice) utt.voice = voice;

  currentIndex = index;
  playState    = "playing";
  notify("sentenceStart", { index, total: sentences.length, sentence: sentences[index] });

  utt.onend   = () => speakBrowserFrom(index + 1);
  utt.onerror = (e) => {
    if (e.error !== "interrupted") {
      playState = "stopped";
      notify("playbackError", { error: e.error });
    }
  };
  window.speechSynthesis.speak(utt);
}

// ── API TTS playback ──
async function speakAPIChunks(startIndex = 0) {
  const maxChars = cfg.provider === "elevenlabs" ? 2400 : 3800;
  if (startIndex === 0) chunks = chunkText(sentences, maxChars);
  if (startIndex === 0) {
    playState = "loading";
    notify("statusChange", { state: "loading" });
  }

  for (let i = startIndex; i < chunks.length; i++) {
    if (stopFlag) break;
    currentIndex = i;
    notify("sentenceStart", { index: i, total: chunks.length, sentence: chunks[i] });

    try {
      const base64 = await fetchAudioChunk(chunks[i]);
      if (stopFlag) break;
      playState = "playing";
      notify("statusChange", { state: "playing" });
      await playBase64(base64);
    } catch (e) {
      playState = "stopped";
      notify("playbackError", { error: e.message });
      return;
    }
  }

  if (!stopFlag) {
    playState = "stopped";
    notify("playbackEnded", {});
  }
}

// ── Start fresh playback ──
async function startPlayback(text, settings) {
  window.speechSynthesis.cancel();
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  stopFlag     = false;
  cfg          = settings;
  sentences    = splitSentences(text);
  currentIndex = 0;
  playState    = "playing";

  if (cfg.provider !== "browser") {
    speakAPIChunks();
  } else {
    speakBrowserFrom(0);
  }
}

// ── Controls ──
function pausePlayback() {
  if (playState !== "playing") return;
  if (currentAudio) currentAudio.pause();
  else window.speechSynthesis.pause();
  playState = "paused";
  notify("statusChange", { state: "paused" });
}

function resumePlayback() {
  if (playState !== "paused") return;
  if (currentAudio) currentAudio.play();
  else window.speechSynthesis.resume();
  playState = "playing";
  notify("statusChange", { state: "playing" });
}

function stopPlayback() {
  stopFlag = true;
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  window.speechSynthesis.cancel();
  playState = "stopped";
  notify("statusChange", { state: "stopped" });
}

function skipSentence() {
  if (cfg.provider !== "browser") return;
  window.speechSynthesis.cancel();
  const next = currentIndex + 1;
  if (next < sentences.length) speakBrowserFrom(next);
  else { playState = "stopped"; notify("playbackEnded", {}); }
}

function replaySentence() {
  if (cfg.provider !== "browser") return;
  window.speechSynthesis.cancel();
  speakBrowserFrom(currentIndex);
}

// ── Message handler ──
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {

  if (req.action === "getSelectedText") {
    sendResponse({ text: window.getSelection().toString().trim() });

  } else if (req.action === "getStatus") {
    sendResponse({
      state:           playState,
      currentSentence: sentences[currentIndex] || chunks[currentIndex] || "",
      currentIndex,
      total:           sentences.length || chunks.length
    });

  } else if (req.action === "startPlayback") {
    startPlayback(req.text, req.settings);
    sendResponse({ ok: true });

  } else if (req.action === "pause") {
    pausePlayback();
    sendResponse({ ok: true });

  } else if (req.action === "resume") {
    resumePlayback();
    sendResponse({ ok: true });

  } else if (req.action === "stop") {
    stopPlayback();
    sendResponse({ ok: true });

  } else if (req.action === "skip") {
    skipSentence();
    sendResponse({ ok: true });

  } else if (req.action === "replay") {
    replaySentence();
    sendResponse({ ok: true });

  } else if (req.action === "updateSettings") {
    // Merge new settings into cfg
    if (req.gender !== undefined) cfg.gender = req.gender;
    if (req.tone   !== undefined) cfg.tone   = req.tone;
    if (req.rate   !== undefined) cfg.rate   = parseFloat(req.rate);

    // Speed: apply instantly to current audio element (no restart needed)
    if (req.rate !== undefined && currentAudio) {
      currentAudio.playbackRate = parseFloat(req.rate) || 1;
    }

    // Voice / tone changed while playing → restart from current position
    const voiceChanged = req.gender !== undefined || req.tone !== undefined;
    if (voiceChanged && playState === "playing") {
      if (cfg.provider === "browser") {
        window.speechSynthesis.cancel();
        speakBrowserFrom(currentIndex);
      } else {
        // API: stop current chunk, re-fetch and play from here
        const resumeFrom = currentIndex;
        stopFlag = true;
        if (currentAudio) { currentAudio.pause(); currentAudio = null; }
        setTimeout(() => {
          stopFlag = false;
          playState = "loading";
          notify("statusChange", { state: "loading" });
          speakAPIChunks(resumeFrom);
        }, 80);
      }
    }
    sendResponse({ ok: true });

  } else if (req.action === "playText") {
    // Right-click context menu shortcut
    startPlayback(req.text, {
      provider:      req.provider || "browser",
      gender:        req.gender   || "female",
      rate:          req.rate     || 1.0,
      tone:          req.toneMode || "natural",
      openaiKey:     req.openaiKey     || "",
      elevenLabsKey: req.elevenLabsKey || ""
    });
    sendResponse({ ok: true });
  }

  return true;
});
