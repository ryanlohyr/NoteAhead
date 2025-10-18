# O3 Integration with Reasoning Streaming and Knowledge Base Search

## Summary

Successfully refactored the chat system to use OpenAI's o3-mini model with reasoning streaming and added a knowledge base search tool. The implementation follows the architecture patterns from LearnKata.

## Changes Made

### 1. Updated Types (`backend/api/chat/types.ts`)
- Added `FunctionCallToExecute` interface to represent tool calls
- Extended `StreamingEvent` type to include:
  - `function_calls_to_execute`: Notifies frontend when tools are being called
  - `function_call_result`: Returns results from tool execution

### 2. Database Layer (`backend/db/index.ts`)
- Added `findSimilarChunks` function to `chunkDb` for vector similarity search
- Uses PostgreSQL's vector cosine distance operator (`<=>`) with HNSW index
- Supports filtering by content type and configurable similarity threshold

### 3. Tool System (`backend/api/chat/tools/`)

Created a modular tool system with three new files:

**types.ts**
- Defined `ToolNames` enum for tool identification

**definitions.ts**
- `addNumbersTool`: Simple math function for demonstration
- `searchKnowledgeBaseTool`: Vector search through user's uploaded documents
  - Supports filtering by content type (Definitions, Questions, Answers, etc.)
  - Returns formatted results with page numbers and file IDs

**functions.ts**
- `addNumbersFunction`: Implements number addition
- `searchKnowledgeBaseFunction`: 
  - Generates embeddings for the search query
  - Performs vector similarity search
  - Returns formatted results with file references
- `executeTool`: Central dispatcher for all tool executions

### 4. Main Use Case Refactor (`backend/api/chat/use_cases/use-case.ts`)

Complete rewrite to use OpenAI Responses API with o3-mini:

**Key Changes:**
- Uses `openai.responses.create()` instead of `openai.chat.completions.create()`
- Model changed from `gpt-4o` to `o3-mini`
- Added reasoning configuration:
  ```typescript
  reasoning: {
    effort: "medium",
    summary: "auto",
  }
  ```

**Reasoning Streaming:**
- Captures and streams reasoning events:
  - `response.reasoning_summary_part.added` → `reasoning-started`
  - `response.reasoning_summary_text.delta` → `reasoning-delta`
  - `response.reasoning_summary_text.done` → `reasoning-end`

**Agentic Loop:**
- Implements multi-iteration tool calling (up to 10 iterations)
- Each iteration:
  1. Sends request to o3-mini with current conversation
  2. Streams reasoning and content to frontend
  3. Extracts function calls from response
  4. Executes tools with proper context (userId)
  5. Adds results back to conversation
  6. Continues until no more function calls needed

**Tool Execution Flow:**
```
User Query → O3 Reasoning → Tool Calls → Execute Tools → Return Results → O3 Final Answer
```

## Architecture Highlights

### Following LearnKata Patterns

1. **Tool Definitions**: Separate definition files with strict typing
2. **Tool Functions**: Isolated function implementations with error handling
3. **Agentic Loop**: Multi-iteration pattern for complex reasoning
4. **Streaming Events**: Rich event types for frontend state management
5. **Vector Search**: Cosine similarity search with configurable thresholds

### Improvements Over Original

1. **Better Reasoning Visibility**: Real-time streaming of AI's thought process
2. **Knowledge Base Integration**: AI can now search through uploaded documents
3. **Modular Tool System**: Easy to add new tools by adding definitions and functions
4. **Type Safety**: Proper TypeScript types throughout the system
5. **Error Handling**: Comprehensive try-catch blocks with detailed error messages

## How It Works

### Example: User asks "What is in my documents about machine learning?"

1. **Request Processing**
   - User message sent to backend
   - System instruction added with tool descriptions

2. **O3 Reasoning** (Iteration 1)
   - O3 thinks about the query (reasoning streamed to frontend)
   - Decides to use `search_knowledge_base` tool
   - Generates function call with query: "machine learning concepts"

3. **Tool Execution**
   - Frontend receives `function_calls_to_execute` event
   - Backend generates embedding for "machine learning concepts"
   - Searches vector database for similar chunks
   - Returns top 10 results with file references
   - Frontend receives `function_call_result` event

4. **O3 Final Answer** (Iteration 2)
   - O3 receives search results
   - Reasons about the content (reasoning streamed)
   - Synthesizes answer from search results
   - Streams final response with citations like [5](file-id)

### Example: User asks "What is 42 + 58?"

1. O3 recognizes this is a math problem
2. Calls `addNumbers` tool with a=42, b=58
3. Receives result: 100
4. Formats and returns answer to user

## Testing

To test the implementation:

1. **Start the backend:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Test Number Addition:**
   - Send: "What is 15 + 27?"
   - Expected: AI uses addNumbers tool and returns 42

3. **Test Knowledge Base Search:**
   - Upload a PDF document first
   - Send: "What is in my documents about [topic]?"
   - Expected: AI searches documents and returns relevant content with citations

4. **Test Reasoning Streaming:**
   - Watch the frontend for reasoning-started, reasoning-delta, and reasoning-end events
   - The AI's thought process should be visible before the final answer

## Configuration

Key configuration options in the use-case:

- **Model**: `o3-mini` (can change to `o3` for more powerful reasoning)
- **Reasoning Effort**: `medium` (options: low, medium, high)
- **Max Iterations**: 10 (prevents infinite loops)
- **Similarity Threshold**: 0.3 (for vector search)
- **Search Limit**: 10 chunks (number of results to return)

## Future Enhancements

Potential improvements:

1. Add more tools (code execution, web search, etc.)
2. Implement conversation history management
3. Add file-specific search (search within a single document)
4. Support for multiple file types beyond PDFs
5. Add reasoning effort configuration from frontend
6. Implement cost tracking per request
7. Add rate limiting for tool calls
8. Support for multi-modal inputs (images, audio)

## Notes

- The implementation uses OpenAI's Responses API which is designed for o1/o3 models
- Reasoning is summarized automatically by the model
- Tool calls are parallel-capable but currently executed sequentially
- Vector search uses HNSW index for fast similarity search
- All database operations are properly indexed for performance

