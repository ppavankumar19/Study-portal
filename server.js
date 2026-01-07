const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = 3000;

const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, 'data.json');
const VIDEO_DIR = path.join(ROOT, 'video');

// ==== SIMPLE ADMIN CREDS (change these) ====
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'secret123';
const COOKIE_NAME = 'study_admin';
const COOKIE_VALUE = 'ok';
// ===========================================

// ensure folders/files
if (!fs.existsSync(VIDEO_DIR)) fs.mkdirSync(VIDEO_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf8');

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser('change-this-secret-key'));

// static
app.use(express.static(ROOT));
app.use('/video', express.static(VIDEO_DIR));

// helpers
function readLessons() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function writeLessons(lessons) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(lessons, null, 2), 'utf8');
}

// multer upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, VIDEO_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ext || '.bin';
    const base = path
      .basename(file.originalname || 'media', ext)
      .replace(/[^a-z0-9-_]+/gi, '_')
      .slice(0, 60);

    cb(null, `${base}_${Date.now()}${safeExt}`);
  }
});
function allowedByExt(filename) {
  const ext = path.extname(filename).toLowerCase();
  return ['.mp4', '.m4a', '.mp4a', '.mp3', '.wav', '.webm', '.ogg'].includes(ext);
}
const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 500 },
  fileFilter: (req, file, cb) => {
    if (!allowedByExt(file.originalname || '')) {
      return cb(new Error('Unsupported file type. Use mp4/m4a/mp4a/mp3/wav/webm/ogg.'));
    }
    cb(null, true);
  }
});

// auth middleware
function requireAdmin(req, res, next) {
  const cookie = req.signedCookies[COOKIE_NAME];
  if (cookie === COOKIE_VALUE) return next();

  if (req.path === '/admin.html' || req.originalUrl.includes('admin.html')) {
    return res.sendFile(path.join(ROOT, 'admin-login.html'));
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

// routes
app.get('/', (req, res) => {
  res.sendFile(path.join(ROOT, 'index.html'));
});

app.get('/admin.html', requireAdmin, (req, res) => {
  res.sendFile(path.join(ROOT, 'admin.html'));
});

app.get('/admin-login', (req, res) => {
  res.sendFile(path.join(ROOT, 'admin-login.html'));
});

// login/logout
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    res.cookie(COOKIE_NAME, COOKIE_VALUE, {
      httpOnly: true,
      signed: true,
      sameSite: 'lax'
    });
    return res.json({ success: true });
  }
  return res.status(401).json({ error: 'Invalid credentials' });
});

app.post('/api/admin/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ success: true });
});

// lessons API
app.get('/api/lessons', (req, res) => {
  res.json(readLessons());
});

app.post('/api/lessons', requireAdmin, (req, res) => {
  const lessons = readLessons();
  const incoming = req.body || {};

  const title = String(incoming.title || '').trim();
  if (!title) return res.status(400).json({ error: 'Title is required' });

  const id = incoming.id ? Number(incoming.id) : null;

  const lesson = {
    id: id || Date.now(),
    title,
    description: String(incoming.description || ''),
    mediaFile: String(incoming.mediaFile || ''),
    resourceLink: String(incoming.resourceLink || ''),
    tasks: String(incoming.tasks || '')
  };

  const idx = lessons.findIndex(l => l.id === lesson.id);
  if (idx >= 0) lessons[idx] = lesson;
  else lessons.push(lesson);

  writeLessons(lessons);
  res.json({ success: true, lesson });
});

app.delete('/api/lessons/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const lessons = readLessons();
  const filtered = lessons.filter(l => l.id !== id);
  writeLessons(filtered);
  res.json({ success: true });
});

// upload API
app.post('/api/upload', requireAdmin, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({
    success: true,
    fileName: req.file.filename,
    originalName: req.file.originalname
  });
});

// error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(400).json({ error: err.message || 'Error' });
});

app.listen(PORT, () => {
  console.log(`Study Portal running:
  Student:     http://localhost:${PORT}/
  Admin login: http://localhost:${PORT}/admin-login
  Credentials: admin / secret123
`);
});
