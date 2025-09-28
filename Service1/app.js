import express from "express";
import axios from "axios"; 
import { exec as execCb } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";
import moment from "moment";

const exec = promisify(execCb);
const app = express();

const port = process.env.PORT || 8199;
const SERVICE2_URL = process.env.SERVICE2_URL || 'http://service2:8200';
const STORAGE_URL = process.env.STORAGE_URL || 'http://storage:8300';

const VSTORAGE_DIR  = "/app/vstorage";
const VSTORAGE_FILE = path.join(VSTORAGE_DIR, "requests.log");

// ensure vstorage exists (container has perms from Dockerfile)
try {
  fs.mkdirSync(VSTORAGE_DIR, { recursive: true });
  if (!fs.existsSync(VSTORAGE_FILE)) fs.writeFileSync(VSTORAGE_FILE, "");
} catch {
  console.error("Failed to create vstorage");
}

app.use(express.text({ type: "*/*" }));

function getTimestamp() {
  return moment().format("YYYY-MM-DDTHH:mm:ss[Z]");
}

function getRunTime() {
  return (process.uptime() / 3600).toFixed(2);
}

// This is from ChatGPT
// Cache disk free space for 5 seconds to avoid excessive calls
let dfCache = { ts: 0, mb: "0" };
async function diskFreeRootMB() {
  if (Date.now() - dfCache.ts < 5000) return dfCache.mb; // cache 5s
  const { stdout } = await exec("df -kP /");
  const parts = stdout.trim().split("\n")[1].trim().split(/\s+/);
  const availableKiB = parseInt(parts[3], 10);
  const mb = Math.round(availableKiB / 1024).toString();
  dfCache = { ts: Date.now(), mb };
  return mb;
}

async function getStatusRecord() {
  const freeSpace = await diskFreeRootMB();
  return `${getTimestamp()}¹: uptime ${getRunTime()} hours, free disk in root: ${freeSpace} MBytes`;
}

function appendToVolume(line) {
  try {
    fs.appendFileSync(VSTORAGE_FILE, line + "\n");
  } catch { 
    throw new Error("Failed to write to vstorage");
  }
}

async function postToStorage(line) {
  try {
    await axios.post(`${STORAGE_URL}/log`, line, {
      headers: { "Content-Type": "text/plain" },
      timeout: 3000
    });
  } catch {
    throw new Error("Failed to post to Storage");
  }
}

async function saveLogs(line) {
  appendToVolume(line);
  await postToStorage(line);
}

app.use(async (req, res, next) => {
  const state = await getStatusRecord();
  const line = `${state} | ${req.method} ${req.originalUrl}`;
  res.on("finish", () => {
    const finalLine = `${line} -> ${res.statusCode}`;
    console.log(finalLine);
    saveLogs(state);
  });
  next();
});


app.get("/", (_req, res) => {
  res.type("text/plain").send("Service1 is running\n");
});

app.get("/status", async (_req, res) => {
  try {
    const state = await getStatusRecord();
    const r = await axios.get(`${SERVICE2_URL}/status`, {
      timeout: 3000,
      responseType: "text"
    });
    res.type("text/plain").status(r.status).send(state + " / " + r.data);
  } catch (err) {
    res.status(502).type("text/plain").send(`Service2 status error: ${err}\n`);
  }
});

app.get("/log", async(_req, res) => {
  try {
    const r = await axios.get(`${STORAGE_URL}/log`, {
      timeout: 3000,
      responseType: "text"
    });
    console.log(r.data);
    res.type("text/plain").status(r.status).send(r.data);
  } catch (e) {
    res.status(502).type("text/plain").send("Bad gateway to Storage\n");
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Service1 listening on ${port}`);
});
