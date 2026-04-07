"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { chatStream, getUser, getSessions, getChatHistory, clearToken } from "@/lib/api";
import styles from "./chat.module.css";
import MoodTracker from "./MoodTracker";
import MoodHistory from "./MoodHistory";
import ProfilePopup from "./ProfilePopup";
import MainPage from "./MainPage";
import LavaLampBg from "./LavaLampBg";
import BreathingOverlay from "./BreathingOverlay";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  emotion?: {
    primary_emotion: string;
    intensity: number;
    risk_level: string;
    implicit_signals: string[];
  };
  isStreaming?: boolean;
}

interface SessionItem {
  id: string;
  started_at: string;
  summary_text: string | null;
  dominant_emotion: string | null;
  turn_count: number;
}

const EMOTION_AMBIENT_MAP: Record<string, string> = {
  sadness: "var(--ambient-sadness)",
  anxiety: "var(--ambient-anxiety)",
  anger: "var(--ambient-anger)",
  frustration: "var(--ambient-anger)",
  joy: "var(--ambient-joy)",
  happiness: "var(--ambient-joy)",
  relief: "var(--ambient-relief)",
  gratitude: "var(--ambient-relief)",
  loneliness: "var(--ambient-loneliness)",
  fear: "var(--ambient-fear)",
  overwhelm: "var(--ambient-anxiety)",
  neutral: "var(--ambient-neutral)",
};

const EMOTION_EMOJI: Record<string, string> = {
  sadness: "🌧",
  anxiety: "🌊",
  anger: "🔥",
  frustration: "⚡",
  joy: "☀️",
  happiness: "🌤",
  relief: "🍃",
  gratitude: "🌸",
  loneliness: "🌙",
  fear: "🌫",
  overwhelm: "🌀",
  neutral: "◯",
  hopelessness: "🌑",
  guilt: "🪨",
  shame: "🫧",
  confusion: "🌀",
};

const STREAK_STAGES = [
  { min: 0, emoji: "🌱" },
  { min: 3, emoji: "🌿" },
  { min: 7, emoji: "🌳" },
  { min: 14, emoji: "🌲" },
  { min: 30, emoji: "🌸" },
  { min: 60, emoji: "🌺" },
];

