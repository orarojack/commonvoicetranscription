-- Add Mozilla upload tracking fields to recordings table
-- This enables tracking which recordings have been uploaded to Mozilla Common Voice

-- Add mozilla_uploaded boolean field (default false)
ALTER TABLE recordings
ADD COLUMN IF NOT EXISTS mozilla_uploaded BOOLEAN DEFAULT FALSE;

-- Add mozilla_url field to store the Google Cloud Storage URL
ALTER TABLE recordings
ADD COLUMN IF NOT EXISTS mozilla_url TEXT;

-- Add mozilla_uploaded_at timestamp
ALTER TABLE recordings
ADD COLUMN IF NOT EXISTS mozilla_uploaded_at TIMESTAMP WITH TIME ZONE;

-- Create index on mozilla_uploaded for faster queries
CREATE INDEX IF NOT EXISTS idx_recordings_mozilla_uploaded ON recordings(mozilla_uploaded);

-- Create index on mozilla_uploaded and status combination for finding approved but not uploaded recordings
CREATE INDEX IF NOT EXISTS idx_recordings_status_mozilla_uploaded ON recordings(status, mozilla_uploaded) WHERE status = 'approved' AND mozilla_uploaded = FALSE;

-- Add comment to explain the fields
COMMENT ON COLUMN recordings.mozilla_uploaded IS 'Indicates if this recording has been uploaded to Mozilla Common Voice';
COMMENT ON COLUMN recordings.mozilla_url IS 'Google Cloud Storage URL in Mozilla''s bucket (format: gs://bucket-name/path/file.webm)';
COMMENT ON COLUMN recordings.mozilla_uploaded_at IS 'Timestamp when the recording was uploaded to Mozilla';

