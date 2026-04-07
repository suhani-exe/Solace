from app.models.schemas.chat import EntityExtraction
from app.services.llm.gemini_client import get_gemini_client


ENTITY_SYSTEM_PROMPT = """You are an entity extraction specialist for a mental health support chatbot. Extract meaningful entities from the user's message that are important for maintaining conversational context across sessions.

Entity types:
- person: People mentioned (e.g., "my mom", "Rahul", "my therapist", "my boss")
- event: Events or situations (e.g., "the exam", "the breakup", "job interview")
- place: Locations (e.g., "college", "home", "the hospital")
- concept: Abstract concepts relevant to their mental state (e.g., "anxiety about future", "relationship with food")

For each entity, also identify emotional tags — the emotional context associated with this entity:
e.g., mom: ["source_of_pressure", "recent_conflict"] or exam: ["anxiety", "overwhelm"]

RULES:
- Only extract entities that are MEANINGFUL for ongoing emotional context.
- Don't extract generic words.
- Resolve references: "he" or "she" should be connected to previously named entities if possible.
- Keep entity names consistent and human-readable.

Respond with valid JSON only."""


class EntityExtractor:
    """Extracts named entities and their emotional context from messages."""

    def __init__(self):
        self.client = get_gemini_client()

    async def extract(self, message: str, existing_entities: list[dict] = None) -> EntityExtraction:
        existing_context = ""
        if existing_entities:
            existing_context = f"\n\nAlready known entities for this user:\n{existing_entities}"

        prompt = f"""Extract entities from this message:

User message: "{message}"
{existing_context}

Return JSON with this exact structure:
{{
    "entities": [
        {{
            "name": "entity name",
            "type": "person|event|place|concept",
            "emotional_tags": ["tag1", "tag2"],
            "context": "brief context of how this entity relates to the user"
        }}
    ]
}}

If no meaningful entities are found, return {{"entities": []}}"""

        try:
            result = await self.client.generate_json(
                prompt=prompt,
                system_instruction=ENTITY_SYSTEM_PROMPT,
                temperature=0.2,
            )
            return EntityExtraction(entities=result.get("entities", []))
        except Exception as e:
            print(f"EntityExtractor error: {e}")
            return EntityExtraction()
