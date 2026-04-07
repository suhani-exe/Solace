"use client";

import { useState, useEffect, useRef } from "react";
import { getUser, setUser, updateProfile, clearToken } from "@/lib/api";
import { useRouter } from "next/navigation";
import styles from "./profilepopup.module.css";

interface ProfilePopupProps {
  onClose: () => void;
  onOpenMoodHistory: () => void;
  onNameChange: (name: string) => void;
}

const STREAK_STAGES = [
  { min: 0, emoji: "🌱", label: "Seedling" },
  { min: 3, emoji: "🌿", label: "Sprout" },
  { min: 7, emoji: "🌳", label: "Sapling" },
  { min: 14, emoji: "🌲", label: "Tree" },
  { min: 30, emoji: "🌸", label: "Blossom" },
  { min: 60, emoji: "🌺", label: "Full Bloom" },
];

function getStreakStage(days: number) {
  for (let i = STREAK_STAGES.length - 1; i >= 0; i--) {
    if (days >= STREAK_STAGES[i].min) return STREAK_STAGES[i];
  }
  return STREAK_STAGES[0];
}

export default function ProfilePopup({ onClose, onOpenMoodHistory, onNameChange }: ProfilePopupProps) {
  const router = useRouter();
  const popupRef = useRef<HTMLDivElement>(null);
  const [user, setUserState] = useState<Record<string, unknown> | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const u = getUser();
    setUserState(u);
    if (u) setNameValue(u.display_name as string);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 300);
  };

  const handleSaveName = async () => {
    if (!nameValue.trim() || nameValue === (user?.display_name as string)) {
      setEditingName(false);
      return;
    }

    setSaving(true);
    try {
      const updated = await updateProfile({ display_name: nameValue.trim() });
      setUser(updated);
      setUserState(updated);
      onNameChange(updated.display_name as string);
      setEditingName(false);
    } catch {
      // Silently fail, revert
      setNameValue(user?.display_name as string);
      setEditingName(false);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSaveName();
    if (e.key === "Escape") {
      setNameValue(user?.display_name as string);
      setEditingName(false);
    }
  };

  const handleLogout = () => {
    clearToken();
    router.push("/");
  };

  if (!user) return null;

  const streakDays = (user.care_streak_days as number) || 0;
  const stage = getStreakStage(streakDays);

  return (
    <div className={`${styles.backdrop} ${closing ? styles.backdropClosing : ""}`}>
      <div ref={popupRef} className={`${styles.popup} ${closing ? styles.popupClosing : ""}`}>
        {/* Avatar */}
        <div className={styles.avatarSection}>
          <div className={styles.avatarLarge}>
            {(user.display_name as string).charAt(0).toUpperCase()}
          </div>
        </div>

        {/* Name */}
        <div className={styles.nameSection}>
          {editingName ? (
            <div className={styles.nameEditRow}>
              <input
                className={styles.nameInput}
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleSaveName}
                autoFocus
                maxLength={100}
                disabled={saving}
              />
            </div>
          ) : (
            <button className={styles.nameDisplay} onClick={() => setEditingName(true)}>
              <span className={styles.nameText}>{user.display_name as string}</span>
              <span className={styles.editIcon}>✏️</span>
            </button>
          )}
          <p className={styles.email}>{user.email as string}</p>
        </div>

        {/* Streak */}
        <div className={styles.streakSection}>
          <div className={styles.streakStage}>
            <span className={styles.streakEmoji}>{stage.emoji}</span>
            <div>
              <p className={styles.streakDays}>{streakDays} day streak</p>
              <p className={styles.streakLabel}>{stage.label} · Keep growing!</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button className={styles.actionBtn} onClick={() => { handleClose(); onOpenMoodHistory(); }}>
            <span>📊</span>
            <span>Mood Journal</span>
          </button>
          <button className={styles.actionBtn} onClick={handleLogout}>
            <span>👋</span>
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
