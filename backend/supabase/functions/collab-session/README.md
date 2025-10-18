# Collab Session Edge Function - AI Provider Architecture

## Overview

This edge function now uses a modular AI provider architecture with automatic file reference insertion via cosine similarity search.

## Key Changes

### 1. **AI Provider Abstraction** (`ai-providers.ts`)

Created a provider pattern that supports multiple AI services:

- **OpenAI Provider**: Uses `gpt-4o-mini` by default
- **Groq Provider**: Uses `llama-3.1-8b-instant` by default

#### Switching Between Providers

In `index.ts`, change the `ACTIVE_PROVIDER` constant:

```typescript
// 🔧 CHANGE THIS TO SWITCH BETWEEN PROVIDERS: "openai" | "groq"
const ACTIVE_PROVIDER: ProviderType = "openai";  // or "groq"
```

### 2. **Automatic File Reference Insertion**

The model no longer needs to insert file IDs. Instead:

1. **AI generates suggestion text** (without file references)
2. **System creates embedding** of the suggestion using OpenAI's `text-embedding-3-small`
3. **Cosine similarity search** finds the top 2 most relevant chunks
4. **File references** are automatically inserted: `[pageNumber](fileId)`

### 3. **Workflow**

```
User types → Editor change event → AI generates suggestion
                                          ↓
                                    Get embedding
                                          ↓
                                Cosine similarity search
                                          ↓
                                Find top 2 chunks
                                          ↓
                          Insert references: text + [page](id)
                                          ↓
                              Send to client
```

## Functions

### Core Functions

- **`createAIProvider(type, config)`**: Factory function to create AI providers
- **`fetchAndFormatUserChunks()`**: Fetches chunks with embeddings from database
- **`getEmbedding(text, apiKey)`**: Gets embedding vector for text
- **`cosineSimilarity(vecA, vecB)`**: Computes similarity between two vectors
- **`findTopSimilarChunks()`**: Finds top N most similar chunks using cosine similarity
- **`insertFileReferences()`**: Inserts `[page](id)` references at end of text

## Environment Variables Required

- `OPENAI_API_KEY`: Required for OpenAI provider and embeddings
- `GROQ_API_KEY`: Required for Groq provider
- `SUPABASE_URL`: Supabase instance URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key

## Benefits

1. **More Accurate Citations**: Cosine similarity ensures relevant chunks are cited
2. **No Hallucinated IDs**: AI doesn't need to track/remember file IDs
3. **Flexible Providers**: Easy to switch between OpenAI and Groq
4. **Better Context**: Uses semantic search instead of pattern matching

## Database Schema

Chunks table must have:
- `id` (uuid)
- `content` (text)
- `page_numbers` (integer array)
- `embedding` (vector) - for cosine similarity
- `user_id` (uuid)

## Example Output

**AI generates:**
```
Only cells with the proper conditions can proceed to the M phase.
```

**System adds references:**
```
Only cells with the proper conditions can proceed to the M phase. [3](abc-123-def) [5](xyz-789-ghi)
```

Where `[3](abc-123-def)` links to page 3 of file ID abc-123-def (not the chunk ID, but the actual file ID from the chunks table).

