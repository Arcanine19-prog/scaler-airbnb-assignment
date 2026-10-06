"""FastAPI application entry point."""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .routers import bookings, host, listings, meta, reviews, wishlist
from .routers.meta import UPLOAD_DIR
from .seed import seed_if_empty


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Create tables and seed sample data on first boot (the hosted SQLite file may be fresh).
    seed_if_empty()
    yield


app = FastAPI(
    title="Airbnb Clone API",
    version="1.0.0",
    description="Listings, search, availability, bookings, reviews, wishlists and host management.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

API_PREFIX = "/api"
for module in (listings, bookings, reviews, wishlist, host, meta):
    app.include_router(module.router, prefix=API_PREFIX)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/api/health", tags=["meta"])
def health() -> dict[str, str]:
    return {"status": "ok"}
