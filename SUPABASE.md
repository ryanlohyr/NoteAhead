# Supabase Real-time Architecture

This document describes the real-time collaborative editing architecture using Supabase Edge Functions and Realtime API.

## Architecture Overview

The system consists of three main components:
1. **Notes Page** (Frontend)
2. **Supabase Edge Functions** (Backend Logic)
3. **Supabase Realtime API** (WebSocket Communication)

## Sequence Flow

### 1. Initial Connection

The notes page performs a health check with the Supabase Edge Function to ensure the service is available.

```
Notes Page → Edge Function: health check
```

### 2. Realtime Connection Setup

Once the health check passes, the Edge Function starts listening to the Supabase Realtime API for incoming events.

```
Edge Function → Realtime API: start listening
```

### 3. Keystroke Transmission

As the user types in the notes page, keystrokes are sent directly to the Supabase Realtime API.

```
Notes Page → Realtime API: sends keystrokes
```

The Realtime API broadcasts these keystrokes to all connected clients (including the Edge Function).

```
Realtime API → Edge Function: sends keystrokes
```

### 4. Intent Prediction

The Edge Function analyzes the incoming keystrokes to predict what the user is going to type next. This involves:

1. **Processing keystrokes** to understand user intent
2. **Making an RPC call** to find the most similar pages/content according to the detected intent
3. **Generating predictions** based on the retrieved context

```
Edge Function (internal): predict what user is going to type
Edge Function (internal): RPC call to find most similar pages according to intent
```

### 5. Prediction Publishing

Once predictions are generated, they are published back through the Realtime API to the notes page.

```
Edge Function → Realtime API: publish prediction
Realtime API → Notes Page: publish prediction
```

## Key Features

### Real-time Collaboration
- Low-latency keystroke synchronization via WebSocket connections
- Broadcast updates to all connected clients

### Predictive Intelligence
- Analyzes user typing patterns in real-time
- Uses semantic search to find relevant content
- Provides intelligent suggestions based on intent

### Scalable Architecture
- Supabase Edge Functions handle compute-intensive prediction logic
- Realtime API manages WebSocket connections efficiently
- Decoupled architecture allows for independent scaling

## Technical Implementation

### Edge Function Responsibilities
- Health check endpoint for connection validation
- Listen to realtime keystroke events
- Process and analyze user intent
- Query similar pages via RPC calls
- Publish predictions back to clients

### Realtime API Responsibilities
- Manage WebSocket connections
- Broadcast keystrokes to all listeners
- Deliver predictions to frontend clients
- Handle connection lifecycle

### Frontend Responsibilities
- Send health check requests
- Transmit keystrokes to Realtime API
- Receive and display predictions
- Handle connection state

## Benefits

1. **Low Latency**: Direct WebSocket communication reduces round-trip time
2. **Scalability**: Supabase infrastructure handles connection management
3. **Intelligence**: Real-time intent detection provides contextual suggestions
4. **Collaboration**: Multiple users can interact with shared content simultaneously

## Future Enhancements

- Add conflict resolution for simultaneous edits
- Implement user presence indicators
- Add typing indicators for active users
- Optimize prediction algorithms for better accuracy
- Add caching layer for frequently accessed content

