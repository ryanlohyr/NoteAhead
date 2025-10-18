# O3 Integration Testing Guide

## Prerequisites

1. **Environment Variables**
   Make sure your `.env` file in the backend has:
   ```env
   OPENAI_API_KEY=sk-...
   DATABASE_URL=postgresql://...
   ```

2. **Database Setup**
   The pgvector extension should already be installed and migrations run:
   ```bash
   cd backend
   npm run migrate
   ```

3. **Build & Start Backend**
   ```bash
   cd backend
   npm run build
   npm run dev
   ```

4. **Start Frontend**
   ```bash
   cd frontend
   npm run dev
   ```

## Test Cases

### Test 1: Basic Math Tool (addNumbers)

**Purpose**: Verify tool calling works and reasoning is streamed

**Steps**:
1. Open the chat interface
2. Type: "What is 42 + 58?"
3. Send the message

**Expected Behavior**:
- See reasoning events in console (reasoning-started, reasoning-delta, reasoning-end)
- See `function_calls_to_execute` event with `addNumbers` tool
- See `function_call_result` event with result: 100
- Final response: "42 + 58 equals 100" (or similar)

**Console Output to Look For**:
```javascript
// In browser console
{ type: "reasoning-started" }
{ type: "reasoning-delta", delta: "I need to add..." }
{ type: "reasoning-end" }
{ type: "function_calls_to_execute", functionCallsToExecute: [{ name: "addNumbers", ... }] }
{ type: "function_call_result", id: "...", result: 100 }
{ type: "content", content: "The sum..." }
```

### Test 2: Multiple Math Operations

**Purpose**: Test multi-iteration agentic loop

**Steps**:
1. Type: "What is (25 + 75) + (100 + 50)?"
2. Send the message

**Expected Behavior**:
- Multiple function calls to addNumbers
- Iteration 1: Calculates 25 + 75 = 100
- Iteration 2: Calculates 100 + 50 = 150
- Iteration 3: Calculates 100 + 150 = 250
- Final answer: 250

### Test 3: Knowledge Base Search (RAG)

**Purpose**: Verify vector search works with uploaded documents

**Prerequisites**:
- Upload a PDF document first through the files page
- Wait for embeddings to complete (embeddingsStatus = "success")

**Steps**:
1. Upload a document (e.g., a research paper about AI)
2. Wait for processing to complete
3. Type: "What is in my documents about [topic from your document]?"
4. Send the message

**Expected Behavior**:
- See reasoning about searching documents
- See `function_calls_to_execute` with `search_knowledge_base` tool
- See `function_call_result` with array of matching chunks
- Final response references content from your document
- Response includes citations like [5](file-id)

**Example Queries**:
- "What definitions are in my documents?"
- "Find questions and answers in my notes"
- "What is the main topic of my uploaded file?"
- "Summarize the key concepts from page 5"

### Test 4: Combined Tools

**Purpose**: Test AI deciding which tool to use

**Steps**:
Try these queries that mix both tools:
1. "I have 10 documents, and I read 3. How many are left? Also, what topics are in my documents?"
2. "Calculate 50 + 50, then search my documents for that number"

**Expected Behavior**:
- AI uses addNumbers for math
- AI uses search_knowledge_base for document queries
- Coherent response combining both results

### Test 5: Reasoning Visibility

**Purpose**: Verify reasoning is properly streamed

**Steps**:
1. Type: "Explain the concept of neural networks, and if I have any documents about it, include that information too"
2. Watch the frontend carefully

**Expected Behavior**:
- Reasoning section appears before the answer
- You should see the AI's thought process:
  - "I should first check if the user has documents..."
  - "I'll search their knowledge base..."
  - "Now I'll explain based on..."
- Reasoning is streamed in real-time (not all at once)

### Test 6: Error Handling

**Purpose**: Verify graceful error handling

**Test 6a: No Documents**
- Clear all documents
- Type: "What is in my documents?"
- Expected: AI gracefully handles empty results

**Test 6b: Invalid Math**
- Type: "What is apple + orange?"
- Expected: AI explains this isn't valid math

**Test 6c: Complex Query**
- Type something very complex that requires 10+ iterations
- Expected: System stops at max iterations and provides best answer

## Debugging

### Enable Verbose Logging

In `backend/api/chat/use_cases/use-case.ts`, the following logs are already in place:

