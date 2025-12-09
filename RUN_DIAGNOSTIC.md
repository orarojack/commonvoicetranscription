# How to Run the Language Diagnostic Script

## Option 1: Set Environment Variables in PowerShell (Recommended)

Run these commands in PowerShell before running the script:

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL="your-supabase-url-here"
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key-here"
node scripts/check_language_issue.js
```

## Option 2: Create .env.local File

Create a `.env.local` file in the project root with:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key-here
```

Then run:
```powershell
node scripts/check_language_issue.js
```

## Option 3: Check Your Supabase Dashboard

1. Go to your Supabase project dashboard
2. Click on "Settings" → "API"
3. Copy the "Project URL" (this is your `NEXT_PUBLIC_SUPABASE_URL`)
4. Copy the "anon public" key (this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

## What the Script Will Show

The script will check:
- ✅ Which language tables exist (luo, somali, maasai, kalenjin, kikuyu)
- ✅ How many recordings are in each table
- ✅ What languages users have selected in their profiles
- ✅ Table structure (columns, status column, language column)
- ✅ Any mismatches between user selections and available tables

## Expected Output

You should see something like:
```
🔍 Checking language-related database issues...

1️⃣ Checking users table...
✅ Found 10 users
   Languages selected by users:
   - Somali: 3 user(s)
   - Luo: 5 user(s)
   - Maasai: 2 user(s)

2️⃣ Checking language-specific tables...
   ✅ luo:
      - Total records: 150
      - Pending records: 45
   ✅ somali:
      - Total records: 0
      - Pending records: 0
   ❌ maasai: Table does not exist
```

This will help you identify:
- Which tables need to be created
- Which tables need recordings imported
- Whether users' language selections are correct

