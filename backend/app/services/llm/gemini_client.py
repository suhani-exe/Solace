import json
from typing import AsyncGenerator, Optional

from google import genai
from google.genai import types

from app.core.config import get_settings

settings = get_settings()


class GeminiClient:
    """Async wrapper around the Google GenAI SDK for Gemini models."""

    def __init__(self):
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.model = "gemini-2.5-flash"

    async def generate(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = 0.8,
        max_tokens: int = 1024,
    ) -> str:
        """Non-streaming generation for analysis tasks (emotion, safety, quality)."""
        config = types.GenerateContentConfig(
            temperature=temperature,
            max_output_tokens=max_tokens,
            system_instruction=system_instruction,
        )
        response = await self.client.aio.models.generate_content(
            model=self.model,
            contents=prompt,
            config=config,
        )
        return response.text or ""

    async def generate_json(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = 0.3,
    ) -> dict:
        """Generate structured JSON output."""
        config = types.GenerateContentConfig(
            temperature=temperature,
            max_output_tokens=1024,
            response_mime_type="application/json",
            system_instruction=system_instruction,
        )
        response = await self.client.aio.models.generate_content(
            model=self.model,
            contents=prompt,
            config=config,
        )
        text = response.text or "{}"
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # Try to extract JSON from markdown code blocks
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[1].split("```")[0].strip()
            try:
                return json.loads(text)
            except json.JSONDecodeError:
                return {}

    async def stream(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = 0.8,
        max_tokens: int = 2048,
    ) -> AsyncGenerator[str, None]:
        """Streaming generation for chat responses."""
        config = types.GenerateContentConfig(
            temperature=temperature,
            max_output_tokens=max_tokens,
            system_instruction=system_instruction,
        )
        async for chunk in self.client.aio.models.generate_content_stream(
            model=self.model,
            contents=prompt,
            config=config,
        ):
            if chunk.text:
                yield chunk.text


# Singleton
_gemini_client: GeminiClient | None = None


def get_gemini_client() -> GeminiClient:
    global _gemini_client
    if _gemini_client is None:
        _gemini_client = GeminiClient()
    return _gemini_client
