from fastapi import FastAPI, Request
from fastapi.responses import PlainTextResponse
from pathlib import Path
import time
import shutil
import httpx
import os

app = FastAPI()

START_TIME = time.time()

VSTORAGE_DIR = Path("/app/vstorage")
VSTORAGE_FILE = VSTORAGE_DIR / "requests.log"
VSTORAGE_DIR.mkdir(parents=True, exist_ok=True)
VSTORAGE_FILE.touch(exist_ok=True)

STORAGE_URL = os.getenv("STORAGE_URL", "http://storage:8300")

def get_timestamp():
  return time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime()) + "Z"

def get_runtime():
  hours = (time.time() - START_TIME) / 3600.0
  return f"{hours:.2f}"

_df_cache_ts = 0.0
_df_cache_mb = "0"

def disk_free_root_mb():
  """
  Cache the free space result for 5 seconds to avoid excessive calls,
  similar to the Node df cache.
  """
  global _df_cache_ts, _df_cache_mb
  now = time.time()
  if now - _df_cache_ts < 5.0:
      return _df_cache_mb

  usage = shutil.disk_usage("/") # root filesystem
  free_mb = round(usage.free / (1024 * 1024))
  _df_cache_mb = str(free_mb)
  _df_cache_ts = now
  return _df_cache_mb

def get_status_record():
  free_space = disk_free_root_mb()
  return f"{get_timestamp()}²: uptime {get_runtime()} hours, free disk in root: {free_space} MBytes"

def append_to_volume(line):
  try:
    with VSTORAGE_FILE.open("a") as log_file:
      log_file.write(line + "\n")
  except Exception as e:
    print(f"Error writing to storage: {e}")

async def post_to_storage(line):
  try:
    async with httpx.AsyncClient(timeout=3.0) as client:
      await client.post(f"{STORAGE_URL}/log", content=line, headers={"Content-Type": "text/plain"})
  except Exception as e:
    print(f"Error posting to storage: {e}")

async def save_logs(line):
  append_to_volume(line)
  await post_to_storage(line)

@app.get("/status", response_class=PlainTextResponse)
async def status(request: Request):
  state = get_status_record()
  line = f"{state} | {request.method} {request.url.path} -> 200"

  print(line)
  await save_logs(state) 
  return PlainTextResponse(state + "\n")

@app.get("/")
def root():
  return {"message": "Service 2 is running"}
