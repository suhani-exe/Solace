"use client";

import { useState, useEffect } from "react";
import { getMoodHistory } from "@/lib/api";
import styles from "./moodhistory.module.css";

interface MoodRecord {
  date: string;
  mood: string;
}

const MOOD_DISPLAY: Record<string, { emoji: string; label: string; color: string }> = {
  wonderful: { emoji: "😁", label: "Wonderful", color: "#8ED4A0" },
  good: { emoji: "😊", label: "Good", color: "#B8D4C8" },
  okay: { emoji: "🙂", label: "Okay", color: "#FFD6C9" },
  meh: { emoji: "😐", label: "Meh", color: "#E6D9FF" },
  struggling: { emoji: "😣", label: "Struggling", color: "#F4B6C2" },
  rough: { emoji: "😖", label: "Rough", color: "#E8A0B4" },
};

interface MoodHistoryProps {
  onClose: () => void;
}

export default function MoodHistory({ onClose }: MoodHistoryProps) {
  const [moods, setMoods] = useState<MoodRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await getMoodHistory(30);
      setMoods(data.moods);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  // Generate last 30 days for the grid
  const generateDays = () => {
    const days = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const mood = moods.find((m) => m.date === dateStr);
      days.push({
        date: dateStr,
        dayNum: date.getDate(),
        dayName: date.toLocaleDateString(undefined, { weekday: "short" }),
        month: date.toLocaleDateString(undefined, { month: "short" }),
        mood: mood?.mood || null,
        isToday: i === 0,
      });
    }
    return days;
  };

  const days = generateDays();

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.panelHeader}>
          <h3 className={styles.panelTitle}>Your Mood Journal</h3>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close mood history">
            ✕
          </button>
        </div>

        <p className={styles.panelSubtitle}>Last 30 days</p>

        {loading ? (
          <div className={styles.loading}>
            <div className={styles.loadingDot} />
            <div className={styles.loadingDot} />
            <div className={styles.loadingDot} />
          </div>
        ) : moods.length === 0 ? (
          <div className={styles.empty}>
            <p>No mood entries yet. Check in tomorrow! 🌱</p>
          </div>
        ) : (
          <>
            {/* Mood Timeline */}
            <div className={styles.timeline}>
              {days.map((day, i) => {
                const moodInfo = day.mood ? MOOD_DISPLAY[day.mood] : null;
                return (
                  <div
                    key={day.date}
                    className={`${styles.dayCell} ${day.isToday ? styles.today : ""} ${day.mood ? styles.hasEntry : ""}`}
                    style={{
                      animationDelay: `${i * 0.02}s`,
                      "--cell-color": moodInfo?.color || "var(--border)",
                    } as React.CSSProperties}
                    title={`${day.month} ${day.dayNum}${moodInfo ? ` — ${moodInfo.label}` : ""}`}
                  >
                    <span className={styles.dayNum}>{day.dayNum}</span>
                    {moodInfo ? (
                      <span className={styles.dayEmoji}>{moodInfo.emoji}</span>
                    ) : (
                      <span className={styles.dayEmpty}>·</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            <div className={styles.summary}>
              <div className={styles.summaryItem}>
                <span className={styles.summaryValue}>{moods.length}</span>
                <span className={styles.summaryLabel}>check-ins</span>
              </div>
              {(() => {
                const moodCounts: Record<string, number> = {};
                moods.forEach((m) => {
                  moodCounts[m.mood] = (moodCounts[m.mood] || 0) + 1;
                });
                const topMood = Object.entries(moodCounts).sort(
                  (a, b) => b[1] - a[1]
                )[0];
                if (topMood) {
                  const info = MOOD_DISPLAY[topMood[0]];
                  return (
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryValue}>
                        {info?.emoji || "◯"}
                      </span>
                      <span className={styles.summaryLabel}>
                        most common
                      </span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
