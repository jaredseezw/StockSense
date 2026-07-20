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
import json
from datetime import datetime
from threading import Lock

_store: dict = {}
# Last successfully fetched value per key, kept around indefinitely (no TTL)
# so we can serve it as a fallback if a live fetch fails (e.g. market closed,
# Yahoo Finance hiccup). Overwritten every time a fetch succeeds.
#
# Also persisted to disk (_LAST_GOOD_FILE). Free-tier hosts (Render/Railway)
# restart the process often — an in-memory-only cache means every restart
# wipes the fallback and the very next request after a restart shows raw
# "N/A" if the live fetch fails too. Persisting to disk means we always have
# *some* recent price to fall back to, even right after a cold start.
_last_good: dict = {}
_lock = Lock()

_LAST_GOOD_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".last_good_cache.json")


def _load_last_good_from_disk():
    try:
        with open(_LAST_GOOD_FILE, "r") as f:
            raw = json.load(f)
        # Stored as {key: [value, fetched_at]}
        return {k: (v[0], v[1]) for k, v in raw.items()}
    except Exception:
        return {}


def _save_last_good_to_disk():
    try:
        serialisable = {k: [v[0], v[1]] for k, v in _last_good.items()}
        with open(_LAST_GOOD_FILE, "w") as f:
            json.dump(serialisable, f)
    except Exception:
        pass  # disk persistence is best-effort — never let it break a request


_last_good.update(_load_last_good_from_disk())

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


def _mark_stale(value, fetched_at: float):
    """Tag dict responses with staleness info so the frontend can show
    'last known price as of ...' instead of silently showing old data."""
    if isinstance(value, dict):
        value = dict(value)
        value["stale"] = True
        value["as_of"] = datetime.fromtimestamp(fetched_at).isoformat()
    return value


def get_last_good(key: str):
    """Return the last successfully-fetched value for a key (no staleness
    tagging), or None if we've never fetched it successfully. Useful for
    patching individual fields (e.g. dividendYield) that a live fetch
    dropped even though the fetch overall succeeded — Yahoo intermittently
    omits specific fundamentals fields without failing the whole request."""
    with _lock:
        entry = _last_good.get(key)
    return entry[0] if entry else None


def cached(key: str, ttl: int, fn):
    """
    Helper: return cached value if fresh, otherwise call fn(), cache, and return.
    If fn() raises (e.g. market closed, upstream API hiccup) and we have a
    previously successful value for this key, serve that stale value instead
    of failing outright — better a slightly old price than a broken page.

    Usage:
        data = cached("stock:AAPL:quote", TTL_QUOTE, lambda: fetch_quote("AAPL"))
    """
    hit = get(key)
    if hit is not None:
        return hit

    try:
        value = fn()
        set(key, value, ttl)
        with _lock:
            _last_good[key] = (value, time.time())
            _save_last_good_to_disk()
        return value
    except Exception:
        with _lock:
            fallback = _last_good.get(key)
        if fallback is not None:
            stale_value, fetched_at = fallback
            return _mark_stale(stale_value, fetched_at)
        raise
