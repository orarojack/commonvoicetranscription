-- ============================================================================
-- Add Recording Metadata Columns to All Review Tables
-- ============================================================================
-- This script adds columns to store all original recording data alongside reviews
-- This preserves the complete recording information even after the recording is deleted
-- ============================================================================

-- ============================================================================
-- PART 1: Add columns to somali_reviews
-- ============================================================================

ALTER TABLE somali_reviews 
ADD COLUMN IF NOT EXISTS original_transcript TEXT,
ADD COLUMN IF NOT EXISTS audio_url TEXT,
ADD COLUMN IF NOT EXISTS media_path_id TEXT,
ADD COLUMN IF NOT EXISTS duration DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS language TEXT,
ADD COLUMN IF NOT EXISTS recorder_uuid TEXT,
ADD COLUMN IF NOT EXISTS user_id TEXT,
ADD COLUMN IF NOT EXISTS recording_created_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS domain TEXT,
ADD COLUMN IF NOT EXISTS prompt_type TEXT,
ADD COLUMN IF NOT EXISTS word_count INTEGER,
ADD COLUMN IF NOT EXISTS ratio DOUBLE PRECISION;

COMMENT ON COLUMN somali_reviews.original_transcript IS 'Original transcript from the recording (cleaned_transcript or actualSentence)';
COMMENT ON COLUMN somali_reviews.audio_url IS 'Full URL to the audio file';
COMMENT ON COLUMN somali_reviews.media_path_id IS 'Media path ID from the recording';
COMMENT ON COLUMN somali_reviews.duration IS 'Audio duration in seconds';
COMMENT ON COLUMN somali_reviews.language IS 'Language of the recording';
COMMENT ON COLUMN somali_reviews.recorder_uuid IS 'UUID of the person who recorded this';
COMMENT ON COLUMN somali_reviews.user_id IS 'User ID (alternative to recorder_uuid)';
COMMENT ON COLUMN somali_reviews.recording_created_at IS 'When the original recording was created';

-- ============================================================================
-- PART 2: Add columns to kalenjin_reviews
-- ============================================================================

ALTER TABLE kalenjin_reviews 
ADD COLUMN IF NOT EXISTS original_transcript TEXT,
ADD COLUMN IF NOT EXISTS audio_url TEXT,
ADD COLUMN IF NOT EXISTS media_path_id TEXT,
ADD COLUMN IF NOT EXISTS duration DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS language TEXT,
ADD COLUMN IF NOT EXISTS recorder_uuid TEXT,
ADD COLUMN IF NOT EXISTS user_id TEXT,
ADD COLUMN IF NOT EXISTS recording_created_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS domain TEXT,
ADD COLUMN IF NOT EXISTS prompt_type TEXT,
ADD COLUMN IF NOT EXISTS word_count INTEGER,
ADD COLUMN IF NOT EXISTS ratio DOUBLE PRECISION;

COMMENT ON COLUMN kalenjin_reviews.original_transcript IS 'Original transcript from the recording (cleaned_transcript or actualSentence)';
COMMENT ON COLUMN kalenjin_reviews.audio_url IS 'Full URL to the audio file';
COMMENT ON COLUMN kalenjin_reviews.media_path_id IS 'Media path ID from the recording';
COMMENT ON COLUMN kalenjin_reviews.duration IS 'Audio duration in seconds';
COMMENT ON COLUMN kalenjin_reviews.language IS 'Language of the recording';
COMMENT ON COLUMN kalenjin_reviews.recorder_uuid IS 'UUID of the person who recorded this';
COMMENT ON COLUMN kalenjin_reviews.user_id IS 'User ID (alternative to recorder_uuid)';
COMMENT ON COLUMN kalenjin_reviews.recording_created_at IS 'When the original recording was created';

-- ============================================================================
-- PART 3: Add columns to kikuyu_reviews
-- ============================================================================

ALTER TABLE kikuyu_reviews 
ADD COLUMN IF NOT EXISTS original_transcript TEXT,
ADD COLUMN IF NOT EXISTS audio_url TEXT,
ADD COLUMN IF NOT EXISTS media_path_id TEXT,
ADD COLUMN IF NOT EXISTS duration DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS language TEXT,
ADD COLUMN IF NOT EXISTS recorder_uuid TEXT,
ADD COLUMN IF NOT EXISTS user_id TEXT,
ADD COLUMN IF NOT EXISTS recording_created_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS domain TEXT,
ADD COLUMN IF NOT EXISTS prompt_type TEXT,
ADD COLUMN IF NOT EXISTS word_count INTEGER,
ADD COLUMN IF NOT EXISTS ratio DOUBLE PRECISION;

