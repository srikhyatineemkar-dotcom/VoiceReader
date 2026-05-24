import { useEffect, useRef, useState } from "react";

function WaveBar({ delay }: { delay: number }) {
  return (
    <div style={{
      width: 4, borderRadius: 4,
      background: "linear-gradient(to top, #6c5ce7, #a29bfe)",
      animation: `wave 1.2s ease-in-out ${delay}s infinite alternate`,
    }} />
  );
}

function Orb({ x, y, size, color, blur }: { x: string; y: string; size: number; color: string; blur: number }) {
  return (
    <div style={{
      position: "absolute", left: x, top: y,
      width: size, height: size, borderRadius: "50%",
      background: color, filter: `blur(${blur}px)`,
      opacity: 0.35, pointerEvents: "none",
    }} />
  );
}

function StepCard({ n, title, desc }: { n: string; title: string; desc: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", gap: 18, alignItems: "flex-start",
        background: hovered ? "rgba(108,92,231,0.12)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${hovered ? "rgba(108,92,231,0.5)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 16, padding: "20px 24px",
        transition: "all 0.2s", cursor: "default",
        backdropFilter: "blur(12px)",
      }}
    >
      <div style={{
        flexShrink: 0, width: 40, height: 40, borderRadius: "50%",
        background: "linear-gradient(135deg,#6c5ce7,#a29bfe)",
        color: "#fff", fontWeight: 800, fontSize: 16,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 0 16px rgba(108,92,231,0.5)",
      }}>{n}</div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 5, color: "#f0eeff" }}>{title}</div>
        <div style={{ fontSize: 13.5, color: "#9090c8", lineHeight: 1.6 }}>{desc}</div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "rgba(108,92,231,0.15)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${hovered ? "rgba(162,155,254,0.4)" : "rgba(255,255,255,0.07)"}`,
        borderRadius: 18, padding: "24px 22px",
        transition: "all 0.2s", cursor: "default",
        backdropFilter: "blur(12px)",
        transform: hovered ? "translateY(-4px)" : "none",
      }}
    >
      <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 7, color: "#f0eeff" }}>{title}</div>
      <div style={{ fontSize: 13, color: "#8080b0", lineHeight: 1.65 }}>{desc}</div>
    </div>
  );
}

function VoiceRow({ icon, name, badge, badgeColor, desc, tags }: {
  icon: string; name: string; badge: string; badgeColor: string; desc: string; tags: string[];
}) {
  return (
    <div style={{
      display: "flex", gap: 18, alignItems: "center",
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 16, padding: "20px 24px",
      backdropFilter: "blur(12px)",
    }}>
      <div style={{ fontSize: 32, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: "#f0eeff" }}>{name}</span>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
            background: badgeColor, color: "#fff", letterSpacing: 0.3,
          }}>{badge}</span>
          {tags.map(t => (
            <span key={t} style={{ fontSize: 11, color: "#10b981", fontWeight: 600 }}>✓ {t}</span>
          ))}
        </div>
        <div style={{ fontSize: 13, color: "#8080b0", lineHeight: 1.55 }}>{desc}</div>
      </div>
    </div>
  );
}

