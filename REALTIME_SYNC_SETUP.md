# Real-time Recording Synchronization Setup

## Overview

This feature ensures that when any reviewer validates a recording, it immediately disappears from all other reviewers' pending lists in real-time. This prevents duplicate reviews and ensures efficient collaboration among reviewers.

## How It Works

The implementation uses **Supabase Realtime** to subscribe to INSERT events on the `reviews` table. When a new review is created:

1. All reviewers receive a real-time notification
2. The reviewed recording is automatically removed from their pending lists
3. If a reviewer is currently viewing that recording, they are automatically moved to the next recording
4. A notification toast appears to inform the user

## Setup Requirements

### 1. Enable Realtime on Reviews Table

In your Supabase dashboard:

1. Go to **Database** → **Replication**
2. Find the `reviews` table
3. Enable replication for the `reviews` table
4. Save changes

Alternatively, you can enable it via SQL:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE reviews;
```

### 2. Verify Row Level Security (RLS)

Ensure that reviewers can read the reviews table. Check your RLS policies:

```sql
-- Reviewers should be able to read reviews (for real-time sync)
CREATE POLICY "Reviewers can read reviews"
ON reviews FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'reviewer'
  )
);
```

### 3. Test the Feature

1. Open the listen page in two different browser windows/tabs
2. Log in as two different reviewers
3. Have one reviewer validate a recording
4. Observe that the recording disappears from the other reviewer's list immediately

## Technical Details

### Implementation Location

- **File**: `app/listen/page.tsx`
- **Lines**: ~65-173
- **Subscription Channel**: `reviews-realtime`

### Key Components

1. **Real-time Subscription**: Listens for INSERT events on `reviews` table
2. **Recording Removal**: Automatically removes reviewed recordings from pending list
3. **Current Recording Handling**: Moves to next recording if current one is reviewed
4. **User Notifications**: Shows toast notifications for transparency

### Performance Considerations

- Uses a single channel per user session
- Efficiently filters out own reviews (handled locally)
- Cleans up subscriptions on component unmount
- Limits real-time events to 10 per second (configured in `lib/supabase.ts`)

## Troubleshooting

### Recordings Not Disappearing in Real-time

1. **Check Realtime Status**: Verify that Realtime is enabled on the `reviews` table in Supabase dashboard
2. **Check Browser Console**: Look for subscription status messages:
   - `✅ Successfully subscribed to real-time review events` - Good
   - `❌ Error subscribing to real-time review events` - Check network/permissions
3. **Verify RLS Policies**: Ensure reviewers can read from the `reviews` table
4. **Check Network**: Ensure WebSocket connections are not blocked

### Duplicate Notifications

- The implementation filters out own reviews to prevent duplicate notifications
- If you see duplicates, check that `user.id` is correctly set and matches the reviewer_id in reviews

## Benefits

✅ **No Duplicate Reviews**: Prevents multiple reviewers from reviewing the same recording  
✅ **Efficient Workflow**: Reviewers always see only unreviewed recordings  
✅ **Real-time Updates**: Changes appear instantly without page refresh  
✅ **Better Collaboration**: Multiple reviewers can work simultaneously without conflicts  

