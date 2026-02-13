# Favorites Feature Setup Guide

This guide will help you set up the user favorites feature for the DeelMap marketplace.

## Database Setup

1. **Run the database schema script:**
   - Open your Supabase Dashboard
   - Go to SQL Editor
   - Run the script: `database/user_favorites_schema.sql`
   - This creates the `user_favorites` table with proper indexes

## Features Implemented

### 1. Favorite Icon on Property Cards
- Star icon appears on all property cards
- Always visible (not just on hover)
- Filled yellow when favorited, gray outline when not
- Clicking the star toggles favorite status

### 2. Authentication Check
- If user is not logged in and clicks favorite icon:
  - Auth modal opens prompting them to sign in
  - After signing in, they can favorite properties

### 3. Saved Properties Page
- Accessible via `/saved-properties`
- Shows all properties the user has favorited
- Sorted by most recently favorited first
- Empty state when no favorites exist
- Requires authentication to view

### 4. Navbar Dropdown Updates
- Added "Saved Properties" link
- Added "Settings" link
- Both links appear in the user dropdown menu

### 5. Settings Page
- Basic settings page at `/settings`
- Shows account information
- Placeholder sections for preferences and security

## API Endpoints

### GET `/api/favorites`
- Returns all favorites for the authenticated user
- Requires Authorization header: `Bearer {userId}`

### POST `/api/favorites`
- Adds a property to favorites
- Body: `{ property_id: "uuid" }`
- Requires Authorization header: `Bearer {userId}`

### DELETE `/api/favorites?property_id={uuid}`
- Removes a property from favorites
- Requires Authorization header: `Bearer {userId}`

### POST `/api/favorites/check`
- Batch check if multiple properties are favorited
- Body: `{ property_ids: ["uuid1", "uuid2", ...] }`
- Returns: `{ favorited: { "uuid1": true, "uuid2": false, ... } }`

## How It Works

1. **Property Cards:**
   - Each card loads favorite status on mount
   - Favorite icon is always visible
   - Clicking toggles favorite and updates UI immediately

2. **Marketplace Page:**
   - Batch loads favorite status for all visible properties
   - Efficiently checks multiple properties at once

3. **Saved Properties Page:**
   - Fetches user's favorite property IDs
   - Fetches full property details from marketplace database
   - Maintains sort order (most recent first)
   - Auto-refreshes when favorites change

## Database Schema

```sql
CREATE TABLE user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  property_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT user_favorites_unique UNIQUE (user_id, property_id)
);
```

## Notes

- Favorites are stored in the main Supabase database (same as users)
- Properties are fetched from the marketplace Supabase database
- The system handles both databases correctly
- All favorite operations require user authentication
