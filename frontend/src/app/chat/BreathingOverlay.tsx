"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import styles from "./breathing.module.css";

interface BreathingOverlayProps {
  onClose: () => void;
}

type BreathPhase = "inhale" | "hold" | "exhale";

const PHASE_DURATIONS: Record<BreathPhase, number> = {
  inhale: 4000,
  hold: 2000,
  exhale: 4000,
};

const PHASE_TEXT: Record<BreathPhase, string> = {
  inhale: "Breathe in...",
  hold: "Hold gently...",
  exhale: "Breathe out...",
};

const AFFIRMATIONS = [
  "You are safe :)",
  "This moment is yours 💛",
  "You're doing great",
  "Just breathe, you're okay",
  "You deserve this peace",
  "One breath at a time 🤍",
  "The storm will pass",
  "You are enough",
];

export default function BreathingOverlay({ onClose }: BreathingOverlayProps) {
  const [phase, setPhase] = useState<BreathPhase>("inhale");
  const [affirmationIndex, setAffirmationIndex] = useState(0);
  const [isClosing, setIsClosing] = useState(false);
  const [textFading, setTextFading] = useState(false);
  const [cycleCount, setCycleCount] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Breathing cycle logic
  const runCycle = useCallback(() => {
    // Inhale
    setTextFading(true);
    setTimeout(() => {
      setPhase("inhale");
      setTextFading(false);
    }, 300);

    timerRef.current = setTimeout(() => {
      // Hold
      setTextFading(true);
      setTimeout(() => {
        setPhase("hold");
        setTextFading(false);
      }, 300);

      timerRef.current = setTimeout(() => {
        // Exhale
        setTextFading(true);
        setTimeout(() => {
          setPhase("exhale");
          setTextFading(false);
        }, 300);

        timerRef.current = setTimeout(() => {
          // Cycle complete — rotate affirmation
          setCycleCount((c) => c + 1);
          setAffirmationIndex((prev) => (prev + 1) % AFFIRMATIONS.length);
          runCycle(); // Next cycle
        }, PHASE_DURATIONS.exhale);
      }, PHASE_DURATIONS.hold);
    }, PHASE_DURATIONS.inhale);
  }, []);

  useEffect(() => {
    runCycle();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [runCycle]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 500);
  };

  // Circle class based on phase
  const circleClass = `${styles.circle} ${
    phase === "inhale"
      ? styles.circleInhale
      : phase === "hold"
      ? styles.circleHold
      : styles.circleExhale
  }`;

  const ringClass = `${styles.circleRing} ${
    phase === "inhale"
      ? styles.circleRingInhale
      : phase === "hold"
      ? styles.circleRingHold
      : styles.circleRingExhale
  }`;

  const glowClass = `${styles.ambientGlow} ${
    phase === "inhale"
      ? styles.ambientGlowInhale
      : phase === "hold"
      ? styles.ambientGlowHold
      : styles.ambientGlowExhale
  }`;

  return (
    <div
      className={`${styles.overlay} ${isClosing ? styles.overlayClosing : ""}`}
      role="dialog"
      aria-label="Pause and Breathe"
    >
      {/* Ambient glow behind circle */}
      <div className={glowClass} />

      {/* Close button */}
      <button
        className={styles.closeBtn}
        onClick={handleClose}
        aria-label="Close breathing overlay"
      >
        ✕
      </button>

      {/* Breathing circle */}
      <div className={styles.circleContainer}>
        <div className={circleClass} />
        <div className={ringClass} />
      </div>

      {/* Phase text */}
      <p className={`${styles.phaseText} ${textFading ? styles.phaseTextFading : ""}`}>
        {PHASE_TEXT[phase]}
      </p>

      {/* Affirmation */}
      <p
        className={`${styles.affirmation} ${textFading ? styles.affirmationFading : ""}`}
      >
        {AFFIRMATIONS[affirmationIndex]}
      </p>

      {/* Cycle counter */}
      {cycleCount > 0 && (
        <p className={styles.timer}>
          {cycleCount} breath{cycleCount !== 1 ? "s" : ""} completed
        </p>
      )}

      {/* Continue button */}
      <button className={styles.continueBtn} onClick={handleClose}>
        I&apos;m ready to continue
      </button>
    </div>
  );
}
