# Secure Academic Task Calendar - Backend Dockerfile

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (if you later need build tools, add them here)
RUN apt-get update && apt-get install -y --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Gunicorn will serve the Flask app in production.
# Our Flask factory is `create_app` inside app.py, so we use the `--factory` flag.
# Cloud Run usually injects PORT, but we default to 8080.
ENV PORT=8080

EXPOSE 8080

CMD ["gunicorn", "--bind=0.0.0.0:8080", "--workers=2", "--timeout=120", "--factory", "app:create_app"]

