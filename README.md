# Daily Task Manager

A production-ready full-stack daily task management application built with React, TypeScript, Node.js, Express, PostgreSQL, and Prisma.

## Features

- **JWT Authentication** — Register, login, logout, protected routes
- **Task Management** — Create, edit, delete, complete tasks with priorities, categories, due dates
- **Dashboard** — Stats, streaks, productivity summary, today's tasks
- **Calendar** — Month, week, and day views
- **Categories** — Custom categories with color indicators
- **Recurring Tasks** — Daily, weekdays, weekly, monthly, custom recurrence
- **Reminders** — Time-based reminders (10 min, 30 min, 1 hour before)
- **Search & Filters** — Filter by status, priority, category, date; sort multiple ways
- **Task History** — Audit log for all task actions

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Routing | React Router v6 |
| HTTP Client | Axios |
| Icons | Lucide React |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | JWT, bcrypt |

## Project Structure

```
daily-task-manager/
├── client/          # React frontend
│   └── src/
│       ├── components/   # Reusable UI components
│       ├── pages/        # Page components
│       ├── layouts/      # Layout wrappers
│       ├── hooks/        # Custom React hooks
│       ├── services/     # API service layer
│       ├── context/      # React context (Auth, etc.)
│       ├── types/        # TypeScript types
│       └── utils/        # Utility functions
│
├── server/          # Express backend
│   ├── src/
│   │   ├── controllers/  # Route handlers
│   │   ├── routes/       # Express routes
│   │   ├── middleware/   # Auth & error middleware
│   │   ├── services/     # Business logic
│   │   ├── utils/        # Utilities
│   │   └── types/        # TypeScript types
│   └── prisma/
│       └── schema.prisma
│
└── README.md
```

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### 1. Clone and install dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Configure environment variables

```bash
# Server
cp server/.env.example server/.env
# Edit server/.env with your PostgreSQL credentials and JWT secret

# Client
cp client/.env.example client/.env
```

### 3. Set up the database

```bash
cd server
npx prisma migrate dev --name init
npx prisma db seed   # Seeds default categories
```

### 4. Run the application

```bash
# Terminal 1 — Start backend (port 5000)
cd server
npm run dev

# Terminal 2 — Start frontend (port 5173)
cd client
npm run dev
```

Open http://localhost:5173 in your browser.

## API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Get current user |
| POST | /api/auth/logout | Logout |

### Tasks
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/tasks | Get all tasks (with filters) |
| POST | /api/tasks | Create task |
| GET | /api/tasks/:id | Get task by ID |
| PUT | /api/tasks/:id | Update task |
| DELETE | /api/tasks/:id | Delete task |
| PATCH | /api/tasks/:id/status | Update task status |

### Categories
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/categories | Get all categories |
| POST | /api/categories | Create category |
| PUT | /api/categories/:id | Update category |
| DELETE | /api/categories/:id | Delete category |

### Dashboard
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/dashboard/stats | Get dashboard stats |
| GET | /api/dashboard/streak | Get current streak |

### Reminders
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/reminders | Get reminders |
| POST | /api/reminders | Create reminder |
| DELETE | /api/reminders/:id | Delete reminder |

## Environment Variables

### Server (.env)
```
DATABASE_URL=postgresql://user:password@localhost:5432/daily_tasks
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
PORT=5000
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

### Client (.env)
```
VITE_API_URL=http://localhost:5000/api
```
