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

// ── OpenAI voice ──
function selectOAIVoice(voice) {
  selectedOAIVoice = voice;
  document.querySelectorAll("#openaiVoiceGrid .voice-opt").forEach(el => {
    el.classList.toggle("selected", el.dataset.voice === voice);
  });
}

// ── ElevenLabs voice ──
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

// ── Status ──
function showStatus(msg, type) {
  const el = document.getElementById("saveStatus");
  el.textContent = msg;
  el.className   = "save-status " + type;
}
function hideStatus() { document.getElementById("saveStatus").className = "save-status"; }

// ── Save ──
function saveSettings() {
  const oKey  = document.getElementById("openaiKey").value.trim();
  const elKey = document.getElementById("elevenLabsKey").value.trim();

  if (currentProvider === "openai"      && !oKey)  { showStatus("⚠ Please enter your OpenAI API key.", "error");     return; }
  if (currentProvider === "elevenlabs"  && !elKey) { showStatus("⚠ Please enter your ElevenLabs API key.", "error"); return; }

  chrome.storage.local.set({
    provider:          currentProvider,
    openaiKey:         oKey,
    elevenLabsKey:     elKey,
    openaiVoice:       selectedOAIVoice,
    elevenLabsVoiceId: selectedELVoice
  }, () => {
    showStatus("✓ Saved! Reopen the extension popup to apply changes.", "success");
  });
}

// ── Test voice ──
async function testVoice() {
  const btn = document.getElementById("btnTest");
  btn.disabled = true;
  btn.textContent = "Testing…";
  hideStatus();

  const testText = "Hello! VoiceReader is ready to listen.";
  const oKey  = document.getElementById("openaiKey").value.trim();
  const elKey = document.getElementById("elevenLabsKey").value.trim();

  try {
    if (currentProvider === "openai") {
      if (!oKey) { showStatus("⚠ Enter your OpenAI API key first.", "error"); return; }
      const res = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: { "Authorization": `Bearer ${oKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "tts-1", input: testText, voice: selectedOAIVoice, response_format: "mp3" })
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `Error ${res.status}`); }
      const blob = new Blob([await res.arrayBuffer()], { type: "audio/mpeg" });
      new Audio(URL.createObjectURL(blob)).play();
      showStatus("✓ OpenAI voice working! Click Save Settings.", "success");

    } else if (currentProvider === "elevenlabs") {
      if (!elKey) { showStatus("⚠ Enter your ElevenLabs API key first.", "error"); return; }
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${selectedELVoice}`, {
        method: "POST",
        headers: { "xi-api-key": elKey, "Content-Type": "application/json" },
        body: JSON.stringify({ text: testText, model_id: "eleven_monolingual_v1", voice_settings: { stability: 0.5, similarity_boost: 0.75 } })
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.detail?.message || `Error ${res.status}`); }
      const blob = new Blob([await res.arrayBuffer()], { type: "audio/mpeg" });
      new Audio(URL.createObjectURL(blob)).play();
      showStatus("✓ ElevenLabs voice working! Click Save Settings.", "success");

    } else {
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(testText));
      showStatus("✓ Browser voice is active.", "info");
    }
  } catch (e) {
    showStatus("✗ " + e.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "🔊 Test Voice";
  }
}

// ── Wire up events (no inline handlers) ──
document.getElementById("provBrowser").addEventListener("click",    () => selectProvider("browser"));
document.getElementById("provOpenAI").addEventListener("click",     () => selectProvider("openai"));
document.getElementById("provElevenLabs").addEventListener("click", () => selectProvider("elevenlabs"));
document.getElementById("btnSave").addEventListener("click", saveSettings);
document.getElementById("btnTest").addEventListener("click", testVoice);
document.getElementById("toggleOpenAI").addEventListener("click", function() { toggleVis("openaiKey", this); });
document.getElementById("toggleEL").addEventListener("click",     function() { toggleVis("elevenLabsKey", this); });

document.querySelectorAll("#openaiVoiceGrid .voice-opt").forEach(el => {
  el.addEventListener("click", () => selectOAIVoice(el.dataset.voice));
});
document.querySelectorAll("#elVoiceGrid .voice-opt").forEach(el => {
  el.addEventListener("click", () => selectELVoice(el.dataset.vid));
});

// ── Load saved prefs ──
chrome.storage.local.get([
  "provider", "openaiKey", "elevenLabsKey", "openaiVoice", "elevenLabsVoiceId"
], (prefs) => {
  if (prefs.provider)          selectProvider(prefs.provider);
  if (prefs.openaiKey)         document.getElementById("openaiKey").value     = prefs.openaiKey;
  if (prefs.elevenLabsKey)     document.getElementById("elevenLabsKey").value = prefs.elevenLabsKey;
  if (prefs.openaiVoice)       selectOAIVoice(prefs.openaiVoice);
  if (prefs.elevenLabsVoiceId) selectELVoice(prefs.elevenLabsVoiceId);
});
