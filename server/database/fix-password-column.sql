-- Fix u_password column size to ensure it can store bcrypt hashes
-- Bcrypt hashes are 60 characters, but we'll use VARCHAR(255) to be safe

-- Check current column size and update if needed
ALTER TABLE `user` 
MODIFY COLUMN `u_password` VARCHAR(255) DEFAULT NULL;

-- Verify the change
DESCRIBE `user`;

