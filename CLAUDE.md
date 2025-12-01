# Chore Manager

A mobile-first web application for managing shared chores in rental apartments. Tenants can track chore completion with photo proof, request day swaps, and view completion history.

## Project Structure

```
chore-manager/
├── apps/
│   ├── api/          # NestJS backend
│   │   ├── prisma/   # Database schema and migrations
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── auth/          # Magic link authentication
│   │       │   ├── tenants/       # Tenant CRUD
│   │       │   ├── occupants/     # Occupant management
│   │       │   ├── chores/        # Chore definitions & schedules
│   │       │   ├── swaps/         # Swap request workflow
│   │       │   ├── uploads/       # Photo upload with Sharp
│   │       │   ├── notifications/ # In-app & email notifications
│   │       │   └── stats/         # Completion statistics
│   │       └── prisma/            # Prisma service
│   └── web/          # React frontend (Vite)
│       └── src/
│           ├── api/        # API client (axios)
│           ├── components/ # Reusable UI components
│           ├── context/    # React context (auth)
│           ├── pages/      # Route pages
│           │   └── admin/  # Admin-only pages
│           └── types/      # TypeScript types
├── docker-compose.yml      # PostgreSQL for local dev
└── pnpm-workspace.yaml     # Monorepo config
```

## Tech Stack

- **Backend**: NestJS, Prisma ORM, PostgreSQL
- **Frontend**: React 18, Vite, TailwindCSS, React Query
- **Auth**: Passwordless magic links, JWT tokens
- **Email**: Resend (logs to console in dev)
- **Images**: Sharp for compression
- **Package Manager**: pnpm workspaces

## Key Commands

```bash
# Start development (both api and web)
pnpm dev

# Run from project root
cd /Users/brandon/Projects/chore-manager

# Database
cd apps/api
npx prisma migrate dev      # Run migrations
npx prisma db seed          # Seed test data
npx prisma studio           # Database GUI

# Individual apps
cd apps/api && pnpm dev     # API on :3000
cd apps/web && pnpm dev     # Web on :5173

# Testing
pnpm test                   # Run all tests
cd apps/api && pnpm test    # API tests only
```

## Database

PostgreSQL running via Docker:
```bash
docker-compose up -d        # Start PostgreSQL
```

Connection: `postgresql://postgres:postgres@localhost:5432/chore_manager`

### Key Models
- **Unit** - Property/building
- **Room** - Individual unit within property
- **Tenant** - Account holder (one per room, shared login)
- **Occupant** - Individual person in a room (has assigned chore day)
- **ChoreDefinition** - Types of chores (kitchen, bathroom, etc.)
- **ChoreSchedule** - Weekly schedule instance
- **ChoreCompletion** - Individual chore assignment with status
- **SwapRequest** - Request to swap days between occupants

## Authentication Flow

1. User enters email on login page
2. Backend creates magic link token, sends email (or logs URL in dev)
3. User clicks link → `/verify?token=xxx`
4. Frontend calls `/api/auth/verify` → receives JWT
5. JWT stored in localStorage, sent as Bearer token

### Test Accounts (after seeding)
- **Admin**: admin@example.com
- **Tenants**: tenant1@example.com, tenant2@example.com, tenant3@example.com, tenant4@example.com

In development, magic link URLs are logged to the API console instead of sending emails.

## API Endpoints

All endpoints prefixed with `/api`

### Auth
- `POST /auth/request-link` - Request magic link
- `POST /auth/verify` - Verify token, get JWT
- `GET /auth/me` - Get current user

### Tenants (Admin)
- `GET /tenants` - List all tenants
- `POST /tenants` - Create tenant
- `GET /tenants/:id` - Get tenant
- `PATCH /tenants/:id` - Update tenant
- `DELETE /tenants/:id` - Delete tenant

### Occupants
- `GET /occupants` - List occupants for tenant
- `POST /occupants` - Create occupant
- `GET /occupants/available-days` - Get available chore days
- `PATCH /occupants/:id` - Update occupant
- `DELETE /occupants/:id` - Delete occupant