export default function App() {
  const waveRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes wave {
        from { height: 8px; }
        to   { height: 40px; }
      }
      @keyframes float {
        0%,100% { transform: translateY(0px); }
        50%      { transform: translateY(-12px); }
      }
      @keyframes pulse-ring {
        0%   { box-shadow: 0 0 0 0 rgba(108,92,231,0.5); }
        70%  { box-shadow: 0 0 0 18px rgba(108,92,231,0); }
        100% { box-shadow: 0 0 0 0 rgba(108,92,231,0); }
      }
      @keyframes shimmer {
        0%   { background-position: -200% center; }
        100% { background-position: 200% center; }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const steps = [
    { n: "1", title: "Download the ZIP", desc: "Click the download button above to save voicereader-extension.zip to your computer." },
    { n: "2", title: "Extract the folder", desc: 'Right-click the ZIP → "Extract All" on Windows, or double-click on Mac. You\'ll get an extension/ folder.' },
    { n: "3", title: "Open Chrome Extensions", desc: 'Type chrome://extensions in your address bar. Also works on Edge and Brave.' },
    { n: "4", title: "Enable Developer Mode", desc: "Toggle the \"Developer Mode\" switch in the top-right corner of the Extensions page." },
    { n: "5", title: "Load Unpacked", desc: 'Click "Load unpacked", select the extracted folder. VoiceReader appears in your toolbar instantly.' },
  ];

  const features = [
    { icon: "🖱️", title: "Right-Click Instant Play", desc: "Select text anywhere, right-click, choose Play — audio starts in under a second. No popup needed." },
    { icon: "🎙️", title: "5 Tone Modes", desc: "Natural, Podcast, Calm, Professor, or News Anchor. Each reshapes pace, pitch and rhythm to fit the content." },
    { icon: "👥", title: "Live Voice Switching", desc: "Switch male ↔ female or change tone mid-playback. It restarts from the exact sentence you're on." },
    { icon: "⚡", title: "Instant Speed Control", desc: "Drag from 0.75× to 2× — speed updates in real-time without any interruption to the audio." },
    { icon: "⏸️", title: "Full Playback Controls", desc: "Pause, resume, skip sentences, replay, and stop — all from the lightweight popup." },
    { icon: "🔑", title: "Human-Quality API Voices", desc: "Drop in an OpenAI or ElevenLabs key for voices indistinguishable from a real podcast host." },
  ];

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", background: "#0d0b1e", color: "#f0eeff", minHeight: "100vh", overflowX: "hidden" }}>

      {/* ── HERO ── */}
      <div style={{ position: "relative", padding: "100px 24px 110px", textAlign: "center", overflow: "hidden" }}>
        {/* Background orbs */}
        <Orb x="5%" y="10%" size={400} color="radial-gradient(circle,#6c5ce7,transparent)" blur={80} />
        <Orb x="70%" y="5%" size={300} color="radial-gradient(circle,#a29bfe,transparent)" blur={80} />
        <Orb x="40%" y="60%" size={350} color="radial-gradient(circle,#4c3f99,transparent)" blur={90} />

        {/* Grid overlay */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: "linear-gradient(rgba(108,92,231,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(108,92,231,0.06) 1px,transparent 1px)",
          backgroundSize: "50px 50px",
        }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Floating logo */}
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 88, height: 88,
            background: "linear-gradient(135deg,#6c5ce7,#a29bfe)",
            borderRadius: 28, fontSize: 44, marginBottom: 28,
            boxShadow: "0 0 60px rgba(108,92,231,0.6)",
            animation: "float 3s ease-in-out infinite, pulse-ring 2.5s ease-out infinite",
          }}>🎙</div>

          {/* Badge */}
          <div style={{
            display: "inline-block", marginBottom: 20,
            padding: "6px 16px", borderRadius: 50,
            border: "1px solid rgba(162,155,254,0.4)",
            background: "rgba(108,92,231,0.15)",
            fontSize: 12, fontWeight: 600, color: "#a29bfe",
            backdropFilter: "blur(10px)", letterSpacing: 0.5,
          }}>✦ Free Chrome Extension · Beta</div>

          <h1 style={{
            fontSize: "clamp(42px, 7vw, 72px)", fontWeight: 900,
            margin: "0 0 18px", lineHeight: 1.08, letterSpacing: "-2px",
            background: "linear-gradient(135deg, #ffffff 0%, #c4b5fd 50%, #a29bfe 100%)",
            backgroundSize: "200% auto",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            animation: "shimmer 4s linear infinite",
          }}>
            Turn Text<br />Into Voice
          </h1>

          <p style={{ fontSize: 19, color: "#8080b0", margin: "0 auto 14px", maxWidth: 500, lineHeight: 1.6 }}>
            Select any text on any webpage. Right-click. Hear it instantly.<br />Human-quality voices. Zero setup.
          </p>

          {/* Waveform visual */}
          <div ref={waveRef} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, height: 50, margin: "24px auto" }}>
            {[0, 0.1, 0.2, 0.05, 0.15, 0.3, 0.1, 0.2, 0.0, 0.25, 0.15, 0.05, 0.2, 0.1, 0.3].map((d, i) => (
              <WaveBar key={i} delay={d} />
            ))}
          </div>

          <a
            href="/voicereader-extension.zip"
            download="voicereader-extension.zip"
            style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              background: "linear-gradient(135deg,#6c5ce7,#8b7fe8)",
              color: "#fff", padding: "18px 38px", borderRadius: 50,
              fontWeight: 700, fontSize: 17, textDecoration: "none",
              boxShadow: "0 0 40px rgba(108,92,231,0.5), 0 4px 20px rgba(0,0,0,0.4)",
              border: "1px solid rgba(162,155,254,0.4)",
              transition: "transform .15s, box-shadow .15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 0 60px rgba(108,92,231,0.7), 0 8px 30px rgba(0,0,0,0.4)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 0 40px rgba(108,92,231,0.5), 0 4px 20px rgba(0,0,0,0.4)"; }}
          >
            ⬇ Download — It's Free
          </a>

          <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 18, flexWrap: "wrap" }}>
            {["✓ No account needed", "✓ No data collected", "✓ Chrome · Edge · Brave"].map(t => (
              <span key={t} style={{ fontSize: 13, color: "#5050a0" }}>{t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── EXTENSION MOCKUP VISUAL ── */}
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "0 24px 80px", textAlign: "center" }}>
        <div style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 24, padding: "32px",
          backdropFilter: "blur(20px)",
          boxShadow: "0 20px 80px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}>
          {/* Browser chrome */}
          <div style={{ background: "#1a1830", borderRadius: 14, overflow: "hidden", boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}>
            <div style={{ background: "#12101f", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex", gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ff5f57" }} />
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#febc2e" }} />
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#28c840" }} />
              </div>
              <div style={{ flex: 1, background: "#0d0b1e", borderRadius: 8, padding: "6px 14px", fontSize: 12, color: "#5050a0", textAlign: "left" }}>
                🔒 medium.com/article/how-ai-is-changing-everything
              </div>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#6c5ce7,#a29bfe)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🎙</div>
            </div>
            <div style={{ padding: "28px 32px", textAlign: "left", background: "#0f0d1f" }}>
              <div style={{ fontSize: 11, color: "#5050a0", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>Medium · 8 min read</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#e8e0ff", marginBottom: 12, lineHeight: 1.3 }}>How AI is Changing the Way We Read</div>

              {/* Highlighted text with context menu */}
              <div style={{ position: "relative", display: "inline" }}>
                <span style={{ background: "rgba(108,92,231,0.35)", borderRadius: 3, padding: "2px 0", fontSize: 14, color: "#c4b5fd", lineHeight: 2 }}>
                  Large language models are reshaping how humans interact with written content, making text more accessible than ever before through multimodal interfaces.
                </span>

                {/* Context menu popup */}
                <div style={{
                  position: "absolute", top: "calc(100% + 6px)", left: 0,
                  background: "#1e1b3a", border: "1px solid rgba(108,92,231,0.4)",
                  borderRadius: 10, padding: "6px", boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                  zIndex: 10, whiteSpace: "nowrap",
                }}>
                  {["Copy", "Search Google", "Inspect"].map(item => (
                    <div key={item} style={{ padding: "7px 14px", fontSize: 13, color: "#8080b0", borderRadius: 6 }}>{item}</div>
                  ))}
                  <div style={{ height: 1, background: "rgba(108,92,231,0.2)", margin: "4px 0" }} />
                  <div style={{
                    padding: "7px 14px", fontSize: 13, fontWeight: 700,
                    color: "#a29bfe", borderRadius: 6,
                    background: "rgba(108,92,231,0.15)",
                    display: "flex", alignItems: "center", gap: 8,
                  }}>
                    ▶ Play with VoiceReader
                  </div>
                </div>
              </div>

              <div style={{ height: 80 }} />
              <div style={{ fontSize: 14, color: "#4040680", lineHeight: 2, color: "#404068" }}>
                These systems leverage transformer architectures to understand and generate human language with remarkable fluency...
              </div>
            </div>
          </div>

          {/* Popup mockup floating */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: -80, marginRight: 20, position: "relative", zIndex: 10 }}>
            <div style={{
              width: 200, background: "#1a1830",
              border: "1px solid rgba(108,92,231,0.3)",
              borderRadius: 14, padding: "14px",
              boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 22, height: 22, background: "linear-gradient(135deg,#6c5ce7,#a29bfe)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>🎙</div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#c4b5fd" }}>VoiceReader</span>
                <span style={{ marginLeft: "auto", fontSize: 9, background: "#10b981", color: "#fff", padding: "2px 7px", borderRadius: 20, fontWeight: 700 }}>LIVE</span>
              </div>
              <div style={{ fontSize: 9, color: "#5050a0", marginBottom: 4 }}>NOW READING</div>
              <div style={{ fontSize: 10, color: "#8080b0", lineHeight: 1.5, marginBottom: 12 }}>Large language models are reshaping...</div>
              <div style={{ height: 3, background: "rgba(255,255,255,0.1)", borderRadius: 3, marginBottom: 12, overflow: "hidden" }}>
                <div style={{ width: "45%", height: "100%", background: "linear-gradient(90deg,#6c5ce7,#a29bfe)" }} />
              </div>
              <div style={{ display: "flex", gap: 5, justifyContent: "center" }}>
                {["↩", "⏹", "⏸", "⏭"].map(btn => (
                  <div key={btn} style={{ width: 28, height: 28, borderRadius: 7, background: btn === "⏹" ? "linear-gradient(135deg,#6c5ce7,#a29bfe)" : "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: btn === "⏹" ? "#fff" : "#8080b0" }}>{btn}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── HOW TO INSTALL ── */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 24px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "#6c5ce7", textTransform: "uppercase", marginBottom: 10 }}>Installation</div>
          <h2 style={{ fontSize: 34, fontWeight: 800, margin: 0, letterSpacing: "-0.5px" }}>Set up in 2 minutes</h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {steps.map(s => <StepCard key={s.n} {...s} />)}
        </div>
        <div style={{
          marginTop: 20, padding: "16px 20px",
          background: "rgba(108,92,231,0.1)", border: "1px solid rgba(108,92,231,0.25)",
          borderRadius: 14, display: "flex", gap: 12, alignItems: "flex-start",
        }}>
          <span style={{ fontSize: 20 }}>💡</span>
          <div style={{ fontSize: 13, color: "#8080b0", lineHeight: 1.6 }}>
            <strong style={{ color: "#a29bfe" }}>Pro tip:</strong> Select any text, right-click, and choose <strong style={{ color: "#a29bfe" }}>▶ Play with VoiceReader</strong> — audio starts instantly without opening the popup.
          </div>
        </div>
      </div>

      {/* ── FEATURES ── */}
      <div style={{ maxWidth: 920, margin: "0 auto", padding: "0 24px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "#6c5ce7", textTransform: "uppercase", marginBottom: 10 }}>Features</div>
          <h2 style={{ fontSize: 34, fontWeight: 800, margin: 0, letterSpacing: "-0.5px" }}>Everything you need</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12 }}>
          {features.map(f => <FeatureCard key={f.title} {...f} />)}
        </div>
      </div>

      {/* ── VOICE QUALITY ── */}
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 24px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "#6c5ce7", textTransform: "uppercase", marginBottom: 10 }}>Voice Quality</div>
          <h2 style={{ fontSize: 34, fontWeight: 800, margin: "0 0 10px", letterSpacing: "-0.5px" }}>Choose your sound</h2>
          <p style={{ fontSize: 15, color: "#5050a0", margin: 0 }}>Works free out of the box. Add an API key for human-quality voices.</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <VoiceRow icon="🌐" name="Browser" badge="Basic · Free" badgeColor="#4b5563" desc="Uses your system's built-in TTS. Works offline and costs nothing — but sounds robotic." tags={["No setup needed"]} />
          <VoiceRow icon="⚡" name="OpenAI" badge="Very Natural" badgeColor="#2563eb" desc="6 expressive voices (Nova, Shimmer, Echo, Onyx, Alloy, Fable). ~$0.015 per 1,000 characters. Sounds like a real person." tags={["Recommended"]} />
          <VoiceRow icon="🎭" name="ElevenLabs" badge="Most Realistic" badgeColor="#6c5ce7" desc="The most human-sounding voices available. Free tier includes 10,000 characters per month." tags={["Free tier available"]} />
        </div>
        <div style={{ marginTop: 14, padding: "14px 18px", background: "rgba(108,92,231,0.08)", border: "1px solid rgba(108,92,231,0.2)", borderRadius: 12, fontSize: 13, color: "#6060a0", lineHeight: 1.6 }}>
          <strong style={{ color: "#a29bfe" }}>To switch provider:</strong> Click the ⚙ icon in the extension popup → Settings → choose your provider → paste your API key → Save.
        </div>
      </div>

      {/* ── BOTTOM CTA ── */}
      <div style={{ position: "relative", textAlign: "center", padding: "80px 24px 100px", overflow: "hidden" }}>
        <Orb x="20%" y="20%" size={350} color="radial-gradient(circle,#6c5ce7,transparent)" blur={80} />
        <Orb x="60%" y="30%" size={280} color="radial-gradient(circle,#a29bfe,transparent)" blur={80} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 52, marginBottom: 16, animation: "float 3s ease-in-out infinite" }}>🎙</div>
          <h2 style={{ fontSize: 36, fontWeight: 900, margin: "0 0 14px", letterSpacing: "-1px" }}>
            Start listening today
          </h2>
          <p style={{ fontSize: 16, color: "#5050a0", margin: "0 auto 32px", maxWidth: 420, lineHeight: 1.6 }}>
            Any article. Any email. Any doc. Turn it into audio in seconds.
          </p>
          <a
            href="/voicereader-extension.zip"
            download="voicereader-extension.zip"
            style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              background: "linear-gradient(135deg,#6c5ce7,#a29bfe)",
              color: "#fff", padding: "18px 40px", borderRadius: 50,
              fontWeight: 700, fontSize: 17, textDecoration: "none",
              boxShadow: "0 0 50px rgba(108,92,231,0.6)",
              border: "1px solid rgba(162,155,254,0.3)",
            }}
          >
            ⬇ Download VoiceReader — Free
          </a>
          <p style={{ fontSize: 12, color: "#303058", marginTop: 16 }}>
            Beta release · Chrome · Edge · Brave
          </p>
        </div>
      </div>

    </div>
  );
}
