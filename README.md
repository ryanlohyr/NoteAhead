# NoteAhead

A modern note-taking application built with Next.js and Express.

## Project Structure

```
NoteAhead/
├── backend/          # Express.js + TypeScript backend
│   ├── api/         # API routes
│   ├── db/          # Database connection and queries
│   ├── middleware/  # Express middleware
│   ├── utils/       # Utility functions
│   └── ...
├── frontend/        # Next.js + TypeScript frontend
│   ├── app/        # Next.js app directory
│   ├── components/ # React components
│   ├── hooks/      # Custom React hooks
│   └── ...
└── README.md       # This file
```

## Quick Start

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

The backend will start on `http://localhost:8080`.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local with your configuration
npm run dev
```

The frontend will start on `http://localhost:3000`.

## Tech Stack

### Backend
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Edge Functions**: Supabase Edge Functions (Deno runtime)

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: Zustand
- **Data Fetching**: TanStack Query

## Development

Both backend and frontend have hot reload enabled for development. Changes will be reflected automatically.

## Building for Production

### Backend
```bash
cd backend
npm run build
npm start
```

### Frontend
```bash
cd frontend
npm run build
npm start
```

## Supabase Edge Functions

Edge functions are located in `backend/supabase/functions/` and run on the Deno runtime.

### Creating a New Function
```bash
supabase functions new function-name
```

### Local Development
```bash
# Serve a specific function locally
supabase functions serve function-name

# Serve all functions
supabase functions serve
```

### Deploying Functions
```bash
# Deploy a specific function
supabase functions deploy function-name

# Deploy all functions
supabase functions deploy
```

For more information, see the [Supabase Functions Documentation](https://supabase.com/docs/guides/functions/quickstart).

## Documentation

- [Backend README](./backend/README.md)
- [Frontend README](./frontend/README.md)



