# Profile Setup Updates Summary

## Overview
This document summarizes all the enhancements made to the user profile setup system, including new fields, validation, and database schema updates.

## Changes Implemented

### 1. **New Field: National ID Number**
- **Location**: Demographics section
- **Type**: Text input (required)
- **Validation**: 
  - Must be unique across all users
  - Real-time validation checks for duplicates
  - Shows error message if ID already exists
- **Database**: Stored in `users.id_number` column (VARCHAR(50), UNIQUE)
- **Purpose**: Unique identifier for each user, prevents duplicate registrations

### 2. **Enhanced Phone Number Field**
- **Updated Label**: Changed from "Phone Number" to "M-Pesa Phone Number"
- **Validation**: 
  - Must be unique across all users
  - Real-time validation checks for duplicates
  - Shows error message if phone number already exists
- **Database**: Stored in `users.phone_number` column with unique constraint
- **Purpose**: Ensures phone numbers are M-Pesa registered numbers and prevents duplicates

### 3. **Accent Dialect Dropdown with Description**
- **Location**: Language & Voice section
- **Changed From**: Textarea (free text)
- **Changed To**: Dropdown select (required) + Optional text description
- **Dropdown Options**:
  - Milambo
  - Nyanduat
- **Description Field**: 
  - Appears after selecting a dialect
  - Optional textarea for detailed accent description
  - Allows users to provide context about their speaking style
- **Database**: 
  - `users.accent_dialect` (VARCHAR(50)) - stores the selected dialect
  - `users.accent_description` (TEXT) - stores optional description
- **Purpose**: Better categorization of voice recordings with standardized dialects plus flexible descriptions

### 4. **Student Employment Status**
- **Location**: Education & Professional section
- **Updated**: Added "Student" to employment status options
- **Options Now**:
  - Employed
  - Self-employed
  - Student ✨ NEW
  - Unemployed
- **Database**: Updated constraint on `users.employment_status`

## Database Changes

### New Columns Added:
```sql
-- National ID Number
id_number VARCHAR(50) UNIQUE

-- Accent Dialect (Milambo or Nyanduat)
accent_dialect VARCHAR(50) CHECK (accent_dialect IN ('Milambo', 'Nyanduat'))

-- Accent Description (Optional)
accent_description TEXT
```

### Updated Constraints:
```sql
-- Employment Status now includes 'student'
CHECK (employment_status IN ('employed', 'self-employed', 'student', 'unemployed'))
```

### New Indexes:
```sql
-- For faster ID number lookups
CREATE INDEX idx_users_id_number ON users(id_number);

-- For faster phone number lookups
CREATE INDEX idx_users_phone_number ON users(phone_number);
```

## Backend Enhancements

### New Database Methods (lib/database.ts):

1. **`getUserByIdNumber(idNumber: string)`**
   - Retrieves a user by their ID number
   - Returns User object or null

2. **`getUserByPhoneNumber(phoneNumber: string)`**
   - Retrieves a user by their phone number
   - Returns User object or null

3. **`checkIdNumberExists(idNumber: string, excludeUserId?: string)`**
   - Checks if an ID number is already registered
   - Can exclude a specific user (for updates)
   - Returns boolean

4. **`checkPhoneNumberExists(phoneNumber: string, excludeUserId?: string)`**
   - Checks if a phone number is already registered
   - Can exclude a specific user (for updates)
   - Returns boolean

## Frontend Enhancements

### Form Validation:
- **Real-time validation** for ID number and phone number uniqueness
- **Error messages** displayed inline when duplicates are detected
- **Visual feedback** with red borders on fields with errors
- **Clear validation state** that resets when user modifies the field

### User Experience:
- All required fields marked with asterisk (*)
- Helpful placeholder text and descriptions
- Progress calculation updated to include new required fields
- Form submission blocked until all validations pass

## Migration Instructions

### To Apply Database Changes:

1. **Using Supabase Dashboard**:
   - Go to SQL Editor in Supabase
   - Copy content from `scripts/009_add_id_number_and_accent_dialect.sql`
   - Run the migration

2. **Using Command Line**:
   ```bash
   psql -U your_username -d your_database -f scripts/009_add_id_number_and_accent_dialect.sql
   ```

### Verification:
After migration, verify using:
```sql
-- Check new columns
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('id_number', 'accent_dialect');

-- Check new indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'users' 
AND indexname IN ('idx_users_id_number', 'idx_users_phone_number');
```

## Data Flow

### Profile Submission Flow:
1. User fills in profile form
2. Before submission, system validates:
   - ID number uniqueness (checks database)
   - Phone number uniqueness (checks database)
3. If validation passes:
   - Data is saved to database with all new fields
   - Profile marked as complete
   - User redirected to appropriate page based on role
4. If validation fails:
   - Error messages displayed
   - Form submission blocked
   - User must correct issues before proceeding

### Data Saved to Database:
```javascript
{
  name: string,
  age: string,
  gender: string,
  id_number: string,           // ✨ NEW
  location: string,
  constituency: string,
  language_dialect: string,
  accent_dialect: string,       // ✨ NEW - Milambo or Nyanduat
  accent_description: string,   // ✨ NEW - Optional description
  educational_background: string,
  employment_status: string,    // ✨ Updated to include 'student'
  phone_number: string,         // ✨ Enhanced with uniqueness validation
  profile_complete: true
}
```

## Benefits

1. **Data Integrity**: Unique constraints prevent duplicate users
2. **Better Voice Profiling**: Dialect dropdown provides standardized categorization with only 2 core options
3. **Flexibility**: Optional description field allows users to provide additional accent details
4. **Inclusive Options**: Student status added for younger contributors
5. **User Experience**: Clear validation with helpful error messages, conditional fields appear as needed
6. **Performance**: Indexes improve lookup speed for ID and phone numbers
7. **Data Quality**: Structured dropdowns instead of free text improve data consistency

## Files Modified

### Core Application:
- `app/profile/setup/page.tsx` - Profile setup form with all enhancements
- `lib/database.ts` - New database methods for validation
- `components/consent-license-form.tsx` - Previously added consent form

### Database:
- `scripts/009_add_id_number_and_accent_dialect.sql` - Migration script
- `scripts/README_MIGRATION.md` - Migration documentation

### Documentation:
- `PROFILE_UPDATES_SUMMARY.md` - This file

## Testing Checklist

- [ ] Run database migration successfully
- [ ] Verify new columns exist in database (id_number, accent_dialect, accent_description)
- [ ] Test ID number uniqueness validation
- [ ] Test phone number uniqueness validation
- [ ] Verify dialect dropdown shows only Milambo and Nyanduat
- [ ] Verify accent description field appears after selecting a dialect
- [ ] Verify accent description is optional (form submits without it)
- [ ] Check that 'Student' appears in employment status
- [ ] Test form submission with all fields filled
- [ ] Verify data is saved correctly to database
- [ ] Test error messages for duplicate ID/phone
- [ ] Verify existing users can still update profiles

## Notes

- Existing users will have `NULL` for `id_number`, `accent_dialect`, and `accent_description` until they update their profiles
- The validation only prevents new duplicates; existing data remains unchanged
- Users can update their profiles at any time with the new fields
- All changes are backward compatible with existing data
- The accent description field only appears after selecting a dialect (conditional rendering)
- Accent description is optional - users can submit the form without filling it in

