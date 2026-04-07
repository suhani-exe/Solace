from app.models.schemas.chat import RiskAssessment
from app.services.llm.gemini_client import get_gemini_client


SAFETY_SYSTEM_PROMPT = """You are a crisis detection specialist for a mental health support platform. Your ONLY job is to assess whether a user's message contains signs of crisis, self-harm, or suicidal ideation.

Risk Levels:
- LOW: No concerning signals. Normal emotional expression.
- MEDIUM: Mild distress language, expressions of frustration or sadness, but no danger indicators.
- HIGH: Expressions of hopelessness, worthlessness, being a burden, indirect references to self-harm, or language suggesting the person is in significant emotional pain.
- CRITICAL: Direct mentions of suicide, self-harm plans, intent to harm self or others, or expressions of not wanting to live.

RULES:
- When in doubt, err slightly on the side of caution.
- Do NOT over-escalate normal sadness or frustration to HIGH/CRITICAL.
- Phrases like "I want to die" used colloquially (e.g., "this exam is killing me") should be MEDIUM, not CRITICAL.
- But "I don't see the point of going on" or "everyone would be better off without me" IS HIGH or CRITICAL.
- Always provide reasoning for your assessment.

Respond with valid JSON only."""


class SafetyMonitor:
    """Monitors messages for crisis signals and assesses risk levels."""

    def __init__(self):
        self.client = get_gemini_client()

    async def assess(self, message: str) -> RiskAssessment:
        prompt = f"""Assess the safety risk level of this message from a user in a mental health support chatbot:

User message: "{message}"

Return JSON with these exact fields:
{{
    "risk_level": "LOW|MEDIUM|HIGH|CRITICAL",
    "trigger_phrases": ["any", "concerning", "phrases"],
    "escalate": true/false,
    "reasoning": "brief explanation"
}}"""

        try:
            result = await self.client.generate_json(
                prompt=prompt,
                system_instruction=SAFETY_SYSTEM_PROMPT,
                temperature=0.1,
            )
            return RiskAssessment(
                risk_level=result.get("risk_level", "LOW"),
                trigger_phrases=result.get("trigger_phrases", []),
                escalate=result.get("escalate", False),
                reasoning=result.get("reasoning", ""),
            )
        except Exception as e:
            print(f"SafetyMonitor error: {e}")
            return RiskAssessment()
