"use client";

import { useEffect, useRef, useCallback } from "react";
import styles from "./lavalamp.module.css";

/**
 * LavaLampBg — Dreamy ambient background with organic blobs
 * that gently drift and respond to pointer movement.
 * Pure CSS blobs + rAF for pointer tracking = smooth 60fps.
 */
export default function LavaLampBg() {
  const containerRef = useRef<HTMLDivElement>(null);
  const blobRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cursorGlowRef = useRef<HTMLDivElement>(null);
  const mousePos = useRef({ x: 0, y: 0 });
  const currentOffset = useRef({ x: 0, y: 0 });
  const rafId = useRef<number | null>(null);
  const isPointerInside = useRef(false);

  // Parallax depth multipliers for each blob (different depths)
  const depths = [0.02, 0.03, 0.015, 0.025, 0.018, 0.012];

  const handlePointerMove = useCallback((e: PointerEvent) => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    // Normalize to -1..1 from center
    mousePos.current = {
      x: (e.clientX - w / 2) / (w / 2),
      y: (e.clientY - h / 2) / (h / 2),
    };
    isPointerInside.current = true;

    // Move cursor glow
    if (cursorGlowRef.current) {
      cursorGlowRef.current.style.transform = `translate(${e.clientX - 150}px, ${e.clientY - 150}px)`;
      cursorGlowRef.current.classList.remove(styles.cursorGlowHidden);
    }
  }, []);

  const handlePointerLeave = useCallback(() => {
    isPointerInside.current = false;
    if (cursorGlowRef.current) {
      cursorGlowRef.current.classList.add(styles.cursorGlowHidden);
    }
  }, []);

  // Animation loop — smoothly lerp blob positions toward pointer offset
  useEffect(() => {
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const animate = () => {
      const targetX = isPointerInside.current ? mousePos.current.x : 0;
      const targetY = isPointerInside.current ? mousePos.current.y : 0;

      // Smooth lerp toward target (very gentle)
      currentOffset.current.x = lerp(currentOffset.current.x, targetX, 0.03);
      currentOffset.current.y = lerp(currentOffset.current.y, targetY, 0.03);

      // Apply parallax offset to each blob
      blobRefs.current.forEach((blob, i) => {
        if (!blob) return;
        const depth = depths[i] || 0.02;
        const offsetX = currentOffset.current.x * depth * window.innerWidth;
        const offsetY = currentOffset.current.y * depth * window.innerHeight;
        // Apply as additional transform (CSS animation handles base drift)
        blob.style.setProperty("--parallax-x", `${offsetX}px`);
        blob.style.setProperty("--parallax-y", `${offsetY}px`);
        blob.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
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
      {/* Organic blobs — each at a different depth/position */}
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
