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
    const raw = e?.error?.message || "";
    const status = res.status;
    if (status === 401 || raw.includes("invalid_api_key") || raw.includes("Incorrect API key"))
      throw new Error("Invalid OpenAI API key. Check your key in Settings.");
    if (status === 429 || raw.includes("quota") || raw.includes("exceeded"))
      throw new Error("OpenAI account has no credits. Add billing at platform.openai.com/account/billing — or switch to ElevenLabs (free tier available).");
    if (status === 400)
      throw new Error("OpenAI request error: " + (raw || "bad request"));
    throw new Error("OpenAI error " + status + (raw ? ": " + raw : ""));
  }
  return bufferToBase64(await res.arrayBuffer());
}

async function fetchElevenLabs(text, apiKey, voiceId) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ text, model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.5, similarity_boost: 0.75 } })
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    const raw = typeof e?.detail === "string" ? e.detail : (e?.detail?.message || "");
    const status = res.status;
    if (status === 401 || raw.toLowerCase().includes("invalid") || raw.toLowerCase().includes("unauthorized"))
      throw new Error("Invalid ElevenLabs API key. Check your key in Settings.");
    if (status === 422 || raw.toLowerCase().includes("quota") || raw.toLowerCase().includes("limit"))
      throw new Error("ElevenLabs free tier limit reached (10,000 chars/month). Upgrade at elevenlabs.io or switch to OpenAI.");
    if (raw.includes("deprecated") || raw.includes("not available on the free tier"))
      throw new Error("ElevenLabs model error — please reload the extension from the latest zip.");
    throw new Error("ElevenLabs error " + status + (raw ? ": " + raw : ""));
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
