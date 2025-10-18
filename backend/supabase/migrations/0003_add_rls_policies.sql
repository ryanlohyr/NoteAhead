-- RLS Policies for chunks table
CREATE POLICY "Users can view their own chunks"
  ON "chunks"
  FOR SELECT
  USING (auth.uid() = "user_id");