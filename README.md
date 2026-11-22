# Serein API

Express + MongoDB API for accounts, tables, and restaurant reservations.

## Setup

```bash
cp .env.example .env
# Configure MONGODB_URI and JWT_SECRET
npm install
npm run seed # optional: insert six sample tables
npm run dev
```

The server listens on port `3001` by default and starts only after MongoDB connects. Browser requests are restricted to localhost Vite origins by default; set `CLIENT_ORIGIN` to your deployed frontend origin(s) before production use.

## Routes

- `POST /api/users/signup` — create an account (public)
- `POST /api/users/signin` — receive a JWT (public)
- `POST /api/users/logout` — revoke the current token
- `GET /api/tables/capacity/:min` — available tables large enough for a party
- `POST /api/reservations` — request a table for the authenticated user
- `GET /api/reservations` — list the authenticated user's reservations
- `PATCH /api/reservations/:id/cancel` — cancel a future reservation

Protected routes use a signed JWT and check the revoked-token collection. User accounts default to the `user` role; never submit or trust a role from a public signup form.
