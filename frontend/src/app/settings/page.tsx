"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser, clearToken } from "@/lib/api";
import styles from "./settings.module.css";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUserState] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("solace_token");
    if (!token) {
      router.push("/auth/login");
      return;
    }
    const u = getUser();
    setUserState(u);
  }, [router]);

  const handleLogout = () => {
    clearToken();
    router.push("/");
  };

  if (!user) return null;

  return (
    <div className={styles.settingsPage}>
      <div className={styles.settingsContainer}>
        <header className={styles.header}>
          <button className="btn btn-ghost" onClick={() => router.push("/chat")}>
            ← Back to chat
          </button>
          <h1 className="heading-2" style={{ fontFamily: "var(--font-serif)" }}>
            Settings
          </h1>
        </header>

        <div className={styles.sections}>
          {/* Profile */}
          <section className={styles.section}>
            <h2 className="heading-3">Profile</h2>
            <div className={styles.card}>
              <div className={styles.field}>
                <label className="body-sm">Display name</label>
                <p className="body">{user.display_name as string}</p>
              </div>
              <div className={styles.field}>
                <label className="body-sm">Email</label>
                <p className="body">{user.email as string}</p>
              </div>
              <div className={styles.field}>
                <label className="body-sm">Timezone</label>
                <p className="body">{user.timezone as string}</p>
              </div>
            </div>
          </section>

          {/* Care Streak */}
          <section className={styles.section}>
            <h2 className="heading-3">Your journey</h2>
            <div className={styles.card}>
              <div className={styles.streakDisplay}>
                <span className={styles.streakEmoji}>🌱</span>
                <div>
                  <p className="heading-2" style={{ fontFamily: "var(--font-serif)" }}>
                    {(user.care_streak_days as number) || 0} days
                  </p>
                  <p className="body-sm">Care streak — keep showing up for yourself</p>
                </div>
              </div>
            </div>
          </section>

          {/* Notifications */}
          <section className={styles.section}>
            <h2 className="heading-3">Notifications</h2>
            <div className={styles.card}>
              <p className="body-sm" style={{ color: "var(--text-muted)" }}>
                Daily check-in notifications coming in Phase 3.
              </p>
            </div>
          </section>

          {/* Account */}
          <section className={styles.section}>
            <h2 className="heading-3">Account</h2>
            <div className={styles.card}>
              <button
                className="btn btn-secondary"
                onClick={handleLogout}
                style={{ color: "#C85050" }}
              >
                Sign out
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
