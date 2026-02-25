"""
Entry point for the Secure Academic Task Calendar backend.

This application exposes a REST API consumed by the React frontend.
"""

from datetime import datetime

from flask import Flask, jsonify
from flask_cors import CORS
from pymongo import MongoClient

from config import get_config
from routes import api_bp
from routes.auth import auth_bp
from routes.tasks import tasks_bp
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
    app.config["JWT_SECRET_KEY"] = config.JWT_SECRET_KEY

    # Configure CORS for the frontend origin.
    CORS(
        app,
        resources={r"/api/*": {"origins": config.FRONTEND_ORIGIN}},
        supports_credentials=False,
        expose_headers=["Content-Type"],
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    )

    # Initialize MongoDB client and share DB handle on the app object.
    mongo_client = MongoClient(config.MONGO_URI)
    app.mongo_client = mongo_client
    app.db = mongo_client[config.MONGO_DB_NAME]

    # Register blueprints under the /api prefix.
    app.register_blueprint(api_bp)
    app.register_blueprint(auth_bp, url_prefix="/api")
    app.register_blueprint(tasks_bp, url_prefix="/api")

    # Health check endpoint for monitoring.
    @app.route("/health", methods=["GET"])
    def health_check():
        return jsonify(
            {
                "status": "ok",
                "timestamp": datetime.utcnow().isoformat() + "Z",
            }
        )

    # Error handlers for consistent JSON responses.
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({"error": "Bad Request", "message": str(error)}), 400

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "Not Found", "message": "Resource not found"}), 404

    @app.errorhandler(500)
    def internal_error(error):
        return (
            jsonify({"error": "Internal Server Error", "message": "Unexpected error"}),
            500,
        )

    # Attach and start APScheduler reminder job.
    attach_reminder_scheduler(app)

    return app


if __name__ == "__main__":
    app = create_app()
    # In production you would run behind a WSGI server like gunicorn.
    app.run(host="0.0.0.0", port=8080, debug=True)

