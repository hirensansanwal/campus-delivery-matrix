# Campus Delivery Matrix (Parcel Collector)

A gate-terminal system for logging campus parcels when they arrive and handing them over to students. It has a REST API (Express, MVC) and a browser UI for the guards at the gate desk.

> **Capstone project — Advanced Programming, 2026**

## Team

| Name | Enrollment no. | Section |
| :--- | :--- | :--- |
| Hirenya Sansanwal | 2501010671 | A |
| Achintya Sharma | 2501010022 | E |
| Shaurya Negi | 2501010423 | E |
| Joshmann Singh Dhiman | 2501010206 | B |

## Problem statement

Couriers (Amazon, Flipkart, Delhivery, Bluedart and others) drop parcels at the campus gate all day, usually while students are in class. The guards stack them on a shelf and note them on paper, or not at all. That causes three problems:

1. **Parcels are hard to find.** A student turns up and the guard has to dig through the whole pile reading names off labels.
2. **There is no record of handover.** Nobody can say when a parcel arrived, who logged it, or whether it was already collected, so lost or double-claimed parcels end in arguments.
3. **Nobody has an overview.** The admin can't see how many parcels came in today or how many are still waiting.

## What it does

- **Logging a parcel:** the guard picks the student and the carrier. The system issues a short daily tag (`P-101`, `P-102`, …) for the guard to write on the box, so the shelf is ordered by tag rather than by name.
- **Handover:** the student gives their enrollment number and the guard sees exactly which tags to pull from the shelf. Each parcel is marked as picked up with a timestamp, and the system refuses to hand over the same parcel twice.
- **Shelf view:** everything still waiting, oldest first, with filters, search and paging.
- **Admin workspace:** today's numbers (received, picked up, still waiting), guard account management, and a beta suite that stores carrier webhooks and delivery-driver chat logs in MongoDB.
- **Access control:** JWT login with two roles, `GUARD` and `ADMIN`. Guards can only reach the gate-desk routes.

**Tech stack:** Node.js (≥ 18), Express 4, PostgreSQL via Prisma 6, MongoDB via the native driver, JWT and bcrypt. The UI is plain HTML, CSS and JavaScript with no build step.

## How to run it

### 1. Prerequisites

- Node.js 18 or newer
- A PostgreSQL server
- A MongoDB server (optional: without it the server still starts, and only the admin webhook and chat features are unavailable)

If you have Docker, this starts both databases:

```bash
docker run -d --name cdm-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16
docker run -d --name cdm-mongo -p 27017:27017 mongo:7
```

### 2. Install and configure

```bash
npm install
cp .env.example .env
```

Then open `.env` and fill in the values:

| Variable | Required | What it is |
| :--- | :--- | :--- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | A random string of at least 32 characters, used to sign login tokens. The server refuses to start with a shorter one or the example value |
| `PORT` | No | Defaults to `3000` |
| `MONGODB_DB_NAME` | No | Defaults to `campus_delivery_matrix` |
| `JWT_EXPIRES_IN` | No | Defaults to `8h` |
| `NODE_ENV` | No | Defaults to `development` |

### 3. Set up the database

```bash
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed
```

The seed creates 1 admin, 2 guards and 10 students.

### 4. Start the server

```bash
npm run dev
```

Open **http://localhost:3000** and sign in with one of the seeded accounts:

| Role | Email | Password |
| :--- | :--- | :--- |
| Admin | `admin@campus.edu` | `Admin@123` |
| Guard | `guard1@campus.edu` | `Guard@123` |
| Guard | `guard2@campus.edu` | `Guard@123` |

### Run the tests

The tests start the real API and call it over HTTP, against a **separate test database** so your real data is never touched.

```bash
cp .env.test.example .env.test   # point DATABASE_URL at a database whose name contains "test"
npm test
```

The first run migrates and seeds the test database automatically. The 19 tests cover login and roles, the error format, tag generation (including 12 guards logging at once) and pickup (including double pickup). They need Node 20.10 or newer.

### Try it without any database

Open **http://localhost:3000/?demo**, or open `public/index.html` directly and choose "Explore with demo data". This runs an in-memory copy of the API inside the browser, so the whole UI works without PostgreSQL or MongoDB.

## Gate terminal UI

| Screen | What it does | API used |
| :--- | :--- | :--- |
| Gate desk: Log a parcel | Pick the student and the carrier, log the parcel, then show the tag (with date) to write on the box | `GET /students/search`, `POST /parcels` |
| Gate desk: Hand over | Find a student, see their waiting tags, hand over one or all | `GET /parcels/search`, `PATCH /parcels/:id/pickup` |
| Shelf | Everything waiting, oldest first, with carrier filter, search and paging | `GET /parcels/inventory` |
| Students | Look up any student and how many parcels they have waiting | `GET /students/search` |
| Admin | Today's numbers, guard accounts, carrier webhook and driver chat tests | `/admin/*` |

Tags reset every day, so the UI always shows the date next to a tag (`P-101 21 Oct`). That way two boxes labelled P-101 from different days can't be mixed up.

Opened from disk without `?demo`, the UI calls `http://localhost:3000`. Add `?api=http://host:port` to point it at a different server.

