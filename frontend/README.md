# NoteAhead Frontend

Next.js + TypeScript frontend for NoteAhead application.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file based on `.env.example`:
```bash
cp .env.example .env.local
```

3. Update the `.env.local` file with your configuration.

### Development

Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building

Build for production:
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
frontend/
├── app/              # Next.js app directory (pages and layouts)
├── components/       # React components
│   └── ui/          # Reusable UI components (shadcn/ui)
├── hooks/           # Custom React hooks
├── lib/             # Library functions and utilities
├── store/           # Zustand state management stores
├── query/           # TanStack Query hooks for API calls
├── public/          # Static files
└── styles/          # Global styles
```

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI primitives)
- **State Management**: Zustand
- **Data Fetching**: TanStack Query
- **Form Handling**: React Hook Form + Zod
- **Animations**: Framer Motion

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Component Guidelines

### UI Components

Place reusable UI components in `components/ui/`. These are typically shadcn/ui components.

### Feature Components

Place feature-specific components in `components/` organized by feature.

### State Management

Use Zustand for global state management. Create stores in the `store/` directory:

```typescript
// store/exampleStore.ts
import { create } from 'zustand';

interface ExampleState {
  count: number;
  increment: () => void;
}

export const useExampleStore = create<ExampleState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));
```

### API Calls

Use TanStack Query for data fetching. Create query hooks in the `query/` directory:

```typescript
// query/exampleQuery.ts
import { useQuery } from '@tanstack/react-query';

export const useExample = () => {
  return useQuery({
    queryKey: ['example'],
    queryFn: async () => {
      const response = await fetch('/api/example');
      return response.json();
    },
  });
};
```

## Environment Variables

See `.env.example` for required environment variables.

## Adding shadcn/ui Components

To add new shadcn/ui components:

```bash
npx shadcn@latest add [component-name]
```

Example:
```bash
npx shadcn@latest add button
```

