# Manual Storage Cleanup Instructions

If the SQL script cannot delete files from Supabase Storage automatically (due to permissions), follow these steps to manually delete storage files.

## Option 1: Using Supabase Dashboard (Easiest)

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Storage** in the left sidebar
4. Click on the **recordings** bucket (or **audio-recordings** if that's what you named it)
5. You'll see all folders organized by user ID
6. **Select all files** (use the checkbox at the top)
7. Click **Delete** button
8. Confirm the deletion

This will delete all audio files from storage.

## Option 2: Using Supabase CLI

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# List files in storage
supabase storage ls recordings

# Delete all files (be careful!)
# Note: This requires manual scripting or using the dashboard
```

## Option 3: Using Storage API (Programmatic)

Create a script to delete all files:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role key needed for admin operations
)

async function deleteAllStorageFiles() {
  // List all files in the recordings bucket
  const { data: files, error: listError } = await supabase
    .storage
    .from('recordings')
    .list('', {
      limit: 1000,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' }
    })

  if (listError) {
    console.error('Error listing files:', listError)
    return
  }

  // Delete all files
  const filesToDelete = files.map(file => file.name)
  
  for (const folder of files) {
    // List files in each folder (user folder)
    const { data: userFiles } = await supabase
      .storage
      .from('recordings')
      .list(folder.name)

    if (userFiles) {
      for (const file of userFiles) {
        const filePath = `${folder.name}/${file.name}`
        const { error } = await supabase
          .storage
          .from('recordings')
          .remove([filePath])
        
        if (error) {
          console.error(`Error deleting ${filePath}:`, error)
        } else {
          console.log(`Deleted: ${filePath}`)
        }
      }
    }
  }
}

deleteAllStorageFiles()
```

## Option 4: Empty the Entire Bucket (Nuclear Option)

If you want to completely reset the bucket:

1. Go to Supabase Dashboard → Storage
2. Click on **recordings** bucket
3. Click **Settings** (gear icon)
4. Click **Delete Bucket** (this will delete the bucket and all files)
5. Recreate the bucket using `scripts/003_setup_storage.sql` or `scripts/004_alternative_storage_setup.sql`

## Important Notes

- **Storage files are NOT automatically deleted** when database records are deleted
- Files in storage consume storage quota even if database records are gone
- Always check storage usage after database cleanup to avoid unexpected costs
- The SQL script will attempt to delete storage files but may fail due to RLS policies
- Manual deletion via Dashboard is the most reliable method

## Verification

After deletion, verify:
1. Go to Storage → recordings bucket
2. Should show 0 files or empty folder structure
3. Check storage usage in project settings

