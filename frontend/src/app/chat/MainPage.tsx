"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import styles from "./mainpage.module.css";
import HealingActivities from "./HealingActivities";
import LavaLampBg from "./LavaLampBg";

interface MainPageProps {
  userName: string;
  careStreak: number;
  sessionCount: number;
  onClose: () => void;
}

interface StatCard {
  icon: string;
  stat: string;
  description: string;
  source: string;
  color: string;
}

const STATS: StatCard[] = [
  {
    icon: "🧠",
    stat: "1 in 4",
    description: "people will experience a mental health issue in their lifetime",
    source: "World Health Organization",
    color: "#E6D9FF",
  },
  {
    icon: "💬",
    stat: "70%",
    description: "of people avoid seeking help due to stigma and fear of judgment",
    source: "Mental Health Foundation",
    color: "#FFD6C9",
  },
  {
    icon: "🌍",
    stat: "#1 cause",
    description: "Depression is the leading cause of disability worldwide",
    source: "WHO Global Health",
    color: "#F4B6C2",
  },
  {
    icon: "📱",
    stat: "Only 1 in 3",
    description: "people with anxiety disorders receive proper treatment",
    source: "Anxiety & Depression Association",
    color: "#B8D4C8",
  },
  {
    icon: "💛",
    stat: "50%",
    description: "of all mental health conditions begin by age 14",
    source: "UNICEF Mental Health Report",
    color: "#FFD6C9",
  },
  {
    icon: "🤝",
    stat: "80%",
    description: "of people who seek help for depression see improvement within 4-6 weeks",
    source: "National Institute of Mental Health",
    color: "#E6D9FF",
  },
];

const GENTLE_QUOTES = [
  "Healing is not linear. 🌱",
  "You are more than your hardest days.",
  "Rest is a form of resistance. 🤍",
  "Progress isn't always visible, but it's always there.",
];

