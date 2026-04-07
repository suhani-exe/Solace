"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { register, setToken, setUser } from "@/lib/api";
import styles from "../auth.module.css";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    display_name: "",
    email: "",
    password: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await register(formData);
      setToken(result.access_token);
      setUser(result.user);
      router.push("/chat");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.ambientOrbs}>
        <div className={styles.orb1} />
        <div className={styles.orb2} />
      </div>

      <div className={styles.authContainer}>
        <div className={styles.authCard}>
          <div className={styles.authLogo} onClick={() => router.push("/")}>
            <span className={styles.logoIcon}>◯</span>
            <span className={styles.logoText}>Solace</span>
          </div>

          <h1 className="heading-2" style={{ marginBottom: "var(--space-sm)" }}>
            Let&apos;s begin
          </h1>
          <p className="body-sm" style={{ marginBottom: "var(--space-xl)" }}>
            Create your space. Everything stays between us.
          </p>

          {error && <div className={styles.error}>{error}</div>}

          <form onSubmit={handleSubmit} className={styles.authForm}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>What should we call you?</label>
              <input
                id="register-name"
                type="text"
                name="display_name"
                className="input-field"
                value={formData.display_name}
                onChange={handleChange}
                placeholder="Your name"
                required
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Email</label>
              <input
                id="register-email"
                type="email"
                name="email"
                className="input-field"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                required
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Password</label>
              <input
                id="register-password"
                type="password"
                name="password"
                className="input-field"
                value={formData.password}
                onChange={handleChange}
                placeholder="At least 6 characters"
                minLength={6}
                required
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Your timezone</label>
              <input
                id="register-timezone"
                type="text"
                name="timezone"
                className="input-field"
                value={formData.timezone}
                onChange={handleChange}
                readOnly
              />
              <span className="caption">Auto-detected. Used only for check-in timing.</span>
            </div>

            <button
              id="register-submit"
              type="submit"
              className={`btn btn-primary ${styles.submitBtn}`}
              disabled={loading}
            >
              {loading ? "Creating your space..." : "Create account"}
            </button>
          </form>

          <p className={styles.authSwitch}>
            Already have an account?{" "}
            <a href="/auth/login">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}