function getStreakEmoji(days: number) {
  for (let i = STREAK_STAGES.length - 1; i >= 0; i--) {
    if (days >= STREAK_STAGES[i].min) return STREAK_STAGES[i].emoji;
  }
  return "🌱";
}

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<string>("neutral");
  const [currentRisk, setCurrentRisk] = useState<string>("LOW");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [userName, setUserName] = useState("");
  const [careStreak, setCareStreak] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [userScrolled, setUserScrolled] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);

  // UI overlays
  const [showMoodTracker, setShowMoodTracker] = useState(true);
  const [showMoodHistory, setShowMoodHistory] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showMainPage, setShowMainPage] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [streakTooltip, setStreakTooltip] = useState(false);
  const [showBreathing, setShowBreathing] = useState(false);

  // Auth check
  useEffect(() => {
    const token = localStorage.getItem("solace_token");
    if (!token) {
      router.push("/auth/login");
      return;
    }
    const user = getUser();
    if (user) {
      setUserName(user.display_name || "");
      setCareStreak(user.care_streak_days || 0);
    }
    loadSessions();

    // Theme
    const theme = localStorage.getItem("solace_theme");
    setIsDark(theme === "dark");
  }, [router]);

  // Ambient emotion color
  useEffect(() => {
    const ambient = EMOTION_AMBIENT_MAP[currentEmotion] || "var(--ambient-neutral)";
    document.documentElement.style.setProperty("--ambient", ambient);
    return () => {
      document.documentElement.style.setProperty("--ambient", "var(--ambient-neutral)");
    };
  }, [currentEmotion]);

  // Auto-scroll
  useEffect(() => {
    if (!userScrolled) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, userScrolled]);

  // Scroll detection
  const handleScroll = useCallback(() => {
    if (!threadRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = threadRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    setUserScrolled(!isAtBottom);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "");
    localStorage.setItem("solace_theme", next ? "dark" : "light");
  };

  const loadSessions = async () => {
    try {
      const data = await getSessions();
      setSessions(data);
    } catch {
      // ignore
    }
  };

  const loadSession = async (sid: string) => {
    try {
      const history = await getChatHistory(sid);
      setMessages(
        history.map((msg) => ({
          id: msg.id,
          role: msg.role as "user" | "assistant",
          content: msg.content,
          emotion: msg.emotion_state as ChatMessage["emotion"],
        }))
      );
      setSessionId(sid);
      setShowSidebar(false);
    } catch {
      // ignore
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setSessionId(null);
    setCurrentEmotion("neutral");
    setCurrentRisk("LOW");
    setShowSidebar(false);
  };

  const handleSend = async () => {
    const content = input.trim();
    if (!content || isLoading) return;

    setInput("");
    setIsLoading(true);
    setUserScrolled(false);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // Optimistic UI — show user message immediately
    const userMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content,
    };
    setMessages((prev) => [...prev, userMsg]);

    // Create placeholder for AI response
    const aiMsgId = `ai-${Date.now()}`;
    const aiMsg: ChatMessage = {
      id: aiMsgId,
      role: "assistant",
      content: "",
      isStreaming: true,
    };
    setMessages((prev) => [...prev, aiMsg]);

    // Stream response
    let isRetrying = false;
    abortRef.current = chatStream(
      content,
      sessionId,
      (event, data) => {
        switch (event) {
          case "session":
            try {
              const sessionData = JSON.parse(data);
              setSessionId(sessionData.session_id);
            } catch {
              // ignore
            }
            break;

          case "emotion":
            try {
              const emotionData = JSON.parse(data);
              setCurrentEmotion(emotionData.primary_emotion || "neutral");
              setCurrentRisk(emotionData.risk_level || "LOW");
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === aiMsgId
                    ? { ...msg, emotion: emotionData }
                    : msg
                )
              );
            } catch {
              // ignore
            }
            break;

          case "token":
            if (isRetrying) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === aiMsgId
                    ? { ...msg, content: data, isStreaming: true }
                    : msg
                )
              );
              isRetrying = false;
            } else {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === aiMsgId
                    ? { ...msg, content: msg.content + data }
                    : msg
                )
              );
            }
            break;

          case "retry":
            isRetrying = true;
            break;

          case "done":
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === aiMsgId ? { ...msg, isStreaming: false } : msg
              )
            );
            break;

          case "error":
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === aiMsgId
                  ? {
                      ...msg,
                      content: "I'm sorry, something went wrong. Could you try again?",
                      isStreaming: false,
                    }
                  : msg
              )
            );
            break;
        }
      },
      (error) => {
        console.error("Chat error:", error);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMsgId
              ? {
                  ...msg,
                  content: "I'm having trouble connecting right now. Please try again.",
                  isStreaming: false,
                }
              : msg
          )
        );
        setIsLoading(false);
      },
      () => {
        setIsLoading(false);
        loadSessions();
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  return (
    <div className={styles.chatPage}>
      {/* Lava Lamp Background */}
      <LavaLampBg />

      {/* Breathing Overlay */}
      {showBreathing && (
        <BreathingOverlay onClose={() => setShowBreathing(false)} />
      )}

      {/* Mood Tracker Modal */}
      {showMoodTracker && (
        <MoodTracker onClose={() => setShowMoodTracker(false)} />
      )}

      {/* Mood History Modal */}
      {showMoodHistory && (
        <MoodHistory onClose={() => setShowMoodHistory(false)} />
      )}

      {/* Profile Popup */}
      {showProfile && (
        <ProfilePopup
          onClose={() => setShowProfile(false)}
          onOpenMoodHistory={() => {
            setShowProfile(false);
            setShowMoodHistory(true);
          }}
          onNameChange={(name) => setUserName(name)}
        />
      )}

      {/* Main Page Overlay */}
      {showMainPage && (
        <MainPage
          userName={userName}
          careStreak={careStreak}
          sessionCount={sessions.length}
          onClose={() => setShowMainPage(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${showSidebar ? styles.sidebarOpen : ""}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.sidebarLogo} onClick={() => { setShowSidebar(false); setShowMainPage(true); }} style={{ cursor: "pointer" }}>
            <span className={styles.logoIcon}>◯</span>
            <span className={styles.logoText}>Solace</span>
          </div>
          <button
            className={styles.closeSidebar}
            onClick={() => setShowSidebar(false)}
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>

        <p className={styles.sidebarTagline}>Your safe space 🤍</p>

        <button className={`btn btn-primary ${styles.newChatBtn}`} onClick={startNewChat}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          New conversation
        </button>

        <div className={styles.sessionList}>
          <p className="caption" style={{ padding: "var(--space-sm) var(--space-md)" }}>
            Recent conversations
          </p>
          {sessions.length === 0 ? (
            <p className="body-sm" style={{ padding: "var(--space-md)", textAlign: "center", color: "var(--text-muted)" }}>
              No conversations yet.
              <br />Start one above.
            </p>
          ) : (
            sessions.map((session) => (
              <button
                key={session.id}
                className={`${styles.sessionItem} ${
                  session.id === sessionId ? styles.sessionActive : ""
                }`}
                onClick={() => loadSession(session.id)}
              >
                <span className={styles.sessionEmotion}>
                  {EMOTION_EMOJI[session.dominant_emotion || "neutral"] || "◯"}
                </span>
                <div className={styles.sessionInfo}>
                  <span className={styles.sessionTitle}>
                    {session.summary_text
                      ? session.summary_text.slice(0, 50) + (session.summary_text.length > 50 ? "..." : "")
                      : `Conversation`}
                  </span>
                  <span className="caption">
                    {new Date(session.started_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                    {" · "}
                    {session.turn_count} turn{session.turn_count !== 1 ? "s" : ""}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        <div className={styles.sidebarFooter}>
          <button className="btn btn-ghost" onClick={() => { clearToken(); router.push("/"); }} style={{ width: "100%", justifyContent: "flex-start" }}>
            Sign out
          </button>
        </div>
      </aside>

      {/* Sidebar overlay (mobile) */}
      {showSidebar && (
        <div className={styles.sidebarOverlay} onClick={() => setShowSidebar(false)} />
      )}

      {/* Main Chat Area */}
      <main className={styles.chatMain}>
        {/* Header */}
        <header className={styles.chatHeader}>
          <div className={styles.headerLeft}>
            <button
              className={styles.menuBtn}
              onClick={() => setShowSidebar(true)}
              aria-label="Open sidebar"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            <button className={styles.logoBtn} onClick={() => setShowMainPage(true)} aria-label="Open main page">
              <span className={styles.logoBtnIcon}>◯</span>
              <span className={styles.logoBtnText}>Solace</span>
            </button>
          </div>

          <div className={styles.headerCenter}>
            {currentEmotion !== "neutral" && (
              <div className={styles.emotionIndicator}>
                <span className={styles.emotionEmoji}>
                  {EMOTION_EMOJI[currentEmotion] || "◯"}
                </span>
                <span className={styles.emotionLabel}>{currentEmotion}</span>
              </div>
            )}
          </div>

          <div className={styles.headerRight}>
            {/* Pause & Breathe Button */}
            <button
              className={styles.breatheBtn}
              onClick={() => setShowBreathing(true)}
              aria-label="Pause and breathe"
              title="Pause & Breathe"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
                <circle cx="12" cy="12" r="4" fill="currentColor" opacity="0.6" />
              </svg>
            </button>

            <button
              className="themeToggle"
              onClick={toggleTheme}
              aria-label="Toggle dark mode"
            >
              {isDark ? "☀️" : "🌙"}
            </button>

            {careStreak > 0 && (
              <div
                className={styles.streakBadge}
                onMouseEnter={() => setStreakTooltip(true)}
                onMouseLeave={() => setStreakTooltip(false)}
              >
                <span className={styles.streakFlame}>{getStreakEmoji(careStreak)}</span>
                <span className={styles.streakCount}>{careStreak}</span>
                {streakTooltip && (
                  <div className={styles.streakTooltip}>
                    You&apos;ve shown up for yourself {careStreak} day{careStreak !== 1 ? "s" : ""} in a row! 💝
                  </div>
                )}
              </div>
            )}

            <button
              className={styles.avatarCircle}
              onClick={() => setShowProfile(true)}
              aria-label="Open profile"
            >
              {userName.charAt(0).toUpperCase()}
            </button>
          </div>
        </header>

        {/* Safety Banner */}
        {(currentRisk === "HIGH" || currentRisk === "CRITICAL") && (
          <div className={styles.safetyBanner}>
            <div className={styles.safetyInner}>
              <span className={styles.safetyIcon}>🛡️</span>
              <div>
                <p className={styles.safetyText}>
                  If you&apos;re in crisis, please reach out to a professional:
                </p>
                <p className={styles.safetyLinks}>
                  <strong>India:</strong> iCall 9152987821 · Vandrevala Foundation 1860-2662-345
                  <br />
                  <strong>Intl:</strong> 988 Suicide & Crisis Lifeline (US) · Samaritans 116 123 (UK)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div
          className={styles.conversationThread}
          ref={threadRef}
          onScroll={handleScroll}
        >
          {messages.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyOrbContainer}>
                <div className={styles.emptyOrb} />
                <div className={styles.emptyOrb2} />
              </div>
              <h2 className="heading-2" style={{ fontFamily: "var(--font-serif)" }}>
                {userName ? `Hi ${userName}.` : "Hi there."}
              </h2>
              <p className="body-lg" style={{ maxWidth: "400px" }}>
                Whatever&apos;s on your mind — I&apos;m here to listen. Not fix. Not judge.
                Just listen.
              </p>
              <div className={styles.promptSuggestions}>
                {[
                  "I've been feeling really overwhelmed lately...",
                  "I need to talk about something that happened",
                  "I just want someone to listen",
                  "Things have been rough, I don't know where to start",
                ].map((prompt) => (
                  <button
                    key={prompt}
                    className={styles.promptChip}
                    onClick={() => {
                      setInput(prompt);
                      textareaRef.current?.focus();
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={msg.id}
                className={`${styles.messageBubble} ${
                  msg.role === "user" ? styles.userBubble : styles.aiBubble
                }`}
                style={{ animationDelay: `${Math.min(i * 0.05, 0.3)}s` }}
              >
                {msg.role === "assistant" && (
                  <div className={styles.aiAvatar}>◯</div>
                )}
                <div
                  className={`${styles.bubbleContent} ${
                    msg.role === "user" ? styles.userContent : styles.aiContent
                  }`}
                >
                  <p>{msg.content}</p>
                  {msg.isStreaming && <span className={styles.streamCursor} />}
                </div>
              </div>
            ))
          )}

          {isLoading && messages.length > 0 && !messages[messages.length - 1]?.content && (
            <div className={styles.typingIndicator}>
              <div className={styles.aiAvatar}>◯</div>
              <div className={styles.typingDots}>
                <span />
                <span />
                <span />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className={styles.inputArea}>
          <div className={styles.inputContainer}>
            <textarea
              id="chat-input"
              ref={textareaRef}
              className={styles.textarea}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Say whatever feels right..."
              rows={1}
              disabled={isLoading}
            />
            <button
              id="chat-send"
              className={styles.sendButton}
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M3 10l14-7-7 14v-7H3z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>
          <p className={styles.inputDisclaimer}>
            Solace is an AI companion, not a therapist. In a crisis, please contact professional help.
          </p>
        </div>
      </main>
    </div>
  );
}