export default function MainPage({ userName, careStreak, onClose, sessionCount }: MainPageProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const [quoteIndex, setQuoteIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  // Rotate gentle quotes
  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % GENTLE_QUOTES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Intersection observer for scroll-reveal animations
  const observerCallback = useCallback((entries: IntersectionObserverEntry[]) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute("data-section-id");
        if (id) {
          setVisibleSections((prev) => new Set([...prev, id]));
        }
      }
    });
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(observerCallback, {
      threshold: 0.15,
      rootMargin: "0px 0px -60px 0px",
      root: containerRef.current,
    });

    const sections = containerRef.current?.querySelectorAll("[data-section-id]");
    sections?.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, [isVisible, observerCallback]);

  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 500);
  };

  const isSectionVisible = (id: string) => visibleSections.has(id);

  return (
    <div
      className={`${styles.mainPage} ${isVisible ? styles.visible : ""} ${closing ? styles.closing : ""}`}
      ref={containerRef}
    >
      {/* Lava Lamp Background — shared with chat */}
      <LavaLampBg />

      {/* Sticky Back Button */}
      <button className={styles.backBtn} onClick={handleClose}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M13 8H3M7 4L3 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Back to chatting
      </button>

      {/* Hero */}
      <section className={styles.heroSection}>
        <div className={styles.heroContent}>
          <div className={styles.heroGlow} />
          <p className={styles.heroGreeting}>✦ Welcome back</p>
          <h1 className={styles.heroTitle}>
            <em>{userName || "friend"}</em>
          </h1>
          <p className={styles.heroSubtitle}>
            Your safe space. Your journey. Your pace.
          </p>
          <div className={styles.heroQuote} key={quoteIndex}>
            {GENTLE_QUOTES[quoteIndex]}
          </div>

          {/* Scroll indicator */}
          <div className={styles.scrollIndicator}>
            <div className={styles.scrollDot} />
          </div>
        </div>
      </section>

      {/* ─── Divider ─── */}
      <div className={styles.sectionDivider}>
        <div className={styles.dividerLine} />
        <span className={styles.dividerEmoji}>🌿</span>
        <div className={styles.dividerLine} />
      </div>

      {/* Journey Stats */}
      <section
        className={`${styles.journeySection} ${isSectionVisible("journey") ? styles.sectionRevealed : ""}`}
        data-section-id="journey"
      >
        <h2 className={styles.sectionTitle}>Your Journey</h2>
        <div className={styles.journeyGrid}>
          <div className={styles.journeyCard}>
            <div className={styles.journeyCardGlow} style={{ background: "rgba(255, 190, 160, 0.25)" }} />
            <span className={styles.journeyEmoji}>🌱</span>
            <div className={styles.journeyNumber}>{careStreak}</div>
            <div className={styles.journeyLabel}>day care streak</div>
          </div>
          <div className={styles.journeyCard}>
            <div className={styles.journeyCardGlow} style={{ background: "rgba(200, 175, 255, 0.25)" }} />
            <span className={styles.journeyEmoji}>💬</span>
            <div className={styles.journeyNumber}>{sessionCount}</div>
            <div className={styles.journeyLabel}>conversations held</div>
          </div>
          <div className={styles.journeyCard}>
            <div className={styles.journeyCardGlow} style={{ background: "rgba(160, 210, 185, 0.25)" }} />
            <span className={styles.journeyEmoji}>✨</span>
            <div className={styles.journeyNumber}>
              {careStreak >= 30 ? "🌸" : careStreak >= 14 ? "🌲" : careStreak >= 7 ? "🌳" : careStreak >= 3 ? "🌿" : "🌱"}
            </div>
            <div className={styles.journeyLabel}>
              {careStreak >= 30 ? "Full Bloom" : careStreak >= 14 ? "Tree" : careStreak >= 7 ? "Sapling" : careStreak >= 3 ? "Sprout" : "Seedling"}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Divider ─── */}
      <div className={styles.sectionDivider}>
        <div className={styles.dividerLine} />
        <span className={styles.dividerEmoji}>🌸</span>
        <div className={styles.dividerLine} />
      </div>

      {/* Micro Healing Activities */}
      <div
        className={`${styles.revealSection} ${isSectionVisible("healing") ? styles.sectionRevealed : ""}`}
        data-section-id="healing"
      >
        <HealingActivities />
      </div>

      {/* ─── Divider ─── */}
      <div className={styles.sectionDivider}>
        <div className={styles.dividerLine} />
        <span className={styles.dividerEmoji}>💜</span>
        <div className={styles.dividerLine} />
      </div>

      {/* Mental Health Awareness Stats */}
      <section
        className={`${styles.statsSection} ${isSectionVisible("stats") ? styles.sectionRevealed : ""}`}
        data-section-id="stats"
      >
        <h2 className={styles.sectionTitle}>Mental Health Matters</h2>
        <p className={styles.sectionSubtitle}>
          Understanding the landscape of mental health helps us break the stigma together.
        </p>
        <div className={styles.statsGrid}>
          {STATS.map((stat, i) => (
            <div
              key={i}
              className={`${styles.statCard} ${isSectionVisible("stats") ? styles.statVisible : ""}`}
              style={{
                "--card-color": stat.color,
                "--card-delay": `${i * 0.12}s`,
              } as React.CSSProperties}
            >
              <div className={styles.statCardGlow} style={{ background: stat.color }} />
              <div className={styles.statIcon}>{stat.icon}</div>
              <div className={styles.statNumber}>{stat.stat}</div>
              <p className={styles.statDesc}>{stat.description}</p>
              <span className={styles.statSource}>{stat.source}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Divider ─── */}
      <div className={styles.sectionDivider}>
        <div className={styles.dividerLine} />
        <span className={styles.dividerEmoji}>✨</span>
        <div className={styles.dividerLine} />
      </div>

      {/* Encouragement */}
      <section
        className={`${styles.encourageSection} ${isSectionVisible("encourage") ? styles.sectionRevealed : ""}`}
        data-section-id="encourage"
      >
        <div className={styles.encourageCard}>
          <div className={styles.encourageOrb} />
          <div className={styles.encourageOrb2} />
          <h2 className={styles.encourageTitle}>Every conversation is a step forward</h2>
          <p className={styles.encourageText}>
            You don&apos;t need to have it all figured out. Showing up — even when it&apos;s hard — is what matters most.
          </p>
          <button className={`btn btn-primary ${styles.encourageBtn}`} onClick={handleClose}>
            Continue your conversation
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </section>

      {/* Footer spacer */}
      <div className={styles.footerSpacer} />
    </div>
  );
}
