from typing import AsyncGenerator

from app.services.llm.gemini_client import get_gemini_client


class ResponseGenerator:
    """Generates streaming responses from Gemini."""

    def __init__(self):
        self.client = get_gemini_client()

    async def stream(
        self,
        system_instruction: str,
        user_prompt: str,
        temperature: float = 0.8,
    ) -> AsyncGenerator[str, None]:
        """Stream response tokens from Gemini."""
        async for token in self.client.stream(
            prompt=user_prompt,
            system_instruction=system_instruction,
            temperature=temperature,
            max_tokens=2048,
        ):
            yield token

    async def generate_full(
        self,
        system_instruction: str,
        user_prompt: str,
        temperature: float = 0.8,
    ) -> str:
        """Generate a complete non-streaming response (for retries)."""
        return await self.client.generate(
            prompt=user_prompt,
            system_instruction=system_instruction,
            temperature=temperature,
            max_tokens=2048,
        )
