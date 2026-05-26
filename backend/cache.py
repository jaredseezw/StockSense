"""
cache.py — Simple in-memory TTL cache
======================================
Avoids hammering Yahoo Finance on every request.

TTL defaults (tunable via .env):
  CACHE_TTL_QUOTE      = 60s   (price changes every minute in market hours)
  CACHE_TTL_METRICS    = 300s  (fundamentals change rarely)
  CACHE_TTL_CHART      = 120s  (chart data — 2 min is fine)
  CACHE_TTL_MOVERS     = 120s  (top gainers/losers — refresh every 2 min)
  CACHE_TTL_INDICES    = 60s   (index values — 1 min)
  CACHE_TTL_SEARCH     = 3600s (search index is static, refresh hourly)
"""

import time
import os
from threading import Lock

_store: dict = {}
_lock = Lock()

# TTL constants (seconds) — read from env so you can tune without redeploying
TTL_QUOTE   = int(os.getenv("CACHE_TTL_QUOTE",   60))
TTL_METRICS = int(os.getenv("CACHE_TTL_METRICS", 300))
TTL_CHART   = int(os.getenv("CACHE_TTL_CHART",   120))
TTL_MOVERS  = int(os.getenv("CACHE_TTL_MOVERS",  120))
TTL_INDICES = int(os.getenv("CACHE_TTL_INDICES", 60))
TTL_SEARCH  = int(os.getenv("CACHE_TTL_SEARCH",  3600))


def get(key: str):
    """Return cached value or None if missing / expired."""
    with _lock:
        entry = _store.get(key)
        if entry is None:
            return None
        value, expires_at = entry
        if time.time() > expires_at:
            del _store[key]
            return None
        return value


def set(key: str, value, ttl: int):
    """Store value with a TTL (seconds)."""
    with _lock:
        _store[key] = (value, time.time() + ttl)


def delete(key: str):
    with _lock:
        _store.pop(key, None)


def clear():
    with _lock:
        _store.clear()


def cached(key: str, ttl: int, fn):
    """
    Helper: return cached value if fresh, otherwise call fn(), cache, and return.

    Usage:
        data = cached("stock:AAPL:quote", TTL_QUOTE, lambda: fetch_quote("AAPL"))
    """
    hit = get(key)
    if hit is not None:
        return hit
    value = fn()
    set(key, value, ttl)
    return value
