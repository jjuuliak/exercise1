# Dockerfile for Storage service
FROM python:3.12-slim

# Prevent Python from writing .pyc files and enable unbuffered logs
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py ./main.py

# Create data dir and ensure non-root user can write it
RUN useradd -m -u 10001 appuser \
  && mkdir -p /app/data \
  && chown -R appuser:appuser /app
USER appuser

# Persist ./data (which is /app/data in the container)
VOLUME ["/app/data"]

EXPOSE 8300
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8300"]
