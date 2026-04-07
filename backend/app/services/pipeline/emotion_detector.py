from app.models.schemas.chat import EmotionState
from app.services.llm.gemini_client import get_gemini_client


EMOTION_SYSTEM_PROMPT = """You are an expert emotional intelligence analyst. Your job is to detect the emotional state from a user's message in a mental health support context.

You MUST detect:
1. The PRIMARY emotion (e.g., sadness, anxiety, anger, frustration, loneliness, fear, hopelessness, guilt, shame, overwhelm, confusion, relief, gratitude, joy, neutral)
2. Intensity (0.0 to 1.0)
3. Your confidence in the detection (0.0 to 1.0)
4. Implicit signals — things the user didn't say directly but are present (e.g., "deflection", "minimization", "masked_distress", "sarcasm", "emotional_exhaustion", "people_pleasing", "catastrophizing")
5. Risk level: LOW, MEDIUM, HIGH, or CRITICAL

CRITICAL RULES:
- Users rarely say exactly what they mean. Read BETWEEN the lines.
- "I'm fine" often means the opposite.
- Casual language can mask serious distress ("it's whatever", "I guess", "doesn't matter").
- Pay attention to absolutist language ("always", "never", "nothing", "everyone").
- Detect when someone is testing whether it's safe to open up.

Respond with valid JSON only."""


class EmotionDetector:
    """Detects emotional state from user messages using Gemini."""

    def __init__(self):
        self.client = get_gemini_client()

    async def analyze(self, message: str, recent_turns: list[dict] = None) -> EmotionState:
        context = ""
        if recent_turns:
            recent = recent_turns[-5:]
            context = "\n\nRecent conversation context:\n"
            for turn in recent:
                context += f"{turn.get('role', 'user')}: {turn.get('content', '')}\n"

        prompt = f"""Analyze the emotional state of this message:

User message: "{message}"
{context}

Return JSON with these exact fields:
{{
    "primary_emotion": "string",
    "intensity": 0.0-1.0,
    "confidence": 0.0-1.0,
    "implicit_signals": ["list", "of", "signals"],
    "risk_level": "LOW|MEDIUM|HIGH|CRITICAL"
}}"""

        try:
            result = await self.client.generate_json(
                prompt=prompt,
                system_instruction=EMOTION_SYSTEM_PROMPT,
                temperature=0.2,
            )
            return EmotionState(
                primary_emotion=result.get("primary_emotion", "neutral"),
                intensity=float(result.get("intensity", 0.5)),
                confidence=float(result.get("confidence", 0.5)),
                implicit_signals=result.get("implicit_signals", []),
                risk_level=result.get("risk_level", "LOW"),
            )
        except Exception as e:
            print(f"EmotionDetector error: {e}")
            return EmotionState()
