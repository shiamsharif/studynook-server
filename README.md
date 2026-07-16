# StudyNook API

Express and MongoDB backend for **StudyNook**, a library study-room booking application. The companion frontend is a Next.js app. Authentication uses a JWT in an HTTP-only cookie; private endpoints never accept user or owner identity from the request body.

## Prerequisites

- Node.js 20.9 or newer (also satisfies the server's Node.js 18+ requirement)
- npm
- A local MongoDB installation or a free MongoDB Atlas database
- The StudyNook client folder, to run the full application

The expected local layout is:

```text
StudyNook/
├── studynook-server/
└── studynook-clint/     # Next.js frontend (current folder name)
```

## Quick start: backend

From `studynook-server`, install the dependencies and create your local environment file:

```bash
npm install
cp .env.example .env
```

Windows Command Prompt users can run `copy .env.example .env` instead. Open `.env`, configure every value, and start the API:

```bash
npm run dev
```

When startup succeeds, the terminal prints `StudyNook API listening on port 5000`. Open <http://localhost:5000/api/health> and confirm that it returns:

```json
{ "status": "ok" }
```

## Environment variables

The included `.env.example` works with a local MongoDB instance. Never commit the real `.env` file.

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string, including the database name |
| `JWT_SECRET` | Long, random signing secret (never commit it) |
| `GOOGLE_CLIENT_ID` | Google OAuth web client ID used to verify Google ID tokens |
| `CLIENT_URL` | Exact frontend origin allowed by CORS; use `http://localhost:3000` locally |
| `NODE_ENV` | `development`, `test`, or `production` |
| `PORT` | API listening port |

Generate a development JWT secret with `openssl rand -base64 32`, or use another securely generated random value.

### Option A: local MongoDB

Start the local MongoDB service and use:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/studynook
```

### Option B: MongoDB Atlas

1. Create an Atlas cluster.
2. Under **Database Access**, create a database user.
3. Under **Network Access**, allow your current IP address.
4. Select **Connect > Drivers > Node.js** and copy the connection string.
5. Add the database name and place the URI in `.env`:

```env
MONGODB_URI=mongodb+srv://DB_USER:URL_ENCODED_PASSWORD@YOUR_CLUSTER.mongodb.net/studynook?retryWrites=true&w=majority
```

Replace every placeholder. URL-encode the database password if it contains characters such as `@`, `:`, `/`, `?`, `#`, or `%`.

## Start the Next.js client

Keep the API running. Open a second terminal and run:

```bash
cd ../studynook-clint
npm install
cp .env.example .env.local
npm run dev
```

On Windows Command Prompt, use `copy .env.example .env.local`. The client environment should contain:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

Open <http://localhost:3000>. For API requests and cookie authentication to work, confirm these values:

- Server `.env`: `CLIENT_URL=http://localhost:3000`
- Client `.env.local`: `NEXT_PUBLIC_API_URL=http://localhost:5000`

Restart the relevant development server after changing an environment file.

Production cookies use `secure: true` and `sameSite: strict`. The frontend must send requests with credentials (for example, Axios `withCredentials: true` or Fetch `credentials: 'include'`).

## Troubleshooting

### `querySrv EREFUSED _mongodb._tcp...`

Node.js could not complete the DNS SRV lookup required by the `mongodb+srv://` Atlas URI. This happens before Express can connect to MongoDB and is usually a DNS or network issue.

Try these checks in order:

1. Copy the Atlas URI again from **Connect > Drivers** and confirm that its cluster hostname exactly matches `MONGODB_URI`.
2. Confirm that the Atlas cluster is running, the database user exists, and your current IP is allowed under **Network Access**.
3. Temporarily disable a VPN or proxy, or try another network. Some school, office, and ISP DNS resolvers block SRV queries.
4. Change the computer's DNS resolver to Cloudflare (`1.1.1.1`) or Google (`8.8.8.8`) and retry.
5. Test DNS with `nslookup -type=SRV _mongodb._tcp.YOUR_CLUSTER.mongodb.net` on Windows or `dig SRV _mongodb._tcp.YOUR_CLUSTER.mongodb.net` on macOS/Linux.
6. If SRV queries remain blocked, use the standard `mongodb://` connection string offered by Atlas instead of `mongodb+srv://`.

Other common startup problems:

- `ECONNREFUSED 127.0.0.1:27017`: the local MongoDB service is not running.
- `bad auth` or `Authentication failed`: check the Atlas credentials and URL-encode the password.
- Atlas connection timeout: add the current public IP under Atlas **Network Access**.
- Browser CORS error: make `CLIENT_URL` exactly match the browser origin, including protocol and port.

## Scripts

- `npm run dev` — start with nodemon
- `npm start` — start with Node
- `npm run check` — syntax-check the entrypoint and controllers

Use `npm start` for a normal non-watching process. The development command automatically restarts after source changes.

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
