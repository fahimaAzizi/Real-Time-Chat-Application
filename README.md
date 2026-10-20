# F5 — Real-Time Chat Application

A full-stack real-time chat application built with React, Node.js, Express, Socket.IO, Prisma, and PostgreSQL.

## Features

- User registration and login with JWT authentication
- Real-time messaging using Socket.IO
- Multiple chat rooms
- Persistent message history with PostgreSQL
- Responsive Midnight Navy UI
- Full-stack architecture

## Tech Stack

- **Frontend:** React, Vite, CSS
- **Backend:** Node.js, Express
- **Real-time Communication:** Socket.IO
- **Database:** PostgreSQL (Neon)
- **ORM:** Prisma
- **Authentication:** JSON Web Tokens (JWT)

## Run Locally

### 1. Clone the repository

```bash
git clone YOUR_REPOSITORY_URL
cd "Real-Time Chat Application"
```

### 2. Start the backend

```bash
cd server
npm install
npm run dev
```

Configure your `server/.env` file with your database connection, client URL, and JWT secret before starting the backend.

### 3. Start the frontend

Open a second terminal:

```bash
cd client
npm install
npm run dev
```

Open the local URL displayed by Vite in your terminal.

## Environment Variables

Configure these variables in `server/.env`:

- `DATABASE_URL`
- `CLIENT_URL`
- `JWT_SECRET`
- `PORT`

Never commit your `.env` file or expose your credentials.

## Project Status

**F5 — Real-Time Chat Application**

A portfolio project focused on full-stack development, authentication, database integration, and real-time communication.
