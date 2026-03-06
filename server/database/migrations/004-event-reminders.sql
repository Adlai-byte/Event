-- Migration: Event Reminders
-- Date: 2026-03-05
-- Phase 3.5 — C1

CREATE TABLE IF NOT EXISTS `event_reminder` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `er_event_id` INT(11) NOT NULL,
    `er_type` ENUM('email','push','both') NOT NULL DEFAULT 'push',
    `er_remind_at` DATETIME NOT NULL,
    `er_message` VARCHAR(500) DEFAULT NULL,
    `er_is_sent` TINYINT(1) NOT NULL DEFAULT 0,
    `er_created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_event` (`er_event_id`),
    INDEX `idx_remind` (`er_remind_at`, `er_is_sent`),
    FOREIGN KEY (`er_event_id`) REFERENCES `event`(`idevent`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
