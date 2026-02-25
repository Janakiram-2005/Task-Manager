"""
APScheduler integration for deadline reminders.

The scheduler periodically scans tasks and records reminder events in an
in-memory cache. The frontend polls a dedicated endpoint and turns these
events into browser notifications.
"""

from typing import Dict, List

from apscheduler.schedulers.background import BackgroundScheduler
from flask import Flask

from models.task_model import find_upcoming_for_reminders, get_tasks_collection

# Simple in-memory cache of task summaries for which a reminder should be shown.
REMINDER_CACHE: Dict[str, Dict] = {}


def _check_deadlines_and_fill_cache(app: Flask) -> None:
    """Background job that checks tasks close to their deadlines."""

    with app.app_context():
        col = get_tasks_collection(app.db)
        tasks = find_upcoming_for_reminders(col)
        for t in tasks:
            task_id = str(t["_id"])
            REMINDER_CACHE[task_id] = {
                "id": task_id,
                "title": t.get("title", "Upcoming task"),
                "subject": t.get("subject", ""),
                "deadline_datetime": t.get("deadline_datetime"),
            }


def attach_reminder_scheduler(app: Flask) -> None:
    """
    Attach and start a background scheduler that checks for upcoming
    task reminders every minute.
    """

    scheduler = BackgroundScheduler()
    scheduler.add_job(
        _check_deadlines_and_fill_cache,
        "interval",
        minutes=1,
        args=[app],
        id="deadline_reminder_job",
        replace_existing=True,
    )
    scheduler.start()


def pop_pending_reminders() -> List[Dict]:
    """
    Return and clear the list of task summaries that just triggered reminders.
    """

    pending = list(REMINDER_CACHE.values())
    REMINDER_CACHE.clear()
    return pending


