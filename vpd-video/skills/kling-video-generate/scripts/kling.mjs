#!/usr/bin/env node
// kling.mjs — Klinggiare API wrapper cho agent vpd-video. Node 18+, không cần thư viện ngoài.
// Key đọc từ biến môi trường KLING_API_KEY (Paperclip secret). Script KHÔNG BAO GIỜ in key ra.
//
// Lệnh:
//   system | prices [--model M] | wallet | job --job ID
//   quote    --aspect 16:9 --duration 5 [--model 2.6] [--resolution 720p] [--t2v] [--tail]
//   generate --project-dir DIR --shot ID --aspect A --duration S --max-cost VND
//            (--prompt "..." | --prompt-file F) [--image F] [--end-image F]
//            [--model M] [--resolution R] [--max-attempts N] [--timeout-min M] [--dry-run]
//   resume   --project-dir DIR --job ID [--timeout-min M]
//   spend    --project-dir DIR
//
// Mã thoát: 0 OK | 2 sai tham số | 3 hết lượt thử | 4 bảo trì | 5 vượt chi phí
//           6 job còn chạy (dùng resume) | 7 job thất bại | 8 lỗi API

import { readFile, mkdir, appendFile } from 'node:fs/promises';
import { existsSync, createWriteStream } from 'node:fs';
import { basename, extname, join, dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const BASE = process.env.KLING_BASE_URL || 'https://klinggiare.com';
const KEY = process.env.KLING_API_KEY;
const EXIT = { USAGE: 2, ATTEMPT_LIMIT: 3, MAINTENANCE: 4, BUDGET: 5, TIMEOUT: 6, JOB_FAILED: 7, API: 8 };
const TERMINAL = new Set(['success', 'failed', 'canceled']);
const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function out(obj, code = 0) { process.stdout.write(JSON.stringify(obj, null, 2) + '\n'); process.exit(code); }
function fail(code, error, extra = {}) { out({ ok: false, error, ...extra }, code); }

function parseArgs(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t.startsWith('--')) {
      const k = t.slice(2), n = argv[i + 1];
      if (n === undefined || n.startsWith('--')) a[k] = true; else { a[k] = n; i++; }
    } else a._.push(t);
  }
  return a;
}

// Gọi API: tự retry 429 (theo Retry-After), 5xx, lỗi mạng và IDEMPOTENCY_IN_PROGRESS.
async function call(path, { method = 'GET', body, headers = {}, auth = true, retries = 5 } = {}) {
  let delay = 1000;
  for (let attempt = 0; ; attempt++) {
    const h = { ...headers };
    if (auth) {
      if (!KEY) fail(EXIT.USAGE, 'MISSING_KLING_API_KEY', { hint: 'Gán secret KLING_API_KEY cho agent trong Paperclip. Không dán key vào task.' });
      h.Authorization = `Bearer ${KEY}`;
    }
    const isForm = body instanceof FormData;
    if (body && !isForm) h['Content-Type'] = 'application/json';
    let res;
    try {
      res = await fetch(BASE + path, { method, headers: h, body: isForm ? body : body ? JSON.stringify(body) : undefined });
    } catch (e) {
      if (attempt < retries) { await sleep(delay + Math.random() * 500); delay = Math.min(delay * 2, 60000); continue; }
      throw Object.assign(new Error(`network: ${e.message}`), { code: 'NETWORK' });
    }
    if (res.ok) return res.status === 204 ? null : res.json();
    let code = 'UNKNOWN', message = res.statusText;
    try { const p = await res.json(); code = p?.error?.code ?? code; message = p?.error?.message ?? message; } catch {}
    const retryable = res.status === 429 || res.status >= 500 || code === 'IDEMPOTENCY_IN_PROGRESS';
    if (retryable && attempt < retries) {
      const ra = Number(res.headers.get('Retry-After') || 0) * 1000;
      await sleep(Math.max(ra, delay) + Math.random() * 500); delay = Math.min(delay * 2, 60000); continue;
    }
    throw Object.assign(new Error(message), { status: res.status, code, requestId: res.headers.get('X-Request-ID') });
  }
}

// Sổ ghi (ledger): mọi lần tạo, chi phí, kết quả của từng shot.
const ledgerPath = (dir) => join(dir, 'production', 'kling-ledger.jsonl');
async function readLedger(dir) {
  const p = ledgerPath(dir);
  if (!existsSync(p)) return [];
  return (await readFile(p, 'utf8')).split('\n').filter(Boolean).map((l) => JSON.parse(l));
}
async function log(dir, entry) {
  const p = ledgerPath(dir);
  await mkdir(dirname(p), { recursive: true });
  await appendFile(p, JSON.stringify({ ts: new Date().toISOString(), ...entry }) + '\n');
}

