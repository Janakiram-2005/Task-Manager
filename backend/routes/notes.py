"""
Notes API – shared bulletin board notes stored in MongoDB.

Public routes:
  GET  /api/notes        – list all non-expired notes
  POST /api/notes        – post a new note (any user)

Protected routes (admin JWT required):
  DELETE /api/notes/<id> – delete a note
"""

from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from flask import Blueprint, current_app, jsonify, request

from models.task_model import parse_iso_datetime
from routes.auth import require_auth

notes_bp = Blueprint("notes", __name__)


def _get_col():
    return current_app.db["notes"]


def _serialize(doc):
    doc = dict(doc)
    doc["_id"] = str(doc["_id"])
    for field in ("createdAt", "expiresAt"):
        if field in doc and isinstance(doc[field], datetime):
            doc[field] = (
                doc[field].astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
            )
    return doc


@notes_bp.get("/notes")
def get_notes():
    """Return all notes that have not yet expired."""
    col = _get_col()
    now = datetime.now(timezone.utc)
    # Also clean up expired notes while here
    col.delete_many({"expiresAt": {"$lte": now}})
    docs = list(col.find({"expiresAt": {"$gt": now}}).sort("createdAt", -1))
    return jsonify([_serialize(d) for d in docs])


@notes_bp.post("/notes")
def add_note():
    """Any visitor can post a note. Requires body and expiresAt."""
    payload = request.get_json(silent=True) or {}

    body = str(payload.get("body", "")).strip()
    if not body:
        return jsonify({"error": "body is required"}), 400

    title = str(payload.get("title", "Note")).strip()[:100] or "Note"

    expires_str = payload.get("expiresAt")
    if not expires_str:
        return jsonify({"error": "expiresAt is required"}), 400

    try:
        expires_at = parse_iso_datetime(expires_str)
    except Exception:
        return jsonify({"error": "Invalid expiresAt format. Use ISO-8601."}), 400

    now = datetime.now(timezone.utc)
    if expires_at <= now:
        return jsonify({"error": "expiresAt must be in the future"}), 400

    doc = {
        "title":     title,
        "body":      body[:2000],
        "createdAt": now,
        "expiresAt": expires_at,
    }

    col = _get_col()
    result = col.insert_one(doc)
    created = col.find_one({"_id": result.inserted_id})
    return jsonify(_serialize(created)), 201


@notes_bp.delete("/notes/<note_id>")
@require_auth
def delete_note(note_id: str):
    """Admin-only: hard-delete a note by ID."""
    try:
        oid = ObjectId(note_id)
    except InvalidId:
        return jsonify({"error": "Invalid note ID"}), 400

    col = _get_col()
    result = col.delete_one({"_id": oid})
    if result.deleted_count == 0:
        return jsonify({"error": "Note not found"}), 404

    return jsonify({"deleted": True})
