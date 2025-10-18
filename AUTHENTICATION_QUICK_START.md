# Authentication Quick Start Guide

## Prerequisites
- Supabase account and project
- Node.js and npm installed

## Setup Steps

### 1. Configure Supabase

1. Go to [supabase.com](https://supabase.com) and create a project
2. In your Supabase dashboard:
   - Go to Settings → API
   - Copy your Project URL and anon/public key

### 2. Configure Environment Variables

Create `frontend/.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_SUPABASE_REDIRECT_URL=http://localhost:3000
NEXT_PUBLIC_BACKEND_API_URL=http://localhost:3001
APP_ENV=development
```

### 3. Enable Email Authentication in Supabase

1. Go to Authentication → Providers in Supabase dashboard
2. Enable **Email** provider
3. For development, you can disable email confirmation:
   - Go to Authentication → Settings
   - Scroll to "Email Confirmation"
   - Toggle off "Enable email confirmations" (development only!)

### 4. Start the Application

```bash
# Start backend (in one terminal)
cd backend
npm run dev

# Start frontend (in another terminal)
cd frontend
npm run dev
```

### 5. Test the Authentication

1. Open http://localhost:3000
2. You should be automatically redirected to http://localhost:3000/login
3. Click "Sign up" link
4. Create an account with email and password
5. If email confirmation is enabled, check your email
6. Log in with your credentials
7. You should be redirected to the main dashboard

## Testing Different Scenarios

### Test 1: Unauthenticated Access
- Try visiting http://localhost:3000
- Should redirect to /login

### Test 2: Authenticated Access to Login
- Log in
- Try visiting http://localhost:3000/login
- Should redirect to /

### Test 3: Logout
Add a logout button to test logout:
```tsx
import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";

function LogoutButton() {
  const { logout } = useAuthStore();
  const router = useRouter();
  
  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };
  
  return <button onClick={handleLogout}>Logout</button>;
}
```

## Troubleshooting

### Issue: "Invalid API key" error
- Check that your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct
- Make sure you copied the **anon/public** key, not the **service_role** key

### Issue: Stuck on loading screen
- Open browser console to check for errors
- Verify Supabase project is active
- Check network tab for failed requests

### Issue: Can't sign up
- Check Supabase dashboard → Authentication → Users to see if user was created
- If email confirmation is enabled, check spam folder
- For development, consider disabling email confirmation

### Issue: Redirect loop
- Clear browser cookies and local storage
- Check that `NEXT_PUBLIC_SUPABASE_REDIRECT_URL` matches your app URL
- Restart the development server

## Development Tips

### Access User Info in Components
```tsx
import { useAuthStore } from "@/store/auth";

function MyComponent() {
  const { user, isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }
  
  return <div>Welcome, {user?.email}!</div>;
}
```

### Protect Individual Components
```tsx
import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function ProtectedComponent() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);
  
  if (!isAuthenticated) {
    return null;
  }
  
  return <div>Protected content</div>;
}
```

### Get User Session
```tsx
import { useAuthHook } from "@/components/Auth/useAuthHook";

function MyComponent() {
  const { session, isLoading } = useAuthHook();
  
  if (isLoading) return <div>Loading...</div>;
  if (!session) return <div>Not authenticated</div>;
  
  return <div>User ID: {session.user.id}</div>;
}
```

## Next Steps

Once authentication is working:

1. **Add a logout button** to the AppSidebar or user menu
2. **Integrate with backend** user management (if needed)
3. **Add user profile** page to view/edit user information
4. **Add "Forgot Password"** functionality
5. **Customize email templates** in Supabase
6. **Add OAuth providers** (Google, GitHub, etc.)
7. **Add user roles** and permissions if needed

## Reference Files

- Full setup guide: `AUTH_SETUP.md`
- Implementation details: `AUTHENTICATION_IMPLEMENTATION.md`
- LearnKata reference: `Stuff/LearnKata/frontend/` (authentication examples)