function settingsFrom(a) {
  const s = { model: String(a.model || '2.6'), resolution: String(a.resolution || '720p') };
  if (a.duration) s.durationSeconds = Number(a.duration);
  if (a.aspect) s.aspectRatio = String(a.aspect);
  if (a.audio) s.audio = true;
  return s;
}

async function upload(paths) {
  const form = new FormData();
  for (const p of paths) {
    const type = MIME[extname(p).toLowerCase()];
    if (!type) fail(EXIT.USAGE, 'UNSUPPORTED_IMAGE', { path: p, allowed: Object.keys(MIME) });
    form.append('files', new Blob([await readFile(p)], { type }), basename(p));
  }
  const r = await call('/api/v1/ext/uploads', { method: 'POST', body: form });
  return r.objects.map((o) => o.objectKey);
}

async function waitJob(id, timeoutMs) {
  const end = Date.now() + timeoutMs;
  let job = await call(`/api/v1/ext/jobs/${id}`);
  while (!TERMINAL.has(job.status) && Date.now() < end) { await sleep(8000); job = await call(`/api/v1/ext/jobs/${id}`); }
  return job;
}

async function download(id, file) {
  const v = await call(`/api/v1/ext/jobs/${id}/video-url`); // bản đã xoá watermark
  await mkdir(dirname(file), { recursive: true });
  const r = await fetch(v.url);
  if (!r.ok) throw Object.assign(new Error(`download HTTP ${r.status}`), { code: 'DOWNLOAD_FAILED' });
  await pipeline(Readable.fromWeb(r.body), createWriteStream(file));
  return file;
}

const NO_RETRY = new Set(['MOTION_NO_CHARACTER', 'MOTION_VIDEO_TOO_LONG', 'MOTION_VIDEO_TOO_SHORT']);
const FIX_INPUT = new Set(['INPUT_INVALID', 'POLICY_VIOLATION_NO_REFUND']);
function advise(code) {
  if (code === 'RECOVERY_AMBIGUOUS') return 'wait_do_not_recreate';
  if (FIX_INPUT.has(code)) return 'fix_prompt_or_image';
  if (NO_RETRY.has(code)) return 'fix_input_media';
  return 'retry_allowed';
}

async function finish(dir, shot, attempt, job) {
  if (!TERMINAL.has(job.status)) {
    await log(dir, { type: 'pending', shot, attempt, jobId: job.id, status: job.status });
    fail(EXIT.TIMEOUT, 'JOB_STILL_RUNNING', { shot, attempt, jobId: job.id, status: job.status, next: `resume --project-dir "${dir}" --job ${job.id}` });
  }
  const amount = job.priceSnapshot?.amount ?? 0;
  if (job.status === 'success') {
    const file = join(dir, 'renders', 'video', `${shot}_v${attempt}.mp4`);
    await download(job.id, file);
    await log(dir, { type: 'success', shot, attempt, jobId: job.id, cost: amount, file });
    out({ ok: true, shot, attempt, jobId: job.id, costVND: amount, file });
  }
  const ec = job.errorCode === 'AUTO_REFUNDED' ? (job.originalErrorCode || 'AUTO_REFUNDED') : (job.errorCode || job.status.toUpperCase());
  const charged = job.errorCode === 'POLICY_VIOLATION_NO_REFUND' ? amount : 0;
  await log(dir, { type: 'failed', shot, attempt, jobId: job.id, status: job.status, errorCode: ec, cost: charged });
  fail(EXIT.JOB_FAILED, 'JOB_FAILED', { shot, attempt, jobId: job.id, status: job.status, errorCode: ec, chargedVND: charged, advice: advise(ec) });
}