### Chores
- `GET /chores` - List chore definitions
- `GET /chores/today` - Get today's chores for current user
- `GET /chores/schedule` - Get current week schedule
- `GET /chores/schedule/:weekId` - Get specific week
- `POST /chores/:id/complete` - Mark chore complete
- `GET /chores/history` - Get completion history

### Swaps
- `POST /swaps` - Create swap request
- `GET /swaps` - List swap requests
- `PATCH /swaps/:id/respond` - Approve/reject
- `DELETE /swaps/:id` - Cancel request

### Notifications
- `GET /notifications` - List notifications
- `GET /notifications/unread-count` - Get unread count
- `PATCH /notifications/:id/read` - Mark as read
- `PATCH /notifications/read-all` - Mark all as read

## Frontend Routes

### Public
- `/login` - Login page
- `/verify` - Magic link verification

### Tenant (Protected)
- `/` - Dashboard (today's chores)
- `/chores` - Weekly schedule
- `/swaps` - Swap requests
- `/profile` - User profile

### Admin (Protected)
- `/admin` - Admin dashboard
- `/admin/tenants` - Tenant management
- `/admin/schedule` - View all schedules

## Environment Variables

```env
# apps/api/.env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/chore_manager
JWT_SECRET=dev-secret-key-change-in-production-min-32-chars
JWT_EXPIRATION=7d
RESEND_API_KEY=re_xxxxx          # Placeholder = logs to console
EMAIL_FROM=Chore Manager <noreply@example.com>
FRONTEND_URL=http://localhost:5173
PORT=3000
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880
```

## Test Coverage

75 tests across 7 service files (`pnpm test` to run):

| Service | Tests | Coverage |
|---------|-------|----------|
| AuthService | 8 | Magic link request/verification, JWT generation |
| ChoresService | 12 | Definitions, weekly schedule, mark complete, history, stats |
| SwapsService | 11 | Create, respond (approve/reject), cancel swap requests |
| TenantsService | 9 | CRUD, email normalization, soft delete |
| OccupantsService | 11 | CRUD, chore day validation, available days |
| NotificationsService | 12 | Create, mark read, swap/reminder notifications |
| UploadsService | 4 | Save, get, delete photos |

## Implemented Features

**Authentication**
- Passwordless magic link login
- JWT-based sessions
- Role-based access (admin vs tenant)

**Admin**
- Dashboard with stats (tenants, occupants, rooms, completion rate)
- Tenant list with contact info and occupants
- Weekly schedule viewer with navigation

**Tenant**
- View today's chores with completion status
- Weekly schedule view
- Mark chores complete (with optional photo proof)
- Request swap with another occupant
- Approve/reject/cancel swap requests
- In-app notifications
- Manage occupants (add/edit/remove)

**Not Yet Implemented**
- Photo display in completion history
- Email delivery (logs to console in dev)
- Push notifications
- Chore rotation/reassignment
- Unit/room management UI

## Development Notes

- Vite proxies `/api` requests to the NestJS backend (configured in `vite.config.ts`)
- Admin users have `isAdmin: true` in JWT payload
- Chore days are 0-6 (Sunday-Saturday)
- Week IDs are ISO date strings of the Monday (e.g., "2024-11-25")
- Photos are stored locally in `apps/api/uploads/` (compressed to max 1200x1200 JPEG)

## Security

All API endpoints must be secured with appropriate guards:
- `JwtAuthGuard` - Required for all endpoints except auth routes (`/auth/request-link`, `/auth/verify`) and health check
- `AdminGuard` - Required for admin-only operations
- `SuperAdminGuard` - Required for super admin operations (managing other admins)

**Unit-scoped access**: Non-super admins can only view/manage data for units they are assigned to. This includes tenants, occupants, chores, photos, and all other unit-related data. Always verify the admin has access to the relevant unit before returning data.

When adding new endpoints, always apply `@UseGuards(JwtAuthGuard)` at minimum. Never leave endpoints publicly accessible unless explicitly required.
