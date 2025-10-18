# File Embedding Processing - Implementation Summary

## What Was Implemented

A complete PDF file processing system with automatic embedding generation, following LearnKata's architecture but simplified for NoteAhead.

### 1. Database Schema Updates ✅
- Added `embeddings_status` column to `files` table (values: `in_progress`, `success`, `failed`)
- Added `summary` column to `files` table for document summaries
- Added `lines_json_pages` column to `files` table to store MathPix raw output (JSON)
- Created `chunks` table for storing text chunks with embeddings
- Applied migration to database

### 2. Libraries Created ✅
- **MathPix Integration** (`backend/libraries/mathpix/`)
  - PDF text extraction using MathPix OCR service
  - Converts PDFs to markdown with page numbers
  - Handles upload, polling, and format retrieval

- **LangChain Integration** (`backend/libraries/langchain/`)
  - Text splitting using LatexTextSplitter
  - Configurable chunk size (512) and overlap (200)

- **AI Embeddings** (`backend/libraries/ai/`)
  - OpenAI embedding generation using `text-embedding-3-small`
  - Batch embedding support

### 3. Use Cases Created ✅
- **`extractChunksFromPdf`** (`backend/use-case/ai/extract.ts`)
  - Processes PDF with MathPix
  - Splits into chunks using LangChain
  - Returns chunks with metadata

- **`embedChunksUseCase`** (`backend/use-case/ai/extract.ts`)
  - Generates embeddings for text chunks

- **`processFileForEmbeddings`** (`backend/use-case/files/files.ts`)
  - Main processing pipeline:
    1. Sets file status to `in_progress`
    2. Downloads file from Supabase storage
    3. Extracts chunks from PDF
    4. Generates embeddings
    5. Stores chunks in database
    6. Updates file status to `success` or `failed`
  - Runs asynchronously in background

### 4. Database Operations ✅
- **`fileDb.updateFileStatus`** - Update file embedding status and summary
- **`chunkDb.createChunks`** - Batch insert chunks with embeddings
- **`chunkDb.deleteChunksByFileId`** - Delete chunks for a file

### 5. API Endpoints ✅
- **POST `/api/files`** - Triggers background processing after file creation
- **POST `/api/files/batch`** - Triggers processing for multiple files
- **GET `/api/files/:id/poll`** - Poll file processing status
  - Returns: `{ success, status, file }` where status is `in_progress`, `success`, or `failed`

## Environment Variables Required

Add these to your `.env` file in the `backend/` directory:

```bash
# MathPix OCR Service
MATHPIX_APP_ID=your_mathpix_app_id
MATHPIX_API_KEY=your_mathpix_api_key

# OpenAI (for embeddings)
OPENAI_API_KEY=your_openai_api_key

# Existing Supabase variables (should already be set)
# DATABASE_URL=...
# SUPABASE_URL=...
# SUPABASE_SERVICE_ROLE_KEY=...
```

## How It Works

1. **File Upload**:
   - User uploads a PDF file
   - File record is created in database with status `in_progress`
   - `processFileForEmbeddings` is triggered in the background

2. **Processing Pipeline**:
   - Download file from Supabase storage
   - MathPix extracts text and converts to markdown
   - Raw MathPix lines.json data is stored for future reference
   - Text is split into chunks (512 chars with 200 char overlap)
   - OpenAI generates embeddings for each chunk
   - Chunks and embeddings are stored in database
   - File status updated to `success` with summary and linesJsonPages

3. **Error Handling**:
   - If any step fails, file status is set to `failed`
   - Errors are logged to console
   - Processing is non-blocking (doesn't affect file upload response)

4. **Status Polling**:
   - Frontend can poll `GET /api/files/:id/poll` to check status
   - Returns current embedding status and file metadata

## File Structure

```
backend/
├── libraries/
│   ├── ai/
│   │   ├── embeddings.ts       # OpenAI embedding generation
│   │   └── index.ts
│   ├── langchain/
│   │   ├── langchain.ts        # Text splitting
│   │   └── index.ts
│   └── mathpix/
│       ├── mathpix.ts          # MathPix service
│       ├── types.ts            # Type definitions
│       ├── utils.ts            # Conversion utilities
│       └── index.ts
├── use-case/
│   ├── ai/
│   │   └── extract.ts          # PDF extraction & embedding
│   └── files/
│       └── files.ts            # File processing pipeline
├── db/
│   ├── index.ts                # Database operations
│   └── schemas/
│       └── schema.ts           # Updated schema with chunks
└── api/
    └── files/
        └── entry-points/
            └── api.ts          # Updated with processing & polling
```

## Next Steps

1. **Get MathPix Credentials**:
   - Sign up at https://mathpix.com/
   - Get your APP_ID and API_KEY
   - Add to `.env` file

2. **Test the Implementation**:
   - Upload a PDF file through the API
   - Poll the status endpoint to monitor processing
   - Check the chunks table for stored embeddings

3. **Frontend Integration** (Optional):
   - Add polling UI to show processing status
   - Display success/failure states
   - Show file summary when complete

## Simplified from LearnKata

- ✅ No Redis caching
- ✅ No retry mechanisms
- ✅ No recovery for stuck files
- ✅ No template/exam paper support
- ✅ No complex chunking strategies
- ✅ Just basic PDF → chunks → embeddings flow

## Dependencies Added

```json
{
  "@langchain/textsplitters": "^0.1.0",
  "ai": "^4.3.14",
  "@ai-sdk/openai": "^1.1.13",
  "p-limit": "^3.1.0"
}
```

All dependencies have been installed and the code compiles successfully! 🎉

