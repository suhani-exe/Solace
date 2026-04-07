# OpenAImer Track B — Product Requirements Document
## AI in Mental Health & Emotional Support

---

## 1. Product Overview

### 1.1 Vision

Build a hyper-personalized, emotionally intelligent conversational AI that reads between the lines of what a user says, tracks their emotional world across sessions, and responds like someone who genuinely knows them — not a chatbot reading from a script. The system must feel warm, continuous, and alive.

### 1.2 Product Name (Suggested)

**Solace** — An AI companion for mental wellness.

### 1.3 Core Philosophy

> Users rarely say exactly what they mean. The system must detect the signal beneath the noise, hold context across time, and never once reach for a template.

Every design and engineering decision should be evaluated against one question: *Does this make the response feel more like a person who genuinely cares, or less?*

### 1.4 Competition Constraints

- LLM: Gemini 2.5 Flash / Pro (async client)
- Backend: Python + FastAPI
- Database: PostgreSQL + pgvector
- Cache: Redis
- Frontend: Next.js
- Judged on: Emotional Inference (30%), Memory & Personalization (25%), Grounding & Safety (20%), Actionability (15%), UI/UX (10%)

---

## 2. User Personas & Use Cases

### 2.1 Personas

| Persona | Description | Key Need |
|---|---|---|
| The Venter | Comes with raw, unfiltered emotional discharge | To feel heard without being advised prematurely |
| The Deflector | Uses casual language to mask real distress ("it's whatever") | To have their minimization gently named |
| The Overloaded | Juggling multiple simultaneous stressors | To have their burden acknowledged in full, not in parts |
| The Inarticulate | Cannot find words for what they feel | Emotional vocabulary scaffolding, not diagnosis |
| The Returning User | Coming back after days away | To feel the system remembers them without having to re-explain |

### 2.2 Core Use Cases

1. **Single-turn emotional venting** — User dumps how they feel; system reflects accurately and opens a thread.
2. **Multi-turn deep conversation** — System tracks entities, emotional state trajectory, and context across the session.
3. **Cross-session continuity** — User returns the next day; system references what they said before without being prompted.
4. **Implicit distress detection** — Casual messages hide serious signals; system catches them.
5. **Daily check-in** — System proactively reaches out once per day via email and push notification with a personalized message grounded in recent conversations.
6. **Crisis escalation** — System detects high-risk language and responds with safety-first behavior and resource escalation.

---

## 3. Feature Requirements

### 3.1 Core Features (Required by Competition)

#### F1 — Emotional Signal Detection
- Classify the primary emotional state from user input (explicit, embedded, or implicit)
- Detect secondary signals (sarcasm, deflection, minimization, masked distress)
- Produce a structured emotion state object: `{primary_emotion, intensity, confidence, implicit_signals[], risk_level}`
- This analysis must happen on every message, not just the first one

#### F2 — Entity & Context Tracking
- Extract named entities: people ("my mom", "Rahul"), events ("the exam", "that incident"), places, relationships
- Resolve pronouns and references across turns: "he said that" → resolves to the person named three turns back
- Maintain an entity graph per user, persisted to PostgreSQL, updated per session
- Entities carry emotional context tags (e.g., `mom: [source_of_pressure, recent_conflict]`)

#### F3 — Conversation Memory (Short-Term + Long-Term)
- **Short-term (Redis):** Full in-session turn history, active entity graph state, current emotion trajectory
- **Long-term (PostgreSQL + pgvector):** Session summaries, key themes per user, emotional pattern history, entity registry
- Memory is injected into every prompt — the model should never start from scratch
- At session end, an async background job summarizes the session and writes to long-term memory

#### F4 — RAG Pipeline (Beyond Basic RAG)
- **Knowledge Corpus:** Ethically sourced content from mental health forums, CBT frameworks, mindfulness resources, peer support literature
- **Chunking Strategy:** Hierarchical — parent chunks (topic-level) and child chunks (response-pattern-level) stored in pgvector
- **Hybrid Retrieval:** Semantic search (pgvector cosine similarity) + keyword filter (PostgreSQL full-text search) combined with RRF (Reciprocal Rank Fusion)
- **Personalization Layer:** Retrieval is biased toward the user's known emotional patterns and conversation history
- **Retrieved context is always grounded** — the model is instructed to only reference what was retrieved, never fabricate support resources

