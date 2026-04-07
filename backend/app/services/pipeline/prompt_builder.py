from app.models.schemas.chat import EmotionState


class PromptBuilder:
    """Assembles the full Gemini prompt from all context sources."""

    SYSTEM_DIRECTIVE = """You are Solace — a deeply empathetic, emotionally intelligent companion. You are NOT a chatbot. You are NOT a therapist. You are someone who genuinely cares and pays attention.

CORE IDENTITY:
- You listen the way a best friend does — with full attention, without rushing to fix things.
- You notice what people DON'T say as much as what they do say.
- You never use template phrases. NEVER say: "I'm here for you", "That sounds tough", "Have you tried meditation?", "I understand how you feel", "Take care of yourself".
- Every single response must reference something SPECIFIC the user actually said.
- You mirror the user's language style. If they're casual, you're casual. If they're poetic, you match that energy.

RESPONSE RULES:
- If the user is venting, REFLECT what they said — don't advise.
- If the user is deflecting ("it's whatever", "I'm fine"), gently name what you see beneath the surface.
- If the user is overwhelmed, acknowledge the FULL weight of what they're carrying, not just one piece.
- If the user can't find words, offer emotional vocabulary without diagnosing.
- End with a specific, open-ended question grounded in what they said.
- Keep responses 3-5 sentences unless the user wrote significantly more.
- NEVER fabricate resources, statistics, or studies.

EMOTIONAL ATTUNEMENT:
- Read between the lines. "I guess it doesn't matter" = it matters deeply.
- Notice patterns across the conversation. If they keep circling back to something, name it.
- Acknowledge effort. If they showed up today, that means something."""

    def build(
        self,
        user_message: str,
        user_profile: dict = None,
        entity_graph: list = None,
        conversation_history: list = None,
        session_summaries: list = None,
        emotion_state: EmotionState = None,
        risk_assessment: dict = None,
    ) -> tuple[str, str]:
        """Build the full prompt. Returns (system_instruction, user_prompt)."""
        system_parts = [self.SYSTEM_DIRECTIVE]

        # User context block
        if user_profile:
            name = user_profile.get("display_name", "there")
            streak = user_profile.get("care_streak_days", 0)
            system_parts.append(f"\n[USER CONTEXT]\nUser's name: {name}\nCare streak: {streak} days")

        # Entity graph block
        if entity_graph:
            entities_str = "\n".join(
                [f"- {e.get('name', '?')} ({e.get('type', '?')}): {e.get('emotional_tags', [])}"
                 for e in entity_graph[:20]]
            )
            system_parts.append(f"\n[ENTITY GRAPH — People, events, and things in the user's world]\n{entities_str}")

        # Session summaries (cross-session memory)
        if session_summaries:
            summaries_str = "\n".join(
                [f"- Session ({s.get('started_at', '?')}): {s.get('summary', 'No summary')}"
                 for s in session_summaries[:3]]
            )
            system_parts.append(f"\n[PAST SESSION SUMMARIES — What you know from before]\n{summaries_str}")

        # Current emotional state
        if emotion_state:
            signals = ", ".join(emotion_state.implicit_signals) if emotion_state.implicit_signals else "none detected"
            system_parts.append(
                f"\n[CURRENT EMOTIONAL STATE]\n"
                f"Detected emotion: {emotion_state.primary_emotion} "
                f"(intensity: {emotion_state.intensity:.1f}, confidence: {emotion_state.confidence:.1f})\n"
                f"Implicit signals: {signals}\n"
                f"Risk level: {emotion_state.risk_level}"
            )

        # Safety context
        if risk_assessment and risk_assessment.get("risk_level") in ("HIGH", "CRITICAL"):
            system_parts.append(
                "\n[SAFETY ALERT]\n"
                "The user may be in distress. Prioritize validation and emotional safety.\n"
                "If risk is HIGH: Validate their feelings deeply, and gently mention that professional support is available.\n"
                "If risk is CRITICAL: Focus entirely on their safety. Provide crisis helpline numbers:\n"
                "- India: iCall (9152987821), Vandrevala Foundation (1860-2662-345)\n"
                "- USA: 988 Suicide & Crisis Lifeline (call/text 988)\n"
                "- UK: Samaritans (116 123)\n"
                "Do NOT be preachy. Be human. Be caring. Be specific."
            )

        # Build conversation history
        prompt_parts = []
        if conversation_history:
            prompt_parts.append("[CONVERSATION HISTORY]")
            for turn in conversation_history[-15:]:
                role = turn.get("role", "user")
                content = turn.get("content", "")
                label = "User" if role == "user" else "Solace"
                prompt_parts.append(f"{label}: {content}")
            prompt_parts.append("")

        prompt_parts.append(f"User: {user_message}")
        prompt_parts.append("\nSolace:")

        system_instruction = "\n".join(system_parts)
        user_prompt = "\n".join(prompt_parts)

        return system_instruction, user_prompt
