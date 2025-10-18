# Chat Streaming Fix

## Issue
The backend was sending chat events via Server-Sent Events (SSE) with format `{"type":"reasoning-delta","delta":"g"}`, but the UI was not reflecting the new messages.

## Root Causes

### 1. Message Not Created on `message-start` Event
**Problem**: When the backend sent the `message-start` event, the frontend's `updateMessage` function tried to update a message that didn't exist yet in the store.

**Solution**: Modified `updateMessage` in `frontend/store/chat.ts` to create a new message if it doesn't exist:

```typescript
updateMessage: (messageId, updates) =>
  set((state) => {
    const existingMessage = state.messages.find((msg) => msg.id === messageId);
    
    // If message doesn't exist, create it
    if (!existingMessage) {
      const newMessage: Message = {
        id: messageId,
        chatId: updates.chatId || "",
        userId: updates.userId || "",
        role: updates.role || "assistant",
        content: updates.content || "",
        createdAt: updates.createdAt || new Date(),
        parts: updates.parts || [],
        isStreaming: updates.isStreaming,
      };
      return {
        messages: [...state.messages, newMessage],
      };
    }
    
    // Otherwise update existing message
    return {
      messages: state.messages.map((msg) =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      ),
    };
  }),
```

### 2. Incorrect API Endpoint URL
**Problem**: The API URL construction was inconsistent. The environment variable `NEXT_PUBLIC_API_URL` was set to `http://localhost:8080`, but the code was appending paths inconsistently.

**Solution**: Fixed the endpoint construction in `frontend/hooks/useStreamingChat.ts`:

```typescript
// Before:
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";
const endpoint = `${apiUrl}/chat/stream-text`;
// This would create: http://localhost:8080/chat/stream-text (WRONG!)

// After:
const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const endpoint = `${baseUrl}/api/chat/stream-text`;
// This creates: http://localhost:8080/api/chat/stream-text (CORRECT!)
```

## How the Streaming Works Now

### Backend Flow
1. **message-start**: Sends assistant message ID
2. **reasoning-started**: Begins reasoning phase
3. **reasoning-delta**: Streams reasoning content character by character
4. **reasoning-end**: Completes reasoning phase
5. **content**: Streams response content character by character
6. **message-end**: Completes the message

### Frontend Flow
1. User sends a message
2. `Chat.tsx` adds user message to store and calls `connectToStream`
3. `useStreamingChat` connects to the SSE endpoint
4. For each event received:
   - **message-start**: Creates/updates assistant message with empty content
   - **reasoning-started**: Creates a new reasoning step in the message parts
   - **reasoning-delta**: Appends to the current reasoning step content
   - **reasoning-end**: Marks reasoning step as complete
   - **content**: Appends to the message content
   - **message-end**: Marks message as complete

### UI Rendering
- `MessageItem.tsx` renders the message
- Shows reasoning steps in collapsible sections
- Shows streaming cursor during active streaming
- Updates in real-time as content streams in

## Testing

To test the chat streaming:

1. Start the backend:
   ```bash
   cd backend
   npm run dev
   ```

2. Start the frontend:
   ```bash
   cd frontend
   npm run dev
   ```

3. Open http://localhost:3000 and log in

4. Open the chat interface (right sidebar)

5. Send a message

6. You should see:
   - Your message appear immediately
   - Assistant message created
   - "Thinking..." indicator with reasoning content streaming in
   - Response content streaming in character by character

## Debugging

If streaming still doesn't work:

1. **Check the console** for the log message: "Connecting to chat stream: http://localhost:8080/api/chat/stream-text"

2. **Check Network tab** in browser DevTools:
   - Look for the POST request to `/api/chat/stream-text`
   - Should show "EventStream" type
   - Should show status 200
   - Should show chunks of data coming in

3. **Check backend logs** for:
   - "Client disconnected from stream" (if connection drops)
   - Any error messages

4. **Verify environment variables**:
   ```bash
   # In frontend/.env.local
   NEXT_PUBLIC_API_URL=http://localhost:8080
   ```

## Files Modified

1. `frontend/store/chat.ts` - Fixed `updateMessage` to create messages
2. `frontend/hooks/useStreamingChat.ts` - Fixed API endpoint URL construction
3. Added console logging for debugging

## Related Files

- Backend streaming: `backend/api/chat/use_cases/use-case.ts`
- Backend API endpoint: `backend/api/chat/entry-points/api.ts`
- Frontend types: `frontend/types/chat.ts`
- UI components: `frontend/components/chat/MessageItem.tsx`, `frontend/components/chat/ReasoningStep.tsx`

