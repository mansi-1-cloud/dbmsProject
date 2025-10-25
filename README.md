# QueueFlow - Real-Time Queue & Appointment Scheduling Platform

A comprehensive web application for managing service queues using tokens with real-time updates via WebSockets.

## 🎯 Features

- **Token-Based Queue Management**: Users request services via tokens assigned to vendors
- **Real-Time Updates**: Live queue position and ETA tracking via WebSocket
- **FIFO Scheduling**: Intelligent First-In-First-Out queue management
- **Vendor Dashboard**: Approve/reject requests and manage active queues
- **User Dashboard**: Track token status and estimated completion times
- **Modular Architecture**: Easy to extend with new scheduling algorithms

## 🏗️ Tech Stack

### Backend
- **Node.js** (TypeScript)
- **Express.js** - REST API
- **Prisma ORM** - Database management
- **PostgreSQL** - Primary database
- **Redis** - Queue coordination & caching
- **Socket.IO** - Real-time WebSocket communication
- **JWT** - Authentication
- **Zod** - Input validation

### Frontend
- **React 18** with **Vite**
- **TypeScript**
- **TailwindCSS** - Styling
- **React Router** - Navigation
- **Zustand** - State management
- **Socket.IO Client** - WebSocket client

### Infrastructure
- **Docker** & **Docker Compose**
- **Nginx** - Frontend web server

## 📁 Project Structure

```
queueflow/
├── backend/
│   ├── src/
│   │   ├── lib/           # Prisma & Redis clients
│   │   ├── middleware/    # Auth middleware
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   │   └── scheduling/  # Scheduling strategies
│   │   ├── types/         # TypeScript types
│   │   ├── validators/    # Zod schemas
│   │   ├── websocket/     # Socket.IO server
│   │   ├── scripts/       # Seed & utility scripts
│   │   └── index.ts       # Main server
│   ├── prisma/
│   │   └── schema.prisma  # Database schema
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Route pages
│   │   ├── services/      # API & WebSocket clients
│   │   ├── store/         # Zustand stores
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml
├── .env.example
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- **Docker** & **Docker Compose** installed
- **Node.js 20+** (for local development)
- **pnpm/npm** (for local development)

### Option 1: Docker (Recommended)

1. **Clone the repository**
   ```bash
   cd /home/garv/Desktop/dbmsProject
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env
   ```

3. **Start all services**
   ```bash
   docker-compose up --build
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:4000
   - PostgreSQL: localhost:5432
   - Redis: localhost:6379

5. **Seed the database** (optional, in a new terminal)
   ```bash
   docker-compose exec backend npm run seed
   ```

### Option 2: Local Development

#### Backend Setup

1. **Navigate to backend**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp ../.env.example .env
   ```

4. **Start PostgreSQL and Redis** (using Docker)
   ```bash
   docker run -d --name queueflow-postgres \
     -e POSTGRES_USER=queueflow \
     -e POSTGRES_PASSWORD=queueflow123 \
     -e POSTGRES_DB=queueflow \
     -p 5432:5432 postgres:16-alpine

   docker run -d --name queueflow-redis \
     -p 6379:6379 redis:7-alpine
   ```

5. **Generate Prisma Client**
   ```bash
   npm run prisma:generate
   ```

6. **Run migrations**
   ```bash
   npm run prisma:migrate
   ```

7. **Seed database** (optional)
   ```bash
   npm run seed
   ```

8. **Start backend server**
   ```bash
   npm run dev
   ```

#### Frontend Setup

1. **Navigate to frontend**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Access at** http://localhost:3000

## 🎭 Demo Accounts

After seeding, you can use these accounts:

### Users (password: `password123`)
- alice@example.com
- bob@example.com
- charlie@example.com

### Vendors (password: `vendor123`)
- printshop@example.com (Services: printing, scanning, photocopying)
- bindery@example.com (Services: binding, lamination)
- multiservice@example.com (Services: printing, binding, lamination, scanning)

## 📖 API Documentation

### Authentication

**Register User**
```http
POST /api/auth/register/user
Content-Type: application/json

{
  "email": "user@example.com",
  "name": "John Doe",
  "password": "password123"
}
```

**Register Vendor**
```http
POST /api/auth/register/vendor
Content-Type: application/json

{
  "email": "vendor@example.com",
  "name": "My Shop",
  "password": "password123",
  "services": ["printing", "binding"]
}
```

**Login**
```http
POST /api/auth/login/user
POST /api/auth/login/vendor
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Tokens

