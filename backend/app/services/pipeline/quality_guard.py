from app.models.schemas.chat import QualityEvaluation
from app.services.llm.gemini_client import get_gemini_client


QUALITY_SYSTEM_PROMPT = """You are a response quality evaluator for a mental health AI companion called Solace. Your job is to evaluate whether a generated response is genuinely helpful and personalized, or whether it falls into generic/templated patterns.

FAIL CRITERIA — the response should FAIL if ANY of these are true:
1. Uses generic phrases like "I'm here for you", "That sounds tough", "Have you tried meditation?", "Take care of yourself", "I understand how you feel"
2. Does NOT reference anything specific the user actually said
3. Uses templated sentence structures (e.g., "It's normal to feel X when Y happens")
4. Gives unsolicited advice when the user was just venting
5. Sounds like a customer service bot or a generic wellness app
6. Uses corporate empathy language ("I appreciate you sharing")

PASS CRITERIA — the response should PASS if:
1. It references specific details from the user's message
2. It feels like it was written FOR this person, not for any person
3. It mirrors the user's tone and language style
4. It asks a specific, grounded follow-up question (not "How does that make you feel?")

Respond with valid JSON only."""


class QualityGuard:
    """Evaluates response quality and triggers regeneration if needed."""

    def __init__(self):
        self.client = get_gemini_client()

    async def evaluate(self, response: str, user_message: str) -> QualityEvaluation:
        prompt = f"""Evaluate this AI response for quality:

User's message: "{user_message}"

AI's response: "{response}"

Return JSON:
{{
    "passed": true/false,
    "issues": ["list of specific issues if failed, empty if passed"]
}}"""

        try:
            result = await self.client.generate_json(
                prompt=prompt,
                system_instruction=QUALITY_SYSTEM_PROMPT,
                temperature=0.1,
            )
            return QualityEvaluation(
                passed=result.get("passed", True),
                issues=result.get("issues", []),
            )
        except Exception as e:
            print(f"QualityGuard error: {e}")
            return QualityEvaluation(passed=True)  # Don't block on guard failures
