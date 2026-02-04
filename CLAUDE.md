# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.


## Plan & Review

## Project Overview

ESS Platform is a full-stack enterprise data management system with user authentication, kanban boards, reseller management, device tracking, and revenue analysis. The application is built as a monorepo with separate frontend and backend workspaces.

## Development Commands

### Running the Application

```bash
# Start both frontend and backend
npm run dev                    # From root (runs workspaces)

# Start individually
npm run backend                # Backend only (port 5000)
npm run frontend               # Frontend only (port 3000)

# Alternative: Use helper scripts
bash start-backend.sh          # Starts backend with checks
bash start-frontend.sh         # Starts frontend with checks
bash start-all.sh             # Starts both
```

### Building and Testing

```bash
npm run build                  # Build both workspaces
npm run test                   # Run tests in both workspaces
npm run lint                   # Lint both workspaces

# Frontend-specific
cd frontend
npm run dev                    # Vite dev server
npm run build                  # Production build
npm run preview                # Preview production build
npm run generate-standalone    # Generate standalone currency formatter

# Backend-specific
cd backend
npm run dev                    # Nodemon development
npm start                      # Production mode
npm test                       # Jest tests
```

### Environment Setup

**Critical:** MongoDB must be running before starting the backend. The most common startup failure is forgetting this.

```bash
# Start MongoDB
brew services start mongodb-community    # macOS
docker run -d -p 27017:27017 mongo      # Docker (recommended)

# Check if MongoDB is running
curl http://localhost:27017             # Should show "It looks like you are..."

# Backend requires .env file
cd backend
cp .env.example .env                    # Then configure variables
```

## Architecture

### Monorepo Structure

- **Root `package.json`**: Defines workspace commands that cascade to `frontend/` and `backend/`
- **npm workspaces**: Both directories are workspaces, allowing `npm run dev --workspaces`
- **Independent dependencies**: Each workspace has its own `package.json` and `node_modules`

### Backend Architecture (Express + MongoDB)

**Entry Point:** `backend/src/index.js`

**MVC Pattern:**
- `models/`: Mongoose schemas (User, Board, Task, Reseller, Device, StationRevenue, Alarm, etc.)
- `routes/`: Express routers (auth, boards, tasks, resellers, revenue, alarms, etc.)
- `controllers/`: Business logic handlers for each route
- `middleware/`: Authentication middleware (`auth.js`) using JWT

**Key Models:**
- **User**: Authentication, roles (user/admin)
- **Board**: Kanban boards with owner and members
- **Task**: Tasks belonging to lists within boards
- **Reseller**: Reseller hierarchy with staff and devices
- **Device**: ESS devices tracked by serial number and station ID
- **StationRevenue**: Daily revenue data with multi-currency support
- **Alarm**: Equipment fault tracking with CSV import capability

**Authentication Flow:**
1. Login/Register → JWT token issued (7-day expiry)
2. Token stored in `localStorage` on frontend
3. Protected routes require `Authorization: Bearer <token>` header
4. Middleware validates token and attaches `req.user`

**API Prefix:** All routes use `/api` prefix (e.g., `/api/auth/login`, `/api/boards`)

### Frontend Architecture (React + Vite)

**Entry Point:** `frontend/src/main.jsx` → `App.jsx`

**Key Patterns:**
- **SPA routing**: React Router with protected routes
- **Layout wrapper**: `SidebarLayout` component wraps authenticated pages
- **Service layer**: `services/api.js` centralizes axios configuration and API calls
- **Dark mode**: Managed via `localStorage` and CSS variables in `App.css`

**Page Organization:**
- **Authentication**: LoginPage, RegisterPage (no sidebar)
- **Dashboards**: DashboardPage (board management), BoardPage (kanban view)
- **Management**: ResellerManagement, DeviceManagement, StaffManagement
- **Revenue**: RevenueView, StationList, StationAnalysis, LossAnalysis
- **Shared Components**: Sidebar, AlarmModal, AlarmPieChart, etc.

**Component Communication:**
- Props drilling for user/logout handlers from App.jsx
- Local state management (no Redux/Zustand)
- API calls made directly from components using `services/api.js`

## Design System (Recently Updated - Jan 2026)

**Style Guide:** Data-Dense Dashboard optimized for enterprise reporting

**Color System:**
```css
--primary-color: #3B82F6    /* Blue - main accent */
--accent: #3B82F6           /* Primary actions */
--accent-hover: #2563eb     /* Hover states */
--error: #ef4444            /* Danger/delete */
--success: #10b981          /* Success states */
--warning: #f59e0b          /* Warning states */
```

