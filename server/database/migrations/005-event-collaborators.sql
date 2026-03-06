-- Migration: Event Collaborators
-- Date: 2026-03-05
-- Phase 3.5 — C3

CREATE TABLE IF NOT EXISTS `event_collaborator` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `ecol_event_id` INT(11) NOT NULL,
    `ecol_user_id` INT(11) NOT NULL,
    `ecol_role` ENUM('viewer','editor') NOT NULL DEFAULT 'viewer',
    `ecol_invited_by` INT(11) NOT NULL,
    `ecol_status` ENUM('pending','accepted','declined') NOT NULL DEFAULT 'pending',
    `ecol_created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_event_user` (`ecol_event_id`, `ecol_user_id`),
    INDEX `idx_user` (`ecol_user_id`),
    FOREIGN KEY (`ecol_event_id`) REFERENCES `event`(`idevent`) ON DELETE CASCADE,
    FOREIGN KEY (`ecol_user_id`) REFERENCES `user`(`iduser`) ON DELETE CASCADE,
    FOREIGN KEY (`ecol_invited_by`) REFERENCES `user`(`iduser`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
