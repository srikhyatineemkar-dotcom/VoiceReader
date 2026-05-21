// ── Browser TTS state ──
let sentences = [];
let currentSentenceIndex = 0;
let isPaused = false;
let playbackGender = "female";
let playbackRate = 1.0;
let playbackTone = "natural";

// ── API Audio state ──
let currentAudio = null;
let stopRequested = false;

const TONE_PRESETS = {
  natural:  { rateMulti: 1.00, pitch: null },
  podcast:  { rateMulti: 0.95, pitch: 1.05 },
  calm:     { rateMulti: 0.78, pitch: 0.88 },
  professor:{ rateMulti: 1.08, pitch: 1.12 },
  news:     { rateMulti: 1.15, pitch: 1.00 }
};

const MALE_KEYWORDS   = ["male","david","mark","daniel","james","tom","fred","albert","ralph","bruce","zarvox","junior","bad news","pipe organ","boing","bubbles","deranged","hysterical","trinoids","cellos","bahh","aaron"];
const FEMALE_KEYWORDS = ["female","samantha","victoria","karen","moira","tessa","fiona","kate","susan","alice","veena","ava","allison","emily","joanna","salli","kendra","kimberly","ivy","amy","emma","olivia","aria","google us english","google uk english female"];

function getVoice(gender) {
  const voices = window.speechSynthesis.getVoices();
  const kw = gender === "male" ? MALE_KEYWORDS : FEMALE_KEYWORDS;
  const eng = voices.filter(v => v.lang.startsWith("en"));
  const pool = eng.length ? eng : voices;
  return pool.find(v => kw.some(k => v.name.toLowerCase().includes(k))) || pool[0] || null;
}

function splitSentences(text) {
  const raw = text.match(/[^.!?]+[.!?]*["'\u201d]?\s*/g) || [text];
  return raw.map(s => s.trim()).filter(s => s.length > 0);
}

// ── Browser TTS playback ──
function speakSentence(index, onDone) {
  if (index >= sentences.length) { onDone && onDone("end"); return; }
  const tone = TONE_PRESETS[playbackTone] || TONE_PRESETS.natural;
  const utt  = new SpeechSynthesisUtterance(sentences[index]);
  utt.rate   = playbackRate * tone.rateMulti;
  utt.pitch  = tone.pitch !== null ? tone.pitch : (playbackGender === "female" ? 1.2 : 0.85);
  utt.volume = 1;
  const voice = getVoice(playbackGender);
  if (voice) utt.voice = voice;
  currentSentenceIndex = index;
  chrome.runtime.sendMessage({ action: "sentenceStart", index, total: sentences.length, sentence: sentences[index] }).catch(() => {});
  utt.onend   = () => { chrome.runtime.sendMessage({ action: "sentenceDone", index, total: sentences.length }).catch(() => {}); speakSentence(index + 1, onDone); };
  utt.onerror = (e) => { if (e.error !== "interrupted") onDone && onDone("error"); };
  window.speechSynthesis.speak(utt);
}

function startBrowserPlayback(text, gender, rate, tone) {
  window.speechSynthesis.cancel();
  stopRequested = false;
  isPaused = false;
  playbackGender = gender || "female";
  playbackRate   = parseFloat(rate) || 1.0;
  playbackTone   = tone || "natural";
  sentences      = splitSentences(text);
  currentSentenceIndex = 0;
  speakSentence(0, (reason) => {
    chrome.runtime.sendMessage({ action: "playbackEnded", reason }).catch(() => {});
  });
}

// ── API Audio playback (sequential, waits for each chunk) ──
function playBase64Audio(base64, mimeType, playbackRate) {
  return new Promise((resolve, reject) => {
    if (stopRequested) { resolve("stopped"); return; }
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const blob  = new Blob([bytes], { type: mimeType || "audio/mpeg" });
    const url   = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.playbackRate = playbackRate || 1.0;
    currentAudio = audio;
    audio.play().catch(reject);
    audio.onended = () => { URL.revokeObjectURL(url); resolve("done"); };
    audio.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Audio playback failed")); };
  });
}

// ── Message handler ──
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "playText") {
    startBrowserPlayback(request.text, request.gender, request.rate, request.toneMode);
    sendResponse({ ok: true });

  } else if (request.action === "playAPIAudio") {
    chrome.runtime.sendMessage({
      action: "sentenceStart",
      index: request.chunkIndex,
      total: request.totalChunks,
      sentence: request.sentence
    }).catch(() => {});
    playBase64Audio(request.base64, request.mimeType, request.playbackRate)
      .then(() => sendResponse({ ok: true }))
      .catch(e => sendResponse({ error: e.message }));
    return true;

  } else if (request.action === "pause") {
    if (currentAudio) currentAudio.pause();
    else window.speechSynthesis.pause();
    isPaused = true;
    sendResponse({ ok: true });

  } else if (request.action === "resume") {
    if (currentAudio) currentAudio.play();
    else window.speechSynthesis.resume();
    isPaused = false;
    sendResponse({ ok: true });

  } else if (request.action === "stop") {
    stopRequested = true;
    if (currentAudio) { currentAudio.pause(); currentAudio = null; }
    window.speechSynthesis.cancel();
    isPaused = false;
    sendResponse({ ok: true });

  } else if (request.action === "skipSentence") {
    window.speechSynthesis.cancel();
    speakSentence(currentSentenceIndex + 1, (reason) => {
      chrome.runtime.sendMessage({ action: "playbackEnded", reason }).catch(() => {});
    });
    sendResponse({ ok: true });

  } else if (request.action === "replaySentence") {
    window.speechSynthesis.cancel();
    speakSentence(currentSentenceIndex, (reason) => {
      chrome.runtime.sendMessage({ action: "playbackEnded", reason }).catch(() => {});
    });
    sendResponse({ ok: true });

  } else if (request.action === "getSelectedText") {
    sendResponse({ text: window.getSelection().toString().trim() });

  } else if (request.action === "ttsError") {
    console.error("[VoiceReader] TTS Error:", request.error);
    sendResponse({ ok: true });
  }
  return true;
});
