"""
Configuration module for the Secure Academic Task Calendar backend.

All sensitive values should be provided via a real `.env` file and MUST
NOT be committed to version control.
"""

import os
from dataclasses import dataclass

from dotenv import load_dotenv


load_dotenv()


@dataclass
class Config:
    """Base configuration loaded from environment variables."""

    # Use your real MongoDB Atlas SRV connection string in the `.env` file.
    # Example:
    # MONGO_URI=mongodb+srv://testuser:testpassword123@cluster0.vulsn3z.mongodb.net/
    MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    MONGO_DB_NAME: str = os.getenv("MONGO_DB_NAME", "secure_academic_task_calendar")

    # Secret key used to validate admin access (do not expose in frontend).
    # You requested to use "Enter" as the admin secret. We default to "Enter"
    # if no environment variable is set so the app works out-of-the-box, but
    # you can override it in a real `.env` as ADMIN_SECRET_KEY=YourSecret.
    ADMIN_SECRET_KEY: str = os.getenv("ADMIN_SECRET_KEY", "Enter")

    # Secret used to sign short-lived JWT tokens.
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "change-me-in-production")

    # Allowed frontend origin for CORS.
    FRONTEND_ORIGIN: str = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")


def get_config() -> Config:
    """Helper to obtain a strongly-typed configuration object."""

    return Config()

