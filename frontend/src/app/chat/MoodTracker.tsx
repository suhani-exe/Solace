"use client";

import { useState, useEffect } from "react";
import { submitMood, getTodayMood } from "@/lib/api";
import styles from "./moodtracker.module.css";

interface MoodOption {
  emoji: string;
  label: string;
  value: string;
  color: string;
}

const MOODS: MoodOption[] = [
  { emoji: "😁", label: "Wonderful", value: "wonderful", color: "#8ED4A0" },
  { emoji: "😊", label: "Good", value: "good", color: "#B8D4C8" },
  { emoji: "🙂", label: "Okay", value: "okay", color: "#FFD6C9" },
  { emoji: "😐", label: "Meh", value: "meh", color: "#E6D9FF" },
  { emoji: "😣", label: "Struggling", value: "struggling", color: "#F4B6C2" },
  { emoji: "😖", label: "Rough", value: "rough", color: "#E8A0B4" },
];

interface MoodTrackerProps {
  onClose: () => void;
}

export default function MoodTracker({ onClose }: MoodTrackerProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    checkIfShouldShow();
  }, []);

  const checkIfShouldShow = async () => {
    // Quick local check first
    const lastDate = localStorage.getItem("solace_mood_date");
    const today = new Date().toISOString().split("T")[0];
    if (lastDate === today) {
      onClose();
      return;
    }

    // Confirm with backend
    try {
      const result = await getTodayMood();
      if (result.logged) {
        localStorage.setItem("solace_mood_date", today);
        onClose();
        return;
      }
    } catch {
      // If backend check fails, still show if local says we should
    }

    setShouldShow(true);
  };

  const handleSelect = async (mood: MoodOption) => {
    setSelected(mood.value);

    try {
      await submitMood(mood.value);
      const today = new Date().toISOString().split("T")[0];
      localStorage.setItem("solace_mood_date", today);
    } catch {
      // Silently fail — still show the thank you
    }

    setTimeout(() => {
      setSubmitted(true);
    }, 400);

    setTimeout(() => {
      handleClose();
    }, 2200);
  };

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  if (!shouldShow) return null;

  return (
    <div className={`${styles.overlay} ${closing ? styles.overlayClosing : ""}`}>
      <div className={`${styles.modal} ${closing ? styles.modalClosing : ""}`}>
        {!submitted ? (
          <>
            <button className={styles.closeBtn} onClick={handleClose} aria-label="Skip mood check">
              ✕
            </button>
            <div className={styles.header}>
              <div className={styles.headerOrb} />
              <h2 className={styles.title}>How are you feeling today?</h2>
              <p className={styles.subtitle}>Take a moment to check in with yourself</p>
            </div>
            <div className={styles.moodGrid}>
              {MOODS.map((mood, i) => (
                <button
                  key={mood.value}
                  className={`${styles.moodBtn} ${selected === mood.value ? styles.moodSelected : ""}`}
                  onClick={() => handleSelect(mood)}
                  style={{
                    animationDelay: `${0.1 + i * 0.08}s`,
                    "--mood-color": mood.color,
                  } as React.CSSProperties}
                  disabled={selected !== null}
                >
                  <span className={styles.moodEmoji}>{mood.emoji}</span>
                  <span className={styles.moodLabel}>{mood.label}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className={styles.thankYou}>
            <div className={styles.thankYouEmoji}>
              {MOODS.find((m) => m.value === selected)?.emoji || "💝"}
            </div>
            <h3 className={styles.thankYouTitle}>Thank you for checking in</h3>
            <p className={styles.thankYouText}>
              Every moment of self-awareness is a step forward
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
