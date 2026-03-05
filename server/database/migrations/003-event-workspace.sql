-- Migration: Event Workspace
-- Date: 2026-03-02
-- Phase 3

-- 1. New table: event (user-created event planner)
CREATE TABLE IF NOT EXISTS `event` (
    `idevent` INT(11) NOT NULL AUTO_INCREMENT,
    `e_user_id` INT(11) NOT NULL,
    `e_name` VARCHAR(255) NOT NULL,
    `e_date` DATE NOT NULL,
    `e_end_date` DATE DEFAULT NULL,
    `e_location` VARCHAR(500) DEFAULT NULL,
    `e_budget` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `e_guest_count` INT(11) DEFAULT NULL,
    `e_description` TEXT,
    `e_status` ENUM('planning','upcoming','in_progress','completed','cancelled') NOT NULL DEFAULT 'planning',
    `e_created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `e_updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`idevent`),
    INDEX `idx_user` (`e_user_id`),
    INDEX `idx_status` (`e_status`),
    INDEX `idx_date` (`e_date`),
    FOREIGN KEY (`e_user_id`) REFERENCES `user`(`iduser`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. New table: event_checklist
CREATE TABLE IF NOT EXISTS `event_checklist` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `ec_event_id` INT(11) NOT NULL,
    `ec_title` VARCHAR(255) NOT NULL,
    `ec_is_completed` TINYINT(1) NOT NULL DEFAULT 0,
    `ec_due_date` DATE DEFAULT NULL,
    `ec_category` VARCHAR(100) DEFAULT NULL,
    `ec_sort_order` INT(11) NOT NULL DEFAULT 0,
    `ec_created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_event` (`ec_event_id`),
    INDEX `idx_sort` (`ec_event_id`, `ec_sort_order`),
    FOREIGN KEY (`ec_event_id`) REFERENCES `event`(`idevent`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. New table: event_timeline
CREATE TABLE IF NOT EXISTS `event_timeline` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `et_event_id` INT(11) NOT NULL,
    `et_start_time` TIME NOT NULL,
    `et_end_time` TIME DEFAULT NULL,
    `et_title` VARCHAR(255) NOT NULL,
    `et_description` TEXT,
    `et_booking_id` INT(11) DEFAULT NULL,
    `et_sort_order` INT(11) NOT NULL DEFAULT 0,
    `et_created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_event` (`et_event_id`),
    INDEX `idx_sort` (`et_event_id`, `et_sort_order`),
    FOREIGN KEY (`et_event_id`) REFERENCES `event`(`idevent`) ON DELETE CASCADE,
    FOREIGN KEY (`et_booking_id`) REFERENCES `booking`(`idbooking`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Extend booking table with event association
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'booking' AND COLUMN_NAME = 'b_event_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `booking` ADD COLUMN `b_event_id` INT(11) DEFAULT NULL, ADD INDEX `idx_event` (`b_event_id`)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add FK constraint separately (idempotent check via constraint name)
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'booking' AND CONSTRAINT_NAME = 'fk_booking_event');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE `booking` ADD CONSTRAINT `fk_booking_event` FOREIGN KEY (`b_event_id`) REFERENCES `event`(`idevent`) ON DELETE SET NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
