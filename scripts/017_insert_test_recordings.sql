-- =============================================
-- INSERT TEST RECORDINGS FOR VALIDATION TESTING
-- =============================================
-- This script creates sample recordings with pending status
-- for testing the transcription validation workflow
-- =============================================

-- First, ensure we have a test contributor user
INSERT INTO users (id, email, password, role, status, profile_complete, name, age, gender, is_active)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'testcontributor@test.com', 'test123', 'contributor', 'active', true, 'Test Contributor', '25-29', 'male', true)
ON CONFLICT (email, role) DO NOTHING;

-- Insert sample pending recordings with various transcription scenarios
-- These recordings are designed to test the Pass and Edit workflow

-- Recording 1: Correct transcription (should be PASSED)
INSERT INTO recordings (
  id, 
  user_id, 
  sentence, 
  audio_url, 
  duration, 
  status, 
  created_at,
  original_sentence,
  transcription_edited
) VALUES (
  '22222222-2222-2222-2222-222222222221',
  '11111111-1111-1111-1111-111111111111',
  'An neno wacho ni dhano duto ochwere',
  'https://example.com/audio/sample1.mp3',
  4.5,
  'pending',
  NOW() - INTERVAL '2 hours',
  NULL,
  FALSE
);

-- Recording 2: Transcription with minor error (should be EDITED)
INSERT INTO recordings (
  id, 
  user_id, 
  sentence, 
  audio_url, 
  duration, 
  status, 
  created_at,
  original_sentence,
  transcription_edited
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Odhiambo odhi chiro e cham',
  'https://example.com/audio/sample2.mp3',
  5.2,
  'pending',
  NOW() - INTERVAL '1 hour',
  NULL,
  FALSE
);

-- Recording 3: Correct transcription (should be PASSED)
INSERT INTO recordings (
  id, 
  user_id, 
  sentence, 
  audio_url, 
  duration, 
  status, 
  created_at,
  original_sentence,
  transcription_edited
) VALUES (
  '22222222-2222-2222-2222-222222222223',
  '11111111-1111-1111-1111-111111111111',
  'Chiemo osechiew kendo wan wadhiambo',
  'https://example.com/audio/sample3.mp3',
  3.8,
  'pending',
  NOW() - INTERVAL '30 minutes',
  NULL,
  FALSE
);

-- Recording 4: Transcription with spelling error (should be EDITED)
INSERT INTO recordings (
  id, 
  user_id, 
  sentence, 
  audio_url, 
  duration, 
  status, 
  created_at,
  original_sentence,
  transcription_edited
) VALUES (
  '22222222-2222-2222-2222-222222222224',
  '11111111-1111-1111-1111-111111111111',
  'Anyuola osebedo ka somo kitabu maber',
  'https://example.com/audio/sample4.mp3',
  6.1,
  'pending',
  NOW() - INTERVAL '15 minutes',
  NULL,
  FALSE
);

-- Recording 5: Correct transcription (should be PASSED)
INSERT INTO recordings (
  id, 
  user_id, 
  sentence, 
  audio_url, 
  duration, 
  status, 
  created_at,
  original_sentence,
  transcription_edited
) VALUES (
  '22222222-2222-2222-2222-222222222225',
  '11111111-1111-1111-1111-111111111111',
  'Piny Luo ochiegni gi nam Victoria',
  'https://example.com/audio/sample5.mp3',
  4.7,
  'pending',
  NOW() - INTERVAL '10 minutes',
  NULL,
  FALSE
);

-- Recording 6: Transcription with word omission (should be EDITED)
INSERT INTO recordings (
  id, 
  user_id, 
  sentence, 
  audio_url, 
  duration, 
  status, 
  created_at,
  original_sentence,
  transcription_edited
) VALUES (
  '22222222-2222-2222-2222-222222222226',
  '11111111-1111-1111-1111-111111111111',
  'Ng''ato ka ng''ato nyalo konyo ji mamoko',
  'https://example.com/audio/sample6.mp3',
  5.5,
  'pending',
  NOW() - INTERVAL '5 minutes',
  NULL,
  FALSE
);

-- Recording 7: Perfect transcription (should be PASSED)
INSERT INTO recordings (
  id, 
  user_id, 
  sentence, 
  audio_url, 
  duration, 
  status, 
  created_at,
  original_sentence,
  transcription_edited
) VALUES (
  '22222222-2222-2222-2222-222222222227',
  '11111111-1111-1111-1111-111111111111',
  'Wuon dala en ng''at maduong'' e od',
  'https://example.com/audio/sample7.mp3',
  4.2,
  'pending',
  NOW() - INTERVAL '2 minutes',
  NULL,
  FALSE
);

-- Recording 8: Transcription with extra word (should be EDITED)
INSERT INTO recordings (
  id, 
  user_id, 
  sentence, 
  audio_url, 
  duration, 
  status, 
  created_at,
  original_sentence,
  transcription_edited
) VALUES (
  '22222222-2222-2222-2222-222222222228',
  '11111111-1111-1111-1111-111111111111',
  'Nyathi odongo mondo obedo ng''at maber',
  'https://example.com/audio/sample8.mp3',
  5.9,
  'pending',
  NOW() - INTERVAL '1 minute',
  NULL,
  FALSE
);

-- Recording 9: Good transcription (should be PASSED)
INSERT INTO recordings (
  id, 
  user_id, 
  sentence, 
  audio_url, 
  duration, 
  status, 
  created_at,
  original_sentence,
  transcription_edited
) VALUES (
  '22222222-2222-2222-2222-222222222229',
  '11111111-1111-1111-1111-111111111111',
  'Ji duto dwaro rito chunygi gi ngima maberie',
  'https://example.com/audio/sample9.mp3',
  6.8,
  'pending',
  NOW(),
  NULL,
  FALSE
);

-- Recording 10: Correct transcription (should be PASSED)
INSERT INTO recordings (
  id, 
  user_id, 
  sentence, 
  audio_url, 
  duration, 
  status, 
  created_at,
  original_sentence,
  transcription_edited
) VALUES (
  '22222222-2222-2222-2222-222222222230',
  '11111111-1111-1111-1111-111111111111',
  'Wuoro gi min ne ng''eyo ni nyathindo dwarore gi luoro',
  'https://example.com/audio/sample10.mp3',
  7.2,
  'pending',
  NOW(),
  NULL,
  FALSE
);

-- =============================================
-- VERIFICATION QUERY
-- =============================================
-- Run this to verify the test data was inserted:
-- 
-- SELECT id, sentence, duration, status, created_at
-- FROM recordings
-- WHERE user_id = '11111111-1111-1111-1111-111111111111'
-- ORDER BY created_at DESC;
-- 
-- Should return 10 recordings
-- =============================================

-- =============================================
-- CLEANUP QUERY (Optional - run to remove test data)
-- =============================================
-- To remove test data after testing:
-- 
-- DELETE FROM recordings WHERE user_id = '11111111-1111-1111-1111-111111111111';
-- DELETE FROM users WHERE id = '11111111-1111-1111-1111-111111111111';
-- =============================================

