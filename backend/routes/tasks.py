"""
Task-related API routes.

Public routes:
- GET /api/tasks
- GET /api/tasks/date/<date>
- GET /api/tasks/upcoming
- GET /api/tasks/search?q=

Protected routes (require JWT admin token):
- POST /api/tasks
- PUT /api/tasks/<id>
- DELETE /api/tasks/<id>
- PUT /api/tasks/complete/<id>
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from bson import ObjectId
from bson.errors import InvalidId
from flask import Blueprint, current_app, jsonify, request

from models.task_model import (
    PRIORITY_VALUES,
    STATUS_VALUES,
    get_task_by_id,
    get_tasks_collection,
    serialize_task,
    validate_task_payload,
)
from routes.auth import require_auth

tasks_bp = Blueprint("tasks", __name__)


def _parse_date(date_str: str) -> datetime:
    """Parse a YYYY-MM-DD string to a UTC datetime at midnight."""

    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        raise ValueError("Invalid date format, expected YYYY-MM-DD")
    return dt.replace(tzinfo=timezone.utc)


@tasks_bp.get("/tasks")
def list_tasks():
    """
    List all tasks with optional filtering by status, priority, or subject.
    """

    col = get_tasks_collection(current_app.db)
    query: Dict[str, Any] = {}

    status = request.args.get("status")
    priority = request.args.get("priority")
    subject = request.args.get("subject")

    if status in STATUS_VALUES:
        query["status"] = status
    if priority in PRIORITY_VALUES:
        query["priority"] = priority
    if subject:
        query["subject"] = subject

    tasks = [serialize_task(t) for t in col.find(query).sort("deadline_datetime", 1)]
    return jsonify(tasks)


@tasks_bp.get("/tasks/date/<date_str>")
def tasks_by_date(date_str: str):
    """
    Get tasks whose deadline falls on a specific date (YYYY-MM-DD).
    """

    try:
        start = _parse_date(date_str)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    end = start + timedelta(days=1)
    col = get_tasks_collection(current_app.db)
    cursor = col.find(
        {
            "deadline_datetime": {
                "$gte": start,
                "$lt": end,
            }
        }
    ).sort("deadline_datetime", 1)

    tasks = [serialize_task(t) for t in cursor]
    return jsonify(tasks)


@tasks_bp.get("/tasks/upcoming")
def upcoming_tasks():
    """
    Get upcoming tasks ordered by deadline.
    """

    now = datetime.now(timezone.utc)
    horizon = now + timedelta(days=30)
    col = get_tasks_collection(current_app.db)
    cursor = col.find(
        {
            "deadline_datetime": {"$gte": now, "$lte": horizon},
        }
    ).sort("deadline_datetime", 1)
    tasks = [serialize_task(t) for t in cursor]
    return jsonify(tasks)


@tasks_bp.get("/tasks/search")
def search_tasks():
    """
    Search tasks by query string across title, description, and subject.
    """

    q = request.args.get("q", "").strip()
    if not q:
        return jsonify([])  # empty search

    col = get_tasks_collection(current_app.db)
    regex = {"$regex": q, "$options": "i"}
    cursor = col.find(
        {"$or": [{"title": regex}, {"description": regex}, {"subject": regex}]}
    ).sort("deadline_datetime", 1)

    tasks = [serialize_task(t) for t in cursor]
    return jsonify(tasks)


@tasks_bp.post("/tasks")
@require_auth
def create_task():
    """
    Create a new task (admin only).
    """

    payload = request.get_json(silent=True) or {}
    validated, errors = validate_task_payload(payload, partial=False)
    if errors:
        return jsonify({"errors": errors}), 400

    now = datetime.now(timezone.utc)
    doc: Dict[str, Any] = {
        "title": validated["title"],
        "description": validated.get("description", ""),
        "subject": validated["subject"],
        "priority": validated["priority"],
        "start_datetime": validated.get("start_datetime"),
        "end_datetime": validated.get("end_datetime"),
        "deadline_datetime": validated["deadline_datetime"],
        "reminder_enabled": validated.get("reminder_enabled", True),
        "status": validated.get("status", "Pending"),
        "created_at": now,
        "updated_at": now,
    }

    col = get_tasks_collection(current_app.db)
    result = col.insert_one(doc)
    created = col.find_one({"_id": result.inserted_id})
    return jsonify(serialize_task(created)), 201


@tasks_bp.put("/tasks/<task_id>")
@require_auth
def update_task(task_id: str):
    """
    Update an existing task (admin only).
    """

    col = get_tasks_collection(current_app.db)
    existing = get_task_by_id(col, task_id)
    if not existing:
        return jsonify({"error": "Task not found"}), 404

    payload = request.get_json(silent=True) or {}
    validated, errors = validate_task_payload(payload, partial=True)
    if errors:
        return jsonify({"errors": errors}), 400

    if not validated:
        return jsonify({"error": "No valid fields to update"}), 400

    validated["updated_at"] = datetime.now(timezone.utc)
    try:
        oid = ObjectId(task_id)
    except InvalidId:
        return jsonify({"error": "Invalid task ID"}), 400

    col.update_one({"_id": oid}, {"$set": validated})
    updated = col.find_one({"_id": oid})
    return jsonify(serialize_task(updated))


@tasks_bp.delete("/tasks/<task_id>")
@require_auth
def delete_task(task_id: str):
    """
    Delete a task (admin only).
    """

    col = get_tasks_collection(current_app.db)
    try:
        oid = ObjectId(task_id)
    except InvalidId:
        return jsonify({"error": "Invalid task ID"}), 400

    result = col.delete_one({"_id": oid})
    if result.deleted_count == 0:
        return jsonify({"error": "Task not found"}), 404

    return jsonify({"deleted": True})


@tasks_bp.put("/tasks/complete/<task_id>")
@require_auth
def complete_task(task_id: str):
    """
    Mark a task as completed (admin only).
    """

    col = get_tasks_collection(current_app.db)
    try:
        oid = ObjectId(task_id)
    except InvalidId:
        return jsonify({"error": "Invalid task ID"}), 400

    now = datetime.now(timezone.utc)
    result = col.update_one(
        {"_id": oid},
        {
            "$set": {
                "status": "Completed",
                "updated_at": now,
                "reminder_enabled": False,
            }
        },
    )

    if result.matched_count == 0:
        return jsonify({"error": "Task not found"}), 404

    updated = col.find_one({"_id": oid})
    return jsonify(serialize_task(updated))


