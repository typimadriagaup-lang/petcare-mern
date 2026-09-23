# PetCare Backend

Express + MongoDB (Mongoose) + JWT auth backend for the PetCare app.

## ⚠️ First things first — rotate your database password

Your previous `server.js` had your MongoDB Atlas username and password committed
in plain text. Since this project was zipped and shared, treat that password as
compromised:

1. Go to MongoDB Atlas → Database Access → your user → **Edit password**.
2. Generate a new password.
3. Update `MONGO_URI` in `.env` (see below) with the new password.

From now on, secrets live in `.env`, which is git-ignored and never committed.

## Setup

```bash
cd backend
npm install
```

A `.env` file is included with your existing (soon-to-be-rotated) connection
string and a placeholder JWT secret. Open `.env` and:

1. Paste in your **new** MongoDB password.
2. Replace `JWT_SECRET` with a long random string (e.g. run
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   and paste the output in).

```bash
npm start
```

The server runs on `http://localhost:5000` by default (change `PORT` in `.env`
if needed).

## What's included

- **Auth**: `POST /api/auth/register`, `POST /api/auth/login` — returns a JWT.
- **Pets**: `GET/POST /api/pets`
- **Appointments**: `GET/POST /api/appointments`
- **Medical Records** *(new)*: `GET/POST/PUT/DELETE /api/medical-records`,
  plus `GET /api/medical-records/pet/:petId`
- **Reminders** *(new)*: `GET/POST/PUT/DELETE /api/reminders`
- **User profile** *(new)*: `GET/PUT /api/users/me` — requires
  `Authorization: Bearer <token>` header (protected route, for the Settings page)
- **Dashboard**: `GET /api/owner/dashboard` — now computed live from the
  database instead of hardcoded fake numbers.

## Still using hardcoded/mock data on the frontend (next steps)

These prototype pages currently render arrays baked into the component itself.
The backend endpoints above are ready for them, but the frontend needs to be
wired up:

- `MedicalRecords.jsx` → call `GET /api/medical-records`
- `Reminders.jsx` → call `GET /api/reminders`
- `Settings.jsx` → call `GET /api/users/me` (needs the saved JWT sent as a
  Bearer token)
- `AdminClinic.jsx` → this page (queue numbers, revenue, vets on duty) needs
  its own data model (Clinic/Staff/Queue) that doesn't exist yet — let me know
  if you want that built out next, since it's a different shape of data than
  the pet-owner side.

## Notes on what changed from your original version

- `MONGO_URI` and `JWT_SECRET` moved out of `server.js` into `.env`
  (`config/db.js` handles the connection now).
- Added `middleware/auth.js` (`protect` / `optionalAuth`) for routes that
  need a logged-in user.
- `Pet` model gained an optional `owner` field (ObjectId ref to `User`) so
  pets can eventually be scoped to the logged-in owner — not yet enforced
  anywhere, so existing routes still work exactly as before.