**Create Token** (User only)
```http
POST /api/tokens
Authorization: Bearer <token>
Content-Type: application/json

{
  "vendorId": "vendor-id",
  "serviceType": "printing",
  "params": {
    "pages": 50,
    "color": true
  }
}
```

**Get User Tokens**
```http
GET /api/tokens/user/me
Authorization: Bearer <token>
```

**Approve Token** (Vendor only)
```http
POST /api/tokens/:id/approve
Authorization: Bearer <token>
```

**Reject Token** (Vendor only)
```http
POST /api/tokens/:id/reject
Authorization: Bearer <token>
Content-Type: application/json

{
  "vendorMessage": "Reason for rejection"
}
```

**Complete Token** (Vendor only)
```http
POST /api/tokens/:id/complete
Authorization: Bearer <token>
```

### Vendors

**Get All Vendors**
```http
GET /api/vendors
```

**Get Vendor Queue**
```http
GET /api/vendors/:id/queue
Authorization: Bearer <token>
```

**Get Vendor Pending Requests**
```http
GET /api/vendors/:id/pending
Authorization: Bearer <token>
```

## 🔌 WebSocket Events

### User Events
- `token.updated` - Fired when token status changes

### Vendor Events
- `token.created` - Fired when a new token is created for the vendor
- `queue.update` - Fired when the queue is updated

## 🧩 Architecture

### Scheduling System

The scheduling system is modular and extensible:

```typescript
interface SchedulingStrategy {
  name: string;
  calculateQueue(tokens: QueueToken[]): QueueToken[];
  estimateCompletion(queuePosition: number, tokens: QueueToken[]): Date;
}
```

**Current Implementation**: FIFO Strategy
- Sorts tokens by creation time
- Calculates ETA based on service duration
- Updates queue positions automatically

**Adding New Strategies**:
1. Create new strategy class implementing `SchedulingStrategy`
2. Add to `admin.routes.ts` switch statement
3. No changes needed to other parts of the system

### Database Schema

**Key Models**:
- `User` - Customer accounts
- `Vendor` - Service providers with offered services
- `Token` - Service requests with status tracking
- `SystemConfig` - System-wide configuration

**Token Statuses**:
- `PENDING` - Awaiting vendor approval
- `APPROVED` - Approved (transitional)
- `REJECTED` - Rejected by vendor
- `QUEUED` - In vendor's queue
- `IN_PROGRESS` - Currently being processed
- `COMPLETED` - Finished
- `CANCELLED` - Cancelled by user

### Real-Time Architecture

1. **WebSocket Connection**: Client authenticates with JWT
2. **Room Subscription**: User/Vendor joins their personal room
3. **Event Emission**: Backend emits to specific rooms
4. **Client Handling**: React components listen and update UI

## 🛠️ Development

### Available Scripts

**Backend**:
- `npm run dev` - Start dev server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run migrations
- `npm run prisma:studio` - Open Prisma Studio
- `npm run seed` - Seed database
- `npm run lint` - Run ESLint
- `npm run typecheck` - Type check

**Frontend**:
- `npm run dev` - Start dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run typecheck` - Type check

### Adding a New Service Type

1. Add service duration to `FIFOStrategy.ts`:
   ```typescript
   private serviceDurations: Record<string, number> = {
     'new-service': 12, // minutes
     // ...
   };
   ```

2. Update seed script with new service if needed

### Database Migrations

```bash
# Create a new migration
cd backend
npx prisma migrate dev --name description

# Apply migrations
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset
```

## 🐛 Troubleshooting

### Backend won't start
- Check PostgreSQL is running: `docker ps`
- Check Redis is running: `docker ps`
- Verify `.env` file exists with correct values
- Run `npm run prisma:generate`

### Frontend can't connect to backend
- Check backend is running on port 4000
- Verify CORS_ORIGIN in backend `.env`
- Check browser console for errors

### WebSocket connection fails
- Ensure JWT token is valid
- Check backend logs for authentication errors
- Verify firewall/network settings

### Docker issues
```bash
# Stop all containers
docker-compose down

# Remove volumes and rebuild
docker-compose down -v
docker-compose up --build
```

## 📝 License

MIT

## 👥 Contributors

1. Garv Barthwal
Built as a demonstration of real-time queue management systems.

---

**Happy Queueing! 🎫**
