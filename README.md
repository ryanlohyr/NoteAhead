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
- **Database**: (To be configured)

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

## Documentation

- [Backend README](./backend/README.md)
- [Frontend README](./frontend/README.md)

## License

MIT

