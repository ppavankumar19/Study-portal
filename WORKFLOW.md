# Study Portal – Workflow & Process Flow

This document describes how the system works end-to-end, covering the development workflow, deployment workflow, and detailed process flows for every major feature.

---

## 1. Development Workflow

```
┌─────────────────────────────────────────────────────────┐
│                   Development Cycle                      │
│                                                         │
│  1. Clone / pull latest main branch                     │
│  2. cp .env.example .env  →  fill in credentials        │
│  3. npm install                                         │
│  4. npm run dev            (auto-restart on save)       │
│  5. Edit code                                           │
│  6. Test manually in browser                            │
│  7. git add <files>  →  git commit  →  git push         │
│  8. GitHub Actions CI runs automatically (see §4)       │
└─────────────────────────────────────────────────────────┘
```

### Branch Strategy

```
main  ──────────────────────────────────► (production-ready)
        │
        └─ feature/xxx  →  PR  →  review  →  merge to main
```

---

## 2. System Architecture

```
Browser (Student / Admin)
        │
        │  HTTP (port 3000)
        ▼
┌───────────────────────────────────────────┐
│              Express Server               │
│                                           │
│  Static files (HTML/CSS/JS)               │
│  REST API  /api/*                         │
│  Auth middleware (signed cookie)          │
│  Multer file upload handler               │
└─────────────┬──────────────┬─────────────┘
              │              │
        ┌─────▼────┐   ┌─────▼──────────┐
        │ data.json│   │  /video/        │
        │ (lessons)│   │  (media files)  │
        └──────────┘   └────────────────┘
```

---

## 3. Feature Process Flows

### 3.1 Student: Viewing a Lesson

```
Student opens http://localhost:3000/
        │
        ▼
Browser loads index.html
        │
        ▼
JS calls GET /api/lessons
        │
        ▼
Server reads data.json → returns JSON array
        │
        ▼
Browser renders lesson list in sidebar
        │
        ▼
Student clicks a lesson card
        │
        ▼
showLesson(id) runs:
  ├─ Finds lesson in local array
  ├─ Detects media type (audio / video / none)
  ├─ Builds HTML with <audio> or <video> element
  │    └─ src = /video/<filename>?ts=<cache-bust>
  └─ Injects HTML into main content area
        │
        ▼
Browser fetches /video/<filename>  →  streams from disk
        │
        ▼
Student plays media inline
```

### 3.2 Admin: Logging In

```
Admin navigates to /admin.html
        │
        ▼
requireAdmin middleware checks signed cookie
        │
        ├─ Cookie valid  ──────────────────► serve admin.html
        │
        └─ Cookie missing/invalid
                │
                ▼
           Serve admin-login.html
                │
                ▼
           Admin enters username + password → clicks Sign in
                │
                ▼
           POST /api/admin/login
                │
                ├─ Credentials match
                │       └─ Set HTTP-only signed cookie
                │           Redirect to /admin.html
                │
                └─ Credentials wrong
                        └─ 401 response → show error message
```

### 3.3 Admin: Creating a Lesson

```
Admin fills in the lesson form (title, description, tasks, resource link)
        │
        ▼
Admin selects a media file (optional)
        │
        ▼
Admin clicks "Save lesson"
        │
        ▼
saveLesson() runs:
  │
  ├─ Validate: title must not be empty
  │
  ├─ If file selected → POST /api/upload  (multipart/form-data)
  │       │
  │       ▼
  │   Server:
  │     1. Multer validates file extension
  │     2. Sanitises filename  (base_timestamp.ext)
  │     3. Saves to /video/
  │     4. Returns { fileName }
  │
  └─ POST /api/lessons  (JSON payload)
          │
          ▼
      Server:
        1. Validates title
        2. Checks if lesson ID already exists
           ├─ Yes → update existing record
           └─ No  → append new record
        3. Writes updated array to data.json
        4. Returns { success, lesson }
          │
          ▼
      UI updates:
        - Status bar shows "saved lesson #<id>"
        - Lessons table re-renders with new entry
```

