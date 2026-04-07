"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, setToken, setUser } from "@/lib/api";
import styles from "../auth.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await login({ email, password });
      setToken(result.access_token);
      setUser(result.user);
      router.push("/chat");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
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
            Welcome back
          </h1>
          <p className="body-sm" style={{ marginBottom: "var(--space-xl)" }}>
            Pick up where you left off.
          </p>

          {error && <div className={styles.error}>{error}</div>}

          <form onSubmit={handleSubmit} className={styles.authForm}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Email</label>
              <input
                id="login-email"
                type="email"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Password</label>
              <input
                id="login-password"
                type="password"
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              id="login-submit"
              type="submit"
              className={`btn btn-primary ${styles.submitBtn}`}
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className={styles.authSwitch}>
            New here?{" "}
            <a href="/auth/register">Create an account</a>
          </p>
        </div>
      </div>
    </div>
  );
}
