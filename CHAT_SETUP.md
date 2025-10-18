# Chat Feature Setup Guide

This guide explains how to set up and use the chat feature with SSE streaming.

## Prerequisites

1. Supabase account and project set up
2. Node.js and npm installed

## Environment Variables

### Backend (.env)

Create a `.env` file in the `backend/` directory with:

```env
# Server Configuration
PORT=8080
APP_ENV=development

# Frontend URLs (for CORS)
FRONTEND_WHITELIST=http://localhost:3000

# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

### Frontend (.env.local)

Create a `.env.local` file in the `frontend/` directory with:

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8080/api

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

## Installation

### Backend

```bash
cd backend
npm install
npm run build
npm run dev
```

The backend server will start on port 8080.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will start on port 3000.

## Usage

1. Open the application at `http://localhost:3000`
2. Log in using Supabase authentication
3. Click the "Open Right Sidebar" button
4. Type a message in the chat input
5. Press Enter or click the Send button
6. Watch the assistant "think" (reasoning process) and then respond with an echo of your message

## Features

- **SSE Streaming**: Real-time streaming of responses
- **Reasoning Display**: Shows the assistant's thinking process
- **Echo Functionality**: Currently echoes your message back (placeholder for AI)
- **In-Memory Storage**: Messages stored in memory (resets on server restart)
- **Supabase Auth**: Secure authentication using Supabase

## Architecture

### Backend

- **Authentication**: `backend/middleware/auth.ts` - Supabase JWT verification
- **Types**: `backend/api/chat/types.ts` - Type definitions
- **Storage**: `backend/api/chat/data_access.ts` - In-memory message store
- **Streaming**: `backend/api/chat/use_cases/use-case.ts` - SSE streaming logic
- **API**: `backend/api/chat/entry-points/api.ts` - Chat endpoints

### Frontend

- **Types**: `frontend/types/chat.ts` - Type definitions
- **Store**: `frontend/store/chat.ts` - Zustand state management
- **Hook**: `frontend/hooks/useStreamingChat.ts` - SSE client logic
- **Components**:
  - `frontend/components/chat/Chat.tsx` - Main chat container
  - `frontend/components/chat/ChatInput.tsx` - Input component
  - `frontend/components/chat/MessageItem.tsx` - Message display
  - `frontend/components/chat/ReasoningStep.tsx` - Reasoning display
- **Integration**: `frontend/components/RightSidebar.tsx` - Chat in sidebar

## Streaming Flow

1. **message-start**: Signals start of new assistant message
2. **reasoning-started**: Begins reasoning phase
3. **reasoning-delta**: Streams reasoning text character by character
4. **reasoning-end**: Completes reasoning phase
5. **content**: Streams response content character by character
6. **message-end**: Signals completion of message
7. **error**: Reports any errors during streaming

## Testing

1. Start both backend and frontend servers
2. Open the application and log in
3. Open the right sidebar
4. Send a message like "Hello, world!"
5. Observe:
   - Reasoning animation (thinking process)
   - Character-by-character echo response
   - Message history persistence (until server restart)

## Next Steps

To enhance the chat feature:

1. Replace echo logic with actual AI integration (OpenAI, Anthropic, etc.)
2. Add database persistence (PostgreSQL, MongoDB, etc.)
3. Implement chat history management
4. Add file upload capabilities
5. Implement more sophisticated reasoning display
6. Add markdown rendering for responses
7. Implement chat sessions and chat list

## Troubleshooting

### "No authorization token provided"
- Ensure you're logged in with Supabase
- Check that Supabase environment variables are set correctly

### "Failed to initiate chat stream"
- Verify backend is running on port 8080
- Check that NEXT_PUBLIC_API_URL is set correctly in frontend .env.local

### Messages not appearing
- Check browser console for errors
- Verify network tab shows SSE connection
- Ensure CORS is configured correctly in backend

### Reasoning not showing
- Click "Show reasoning" button in message
- Check that reasoning events are being received (browser dev tools Network tab)

