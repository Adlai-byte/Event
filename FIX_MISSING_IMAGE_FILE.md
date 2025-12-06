# Fix: Image File Not Found on VPS

## Problem Identified

The file `profile_55_1764663693073_dleqnbl.jpeg` does NOT exist on the VPS, but the database might have this filename stored.

However, there IS a file `profile_55_1764664242390_y8viszc.jpeg` in the directory, which suggests:
- Files ARE being saved, but with different names
- There's a mismatch between database and actual files

## Diagnostic Steps

### Step 1: List All Profile 55 Files

```bash
cd /var/www/event-app/server/uploads/images
ls -lah profile_55_*
```

This will show ALL profile pictures for user 55.

### Step 2: Check Database for User 55's Profile Picture

Connect to MySQL and check what filename is stored:

```bash
mysql -u event_user -p event_db
```

Then run:
```sql
SELECT iduser, u_email, u_profile_picture 
FROM `user` 
WHERE iduser = 55;
```

This will show what filename is stored in the database.

### Step 3: Compare Database vs Files

- If database has: `profile_55_1764663693073_dleqnbl.jpeg`
- But file exists: `profile_55_1764664242390_y8viszc.jpeg`
- Then there's a mismatch!

## Solutions

### Solution 1: Update Database to Match Existing File

If the file `profile_55_1764664242390_y8viszc.jpeg` exists and is the correct one:

```sql
UPDATE `user` 
SET u_profile_picture = '/uploads/images/profile_55_1764664242390_y8viszc.jpeg'
WHERE iduser = 55;
```

### Solution 2: Check Why File Wasn't Saved

The file might not have been saved because:
1. Save operation failed silently
2. Error was caught but database was still updated
3. File was saved to wrong location

Check server logs:
```bash
pm2 logs event-api --lines 100 | grep -i "profile_55_1764663693073"
```

Look for:
- "Failed to save profile picture"
- "File was not created"
- Any errors during save

### Solution 3: Re-upload the Image

The safest solution is to have the user upload the image again:
1. Go to Personal Information
2. Click "Change Photo"
3. Select the image
4. Click "Save"

This will create a new file and update the database correctly.

## Prevention

The code changes we made should prevent this in the future:
- Database only updates if file is confirmed saved
- Multiple verification steps
- Better error handling

But you need to **restart the server** for these changes to take effect!

## Quick Fix Commands

```bash
# 1. List all profile 55 files
ls -lah /var/www/event-app/server/uploads/images/profile_55_*

# 2. Check the most recent one
ls -lt /var/www/event-app/server/uploads/images/profile_55_* | head -1

# 3. Check database (if you have MySQL access)
mysql -u event_user -p event_db -e "SELECT iduser, u_profile_picture FROM \`user\` WHERE iduser = 55;"

# 4. Update database to use existing file (if needed)
mysql -u event_user -p event_db -e "UPDATE \`user\` SET u_profile_picture = '/uploads/images/profile_55_1764664242390_y8viszc.jpeg' WHERE iduser = 55;"
```

## Next Steps

1. **Check what files exist**: `ls -lah profile_55_*`
2. **Check database**: See what filename is stored
3. **Fix mismatch**: Either update database or re-upload image
4. **Restart server**: To apply the new code changes
5. **Test again**: Upload a new image to verify it works

