"""
Task model helpers and validation for interacting with MongoDB.

MongoDB schema (per requirements + extensions):
- _id
- title (string)
- description (string)
- subject (string)
- priority (Low / Medium / High)
- start_datetime (ISO format, optional)
- end_datetime (ISO format, optional)
- deadline_datetime (ISO format)
- reminder_enabled (boolean)
- status (Pending / Completed)
- created_at
- updated_at
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from bson import ObjectId
from bson.errors import InvalidId
from pymongo.collection import Collection


PRIORITY_VALUES = {"Low", "Medium", "High"}
STATUS_VALUES = {"Pending", "Completed"}


def get_tasks_collection(db) -> Collection:
    """Return the MongoDB collection used for tasks."""

    return db["tasks"]


def parse_iso_datetime(value: str) -> datetime:
    """
    Parse an ISO 8601 datetime string into a UTC-aware datetime.

    Handles strings with a trailing 'Z' (e.g. from `toISOString()` in JS).
    """

    if not isinstance(value, str):
        raise ValueError("deadline_datetime must be a string in ISO format")

    normalized = value.strip()
    if normalized.endswith("Z"):
        normalized = normalized.replace("Z", "+00:00")

    dt = datetime.fromisoformat(normalized)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt


def validate_task_payload(
    data: Dict[str, Any], partial: bool = False
) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, str]]]:
    """
    Validate incoming task payload.

    Returns (validated_data, errors). If `errors` is not None, caller
    should treat the payload as invalid.
    """

    errors: Dict[str, str] = {}
    validated: Dict[str, Any] = {}

    def require_field(field: str):
        if field not in data or data[field] in (None, ""):
            errors[field] = "This field is required."

    if not partial:
        for field in ("title", "subject", "priority", "deadline_datetime"):
            require_field(field)

    title = data.get("title")
    if title is not None:
        if not isinstance(title, str) or not title.strip():
            errors["title"] = "Title must be a non-empty string."
        else:
            validated["title"] = title.strip()

    description = data.get("description")
    if description is not None:
        if not isinstance(description, str):
            errors["description"] = "Description must be a string."
        else:
            validated["description"] = description.strip()

    subject = data.get("subject")
    if subject is not None:
        if not isinstance(subject, str) or not subject.strip():
            errors["subject"] = "Subject must be a non-empty string."
        else:
            validated["subject"] = subject.strip()

    priority = data.get("priority")
    if priority is not None:
        if priority not in PRIORITY_VALUES:
            errors["priority"] = f"Priority must be one of {sorted(PRIORITY_VALUES)}."
        else:
            validated["priority"] = priority

    now = datetime.now(timezone.utc)
    today_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)

    # Optional start and end datetimes
    start_raw = data.get("start_datetime")
    end_raw = data.get("end_datetime")
    deadline_raw = data.get("deadline_datetime")

    start_dt: Optional[datetime] = None
    end_dt: Optional[datetime] = None
    deadline_dt: Optional[datetime] = None

    if start_raw is not None:
        try:
            start_dt = parse_iso_datetime(start_raw)
            if start_dt < today_start:
                errors["start_datetime"] = "Start date cannot be earlier than today."
            else:
                validated["start_datetime"] = start_dt
        except Exception:
            errors["start_datetime"] = "Invalid ISO datetime format."

    if end_raw is not None:
        try:
            end_dt = parse_iso_datetime(end_raw)
            if end_dt < today_start:
                errors["end_datetime"] = "End date cannot be earlier than today."
            else:
                validated["end_datetime"] = end_dt
        except Exception:
            errors["end_datetime"] = "Invalid ISO datetime format."

    if deadline_raw is not None:
        try:
            deadline_dt = parse_iso_datetime(deadline_raw)
            # Do not allow creating or updating tasks with deadlines before today.
            if deadline_dt < today_start:
                errors["deadline_datetime"] = (
                    "Deadline cannot be earlier than today."
                )
            else:
                validated["deadline_datetime"] = deadline_dt
        except Exception:
            errors["deadline_datetime"] = "Invalid ISO datetime format."

    # If both start and end provided, ensure logical ordering
    if start_dt and end_dt and end_dt < start_dt:
        errors["end_datetime"] = "End date cannot be earlier than start date."

    reminder_enabled = data.get("reminder_enabled")
    if reminder_enabled is not None:
        if not isinstance(reminder_enabled, bool):
            errors["reminder_enabled"] = "reminder_enabled must be a boolean."
        else:
            validated["reminder_enabled"] = reminder_enabled

    status = data.get("status")
    if status is not None:
        if status not in STATUS_VALUES:
            errors["status"] = f"Status must be one of {sorted(STATUS_VALUES)}."
        else:
            validated["status"] = status

    section = data.get("section")
    if section is not None:
        try:
            section_int = int(section)
            if section_int < 1 or section_int > 19:
                errors["section"] = "Section must be between 1 and 19."
            else:
                validated["section"] = section_int
        except (TypeError, ValueError):
            errors["section"] = "Section must be a number between 1 and 19."

    if errors:
        return None, errors
    return validated, None


def serialize_task(task: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert a MongoDB task document into a JSON-serializable dict.
    """

    task["_id"] = str(task["_id"])
    for field in (
        "start_datetime",
        "end_datetime",
        "deadline_datetime",
        "created_at",
        "updated_at",
    ):
        if field in task and isinstance(task[field], datetime):
            task[field] = task[field].astimezone(timezone.utc).isoformat().replace(
                "+00:00", "Z"
            )
    return task


def get_task_by_id(col: Collection, task_id: str) -> Optional[Dict[str, Any]]:
    """Fetch a single task by its string ID."""

    try:
        oid = ObjectId(task_id)
    except InvalidId:
        return None
    return col.find_one({"_id": oid})


def find_upcoming_for_reminders(col: Collection) -> List[Dict[str, Any]]:
    """
    Find tasks whose reminder window is about to trigger.

    For simplicity, this helper returns tasks that are 1 day or 1 hour
    away from their deadline, within a one-minute window from now.
    """

    now = datetime.now(timezone.utc)
    one_minute = timedelta(minutes=1)

    windows = [
        (now + timedelta(days=1), now + timedelta(days=1) + one_minute),
        (now + timedelta(hours=1), now + timedelta(hours=1) + one_minute),
    ]

    or_conditions = []
    for start, end in windows:
        or_conditions.append(
            {
                "deadline_datetime": {"$gte": start, "$lt": end},
                "reminder_enabled": True,
            }
        )

    if not or_conditions:
        return []

    cursor = col.find({"$or": or_conditions})
    return list(cursor)


