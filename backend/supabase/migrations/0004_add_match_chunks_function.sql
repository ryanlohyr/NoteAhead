-- Create a function to match chunks based on embedding similarity
-- Uses the cosine distance operator <=> from pgvector
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding vector(1536),
  match_count int,
  filter_user_id uuid
)
RETURNS TABLE (
  id uuid,
  content text,
  file_id uuid,
  page_numbers int[],
  embedding vector(1536),
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    chunks.id,
    chunks.content,
    chunks.file_id,
    chunks.page_numbers,
    chunks.embedding,
    1 - (chunks.embedding <=> query_embedding) as similarity
  FROM chunks
  WHERE chunks.user_id = filter_user_id
    AND chunks.embedding IS NOT NULL
  ORDER BY chunks.embedding <=> query_embedding
  LIMIT match_count;
$$;

