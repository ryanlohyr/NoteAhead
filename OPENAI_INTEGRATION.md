# OpenAI Integration with Function Calling

## Overview

The chat functionality has been integrated with OpenAI's GPT-4o model, including support for function calling (tools). The implementation uses a while loop to handle multiple tool calls as requested, streaming responses in real-time to the frontend.

## Features

- **Streaming Chat**: Real-time streaming of chat responses using OpenAI's streaming API
- **Function Calling**: Support for tools/functions that the AI can call
- **While Loop Architecture**: Handles multiple tool calls in sequence using a while loop until completion
- **Server-Sent Events (SSE)**: Streams responses to the frontend using SSE

## Implementation Details

### Location

`backend/api/chat/use_cases/use-case.ts`

### Tool Example: `addNumbers`

A demonstration tool that adds two numbers together:

```typescript
{
  type: "function",
  function: {
    name: "addNumbers",
    description: "Add two numbers together and return the sum",
    parameters: {
      type: "object",
      properties: {
        a: { type: "number", description: "The first number to add" },
        b: { type: "number", description: "The second number to add" }
      },
      required: ["a", "b"]
    }
  }
}
```

### How It Works

1. **Message Start**: Sends a `message-start` event to initialize the stream
2. **While Loop**: Continues processing until `isComplete` is true
3. **Streaming**: Streams content chunks from OpenAI to the frontend
4. **Tool Detection**: When OpenAI requests a tool call:
   - Sends reasoning events to show function execution
   - Executes the requested function (e.g., `addNumbers`)
   - Adds tool results to the conversation
   - Continues the loop to get the final response
5. **Completion**: Sends `message-end` event and saves the complete message

### Stream Events

The implementation sends the following SSE events:

- `message-start`: Chat response initialization
- `content`: Streaming text content chunks
- `reasoning-started`: Tool execution begins
- `reasoning-delta`: Tool execution progress
- `reasoning-end`: Tool execution complete
- `message-end`: Chat response complete
- `error`: Error occurred

## Setup

### 1. Install Dependencies

The OpenAI package is already installed:

```bash
cd backend
npm install
```

### 2. Configure Environment

Add your OpenAI API key to `backend/.env`:

```env
OPENAI_API_KEY=sk-...your-key-here...
```

### 3. Start the Backend

```bash
cd backend
npm run dev
```

## Usage Examples

### Example 1: Simple Chat

**User**: "Hello, how are you?"

**Response**: The AI responds with a normal chat message (no tool calls).

### Example 2: Function Call

**User**: "What is 25 plus 37?"

**Response Flow**:
1. AI recognizes it needs to use the `addNumbers` tool
2. Sends reasoning events: "Calling function: addNumbers..."
3. Executes `addNumbers({ a: 25, b: 37 })`
4. Gets result: `{ sum: 62 }`
5. AI responds: "The sum of 25 and 37 is 62."

## Adding New Tools

To add a new tool/function:

### 1. Define the Tool

Add to the `tools` array in `use-case.ts`:

```typescript
{
  type: "function",
  function: {
    name: "yourFunctionName",
    description: "Description of what the function does",
    parameters: {
      type: "object",
      properties: {
        param1: { type: "string", description: "First parameter" },
        param2: { type: "number", description: "Second parameter" }
      },
      required: ["param1", "param2"]
    }
  }
}
```

### 2. Implement the Function

Add the implementation:

```typescript
async function yourFunctionName(args: { param1: string; param2: number }): Promise<any> {
  const { param1, param2 } = args;
  // Your logic here
  return result;
}
```

### 3. Add to Tool Execution

In the tool execution section, add a case for your function:

```typescript
if (toolCall.name === "addNumbers") {
  const sum = await addNumbers(args);
  result = JSON.stringify({ sum });
} else if (toolCall.name === "yourFunctionName") {
  const output = await yourFunctionName(args);
  result = JSON.stringify(output);
} else {
  result = JSON.stringify({ error: "Unknown function" });
}
```

## Architecture Notes

This implementation follows the LearnKata architecture pattern:

- **Entry Points**: `backend/api/chat/entry-points/api.ts` - Route definitions
- **Use Cases**: `backend/api/chat/use_cases/use-case.ts` - Business logic (OpenAI integration)
- **Data Access**: `backend/api/chat/data_access.ts` - Message persistence
- **Types**: `backend/api/chat/types.ts` - Type definitions

## Testing

Test the integration by:

1. Start the backend: `cd backend && npm run dev`
2. Start the frontend: `cd frontend && npm run dev`
3. Navigate to the chat interface
4. Try messages like:
   - "What is 15 + 27?"
   - "Add 100 and 200 together"
   - "Calculate the sum of 45 and 55"

## Model Configuration

Currently using:
- Model: `gpt-4o`
- Streaming: Enabled
- Tool Choice: `auto` (AI decides when to use tools)

## Error Handling

The implementation includes error handling for:
- OpenAI API errors
- Function execution errors
- JSON parsing errors
- Stream interruptions

All errors are caught and sent as SSE error events to the frontend.

## Future Enhancements

Potential improvements:
- Add more tools (calculator, search, database queries, etc.)
- Support for parallel tool calls
- Tool call history tracking
- User-configurable tools
- Cost tracking per request