#### F5 — Response Quality Guard (Anti-Generic Filter)
- After Gemini generates a response, a lightweight secondary pass evaluates it for:
  - Generic phrases (blocklist: "I'm here for you", "That sounds tough", "Have you tried meditation?")
  - Failure to reference anything the user actually said
  - Templated sentence structures
- If quality check fails, the prompt is modified and regenerated (max 2 retries)
- This is implemented as a fast, zero-latency Gemini call with a strict evaluation rubric

#### F6 — Safety Monitor & Crisis Escalation
- Every message is scanned for high-risk signals: suicidal ideation, self-harm language, expressions of hopelessness
- Risk levels: `LOW / MEDIUM / HIGH / CRITICAL`
- At `HIGH`: Response pivots to validating language + soft resource suggestion
- At `CRITICAL`: Response is a dedicated crisis response; emergency helpline resources are surfaced; conversation is flagged in DB for review
- Safety check runs in parallel with emotion detection — it never delays the response pipeline

#### F7 — Streaming Responses
- Gemini response streams via SSE (Server-Sent Events) to the frontend
- Words appear token-by-token, creating a natural "thinking and typing" feel
- Response is persisted to PostgreSQL only after streaming completes

### 3.2 Custom Feature — Daily Emotional Check-In (Duolingo-style)

#### F8 — Proactive Daily Check-In System

**Overview:** Once per day, for each active user, the system generates a personalized outreach message grounded in their most recent conversation context. This message is sent via email and a browser push notification. It is not a generic "How are you?" — it references something specific from the user's world.

**Example output:**
> "Hey Pratik — yesterday you mentioned the weight of your exams and how your parents have been having a rough time. You didn't have to say you were overwhelmed; it came through anyway. How are things feeling today?"

