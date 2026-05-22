// ── Context menu ──
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "voicereader-play",
    title: "▶ Play with VoiceReader",
    contexts: ["selection"]
  });
});

// ── Helpers ──
function bufferToBase64(buffer) {
  let b = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) b += String.fromCharCode(bytes[i]);
  return btoa(b);
}

// ── TTS API fetchers ──
async function fetchOpenAI(text, apiKey, voice) {
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "tts-1", input: text, voice, response_format: "mp3" })
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error?.message || `OpenAI error ${res.status}`);
  }
  return bufferToBase64(await res.arrayBuffer());
}

async function fetchElevenLabs(text, apiKey, voiceId) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ text, model_id: "eleven_turbo_v2_5", voice_settings: { stability: 0.5, similarity_boost: 0.75 } })
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.detail?.message || `ElevenLabs error ${res.status}`);
  }
  return bufferToBase64(await res.arrayBuffer());
}

// ── Ensure content script is injected, then send a message ──
async function sendToTab(tabId, msg) {
  try {
    await chrome.tabs.sendMessage(tabId, msg);
  } catch (e) {
    // Content script not present — inject it, then retry once
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files:  ["content.js"]
      });
      // Small delay so the script can register its listeners
      await new Promise(r => setTimeout(r, 80));
      await chrome.tabs.sendMessage(tabId, msg);
    } catch (e2) {
      // Page doesn't allow injection (chrome://, about:, PDF, etc.)
      console.warn("[VoiceReader] Cannot inject on this page:", e2.message);
    }
  }
}

// ── Context menu click → send to content script ──
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "voicereader-play" || !info.selectionText) return;

  const prefs = await chrome.storage.local.get([
    "provider", "openaiKey", "elevenLabsKey",
    "voiceGender", "speechRate", "toneMode"
  ]);

  sendToTab(tab.id, {
    action:        "playText",
    text:          info.selectionText.trim(),
    provider:      prefs.provider      || "browser",
    gender:        prefs.voiceGender   || "female",
    rate:          prefs.speechRate    || 1.0,
    toneMode:      prefs.toneMode      || "natural",
    openaiKey:     prefs.openaiKey     || "",
    elevenLabsKey: prefs.elevenLabsKey || ""
  });
});

// ── Message handler: TTS fetch proxy + relay ──
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.action === "fetchTTS") {
    let promise;
    if (req.provider === "openai") {
      promise = fetchOpenAI(req.text, req.openaiKey, req.voice);
    } else if (req.provider === "elevenlabs") {
      promise = fetchElevenLabs(req.text, req.elevenLabsKey, req.voiceId);
    } else {
      sendResponse({ error: "Unknown provider" });
      return true;
    }
    promise
      .then(base64 => sendResponse({ base64 }))
      .catch(e    => sendResponse({ error: e.message }));
    return true;
  }
});
