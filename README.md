# StudyNook API

Express and MongoDB backend for the **StudyNook – Library Study Room Booking** application. Authentication uses a JWT in an HTTP-only cookie; private endpoints never accept user or owner identity from the request body.

## Requirements

- Node.js 18+
- MongoDB (local or hosted)

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Configure every value in `.env`:

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Long, random signing secret (never commit it) |
| `GOOGLE_CLIENT_ID` | Google OAuth web client ID used to verify Google ID tokens |
| `CLIENT_URL` | Exact frontend origin allowed by CORS |
| `NODE_ENV` | `development`, `test`, or `production` |
| `PORT` | API listening port |

Production cookies use `secure: true` and `sameSite: strict`. The frontend must send requests with credentials (for example, Axios `withCredentials: true` or Fetch `credentials: 'include'`).

## Scripts

- `npm run dev` — start with nodemon
- `npm start` — start with Node
- `npm run check` — syntax-check the entrypoint and controllers

## Response conventions

Responses are JSON. Successful list responses contain a `count` and their resource array. Errors contain at least `{ "message": "..." }`; Mongoose validation errors also contain an `errors` array. Common error codes are `400` validation, `401` unauthenticated, `403` forbidden, `404` not found, `409` conflict, and `500` server error.

## Authentication API

### `POST /api/auth/register`

Body:

```json
{
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "password": "a-secure-password",
  "photoURL": "https://example.com/ada.jpg"
}
```

Creates a user, hashes the password, and sets the `token` cookie. Returns `201`.

### `POST /api/auth/login`

Body: `{ "email": "ada@example.com", "password": "a-secure-password" }`. Sets the `token` cookie.

### `POST /api/auth/google-login`

Body: `{ "credential": "GOOGLE_ID_TOKEN" }` (the alias `idToken` is also accepted). The API verifies the token against `GOOGLE_CLIENT_ID`, requires a Google-verified email, derives profile data from the verified claims, creates a passwordless user when necessary, and sets the `token` cookie.

### `POST /api/auth/logout`

Clears the `token` cookie.

### `GET /api/auth/me` (private)

Returns the authenticated user.

## Room API

Room write body fields are `roomName`, `description`, `image`, `floor`, `capacity`, `hourlyRate`, and `amenities` (string array). The server supplies `owner`, `ownerEmail`, and `bookingCount`.

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| POST | `/api/rooms` | Private | Create a room owned by the current user |
| GET | `/api/rooms` | Public | List rooms |
| GET | `/api/rooms/latest` | Public | Six newest rooms |
| GET | `/api/rooms/:id` | Public | Room details |
| GET | `/api/rooms/my-listings` | Private | Current user's rooms |
| PATCH | `/api/rooms/:id` | Owner | Update allowed room fields |
| DELETE | `/api/rooms/:id` | Owner | Delete a room |

List filters:

- `?search=quiet` (or `?roomName=quiet`) performs a case-insensitive `roomName` search.
- `?amenities=WiFi,Whiteboard` or repeated `amenities` query values match rooms containing any requested amenity (`$in`).

## Booking API

All booking endpoints are private.

### `POST /api/bookings`

```json
{
  "room": "ROOM_OBJECT_ID",
  "date": "2026-08-01",
  "startTime": "09:30",
  "endTime": "11:00",
  "specialNote": "Near a power outlet, please."
}
```

The server validates the date and times, checks confirmed bookings for overlap, calculates `totalCost` from the room's trusted hourly rate, creates the booking, adds it to the user, and increments the room booking count. Overlap returns `409`.

### `GET /api/bookings/my-bookings`

Returns the current user's bookings with populated room data.

### `PATCH /api/bookings/:id/cancel`

Cancels a confirmed booking belonging to the current user, removes its ID from the user's bookings array, and safely decrements the room's booking count when it is above zero.

## Health check

`GET /api/health` returns `{ "status": "ok" }`.
