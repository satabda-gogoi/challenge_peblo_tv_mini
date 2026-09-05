FROM python:3.12-slim

# Prevent Python from buffering stdout/stderr and writing .pyc
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install required system packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY pyproject.toml .
RUN pip install --upgrade pip && \
    pip install .

# Copy backend codebase
COPY . .

# Ensure storage directories exist
RUN mkdir -p data/catalogue/uploads

EXPOSE 8000

# Auto-seed database and start FastAPI server
CMD ["sh", "-c", "python -m app.seed && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
