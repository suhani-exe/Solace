"use client";

import { useState, useEffect, useRef } from "react";
import styles from "./mainpage.module.css";

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

export default function MainPage({ userName, careStreak, onClose, sessionCount }: MainPageProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [visibleCards, setVisibleCards] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  // Intersection observer for card animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute("data-index") || "0");
            setVisibleCards((prev) => new Set([...prev, index]));
          }
        });
      },
      { threshold: 0.2, root: containerRef.current }
    );

    const cards = document.querySelectorAll("[data-stat-card]");
    cards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, [isVisible]);

  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 500);
  };

  return (
    <div
      className={`${styles.mainPage} ${isVisible ? styles.visible : ""} ${closing ? styles.closing : ""}`}
      ref={containerRef}
    >
      {/* Decorative Orbs */}
      <div className={styles.bgOrbs}>
        <div className={styles.bgOrb1} />
        <div className={styles.bgOrb2} />
        <div className={styles.bgOrb3} />
      </div>

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
          <h1 className={styles.heroTitle}>
            Welcome back, <em>{userName || "friend"}</em>
          </h1>
          <p className={styles.heroSubtitle}>
            Your safe space. Your journey. Your pace.
          </p>
        </div>
      </section>

      {/* Journey Stats */}
      <section className={styles.journeySection}>
        <h2 className={styles.sectionTitle}>Your Journey</h2>
        <div className={styles.journeyGrid}>
          <div className={styles.journeyCard}>
            <span className={styles.journeyEmoji}>🌱</span>
            <div className={styles.journeyNumber}>{careStreak}</div>
            <div className={styles.journeyLabel}>day care streak</div>
          </div>
          <div className={styles.journeyCard}>
            <span className={styles.journeyEmoji}>💬</span>
            <div className={styles.journeyNumber}>{sessionCount}</div>
            <div className={styles.journeyLabel}>conversations held</div>
          </div>
          <div className={styles.journeyCard}>
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

      {/* Mental Health Awareness Stats */}
      <section className={styles.statsSection}>
        <h2 className={styles.sectionTitle}>Mental Health Matters</h2>
        <p className={styles.sectionSubtitle}>
          Understanding the landscape of mental health helps us break the stigma together.
        </p>
        <div className={styles.statsGrid}>
          {STATS.map((stat, i) => (
            <div
              key={i}
              data-stat-card
              data-index={i}
              className={`${styles.statCard} ${visibleCards.has(i) ? styles.statVisible : ""}`}
              style={{
                "--card-color": stat.color,
                "--card-delay": `${i * 0.1}s`,
              } as React.CSSProperties}
            >
              <div className={styles.statIcon}>{stat.icon}</div>
              <div className={styles.statNumber}>{stat.stat}</div>
              <p className={styles.statDesc}>{stat.description}</p>
              <span className={styles.statSource}>{stat.source}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Encouragement */}
      <section className={styles.encourageSection}>
        <div className={styles.encourageCard}>
          <div className={styles.encourageOrb} />
          <h2 className={styles.encourageTitle}>Every conversation is a step forward</h2>
          <p className={styles.encourageText}>
            You don't need to have it all figured out. Showing up — even when it's hard — is what matters most.
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
