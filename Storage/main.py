from fastapi import FastAPI, Body, HTTPException
from pathlib import Path
from fastapi.responses import PlainTextResponse

app = FastAPI()

LOG_PATH = Path("vstorage/requests.log")
LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
LOG_PATH.touch(exist_ok=True)

@app.get("/")
def root():
  return {"message": "Storage Service is running"}

@app.post("/log", response_class=PlainTextResponse)
def create_log(log: str = Body(..., media_type="text/plain")):
  try:
    with LOG_PATH.open("a") as log_file:
      log_file.write(log + "\n")
  except Exception as e:
    raise HTTPException(status_code=500, detail="Error writing log")
  return PlainTextResponse(log + "\n")

@app.get("/log", response_class=PlainTextResponse)
def get_logs():
  try:
    content = LOG_PATH.read_text(encoding="utf-8")
  except OSError as e:
    raise HTTPException(status_code=500, detail=f"Failed to read log: {e}")
    # Return the whole log as text/plain
  return PlainTextResponse(content or "")