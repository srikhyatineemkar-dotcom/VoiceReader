let currentProvider  = "browser";
let selectedOAIVoice = "nova";
let selectedELVoice  = "21m00Tcm4TlvDq8ikWAM";

// ── Provider selection ──
function selectProvider(p) {
  currentProvider = p;
  document.querySelectorAll(".provider-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.p === p);
  });
  document.getElementById("panelOpenAI").classList.toggle("visible",     p === "openai");
  document.getElementById("panelElevenLabs").classList.toggle("visible", p === "elevenlabs");
  hideStatus();
}

// ── OpenAI voice select ──
function selectOAIVoice(voice) {
  selectedOAIVoice = voice;
  document.querySelectorAll("#openaiVoiceGrid .voice-opt").forEach(el => {
    el.classList.toggle("selected", el.dataset.voice === voice);
  });
}

// ── ElevenLabs voice select ──
function selectELVoice(vid) {
  selectedELVoice = vid;
  document.querySelectorAll("#elVoiceGrid .voice-opt").forEach(el => {
    el.classList.toggle("selected", el.dataset.vid === vid);
  });
}

// ── Toggle password visibility ──
function toggleVis(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (inp.type === "password") { inp.type = "text";     btn.textContent = "🙈"; }
  else                         { inp.type = "password"; btn.textContent = "👁"; }
}

// ── Status messages ──
function showStatus(msg, type) {
  const el = document.getElementById("saveStatus");
  el.textContent  = msg;
  el.className    = "save-status " + type;
}
function hideStatus() {
  document.getElementById("saveStatus").className = "save-status";
}

// ── Save ──
function saveSettings() {
  const openaiKey     = document.getElementById("openaiKey").value.trim();
  const elevenLabsKey = document.getElementById("elevenLabsKey").value.trim();

  if (currentProvider === "openai" && !openaiKey) {
    showStatus("⚠ Please enter your OpenAI API key.", "error"); return;
  }
  if (currentProvider === "elevenlabs" && !elevenLabsKey) {
    showStatus("⚠ Please enter your ElevenLabs API key.", "error"); return;
  }

  chrome.storage.local.set({
    provider: currentProvider,
    openaiKey,
    elevenLabsKey,
    openaiVoice: selectedOAIVoice,
    elevenLabsVoiceId: selectedELVoice
  }, () => {
    showStatus("✓ Settings saved! Reopen the extension popup to apply.", "success");
  });
}

// ── Test voice ──
async function testVoice() {
  const btn = document.getElementById("btnTest");
  btn.disabled = true;
  btn.textContent = "Testing…";
  hideStatus();

  const testText = "Hello! VoiceReader is ready to listen.";
  const openaiKey     = document.getElementById("openaiKey").value.trim();
  const elevenLabsKey = document.getElementById("elevenLabsKey").value.trim();

  try {
    if (currentProvider === "openai") {
      if (!openaiKey) { showStatus("⚠ Enter your OpenAI API key first.", "error"); return; }
      const res = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: { "Authorization": `Bearer ${openaiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "tts-1", input: testText, voice: selectedOAIVoice, response_format: "mp3" })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Error ${res.status}`);
      }
      const buf  = await res.arrayBuffer();
      const blob = new Blob([buf], { type: "audio/mpeg" });
      new Audio(URL.createObjectURL(blob)).play();
      showStatus("✓ OpenAI voice working! Save your settings.", "success");

    } else if (currentProvider === "elevenlabs") {
      if (!elevenLabsKey) { showStatus("⚠ Enter your ElevenLabs API key first.", "error"); return; }
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${selectedELVoice}`, {
        method: "POST",
        headers: { "xi-api-key": elevenLabsKey, "Content-Type": "application/json" },
        body: JSON.stringify({ text: testText, model_id: "eleven_monolingual_v1", voice_settings: { stability: 0.5, similarity_boost: 0.75 } })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.detail?.message || `Error ${res.status}`);
      }
      const buf  = await res.arrayBuffer();
      const blob = new Blob([buf], { type: "audio/mpeg" });
      new Audio(URL.createObjectURL(blob)).play();
      showStatus("✓ ElevenLabs voice working! Save your settings.", "success");

    } else {
      // Browser TTS test
      const utt = new SpeechSynthesisUtterance(testText);
      window.speechSynthesis.speak(utt);
      showStatus("✓ Browser voice is active and working.", "info");
    }
  } catch (e) {
    showStatus("✗ " + e.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "🔊 Test Voice";
  }
}

// ── Load saved settings ──
chrome.storage.local.get([
  "provider", "openaiKey", "elevenLabsKey", "openaiVoice", "elevenLabsVoiceId"
], (prefs) => {
  if (prefs.provider)       selectProvider(prefs.provider);
  if (prefs.openaiKey)      document.getElementById("openaiKey").value      = prefs.openaiKey;
  if (prefs.elevenLabsKey)  document.getElementById("elevenLabsKey").value  = prefs.elevenLabsKey;
  if (prefs.openaiVoice)    selectOAIVoice(prefs.openaiVoice);
  if (prefs.elevenLabsVoiceId) selectELVoice(prefs.elevenLabsVoiceId);
});