```typescript
console.log(`Iteration ${iterations}: Found ${currentFunctionCalls.length} function calls`);
```

### Check Database

Verify chunks are properly stored:
```sql
-- Check if embeddings exist
SELECT 
  f.name,
  f.embeddings_status,
  COUNT(c.id) as chunk_count
FROM files f
LEFT JOIN chunks c ON c.file_id = f.id
WHERE f.user_id = 'YOUR_USER_ID'
GROUP BY f.id, f.name, f.embeddings_status;

-- Test vector search manually
SELECT 
  content,
  1 - (embedding <=> '[0.1, 0.2, ...]'::vector) as similarity
FROM chunks
WHERE user_id = 'YOUR_USER_ID'
  AND 1 - (embedding <=> '[0.1, 0.2, ...]'::vector) > 0.3
ORDER BY embedding <=> '[0.1, 0.2, ...]'::vector
LIMIT 10;
```

### Backend Logs

Watch the backend console for:
```
Iteration 1: Found 1 function calls
Searching knowledge base { userId: '...', query: '...', type: [...] }
Found 5 similar chunks
```

### Frontend DevTools

In browser console, filter for:
```javascript
// Filter SSE events
performance.getEntriesByType('resource').filter(r => r.name.includes('/chat/stream'))

// Monitor event stream
// You should see a constant stream of events
```

## Performance Benchmarks

Expected performance metrics:

| Operation | Expected Time |
|-----------|---------------|
| First Token (o3-mini) | 2-5 seconds |
| Reasoning Summary | 1-3 seconds |
| Tool Call (addNumbers) | <100ms |
| Tool Call (search_knowledge_base) | 200-500ms |
| Vector Search (10 results) | 50-150ms |
| Full Response (with 1 tool call) | 5-10 seconds |
| Full Response (with 3 tool calls) | 15-25 seconds |

## Common Issues & Solutions

### Issue 1: No reasoning shown
**Problem**: Reasoning events not appearing
**Solution**: 
- Check if model is o3-mini/o3 (not gpt-4o)
- Verify `reasoning: { effort: "medium", summary: "auto" }` is in the API call
- Check browser console for reasoning-* events

### Issue 2: Tools not called
**Problem**: AI responds without using tools
**Solution**:
- Check system instruction mentions the tools
- Verify tools array is passed to API
- Try more explicit prompts: "Use the search tool to find..."

### Issue 3: Empty search results
**Problem**: Knowledge base search returns no results
**Solution**:
- Verify file embeddings completed: `SELECT embeddings_status FROM files`
- Check similarity threshold (0.3 is default)
- Verify chunks exist: `SELECT COUNT(*) FROM chunks WHERE user_id = ?`
- Test with different queries

### Issue 4: Slow responses
**Problem**: Responses take too long
**Solution**:
- Check if HNSW index exists: `\d chunks` in psql
- Verify network latency to OpenAI
- Consider using `effort: "low"` for faster reasoning
- Check database connection pool

### Issue 5: Build errors
**Problem**: TypeScript compilation fails
**Solution**:
```bash
cd backend
rm -rf node_modules dist
npm install
npm run build
```

## Advanced Testing

### Load Testing

Test multiple concurrent requests:
```bash
# Install artillery
npm install -g artillery

# Create test-chat.yml
artillery quick --count 10 --num 5 http://localhost:3001/api/chat/stream
```

### Memory Profiling

Monitor memory usage:
```bash
# Start with profiling
node --inspect backend/dist/server.js

# Open chrome://inspect
# Take heap snapshots during conversations
```

### Cost Tracking

Monitor OpenAI API costs:
- O3-mini pricing: ~$1.10 per 1M input tokens, ~$4.40 per 1M output tokens
- With reasoning, expect ~3-5x more input tokens
- Add logging for token usage from response metadata

## Success Criteria

✅ All test cases pass
✅ Reasoning is visible in real-time
✅ Tools are called correctly
✅ Knowledge base search returns relevant results
✅ Error handling is graceful
✅ No memory leaks after 100+ requests
✅ Responses are coherent and helpful
✅ Citations are properly formatted

## Next Steps

After testing:
1. Add more tools (code execution, web search)
2. Implement conversation history
3. Add user feedback mechanism
4. Optimize prompts based on usage
5. Add analytics/monitoring
6. Implement rate limiting
7. Add unit tests for each component

