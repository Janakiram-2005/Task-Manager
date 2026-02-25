"""
Admin authentication routes.

Implements a simple secret-based admin flow:
- Client submits a secret key via `/api/verify-secret`
- If it matches the backend's ADMIN_SECRET_KEY, a short-lived JWT
  token (10 minutes) is issued
- All mutating routes must require this token
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict

import jwt
from flask import Blueprint, current_app, jsonify, request

from config import get_config

auth_bp = Blueprint("auth", __name__)


def create_jwt(payload: Dict[str, Any], expires_in_minutes: int = 10) -> str:
    """Create a signed JWT token with a short expiration time."""

    now = datetime.now(timezone.utc)
    exp = now + timedelta(minutes=expires_in_minutes)
    payload = {**payload, "iat": int(now.timestamp()), "exp": int(exp.timestamp())}
    secret = current_app.config["JWT_SECRET_KEY"]
    token = jwt.encode(payload, secret, algorithm="HS256")
    return token


def verify_jwt(token: str) -> Dict[str, Any]:
    """Verify a JWT token and return its payload if valid."""

    secret = current_app.config["JWT_SECRET_KEY"]
    decoded = jwt.decode(token, secret, algorithms=["HS256"])
    return decoded


def require_auth(fn):
    """
    Decorator to enforce JWT-based admin authentication on mutating routes.
    """

    from functools import wraps

    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return (
                jsonify({"error": "Unauthorized", "message": "Missing bearer token"}),
                401,
            )

        token = auth_header.split(" ", 1)[1].strip()
        try:
            verify_jwt(token)
        except jwt.ExpiredSignatureError:
            return (
                jsonify({"error": "Unauthorized", "message": "Token has expired"}),
                401,
            )
        except jwt.InvalidTokenError:
            return (
                jsonify({"error": "Unauthorized", "message": "Invalid token"}),
                401,
            )

        return fn(*args, **kwargs)

    return wrapper


@auth_bp.post("/verify-secret")
def verify_secret():
    """
    Verify the admin secret key and return a temporary JWT token.
    """

    cfg = get_config()
    payload = request.get_json(silent=True) or {}
    secret = payload.get("secret")

    if not isinstance(secret, str) or not secret:
        return jsonify({"error": "Invalid secret"}), 400

    if secret != cfg.ADMIN_SECRET_KEY:
        return jsonify({"error": "Invalid secret key"}), 401

    token = create_jwt({"role": "admin"})
    return jsonify({"token": token, "expires_in_minutes": 10})


