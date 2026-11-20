# Campus Delivery Matrix (Parcel Collector)

Gate-terminal REST API for campus parcel intake and pickup.
Express.js + PostgreSQL (Prisma) + MongoDB (native driver), structured as **MVC**.

## MVC mapping

| Layer | Folder | Responsibility |
| :--- | :--- | :--- |
| **Model** | `src/models/` | All data access. Prisma queries (`userModel`, `studentModel`, `parcelModel`) and native-driver Mongo queries (`webhookModel`, `chatLogModel`). No `req`/`res` here. |
| **View** | `src/views/` | JSON presenters: decide exactly what leaves the API (e.g. `passwordHash` is never serialised) and the response envelope (`responseView`). |
| **Controller** | `src/controllers/` | Validate input, call models, hand results to views. No database queries here. |
| Routes | `src/routes/` | Map URL + method to controller, attach auth/RBAC middleware. |
| Middlewares | `src/middlewares/` | JWT auth, RBAC, centralised error handling. |
| Config / Utils | `src/config/`, `src/utils/` | DB connections, env, `ApiError`, `asyncHandler`, `tagGenerator`. |

Request flow: `route -> middleware (JWT, RBAC) -> controller -> model -> view -> JSON`

## Structure

```
campus-delivery-matrix/
├── prisma/
│   ├── schema.prisma
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
├── .env.example
└── package.json
```

## Setup

```bash
npm install
cp .env.example .env          # fill in DATABASE_URL, MONGODB_URI, JWT_SECRET
npx prisma migrate dev --name init
npm run prisma:seed           # 1 admin, 2 guards, 10 students
npm run dev
```

Seeded logins: `admin@campus.edu / Admin@123`, `guard1@campus.edu / Guard@123`, `guard2@campus.edu / Guard@123`.

## Gate terminal UI

A browser UI lives in `public/` (plain HTML, CSS and JS, no build step). Express serves it, so after `npm run dev` open **http://localhost:3000**.

| Screen | What it does | API used |
| :--- | :--- | :--- |
| Gate desk: Log a parcel | Pick the student, the carrier, log it, then shows the tag (with date) to write on the box | `GET /students/search`, `POST /parcels` |
| Gate desk: Hand over | Find a student, see their waiting tags, hand over one or all | `GET /parcels/search`, `PATCH /parcels/:id/pickup` |
| Shelf | Everything waiting, oldest first, with carrier filter, search and paging | `GET /parcels/inventory` |
| Students | Look up any student and how many parcels they have waiting | `GET /students/search` |
| Admin | Today's numbers, guard accounts, carrier update and driver chat tests | `/admin/*` |

Tags reset every day, so the UI always shows the date next to a tag (`P-101 21 Oct`). That way two boxes labelled P-101 from different days can't be mixed up.

**Demo mode:** open `http://localhost:3000/?demo`, or open `public/index.html` straight from disk and choose "Explore with demo data". It runs an in-memory copy of the API in the browser, so you can try the UI without Postgres or MongoDB. Opened from disk without `?demo`, the UI calls `http://localhost:3000`; add `?api=http://host:port` to point it somewhere else.

## Happy-path demo (curl)

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

## Endpoints

| Endpoint | Method | Roles |
| :--- | :--- | :--- |
| `/api/v1/auth/login` | POST | Public |
| `/api/v1/auth/me` | GET | GUARD, ADMIN |
| `/api/v1/parcels` | POST | GUARD, ADMIN |
| `/api/v1/parcels/search?enrollmentNo=` | GET | GUARD, ADMIN |
| `/api/v1/parcels/inventory` | GET | GUARD, ADMIN |
| `/api/v1/parcels/:id/pickup` | PATCH | GUARD, ADMIN |
| `/api/v1/students/search?q=` | GET | GUARD, ADMIN |
| `/api/v1/admin/stats` | GET | ADMIN |
| `/api/v1/admin/guards` | GET / POST | ADMIN |
| `/api/v1/admin/mock/webhook` | POST | ADMIN |
| `/api/v1/admin/mock/chat` | POST | ADMIN |
| `/api/v1/admin/mock/seed` | POST | ADMIN |
| `/api/v1/admin/webhooks` | GET | ADMIN |
| `/api/v1/admin/chat-logs` | GET | ADMIN |

## Design notes

- **Tag generation** (`utils/tagGenerator.js` + `parcelModel.createWithTag`): the day's parcel count is read and the parcel inserted inside one `prisma.$transaction` at `Serializable` isolation. If two guards log at the same instant, Postgres aborts one and the model retries it, so a tag is never issued twice.
- **Double pickup protection**: `markPickedUp` only updates rows still in `RECEIVED`; a second attempt returns `409`.
- **Mock endpoints**: `mock/chat` accepts either a full `messages` array or just `{ "message": "..." }` and adds a canned bot reply.
- Prisma is pinned to v6 (the schema uses `url = env(...)` in the datasource, which Prisma 7 replaced with `prisma.config.ts`). The deprecation warning about `package.json#prisma` is expected on v6 and harmless.
- Scope follows the handover: no student logins, no guest entry, nothing outside the Week 12 syllabus.
