"use client";

import Link from "next/link";

export default function WelcomePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #0a0a12 0%, #0f0f1a 50%, #0a0a12 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "800px",
          height: "600px",
          background: "radial-gradient(ellipse, rgba(236, 72, 153, 0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Content */}
      <main
        style={{
          position: "relative",
          zIndex: 10,
          maxWidth: "800px",
          margin: "0 auto",
          padding: "0 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          textAlign: "center",
        }}
      >
        {/* Logo */}
        <div
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "24px",
            background: "linear-gradient(135deg, var(--pink-500) 0%, var(--pink-400) 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "32px",
            boxShadow: "0 0 60px var(--accent-glow)",
          }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="white">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="white" strokeWidth="2" fill="none" />
            <line x1="12" y1="19" x2="12" y2="23" stroke="white" strokeWidth="2" />
            <line x1="8" y1="23" x2="16" y2="23" stroke="white" strokeWidth="2" />
          </svg>
        </div>

        {/* Headline */}
        <h1
          style={{
            fontSize: "clamp(36px, 6vw, 56px)",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
            marginBottom: "24px",
            background: "linear-gradient(180deg, #FFFFFF 0%, #94a3b8 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Welcome to the Conference
        </h1>

        {/* Subheadline */}
        <p
          style={{
            fontSize: "18px",
            lineHeight: 1.6,
            color: "var(--text-secondary)",
            maxWidth: "500px",
            marginBottom: "16px",
          }}
        >
          We&apos;d love to learn a bit about you! Answer 3 quick questions through a natural voice conversation.
        </p>

        {/* What to expect */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            marginBottom: "48px",
            padding: "24px",
            borderRadius: "16px",
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <p style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "8px" }}>
            You&apos;ll be asked about:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", textAlign: "left" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ color: "var(--pink-400)" }}>1.</span>
              <span style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Why you&apos;re joining the conference</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ color: "var(--pink-400)" }}>2.</span>
              <span style={{ color: "var(--text-secondary)", fontSize: "14px" }}>A bit about yourself and what you do</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ color: "var(--pink-400)" }}>3.</span>
              <span style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Your biggest challenges to discuss</span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <Link
          href="/conversation"
          style={{
            padding: "16px 48px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, var(--pink-500) 0%, var(--pink-600) 100%)",
            color: "white",
            fontSize: "16px",
            fontWeight: 600,
            textDecoration: "none",
            boxShadow: "0 0 40px var(--accent-glow)",
            transition: "transform 0.2s, box-shadow 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.02)";
            e.currentTarget.style.boxShadow = "0 0 60px var(--accent-glow)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "0 0 40px var(--accent-glow)";
          }}
        >
          Get Started
        </Link>

        {/* Time estimate */}
        <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "16px" }}>
          Takes about 2-3 minutes
        </p>
      </main>
    </div>
  );
}
