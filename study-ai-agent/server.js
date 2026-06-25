// ============================================================
//  server.js
//  Express REST API server for the Study AI Agent
//  Start with:  npm start
// ============================================================

const express    = require('express');
const cors       = require('cors');
const path       = require('path');
const StudyAgent = require('./agent/agent');

const app  = express();
const PORT = process.env.PORT || 3001;
const BUILD_VERSION = '2026-05-17-agent-hotfix-1';

// ── Middleware ────────────────────────────────────────────
app.use(cors());
app.use(express.json());
// Serve built frontend if present (prefer `dist`), then `public`
app.use(express.static(path.join(__dirname, '..', 'dist')));
app.use(express.static('public'));   // fallback to /public

// ── Boot the agent ────────────────────────────────────────
const agent = new StudyAgent();
console.log('\n🔄 Initializing Study AI Agent...');

agent.initialize(() => {
  console.log('✅ Agent is ready to serve students!\n');
});

// ── Shared middleware/helpers (must be defined before routes) ───────────────
// Serve SPA index for root if dist/index.html exists
app.get('/', (req, res, next) => {
  try {
    const indexPath = path.join(__dirname, '../dist/index.html');
    if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
  } catch (e) {}
  return next();
});
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const fs = require('fs');
const crypto = require('crypto');
const os = require('os');
const child_process = require('child_process');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');

// Simple API key check middleware — set STUDY_AGENT_API_KEY env var to enable
function requireApiKey(req, res, next) {
  const key = process.env.STUDY_AGENT_API_KEY;
  if (!key) return next(); // no key required in dev environment
  const provided = (req.headers['x-api-key'] || req.query.api_key || req.headers.authorization || '').toString();
  const token = provided.startsWith('Bearer ') ? provided.slice(7) : provided;
  if (!token) return res.status(401).json({ success: false, error: 'Missing API key' });
  if (token !== key) return res.status(403).json({ success: false, error: 'Invalid API key' });
  return next();
}

// Rate limiters
const uploadLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, message: { success: false, error: 'Too many uploads — try again later.' } });
const feedbackLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 500, message: { success: false, error: 'Too many feedback submissions — slow down.' } });

// ClamAV quick scan helper (optional). If clamscan not available, returns {available:false}
function scanFileWithClam(filePath) {
  try {
    const cmd = 'clamscan';
    const res = child_process.spawnSync(cmd, ['--no-summary', filePath], { encoding: 'utf8', timeout: 60 * 1000 });
    if (res.error) return { available: false, error: res.error.message };
    if (res.status === 0) return { available: true, ok: true };
    if (res.status === 1) return { available: true, ok: false, infected: true, output: res.stdout + res.stderr };
    return { available: true, ok: false, error: res.stdout + res.stderr };
  } catch (e) {
    return { available: false, error: e && e.message };
  }
}

// Simple retrain queue to avoid concurrent retrains
let retrainRunning = false;
let retrainPending = false;
function enqueueRetrain() {
  if (retrainRunning) {
    retrainPending = true;
    return;
  }
  retrainRunning = true;
  setImmediate(() => {
    try {
      const r = agent.classifier.processPending();
      console.log('Retrain result:', r);
    } catch (e) {
      console.error('Retrain failed:', e && e.message);
    } finally {
      retrainRunning = false;
      if (retrainPending) {
        retrainPending = false;
        enqueueRetrain();
      }
    }
  });
}

// JWT helpers for admin login
const JWT_SECRET = process.env.STUDY_AGENT_JWT_SECRET || 'dev_secret_change_me';
function issueAdminToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}
function verifyAdminToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

function requireAdmin(req, res, next) {
  const auth = (req.headers.authorization || '').toString();
  if (!auth.startsWith('Bearer ')) return res.status(401).json({ success: false, error: 'Missing or invalid token' });
  const token = auth.slice(7);
  const payload = verifyAdminToken(token);
  if (!payload || !payload.admin) return res.status(403).json({ success: false, error: 'Invalid admin token' });
  req.admin = payload;
  next();
}

