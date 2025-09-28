# Definition of the image for Service2
FROM python:3.9-slim
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py ./app.py

RUN useradd -m -u 10001 appuser && mkdir -p /app/vstorage && chown -R appuser:appuser /app
USER appuser

EXPOSE 8200
CMD ["python", "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8200"]