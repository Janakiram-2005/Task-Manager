"""
Flask blueprints root for the Secure Academic Task Calendar API.
"""

from flask import Blueprint, current_app, jsonify, request

from routes.auth import require_auth
from scheduler import pop_pending_reminders

api_bp = Blueprint("api", __name__, url_prefix="/api")


@api_bp.route("/reminders", methods=["GET"])
def get_pending_reminders():
    """
    Return a list of task IDs for which a reminder should be shown.

    The frontend can poll this endpoint periodically and use the
    browser Notification API to display notifications.
    """

    tasks = pop_pending_reminders()
    return jsonify({"tasks": tasks})


def _get_metrics_collection():
    return current_app.db["metrics"]


def _get_or_create_metrics_doc():
    col = _get_metrics_collection()
    doc = col.find_one({"_id": "stats"})
    if not doc:
        doc = {"_id": "stats", "visitors": 0, "downloads": 0}
        col.insert_one(doc)
    return doc


@api_bp.route("/metrics", methods=["GET"])
def get_metrics():
    """
    Public endpoint to read visitor and download counters.
    """

    doc = _get_or_create_metrics_doc()
    return jsonify(
        {
            "visitors": int(doc.get("visitors", 0)),
            "downloads": int(doc.get("downloads", 0)),
        }
    )


@api_bp.route("/metrics/visit", methods=["POST"])
def increment_visit():
    """
    Increment visitor counter when a new visitor loads the app.
    """

    col = _get_metrics_collection()
    doc = col.find_one_and_update(
        {"_id": "stats"},
        {"$inc": {"visitors": 1}},
        upsert=True,
        return_document=True,
    )
    return jsonify(
        {
            "visitors": int(doc.get("visitors", 0)),
            "downloads": int(doc.get("downloads", 0)),
        }
    )


@api_bp.route("/metrics/download", methods=["POST"])
def increment_download():
    """
    Increment download counter whenever admin exports tasks (CSV/PDF).
    """

    col = _get_metrics_collection()
    doc = col.find_one_and_update(
        {"_id": "stats"},
        {"$inc": {"downloads": 1}},
        upsert=True,
        return_document=True,
    )
    return jsonify(
        {
            "visitors": int(doc.get("visitors", 0)),
            "downloads": int(doc.get("downloads", 0)),
        }
    )


@api_bp.route("/metrics/reset", methods=["POST"])
@require_auth
def reset_metrics():
    """
    Admin-only endpoint to reset metrics counters to zero.
    """

    col = _get_metrics_collection()
    col.update_one(
        {"_id": "stats"}, {"$set": {"visitors": 0, "downloads": 0}}, upsert=True
    )
    return jsonify({"visitors": 0, "downloads": 0})

