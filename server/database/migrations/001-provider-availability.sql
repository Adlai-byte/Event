-- Migration: Provider Availability System
-- Date: 2026-03-02

-- 1. New table: provider_blocked_date
CREATE TABLE IF NOT EXISTS `provider_blocked_date` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `pbd_provider_id` INT(11) NOT NULL,
    `pbd_date` DATE NOT NULL,
    `pbd_reason` VARCHAR(255) DEFAULT NULL,
    `pbd_created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `unique_provider_date` (`pbd_provider_id`, `pbd_date`),
    INDEX `idx_provider` (`pbd_provider_id`),
    INDEX `idx_date` (`pbd_date`),
    FOREIGN KEY (`pbd_provider_id`) REFERENCES `user`(`iduser`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Extend service_availability with specific date override column
ALTER TABLE `service_availability`
    ADD COLUMN IF NOT EXISTS `sa_specific_date` DATE DEFAULT NULL AFTER `sa_day_of_week`,
    ADD INDEX `idx_specific_date` (`sa_specific_date`);

-- 3. Add deposit/policy columns to service table (Phase 2 prep, safe to add now)
ALTER TABLE `service`
    ADD COLUMN IF NOT EXISTS `s_deposit_percent` DECIMAL(5,2) DEFAULT 100.00 AFTER `s_location_type`,
    ADD COLUMN IF NOT EXISTS `s_cancellation_policy_id` INT(11) DEFAULT NULL AFTER `s_deposit_percent`;
