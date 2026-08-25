"""Managed-platform entrypoint.

The real application lives in `app/main.py` (modular package) so the same
codebase can be started on Railway with `uvicorn app.main:app`.
"""
from app.main import app  # noqa: F401
