# O3 Chat Architecture with Reasoning & Knowledge Base Search

## System Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                    │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  Chat Component                                                 │    │
│  │  - Receives SSE events                                          │    │
│  │  - Displays reasoning steps                                     │    │
│  │  - Shows function calls                                         │    │
│  │  - Renders final response                                       │    │
│  └────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                        SSE Events  │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          BACKEND API                                     │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  /api/chat/stream                                               │    │
│  │  - Manages SSE connection                                       │    │
│  │  - Orchestrates chat flow                                       │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                    │                                     │
│                                    ▼                                     │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  getChatStream (use-case)                                       │    │
│  │  ┌──────────────────────────────────────────────────────────┐  │    │
│  │  │  AGENTIC LOOP (max 10 iterations)                         │  │    │
│  │  │  ┌────────────────────────────────────────────────────┐   │  │    │
│  │  │  │  1. Send to O3-mini                                 │   │  │    │
│  │  │  │     - System instruction + conversation             │   │  │    │
│  │  │  │     - Tool definitions                              │   │  │    │
│  │  │  └────────────────────────────────────────────────────┘   │  │    │
│  │  │                      │                                      │  │    │
│  │  │                      ▼                                      │  │    │
│  │  │  ┌────────────────────────────────────────────────────┐   │  │    │
│  │  │  │  2. Stream Reasoning & Content                      │   │  │    │
│  │  │  │     Events:                                         │   │  │    │
│  │  │  │     - reasoning-started                             │   │  │    │
│  │  │  │     - reasoning-delta                               │   │  │    │
│  │  │  │     - reasoning-end                                 │   │  │    │
│  │  │  │     - content                                       │   │  │    │
│  │  │  └────────────────────────────────────────────────────┘   │  │    │
│  │  │                      │                                      │  │    │
│  │  │                      ▼                                      │  │    │
│  │  │  ┌────────────────────────────────────────────────────┐   │  │    │
│  │  │  │  3. Extract Function Calls                          │   │  │    │
│  │  │  │     - Parse response.output                         │   │  │    │
│  │  │  │     - Filter for function_call types                │   │  │    │
│  │  │  └────────────────────────────────────────────────────┘   │  │    │
│  │  │                      │                                      │  │    │
│  │  │         ┌────────────┴──────────────┐                      │  │    │
│  │  │         │  No Function Calls?       │                      │  │    │
│  │  │         │  YES → Exit Loop           │                      │  │    │
│  │  │         │  NO  → Continue            │                      │  │    │
│  │  │         └────────────┬──────────────┘                      │  │    │
│  │  │                      ▼                                      │  │    │
│  │  │  ┌────────────────────────────────────────────────────┐   │  │    │
│  │  │  │  4. Execute Tools                                   │   │  │    │
│  │  │  │     Send: function_calls_to_execute event          │   │  │    │
│  │  │  └────────────────────────────────────────────────────┘   │  │    │
│  │  │                      │                                      │  │    │
│  │  │                      ▼                                      │  │    │
│  │  │  ┌────────────────────────────────────────────────────┐   │  │    │
│  │  │  │  5. Add Results to Conversation                     │   │  │    │
│  │  │  │     - Format function results                       │   │  │    │
│  │  │  │     - Add to inputMessages                          │   │  │    │
│  │  │  │     Send: function_call_result events              │   │  │    │
│  │  │  └────────────────────────────────────────────────────┘   │  │    │
│  │  │                      │                                      │  │    │
│  │  │                      └──────┐  Loop back to step 1          │  │    │
│  │  │                             │                               │  │    │
│  │  └─────────────────────────────┘                              │  │    │
│  └────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                        Tool Calls  │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           TOOL SYSTEM                                    │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  executeTool (dispatcher)                                       │    │
│  │     │                                                            │    │
│  │     ├─► addNumbers                                              │    │
│  │     │   - Simple math operation                                 │    │
│  │     │   - Returns sum                                           │    │
│  │     │                                                            │    │
│  │     └─► searchKnowledgeBase                                     │    │
│  │         ┌──────────────────────────────────────────────────┐   │    │
│  │         │  1. Generate embedding for query                 │   │    │
│  │         │     - Uses OpenAI text-embedding-3-small         │   │    │
│  │         └──────────────────────────────────────────────────┘   │    │
│  │                         │                                        │    │
│  │                         ▼                                        │    │
│  │         ┌──────────────────────────────────────────────────┐   │    │
│  │         │  2. Vector similarity search                     │   │    │
│  │         │     - Query PostgreSQL with HNSW index           │   │    │
│  │         │     - Filter by content type                     │   │    │
│  │         │     - Return top 10 results                      │   │    │
│  │         └──────────────────────────────────────────────────┘   │    │
│  │                         │                                        │    │
│  │                         ▼                                        │    │
│  │         ┌──────────────────────────────────────────────────┐   │    │
│  │         │  3. Format results                               │   │    │
│  │         │     - Add page references: [page](fileId)        │   │    │
│  │         │     - Include similarity scores                  │   │    │
│  │         │     - Return structured data                     │   │    │
│  │         └──────────────────────────────────────────────────┘   │    │
│  └────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          DATABASE LAYER                                  │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  PostgreSQL with pgvector                                       │    │
│  │                                                                  │    │
│  │  Tables:                                                         │    │
│  │  ┌──────────────────────────────────────────────────────────┐  │    │
│  │  │  files                                                    │  │    │
│  │  │  - id, name, userId, s3Url, mimeType                     │  │    │
│  │  │  - embeddingsStatus, summary                             │  │    │
│  │  └──────────────────────────────────────────────────────────┘  │    │
│  │                                                                  │    │
│  │  ┌──────────────────────────────────────────────────────────┐  │    │
│  │  │  chunks                                                   │  │    │
│  │  │  - id, content, fileId, embedding (vector 1536)          │  │    │
│  │  │  - pageNumbers, type, context                            │  │    │
│  │  │  - Index: HNSW on embedding (cosine distance)            │  │    │
│  │  └──────────────────────────────────────────────────────────┘  │    │
│  │                                                                  │    │
│  │  Operations:                                                     │    │
│  │  - findSimilarChunks: Vector similarity search                  │    │
│  │  - createChunks: Insert embeddings                              │    │
│  │  - deleteChunksByFileId: Cleanup                                │    │
│  └────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