**Behavior rules:**
- Only sent once per day, between 8 AM and 10 AM in the user's local timezone
- Skipped if user had a conversation in the last 4 hours (they're already engaged)
- Message is generated fresh by Gemini, grounded in the last 3 session summaries
- If no sessions exist yet, the message is a warm onboarding nudge
- User can snooze check-ins for N days or disable permanently from settings
- Clicking the notification or email CTA opens the chat interface with a pre-seeded context message
- If the user does not text in the last 24 hours, it sends notification regarding their condition

**Streak Mechanic:**
- Users earn a "care streak" for each day they have at least one conversation
- Streak is displayed subtly in the UI (not gamified aggressively — this is a wellness product, not a game)
- Check-in message acknowledges streak milestones naturally in conversation, not with pop-ups

---

## 4. System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         NEXT.JS FRONTEND                            │
│  Chat UI  │  Auth Pages  │  Settings  │  Notification Handler       │
└─────────────────────────────┬───────────────────────────────────────┘
                              │  HTTPS + SSE
┌─────────────────────────────▼───────────────────────────────────────┐
│                        FASTAPI BACKEND                              │
│                                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │
│  │  Auth Layer │  │  Chat Router │  │  Notification Router     │   │
│  │  (JWT)      │  │  (SSE)       │  │  (Check-in endpoints)    │   │
│  └─────────────┘  └──────┬───────┘  └──────────────────────────┘   │
│                           │                                         │
│              ┌────────────▼─────────────┐                          │
│              │    MESSAGE PIPELINE       │                          │
│              │                          │                          │
│              │  1. Emotion Detector      │◄─── Gemini Async        │
│              │  2. Safety Monitor        │◄─── (parallel)          │
│              │  3. Entity Extractor      │◄─── Gemini Async        │
│              │  4. Memory Loader         │◄─── Redis + Postgres    │
│              │  5. RAG Retriever         │◄─── pgvector + PG FTS   │
│              │  6. Prompt Builder        │                          │
│              │  7. Response Generator    │◄─── Gemini Streaming    │
│              │  8. Quality Guard         │◄─── Gemini Async        │
│              │  9. Memory Writer         │◄─── Redis + Postgres    │
│              └──────────────────────────┘                          │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              BACKGROUND WORKERS (Celery + Redis Broker)      │  │
│  │  Session Summarizer │ Check-in Scheduler │ Email Dispatcher  │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
┌─────────▼───────┐  ┌────────▼────────┐  ┌──────▼──────────┐
│   POSTGRESQL    │  │     REDIS       │  │  EMAIL SERVICE  │
│                 │  │                 │  │  (SMTP/         │
│  - users        │  │  - session_ctx  │  │   Resend API)   │
│  - sessions     │  │  - entity_cache │  │                 │
│  - messages     │  │  - emotion_traj │  └─────────────────┘
│  - entities     │  │  - rate_limits  │
│  - summaries    │  │  - checkin_lock │
│  - embeddings   │  └─────────────────┘
│    (pgvector)   │
│  - knowledge_kb │
│  - checkin_logs │
└─────────────────┘
```

### 4.1 Component Breakdown

#### 4.1.1 Message Pipeline (The Core Engine)

Every incoming user message passes through this sequential + parallel pipeline:

**Stage 1 — Parallel Pre-Processing** (runs concurrently, ~200ms target)
- `EmotionDetector`: Gemini call with a structured output prompt. Returns `EmotionState` object.
- `SafetyMonitor`: Separate Gemini call with a crisis-detection rubric. Returns `RiskAssessment` object.

**Stage 2 — Context Assembly** (runs after Stage 1)
- `EntityExtractor`: Extracts new entities from current message, merges with existing entity graph from Redis
- `MemoryLoader`: Pulls (a) last N turns from Redis, (b) top-K relevant session summaries from pgvector, (c) user profile from Postgres
- `RAGRetriever`: Hybrid search against knowledge base, reranked and filtered by emotional relevance

**Stage 3 — Prompt Construction**
- `PromptBuilder`: Assembles the final prompt with system instructions, user profile, entity graph, retrieved knowledge, conversation history, and emotion state. This is the most critical component — prompt quality directly determines response quality.

**Stage 4 — Generation + Validation**
- `ResponseGenerator`: Streams Gemini output. Buffers full response in memory while streaming tokens to frontend.
- `QualityGuard`: On full response receipt, evaluates for genericity. Triggers regeneration if needed (max 2x).

**Stage 5 — Memory Write-Back** (async, non-blocking)
- Writes message + response to Postgres
- Updates entity graph in Redis and Postgres
- Updates emotion trajectory in Redis
- If session ends (detected by inactivity threshold), triggers background session summarizer

#### 4.1.2 RAG Pipeline Detail

```
User Message
     │
     ▼
┌─────────────────────────────────────────────────────┐
│              HYBRID RETRIEVAL                       │
│                                                     │
│  ┌──────────────────┐    ┌───────────────────────┐  │
│  │  Semantic Search │    │  Keyword Search (FTS)  │  │
│  │  (pgvector       │    │  (Postgres tsvector)   │  │
│  │   cosine sim)    │    │                        │  │
│  └────────┬─────────┘    └───────────┬────────────┘  │
│           │                          │               │
│           └──────────┬───────────────┘               │
│                      ▼                               │
│            Reciprocal Rank Fusion                    │
│                      │                               │
│                      ▼                               │
│         Emotion-Weighted Reranking                   │
│         (boost chunks matching current emotion)      │
│                      │                               │
│                      ▼                               │
│            Top-K Chunks (default K=5)               │
└─────────────────────────────────────────────────────┘
```

Knowledge base sources: CBT workbooks (public domain), mental health subreddit threads (ethically scraped, anonymized), mindfulness resources, crisis intervention frameworks.

#### 4.1.3 Daily Check-In Worker

```
Celery Beat (daily cron: 7:30 AM UTC)
     │
     ▼
For each user where:
  - is_active = true
  - checkin_enabled = true
  - last_message_at > 24h ago
     │
     ▼
Load last 3 session summaries (Postgres)
Load entity graph snapshot (Redis/Postgres)
Load user timezone → check if 8–10 AM local time
     │
     ▼
Gemini: Generate personalized check-in message
  (grounded in summaries, entity graph, last known emotional state)
     │
     ├──► Email Service → SMTP/Resend → User's inbox
     │
     └──► Push Notification → Web Push API → Browser
              │
              ▼
         Log checkin_log record (user_id, sent_at, message, channel)
```

---

## 5. Database Schema

### 5.1 Core Tables

**`users`**
```
id (UUID PK), email, password_hash, display_name,
timezone, checkin_enabled, checkin_snooze_until,
care_streak_days, last_streak_date,
push_subscription_json, created_at, updated_at
```

**`sessions`**
```
id (UUID PK), user_id (FK), started_at, ended_at,
summary_text, summary_embedding (vector(768)),
dominant_emotion, risk_level_peak, turn_count
```

**`messages`**
```
id (UUID PK), session_id (FK), user_id (FK),
role (user/assistant), content_text,
emotion_state_json, risk_assessment_json,
entities_extracted_json, quality_retry_count,
created_at
```

**`user_entities`**
```
id (UUID PK), user_id (FK), entity_name,
entity_type (person/event/place/concept),
emotional_tags_json, first_mentioned_at,
last_mentioned_at, mention_count
```

**`knowledge_chunks`**
```
id (UUID PK), source_url, source_type,
parent_chunk_id (self-FK, nullable),
chunk_level (parent/child),
content_text, embedding (vector(768)),
topic_tags_json, created_at
```

**`checkin_logs`**
```
id (UUID PK), user_id (FK), sent_at,
channel (email/push/both), message_text,
opened_at (nullable), replied (boolean)
```

### 5.2 Redis Key Schema

```
session:{user_id}:turns          → List of last 30 turn objects (JSON)
session:{user_id}:entities       → Hash of current session entity graph
session:{user_id}:emotion_traj   → List of EmotionState objects (last 10)
checkin:{user_id}:lock           → TTL key (24h) to prevent double sends
user:{user_id}:profile_cache     → Serialized user profile (5 min TTL)
```

---

## 6. Data Flow — Request Lifecycle

### 6.1 User Sends a Message

```
[Browser]
  User types message → sends POST /api/chat/message
  Subscribes to GET /api/chat/stream/{message_id} (SSE)

[FastAPI — Auth Middleware]
  Validate JWT → extract user_id

[FastAPI — Chat Router]
  Create pending message record in Postgres
  Dispatch message_id to MessagePipeline (async task)
  Return {message_id} to client immediately (202 Accepted)

[MessagePipeline — Stage 1: Parallel]
  Task A → EmotionDetector.analyze(content, recent_turns)
           → Gemini call → EmotionState { emotion, intensity, implicit_signals, risk_level }
  Task B → SafetyMonitor.assess(content)
           → Gemini call → RiskAssessment { risk_level, trigger_phrases[], escalate: bool }
  await both

[MessagePipeline — Stage 2: Context Assembly]
  EntityExtractor.extract(content, session_entities)
       → New entities merged into Redis entity graph
  MemoryLoader.load(user_id)
       → Redis: recent turns (last 15)
       → Postgres: user profile, care streak
       → pgvector: top 3 relevant session summaries (semantic search on current message)
  RAGRetriever.retrieve(content, emotion_state)
       → Hybrid search: semantic + FTS on knowledge_chunks
       → Rerank by emotion tag match
       → Return top 5 chunks

[MessagePipeline — Stage 3: Prompt Construction]
  PromptBuilder.build({
    system_directive,       ← core personality + anti-generic rules
    user_profile,           ← name, known patterns, streak
    entity_graph,           ← all known entities with emotional tags
    conversation_history,   ← last 15 turns
    session_summaries,      ← past session context
    retrieved_knowledge,    ← RAG chunks
    emotion_state,          ← current detected emotion
    risk_assessment         ← safety context
  })

[MessagePipeline — Stage 4: Generation]
  ResponseGenerator.stream(prompt)
       → Gemini streaming API
       → Tokens pushed to Redis stream keyed by message_id
       → SSE endpoint reads from Redis stream → pushes to browser

  On stream complete:
  QualityGuard.evaluate(full_response, user_message)
       → If FAIL: modify prompt, regenerate (max 2 retries)
       → If PASS: finalize

[MessagePipeline — Stage 5: Write-Back (async, non-blocking)]
  → Write complete message + response to Postgres
  → Update entity graph in Redis + Postgres
  → Update emotion trajectory in Redis
  → Check session inactivity → trigger SessionSummarizer if needed
  → Update care streak in Postgres
```

### 6.2 Daily Check-In Flow

```
[Celery Beat: 7:30 AM UTC daily]
  → Fetch all users where checkin_enabled=true
  → For each user (parallel workers):
      → Check Redis checkin:{user_id}:lock → skip if exists
      → Convert user timezone → is it 8-10 AM local? → skip if not
      → Check last_message_at → skip if < 4h ago
      → Load last 3 session summaries from Postgres
      → Load entity graph snapshot
      → Load last known EmotionState
      → Build check-in prompt
      → Gemini call → personalized check-in message
      → EmailService.send(user.email, message)
      → PushService.send(user.push_subscription_json, message)
      → Write checkin_log to Postgres
      → Set Redis checkin:{user_id}:lock with TTL=24h
```

### 6.3 Session Summarization Flow (Background)

```
[Triggered when: user inactive > 30 min after last message]
  → Load all messages for session_id from Postgres
  → Build summarization prompt:
      "Summarize this session: key emotional themes, entities mentioned,
       unresolved concerns, emotional trajectory start→end, risk moments"
  → Gemini call → session_summary text
  → Embed summary with Gemini embedding API → vector(768)
  → Write to sessions table: summary_text, summary_embedding
  → Set sessions.ended_at
  → Update user care streak
```

---

## 7. Frontend Architecture (Next.js)

### 7.1 Pages & Routes

```
/                     → Landing page (product intro, CTA)
/auth/login           → Login page
/auth/register        → Registration + timezone setup + notification opt-in
/chat                 → Main chat interface (protected)
/settings             → Notification preferences, streak display, account
```

### 7.2 Component Tree (Chat Page)

```
<ChatPage>
  ├── <EmotionalHeader />         ← Subtle mood indicator, care streak badge
  ├── <ConversationThread>
  │     ├── <MessageBubble />     ← User messages
  │     ├── <AIResponseBubble />  ← Streaming AI response (token-by-token render)
  │     └── <TypingIndicator />   ← While streaming
  ├── <MessageInput>
  │     ├── <TextArea />          ← Auto-resizing
  │     └── <SendButton />
  └── <SafetyResourceBanner />    ← Conditionally rendered on HIGH risk
```

### 7.3 Key Frontend Behaviors

- **Streaming render:** SSE connection opens immediately on send; text renders character-by-character
- **Optimistic UI:** User message appears instantly before server confirmation
- **Scroll behavior:** Auto-scroll to latest, locked when user scrolls up manually
- **Notification permission:** Requested on first login with clear explanation of what it's used for
- **No message timestamps visible by default** — reduces clinical/transactional feel
- **Emotion ambiance (subtle):** Background hue shifts softly based on detected emotion (calming blues for sadness, soft warm tones for anxiety) — done with CSS variables, not distracting

### 7.4 UI Design Direction

**Aesthetic:** Soft, organic, editorial — warm without being saccharine. Think a well-designed journal app crossed with a thoughtful letter. Not clinical. Not corporate. Not a chatbot.

**Typography:** Large, breathing text. Generous line-height. The AI's words should feel like they are written, not generated.

**Color Palette:** Warm off-whites and creams for background. Deep, muted ink tones for text. A single quiet accent color (dusty terracotta or sage green) for interactive elements.

**Animations:** 
- Message bubbles fade-slide in from bottom
- Streaming text renders with subtle cursor that disappears when done
- Check-in notification slides in from top with gentle bounce

---

## 8. File Structure

```
solace/
│
├── backend/
│   ├── app/
│   │   ├── main.py                          ← FastAPI app init, middleware, routers
│   │   │
│   │   ├── core/
│   │   │   ├── config.py                    ← Pydantic settings (env vars)
│   │   │   ├── security.py                  ← JWT encode/decode, password hashing
│   │   │   ├── dependencies.py              ← FastAPI dependency injection (get_db, get_redis, get_current_user)
│   │   │   └── logging.py                   ← Structured logging setup
│   │   │
│   │   ├── api/
│   │   │   └── routes/
│   │   │       ├── auth.py                  ← /auth/register, /auth/login, /auth/refresh
│   │   │       ├── chat.py                  ← /chat/message (POST), /chat/stream/{id} (SSE GET)
│   │   │       ├── sessions.py              ← /sessions/ (GET history), /sessions/{id} (GET detail)
│   │   │       ├── notifications.py         ← /notifications/subscribe (push), /notifications/preferences
│   │   │       └── health.py                ← /health
│   │   │
│   │   ├── models/
│   │   │   ├── db/
│   │   │   │   ├── user.py                  ← SQLAlchemy User model
│   │   │   │   ├── session.py               ← Session model
│   │   │   │   ├── message.py               ← Message model
│   │   │   │   ├── entity.py                ← UserEntity model
│   │   │   │   ├── knowledge.py             ← KnowledgeChunk model (with pgvector column)
│   │   │   │   └── checkin.py               ← CheckinLog model
│   │   │   │
│   │   │   └── schemas/
│   │   │       ├── chat.py                  ← Pydantic: MessageRequest, StreamEvent, EmotionState, RiskAssessment
│   │   │       ├── user.py                  ← Pydantic: UserCreate, UserResponse, UserProfile
│   │   │       └── session.py               ← Pydantic: SessionSummary, SessionDetail
│   │   │
│   │   ├── services/
│   │   │   ├── pipeline/
│   │   │   │   ├── orchestrator.py          ← MessagePipeline: coordinates all stages
│   │   │   │   ├── emotion_detector.py      ← Gemini call → EmotionState
│   │   │   │   ├── safety_monitor.py        ← Gemini call → RiskAssessment, escalation logic
│   │   │   │   ├── entity_extractor.py      ← Gemini call → entity extraction + merge logic
│   │   │   │   ├── memory_loader.py         ← Loads Redis turns + Postgres summaries + user profile
│   │   │   │   ├── rag_retriever.py         ← Hybrid search: pgvector + FTS + RRF reranking
│   │   │   │   ├── prompt_builder.py        ← Assembles full Gemini prompt from all context
│   │   │   │   ├── response_generator.py    ← Gemini streaming, token push to Redis stream
│   │   │   │   └── quality_guard.py         ← Anti-generic evaluation + retry trigger
│   │   │   │
│   │   │   ├── memory/
│   │   │   │   ├── session_cache.py         ← Redis read/write for session turns + entity graph
│   │   │   │   ├── session_summarizer.py    ← Gemini call → summary text → embedding → Postgres write
│   │   │   │   └── streak_manager.py        ← Care streak calculation and update logic
│   │   │   │
│   │   │   ├── checkin/
│   │   │   │   ├── scheduler.py             ← Celery task: daily check-in orchestration
│   │   │   │   ├── message_generator.py     ← Gemini call → personalized check-in message
│   │   │   │   ├── email_sender.py          ← SMTP/Resend API integration
│   │   │   │   └── push_sender.py           ← Web Push API (pywebpush)
│   │   │   │
│   │   │   └── llm/
│   │   │       ├── gemini_client.py         ← Async Gemini client wrapper (streaming + non-streaming)
│   │   │       └── embedding_client.py      ← Gemini embedding API wrapper
│   │   │
│   │   ├── db/
│   │   │   ├── base.py                      ← SQLAlchemy declarative base
│   │   │   ├── session.py                   ← Async engine + session factory
│   │   │   └── migrations/                  ← Alembic migration files
│   │   │
│   │   └── workers/
│   │       ├── celery_app.py                ← Celery app init (Redis broker)
│   │       └── tasks.py                     ← Registered Celery tasks (summarize_session, send_checkins)
│   │
│   ├── scripts/
│   │   ├── ingest_knowledge.py              ← Script to scrape, chunk, embed, and insert knowledge corpus
│   │   └── seed_test_data.py                ← Dev seed data
│   │
│   ├── tests/
│   │   ├── test_emotion_detector.py
│   │   ├── test_rag_retriever.py
│   │   ├── test_quality_guard.py
│   │   └── test_pipeline_integration.py
│   │
│   ├── .env.example
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx                       ← Root layout: font loading, theme provider
│   │   ├── page.tsx                         ← Landing page
│   │   ├── auth/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx            ← Includes timezone picker + notification opt-in
│   │   ├── chat/
│   │   │   └── page.tsx                     ← Main chat interface (protected route)
│   │   └── settings/
│   │       └── page.tsx
│   │
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ConversationThread.tsx       ← Scrollable message container
│   │   │   ├── MessageBubble.tsx            ← User message bubble
│   │   │   ├── AIResponseBubble.tsx         ← Streaming AI response renderer
│   │   │   ├── TypingIndicator.tsx          ← Animated dots while streaming
│   │   │   ├── MessageInput.tsx             ← Auto-resizing textarea + send
│   │   │   └── SafetyBanner.tsx             ← Conditionally shown crisis resources
│   │   │
│   │   ├── layout/
│   │   │   ├── EmotionalHeader.tsx          ← Subtle mood display + care streak
│   │   │   └── Sidebar.tsx                  ← Session history list
│   │   │
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── TextArea.tsx
│   │       └── NotificationPrompt.tsx       ← Push permission request card
│   │
│   ├── hooks/
│   │   ├── useSSE.ts                        ← Custom hook for SSE connection + token streaming
│   │   ├── useChat.ts                       ← Chat state management (messages, loading, error)
│   │   ├── usePushNotification.ts           ← Service worker registration + push subscription
│   │   └── useStreak.ts                     ← Care streak fetch + display logic
│   │
│   ├── lib/
│   │   ├── api.ts                           ← Typed API client (fetch wrappers)
│   │   ├── auth.ts                          ← JWT storage, refresh token logic
│   │   └── pushWorker.ts                    ← Service worker for push notifications
│   │
│   ├── public/
│   │   └── sw.js                            ← Service worker (compiled from pushWorker.ts)
│   │
│   ├── styles/
│   │   └── globals.css                      ← CSS variables: color palette, typography scale
│   │
│   ├── next.config.js
│   ├── tailwind.config.js
│   └── Dockerfile
│
├── infra/
│   ├── docker-compose.yml                   ← Full local stack (FastAPI, Postgres, Redis, Celery, Next.js)
│   └── nginx.conf                           ← Reverse proxy config (API + frontend)
│
└── docs/
    ├── architecture.md                      ← This document
    ├── prompt_designs.md                    ← All Gemini prompt templates + rationale
    ├── knowledge_corpus.md                  ← Sources used, scraping methodology, ethical notes
    └── api_reference.md                     ← All FastAPI endpoints with request/response shapes
```

---

## 9. Prompt Design Strategy

Prompt quality is the primary determinant of response quality. The following principles govern all Gemini prompts:

### 9.1 Main Chat System Prompt (Structure)

```
[IDENTITY BLOCK]
You are a deeply empathetic listener. You do not give advice unless asked.
You do not use templates. You never say "I'm here for you" or "That sounds tough."
Every response must reference something the user actually said.

[USER CONTEXT BLOCK]
User: {name}
Known patterns: {emotional_history_summary}
Care streak: {streak_days} days
Entity graph: {entity_graph_json}

[CONVERSATION HISTORY BLOCK]
{last_15_turns}

[CURRENT EMOTIONAL STATE BLOCK]
Detected emotion: {emotion} (confidence: {confidence}%)
Implicit signals: {implicit_signals}
Risk level: {risk_level}

[RETRIEVED KNOWLEDGE BLOCK]
{rag_chunks}

[SESSION SUMMARIES BLOCK]
{past_session_summaries}

[RESPONSE RULES]
- Mirror the user's language style and register
- Name the implicit signal if present, gently
- End with a specific, open-ended question grounded in what they said
- Never fabricate resources or statistics
- If risk_level = HIGH: pivot to validation + soft resource mention
- Length: 3-5 sentences unless the user wrote much more
```

### 9.2 Anti-Generic Evaluation Prompt (Quality Guard)

A fast Gemini call that evaluates the generated response against a rubric and returns a structured `{pass: bool, issues: string[]}` JSON object. Evaluated criteria: template language use, failure to reference user input, generic advice, pronoun mismatch with entity graph.

### 9.3 Session Summarization Prompt

Structured output: key emotional themes, entity mentions, emotional arc (start→end), unresolved threads, risk moments. Output stored as both text and embedding.

### 9.4 Check-In Message Prompt

Grounded strictly in session summaries. Output: one short, personalized paragraph. Tone: warm, specific, non-intrusive. Must not sound like a notification from an app.

---

## 10. Key Technical Decisions & Rationale

| Decision | Choice | Rationale |
|---|---|---|
| Streaming approach | SSE via Redis pub/sub | Avoids WebSocket connection overhead; SSE is simpler for unidirectional streaming; Redis decouples generation from delivery |
| LLM | Gemini 2.5 Flash (primary) | Competition-approved, fast async API, strong instruction-following, low latency for streaming |
| Vector DB | pgvector in Postgres | Avoids separate vector DB; pgvector with HNSW index is production-grade for this scale; keeps infra simple |
| Session memory | Redis (short-term) + Postgres (long-term) | Redis for O(1) turn access during active session; Postgres for durable long-term memory + embedding search |
| Background jobs | Celery + Redis broker | Robust, battle-tested for scheduled tasks; Redis already in stack; supports retry logic |
| Check-in delivery | Email + Web Push | Email for reliability; Web Push for immediacy; both are opt-in; no SMS (privacy, cost) |
| Quality guard | Gemini secondary call | Lightweight, fast; more reliable than rule-based approach; catches subtle template patterns |
| Entity storage | Redis (session) + Postgres (persistent) | Fast in-session access; durable cross-session persistence; entity graph is small enough to fit in Redis |

---

## 11. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Response first-token latency | < 1.5 seconds |
| Full pipeline latency (first token) | < 2 seconds (parallel pre-processing) |
| Streaming completion (avg response) | < 8 seconds end-to-end |
| Concurrent users (demo scale) | 50 concurrent sessions |
| Check-in delivery reliability | > 99% (Celery retry policy: 3 retries, exponential backoff) |
| Safety detection latency | < 500ms (parallel with emotion detection) |
| Data privacy | No message content logged in application logs; Postgres at-rest encryption |

---

## 12. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Gemini rate limits during live demo | Implement response caching for similar queries in Redis; exponential backoff with fallback to Flash if Pro hits limits |
| Quality guard adds latency | Guard runs after streaming begins — user sees response while guard evaluates; regeneration only if response is truly generic |
| Push notifications blocked by browser | Email is always the fallback; UI clearly explains why notifications are useful |
| Entity graph grows too large for Redis | Cap entity graph at 50 entities; evict least-recently-mentioned on overflow; full graph always in Postgres |
| Safety false positives | Two-level check: fast keyword scan first, then Gemini only if flagged; avoid over-escalation for mild language |
| Session summarizer fails | Message content is always in Postgres; summarizer can be re-run retroactively; missed summaries degrade personalization but don't break the system |

---

## 13. Judging Rubric Alignment

| Judging Criterion | Weight | Our Design Response |
|---|---|---|
| Emotional Inference Accuracy | 30% | Dedicated EmotionDetector (Gemini) + SafetyMonitor running on every message; structured EmotionState object fed directly into prompt |
| Memory & Personalization Continuity | 25% | Redis short-term + Postgres long-term memory; entity graph with emotional tags; session summaries embedded and retrieved via pgvector |
| Grounding, Safety & Hallucination Control | 20% | RAG grounds all knowledge claims; SafetyMonitor with escalation tiers; QualityGuard reduces hallucinated advice |
| Actionability & Response Craftsmanship | 15% | QualityGuard enforces non-generic responses; PromptBuilder enforces specific, grounded questions at response end |
| UI Quality & Live Demo Smoothness | 10% | Streaming SSE for real-time feel; SSE pre-connected before send for fast first-token; clean, warm Next.js UI |

---

*Document version: 1.0 | OpenAImer Track B | Solace — AI Mental Health Companion*