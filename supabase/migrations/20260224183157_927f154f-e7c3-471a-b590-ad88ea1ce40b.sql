
-- Allow deleting passengers for cleanup
CREATE POLICY "Authenticated can delete passengers" ON passengers FOR DELETE USING (true);