## Event Flow Example

### User: "What is in my documents about neural networks?"

```
1. Frontend → Backend: POST /api/chat/stream
   Body: { message: "What is in my documents about neural networks?", chatId, userId }

2. Backend → OpenAI: openai.responses.create()
   Model: o3-mini
   Input: [
     { role: "developer", content: "System instruction..." },
     { role: "user", content: [{ type: "input_text", text: "..." }] }
   ]
   Tools: [addNumbersTool, searchKnowledgeBaseTool]

3. OpenAI Responses (Streaming):
   ┌─────────────────────────────────────────────┐
   │ Event: response.reasoning_summary_part.added│
   │ → Send: { type: "reasoning-started" }       │
   └─────────────────────────────────────────────┘
   ┌─────────────────────────────────────────────┐
   │ Event: response.reasoning_summary_text.delta│
   │ Delta: "The user wants to search..."        │
   │ → Send: { type: "reasoning-delta", delta }  │
   └─────────────────────────────────────────────┘
   ┌─────────────────────────────────────────────┐
   │ Event: response.reasoning_summary_text.done │
   │ → Send: { type: "reasoning-end" }           │
   └─────────────────────────────────────────────┘
   ┌─────────────────────────────────────────────┐
   │ Event: response.completed                   │
   │ Output: [                                   │
   │   {                                         │
   │     type: "function_call",                  │
   │     name: "search_knowledge_base",          │
   │     call_id: "call_123",                    │
   │     arguments: "{\"query\":\"neural..."     │
   │   }                                         │
   │ ]                                           │
   └─────────────────────────────────────────────┘

4. Backend → Frontend:
   Event: { type: "function_calls_to_execute", functionCallsToExecute: [...] }

5. Backend Executes Tool:
   searchKnowledgeBaseFunction({
     userId,
     query: "neural networks",
     type: ["Definitions and Properties", "Others"]
   })
   
   5a. Generate embedding for "neural networks"
   5b. Query database: SELECT ... WHERE 1 - (embedding <=> query) > 0.3
   5c. Return top 10 results

6. Backend → Frontend:
   Event: { 
     type: "function_call_result", 
     id: "call_123", 
     result: [
       { urlString: "[5](file-uuid)", content: "...", similarity: 0.85 },
       ...
     ]
   }

7. Backend → OpenAI: (Iteration 2)
   Input: [
     { role: "developer", content: "System instruction..." },
     { role: "user", content: "What is in my documents..." },
     { role: "assistant", content: "Function call results:\n..." }
   ]
   Tools: [addNumbersTool, searchKnowledgeBaseTool]

8. OpenAI Responses (Streaming):
   ┌─────────────────────────────────────────────┐
   │ Event: response.reasoning_summary_part.added│
   │ → Send: { type: "reasoning-started" }       │
   └─────────────────────────────────────────────┘
   ┌─────────────────────────────────────────────┐
   │ Event: response.output_text.delta           │
   │ Delta: "Based on your documents..."         │
   │ → Send: { type: "content", content }        │
   └─────────────────────────────────────────────┘
   (continues streaming until complete)
   ┌─────────────────────────────────────────────┐
   │ Event: response.completed                   │
   │ Output: [                                   │
   │   {                                         │
   │     type: "output_text",                    │
   │     text: "Based on your documents, ..."    │
   │   }                                         │
   │ ]                                           │
   │ No function calls → Exit loop               │
   └─────────────────────────────────────────────┘

9. Backend → Frontend:
   Event: { type: "message-end", id: messageId }

10. Connection closed
```

## Key Components

### 1. Streaming Events
- `message-start`: Conversation begins
- `reasoning-started`: AI starts thinking
- `reasoning-delta`: Chunks of reasoning content
- `reasoning-end`: Reasoning complete
- `content`: Actual response text
- `function_calls_to_execute`: Tools to be called
- `function_call_result`: Tool execution results
- `message-end`: Response complete
- `error`: Error occurred

### 2. Tools
- **addNumbers**: Demo tool for math operations
- **searchKnowledgeBase**: RAG tool for document search
  - Uses vector embeddings
  - Cosine similarity search
  - Returns formatted results with citations

### 3. Agentic Loop
- Multi-iteration reasoning
- Automatic tool calling
- Context accumulation
- Safety limit (10 iterations max)

## Performance Optimizations

1. **HNSW Index**: Fast approximate nearest neighbor search
2. **Streaming**: Real-time response delivery
3. **Parallel Tool Calls**: (Future) Execute multiple tools simultaneously
4. **Caching**: (Future) Cache embeddings and results
5. **Connection Pooling**: Reuse database connections

