// ── Context menu setup ──
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "voicereader-play",
    title: "▶ Play with VoiceReader",
    contexts: ["selection"]
  });
});

// ── Helpers ──
function bufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function chunkText(text, maxChars = 4000) {
  const sentences = text.match(/[^.!?]+[.!?]*["'\u201d]?\s*/g) || [text];
  const chunks = [];
  let current = "";
  for (const s of sentences) {
    if (current.length + s.length > maxChars) {
      if (current.trim()) chunks.push(current.trim());
      current = s;
    } else {
      current += s;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length ? chunks : [text];
}

// ── OpenAI voice mapping ──
const OPENAI_VOICE_MAP = {
  male: {
    natural: "echo",
    podcast: "onyx",
    calm: "echo",
    professor: "onyx",
    news: "onyx"
  },
  female: {
    natural: "nova",
    podcast: "shimmer",
    calm: "alloy",
    professor: "fable",
    news: "shimmer"
  }
};

// ── ElevenLabs voice IDs ──
const EL_VOICES = {
  male: {
    natural: "pNInz6obpgDQGcFmaJgB",   // Adam - deep, clear
    podcast: "ErXwobaYiN019PkySvjV",    // Antoni - warm
    calm: "ErXwobaYiN019PkySvjV",       // Antoni - warm
    professor: "pNInz6obpgDQGcFmaJgB",  // Adam - authoritative
    news: "pNInz6obpgDQGcFmaJgB"        // Adam - precise
  },
  female: {
    natural: "21m00Tcm4TlvDq8ikWAM",    // Rachel - calm, professional
    podcast: "EXAVITQu4vr4xnSDxMaL",   // Bella - warm
    calm: "21m00Tcm4TlvDq8ikWAM",       // Rachel - soothing
    professor: "EXAVITQu4vr4xnSDxMaL",  // Bella - engaging
    news: "21m00Tcm4TlvDq8ikWAM"        // Rachel - clear
  }
};

// ── TTS API calls ──
async function fetchOpenAI(text, apiKey, voice) {
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "tts-1",
      input: text,
      voice: voice,
      response_format: "mp3"
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `OpenAI error ${res.status}`);
  }
  return bufferToBase64(await res.arrayBuffer());
}

async function fetchElevenLabs(text, apiKey, voiceId) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_monolingual_v1",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 }
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.detail?.message || `ElevenLabs error ${res.status}`);
  }
  return bufferToBase64(await res.arrayBuffer());
}

// ── Context menu click ──
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "voicereader-play" || !info.selectionText) return;

  const prefs = await chrome.storage.local.get([
    "provider", "openaiKey", "elevenLabsKey",
    "voiceGender", "speechRate", "toneMode"
  ]);

  const gender   = prefs.voiceGender  || "female";
  const tone     = prefs.toneMode     || "natural";
  const rate     = parseFloat(prefs.speechRate) || 1.0;
  const provider = prefs.provider     || "browser";
  const text     = info.selectionText.trim();

  if (provider === "openai" && prefs.openaiKey) {
    const chunks = chunkText(text);
    const voice  = OPENAI_VOICE_MAP[gender]?.[tone] || "nova";

    for (let i = 0; i < chunks.length; i++) {
      try {
        const base64 = await fetchOpenAI(chunks[i], prefs.openaiKey, voice);
        await chrome.tabs.sendMessage(tab.id, {
          action: "playAPIAudio",
          base64,
          mimeType: "audio/mpeg",
          playbackRate: rate,
          chunkIndex: i,
          totalChunks: chunks.length,
          sentence: chunks[i]
        });
      } catch (e) {
        chrome.tabs.sendMessage(tab.id, { action: "ttsError", error: e.message });
        break;
      }
    }
    chrome.tabs.sendMessage(tab.id, { action: "playbackEnded" });

  } else if (provider === "elevenlabs" && prefs.elevenLabsKey) {
    const chunks  = chunkText(text, 2500);
    const voiceId = EL_VOICES[gender]?.[tone] || "21m00Tcm4TlvDq8ikWAM";

    for (let i = 0; i < chunks.length; i++) {
      try {
        const base64 = await fetchElevenLabs(chunks[i], prefs.elevenLabsKey, voiceId);
        await chrome.tabs.sendMessage(tab.id, {
          action: "playAPIAudio",
          base64,
          mimeType: "audio/mpeg",
          playbackRate: rate,
          chunkIndex: i,
          totalChunks: chunks.length,
          sentence: chunks[i]
        });
      } catch (e) {
        chrome.tabs.sendMessage(tab.id, { action: "ttsError", error: e.message });
        break;
      }
    }
    chrome.tabs.sendMessage(tab.id, { action: "playbackEnded" });

  } else {
    // Browser TTS fallback
    chrome.tabs.sendMessage(tab.id, {
      action: "playText",
      text,
      gender,
      rate,
      toneMode: tone
    });
  }
});

// ── Message relay ──
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fetchTTS") {
    const { text, provider, openaiKey, elevenLabsKey, voice, voiceId } = request;

    let promise;
    if (provider === "openai") {
      promise = fetchOpenAI(text, openaiKey, voice);
    } else if (provider === "elevenlabs") {
      promise = fetchElevenLabs(text, elevenLabsKey, voiceId);
    } else {
      sendResponse({ error: "Unknown provider" });
      return true;
    }

    promise
      .then(base64 => sendResponse({ base64 }))
      .catch(e   => sendResponse({ error: e.message }));
    return true;
  }
});
