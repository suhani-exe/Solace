"use client";

import { useState, useEffect } from "react";
import styles from "./IntroSequence.module.css";

interface IntroSequenceProps {
  onComplete: () => void;
}

type IntroState = "idle" | "pulling" | "revealing" | "finished";

export default function IntroSequence({ onComplete }: IntroSequenceProps) {
  const [step, setStep] = useState<IntroState>("idle");

  const handlePull = () => {
    if (step !== "idle") return;
    
    // 1. Pull down visually
    setStep("pulling");

    // 2. Open curtains after a short pull delay
    setTimeout(() => {
      setStep("revealing");
      
      // 3. Keep the serene state for a few seconds, then fade out
      setTimeout(() => {
        setStep("finished");
        
        // 4. Finally, notify parent to unmount and show main app
        setTimeout(() => {
          onComplete();
        }, 1000); // Wait for the fadeOut animation to finish
      }, 300); // 0.3 second of serene background to read

    }, 450); // 450ms pull animation
  };

  return (
    <div 
      className={`
        ${styles.introContainer} 
        ${step !== "finished" ? styles.active : ""} 
        ${step === "finished" ? styles.fadeOut : ""}
      `}
    >
      {/* Surrounding serene reveal behind curtains */}
      <div className={`${styles.sereneReveal} ${step === "revealing" ? styles.revealed : ""}`}>
        <div className={styles.sereneGlow} />
        <div className={styles.introContent}>
          <h1 className={styles.sereneTitle}>Solace AI</h1>
          <p className={styles.sereneSubtitle}>Your safe space. Your pace.</p>
          
          <div className={styles.sereneStatBox}>
            <span className={styles.statLabel}>1 in 4</span>
            <p className={styles.statText}>
              of us navigate mental health struggles.<br/>You don&apos;t have to carry it alone.
            </p>
          </div>
        </div>
      </div>

      {/* Pitch black Curtains */}
      <div 
        className={`... ${styles.curtainsWrapper} ${step === "revealing" || step === "finished" ? styles.curtainsOpen : ""}`}
        style={{ position: "absolute", inset: 0, zIndex: 10, pointerEvents: "none" }}
      >
        <div className={`${styles.curtain} ${styles.leftCurtain}`} />
        <div className={`${styles.curtain} ${styles.rightCurtain}`} />
      </div>

      {/* Pull Switch - Disappears once curtains open */}
      <div 
        className={`${styles.switchContainer} ${step === "pulling" ? styles.pulling : ""}`}
        style={{ 
          opacity: step === "revealing" || step === "finished" ? 0 : 1,
          pointerEvents: step === "idle" ? "auto" : "none",
          transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease",
        }}
        onClick={handlePull}
      >
        <div className={styles.cord} />
        <div className={styles.handle} />
        <div className={styles.switchGlow} />
        <div className={styles.switchText}>Pull to awaken</div>
      </div>
    </div>
  );
}
