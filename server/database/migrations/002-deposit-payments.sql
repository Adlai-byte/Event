-- Migration: Deposit/Balance Payments + Cancellation Policies
-- Date: 2026-03-02
-- Phase 2

-- 1. New table: cancellation_policy (provider-owned policies with JSON refund rules)
CREATE TABLE IF NOT EXISTS `cancellation_policy` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `cp_provider_id` INT(11) NOT NULL,
    `cp_name` VARCHAR(100) NOT NULL,
    `cp_deposit_percent` DECIMAL(5,2) NOT NULL DEFAULT 50.00,
    `cp_rules` JSON NOT NULL,
    `cp_created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `cp_updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_provider` (`cp_provider_id`),
    FOREIGN KEY (`cp_provider_id`) REFERENCES `user`(`iduser`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. New table: payment_schedule (tracks deposit/balance due dates per booking)
CREATE TABLE IF NOT EXISTS `payment_schedule` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `ps_booking_id` INT(11) NOT NULL,
    `ps_type` ENUM('deposit', 'balance') NOT NULL,
    `ps_amount` DECIMAL(10,2) NOT NULL,
    `ps_due_date` DATE NOT NULL,
    `ps_status` ENUM('pending', 'paid', 'overdue', 'waived') NOT NULL DEFAULT 'pending',
    `ps_payment_id` INT(11) DEFAULT NULL,
    `ps_created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_booking` (`ps_booking_id`),
    INDEX `idx_status` (`ps_status`),
    INDEX `idx_due_date` (`ps_due_date`),
    FOREIGN KEY (`ps_booking_id`) REFERENCES `booking`(`idbooking`) ON DELETE CASCADE,
    FOREIGN KEY (`ps_payment_id`) REFERENCES `payment`(`idpayment`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Extend payment table with type column
-- Note: Use a procedure to check column existence since MySQL doesn't support IF NOT EXISTS on ALTER TABLE ADD COLUMN universally
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment' AND COLUMN_NAME = 'p_type');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `payment` ADD COLUMN `p_type` ENUM(''deposit'', ''balance'', ''full'', ''refund'') NOT NULL DEFAULT ''full'' AFTER `p_amount`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. Extend booking table with deposit tracking columns
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'booking' AND COLUMN_NAME = 'b_deposit_paid');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `booking` ADD COLUMN `b_deposit_paid` TINYINT(1) NOT NULL DEFAULT 0 AFTER `b_total_cost`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'booking' AND COLUMN_NAME = 'b_balance_due_date');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `booking` ADD COLUMN `b_balance_due_date` DATE DEFAULT NULL AFTER `b_deposit_paid`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'booking' AND COLUMN_NAME = 'b_cancellation_policy_snapshot');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `booking` ADD COLUMN `b_cancellation_policy_snapshot` JSON DEFAULT NULL AFTER `b_balance_due_date`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
