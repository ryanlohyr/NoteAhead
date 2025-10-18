# Authentication Setup

This document explains how to set up authentication for NoteAhead.

## Architecture

The authentication system follows LearnKata's architecture pattern with:

- **Route Groups**: Separates authenticated and unauthenticated routes
  - `(home)`: Public routes (login, signup)
  - `(dashboard)`: Protected routes requiring authentication
- **AuthProvider**: Manages authentication state and redirects
- **Supabase**: Backend authentication service

## Setup Instructions

### 1. Configure Environment Variables

Create a `.env.local` file in the frontend directory:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
NEXT_PUBLIC_SUPABASE_REDIRECT_URL=http://localhost:3000

# Backend API
NEXT_PUBLIC_BACKEND_API_URL=http://localhost:3001

# Environment
APP_ENV=development
```

### 2. Set Up Supabase

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key to `.env.local`
3. Enable email authentication in Supabase Dashboard:
   - Go to Authentication → Settings
   - Enable Email provider
   - Configure email templates if needed

### 3. Authentication Flow

**Unauthenticated Users:**
- All routes redirect to `/login` except `/login` and `/signup`
- Login page checks if user is already authenticated and redirects to `/` if true
- Signup page follows the same pattern

**Authenticated Users:**
- Can access all routes in the `(dashboard)` group
- Attempting to access `/login` or `/signup` redirects to `/`

### 4. Key Files

- `frontend/store/auth.ts`: Auth state management with Zustand
- `frontend/components/Auth/`: Authentication components
  - `AuthProvider.tsx`: Main auth wrapper
  - `useAuthHook.tsx`: Auth state hook
  - `Login.tsx`: Login form
  - `SignUp.tsx`: Signup form
- `frontend/environments/`: Environment configuration
- `frontend/app/(home)/`: Public routes
- `frontend/app/(dashboard)/`: Protected routes

### 5. Usage

**In components:**
```tsx
import { useAuthStore } from "@/store/auth";

function MyComponent() {
  const { user, isAuthenticated, logout } = useAuthStore();
  
  // Use auth state...
}
```

**Logout:**
```tsx
const { logout } = useAuthStore();
await logout();
router.push("/login");
```

## How It Works

1. **Root Layout** (`app/layout.tsx`):
   - Wraps the app with `QueryProvider` and `AuthProvider`
   - AuthProvider checks authentication on every route

2. **AuthProvider** (`components/Auth/AuthProvider.tsx`):
   - Uses `useAuthHook` to get current session
   - Redirects unauthenticated users to `/login`
   - Allows access to `/login` and `/signup` without authentication

3. **Route Groups**:
   - `(home)`: Has its own layout without sidebar
   - `(dashboard)`: Has layout with sidebar and resizable panels

4. **Login/Signup Pages**:
   - Check if user is already authenticated
   - Redirect to `/` if authenticated
   - Show form if not authenticated

## Next Steps

1. Add backend user management (if needed)
2. Add "Forgot Password" functionality
3. Add OAuth providers (Google, GitHub, etc.)
4. Customize email templates in Supabase
5. Add user profile management

