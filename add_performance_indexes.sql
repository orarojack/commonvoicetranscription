-- Performance Indexes for Voice Platform Database
-- Run this script in Supabase SQL Editor to significantly improve query performance

-- ===========================================
-- USERS TABLE INDEXES
-- ===========================================

-- Index on email for login lookups (most frequent query)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Index on role for filtering users by role
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Index on status for filtering pending reviewers
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Composite index for role + status queries (common in admin dashboard)
CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role, status);

-- Index for active users
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- ===========================================
-- RECORDINGS TABLE INDEXES
-- ===========================================

-- Index on user_id for fetching user's recordings (very frequent)
CREATE INDEX IF NOT EXISTS idx_recordings_user_id ON recordings(user_id);

-- Index on status for filtering pending/approved/rejected recordings
CREATE INDEX IF NOT EXISTS idx_recordings_status ON recordings(status);

-- Index on sentence for counting recordings per sentence
CREATE INDEX IF NOT EXISTS idx_recordings_sentence ON recordings(sentence);

-- Composite index for status + created_at (for paginated lists)
CREATE INDEX IF NOT EXISTS idx_recordings_status_created ON recordings(status, created_at DESC);

-- Composite index for user_id + sentence (check if user recorded a sentence)
CREATE INDEX IF NOT EXISTS idx_recordings_user_sentence ON recordings(user_id, sentence);

-- Index on created_at for time-based queries and sorting
CREATE INDEX IF NOT EXISTS idx_recordings_created_at ON recordings(created_at DESC);

-- ===========================================
-- REVIEWS TABLE INDEXES
-- ===========================================

-- Index on reviewer_id for fetching reviewer's reviews
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);

-- Index on recording_id for fetching reviews of a recording
CREATE INDEX IF NOT EXISTS idx_reviews_recording_id ON reviews(recording_id);

-- Index on decision for filtering approved/rejected reviews
CREATE INDEX IF NOT EXISTS idx_reviews_decision ON reviews(decision);

-- Composite index for reviewer_id + created_at
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_created ON reviews(reviewer_id, created_at DESC);

-- Index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);

-- ===========================================
-- SENTENCES TABLE INDEXES
-- ===========================================

-- Index on language_code for filtering sentences by language
CREATE INDEX IF NOT EXISTS idx_sentences_language_code ON sentences(language_code);

-- Index on is_active for filtering active sentences
CREATE INDEX IF NOT EXISTS idx_sentences_is_active ON sentences(is_active);

-- Composite index for language_code + is_active (most common query)
CREATE INDEX IF NOT EXISTS idx_sentences_language_active ON sentences(language_code, is_active);

-- Index on text for searching sentences (if needed)
CREATE INDEX IF NOT EXISTS idx_sentences_text ON sentences(text);

-- ===========================================
-- VERIFY INDEXES
-- ===========================================

-- Check all indexes on tables
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM 
    pg_indexes
WHERE 
    tablename IN ('users', 'recordings', 'reviews', 'sentences')
ORDER BY 
    tablename, indexname;

-- ===========================================
-- PERFORMANCE NOTES
-- ===========================================

/*
EXPECTED IMPROVEMENTS:

1. User lookups by email: 10-50x faster
2. Recording queries by user_id: 5-20x faster
3. Status filtering: 10-30x faster
4. Sentence availability checks: 20-50x faster
5. Review queries: 10-30x faster

MONITORING:

After creating indexes, monitor query performance in Supabase dashboard:
- Database > Performance
- Check slow queries
- Monitor index usage with: 
  SELECT * FROM pg_stat_user_indexes WHERE schemaname = 'public';

MAINTENANCE:

Indexes are automatically maintained by PostgreSQL.
For large tables (>1M rows), consider:
- VACUUM ANALYZE to update statistics
- REINDEX to rebuild indexes if performance degrades

DISK SPACE:

These indexes will use approximately 5-10% additional disk space.
For 10,000 sentences and 10,000 recordings, expect ~50-100MB index size.
*/

