"use client";

import { useState, useEffect } from "react";
import styles from "./healingactivities.module.css";

interface Activity {
  id: string;
  emoji: string;
  title: string;
  description: string;
  completedMessage: string;
  accentColor: string;
}

const ACTIVITIES: Activity[] = [
  {
    id: "proud",
    emoji: "🏆",
    title: "Name 3 things you achieved that made you feel proud",
    description: "Big or small — they all count.",
    completedMessage: "You've accomplished so much! 💛",
    accentColor: "#FFD6C9",
  },
  {
    id: "water",
    emoji: "💧",
    title: "Drink water check",
    description: "Hydration is self-care. Take a sip!",
    completedMessage: "Your body thanks you! 🌊",
    accentColor: "#B8D4C8",
  },
  {
    id: "stretch",
    emoji: "🧘",
    title: "Stretch for 30 seconds",
    description: "Roll your shoulders, stretch your arms. You deserve it.",
    completedMessage: "Ahh, that feels better ✨",
    accentColor: "#E6D9FF",
  },
  {
    id: "beauty",
    emoji: "🌸",
    title: "Look at something beautiful around you",
    description: "A flower, the sky, a photo you love — soak it in.",
    completedMessage: "Beauty is everywhere 🌿",
    accentColor: "#F4B6C2",
  },
  {
    id: "kindness",
    emoji: "💌",
    title: "Send a kind message to someone",
    description: "A simple 'thinking of you' can make someone's day.",
    completedMessage: "Kindness ripples outward 💝",
    accentColor: "#FFD6C9",
  },
  {
    id: "gratitude",
    emoji: "✨",
    title: "Write down one thing you're grateful for",
    description: "Gratitude shifts our perspective gently.",
    completedMessage: "Gratitude opens doors 🌟",
    accentColor: "#E6D9FF",
  },
  {
    id: "breathe",
    emoji: "🌬️",
    title: "Take 3 deep breaths",
    description: "In through the nose, out through the mouth. Slowly.",
    completedMessage: "You just gave your mind a reset 🍃",
    accentColor: "#B8D4C8",
  },
  {
    id: "screen",
    emoji: "🌿",
    title: "Step away from the screen for a moment",
    description: "Even 30 seconds of looking away helps your eyes and mind.",
    completedMessage: "Welcome back, refreshed! 🌱",
    accentColor: "#F4B6C2",
  },
];

const STORAGE_KEY = "solace_healing_activities";

function getTodayKey(): string {
  return new Date().toISOString().split("T")[0];
}

function getCompletedToday(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return new Set();
    const parsed = JSON.parse(stored);
    if (parsed.date === getTodayKey()) {
      return new Set(parsed.completed as string[]);
    }
    return new Set();
  } catch {
    return new Set();
  }
}

function saveCompletedToday(completed: Set<string>) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      date: getTodayKey(),
      completed: Array.from(completed),
    })
  );
}

export default function HealingActivities() {
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [sparklingId, setSparklingId] = useState<string | null>(null);

  // Load from localStorage
  useEffect(() => {
    setCompleted(getCompletedToday());
  }, []);

  const toggleActivity = (id: string) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        // Trigger sparkle
        setSparklingId(id);
        setTimeout(() => setSparklingId(null), 900);
      }
      saveCompletedToday(next);
      return next;
    });
  };

  const resetAll = () => {
    setCompleted(new Set());
    saveCompletedToday(new Set());
  };

  const completedCount = completed.size;
  const totalCount = ACTIVITIES.length;
  const allDone = completedCount === totalCount;
  const progressPercent = (completedCount / totalCount) * 100;

  // Progress emoji
  const progressEmoji =
    completedCount === 0
      ? "🌑"
      : completedCount <= 2
      ? "🌱"
      : completedCount <= 4
      ? "🌿"
      : completedCount <= 6
      ? "🌳"
      : allDone
      ? "🌸"
      : "🌲";

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Micro Healing Activities</h2>
      <p className={styles.sectionSubtitle}>
        Small, gentle acts of self-care. No pressure — do what feels right.
      </p>

      {/* Progress */}
      <div className={styles.progressContainer}>
        <span className={styles.progressEmoji}>{progressEmoji}</span>
        <div className={styles.progressInfo}>
          <p className={styles.progressLabel}>
            {allDone
              ? "All activities completed! You're incredible 💛"
              : `${completedCount} of ${totalCount} activities today`}
          </p>
          <div className={styles.progressBarOuter}>
            <div
              className={styles.progressBarInner}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
        <span className={styles.progressCount}>
          {completedCount}/{totalCount}
        </span>
      </div>

      {/* Activity Cards */}
      <div className={styles.grid}>
        {ACTIVITIES.map((activity, i) => {
          const isDone = completed.has(activity.id);
          const isSparkling = sparklingId === activity.id;

          return (
            <div
              key={activity.id}
              className={`${styles.card} ${isDone ? styles.cardCompleted : ""}`}
              onClick={() => toggleActivity(activity.id)}
              style={
                {
                  "--card-accent": activity.accentColor,
                  animationDelay: `${i * 0.08}s`,
                } as React.CSSProperties
              }
              role="button"
              tabIndex={0}
              aria-pressed={isDone}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleActivity(activity.id);
                }
              }}
            >
              {/* Sparkle effect */}
              <div
                className={`${styles.sparkle} ${
                  isSparkling ? styles.sparkleActive : ""
                }`}
              />

              <div className={styles.cardHeader}>
                <span className={styles.cardEmoji}>{activity.emoji}</span>
                <div
                  className={`${styles.cardCheck} ${
                    isDone ? styles.cardCheckDone : ""
                  }`}
                >
                  {isDone && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M2.5 6L5 8.5L9.5 3.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
              </div>

              <p className={styles.cardTitle}>{activity.title}</p>
              <p className={styles.cardDesc}>
                {isDone ? activity.completedMessage : activity.description}
              </p>

              {isDone && (
                <span className={styles.cardCompletedLabel}>
                  ✓ Done — tap to undo
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* All done celebration */}
      {allDone && (
        <div className={styles.allDone}>
          <span className={styles.allDoneEmoji}>🎉</span>
          <p className={styles.allDoneText}>
            You took care of yourself today. That takes courage and kindness.
          </p>
        </div>
      )}

      {/* Reset button (only show if some completed) */}
      {completedCount > 0 && (
        <button className={styles.resetBtn} onClick={resetAll}>
          Reset today&apos;s activities
        </button>
      )}
    </section>
  );
}
