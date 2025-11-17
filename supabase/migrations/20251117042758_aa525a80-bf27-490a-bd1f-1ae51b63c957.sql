-- Create storage bucket for item documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('item-documents', 'item-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for item documents
CREATE POLICY "Builders can upload their own item documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'item-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Builders can view their own item documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'item-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Builders can update their own item documents"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'item-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Builders can delete their own item documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'item-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);