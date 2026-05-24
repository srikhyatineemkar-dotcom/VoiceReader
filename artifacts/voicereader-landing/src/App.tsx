export default function App() {
  const steps = [
    { n: "1", title: "Download the ZIP", desc: "Click the button above to download voicereader-extension.zip to your computer." },
    { n: "2", title: "Extract the folder", desc: 'Right-click the ZIP file and choose "Extract All" (Windows) or double-click it (Mac) to unzip it.' },
    { n: "3", title: "Open Chrome Extensions", desc: 'Type chrome://extensions in your address bar and press Enter. Works on Chrome, Edge, and Brave.' },
    { n: "4", title: "Enable Developer Mode", desc: "Toggle the \"Developer Mode\" switch in the top-right corner of the Extensions page." },
    { n: "5", title: "Load the Extension", desc: 'Click "Load unpacked" and select the extracted extension folder. VoiceReader will appear in your toolbar.' },
  ];

  const features = [
    { icon: "🖱️", title: "Right-Click to Play", desc: "Select any text on any webpage, right-click, and choose \"Play with VoiceReader\" for instant audio." },
    { icon: "🎙️", title: "5 Tone Modes", desc: "Natural, Podcast, Calm, Professor, or News Anchor — each fine-tunes the pace and pitch to match the content." },
    { icon: "👥", title: "Male & Female Voices", desc: "Switch between male and female voices instantly. Change applies live, even while playing." },
    { icon: "⚡", title: "Speed Control", desc: "Adjust playback from 0.75× to 2× speed. Changes apply immediately without restarting." },
    { icon: "⏸️", title: "Full Playback Controls", desc: "Pause, resume, skip sentences, replay, and stop — all from the popup or while audio plays." },
    { icon: "🔑", title: "Human-Like API Voices", desc: "Add an OpenAI or ElevenLabs API key in Settings for voices that sound like a real podcast host." },
  ];

  const voices = [
    { icon: "🌐", name: "Browser", quality: "Basic", desc: "Free & offline but sounds robotic — good for quick testing.", color: "#6b7280", bg: "#f3f4f6", border: "#e5e7eb" },
    { icon: "⚡", name: "OpenAI", quality: "Very Natural", desc: "6 expressive voices. ~$0.015 per 1,000 characters. Sounds like a real person.", color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
    { icon: "🎭", name: "ElevenLabs", quality: "Most Human", desc: "The most realistic voices available. Free tier: 10,000 chars/month.", color: "#6c5ce7", bg: "#f5f3ff", border: "#ddd6fe" },
  ];

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", background: "#f8f7ff", color: "#1a1a2e", minHeight: "100vh" }}>

      {/* ── HERO ── */}
      <div style={{ background: "linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%)", padding: "80px 24px 90px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 70% 50%, rgba(255,255,255,.08) 0%, transparent 60%)", pointerEvents: "none" }} />
        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 72, height: 72, background: "rgba(255,255,255,.2)", borderRadius: 20, fontSize: 36, marginBottom: 20, backdropFilter: "blur(8px)" }}>
          🎙
        </div>
        <h1 style={{ fontSize: 44, fontWeight: 800, color: "#fff", margin: "0 0 14px", letterSpacing: "-1px", lineHeight: 1.1 }}>
          VoiceReader
        </h1>
        <p style={{ fontSize: 20, color: "rgba(255,255,255,.85)", margin: "0 auto 12px", maxWidth: 520, lineHeight: 1.5 }}>
          Turn any text on any webpage into natural audio — instantly.
        </p>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,.65)", margin: "0 0 36px" }}>
          Free Chrome Extension · Works on Chrome, Edge &amp; Brave
        </p>
        <a
          href="/voicereader-extension.zip"
          download="voicereader-extension.zip"
          style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            background: "#fff", color: "#6c5ce7",
            padding: "16px 32px", borderRadius: 50,
            fontWeight: 700, fontSize: 16, textDecoration: "none",
            boxShadow: "0 8px 32px rgba(0,0,0,.18)",
            transition: "transform .15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-2px)")}
          onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}
        >
          ⬇️ Download Extension (Free)
        </a>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,.5)", marginTop: 14 }}>
          No account required · No data collected · 100% local
        </p>
      </div>

      {/* ── INSTALL STEPS ── */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "64px 24px 0" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: "#9090a8", textTransform: "uppercase" }}>How to Install</span>
          <h2 style={{ fontSize: 30, fontWeight: 800, margin: "8px 0 0", color: "#1a1a2e" }}>Set up in 2 minutes</h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {steps.map(s => (
            <div key={s.n} style={{ display: "flex", gap: 18, background: "#fff", borderRadius: 14, padding: "20px 24px", border: "1px solid #ede8ff", boxShadow: "0 1px 4px rgba(108,92,231,.06)" }}>
              <div style={{ flexShrink: 0, width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,#6c5ce7,#a29bfe)", color: "#fff", fontWeight: 800, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {s.n}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: "#1a1a2e" }}>{s.title}</div>
                <div style={{ fontSize: 13.5, color: "#6e6e8a", lineHeight: 1.55 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* tip box */}
        <div style={{ background: "#f0eeff", border: "1px solid #d4ccff", borderRadius: 12, padding: "16px 20px", marginTop: 20, display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span style={{ fontSize: 20 }}>💡</span>
          <div>
            <strong style={{ fontSize: 13, color: "#5a4fcf" }}>Pro tip: </strong>
            <span style={{ fontSize: 13, color: "#6e6e8a" }}>After installing, select any text on a webpage, right-click, and choose <strong style={{ color: "#5a4fcf" }}>▶ Play with VoiceReader</strong> for instant playback — no need to open the popup.</span>
          </div>
        </div>
      </div>

      {/* ── FEATURES ── */}
      <div style={{ maxWidth: 920, margin: "0 auto", padding: "64px 24px 0" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: "#9090a8", textTransform: "uppercase" }}>Features</span>
          <h2 style={{ fontSize: 30, fontWeight: 800, margin: "8px 0 0", color: "#1a1a2e" }}>Everything you need</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {features.map(f => (
            <div key={f.title} style={{ background: "#fff", borderRadius: 14, padding: "22px 22px", border: "1px solid #ede8ff", boxShadow: "0 1px 4px rgba(108,92,231,.06)" }}>
              <div style={{ fontSize: 26, marginBottom: 10 }}>{f.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, color: "#1a1a2e" }}>{f.title}</div>
              <div style={{ fontSize: 13, color: "#6e6e8a", lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── VOICE QUALITY ── */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "64px 24px 0" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: "#9090a8", textTransform: "uppercase" }}>Voice Quality</span>
          <h2 style={{ fontSize: 30, fontWeight: 800, margin: "8px 0 0", color: "#1a1a2e" }}>Choose your sound</h2>
          <p style={{ fontSize: 15, color: "#9090a8", marginTop: 10 }}>Works free out of the box. Upgrade the voice quality with an API key.</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {voices.map((v, i) => (
            <div key={v.name} style={{ background: "#fff", borderRadius: 14, padding: "20px 24px", border: `1px solid ${v.border}`, display: "flex", gap: 18, alignItems: "center" }}>
              <div style={{ fontSize: 28, flexShrink: 0 }}>{v.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: "#1a1a2e" }}>{v.name}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 20, background: v.bg, color: v.color, border: `1px solid ${v.border}` }}>{v.quality}</span>
                  {i === 0 && <span style={{ fontSize: 11, color: "#10b981", fontWeight: 600 }}>✓ Free, no key needed</span>}
                  {i === 2 && <span style={{ fontSize: 11, color: "#10b981", fontWeight: 600 }}>✓ Free tier available</span>}
                </div>
                <div style={{ fontSize: 13, color: "#6e6e8a", lineHeight: 1.5 }}>{v.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ background: "#f0eeff", border: "1px solid #d4ccff", borderRadius: 12, padding: "16px 20px", marginTop: 16, fontSize: 13, color: "#6e6e8a", lineHeight: 1.6 }}>
          <strong style={{ color: "#5a4fcf" }}>To use OpenAI or ElevenLabs:</strong> After installing the extension, click the ⚙ settings icon in the popup, select your provider, and paste your API key. That's it.
        </div>
      </div>

      {/* ── CTA ── */}
      <div style={{ textAlign: "center", padding: "72px 24px 80px", maxWidth: 560, margin: "0 auto" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🎙</div>
        <h2 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 12px", color: "#1a1a2e" }}>Ready to listen?</h2>
        <p style={{ fontSize: 15, color: "#9090a8", margin: "0 0 28px", lineHeight: 1.6 }}>
          Download the extension and start turning any article, email, or document into audio in under 2 minutes.
        </p>
        <a
          href="/voicereader-extension.zip"
          download="voicereader-extension.zip"
          style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            background: "linear-gradient(135deg,#6c5ce7,#a29bfe)", color: "#fff",
            padding: "16px 32px", borderRadius: 50,
            fontWeight: 700, fontSize: 16, textDecoration: "none",
            boxShadow: "0 4px 20px rgba(108,92,231,.35)",
          }}
        >
          ⬇️ Download VoiceReader — It's Free
        </a>
        <p style={{ fontSize: 12, color: "#c0c0d0", marginTop: 16 }}>
          Beta · Share your feedback · Chrome / Edge / Brave
        </p>
      </div>

    </div>
  );
}
