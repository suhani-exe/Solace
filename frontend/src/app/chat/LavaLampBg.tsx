"use client";

import { useEffect, useRef, useCallback } from "react";
import styles from "./lavalamp.module.css";

/**
 * LavaLampBg — Dreamy ambient background with organic blobs
 * that drift organically AND shift significantly with pointer movement.
 * Each blob has its own CSS drift animation + JS-driven parallax.
 * The pointer offset is strong enough to feel alive and responsive.
 */
export default function LavaLampBg() {
  const containerRef = useRef<HTMLDivElement>(null);
  const blobRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cursorGlowRef = useRef<HTMLDivElement>(null);
  const mousePos = useRef({ x: 0, y: 0 });
  const currentOffset = useRef({ x: 0, y: 0 });
  const rafId = useRef<number | null>(null);
  const isPointerInside = useRef(false);

  // Each blob's base CSS animation phase (in seconds, stored for additive transform)
  const blobConfigs = useRef([
    { depth: 0.08, speed: 28, phaseX: 0, phaseY: 0 },   // blob1: peach
    { depth: 0.12, speed: 32, phaseX: 2, phaseY: 1.5 },  // blob2: lavender
    { depth: 0.06, speed: 24, phaseX: 4, phaseY: 3 },    // blob3: pink
    { depth: 0.10, speed: 30, phaseX: 1, phaseY: 4.5 },  // blob4: cream
    { depth: 0.07, speed: 26, phaseX: 3.5, phaseY: 2 },  // blob5: rose
    { depth: 0.05, speed: 34, phaseX: 5, phaseY: 0.5 },  // blob6: sage
  ]);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    // Normalize to -1..1 from center
    mousePos.current = {
      x: (e.clientX - w / 2) / (w / 2),
      y: (e.clientY - h / 2) / (h / 2),
    };
    isPointerInside.current = true;

    // Move cursor glow (centered on pointer)
    if (cursorGlowRef.current) {
      cursorGlowRef.current.style.transform = `translate(${e.clientX - 200}px, ${e.clientY - 200}px)`;
      cursorGlowRef.current.classList.remove(styles.cursorGlowHidden);
    }
  }, []);

  const handlePointerLeave = useCallback(() => {
    isPointerInside.current = false;
    if (cursorGlowRef.current) {
      cursorGlowRef.current.classList.add(styles.cursorGlowHidden);
    }
  }, []);

  // Main animation loop
  useEffect(() => {
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    let time = 0;

    const animate = () => {
      time += 0.016; // ~60fps time increment

      const targetX = isPointerInside.current ? mousePos.current.x : 0;
      const targetY = isPointerInside.current ? mousePos.current.y : 0;

      // Lerp toward pointer (0.04 = responsive but smooth)
      currentOffset.current.x = lerp(currentOffset.current.x, targetX, 0.04);
      currentOffset.current.y = lerp(currentOffset.current.y, targetY, 0.04);

      const w = window.innerWidth;
      const h = window.innerHeight;

      blobRefs.current.forEach((blob, i) => {
        if (!blob) return;
        const config = blobConfigs.current[i];

        // 1. CSS-like organic drift (sine waves)
        const driftX = Math.sin(time / config.speed * Math.PI * 2 + config.phaseX) * 60;
        const driftY = Math.cos(time / config.speed * Math.PI * 2 + config.phaseY) * 50;

        // 2. Pointer parallax — stronger depth values = more movement
        const parallaxX = currentOffset.current.x * config.depth * w;
        const parallaxY = currentOffset.current.y * config.depth * h;

        // 3. Subtle scale breathing
        const scale = 1 + Math.sin(time / config.speed * Math.PI * 2 + config.phaseX) * 0.06;

        // Combined transform
        const tx = driftX + parallaxX;
        const ty = driftY + parallaxY;
        blob.style.transform = `translate(${tx}px, ${ty}px) scale(${scale.toFixed(3)})`;
      });

      rafId.current = requestAnimationFrame(animate);
    };

    rafId.current = requestAnimationFrame(animate);

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  // Pointer event listeners
  useEffect(() => {
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [handlePointerMove, handlePointerLeave]);

  const setBlobRef = (index: number) => (el: HTMLDivElement | null) => {
    blobRefs.current[index] = el;
  };

  return (
    <div className={styles.container} ref={containerRef} aria-hidden="true">
      {/* Organic blobs — JS drives ALL transform (drift + parallax + scale) */}
      <div className={`${styles.blob} ${styles.blob1}`} ref={setBlobRef(0)} />
      <div className={`${styles.blob} ${styles.blob2}`} ref={setBlobRef(1)} />
      <div className={`${styles.blob} ${styles.blob3}`} ref={setBlobRef(2)} />
      <div className={`${styles.blob} ${styles.blob4}`} ref={setBlobRef(3)} />
      <div className={`${styles.blob} ${styles.blob5}`} ref={setBlobRef(4)} />
      <div className={`${styles.blob} ${styles.blob6}`} ref={setBlobRef(5)} />

      {/* Glassmorphism highlight layer */}
      <div className={styles.glassHighlight} />

      {/* Cursor-following soft glow */}
      <div
        className={`${styles.cursorGlow} ${styles.cursorGlowHidden}`}
        ref={cursorGlowRef}
      />
    </div>
  );
}
