# Bug Fix: PostgreSQL Array Literal Error in Vector Search

## Issue

When using the knowledge base search tool, the following error occurred:

```
PostgresError: malformed array literal: "Others"
detail: 'Array value must start with "{" or dimension information.'
where: "unnamed portal parameter $5 = '...'"
```

## Root Cause

The vector similarity search function was trying to pass a JavaScript array to PostgreSQL using Drizzle ORM's `sql` template tag with `type = ANY(${typeFilters})`. However, Drizzle was not properly formatting the JavaScript array `['Others']` into a PostgreSQL array literal `{'Others'}`.

The problematic code:
```typescript
if (typeFilters && typeFilters.length > 0) {
  query = sql`${query} AND type = ANY(${typeFilters})`;
}
```

## Solution

Switched from using Drizzle's SQL builder to using the underlying `postgres` client's `unsafe` method with proper parameterized queries. PostgreSQL's parameter binding automatically handles array conversion.

### Fixed Implementation

```typescript
// Build query string with parameter placeholders
let queryStr = `
  SELECT ... FROM chunks
  WHERE user_id = $2
    AND 1 - (embedding <=> $3::vector) > $4
`;

const params: any[] = [embeddingStr, userId, embeddingStr, similarityThreshold];

if (typeFilters && typeFilters.length > 0) {
  queryStr += ` AND type = ANY($5)`;
  params.push(typeFilters);  // postgres client handles array conversion
}

queryStr += `
  ORDER BY embedding <=> $${typeFilters && typeFilters.length > 0 ? 6 : 5}::vector
  LIMIT $${typeFilters && typeFilters.length > 0 ? 7 : 6}
`;

params.push(embeddingStr);
params.push(limit);

// Use postgres client's unsafe method for parameterized query
const result = await client.unsafe(queryStr, params);
```

## Why This Works

1. **Parameter Binding**: The `postgres` library's `unsafe` method properly handles parameter binding for arrays
2. **Automatic Conversion**: When you pass a JavaScript array as a parameter to `ANY($n)`, postgres automatically converts it to the PostgreSQL array format
3. **Type Safety**: PostgreSQL knows the expected type from the query context

## Testing

To verify the fix works:

```bash
# 1. Rebuild
cd backend
npm run build

# 2. Start the server
npm run dev

# 3. Test the search
# Upload a PDF and then query: "What is in my documents?"
```

Expected behavior:
- No more "malformed array literal" errors
- Search successfully returns results filtered by content type
- Works with single or multiple type filters

## Alternative Approaches Tried

1. **`sql.array(typeFilters)`** - Not available in Drizzle ORM's sql template tag
2. **`sql.join()`** - Type mismatch issues with SQL template literals
3. **Manual array formatting** - Complex and error-prone
4. **Direct postgres client** ✅ - Clean and handles array conversion automatically

## Files Modified

- `backend/db/index.ts` - Updated `findSimilarChunks` function

## Related

- PostgreSQL Array Types: https://www.postgresql.org/docs/current/arrays.html
- Postgres.js Parameter Binding: https://github.com/porsager/postgres#parameters
- Drizzle ORM SQL Operations: https://orm.drizzle.team/docs/sql

