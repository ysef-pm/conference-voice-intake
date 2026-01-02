"use client";

import Link from "next/link";

export default function LandingPage() {
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

      {/* Header */}
      <header
        style={{
          position: "relative",
          zIndex: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "24px 48px",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, var(--pink-500) 0%, var(--pink-400) 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="white" strokeWidth="2" fill="none" />
              <line x1="12" y1="19" x2="12" y2="23" stroke="white" strokeWidth="2" />
              <line x1="8" y1="23" x2="16" y2="23" stroke="white" strokeWidth="2" />
            </svg>
          </div>
          <span style={{ fontSize: "20px", fontWeight: 700, color: "white" }}>Matchys</span>
        </div>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <Link
            href="/login"
            style={{
              padding: "10px 20px",
              color: "var(--text-secondary)",
              fontSize: "14px",
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            Log in
          </Link>
          <Link
            href="/signup"
            style={{
              padding: "10px 24px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, var(--pink-500) 0%, var(--pink-600) 100%)",
              color: "white",
              fontSize: "14px",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main
        style={{
          position: "relative",
          zIndex: 10,
          maxWidth: "1000px",
          margin: "0 auto",
          padding: "80px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        {/* Badge */}
        <div
          style={{
            padding: "8px 16px",
            borderRadius: "100px",
            background: "rgba(236, 72, 153, 0.1)",
            border: "1px solid rgba(236, 72, 153, 0.2)",
            marginBottom: "24px",
          }}
        >
          <span style={{ fontSize: "13px", color: "var(--pink-400)", fontWeight: 500 }}>
            AI-Powered Conference Networking
          </span>
        </div>

        {/* Headline */}
        <h1
          style={{
            fontSize: "clamp(40px, 7vw, 64px)",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
            marginBottom: "24px",
            background: "linear-gradient(180deg, #FFFFFF 0%, #94a3b8 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Turn Conference Attendees into Meaningful Connections
        </h1>

        {/* Subheadline */}
        <p
          style={{
            fontSize: "20px",
            lineHeight: 1.6,
            color: "var(--text-secondary)",
            maxWidth: "600px",
            marginBottom: "48px",
          }}
        >
          Use AI voice conversations to understand your attendees, then match them with the right people. No more awkward mingling.
        </p>

        {/* CTA Buttons */}
        <div style={{ display: "flex", gap: "16px", marginBottom: "80px" }}>
          <Link
            href="/signup"
            style={{
              padding: "16px 32px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, var(--pink-500) 0%, var(--pink-600) 100%)",
              color: "white",
              fontSize: "16px",
              fontWeight: 600,
              textDecoration: "none",
              boxShadow: "0 0 40px var(--accent-glow)",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
          >
            Start Free Trial
          </Link>
          <Link
            href="#how-it-works"
            style={{
              padding: "16px 32px",
              borderRadius: "12px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "var(--text-secondary)",
              fontSize: "16px",
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            See How It Works
          </Link>
        </div>

        {/* How It Works */}
        <div id="how-it-works" style={{ width: "100%", marginBottom: "80px" }}>
          <h2
            style={{
              fontSize: "32px",
              fontWeight: 600,
              color: "white",
              marginBottom: "48px",
            }}
          >
            How It Works
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "24px",
            }}
          >
            {[
              {
                step: "1",
                title: "Create Your Event",
                description: "Set up your conference and import your attendee list via CSV",
              },
              {
                step: "2",
                title: "AI Conversations",
                description: "Attendees have a quick voice or chat conversation with our AI to share their goals",
              },
              {
                step: "3",
                title: "Smart Matching",
                description: "Our AI analyzes responses and suggests meaningful connections between attendees",
              },
            ].map((item) => (
              <div
                key={item.step}
                style={{
                  padding: "32px",
                  borderRadius: "16px",
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, var(--pink-500) 0%, var(--pink-600) 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "16px",
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "white",
                  }}
                >
                  {item.step}
                </div>
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: 600,
                    color: "white",
                    marginBottom: "8px",
                  }}
                >
                  {item.title}
                </h3>
                <p style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.6 }}>
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div style={{ width: "100%", marginBottom: "80px" }}>
          <h2
            style={{
              fontSize: "32px",
              fontWeight: 600,
              color: "white",
              marginBottom: "48px",
            }}
          >
            Everything You Need
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "16px",
            }}
          >
            {[
              { icon: "📧", title: "Email Outreach", desc: "Send personalized intake invitations" },
              { icon: "🎤", title: "Voice & Chat", desc: "Attendees choose their preferred mode" },
              { icon: "📊", title: "Analytics", desc: "Track completion rates and insights" },
              { icon: "🤝", title: "AI Matching", desc: "Intelligent attendee pairing" },
              { icon: "📅", title: "Scheduling", desc: "Let attendees choose when to respond" },
              { icon: "📋", title: "CSV Import", desc: "Easy bulk attendee upload" },
            ].map((feature) => (
              <div
                key={feature.title}
                style={{
                  padding: "20px",
                  borderRadius: "12px",
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                }}
              >
                <span style={{ fontSize: "24px" }}>{feature.icon}</span>
                <div>
                  <h4 style={{ fontSize: "14px", fontWeight: 600, color: "white", marginBottom: "4px" }}>
                    {feature.title}
                  </h4>
                  <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div
          style={{
            padding: "48px",
            borderRadius: "24px",
            background: "linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(236, 72, 153, 0.05) 100%)",
            border: "1px solid rgba(236, 72, 153, 0.2)",
            width: "100%",
            textAlign: "center",
          }}
        >
          <h2
            style={{
              fontSize: "28px",
              fontWeight: 600,
              color: "white",
              marginBottom: "16px",
            }}
          >
            Ready to Transform Your Conference?
          </h2>
          <p
            style={{
              fontSize: "16px",
              color: "var(--text-secondary)",
              marginBottom: "24px",
              maxWidth: "500px",
              margin: "0 auto 24px",
            }}
          >
            Start collecting attendee insights and creating meaningful matches today.
          </p>
          <Link
            href="/signup"
            style={{
              display: "inline-block",
              padding: "16px 48px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, var(--pink-500) 0%, var(--pink-600) 100%)",
              color: "white",
              fontSize: "16px",
              fontWeight: 600,
              textDecoration: "none",
              boxShadow: "0 0 40px var(--accent-glow)",
            }}
          >
            Get Started Free
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          position: "relative",
          zIndex: 10,
          padding: "24px 48px",
          borderTop: "1px solid rgba(255, 255, 255, 0.06)",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
          Built by Matchys
        </p>
      </footer>
    </div>
  );
}
