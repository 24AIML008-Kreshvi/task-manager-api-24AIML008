# Task Manager API — AWDF Practical 4 and Practical 5

**Student:** Kreshvi (24AIML008) | **Subject:** ITUE301

Practical 5 extends Practical 4: task CRUD operations now use a real MongoDB database through Mongoose rather than an in-memory array.

## Requirements

- Node.js 18+
- MongoDB Community Server locally **or** MongoDB Atlas cluster

## Setup

1. Run `npm install`.
2. Copy `.env.example` to `.env`.
3. Set `MONGO_URI` to a real MongoDB connection URI. **Do not commit .env.**
4. Run `npm start`.
5. Confirm `MongoDB connected successfully` appears before using the API.
6. Open `http://localhost:5000` for the Task Ledger web UI.

## API endpoints (Thunder Client / Postman)

| Method | URL | Expected result |
| --- | --- | --- |
| GET | `/tasks` | All tasks, HTTP 200 |
| GET | `/tasks/:id` | One task, 200; missing ID, 404; invalid format, 400 |
| POST | `/tasks` | Create task, 201 |
| PUT | `/tasks/:id` | Update, 200 |
| DELETE | `/tasks/:id` | Delete, 200 |

Use JSON request bodies and `Content-Type: application/json`:

```json
{"title":"Complete AWDF Practical 5","description":"Testing MongoDB connection","priority":"high","completed":false}
```

MongoDB automatically generates the `_id`. Copy it from the POST response to test PUT, DELETE and GET-by-ID.

## Schema and supplementary tasks

Defined in `models/Task.js`:
- `title`: required String; trimmed with Mongoose and a pre-save hook
- `description`: optional String
- `completed`: Boolean; defaults to false
- `createdAt`: Date; defaults to Date.now
- `priority`: enum low/medium/high; defaults to medium

Invalid input returns structured JSON with HTTP 400; unavailable valid ObjectIds return 404.

## Suggested evidence for lab file

1. MongoDB Compass or Atlas showing the `tasks` collection.
2. POST /tasks (201 Created).
3. GET /tasks (200 OK).
4. PUT /tasks/:id (200 OK).
5. DELETE /tasks/:id (200 OK).
6. POST validation error (400, missing title).
7. GET nonexistent valid ObjectId (404).
8. Terminal showing MongoDB connected successfully.

**Data persistence:** Unlike Practical 4, created tasks survive server restart. `.env` must remain private.
