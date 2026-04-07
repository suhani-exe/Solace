from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.db.base import Base
from app.db.session import engine
from app.api.routes import auth, chat, sessions, health, user

# Import all models so they're registered with Base
from app.models.db.user import User
from app.models.db.session import Session
from app.models.db.message import Message
from app.models.db.entity import UserEntity
from app.models.db.knowledge import KnowledgeChunk
from app.models.db.checkin import CheckinLog

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Database tables created/verified")
    yield
    # Shutdown
    await engine.dispose()
    print("🔴 Database connection closed")


app = FastAPI(
    title="Solace API",
    description="AI companion for mental wellness",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(auth.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(sessions.router, prefix="/api")
app.include_router(health.router, prefix="/api")
app.include_router(user.router, prefix="/api")


@app.get("/")
async def root():
    return {
        "message": "Welcome to Solace — An AI companion for mental wellness",
        "docs": "/docs",
    }