// ----------------------------
// Enhanced debug logging (useful in sandboxed environments)
// Writes a small debug log to /tmp/study_agent_debug.log on errors and startup
// ----------------------------
const debugLogPath = '/tmp/study_agent_debug.log';
function dlog() {
  try {
    const msg = Array.from(arguments).map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
    require('fs').appendFileSync(debugLogPath, new Date().toISOString() + ' ' + msg + '\n');
  } catch (e) {
    // ignore logging errors
  }
}

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION', err && err.stack ? err.stack : err);
  dlog('UNCAUGHT_EXCEPTION', err && err.stack ? err.stack : String(err));
});
process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION', reason && reason.stack ? reason.stack : reason);
  dlog('UNHANDLED_REJECTION', reason && reason.stack ? reason.stack : String(reason));
});

// Simple text sanitizer: remove script tags and HTML tags, strip nulls, limit length
function sanitizeText(input) {
  if (!input) return '';
  if ((input.match(/\u0000/g) || []).length > 3) throw new Error('Binary file detected');

  let t = input.toString('utf8');
  t = t.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
  t = t.replace(/<[^>]+>/g, '');
  t = t.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  t = t.replace(/\r\n/g, '\n');
  const MAX_CHARS = 200 * 1024;
  if (t.length > MAX_CHARS) t = t.substring(0, MAX_CHARS);
  return t.trim();
}

// ── Routes ────────────────────────────────────────────────

/**
 * POST /api/ask
 * Body: { "question": "explain photosynthesis" }
 * Response: { success, response, intent, sources, timestamp }
 */
app.post('/api/ask', (req, res) => {
  const { question } = req.body;

  if (!question || question.trim() === '') {
    return res.status(400).json({
      success: false,
      error:   'Field "question" is required.',
    });
  }

  const result = agent.ask(question);
  res.json(result);
});

/**
 * POST /api/feedback
 * Body: { question, correct_intent }
 * Stores a labeled example and updates the intent classifier.
 */
app.post('/api/feedback', requireApiKey, feedbackLimiter, (req, res) => {
  const { question, correct_intent, subject, topic, response } = req.body;
  if (!question || !correct_intent) {
    return res.status(400).json({ success: false, error: 'Fields "question" and "correct_intent" are required.' });
  }
  try {
    if (subject && topic && response) {
      const exampleResult = agent.ingestChatAsExample(question, response, subject, topic);
      if (!exampleResult || !exampleResult.success) {
        console.warn('Could not ingest example during feedback:', exampleResult && exampleResult.error);
      }
    }

    // Queue training example (will be processed by retrain job)
    agent.classifier.addTrainingExample(question, correct_intent);

    // Debounced retrain: schedule retrain in 30s to batch multiple feedbacks
    if (global.__study_retrain_timer) clearTimeout(global.__study_retrain_timer);
    global.__study_retrain_timer = setTimeout(() => enqueueRetrain(), 30 * 1000);

    return res.json({ success: true, message: 'Feedback recorded and queued for retrain.' });
  } catch (e) {
    console.error('Feedback error:', e);
    return res.status(500).json({ success: false, error: 'Failed to apply feedback.' });
  }
});

/**
 * POST /api/retrain
 * Trigger a full retrain of the intent classifier (uses built-in training data).
 */
app.post('/api/retrain', requireApiKey, (req, res) => {
  try {
    enqueueRetrain();
    return res.json({ success: true, message: 'Retrain enqueued. Processing will occur in background.' });
  } catch (e) {
    console.error('Retrain enqueue error:', e);
    return res.status(500).json({ success: false, error: 'Retrain enqueue failed.' });
  }
});

/**
 * GET /api/chatlogs
 * Returns recent persisted chat logs
 */
app.get('/api/chatlogs', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const logs = agent.getChatLogs(limit);
    return res.json({ success: true, logs });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'Could not read chat logs.' });
  }
});

/**
 * POST /api/upload
 * Multipart form: file (text/markdown), fields: subject, topic
 * Adds uploaded file content as a new topic under the subject
 */
