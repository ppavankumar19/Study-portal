# Study Portal

A self-hosted educational portal for delivering lessons with inline audio and video playback. Includes a student-facing portal and an admin dashboard for managing lesson content.

---

## Features

- **Student Portal** — browse, search, and play lessons directly in the browser
- **Admin Dashboard** — create, edit, and delete lessons; upload audio/video files
- **Media Streaming** — supports `.mp4`, `.m4a`, `.mp4a`, `.mp3`, `.wav`, `.webm`, `.ogg`
- **Secure Auth** — HTTP-only signed cookie session for admin access
- **Responsive UI** — works on desktop and mobile

---

## Tech Stack

| Layer    | Technology                  |
|----------|-----------------------------|
| Backend  | Node.js + Express 5         |
| Frontend | Vanilla HTML/CSS/JavaScript |
| Storage  | JSON file (`data.json`)     |
| Auth     | Signed HTTP-only cookies    |
| Uploads  | Multer (disk storage)       |

---

## Getting Started

### Prerequisites

- Node.js v18 or later
- npm

### Installation

```bash
git clone https://github.com/ppavankumar19/Study-portal.git
cd Study-portal
npm install
```

### Configuration

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
PORT=3000
ADMIN_USER=admin
ADMIN_PASS=your_strong_password
COOKIE_SECRET=a_long_random_secret_string
```

> **Important:** Never commit `.env` to version control. It is already listed in `.gitignore`.

### Running

```bash
# Production
npm start

# Development (auto-restart on file changes, Node.js v18.11+)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Structure

```
Study-portal/
├── server.js           # Express server – routes, auth, file upload
├── index.html          # Student portal (public)
├── admin.html          # Admin dashboard (protected)
├── admin-login.html    # Admin login page
├── data.json           # Lesson data (auto-created, gitignored)
├── video/              # Uploaded media files (auto-created, gitignored)
├── package.json
├── .env.example        # Environment variable template
├── .gitignore
├── WORKFLOW.md         # Workflow and process flow documentation
└── .github/
    └── workflows/
        └── ci.yml      # GitHub Actions CI pipeline
```

---

## API Reference

All admin endpoints require a valid signed session cookie (`study_admin`).

| Method   | Endpoint              | Auth     | Description                    |
|----------|-----------------------|----------|--------------------------------|
| `GET`    | `/`                   | Public   | Student portal                 |
| `GET`    | `/admin.html`         | Admin    | Admin dashboard                |
| `GET`    | `/admin-login`        | Public   | Admin login page               |
| `POST`   | `/api/admin/login`    | Public   | Authenticate admin             |
| `POST`   | `/api/admin/logout`   | Admin    | Clear session cookie           |
| `GET`    | `/api/lessons`        | Public   | List all lessons               |
| `POST`   | `/api/lessons`        | Admin    | Create or update a lesson      |
| `DELETE` | `/api/lessons/:id`    | Admin    | Delete a lesson by ID          |
| `POST`   | `/api/upload`         | Admin    | Upload a media file            |

### Lesson Object

```json
{
  "id": 1720000000000,
  "title": "HTML Basics",
  "description": "Introduction to HTML structure and tags.",
  "mediaFile": "html_1720000000000.m4a",
  "resourceLink": "https://example.com/resources",
  "tasks": "1) Read the notes\n2) Complete the exercises"
}
```

---

## Environment Variables

| Variable        | Default                    | Description                          |
|-----------------|----------------------------|--------------------------------------|
| `PORT`          | `3000`                     | Port the server listens on           |
| `ADMIN_USER`    | `admin`                    | Admin username                       |
| `ADMIN_PASS`    | `secret123`                | Admin password (change this!)        |
| `COOKIE_SECRET` | `change-this-secret-key`   | Secret used to sign the session cookie |

---

## Security Notes

- Set strong values for `ADMIN_PASS` and `COOKIE_SECRET` before deploying.
- The admin cookie is HTTP-only, signed, and uses `SameSite=Lax`.
- All user-supplied content is HTML-escaped before rendering to prevent XSS.
- Media filenames are sanitised (alphanumeric + `-_`) before saving to disk.
- The `video/` directory and `data.json` are excluded from git via `.gitignore`.

---

## Known Limitations

- Single admin account (no multi-user support).
- Lessons stored in a flat JSON file — not suitable for large-scale use.
- No automated tests.
- No pagination on the lessons API.

---

## License

ISC
