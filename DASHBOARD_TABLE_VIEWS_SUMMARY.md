# Dashboard Table Views Summary

## Overview
This document describes the comprehensive table views available for contributors, reviewers, and admins in the voice platform dashboard.

## Contributor Dashboard (`/dashboard`)

### Recording Status Overview Table
Displays a high-level summary of all contributor recordings:

| Column | Description |
|--------|-------------|
| **Status** | Recording status with color-coded indicators (Submitted, Approved, Rejected, Total Time) |
| **Count** | Number of recordings in each status |
| **Percentage** | Percentage of total recordings |
| **Description** | Explanation of what each status means |

**Features:**
- Click on any row to view detailed recordings for that status
- Interactive highlighting shows active filter
- Real-time statistics

### Detailed Recordings Table
When clicking on a status (Submitted/Approved/Rejected), shows individual recordings:

| Column | Description |
|--------|-------------|
| **#** | Sequential number |
| **Statement** | The sentence that was recorded |
| **Status** | Current review status (pending/approved/rejected) |
| **Audio** | Audio player for playback (download disabled) |
| **Duration** | Recording length in seconds |
| **Date** | Date and time of recording submission |

**Features:**
- Audio playback with `controlsList="nodownload"` to prevent downloading
- Line-clamp for long statements
- Color-coded status badges
- Scrollable view with sticky header
- Shows recording count

### Filter Controls
Contributors can filter their recordings by:
- **Status**: All Statuses / Approved / Rejected / Pending
- **Date Range**: All Time / Today / This Week / This Month / This Quarter
- **Search**: Free text search across statements

**Active Filters Display:**
- Visual badges show active filters
- One-click removal of individual filters
- "Clear All" button to reset filters
- Shows filtered count vs total count

## Reviewer Dashboard (`/dashboard`)

### Review History Table
Displays a summary of all reviewer decisions:

| Column | Description |
|--------|-------------|
| **Decision** | Review decision type (Approved, Rejected, Total Reviews) |
| **Count** | Number of reviews for each decision |
| **Percentage** | Percentage of total reviews |
| **Description** | Explanation of each decision type |

**Features:**
- Click on any row to view detailed reviews for that decision
- Interactive highlighting shows active filter
- Real-time review statistics

### Detailed Reviews Table
When clicking on a decision (Approved/Rejected/Total), shows individual reviews:

| Column | Description |
|--------|-------------|
| **#** | Sequential number |
| **Statement** | The sentence that was reviewed |
| **Decision** | Review decision (approved/rejected) |
| **Audio** | Audio player for playback (download disabled) |
| **Duration** | Recording length in seconds |
| **Date** | Date and time of review |
| **Comments** | Reviewer's comments on the recording |

**Features:**
- Audio playback with `controlsList="nodownload"` to prevent downloading
- Line-clamp for long statements and comments
- Color-coded decision badges (green for approved, red for rejected)
- Scrollable view with sticky header
- Shows review count

### Filter Controls
Reviewers can filter their reviews by:
- **Decision**: All Decisions / Approved / Rejected
- **Date Range**: All Time / Today / This Week / This Month / This Quarter
- **Search**: Free text search across statements and comments

**Active Filters Display:**
- Visual badges show active filters
- One-click removal of individual filters
- "Clear All" button to reset filters
- Shows filtered count vs total count

## Admin Dashboard (`/admin`)

### Simplified Recordings Table
Admins see a streamlined view of all recordings:

| Column | Description |
|--------|-------------|
| **Contributor** | Name and email of the person who made the recording |
| **Sentence** | The sentence that was recorded |
| **Duration** | Recording length in seconds |
| **Status** | Review status (pending/approved/rejected) |
| **Reviewer** | Name of the reviewer and review date |
| **Date** | Date of recording submission |
| **Actions** | Play audio and view reviewer info buttons |

**Features:**
- Cleaner, more focused table layout
- Audio can be played/downloaded by admins
- Quick actions for playback and viewing details
- Full recording management capabilities

### Mozilla Upload Tables
Admins can view and manage recordings for Mozilla Common Voice:

#### Pending Upload Table
| Column | Description |
|--------|-------------|
| **Recording ID** | Unique identifier (first 8 chars) |
| **Sentence** | The recorded sentence |
| **Contributor** | Name of the contributor |
| **Age** | Age in Mozilla format (e.g., "twenties") |
| **Gender** | Gender in Mozilla format (e.g., "male_masculine") |
| **Language Dialect** | Dialect information |
| **Created** | Date of recording creation |

#### Uploaded Table
Shows recordings already uploaded to Mozilla with the same columns plus:
- **Uploaded At**: Date and time of Mozilla upload

## Security & Permissions

### Audio Download Controls
- **Contributors**: ✅ Can play audio, ❌ Cannot download
- **Reviewers**: ✅ Can play audio, ❌ Cannot download
- **Admins**: ✅ Can play audio, ✅ Can download via browser controls

### Implementation
All contributor and reviewer audio elements include:
```html
<audio controls controlsList="nodownload" ... >
```

This disables the download button in the audio player controls while maintaining playback functionality.

## Data Display Enhancements

### Responsive Tables
- All tables are wrapped in `overflow-x-auto` for horizontal scrolling on mobile
- Maximum height with vertical scroll for detailed tables (`max-h-96 overflow-y-auto`)
- Sticky headers in scrollable tables for better navigation

### Empty States
- Clear messaging when no data is available
- Helpful calls-to-action to guide users
- Filter reset buttons when searches return no results

### Status Indicators
- Color-coded badges for different statuses
- Consistent color scheme across dashboard:
  - 🔴 Red: Submitted/Rejected
  - 🔵 Blue: Approved
  - 🟠 Orange: Rejected (contributors)
  - 🟣 Purple: Total Time
  - 🟢 Green: Approved (reviewers)

### Progress Tracking
- Real-time percentage calculations
- Visual progress indicators
- Session tracking separate from total counts

## User Experience Features

### Interactive Elements
- Clickable status rows to drill down into details
- Hover effects for better interactivity
- Active state highlighting with ring borders
- Smooth transitions on state changes

### Performance
- Lazy loading with `preload="metadata"` for audio
- Pagination-ready structure (currently showing all)
- Efficient filtering without database queries
- Client-side search and filter

### Accessibility
- Semantic table structure
- Clear heading hierarchy
- Descriptive labels for all controls
- Keyboard-navigable interfaces

## Summary

The platform provides comprehensive table views for all user types:
- **Contributors**: 2 table levels (overview + details) with 6 columns of detailed information
- **Reviewers**: 2 table levels (overview + details) with 7 columns of detailed information
- **Admins**: Multiple specialized tables for recordings, users, and Mozilla integration

All tables include filtering, search, and sorting capabilities while enforcing appropriate permission levels for audio downloads.