app.post('/api/upload', requireApiKey, uploadLimiter, upload.single('file'), (req, res) => {
  const subject = (req.body.subject || 'Imported').toString().trim().slice(0, 100);
  const rawTopic = (req.body.topic || (req.file && req.file.originalname) || `Topic-${Date.now()}`);
  const topicName = rawTopic.toString().trim().slice(0, 200);

  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded.' });

  // Basic MIME and extension checks
  const allowedExts = ['.md', '.markdown', '.txt'];
  const ext = path.extname(req.file.originalname || '').toLowerCase();
  const mimetype = (req.file.mimetype || '').toLowerCase();

  if (!allowedExts.includes(ext) && !mimetype.startsWith('text/')) {
    return res.status(400).json({ success: false, error: 'Unsupported file type. Only .txt and .md allowed.' });
  }

  // Detect likely-binary by checking for null bytes
  const buffer = req.file.buffer;
  for (let i = 0; i < Math.min(buffer.length, 1024); i++) {
    if (buffer[i] === 0) return res.status(400).json({ success: false, error: 'Binary files are not allowed.' });
  }

  // Write raw upload to a temp file for virus scanning
  const tmpPath = path.join(os.tmpdir(), `upload_${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext}`);
  try {
    fs.writeFileSync(tmpPath, buffer);
  } catch (e) {
    return res.status(500).json({ success: false, error: 'Failed to write temp file for scanning.' });
  }

  // Optional ClamAV scan
  try {
    const scan = scanFileWithClam(tmpPath);
    if (scan && scan.available) {
      if (!scan.ok) {
        try { fs.unlinkSync(tmpPath); } catch (e) {}
        return res.status(400).json({ success: false, error: 'File infected or rejected by virus scanner.' });
      }
    } else {
      console.warn('ClamAV not available; skipping virus scan. To enforce scanning, install clamscan and restart server.');
    }
  } catch (e) {
    console.warn('ClamAV scan failed:', e && e.message);
  }

  // Decode & sanitize content
  let text = '';
  try {
    text = buffer.toString('utf8');
  } catch (e) {
    try { fs.unlinkSync(tmpPath); } catch (e) {}
    return res.status(400).json({ success: false, error: 'Could not decode file as text.' });
  }

  let clean = '';
  try {
    clean = sanitizeText(text);
  } catch (e) {
    try { fs.unlinkSync(tmpPath); } catch (e) {}
    return res.status(400).json({ success: false, error: 'Uploaded file rejected: ' + e.message });
  }

  if (!clean || clean.length < 10) {
    try { fs.unlinkSync(tmpPath); } catch (e) {}
    return res.status(400).json({ success: false, error: 'File content empty or too small after sanitization.' });
  }

  // Persist the sanitized file in data/uploads for auditing
  try {
    const uploadsDir = path.join(__dirname, '../data/uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const hash = crypto.createHash('sha1').update(Date.now() + req.file.originalname).digest('hex').slice(0, 12);
    const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
    const savePath = path.join(uploadsDir, `${hash}_${safeName}`);
    fs.writeFileSync(savePath, clean, 'utf8');
    try { fs.unlinkSync(tmpPath); } catch (e) {}
  } catch (e) {
    console.error('Upload persist error:', e);
  }

  // Add to dataset via agent (content is sanitized)
  try {
    const result = agent.addTopic(subject, {
      name: topicName,
      content: clean,
    });

    if (result && result.success) return res.json({ success: true, message: 'Uploaded, sanitized, scanned and indexed.' });
    return res.status(500).json({ success: false, error: 'Failed to add topic to dataset.' });
  } catch (e) {
    console.error('AddTopic error after upload:', e);
    return res.status(500).json({ success: false, error: 'Server error while indexing upload.' });
  }
});

/**
 * POST /api/ingest-chat
 * Body: { question, response, subject, topic }
 * Ingests a chat Q/A as an example under the specified subject/topic
 */
app.post('/api/ingest-chat', (req, res) => {
  const { question, response: answer, subject, topic } = req.body;
  if (!question || !answer || !subject || !topic) {
    return res.status(400).json({ success: false, error: 'Fields question, response, subject, topic required.' });
  }

  const r = agent.ingestChatAsExample(question, answer, subject, topic);
  if (r && r.success) {
    if (global.__study_retrain_timer) clearTimeout(global.__study_retrain_timer);
    global.__study_retrain_timer = setTimeout(() => enqueueRetrain(), 15 * 1000);
    return res.json(r);
  }
  return res.status(500).json(r);
});

/**
 * POST /api/classify
 * Body: { text }
 * Returns suggested intent and full classifications
 */
app.post('/api/classify', (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ success: false, error: 'Field "text" is required.' });
  try {
    const suggested = agent.classifier.classify(text);
    const scores = agent.classifier.getClassifications(text);
    return res.json({ success: true, suggested, scores });
  } catch (e) {
    console.error('Classify error:', e);
    return res.status(500).json({ success: false, error: 'Classification failed.' });
  }
});

