# Transcription Validation Database Schema

## Overview
This schema is designed for a **transcription validation workflow** where validators listen to audio recordings and verify/correct the transcriptions.

## Workflow
1. **Database** provides: Audio file + Original transcription
2. **Validator** listens and compares transcription with audio
3. **Two outcomes**:
   - **Pass**: Transcription is correct (click green "Pass" button)
   - **Edited**: Transcription corrected (edit → click purple "Edited" button)

## Core Tables

### 1. Users Table
Stores user accounts for validators, contributors, and admins.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('contributor', 'reviewer', 'admin')),
    status VARCHAR(20) DEFAULT 'active',
    name VARCHAR(255),
    -- ... other fields
);
```

**Note**: Role 'reviewer' = validators who check transcriptions

---

### 2. Recordings Table (Updated for Transcription Validation)

```sql
CREATE TABLE recordings (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    
    -- TRANSCRIPTION FIELDS
    original_sentence TEXT,              -- Original transcription (never changes)
    sentence TEXT NOT NULL,              -- Current transcription (may be edited)
    transcription_edited BOOLEAN DEFAULT FALSE,  -- Was transcription edited?
    edited_by UUID REFERENCES users(id), -- Validator who edited it
    edited_at TIMESTAMP WITH TIME ZONE,  -- When it was edited
    
    -- AUDIO FIELDS
    audio_url TEXT NOT NULL,             -- Audio file URL/path
    audio_blob TEXT,                     -- Base64 encoded audio data
    duration DECIMAL(5,2) NOT NULL,      -- Audio duration in seconds
    
    -- VALIDATION FIELDS
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved')),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    
    -- METADATA
    quality VARCHAR(20) DEFAULT 'good',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Key Fields Explained:

**Transcription Fields**:
- `original_sentence`: The initial transcription from the database (preserved for audit trail)
- `sentence`: Current transcription (updated if validator corrects it)
- `transcription_edited`: Boolean flag - `TRUE` if validator edited it, `FALSE` if passed as correct
- `edited_by`: Which validator made the edit
- `edited_at`: Timestamp of when edit occurred

**Status Values**:
- `pending`: Awaiting validation
- `approved`: Validated (either Passed or Edited)
- ~~`rejected`~~: **REMOVED** - No rejection in this workflow

---

### 3. Reviews Table (Updated)

```sql
CREATE TABLE reviews (
    id UUID PRIMARY KEY,
    recording_id UUID REFERENCES recordings(id),
    reviewer_id UUID REFERENCES users(id),
    
    decision VARCHAR(20) CHECK (decision IN ('approved')),  -- Always 'approved'
    notes TEXT,                          -- e.g., "Transcription verified as correct" or "Transcription corrected from X to Y"
    confidence INTEGER CHECK (confidence BETWEEN 0 AND 100),
    time_spent INTEGER DEFAULT 0,       -- Seconds spent reviewing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_reviewer_recording UNIQUE (recording_id, reviewer_id)
);
```

#### Key Changes:
- `decision`: Always `'approved'` (no rejection)
- `notes`: Records whether it was "Passed" or "Edited" with details
- One review per validator per recording (unique constraint)

---

## Data Flow Examples

### Example 1: Transcription Passed (Correct)

**Initial State**:
```sql
recordings:
  original_sentence: "Hello world"
  sentence: "Hello world"
  transcription_edited: FALSE
  status: 'pending'
```

**After Validation** (Validator clicks "Pass"):
```sql
recordings:
  original_sentence: "Hello world"     -- Unchanged
  sentence: "Hello world"              -- Unchanged
  transcription_edited: FALSE          -- Still false
  edited_by: NULL                      -- No edit
  edited_at: NULL                      -- No edit
  status: 'approved'                   -- ✓ Validated
  reviewed_by: <validator_id>
  reviewed_at: NOW()

reviews:
  decision: 'approved'
  notes: "Transcription verified as correct"
```

---

### Example 2: Transcription Edited (Corrected)

**Initial State**:
```sql
recordings:
  original_sentence: "Hello word"      -- Wrong!
  sentence: "Hello word"
  transcription_edited: FALSE
  status: 'pending'
```

**After Validation** (Validator edits to "Hello world" and clicks "Edited"):
```sql
recordings:
  original_sentence: "Hello word"      -- Preserved (audit trail)
  sentence: "Hello world"              -- ✓ Corrected
  transcription_edited: TRUE           -- ✓ Marked as edited
  edited_by: <validator_id>            -- Who edited it
  edited_at: NOW()                     -- When edited
  status: 'approved'                   -- ✓ Validated
  reviewed_by: <validator_id>
  reviewed_at: NOW()

reviews:
  decision: 'approved'
  notes: "Transcription corrected from: \"Hello word\" to: \"Hello world\""
```

---

## Indexes for Performance

```sql
-- User lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Recording queries
CREATE INDEX idx_recordings_status ON recordings(status);
CREATE INDEX idx_recordings_user_id ON recordings(user_id);
CREATE INDEX idx_recordings_transcription_edited ON recordings(transcription_edited);
CREATE INDEX idx_recordings_edited_by ON recordings(edited_by);

-- Review queries
CREATE INDEX idx_reviews_recording_id ON reviews(recording_id);
CREATE INDEX idx_reviews_reviewer_id ON reviews(reviewer_id);
```

---

## Useful Queries

### Get all recordings awaiting validation:
```sql
SELECT id, sentence, audio_url, duration
FROM recordings
WHERE status = 'pending'
ORDER BY created_at ASC;
```

### Get all edited transcriptions:
```sql
SELECT 
    r.id,
    r.original_sentence,
    r.sentence AS corrected_sentence,
    r.edited_by,
    r.edited_at,
    u.name AS editor_name
FROM recordings r
LEFT JOIN users u ON r.edited_by = u.id
WHERE r.transcription_edited = TRUE
ORDER BY r.edited_at DESC;
```

### Get validation statistics:
```sql
SELECT 
    COUNT(*) AS total_validations,
    SUM(CASE WHEN transcription_edited = FALSE THEN 1 ELSE 0 END) AS passed_count,
    SUM(CASE WHEN transcription_edited = TRUE THEN 1 ELSE 0 END) AS edited_count,
    ROUND(100.0 * SUM(CASE WHEN transcription_edited = TRUE THEN 1 ELSE 0 END) / COUNT(*), 2) AS edit_percentage
FROM recordings
WHERE status = 'approved';
```

### Get validator performance:
```sql
SELECT 
    u.name,
    COUNT(r.id) AS total_validated,
    SUM(CASE WHEN r.transcription_edited = FALSE THEN 1 ELSE 0 END) AS passed,
    SUM(CASE WHEN r.transcription_edited = TRUE THEN 1 ELSE 0 END) AS edited,
    AVG(rev.time_spent) AS avg_time_seconds
FROM reviews rev
JOIN users u ON rev.reviewer_id = u.id
JOIN recordings r ON rev.recording_id = r.id
WHERE u.role = 'reviewer'
GROUP BY u.id, u.name
ORDER BY total_validated DESC;
```

---

## Migration Path

To update existing database:

```bash
# Run the migration script
psql -h your_host -U postgres -d your_database -f scripts/016_update_for_transcription_validation.sql
```

Or in Supabase Dashboard:
1. Go to SQL Editor
2. Copy contents of `scripts/016_update_for_transcription_validation.sql`
3. Execute

---

## Benefits of This Schema

✅ **Audit Trail**: Original transcriptions are preserved  
✅ **Clear Tracking**: Know exactly which transcriptions were edited  
✅ **No Rejection**: Simplified workflow (Pass or Edit only)  
✅ **Validator Accountability**: Track who edited what and when  
✅ **Analytics Ready**: Easy to query validation statistics  
✅ **Performance**: Proper indexes for fast queries

---

## Summary

This schema perfectly supports your transcription validation workflow where:
- Audio files come with transcriptions
- Validators verify accuracy
- Correct transcriptions are **Passed**
- Incorrect transcriptions are **Edited** and saved
- Everything is tracked for quality control and analytics

