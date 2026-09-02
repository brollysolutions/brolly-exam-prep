"""CORS safety: a wildcard origin list must never be paired with
allow_credentials=True (Starlette would otherwise reflect any Origin header
back verbatim with credentials allowed -- see app/main.py)."""

from __future__ import annotations

import importlib

from httpx import ASGITransport, AsyncClient


async def test_wildcard_cors_does_not_echo_origin_with_credentials(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "*")

    import app.config as config_module
    import app.main as main_module

    importlib.reload(config_module)
    importlib.reload(main_module)

    try:
        transport = ASGITransport(app=main_module.app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.get("/health", headers={"Origin": "http://evil.example.com"})

        assert resp.status_code == 200
        # Reflects the literal wildcard, never the requesting Origin.
        assert resp.headers.get("access-control-allow-origin") == "*"
        # Credentials must not be allowed alongside a wildcard origin.
        assert "access-control-allow-credentials" not in resp.headers
    finally:
        # Restore the default (explicit-origins) app for every other test.
        monkeypatch.delenv("CORS_ORIGINS", raising=False)
        importlib.reload(config_module)
        importlib.reload(main_module)


async def test_default_cors_allows_credentials_for_explicit_origins(monkeypatch):
    monkeypatch.delenv("CORS_ORIGINS", raising=False)

    import app.config as config_module
    import app.main as main_module

    importlib.reload(config_module)
    importlib.reload(main_module)

    try:
        allowed_origin = config_module.settings.cors_origin_list[0]
        transport = ASGITransport(app=main_module.app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.get("/health", headers={"Origin": allowed_origin})

        assert resp.status_code == 200
        assert resp.headers.get("access-control-allow-origin") == allowed_origin
        assert resp.headers.get("access-control-allow-credentials") == "true"
    finally:
        importlib.reload(config_module)
        importlib.reload(main_module)
