"""
Task Request routes – allow any user to submit a task request for admin review.

Public routes:
  POST /api/task-requests             – submit a new task request
  GET  /api/task-requests             – list pending requests (admin only)

Protected routes (admin JWT token required):
  POST /api/task-requests/<id>/approve – approve → inserts into tasks collection
  POST /api/task-requests/<id>/reject  – mark as rejected
"""

from datetime import datetime, timezone
from typing import Any, Dict

from bson import ObjectId
from bson.errors import InvalidId
from flask import Blueprint, current_app, jsonify, request

from models.task_model import (
    get_tasks_collection,
    parse_iso_datetime,
    serialize_task,
    validate_task_payload,
    PRIORITY_VALUES,
)
from routes.auth import require_auth

task_requests_bp = Blueprint("task_requests", __name__)


# ─────────────────────────────  helpers  ──────────────────────────────────────

def _get_requests_col():
    return current_app.db["task_requests"]


def _serialize_request(doc: Dict[str, Any]) -> Dict[str, Any]:
    doc = dict(doc)
    doc["_id"] = str(doc["_id"])
    for field in ("deadline_datetime", "created_at"):
        if field in doc and isinstance(doc[field], datetime):
            doc[field] = (
                doc[field].astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
            )
    return doc


# ──────────────────────────────  routes  ──────────────────────────────────────

@task_requests_bp.post("/task-requests")
def submit_request():
    """
    Any visitor can submit a task request.
    Required body fields: title, subject, priority, deadline_datetime
    Optional: description, section (1-19), submitter_name
    """
    payload = request.get_json(silent=True) or {}

    # Basic field validation reusing the task model validator
    validated, errors = validate_task_payload(payload, partial=False)
    if errors:
        return jsonify({"errors": errors}), 400

    submitter_name = str(payload.get("submitter_name", "Anonymous")).strip()[:80]

    now = datetime.now(timezone.utc)
    doc: Dict[str, Any] = {
        "title": validated["title"],
        "description": validated.get("description", ""),
        "subject": validated["subject"],
        "priority": validated["priority"],
        "section": validated.get("section"),
        "deadline_datetime": validated["deadline_datetime"],
        "submitter_name": submitter_name,
        "status": "Pending",          # request status: Pending / Approved / Rejected
        "created_at": now,
    }

    col = _get_requests_col()
    result = col.insert_one(doc)
    created = col.find_one({"_id": result.inserted_id})
    return jsonify(_serialize_request(created)), 201


@task_requests_bp.get("/task-requests")
@require_auth
def list_requests():
    """
    Return all pending task requests (admin only).
    """
    col = _get_requests_col()
    status_filter = request.args.get("status", "Pending")
    docs = list(col.find({"status": status_filter}).sort("created_at", -1))
    return jsonify([_serialize_request(d) for d in docs])


@task_requests_bp.post("/task-requests/<request_id>/approve")
@require_auth
def approve_request(request_id: str):
    """
    Approve a pending task request – creates a real task in the tasks collection.
    """
    try:
        oid = ObjectId(request_id)
    except InvalidId:
        return jsonify({"error": "Invalid request ID"}), 400

    req_col = _get_requests_col()
    req_doc = req_col.find_one({"_id": oid})
    if not req_doc:
        return jsonify({"error": "Request not found"}), 404
    if req_doc.get("status") != "Pending":
        return jsonify({"error": "Request is not pending"}), 400

    # Build the task document from the approved request
    now = datetime.now(timezone.utc)
    task_doc: Dict[str, Any] = {
        "title": req_doc["title"],
        "description": req_doc.get("description", ""),
        "subject": req_doc["subject"],
        "priority": req_doc["priority"],
        "section": req_doc.get("section"),
        "deadline_datetime": req_doc["deadline_datetime"],
        "start_datetime": None,
        "end_datetime": None,
        "reminder_enabled": True,
        "status": "Pending",
        "created_at": now,
        "updated_at": now,
        "approved_from_request": request_id,
    }
    tasks_col = get_tasks_collection(current_app.db)
    task_result = tasks_col.insert_one(task_doc)
    created_task = tasks_col.find_one({"_id": task_result.inserted_id})

    # Mark the request as approved
    req_col.update_one({"_id": oid}, {"$set": {"status": "Approved", "approved_at": now}})

    return jsonify({"task": serialize_task(created_task)}), 201


@task_requests_bp.post("/task-requests/<request_id>/reject")
@require_auth
def reject_request(request_id: str):
    """
    Reject a pending task request.
    """
    try:
        oid = ObjectId(request_id)
    except InvalidId:
        return jsonify({"error": "Invalid request ID"}), 400

    req_col = _get_requests_col()
    result = req_col.update_one(
        {"_id": oid, "status": "Pending"},
        {"$set": {"status": "Rejected", "rejected_at": datetime.now(timezone.utc)}},
    )
    if result.matched_count == 0:
        return jsonify({"error": "Request not found or already processed"}), 404

    return jsonify({"rejected": True})
