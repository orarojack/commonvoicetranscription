-- =============================================
-- Fix Demo Recordings for Reviewers
-- This script ensures reviewers have pending recordings to review
-- =============================================

-- First, ensure the pending_recordings view exists
CREATE OR REPLACE VIEW pending_recordings AS
SELECT * FROM recordings WHERE status = 'pending';

-- Check current state
DO $$
DECLARE
    pending_count INTEGER;
    reviewed_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO pending_count FROM recordings WHERE status = 'pending';
    SELECT COUNT(*) INTO reviewed_count FROM reviews;
    
    RAISE NOTICE 'Current state:';
    RAISE NOTICE '  - Pending recordings: %', pending_count;
    RAISE NOTICE '  - Total reviews: %', reviewed_count;
END $$;

-- Reset: Mark only 2 recordings as reviewed (for demo purposes)
-- Keep all others as pending

-- Update recordings 001 and 002 to approved (these were reviewed)
UPDATE recordings 
SET status = 'approved',
    reviewed_by = (SELECT id FROM users WHERE email = 'reviewer@example.com' AND role = 'reviewer' LIMIT 1),
    reviewed_at = NOW() - INTERVAL '45 minutes'
WHERE sentence IN ('Achieng otieno gi nyathi e skul', 'Joluo okelo piny e Kenya')
AND status = 'pending';

-- Ensure all other recordings are pending
UPDATE recordings 
SET status = 'pending',
    reviewed_by = NULL,
    reviewed_at = NULL
WHERE sentence NOT IN ('Achieng otieno gi nyathi e skul', 'Joluo okelo piny e Kenya')
AND status != 'pending';

-- Delete reviews for recordings that should be pending (except the 2 demo reviews)
DELETE FROM reviews 
WHERE recording_id IN (
    SELECT id FROM recordings 
    WHERE sentence NOT IN ('Achieng otieno gi nyathi e skul', 'Joluo okelo piny e Kenya')
    AND status = 'pending'
);

-- Ensure all pending recordings have valid HTTPS URLs
UPDATE recordings 
SET audio_url = CASE 
    WHEN audio_url LIKE 'https://example.com/%' THEN REPLACE(audio_url, 'https://example.com/audio/', 'https://storage.googleapis.com/common-voice-clips/clips/common_voice_luo_')
    WHEN audio_url LIKE 'http://%' THEN REPLACE(audio_url, 'http://', 'https://')
    ELSE audio_url
END
WHERE status = 'pending'
AND (audio_url LIKE 'https://example.com/%' OR audio_url LIKE 'http://%');

-- Add more pending recordings if we have less than 10
DO $$
DECLARE
    current_pending INTEGER;
    admin_user_id UUID;
BEGIN
    SELECT COUNT(*) INTO current_pending FROM recordings WHERE status = 'pending';
    SELECT id INTO admin_user_id FROM users WHERE email = 'admin@commonvoice.org' AND role = 'admin' LIMIT 1;
    
    IF current_pending < 10 AND admin_user_id IS NOT NULL THEN
        -- Add more pending recordings
        INSERT INTO recordings (
            user_id, sentence, audio_url, duration, status,
            sentence_mozilla_id, contributor_age, contributor_gender, quality, metadata, created_at
        )
        SELECT 
            admin_user_id,
            'Wuon gi nyar otieno e dala',
            'https://storage.googleapis.com/common-voice-clips/clips/common_voice_luo_010.wav',
            2.9, 'pending', 'mozilla_021', '30-39', 'male', 'good',
            '{"source": "community"}'::jsonb,
            NOW() - INTERVAL '4 hours'
        WHERE NOT EXISTS (SELECT 1 FROM recordings WHERE sentence = 'Wuon gi nyar otieno e dala')
        LIMIT 1;
        
        INSERT INTO recordings (
            user_id, sentence, audio_url, duration, status,
            sentence_mozilla_id, contributor_age, contributor_gender, quality, metadata, created_at
        )
        SELECT 
            admin_user_id,
            'Nyithindo okelo piny e skul e Kisumu',
            'https://storage.googleapis.com/common-voice-clips/clips/common_voice_luo_011.wav',
            3.4, 'pending', 'mozilla_022', '25-29', 'female', 'good',
            '{"source": "community"}'::jsonb,
            NOW() - INTERVAL '3 hours'
        WHERE NOT EXISTS (SELECT 1 FROM recordings WHERE sentence = 'Nyithindo okelo piny e skul e Kisumu')
        LIMIT 1;
        
        INSERT INTO recordings (
            user_id, sentence, audio_url, duration, status,
            sentence_mozilla_id, contributor_age, contributor_gender, quality, metadata, created_at
        )
        SELECT 
            admin_user_id,
            'Chak e piny ni marach gi nyithindo',
            'https://storage.googleapis.com/common-voice-clips/clips/common_voice_luo_012.wav',
            3.1, 'pending', 'mozilla_023', '35-39', 'male', 'fair',
            '{"source": "community"}'::jsonb,
            NOW() - INTERVAL '2 hours'
        WHERE NOT EXISTS (SELECT 1 FROM recordings WHERE sentence = 'Chak e piny ni marach gi nyithindo')
        LIMIT 1;
    END IF;
END $$;

-- Final verification
DO $$
DECLARE
    pending_count INTEGER;
    approved_count INTEGER;
    rejected_count INTEGER;
    total_reviews INTEGER;
BEGIN
    SELECT COUNT(*) INTO pending_count FROM recordings WHERE status = 'pending';
    SELECT COUNT(*) INTO approved_count FROM recordings WHERE status = 'approved';
    SELECT COUNT(*) INTO rejected_count FROM recordings WHERE status = 'rejected';
    SELECT COUNT(*) INTO total_reviews FROM reviews;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Demo Data Fixed!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Pending recordings (for reviewers): %', pending_count;
    RAISE NOTICE 'Approved recordings: %', approved_count;
    RAISE NOTICE 'Rejected recordings: %', rejected_count;
    RAISE NOTICE 'Total reviews: %', total_reviews;
    RAISE NOTICE '';
    RAISE NOTICE 'Reviewers should now see "% left" in the UI', pending_count;
END $$;

