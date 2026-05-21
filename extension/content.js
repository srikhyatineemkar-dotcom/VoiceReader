let currentUtterance = null;
let sentences = [];
let currentSentenceIndex = 0;
let isPaused = false;
let playbackGender = "female";
let playbackRate = 1.0;
let playbackTone = "natural";

const TONE_PRESETS = {
  natural:  { rateMulti: 1.00, pitch: 1.00 },
  podcast:  { rateMulti: 0.95, pitch: 1.05 },
  calm:     { rateMulti: 0.78, pitch: 0.88 },
  professor:{ rateMulti: 1.08, pitch: 1.12 },
  news:     { rateMulti: 1.15, pitch: 1.00 }
};

const MALE_KEYWORDS   = ["male","david","mark","daniel","james","tom","fred","albert","ralph","bruce","zarvox","junior","bad news","pipe organ","boing","bubbles","deranged","hysterical","trinoids","cellos","bahh","aaron"];
const FEMALE_KEYWORDS = ["female","samantha","victoria","karen","moira","tessa","fiona","kate","susan","alice","veena","ava","allison","emily","joanna","salli","kendra","kimberly","ivy","amy","emma","olivia","aria","google us english","google uk english female"];

function getVoice(gender) {
  const voices = window.speechSynthesis.getVoices();
  const keywords = gender === "male" ? MALE_KEYWORDS : FEMALE_KEYWORDS;
  const eng = voices.filter(v => v.lang.startsWith("en"));
  const pool = eng.length ? eng : voices;
  return pool.find(v => keywords.some(k => v.name.toLowerCase().includes(k))) || pool[0] || null;
}

function splitSentences(text) {
  const raw = text.match(/[^.!?]+[.!?]*["']?/g) || [text];
  return raw.map(s => s.trim()).filter(s => s.length > 0);
}

function speakSentence(index, onDone) {
  if (index >= sentences.length) {
    onDone && onDone("end");
    return;
  }
  const tone = TONE_PRESETS[playbackTone] || TONE_PRESETS.natural;
  const utt = new SpeechSynthesisUtterance(sentences[index]);
  utt.rate = playbackRate * tone.rateMulti;
  utt.pitch = playbackTone === "natural"
    ? (playbackGender === "female" ? 1.2 : 0.85)
    : tone.pitch;
  utt.volume = 1;

  const voice = getVoice(playbackGender);
  if (voice) utt.voice = voice;

  currentUtterance = utt;

  utt.onend = () => {
    chrome.runtime.sendMessage({
      action: "sentenceDone",
      index,
      total: sentences.length
    }).catch(() => {});
    speakSentence(index + 1, onDone);
  };

  utt.onerror = (e) => {
    if (e.error !== "interrupted") onDone && onDone("error");
  };

  currentSentenceIndex = index;
  chrome.runtime.sendMessage({
    action: "sentenceStart",
    index,
    total: sentences.length,
    sentence: sentences[index]
  }).catch(() => {});

  window.speechSynthesis.speak(utt);
}

function startPlayback(text, gender, rate, tone) {
  window.speechSynthesis.cancel();
  isPaused = false;
  playbackGender = gender || "female";
  playbackRate = parseFloat(rate) || 1.0;
  playbackTone = tone || "natural";
  sentences = splitSentences(text);
  currentSentenceIndex = 0;

  speakSentence(0, (reason) => {
    chrome.runtime.sendMessage({ action: "playbackEnded", reason }).catch(() => {});
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "playText") {
    startPlayback(request.text, request.gender, request.rate, request.toneMode);
    sendResponse({ ok: true });
  } else if (request.action === "pause") {
    window.speechSynthesis.pause();
    isPaused = true;
    sendResponse({ ok: true });
  } else if (request.action === "resume") {
    window.speechSynthesis.resume();
    isPaused = false;
    sendResponse({ ok: true });
  } else if (request.action === "stop") {
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
  } else if (request.action === "getStatus") {
    sendResponse({
      speaking: window.speechSynthesis.speaking,
      paused: window.speechSynthesis.paused,
      currentSentenceIndex,
      totalSentences: sentences.length,
      currentSentence: sentences[currentSentenceIndex] || ""
    });
  }
  return true;
});
