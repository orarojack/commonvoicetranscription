-- Add file size tracking to recordings table (database only, no UI)
-- Admins can query this directly in Supabase SQL Editor

-- Add file_size column (in bytes)
ALTER TABLE recordings
ADD COLUMN IF NOT EXISTS file_size BIGINT DEFAULT 0;

-- Add index for file size queries
CREATE INDEX IF NOT EXISTS idx_recordings_file_size ON recordings(file_size);

-- Add comment for the column
COMMENT ON COLUMN recordings.file_size IS 'Size of the audio file in bytes';

-- Update existing recordings to calculate file size from audio_url (data URLs)
UPDATE recordings
SET file_size = CASE
  WHEN audio_url LIKE 'data:%' THEN 
    -- Approximate size from base64 data URL
    -- Remove the data:audio/...;base64, prefix and calculate
    LENGTH(SUBSTRING(audio_url FROM 'base64,(.*)')) * 3 / 4
  WHEN audio_url LIKE 'http%' THEN 
    -- For HTTP URLs, we can't determine size from URL alone
    0
  ELSE 0
END
WHERE file_size = 0 OR file_size IS NULL;

-- Add check constraint to ensure file_size is non-negative
ALTER TABLE recordings
ADD CONSTRAINT check_file_size_non_negative CHECK (file_size >= 0);

-- Create a view for easy storage stats querying
CREATE OR REPLACE VIEW storage_stats AS
SELECT 
  COUNT(*) as total_recordings,
  SUM(file_size) as total_size_bytes,
  ROUND(AVG(file_size)) as average_size_bytes,
  MAX(file_size) as largest_file_bytes,
  MIN(CASE WHEN file_size > 0 THEN file_size ELSE NULL END) as smallest_file_bytes,
  SUM(CASE WHEN status = 'approved' THEN file_size ELSE 0 END) as approved_size_bytes,
  SUM(CASE WHEN status = 'pending' THEN file_size ELSE 0 END) as pending_size_bytes,
  SUM(CASE WHEN status = 'rejected' THEN file_size ELSE 0 END) as rejected_size_bytes,
  -- Convert to human-readable formats
  pg_size_pretty(SUM(file_size)) as total_size,
  pg_size_pretty(ROUND(AVG(file_size))) as average_size,
  pg_size_pretty(MAX(file_size)) as largest_file,
  pg_size_pretty(MIN(CASE WHEN file_size > 0 THEN file_size ELSE NULL END)) as smallest_file,
  pg_size_pretty(SUM(CASE WHEN status = 'approved' THEN file_size ELSE 0 END)) as approved_size,
  pg_size_pretty(SUM(CASE WHEN status = 'pending' THEN file_size ELSE 0 END)) as pending_size,
  pg_size_pretty(SUM(CASE WHEN status = 'rejected' THEN file_size ELSE 0 END)) as rejected_size
FROM recordings;

-- Comment on the view
COMMENT ON VIEW storage_stats IS 'Storage statistics for all recordings - query anytime with: SELECT * FROM storage_stats';