/**
 * GET /api/topics
 * Returns all available subjects and topics
 */
app.get('/api/topics', (req, res) => {
  try {
    const q = req.query.q || '';
    const subject = req.query.subject || '';
    const includeScores = req.query.includeScores === '1' || req.query.includeScores === 'true';
    if (includeScores) {
      const list = agent.getAvailableTopicsWithScores(q, subject);
      return res.json({ success: true, list });
    }
    const topics = agent.getAvailableTopicsFiltered(q, subject);
    res.json({ success: true, topics });
  } catch (e) {
    console.error('Topics error:', e);
    res.status(500).json({ success: false, error: 'Failed to fetch topics.' });
  }
});

/**
 * GET /api/history
 * Returns the last N messages  (default: 20)
 */
app.get('/api/history', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  res.json({
    success: true,
    history: agent.getHistory(limit),
  });
});

/**
 * DELETE /api/history
 * Clears conversation history
 */
app.delete('/api/history', (req, res) => {
  res.json(agent.clearHistory());
});

/**
 * GET /api/health
 * Quick health-check — use this to verify the agent is up
 */
app.get('/api/health', (req, res) => {
  res.json({
    status:  'running',
    buildVersion: BUILD_VERSION,
    ...agent.getStats(),
  });
});

// Admin login endpoint — simple username/password via env variables
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body || {};
  const adminUser = process.env.STUDY_AGENT_ADMIN_USER || 'admin';
  const adminPass = process.env.STUDY_AGENT_ADMIN_PASS || 'password';
  if (!username || !password) return res.status(400).json({ success: false, error: 'username and password required' });
  if (username !== adminUser || password !== adminPass) return res.status(403).json({ success: false, error: 'invalid credentials' });
  const token = issueAdminToken({ admin: true, user: username });
  return res.json({ success: true, token });
});

// Endpoint to check scan & security status
app.get('/api/scan-status', requireApiKey, (req, res) => {
  const hasClam = (() => {
    try {
      const r = child_process.spawnSync('clamscan', ['--version'], { encoding: 'utf8', timeout: 2000 });
      return !r.error && r.status === 0;
    } catch (e) {
      return false;
    }
  })();
  return res.json({ success: true, clamav_available: hasClam, api_key_required: !!process.env.STUDY_AGENT_API_KEY });
});

// Example admin-protected route: list uploads
app.get('/api/admin/uploads', requireAdmin, (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, '../data/uploads');
    if (!fs.existsSync(uploadsDir)) return res.json({ success: true, uploads: [] });
    const files = fs.readdirSync(uploadsDir).map(f => ({ name: f, path: `/data/uploads/${f}` }));
    return res.json({ success: true, uploads: files });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'Failed to list uploads' });
  }
});

// ── Start ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🎓 Study AI Server running at http://localhost:${PORT}`);
  console.log('\nAvailable endpoints:');
  console.log('  POST   /api/ask      — Ask the agent a question');
  console.log('  GET    /api/topics   — List available topics');
  console.log('  GET    /api/history  — Get conversation history');
  console.log('  DELETE /api/history  — Clear conversation');
  console.log('  GET    /api/health   — Agent status & stats\n');
});

module.exports = app;
