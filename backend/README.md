# NoteAhead Backend

Express.js + TypeScript backend for NoteAhead application.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

3. Update the `.env` file with your configuration.

### Development

Run the development server:
```bash
npm run dev
```

The server will start on `http://localhost:8080` (or the port specified in your `.env` file).

### Building

Build the TypeScript code:
```bash
npm run build
```

### Running in Production

```bash
npm run build
npm start
```

## Project Structure

```
backend/
├── api/          # API routes organized by resource
├── db/           # Database connection and queries
├── middleware/   # Express middleware
├── utils/        # Utility functions
├── use-case/     # Business logic use cases
├── shared/       # Shared code
├── app.ts        # Express app configuration
├── server.ts     # Server initialization
└── tsconfig.json # TypeScript configuration
```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run build:clean` - Clean build directory and rebuild
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint and fix issues
- `npm run format` - Format code with Prettier
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage

## API Routes

API routes should be organized in the `api/` directory by resource. Example structure:

```
api/
├── auth/
│   ├── entry-points/
│   │   └── api.ts       # Route definitions
│   └── use-case/
│       └── use-case.ts  # Business logic
└── users/
    ├── entry-points/
    │   └── api.ts
    └── use-case/
        └── use-case.ts
```

## Environment Variables

Required environment variables:

- `OPENAI_API_KEY` - Your OpenAI API key for chat functionality with function calling
- `DATABASE_URL` - PostgreSQL database connection string
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for server-side operations)
- `JWT_SECRET` - Secret key for JWT token signing

Create a `.env` file in the backend directory with these variables.

