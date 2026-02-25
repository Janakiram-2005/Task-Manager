from datetime import datetime
import os

from flask import Flask, jsonify
from flask_cors import CORS
from pymongo import MongoClient

from config import get_config
from routes import api_bp
from routes.auth import auth_bp
from routes.tasks import tasks_bp
from routes.task_requests import task_requests_bp
from scheduler import attach_reminder_scheduler


def create_app() -> Flask:
    """
    Application factory for the Secure Academic Task Calendar backend.

    - Loads configuration from environment variables
    - Initializes MongoDB client and attaches DB handle to `app`
    - Registers blueprints for API routes
    - Configures CORS
    - Starts APScheduler job for deadline reminders
    """

    config = get_config()

    app = Flask(__name__)

    # 🔐 Secret keys
    app.config["JWT_SECRET_KEY"] = config.JWT_SECRET_KEY

    # 🌍 CORS - Explicit allowed origins (wildcard cannot be used with credentials)
    allowed_origins = [
        "https://gen-lang-client-0508301847.web.app",
        config.FRONTEND_ORIGIN,   # reads from env var FRONTEND_ORIGIN (defaults to localhost:5173)
    ]
    CORS(app,
         resources={r"/*": {"origins": allowed_origins}},
         supports_credentials=True,
         allow_headers=["Content-Type", "Authorization"],
         methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
         )

    # 🗄️ MongoDB Connection
    mongo_uri = os.environ.get("MONGO_URI")
    mongo_db_name = os.environ.get("MONGO_DB_NAME")

    client = MongoClient(
        mongo_uri,
        serverSelectionTimeoutMS=5000,
        connectTimeoutMS=5000,
    )
    db = client[mongo_db_name]

    # Attach DB to app
    app.db = db

    # 🛣️ Register Blueprints
    app.register_blueprint(api_bp, url_prefix="/api")
    app.register_blueprint(auth_bp, url_prefix="/api")
    app.register_blueprint(tasks_bp, url_prefix="/api")
    app.register_blueprint(task_requests_bp, url_prefix="/api")

    # ⏰ Attach Reminder Scheduler
    attach_reminder_scheduler(app)

    # ❤️ Health Check Route (Very Important for Cloud Run)
    @app.route("/health")
    def health():
        return jsonify(
            {
                "status": "ok",
                "timestamp": datetime.utcnow().isoformat(),
            }
        ), 200

    return app