async function generate(a) {
  const dir = resolve(a['project-dir'] || '.');
  const shot = a.shot;
  if (!shot || !/^[A-Za-z0-9_-]+$/.test(shot)) fail(EXIT.USAGE, 'INVALID_SHOT_ID', { hint: 'Ví dụ: SC01_SH03' });
  let prompt = typeof a.prompt === 'string' ? a.prompt : '';
  if (a['prompt-file']) prompt = (await readFile(a['prompt-file'], 'utf8')).trim();
  if (!prompt) fail(EXIT.USAGE, 'MISSING_PROMPT');
  if (!a.aspect || !a.duration) fail(EXIT.USAGE, 'MISSING_ASPECT_OR_DURATION');
  if (a['max-cost'] === undefined) fail(EXIT.USAGE, 'MISSING_MAX_COST');
  const maxCost = Number(a['max-cost']);
  const maxAttempts = Number(a['max-attempts'] || 2);

  const ledger = await readLedger(dir);
  const used = ledger.filter((e) => e.type === 'created' && e.shot === shot).length;
  if (used >= maxAttempts) fail(EXIT.ATTEMPT_LIMIT, 'ATTEMPT_LIMIT_REACHED', { shot, attemptsUsed: used, maxAttempts });

  const sys = await call('/api/v1/system/status', { auth: false });
  if (sys.maintenance) fail(EXIT.MAINTENANCE, 'MAINTENANCE_MODE', { message: sys.maintenanceMessage });

  const settings = settingsFrom(a);
  const images = a.image ? [String(a.image)] : [];
  const endImg = a['end-image'] ? String(a['end-image']) : null;
  if (endImg && !images.length) fail(EXIT.USAGE, 'END_IMAGE_REQUIRES_IMAGE');
  const t2v = images.length === 0;

  const qBody = { settings, imageCount: 1 };
  if (t2v) qBody.textToVideo = true;
  if (endImg) qBody.tailImage = true;
  const quote = await call('/api/v1/ext/batches/quote', { method: 'POST', body: qBody });
  if (quote.totalAmount > maxCost) fail(EXIT.BUDGET, 'OVER_MAX_COST', { quotedVND: quote.totalAmount, maxCostVND: maxCost });
  if (a['dry-run']) out({ ok: true, dryRun: true, shot, mode: t2v ? 'text_to_video' : 'image_to_video', settings, quotedVND: quote.totalAmount, attemptsUsed: used, maxAttempts });

  const imageKeys = images.length ? await upload(images) : [];
  const endKey = endImg ? (await upload([endImg]))[0] : undefined;
  const attempt = used + 1;
  const idem = randomUUID();
  await log(dir, { type: 'create', shot, attempt, idempotencyKey: idem, quotedVND: quote.totalAmount, settings, prompt, image: images[0], endImage: endImg });

  const body = { prompt, settings, expectedTotal: quote.totalAmount };
  if (imageKeys.length) body.imageKeys = imageKeys;
  if (endKey) body.endFrameKey = endKey;
  let batch;
  try {
    batch = await call('/api/v1/ext/batches', { method: 'POST', body, headers: { 'Idempotency-Key': idem } });
  } catch (e) {
    await log(dir, { type: 'create_error', shot, attempt, code: e.code });
    throw e;
  }
  const job = batch.jobs[0];
  await log(dir, { type: 'created', shot, attempt, jobId: job.id, batchId: batch.id });
  await finish(dir, shot, attempt, await waitJob(job.id, Number(a['timeout-min'] || 20) * 60000));
}

async function resume(a) {
  const dir = resolve(a['project-dir'] || '.');
  const id = Number(a.job);
  const c = (await readLedger(dir)).find((e) => e.type === 'created' && e.jobId === id);
  if (!c) fail(EXIT.USAGE, 'JOB_NOT_IN_LEDGER', { jobId: id });
  await finish(dir, c.shot, c.attempt, await waitJob(id, Number(a['timeout-min'] || 20) * 60000));
}

async function spend(a) {
  const dir = resolve(a['project-dir'] || '.');
  const shots = {}; let total = 0;
  for (const e of await readLedger(dir)) {
    if (!['created', 'success', 'failed'].includes(e.type)) continue;
    const s = (shots[e.shot] ||= { attempts: 0, costVND: 0, status: 'running' });
    if (e.type === 'created') s.attempts++;
    else { s.costVND += e.cost || 0; total += e.cost || 0; s.status = e.type; if (e.file) s.file = e.file; }
  }
  out({ ok: true, totalVND: total, shots });
}

async function main() {
  const a = parseArgs(process.argv.slice(2));
  switch (a._[0]) {
    case 'system': return out(await call('/api/v1/system/status', { auth: false }));
    case 'prices': {
      const p = (await call('/api/v1/prices', { auth: false })).filter((r) => r.enabled && (!a.model || r.model === String(a.model)));
      return out(p.map(({ model, operation, durationSeconds, aspectRatio, resolution, audio, textToVideo, tailImage, motionControl, amount, description }) =>
        ({ model, operation, durationSeconds, aspectRatio, resolution, audio, textToVideo, tailImage, motionControl, amountVND: amount, description })));
    }
    case 'wallet': return out(await call('/api/v1/ext/wallet'));
    case 'job': return out(await call(`/api/v1/ext/jobs/${Number(a.job)}`));
    case 'quote': {
      const b = { settings: settingsFrom(a), imageCount: 1 };
      if (a.t2v) b.textToVideo = true;
      if (a.tail) b.tailImage = true;
      return out(await call('/api/v1/ext/batches/quote', { method: 'POST', body: b }));
    }
    case 'generate': return generate(a);
    case 'resume': return resume(a);
    case 'spend': return spend(a);
    default: fail(EXIT.USAGE, 'UNKNOWN_COMMAND', { commands: ['system', 'prices', 'wallet', 'job', 'quote', 'generate', 'resume', 'spend'] });
  }
}

main().catch((e) => fail(EXIT.API, e.code || 'ERROR', { message: e.message, httpStatus: e.status, requestId: e.requestId }));