### 3.4 Admin: Editing a Lesson

```
Admin clicks "Edit" on a lesson row
        │
        ▼
editLesson(id) populates the form with existing data
  - Hidden <id> field is set
  - Current media filename shown as "Current media file"
        │
        ▼
Admin changes fields and/or uploads new media
        │
        ▼
Admin clicks "Save lesson"  →  (same flow as 3.3)
  - If no new file uploaded, existing mediaFile is preserved
  - If new file uploaded, old filename stays on disk (not deleted)
```

### 3.5 Admin: Deleting a Lesson

```
Admin clicks "Delete"
        │
        ▼
Browser shows confirm() dialog
  ├─ Cancel → no action
  └─ Confirm
          │
          ▼
      DELETE /api/lessons/:id
          │
          ▼
      Server:
        1. Filters lesson from array
        2. Writes updated array to data.json
        3. Returns { success }
          │
          ▼
      UI: table refreshes, form resets
      Note: media file on disk is NOT deleted (manual cleanup needed)
```

### 3.6 Admin: Logging Out

```
Admin clicks "Logout"
        │
        ▼
POST /api/admin/logout
        │
        ▼
Server clears the study_admin cookie
        │
        ▼
Browser redirects to /admin-login
```

---

## 4. CI/CD Pipeline (GitHub Actions)

```
git push to main / open Pull Request
        │
        ▼
.github/workflows/ci.yml triggers
        │
        ▼
┌─────────────────────────────┐
│  Job: build-and-validate    │
│                             │
│  1. Checkout code           │
│  2. Setup Node.js 20        │
│  3. npm ci                  │
│  4. Check server.js syntax  │
│  5. Check package.json      │
└─────────────────────────────┘
        │
        ▼
All checks pass → merge / deploy
```

---

## 5. File Upload Flow (Detailed)

```
Browser  ──────  POST /api/upload (multipart/form-data, field: "file")
                        │
                        ▼
                 requireAdmin  →  check cookie
                        │
                        ▼
                 Multer middleware:
                   fileFilter():
                     └─ allowedByExt() checks extension
                        ├─ Allowed (.mp4/.m4a/.mp4a/.mp3/.wav/.webm/.ogg)
                        │       └─ continue
                        └─ Denied → cb(Error('Unsupported file type'))
                                        │
                                        ▼
                                  400 error response
                        │
                        ▼
                   diskStorage.filename():
                     └─ sanitise base name (alphanum + _-)
                        append Date.now() timestamp
                        preserve extension
                        → e.g. my_lesson_1720000000000.m4a
                        │
                        ▼
                   File saved to /video/<filename>
                        │
                        ▼
                 Response: { success, fileName, originalName }
```

---

## 6. Data Persistence

```
Lessons array (in-memory during request)
        │
        ▼
writeLessons():
  └─ JSON.stringify(lessons, null, 2)
  └─ fs.writeFileSync(data.json)  ← synchronous, blocks event loop
        │
        ▼
data.json on disk (pretty-printed JSON)
```

> **Note:** The current implementation uses synchronous file I/O and a single JSON file. This is suitable for small-scale personal or classroom use. For production scale, replace with a database (SQLite, PostgreSQL, or MongoDB).

---

## 7. Deployment Checklist

```
Before going live:
  [ ] Set ADMIN_PASS to a strong password in .env
  [ ] Set COOKIE_SECRET to a long random string in .env
  [ ] Ensure .env is NOT committed to git
  [ ] Review upload size limit (currently 500 MB) in server.js
  [ ] Put the app behind a reverse proxy (nginx/Caddy) with HTTPS
  [ ] Ensure /video/ directory has appropriate disk space
  [ ] Set up log rotation or monitoring if needed
  [ ] Restrict server port 3000 from public internet (proxy only)
```