**Typography:**
- **Primary**: 'Fira Sans' (imported from Google Fonts)
- **Monospace**: 'Fira Code' (for data/code display)

**Icons:**
- **Library**: Lucide React (https://lucide.dev/)
- **Never use emojis** as icons (recently replaced all emojis with SVG icons)

**Z-Index Scale:**
```css
--z-base: 1
--z-dropdown: 10
--z-sticky: 20
--z-fixed: 30
--z-modal-backdrop: 40
--z-modal: 50
--z-popover: 60
--z-tooltip: 70
```

**Animation Standards:**
- `--transition-fast: 150ms` for micro-interactions
- `--transition-base: 200ms` for standard transitions
- `--transition-slow: 300ms` for complex animations
- Support `prefers-reduced-motion` media query

**Hover States:**
- Use box-shadow and border changes
- **Never use `transform: translateY()`** as it causes layout shift
- Always include `cursor: pointer` on interactive elements

**Accessibility:**
- All interactive elements have `focus-visible` styles
- Icon buttons require `aria-label` attributes
- Form inputs properly associated with `<label>` elements
- Minimum button height: 40px (touch-friendly)

## Key Features

### Multi-Currency Revenue Tracking

**Supported Currencies:** CNY, USD, EUR, IDR, VND, THB, MYR, PHP
- Currency formatting with proper symbols and decimal places
- Backend stores amounts in smallest unit (e.g., cents/fen)
- Frontend displays formatted values using `currencyFormatter.js`

### CSV Import for Alarms

- Import equipment fault data via `POST /api/alarms/import`
- Expects columns: date, stationId, description, severity, etc.
- Monthly alarm tracking and statistics per reseller

### Reseller Hierarchy

- Multi-level reseller management (parent-child relationships)
- Staff assignment to resellers
- Device assignment to staff/stations
- Permission system for data access

### Rate Analysis

- "Controllable rate" (可控率): Calculates proportion of revenue under control
- Daily/monthly aggregation views
- Year-over-year comparison charts

## Important Patterns

### Protected Routes Pattern

```jsx
// All authenticated pages wrapped in conditional navigation
<Route path="/" element={
  isAuthenticated ?
    <SidebarLayout><DashboardPage /></SidebarLayout> :
    <Navigate to="/login" />
} />
```

### API Service Pattern

```javascript
// Centralized axios instance with token injection
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

### Loading States

- All async form submissions disable buttons with `disabled={loading}`
- Show spinner: `{loading ? <span className="spinner-small" /> : 'Submit'}`

### Error Handling

- Backend returns `{ success: false, message: '...' }` format
- Frontend displays errors in `<div className="error">` with close button

## Common Workflows

### Adding a New API Endpoint

1. Create Mongoose model in `backend/src/models/`
2. Add route file in `backend/src/routes/`
3. Create controller in `backend/src/controllers/`
4. Register route in `backend/src/index.js`
5. Add service method in `frontend/src/services/api.js`
6. Create/update page component to use the service

### Adding a New Page

1. Create component in `frontend/src/pages/`
2. Import icons from 'lucide-react' (never use emojis)
3. Add route in `frontend/src/App.jsx` with `<SidebarLayout>` wrapper
4. Update sidebar menu in `frontend/src/components/Sidebar.jsx` if needed

### Working with Dark Mode

- All colors use CSS variables (e.g., `var(--text-primary)`)
- Toggle managed by `isDarkMode` state in `App.jsx`
- Dark mode class applied to `<html>` element
- Preference saved to `localStorage`

## Troubleshooting

**"[nodemon] app crashed"**
→ 99% MongoDB not running. Start MongoDB first.

**CORS errors**
→ Backend CORS is configured for `http://localhost:3000`. Check frontend dev server port.

**JWT verification failed**
→ Token expired (7-day lifetime). Log out and log back in.

**Port already in use**
→ Backend default: 5000, Frontend default: 3000. Kill processes or change ports in `.env` / `vite.config.js`

## Testing

- Backend uses Jest (basic test setup, expand as needed)
- Frontend has no test suite currently (consider adding Vitest)
- Manual testing workflow: Start backend → Start frontend → Test in browser

## Documentation Files

- **UI-UX-OPTIMIZATION-SUMMARY.md**: Complete UI/UX overhaul report (Jan 2026)
- **README.md**: Quick start guide and API reference
- **TROUBLESHOOTING.md**: Common issues and solutions
- Various feature-specific guides: ALARM_IMPORT_GUIDE.md, RATE_ANALYSIS_GUIDE.md, etc.