COMMENT ON COLUMN kikuyu_reviews.original_transcript IS 'Original transcript from the recording (cleaned_transcript or actualSentence)';
COMMENT ON COLUMN kikuyu_reviews.audio_url IS 'Full URL to the audio file';
COMMENT ON COLUMN kikuyu_reviews.media_path_id IS 'Media path ID from the recording';
COMMENT ON COLUMN kikuyu_reviews.duration IS 'Audio duration in seconds';
COMMENT ON COLUMN kikuyu_reviews.language IS 'Language of the recording';
COMMENT ON COLUMN kikuyu_reviews.recorder_uuid IS 'UUID of the person who recorded this';
COMMENT ON COLUMN kikuyu_reviews.user_id IS 'User ID (alternative to recorder_uuid)';
COMMENT ON COLUMN kikuyu_reviews.recording_created_at IS 'When the original recording was created';

-- ============================================================================
-- PART 4: Add columns to maasai_reviews
-- ============================================================================

ALTER TABLE maasai_reviews 
ADD COLUMN IF NOT EXISTS original_transcript TEXT,
ADD COLUMN IF NOT EXISTS audio_url TEXT,
ADD COLUMN IF NOT EXISTS media_path_id TEXT,
ADD COLUMN IF NOT EXISTS duration DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS language TEXT,
ADD COLUMN IF NOT EXISTS recorder_uuid TEXT,
ADD COLUMN IF NOT EXISTS user_id TEXT,
ADD COLUMN IF NOT EXISTS recording_created_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS domain TEXT,
ADD COLUMN IF NOT EXISTS prompt_type TEXT,
ADD COLUMN IF NOT EXISTS word_count INTEGER,
ADD COLUMN IF NOT EXISTS ratio DOUBLE PRECISION;

COMMENT ON COLUMN maasai_reviews.original_transcript IS 'Original transcript from the recording (cleaned_transcript or actualSentence)';
COMMENT ON COLUMN maasai_reviews.audio_url IS 'Full URL to the audio file';
COMMENT ON COLUMN maasai_reviews.media_path_id IS 'Media path ID from the recording';
COMMENT ON COLUMN maasai_reviews.duration IS 'Audio duration in seconds';
COMMENT ON COLUMN maasai_reviews.language IS 'Language of the recording';
COMMENT ON COLUMN maasai_reviews.recorder_uuid IS 'UUID of the person who recorded this';
COMMENT ON COLUMN maasai_reviews.user_id IS 'User ID (alternative to recorder_uuid)';
COMMENT ON COLUMN maasai_reviews.recording_created_at IS 'When the original recording was created';

-- ============================================================================
-- PART 5: Add columns to luo_reviews
-- ============================================================================

ALTER TABLE luo_reviews 
ADD COLUMN IF NOT EXISTS original_transcript TEXT,
ADD COLUMN IF NOT EXISTS audio_url TEXT,
ADD COLUMN IF NOT EXISTS media_path_id TEXT,
ADD COLUMN IF NOT EXISTS duration DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS language TEXT,
ADD COLUMN IF NOT EXISTS recorder_uuid TEXT,
ADD COLUMN IF NOT EXISTS user_id TEXT,
ADD COLUMN IF NOT EXISTS recording_created_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS domain TEXT,
ADD COLUMN IF NOT EXISTS prompt_type TEXT,
ADD COLUMN IF NOT EXISTS word_count INTEGER,
ADD COLUMN IF NOT EXISTS ratio DOUBLE PRECISION;

COMMENT ON COLUMN luo_reviews.original_transcript IS 'Original transcript from the recording (cleaned_transcript or sentence)';
COMMENT ON COLUMN luo_reviews.audio_url IS 'Full URL to the audio file';
COMMENT ON COLUMN luo_reviews.media_path_id IS 'Media path ID from the recording';
COMMENT ON COLUMN luo_reviews.duration IS 'Audio duration in seconds';
COMMENT ON COLUMN luo_reviews.language IS 'Language of the recording';
COMMENT ON COLUMN luo_reviews.recorder_uuid IS 'UUID of the person who recorded this';
COMMENT ON COLUMN luo_reviews.user_id IS 'User ID (alternative to recorder_uuid)';
COMMENT ON COLUMN luo_reviews.recording_created_at IS 'When the original recording was created';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check that all columns were added
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name IN ('luo_reviews', 'somali_reviews', 'kalenjin_reviews', 'kikuyu_reviews', 'maasai_reviews')
  AND column_name IN ('transcript', 'original_transcript', 'audio_url', 'media_path_id', 'duration', 'language', 'recorder_uuid', 'user_id', 'recording_created_at')
ORDER BY table_name, column_name;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Recording metadata columns added to all review tables!';
    RAISE NOTICE 'Review tables now store: transcript, original_transcript, audio_url, duration, language, and more';
END $$;

