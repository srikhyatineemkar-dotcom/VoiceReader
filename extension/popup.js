let selectedText = "";
let selectedGender = "male";
let speechRate = 1.0;
let utterance = null;
let isPaused = false;
let allVoices = [];
let charTotal = 0;
let charSpoken = 0;

const textPreview = document.getElementById("textPreview");
const charCount = document.getElementById("charCount");
const btnPlay = document.getElementById("btnPlay");
const btnPause = document.getElementById("btnPause");
const btnStop = document.getElementById("btnStop");
const playIcon = document.getElementById("playIcon");
const playLabel = document.getElementById("playLabel");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const progressBar = document.getElementById("progressBar");
const noVoiceMsg = document.getElementById("noVoiceMsg");
const btnMale = document.getElementById("btnMale");
const btnFemale = document.getElementById("btnFemale");

function loadVoices() {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      allVoices = voices;
      resolve(voices);
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        allVoices = window.speechSynthesis.getVoices();
        resolve(allVoices);
      };
    }
  });
}

function pickVoice(gender) {
  const maleKeywords = [
    "male", "man", "guy", "david", "mark", "daniel", "james", "tom",
    "fred", "aaron", "alex", "bruce", "ralph", "zarvox", "trinoids",
    "albert", "bad news", "bahh", "boing", "bubbles", "cellos",
    "deranged", "good news", "hysterical", "junior", "kathy",
    "pipe organ", "samantha"
  ];
  const femaleKeywords = [
    "female", "woman", "girl", "samantha", "victoria", "karen",
    "moira", "tessa", "fiona", "kate", "susan", "alice",
    "veena", "ava", "allison", "emily", "joanna", "salli",
    "kendra", "kimberly", "ivy", "amy", "emma", "olivia", "aria"
  ];

  const keywords = gender === "male" ? maleKeywords : femaleKeywords;

  const englishVoices = allVoices.filter(v => v.lang.startsWith("en"));
  const pool = englishVoices.length > 0 ? englishVoices : allVoices;

  let found = pool.find(v =>
    keywords.some(k => v.name.toLowerCase().includes(k))
  );

  if (!found) {
    const allPool = allVoices.filter(v => v.lang.startsWith("en"));
    found = (allPool.length > 0 ? allPool : allVoices).find(v =>
      keywords.some(k => v.name.toLowerCase().includes(k))
    );
  }

  noVoiceMsg.style.display = found ? "none" : "block";

  return found || (pool.length > 0 ? pool[0] : null);
}

function setStatus(state) {
  statusDot.className = "status-dot";
  if (state === "playing") {
    statusDot.classList.add("playing");
    statusText.textContent = "Playing...";
    playIcon.textContent = "▶";
    playLabel.textContent = "Playing";
    btnPlay.disabled = true;
    btnPause.disabled = false;
    btnStop.disabled = false;
    btnPause.innerHTML = "⏸";
    isPaused = false;
  } else if (state === "paused") {
    statusDot.classList.add("paused");
    statusText.textContent = "Paused";
    btnPause.innerHTML = "▶";
    isPaused = true;
  } else if (state === "stopped") {
    statusText.textContent = "Stopped";
    btnPlay.disabled = !selectedText;
    playIcon.textContent = "▶";
    playLabel.textContent = "Play";
    btnPause.disabled = true;
    btnStop.disabled = true;
    progressBar.style.width = "0%";
    btnPause.innerHTML = "⏸";
    isPaused = false;
  } else if (state === "ready") {
    statusText.textContent = "Ready";
    btnPlay.disabled = !selectedText;
    btnPause.disabled = true;
    btnStop.disabled = true;
    progressBar.style.width = "0%";
    btnPause.innerHTML = "⏸";
    isPaused = false;
  } else if (state === "done") {
    statusText.textContent = "Done";
    progressBar.style.width = "100%";
    btnPlay.disabled = !selectedText;
    playIcon.textContent = "▶";
    playLabel.textContent = "Play Again";
    btnPause.disabled = true;
    btnStop.disabled = true;
    btnPause.innerHTML = "⏸";
    isPaused = false;
  }
}

function handlePlay() {
  if (!selectedText) return;
  window.speechSynthesis.cancel();

  utterance = new SpeechSynthesisUtterance(selectedText);
  utterance.rate = speechRate;
  utterance.pitch = selectedGender === "female" ? 1.25 : 0.85;
  utterance.volume = 1;

  const voice = pickVoice(selectedGender);
  if (voice) {
    utterance.voice = voice;
  }

  charTotal = selectedText.length;
  charSpoken = 0;

  utterance.onboundary = (e) => {
    if (e.name === "word") {
      charSpoken = e.charIndex;
      const pct = Math.min(100, Math.round((charSpoken / charTotal) * 100));
      progressBar.style.width = pct + "%";
    }
  };

  utterance.onstart = () => setStatus("playing");
  utterance.onend = () => setStatus("done");
  utterance.onerror = (e) => {
    if (e.error !== "interrupted") {
      statusText.textContent = "Error: " + e.error;
      setStatus("stopped");
    }
  };

  window.speechSynthesis.speak(utterance);
}

function handlePause() {
  if (!window.speechSynthesis.speaking) return;
  if (isPaused) {
    window.speechSynthesis.resume();
    setStatus("playing");
  } else {
    window.speechSynthesis.pause();
    setStatus("paused");
  }
}

function handleStop() {
  window.speechSynthesis.cancel();
  setStatus("stopped");
}

function selectGender(gender) {
  selectedGender = gender;
  btnMale.className = "voice-btn" + (gender === "male" ? " active" : "");
  btnFemale.className = "voice-btn" + (gender === "female" ? " active" : "");

  if (window.speechSynthesis.speaking && !isPaused) {
    handleStop();
  }

  chrome.storage.local.set({ voiceGender: gender });
}

function updateSpeed(val) {
  speechRate = parseFloat(val);
  document.getElementById("speedValue").textContent = speechRate.toFixed(1) + "×";
  chrome.storage.local.set({ speechRate: speechRate });
}

async function init() {
  await loadVoices();

  chrome.storage.local.get(["voiceGender", "speechRate"], (prefs) => {
    if (prefs.voiceGender) {
      selectedGender = prefs.voiceGender;
      selectGender(selectedGender);
    }
    if (prefs.speechRate) {
      speechRate = prefs.speechRate;
      document.getElementById("speedSlider").value = speechRate;
      document.getElementById("speedValue").textContent = speechRate.toFixed(1) + "×";
    }
  });

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]?.id) return;

    chrome.scripting.executeScript(
      {
        target: { tabId: tabs[0].id },
        func: () => window.getSelection().toString().trim()
      },
      (results) => {
        const text = results?.[0]?.result || "";
        selectedText = text;

        if (text) {
          textPreview.textContent = text;
          textPreview.classList.remove("empty");
          charCount.textContent = text.length.toLocaleString() + " characters";
          btnPlay.disabled = false;
        } else {
          textPreview.textContent =
            "Select text on any webpage, then open this extension to read it aloud.";
          textPreview.classList.add("empty");
          charCount.textContent = "";
          btnPlay.disabled = true;
        }
      }
    );
  });

  setStatus("ready");
}

init();
