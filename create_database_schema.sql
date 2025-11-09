-- =============================================
-- Complete Database Schema for Common Voice Luo
-- Supports only Reviewer and Admin roles
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- CREATE USERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('reviewer', 'admin')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'rejected')),
    profile_complete BOOLEAN DEFAULT FALSE,
    name VARCHAR(255),
    age VARCHAR(20),
    gender VARCHAR(50),
    languages TEXT[],
    location VARCHAR(100),
    language_dialect VARCHAR(50) CHECK (language_dialect IN ('Milambo', 'Nyanduat')),
    educational_background VARCHAR(50) CHECK (educational_background IN ('primary', 'secondary', 'tertiary', 'graduate', 'postgraduate')),
    employment_status VARCHAR(50) CHECK (employment_status IN ('employed', 'self-employed', 'unemployed', 'student')),
    phone_number VARCHAR(20),
    constituency TEXT,
    id_number VARCHAR(50),
    accent_dialect VARCHAR(50),
    accent_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    -- Composite unique constraint: same email can be used for different roles
    CONSTRAINT unique_email_role UNIQUE (email, role)
);

-- =============================================
-- CREATE RECORDINGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sentence TEXT NOT NULL,
    audio_url TEXT NOT NULL,
    audio_blob TEXT,
    sentence_mozilla_id VARCHAR(50),
    contributor_age VARCHAR(20),
    contributor_gender VARCHAR(50),
    duration DECIMAL(5,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    quality VARCHAR(20) DEFAULT 'good' CHECK (quality IN ('good', 'fair', 'poor')),
    metadata JSONB DEFAULT '{}'
);

-- =============================================
-- CREATE REVIEWS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recording_id UUID NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    decision VARCHAR(20) NOT NULL CHECK (decision IN ('approved', 'rejected')),
    notes TEXT,
    confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    time_spent INTEGER NOT NULL DEFAULT 0,
    -- Ensure a reviewer can only review a recording once
    CONSTRAINT unique_reviewer_recording UNIQUE (recording_id, reviewer_id)
);

-- =============================================
-- CREATE SENTENCES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS sentences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mozilla_id VARCHAR(50) UNIQUE NOT NULL,
    text TEXT NOT NULL,
    language_code VARCHAR(10) NOT NULL DEFAULT 'luo',
    source VARCHAR(100),
    bucket VARCHAR(100),
    hash VARCHAR(100),
    version INTEGER DEFAULT 1,
    clips_count INTEGER DEFAULT 0,
    has_valid_clip BOOLEAN DEFAULT FALSE,
    is_validated BOOLEAN DEFAULT FALSE,
    taxonomy JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    difficulty_level VARCHAR(20) DEFAULT 'medium' CHECK (difficulty_level IN ('basic', 'medium', 'advanced')),
    word_count INTEGER,
    character_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- CREATE INDEXES FOR PERFORMANCE
