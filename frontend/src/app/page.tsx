"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import IntroSequence from "./IntroSequence";

export default function LandingPage() {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    const hasSeenIntro = sessionStorage.getItem("solace_intro_seen");
    if (hasSeenIntro) {
      setShowIntro(false);
      setIsVisible(true);
    }
    const theme = localStorage.getItem("solace_theme");
    setIsDark(theme === "dark");
  }, []);

  const handleIntroComplete = () => {
    sessionStorage.setItem("solace_intro_seen", "true");
    setShowIntro(false);
    setTimeout(() => setIsVisible(true), 100);
  };

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "");
    localStorage.setItem("solace_theme", next ? "dark" : "light");
  };

  return (
    <>
      {showIntro && <IntroSequence onComplete={handleIntroComplete} />}
      <div className={styles.landing}>
      {/* Ambient background orbs */}
      <div className={styles.ambientOrbs}>
        <div className={styles.orb1} />
        <div className={styles.orb2} />
        <div className={styles.orb3} />
        <div className={styles.orb4} />
      </div>

      {/* Navigation */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>◯</span>
            <span className={styles.logoText}>Solace</span>
          </div>
          <div className={styles.navActions}>
            <button
              className="themeToggle"
              onClick={toggleTheme}
              aria-label="Toggle dark mode"
            >
              {isDark ? "☀️" : "🌙"}
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => router.push("/auth/login")}
            >
              Sign in
            </button>
            <button
              className="btn btn-primary"
              onClick={() => router.push("/auth/register")}
            >
              Get started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className={styles.hero}>
        <div className={`${styles.heroContent} ${isVisible ? styles.visible : ""}`}>
          <div className={styles.badge}>
            <span className={styles.badgeDot} />
            AI-powered emotional companion
          </div>

          <h1 className={`display ${styles.title}`}>
            Someone who
            <br />
            <em>actually</em> listens.
          </h1>

          <p className={`body-lg ${styles.subtitle}`}>
            Solace isn&apos;t another chatbot. It reads between the lines of what you say,
            remembers your world across conversations, and responds like someone who
            genuinely knows you.
          </p>

          <div className={styles.heroCTA}>
            <button
              className="btn btn-primary"
              style={{ padding: "18px 36px", fontSize: "1rem" }}
              onClick={() => router.push("/auth/register")}
            >
              Start a conversation
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <span className="body-sm" style={{ color: "var(--text-muted)" }}>
              Free. No credit card needed.
            </span>
          </div>
        </div>

        {/* Chat Preview */}
        <div className={`${styles.chatPreview} ${isVisible ? styles.visible : ""}`}>
          <div className={styles.previewWindow}>
            <div className={styles.previewHeader}>
              <div className={styles.previewDots}>
                <span /><span /><span />
              </div>
            </div>
            <div className={styles.previewMessages}>
              <div className={`${styles.previewMsg} ${styles.previewUser}`}>
                <p>I don&apos;t know, everything just feels heavy lately. Like I&apos;m carrying stuff that isn&apos;t even mine.</p>
              </div>
              <div className={`${styles.previewMsg} ${styles.previewAI}`}>
                <p>
                  That weight you&apos;re describing — the part that isn&apos;t even yours — that caught me.
                  You&apos;re holding onto other people&apos;s burdens on top of your own, and yet here you are,
                  still showing up. What&apos;s the heaviest thing that doesn&apos;t belong to you right now?
                </p>
                <span className={styles.cursor} />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className={styles.features}>
        <div className={styles.featuresInner}>
          <h2 className="heading-1 text-center" style={{ marginBottom: "var(--space-md)" }}>
            What makes Solace different
          </h2>
          <p className="body-lg text-center" style={{ maxWidth: "600px", margin: "0 auto var(--space-3xl)" }}>
            Every design decision serves one question: does this make the response
            feel more like a person who genuinely cares?
          </p>

          <div className={styles.featureGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🫧</div>
              <h3 className="heading-3">Reads between the lines</h3>
              <p className="body-sm">
                &quot;I&apos;m fine&quot; doesn&apos;t fool Solace. It detects deflection, minimization,
                and masked distress — the signals beneath what you say.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🧵</div>
              <h3 className="heading-3">Remembers your world</h3>
              <p className="body-sm">
                Come back tomorrow — Solace remembers your mom, that exam, the fight
                with Rahul. You never have to re-explain yourself.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🪶</div>
              <h3 className="heading-3">Never reads from a script</h3>
              <p className="body-sm">
                No &quot;I&apos;m here for you.&quot; No &quot;Have you tried meditation?&quot; Every response
                references something you actually said.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🌊</div>
              <h3 className="heading-3">Responds to your emotional state</h3>
              <p className="body-sm">
                The interface itself shifts with your mood — subtle ambient changes
                that create a space that feels like yours.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🛡️</div>
              <h3 className="heading-3">Safety-first, always</h3>
              <p className="body-sm">
                If things get heavy, Solace pivots — validating your feelings first,
                then gently surfacing professional resources.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>☀️</div>
              <h3 className="heading-3">Checks in on you</h3>
              <p className="body-sm">
                A personalized message each morning — not &quot;How are you?&quot; but something
                grounded in what you shared yesterday.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaInner}>
          <h2 className="heading-1">Ready to feel heard?</h2>
          <p className="body-lg" style={{ marginBottom: "var(--space-xl)" }}>
            Your first conversation is just a click away.
          </p>
          <button
            className="btn btn-primary"
            style={{ padding: "18px 40px", fontSize: "1.05rem" }}
            onClick={() => router.push("/auth/register")}
          >
            Begin your journey
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <p className="caption">
            Solace is an AI companion, not a replacement for professional mental health care.
            If you are in crisis, please contact your local emergency services.
          </p>
          <p className="caption" style={{ marginTop: "var(--space-sm)" }}>
            © 2026 Solace · Built with care
          </p>
        </div>
      </footer>
    </div>
    </>
  );
}