## Architecture (MVC)

| Layer | Folder | Responsibility |
| :--- | :--- | :--- |
| **Model** | `src/models/` | All data access. Prisma queries (`userModel`, `studentModel`, `parcelModel`) and native-driver Mongo queries (`webhookModel`, `chatLogModel`). No `req`/`res` here. |
| **View** | `src/views/` | JSON presenters: decide exactly what leaves the API (e.g. `passwordHash` is never serialised) and the response envelope (`responseView`). |
| **Controller** | `src/controllers/` | Validate input, call models, hand results to views. No database queries here. |
| Routes | `src/routes/` | Map URL + method to controller, attach auth/RBAC middleware. |
| Middlewares | `src/middlewares/` | JWT auth, RBAC, centralised error handling. |
| Config / Utils | `src/config/`, `src/utils/` | DB connections, env, `ApiError`, `asyncHandler`, `tagGenerator`. |

Request flow: `route -> middleware (JWT, RBAC) -> controller -> model -> view -> JSON`

PostgreSQL holds the core records (users, students, parcels), where relations and transactions matter. MongoDB holds the beta data (carrier webhooks, driver chat logs), whose shape varies from carrier to carrier.

### Project structure

```
campus-delivery-matrix/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/      init migration
│   └── seed.js
├── src/
│   ├── config/          env.js, prisma.js, mongodb.js
│   ├── models/          userModel, studentModel, parcelModel, webhookModel, chatLogModel
│   ├── views/           responseView, userView, studentView, parcelView, adminView
│   ├── controllers/     authController, parcelController, studentController, adminController
│   ├── middlewares/     authMiddleware, rbacMiddleware, errorMiddleware
│   ├── routes/          index, authRoutes, parcelRoutes, studentRoutes, adminRoutes
│   ├── utils/           ApiError, asyncHandler, tagGenerator
│   ├── app.js           Express app (also serves public/)
│   └── server.js        Entry point (connects Postgres + Mongo, starts server)
├── public/              Gate terminal UI: index.html, styles.css, app.js
├── tests/               API tests (npm test): helpers, auth, errors, tags, pickup
├── .env.example
├── .env.test.example
└── package.json
```

## API

All routes are under `/api/v1`. Send the token from login as `Authorization: Bearer <token>`.

| Endpoint | Method | Roles |
| :--- | :--- | :--- |
| `/auth/login` | POST | Public |
| `/auth/me` | GET | GUARD, ADMIN |
| `/parcels` | POST | GUARD, ADMIN |
| `/parcels/search?enrollmentNo=` | GET | GUARD, ADMIN |
| `/parcels/inventory` | GET | GUARD, ADMIN |
| `/parcels/:id/pickup` | PATCH | GUARD, ADMIN |
| `/students/search?q=` | GET | GUARD, ADMIN |
| `/admin/stats` | GET | ADMIN |
| `/admin/guards` | GET / POST | ADMIN |
| `/admin/mock/webhook` | POST | ADMIN |
| `/admin/mock/chat` | POST | ADMIN |
| `/admin/mock/seed` | POST | ADMIN |
| `/admin/webhooks` | GET | ADMIN |
| `/admin/chat-logs` | GET | ADMIN |

Every response uses the same envelope: `{ "success": true, "message"?, "data" }` on success and `{ "success": false, "message" }` on error.

### Happy path with curl

```bash
BASE=http://localhost:3000/api/v1

# 1. Guard logs in -> copy the token
curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"guard1@campus.edu","password":"Guard@123"}'

TOKEN=<paste token>

# 2. Log a parcel -> tag P-101 issued
curl -s -X POST $BASE/parcels -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"studentEnrollmentNo":"RU2025CS001","carrier":"Amazon"}'

# 3. Student arrives -> pending tags
curl -s "$BASE/parcels/search?enrollmentNo=RU2025CS001" -H "Authorization: Bearer $TOKEN"

# 4. Mark picked up (use the parcel id from step 2)
curl -s -X PATCH $BASE/parcels/<id>/pickup -H "Authorization: Bearer $TOKEN"
```

## Design notes

- **Tag generation** (`utils/tagGenerator.js` + `parcelModel.createWithTag`): the day's parcel count is read and the parcel inserted inside one `prisma.$transaction` at `Serializable` isolation. If two guards log at the same instant, Postgres aborts one and the model retries it, so a tag is never issued twice.
- **Double pickup protection:** `markPickedUp` only updates rows still in `RECEIVED`; a second attempt returns `409`.
- **Graceful start:** if PostgreSQL or MongoDB is unreachable at startup, the server logs a warning and keeps running instead of crashing.
- **Mock endpoints:** `mock/chat` accepts either a full `messages` array or just `{ "message": "..." }` and adds a canned bot reply.
- Prisma is pinned to v6 (the schema uses `url = env(...)` in the datasource, which Prisma 7 replaced with `prisma.config.ts`). The deprecation warning about `package.json#prisma` is expected on v6 and harmless.
- Scope follows the handover: no student logins, no guest entry, nothing outside the Week 12 syllabus.