-- =============================================

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_email_role ON users(email, role);
CREATE INDEX IF NOT EXISTS idx_users_location ON users(location);
CREATE INDEX IF NOT EXISTS idx_users_language_dialect ON users(language_dialect);
CREATE INDEX IF NOT EXISTS idx_users_educational_background ON users(educational_background);
CREATE INDEX IF NOT EXISTS idx_users_employment_status ON users(employment_status);
CREATE INDEX IF NOT EXISTS idx_users_constituency ON users(constituency);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Recording indexes
CREATE INDEX IF NOT EXISTS idx_recordings_user_id ON recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_recordings_status ON recordings(status);
CREATE INDEX IF NOT EXISTS idx_recordings_reviewed_by ON recordings(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_recordings_sentence_mozilla_id ON recordings(sentence_mozilla_id);
CREATE INDEX IF NOT EXISTS idx_recordings_created_at ON recordings(created_at);

-- Review indexes
CREATE INDEX IF NOT EXISTS idx_reviews_recording_id ON reviews(recording_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_decision ON reviews(decision);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at);

-- Sentences indexes
CREATE INDEX IF NOT EXISTS idx_sentences_mozilla_id ON sentences(mozilla_id);
CREATE INDEX IF NOT EXISTS idx_sentences_language_code ON sentences(language_code);
CREATE INDEX IF NOT EXISTS idx_sentences_is_active ON sentences(is_active);
CREATE INDEX IF NOT EXISTS idx_sentences_difficulty_level ON sentences(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_sentences_source ON sentences(source);
CREATE INDEX IF NOT EXISTS idx_sentences_text_search ON sentences USING gin(to_tsvector('english', text));

-- =============================================
-- CREATE VIEWS FOR OPTIMIZED QUERIES
-- =============================================

-- Create view for pending recordings (used by application code for faster queries)
CREATE OR REPLACE VIEW pending_recordings AS
SELECT * FROM recordings WHERE status = 'pending';

-- =============================================
-- CREATE TRIGGER FUNCTION FOR UPDATED_AT
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =============================================
-- CREATE TRIGGERS FOR AUTO-UPDATE TIMESTAMPS
-- =============================================
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_recordings_updated_at ON recordings;
CREATE TRIGGER update_recordings_updated_at 
    BEFORE UPDATE ON recordings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sentences_updated_at ON sentences;
CREATE TRIGGER update_sentences_updated_at 
    BEFORE UPDATE ON sentences 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- CREATE DEFAULT ADMIN USER
-- =============================================
-- Note: Change the password in production!
INSERT INTO users (
    email, 
    password, 
    role, 
    status, 
    profile_complete, 
    name, 
    is_active,
    location,
    employment_status,
    educational_background
) VALUES (
    'admin@commonvoice.org',
    'admin123',  -- CHANGE THIS IN PRODUCTION!
    'admin',
    'active',
    true,
    'System Administrator',
    true,
    'Nairobi',
    'employed',
    'postgraduate'
) ON CONFLICT (email, role) DO NOTHING;

-- =============================================
-- CREATE SAMPLE REVIEWER USERS
-- =============================================

-- Active Reviewer 1
INSERT INTO users (
    email,
    password,
    role,
    status,
    profile_complete,
    name,
    age,
    gender,
    languages,
    location,
    language_dialect,
    educational_background,
    employment_status,
    constituency,
    phone_number,
    is_active,
    last_login_at
) VALUES (
    'reviewer@example.com',
    'reviewer123',
    'reviewer',
    'active',
    true,
    'John Reviewer',
    '30-39',
    'male',
    ARRAY['English', 'Luo'],
    'Kisumu',
    'Milambo',
    'graduate',
    'employed',
    'Kisumu Central',
    '+254712345678',
    true,
    NOW() - INTERVAL '2 hours'
) ON CONFLICT (email, role) DO NOTHING;

-- Active Reviewer 2
INSERT INTO users (
    email,
    password,
    role,
    status,
    profile_complete,
    name,
    age,
    gender,
    languages,
    location,
    language_dialect,
    educational_background,
    employment_status,
    constituency,
    phone_number,
    is_active,
    last_login_at
) VALUES (
    'mary.reviewer@example.com',
    'mary123',
    'reviewer',
    'active',
    true,
    'Mary Ochieng',
    '25-29',
    'female',
    ARRAY['English', 'Luo', 'Swahili'],
    'Nakuru',
    'Nyanduat',
    'tertiary',
    'self-employed',
    'Nakuru Town East',
    '+254723456789',
    true,
    NOW() - INTERVAL '1 day'
) ON CONFLICT (email, role) DO NOTHING;

-- Pending Reviewer (waiting for admin approval)
INSERT INTO users (
    email,
    password,
    role,
    status,
    profile_complete,
    name,
    age,
    gender,
    languages,
    location,
    educational_background,
    employment_status,
    phone_number,
    is_active
) VALUES (
    'pending.reviewer@example.com',
    'pending123',
    'reviewer',
    'pending',
    true,
    'Peter Otieno',
    '35-39',
    'male',
    ARRAY['English', 'Luo'],
    'Eldoret',
    'graduate',
    'employed',
    '+254734567890',
    false
) ON CONFLICT (email, role) DO NOTHING;

-- Another Active Reviewer
INSERT INTO users (
    email,
    password,
    role,
    status,
    profile_complete,
    name,
    age,
    gender,
    languages,
    location,
    language_dialect,
    educational_background,
    employment_status,
    constituency,
    phone_number,
    is_active,
    last_login_at
) VALUES (
    'james.reviewer@example.com',
    'james123',
    'reviewer',
    'active',
    true,
    'James Okoth',
    '40-49',
    'male',
    ARRAY['English', 'Luo', 'Swahili'],
    'Kisumu',
    'Milambo',
    'postgraduate',
    'employed',
    'Kisumu West',
    '+254745678901',
    true,
    NOW() - INTERVAL '30 minutes'
) ON CONFLICT (email, role) DO NOTHING;

-- =============================================
-- CREATE SAMPLE RECORDINGS FOR REVIEWERS
-- =============================================
-- These recordings will be available for reviewers to listen to and edit transcriptions

-- Get user IDs for reference (using CTEs)
WITH admin_user AS (
    SELECT id FROM users WHERE email = 'admin@commonvoice.org' AND role = 'admin' LIMIT 1
),
reviewer1 AS (
    SELECT id FROM users WHERE email = 'reviewer@example.com' AND role = 'reviewer' LIMIT 1
),
reviewer2 AS (
    SELECT id FROM users WHERE email = 'mary.reviewer@example.com' AND role = 'reviewer' LIMIT 1
),
reviewer3 AS (
    SELECT id FROM users WHERE email = 'james.reviewer@example.com' AND role = 'reviewer' LIMIT 1
)
-- Insert pending recordings (for reviewers to review and edit)
INSERT INTO recordings (
    user_id,
    sentence,
    audio_url,
    duration,
    status,
    sentence_mozilla_id,
    contributor_age,
    contributor_gender,
    quality,
    metadata,
    created_at
)
SELECT 
    admin_user.id,  -- Using admin as placeholder user_id since we don't have contributors
    'Achieng otieno gi nyathi e skul',
    'https://example.com/audio/recording_001.mp3',
    3.5,
    'pending',
    'mozilla_001',
    '25-29',
    'female',
    'good',
    '{"source": "community", "device": "mobile", "browser": "chrome"}'::jsonb,
    NOW() - INTERVAL '2 days'
FROM admin_user
WHERE NOT EXISTS (
    SELECT 1 FROM recordings WHERE sentence = 'Achieng otieno gi nyathi e skul'
);

WITH admin_user AS (
    SELECT id FROM users WHERE email = 'admin@commonvoice.org' AND role = 'admin' LIMIT 1
)
INSERT INTO recordings (
    user_id,
    sentence,
    audio_url,
    duration,
    status,
    sentence_mozilla_id,
    contributor_age,
    contributor_gender,
    quality,
    metadata,
    created_at
)
SELECT 
    admin_user.id,
    'Joluo okelo piny e Kenya',
    'https://example.com/audio/recording_002.mp3',
    2.8,
    'pending',
    'mozilla_002',
    '30-39',
    'male',
    'good',
    '{"source": "community", "device": "desktop", "browser": "firefox"}'::jsonb,
    NOW() - INTERVAL '1 day'
FROM admin_user
WHERE NOT EXISTS (
    SELECT 1 FROM recordings WHERE sentence = 'Joluo okelo piny e Kenya'
);

WITH admin_user AS (
    SELECT id FROM users WHERE email = 'admin@commonvoice.org' AND role = 'admin' LIMIT 1
)
INSERT INTO recordings (
    user_id,
    sentence,
    audio_url,
    duration,
    status,
    sentence_mozilla_id,
    contributor_age,
    contributor_gender,
    quality,
    metadata,
    created_at
)
SELECT 
    admin_user.id,
    'Chak e piny ni marach',
    'https://example.com/audio/recording_003.mp3',
    2.3,
    'pending',
    'mozilla_003',
    '20-24',
    'female',
    'fair',
    '{"source": "community", "device": "mobile", "browser": "safari"}'::jsonb,
    NOW() - INTERVAL '12 hours'
FROM admin_user
WHERE NOT EXISTS (
    SELECT 1 FROM recordings WHERE sentence = 'Chak e piny ni marach'
);

WITH admin_user AS (
    SELECT id FROM users WHERE email = 'admin@commonvoice.org' AND role = 'admin' LIMIT 1
)
INSERT INTO recordings (
    user_id,
    sentence,
    audio_url,
    duration,
    status,
    sentence_mozilla_id,
    contributor_age,
    contributor_gender,
    quality,
    metadata,
    created_at
)
SELECT 
    admin_user.id,
    'Nyathi ma onge skul',
    'https://example.com/audio/recording_004.mp3',
    2.1,
    'pending',
    'mozilla_004',
    '35-39',
    'male',
    'good',
    '{"source": "community", "device": "tablet", "browser": "chrome"}'::jsonb,
    NOW() - INTERVAL '6 hours'
FROM admin_user
WHERE NOT EXISTS (
    SELECT 1 FROM recordings WHERE sentence = 'Nyathi ma onge skul'
);

WITH admin_user AS (
    SELECT id FROM users WHERE email = 'admin@commonvoice.org' AND role = 'admin' LIMIT 1
)
INSERT INTO recordings (
    user_id,
    sentence,
    audio_url,
    duration,
    status,
    sentence_mozilla_id,
    contributor_age,
    contributor_gender,
    quality,
    metadata,
    created_at
)
SELECT 
    admin_user.id,
    'Wuon nyithindo okelo piny e Kisumu',
    'https://example.com/audio/recording_005.mp3',
    3.8,
    'pending',
    'mozilla_005',
    '40-49',
    'male',
    'good',
    '{"source": "community", "device": "desktop", "browser": "edge"}'::jsonb,
    NOW() - INTERVAL '3 hours'
FROM admin_user
WHERE NOT EXISTS (
    SELECT 1 FROM recordings WHERE sentence = 'Wuon nyithindo okelo piny e Kisumu'
);

WITH admin_user AS (
    SELECT id FROM users WHERE email = 'admin@commonvoice.org' AND role = 'admin' LIMIT 1
)
INSERT INTO recordings (
    user_id,
    sentence,
    audio_url,
    duration,
    status,
    sentence_mozilla_id,
    contributor_age,
    contributor_gender,
    quality,
    metadata,
    created_at
)
SELECT 
    admin_user.id,
    'Dala ni marach gi chak',
    'https://example.com/audio/recording_006.mp3',
    2.5,
    'pending',
    'mozilla_006',
    '25-29',
    'female',
    'fair',
    '{"source": "community", "device": "mobile", "browser": "chrome"}'::jsonb,
    NOW() - INTERVAL '1 hour'
FROM admin_user
WHERE NOT EXISTS (
    SELECT 1 FROM recordings WHERE sentence = 'Dala ni marach gi chak'
);

WITH admin_user AS (
    SELECT id FROM users WHERE email = 'admin@commonvoice.org' AND role = 'admin' LIMIT 1
)
INSERT INTO recordings (
    user_id,
    sentence,
    audio_url,
    duration,
    status,
    sentence_mozilla_id,
    contributor_age,
    contributor_gender,
    quality,
    metadata,
    created_at
)
SELECT 
    admin_user.id,
    'Joluo okelo piny e Africa',
    'https://example.com/audio/recording_007.mp3',
    3.2,
    'pending',
    'mozilla_007',
    '30-39',
    'male',
    'good',
    '{"source": "curated", "device": "desktop", "browser": "firefox"}'::jsonb,
    NOW() - INTERVAL '30 minutes'
FROM admin_user
WHERE NOT EXISTS (
    SELECT 1 FROM recordings WHERE sentence = 'Joluo okelo piny e Africa'
);

WITH admin_user AS (
    SELECT id FROM users WHERE email = 'admin@commonvoice.org' AND role = 'admin' LIMIT 1
)
INSERT INTO recordings (
    user_id,
    sentence,
    audio_url,
    duration,
    status,
    sentence_mozilla_id,
    contributor_age,
    contributor_gender,
    quality,
    metadata,
    created_at
)
SELECT 
    admin_user.id,
    'Nyathi ma onge skul okelo piny e Kenya',
    'https://example.com/audio/recording_008.mp3',
    4.1,
    'pending',
    'mozilla_008',
    '20-24',
    'female',
    'good',
    '{"source": "community", "device": "mobile", "browser": "safari"}'::jsonb,
    NOW() - INTERVAL '15 minutes'
FROM admin_user
WHERE NOT EXISTS (
    SELECT 1 FROM recordings WHERE sentence = 'Nyathi ma onge skul okelo piny e Kenya'
);

-- Insert some already reviewed recordings (to show workflow)
WITH admin_user AS (
    SELECT id FROM users WHERE email = 'admin@commonvoice.org' AND role = 'admin' LIMIT 1
),
reviewer1 AS (
    SELECT id FROM users WHERE email = 'reviewer@example.com' AND role = 'reviewer' LIMIT 1
)
INSERT INTO recordings (
    user_id,
    sentence,
    audio_url,
    duration,
    status,
    sentence_mozilla_id,
    contributor_age,
    contributor_gender,
    quality,
    reviewed_by,
    reviewed_at,
    metadata,
    created_at
)
SELECT 
    admin_user.id,
    'Achieng otieno gi nyathi e skul ma onge',
    'https://example.com/audio/recording_009.mp3',
    3.6,
    'approved',
    'mozilla_009',
    '25-29',
    'female',
    'good',
    reviewer1.id,
    NOW() - INTERVAL '5 hours',
    '{"source": "community", "device": "desktop", "browser": "chrome"}'::jsonb,
    NOW() - INTERVAL '1 day'
FROM admin_user, reviewer1
WHERE NOT EXISTS (
    SELECT 1 FROM recordings WHERE sentence = 'Achieng otieno gi nyathi e skul ma onge'
);

WITH admin_user AS (
    SELECT id FROM users WHERE email = 'admin@commonvoice.org' AND role = 'admin' LIMIT 1
),
reviewer2 AS (
    SELECT id FROM users WHERE email = 'mary.reviewer@example.com' AND role = 'reviewer' LIMIT 1
)
INSERT INTO recordings (
    user_id,
    sentence,
    audio_url,
    duration,
    status,
    sentence_mozilla_id,
    contributor_age,
    contributor_gender,
    quality,
    reviewed_by,
    reviewed_at,
    metadata,
    created_at
)
SELECT 
    admin_user.id,
    'Joluo okelo piny e Kenya gi nyithindo',
    'https://example.com/audio/recording_010.mp3',
    3.9,
    'approved',
    'mozilla_010',
    '30-39',
    'male',
    'good',
    reviewer2.id,
    NOW() - INTERVAL '3 hours',
    '{"source": "community", "device": "mobile", "browser": "chrome"}'::jsonb,
    NOW() - INTERVAL '18 hours'
FROM admin_user, reviewer2
WHERE NOT EXISTS (
    SELECT 1 FROM recordings WHERE sentence = 'Joluo okelo piny e Kenya gi nyithindo'
);

-- Insert some rejected recordings (to show different statuses)
WITH admin_user AS (
    SELECT id FROM users WHERE email = 'admin@commonvoice.org' AND role = 'admin' LIMIT 1
),
reviewer1 AS (
    SELECT id FROM users WHERE email = 'reviewer@example.com' AND role = 'reviewer' LIMIT 1
)
INSERT INTO recordings (
    user_id,
    sentence,
    audio_url,
    duration,
    status,
    sentence_mozilla_id,
    contributor_age,
    contributor_gender,
    quality,
    reviewed_by,
    reviewed_at,
    metadata,
    created_at
)
SELECT 
    admin_user.id,
    'Chak e piny ni marach gi dala',
    'https://example.com/audio/recording_011.mp3',
    2.7,
    'rejected',
    'mozilla_011',
    '20-24',
    'female',
    'poor',
    reviewer1.id,
    NOW() - INTERVAL '8 hours',
    '{"source": "community", "device": "mobile", "browser": "safari", "rejection_reason": "Poor audio quality"}'::jsonb,
    NOW() - INTERVAL '2 days'
FROM admin_user, reviewer1
WHERE NOT EXISTS (
    SELECT 1 FROM recordings WHERE sentence = 'Chak e piny ni marach gi dala'
);

-- =============================================
-- CREATE SAMPLE REVIEWS FOR APPROVED/REJECTED RECORDINGS
-- =============================================

WITH recording1 AS (
    SELECT id FROM recordings WHERE sentence = 'Achieng otieno gi nyathi e skul ma onge' LIMIT 1
),
reviewer1 AS (
    SELECT id FROM users WHERE email = 'reviewer@example.com' AND role = 'reviewer' LIMIT 1
)
INSERT INTO reviews (
    recording_id,
    reviewer_id,
    decision,
    notes,
    confidence,
    time_spent,
    created_at
)
SELECT 
    recording1.id,
    reviewer1.id,
    'approved',
    'Good quality recording. Sentence corrected from original transcription.',
    92,
    25,
    NOW() - INTERVAL '5 hours'
FROM recording1, reviewer1
WHERE NOT EXISTS (
    SELECT 1 FROM reviews r 
    JOIN recordings rec ON r.recording_id = rec.id 
    WHERE rec.sentence = 'Achieng otieno gi nyathi e skul ma onge'
);

WITH recording2 AS (
    SELECT id FROM recordings WHERE sentence = 'Joluo okelo piny e Kenya gi nyithindo' LIMIT 1
),
reviewer2 AS (
    SELECT id FROM users WHERE email = 'mary.reviewer@example.com' AND role = 'reviewer' LIMIT 1
)
INSERT INTO reviews (
    recording_id,
    reviewer_id,
    decision,
    notes,
    confidence,
    time_spent,
    created_at
)
SELECT 
    recording2.id,
    reviewer2.id,
    'approved',
    'Excellent recording quality. Sentence edited to match audio content.',
    95,
    30,
    NOW() - INTERVAL '3 hours'
FROM recording2, reviewer2
WHERE NOT EXISTS (
    SELECT 1 FROM reviews r 
    JOIN recordings rec ON r.recording_id = rec.id 
    WHERE rec.sentence = 'Joluo okelo piny e Kenya gi nyithindo'
);

WITH recording3 AS (
    SELECT id FROM recordings WHERE sentence = 'Chak e piny ni marach gi dala' LIMIT 1
),
reviewer1 AS (
    SELECT id FROM users WHERE email = 'reviewer@example.com' AND role = 'reviewer' LIMIT 1
)
INSERT INTO reviews (
    recording_id,
    reviewer_id,
    decision,
    notes,
    confidence,
    time_spent,
    created_at
)
SELECT 
    recording3.id,
    reviewer1.id,
    'rejected',
    'Poor audio quality with background noise. Unable to verify transcription accuracy.',
    85,
    20,
    NOW() - INTERVAL '8 hours'
FROM recording3, reviewer1
WHERE NOT EXISTS (
    SELECT 1 FROM reviews r 
    JOIN recordings rec ON r.recording_id = rec.id 
    WHERE rec.sentence = 'Chak e piny ni marach gi dala'
);

-- =============================================
-- CREATE DEMO REVIEWS FOR PENDING RECORDINGS
-- =============================================
-- These show reviewers actively reviewing recordings
-- NOTE: We'll only review SOME recordings to leave others pending for demo

-- Reviewer 1 reviewed recording 001 (45 minutes ago)
WITH recording AS (
    SELECT id FROM recordings WHERE sentence = 'Achieng otieno gi nyathi e skul' LIMIT 1
),
reviewer AS (
    SELECT id FROM users WHERE email = 'reviewer@example.com' AND role = 'reviewer' LIMIT 1
)
INSERT INTO reviews (
    recording_id,
    reviewer_id,
    decision,
    notes,
    confidence,
    time_spent,
    created_at
)
SELECT 
    recording.id,
    reviewer.id,
    'approved',
    'Good quality recording. Sentence corrected from "Achieng otieno gi nyathi e skul" to match what was actually recorded.',
    90,
    28,
    NOW() - INTERVAL '45 minutes'
FROM recording, reviewer
WHERE NOT EXISTS (
    SELECT 1 FROM reviews r 
    JOIN recordings rec ON r.recording_id = rec.id 
    WHERE rec.sentence = 'Achieng otieno gi nyathi e skul'
);

-- Update the recording status to approved
UPDATE recordings 
SET status = 'approved', 
    reviewed_by = (SELECT id FROM users WHERE email = 'reviewer@example.com' AND role = 'reviewer' LIMIT 1),
    reviewed_at = NOW() - INTERVAL '45 minutes'
WHERE sentence = 'Achieng otieno gi nyathi e skul' 
AND status = 'pending';

-- Reviewer 2 reviewed recording 002 (30 minutes ago)
WITH recording AS (
    SELECT id FROM recordings WHERE sentence = 'Joluo okelo piny e Kenya' LIMIT 1
),
reviewer AS (
    SELECT id FROM users WHERE email = 'mary.reviewer@example.com' AND role = 'reviewer' LIMIT 1
)
INSERT INTO reviews (
    recording_id,
    reviewer_id,
    decision,
    notes,
    confidence,
    time_spent,
    created_at
)
SELECT 
    recording.id,
    reviewer.id,
    'approved',
    'Excellent audio quality. Verified transcription matches the recording perfectly.',
    95,
    22,
    NOW() - INTERVAL '30 minutes'
FROM recording, reviewer
WHERE NOT EXISTS (
    SELECT 1 FROM reviews r 
    JOIN recordings rec ON r.recording_id = rec.id 
    WHERE rec.sentence = 'Joluo okelo piny e Kenya'
);

-- Update the recording status to approved
UPDATE recordings 
SET status = 'approved', 
    reviewed_by = (SELECT id FROM users WHERE email = 'mary.reviewer@example.com' AND role = 'reviewer' LIMIT 1),
    reviewed_at = NOW() - INTERVAL '30 minutes'
WHERE sentence = 'Joluo okelo piny e Kenya' 
AND status = 'pending';

-- Keep recordings 003-008 as PENDING (not reviewed yet) so reviewers have work to do
-- Recording 003: 'Chak e piny ni marach' - STAYS PENDING
-- Recording 004: 'Nyathi ma onge skul' - STAYS PENDING  
-- Recording 005: 'Wuon nyithindo okelo piny e Kisumu' - STAYS PENDING
-- Recording 006: 'Dala ni marach gi chak' - STAYS PENDING
-- Recording 007: 'Joluo okelo piny e Africa' - STAYS PENDING
-- Recording 008: 'Nyathi ma onge skul okelo piny e Kenya' - STAYS PENDING

-- Ensure all pending recordings have valid HTTPS URLs (not example.com which might be filtered)
-- Update existing pending recordings to use valid storage URLs
UPDATE recordings 
SET audio_url = 'https://storage.googleapis.com/common-voice-clips/clips/common_voice_luo_003.wav'
WHERE sentence = 'Chak e piny ni marach' AND status = 'pending';

UPDATE recordings 
SET audio_url = 'https://storage.googleapis.com/common-voice-clips/clips/common_voice_luo_004.wav'
WHERE sentence = 'Nyathi ma onge skul' AND status = 'pending';

UPDATE recordings 
SET audio_url = 'https://storage.googleapis.com/common-voice-clips/clips/common_voice_luo_005.wav'
WHERE sentence = 'Wuon nyithindo okelo piny e Kisumu' AND status = 'pending';

UPDATE recordings 
SET audio_url = 'https://storage.googleapis.com/common-voice-clips/clips/common_voice_luo_006.wav'
WHERE sentence = 'Dala ni marach gi chak' AND status = 'pending';

UPDATE recordings 
SET audio_url = 'https://storage.googleapis.com/common-voice-clips/clips/common_voice_luo_007.wav'
WHERE sentence = 'Joluo okelo piny e Africa' AND status = 'pending';

UPDATE recordings 
SET audio_url = 'https://storage.googleapis.com/common-voice-clips/clips/common_voice_luo_008.wav'
WHERE sentence = 'Nyathi ma onge skul okelo piny e Kenya' AND status = 'pending';

-- Add more pending recordings for reviewers to work on
WITH admin_user AS (
    SELECT id FROM users WHERE email = 'admin@commonvoice.org' AND role = 'admin' LIMIT 1
)
INSERT INTO recordings (
    user_id,
    sentence,
    audio_url,
    duration,
    status,
    sentence_mozilla_id,
    contributor_age,
    contributor_gender,
    quality,
    metadata,
    created_at
)
SELECT 
    admin_user.id,
    'Wuon gi nyar otieno e dala',
    'https://storage.googleapis.com/common-voice-clips/clips/common_voice_luo_001.wav',
    2.9,
    'pending',
    'mozilla_012',
    '30-39',
    'male',
    'good',
    '{"source": "community", "device": "desktop", "browser": "chrome"}'::jsonb,
    NOW() - INTERVAL '4 hours'
FROM admin_user
WHERE NOT EXISTS (
    SELECT 1 FROM recordings WHERE sentence = 'Wuon gi nyar otieno e dala'
);

WITH admin_user AS (
    SELECT id FROM users WHERE email = 'admin@commonvoice.org' AND role = 'admin' LIMIT 1
)
INSERT INTO recordings (
    user_id,
    sentence,
    audio_url,
    duration,
    status,
    sentence_mozilla_id,
    contributor_age,
    contributor_gender,
    quality,
    metadata,
    created_at
)
SELECT 
    admin_user.id,
    'Nyithindo okelo piny e skul e Kisumu',
    'https://storage.googleapis.com/common-voice-clips/clips/common_voice_luo_002.wav',
    3.4,
    'pending',
    'mozilla_013',
    '25-29',
    'female',
    'good',
    '{"source": "community", "device": "mobile", "browser": "safari"}'::jsonb,
    NOW() - INTERVAL '3 hours'
FROM admin_user
WHERE NOT EXISTS (
    SELECT 1 FROM recordings WHERE sentence = 'Nyithindo okelo piny e skul e Kisumu'
);

WITH admin_user AS (
    SELECT id FROM users WHERE email = 'admin@commonvoice.org' AND role = 'admin' LIMIT 1
)
INSERT INTO recordings (
    user_id,
    sentence,
    audio_url,
    duration,
    status,
    sentence_mozilla_id,
    contributor_age,
    contributor_gender,
    quality,
    metadata,
    created_at
)
SELECT 
    admin_user.id,
    'Chak e piny ni marach gi nyithindo',
    'https://storage.googleapis.com/common-voice-clips/clips/common_voice_luo_003.wav',
    3.1,
    'pending',
    'mozilla_014',
    '35-39',
    'male',
    'fair',
    '{"source": "community", "device": "tablet", "browser": "chrome"}'::jsonb,
    NOW() - INTERVAL '2 hours'
FROM admin_user
WHERE NOT EXISTS (
    SELECT 1 FROM recordings WHERE sentence = 'Chak e piny ni marach gi nyithindo'
);

WITH admin_user AS (
    SELECT id FROM users WHERE email = 'admin@commonvoice.org' AND role = 'admin' LIMIT 1
)
INSERT INTO recordings (
    user_id,
    sentence,
    audio_url,
    duration,
    status,
    sentence_mozilla_id,
    contributor_age,
    contributor_gender,
    quality,
    metadata,
    created_at
)
SELECT 
    admin_user.id,
    'Joluo okelo piny e Kenya gi nyithindo ma onge skul',
    'https://storage.googleapis.com/common-voice-clips/clips/common_voice_luo_004.wav',
    4.2,
    'pending',
    'mozilla_015',
    '40-49',
    'male',
    'good',
    '{"source": "curated", "device": "desktop", "browser": "firefox"}'::jsonb,
    NOW() - INTERVAL '1 hour'
FROM admin_user
WHERE NOT EXISTS (
    SELECT 1 FROM recordings WHERE sentence = 'Joluo okelo piny e Kenya gi nyithindo ma onge skul'
);

WITH admin_user AS (
    SELECT id FROM users WHERE email = 'admin@commonvoice.org' AND role = 'admin' LIMIT 1
)
INSERT INTO recordings (
    user_id,
    sentence,
    audio_url,
    duration,
    status,
    sentence_mozilla_id,
    contributor_age,
    contributor_gender,
    quality,
    metadata,
    created_at
)
SELECT 
    admin_user.id,
    'Dala ni marach gi chak e piny',
    'https://storage.googleapis.com/common-voice-clips/clips/common_voice_luo_005.wav',
    2.6,
    'pending',
    'mozilla_016',
    '20-24',
    'female',
    'good',
    '{"source": "community", "device": "mobile", "browser": "chrome"}'::jsonb,
    NOW() - INTERVAL '45 minutes'
FROM admin_user
WHERE NOT EXISTS (
    SELECT 1 FROM recordings WHERE sentence = 'Dala ni marach gi chak e piny'
);

WITH admin_user AS (
    SELECT id FROM users WHERE email = 'admin@commonvoice.org' AND role = 'admin' LIMIT 1
)
INSERT INTO recordings (
    user_id,
    sentence,
    audio_url,
    duration,
    status,
    sentence_mozilla_id,
    contributor_age,
    contributor_gender,
    quality,
    metadata,
    created_at
)
SELECT 
    admin_user.id,
    'Achieng otieno gi nyathi e skul ma onge',
    'https://storage.googleapis.com/common-voice-clips/clips/common_voice_luo_006.wav',
    3.7,
    'pending',
    'mozilla_017',
    '25-29',
    'female',
    'good',
    '{"source": "community", "device": "desktop", "browser": "edge"}'::jsonb,
    NOW() - INTERVAL '30 minutes'
FROM admin_user
WHERE NOT EXISTS (
    SELECT 1 FROM recordings WHERE sentence = 'Achieng otieno gi nyathi e skul ma onge'
);

WITH admin_user AS (
    SELECT id FROM users WHERE email = 'admin@commonvoice.org' AND role = 'admin' LIMIT 1
)
INSERT INTO recordings (
    user_id,
    sentence,
    audio_url,
    duration,
    status,
    sentence_mozilla_id,
    contributor_age,
    contributor_gender,
    quality,
    metadata,
    created_at
)
SELECT 
    admin_user.id,
    'Wuon nyithindo okelo piny e Kisumu gi nyar',
    'https://storage.googleapis.com/common-voice-clips/clips/common_voice_luo_007.wav',
    4.0,
    'pending',
    'mozilla_018',
    '30-39',
    'male',
    'good',
    '{"source": "community", "device": "desktop", "browser": "chrome"}'::jsonb,
    NOW() - INTERVAL '20 minutes'
FROM admin_user
WHERE NOT EXISTS (
    SELECT 1 FROM recordings WHERE sentence = 'Wuon nyithindo okelo piny e Kisumu gi nyar'
);

WITH admin_user AS (
    SELECT id FROM users WHERE email = 'admin@commonvoice.org' AND role = 'admin' LIMIT 1
)
INSERT INTO recordings (
    user_id,
    sentence,
    audio_url,
    duration,
    status,
    sentence_mozilla_id,
    contributor_age,
    contributor_gender,
    quality,
    metadata,
    created_at
)
SELECT 
    admin_user.id,
    'Nyathi ma onge skul okelo piny e Kenya gi nyithindo',
    'https://storage.googleapis.com/common-voice-clips/clips/common_voice_luo_008.wav',
    4.5,
    'pending',
    'mozilla_019',
    '35-39',
    'male',
    'good',
    '{"source": "curated", "device": "mobile", "browser": "safari"}'::jsonb,
    NOW() - INTERVAL '10 minutes'
FROM admin_user
WHERE NOT EXISTS (
    SELECT 1 FROM recordings WHERE sentence = 'Nyathi ma onge skul okelo piny e Kenya gi nyithindo'
);

WITH admin_user AS (
    SELECT id FROM users WHERE email = 'admin@commonvoice.org' AND role = 'admin' LIMIT 1
)
INSERT INTO recordings (
    user_id,
    sentence,
    audio_url,
    duration,
    status,
    sentence_mozilla_id,
    contributor_age,
    contributor_gender,
    quality,
    metadata,
    created_at
)
SELECT 
    admin_user.id,
    'Joluo okelo piny e Africa gi nyithindo ma onge skul',
    'https://storage.googleapis.com/common-voice-clips/clips/common_voice_luo_009.wav',
    4.3,
    'pending',
    'mozilla_020',
    '40-49',
    'male',
    'good',
    '{"source": "community", "device": "desktop", "browser": "firefox"}'::jsonb,
    NOW() - INTERVAL '5 minutes'
FROM admin_user
WHERE NOT EXISTS (
    SELECT 1 FROM recordings WHERE sentence = 'Joluo okelo piny e Africa gi nyithindo ma onge skul'
);

-- =============================================
-- VERIFY TABLES WERE CREATED
-- =============================================
DO $$
DECLARE
    admin_count INTEGER;
    reviewer_count INTEGER;
    pending_count INTEGER;
    pending_recordings INTEGER;
    approved_recordings INTEGER;
    rejected_recordings INTEGER;
    reviews_count INTEGER;
BEGIN
    -- Count users by role
    SELECT COUNT(*) INTO admin_count FROM users WHERE role = 'admin';
    SELECT COUNT(*) INTO reviewer_count FROM users WHERE role = 'reviewer' AND status = 'active';
    SELECT COUNT(*) INTO pending_count FROM users WHERE role = 'reviewer' AND status = 'pending';
    
    -- Count recordings by status
    SELECT COUNT(*) INTO pending_recordings FROM recordings WHERE status = 'pending';
    SELECT COUNT(*) INTO approved_recordings FROM recordings WHERE status = 'approved';
    SELECT COUNT(*) INTO rejected_recordings FROM recordings WHERE status = 'rejected';
    
    -- Count reviews
    SELECT COUNT(*) INTO reviews_count FROM reviews;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Database schema created successfully!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Tables created: users, recordings, reviews, sentences';
    RAISE NOTICE '';
    RAISE NOTICE 'Users created:';
    RAISE NOTICE '  - Admin users: %', admin_count;
    RAISE NOTICE '  - Active reviewers: %', reviewer_count;
    RAISE NOTICE '  - Pending reviewers: %', pending_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Recordings created:';
    RAISE NOTICE '  - Pending (for review): %', pending_recordings;
    RAISE NOTICE '  - Approved: %', approved_recordings;
    RAISE NOTICE '  - Rejected: %', rejected_recordings;
    RAISE NOTICE '';
    RAISE NOTICE 'Reviews created: %', reviews_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Default admin user: admin@commonvoice.org / admin123';
    RAISE NOTICE 'Sample reviewers:';
    RAISE NOTICE '  - reviewer@example.com / reviewer123';
    RAISE NOTICE '  - mary.reviewer@example.com / mary123';
    RAISE NOTICE '  - james.reviewer@example.com / james123';
    RAISE NOTICE '  - pending.reviewer@example.com / pending123 (pending approval)';
    RAISE NOTICE '';
    RAISE NOTICE 'Sample recordings are ready for reviewers to:';
    RAISE NOTICE '  1. Listen to audio';
    RAISE NOTICE '  2. Review transcriptions';
    RAISE NOTICE '  3. Edit sentences if needed';
    RAISE NOTICE '  4. Approve or reject recordings';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  Remember to change the admin password in production!';
    RAISE NOTICE '========================================';
END $$;

