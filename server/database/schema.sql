-- Event Management System Database Schema
-- Database: event

-- ============================================
-- USERS TABLE (Enhanced)
-- ============================================
CREATE TABLE IF NOT EXISTS `user` (
    `iduser` INT(11) NOT NULL AUTO_INCREMENT,
    `u_fname` VARCHAR(50) NOT NULL,
    `u_mname` VARCHAR(50) DEFAULT NULL,
    `u_lname` VARCHAR(50) NOT NULL,
    `u_suffix` VARCHAR(10) DEFAULT NULL,
    `u_email` VARCHAR(100) NOT NULL UNIQUE,
    `u_password` VARCHAR(255) DEFAULT NULL,
    `u_disabled` TINYINT(1) NOT NULL DEFAULT 0,
    `u_role` ENUM('user', 'admin', 'provider') NOT NULL DEFAULT 'user',
    `u_phone` VARCHAR(20) DEFAULT NULL,
    `u_created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `u_updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `u_last_login` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`iduser`),
    INDEX `idx_email` (`u_email`),
    INDEX `idx_disabled` (`u_disabled`),
    INDEX `idx_role` (`u_role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SERVICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS `service` (
    `idservice` INT(11) NOT NULL AUTO_INCREMENT,
    `s_provider_id` INT(11) NOT NULL,
    `s_name` VARCHAR(200) NOT NULL,
    `s_description` TEXT,
    `s_category` ENUM('venue', 'catering', 'photography', 'music', 'decoration', 'transportation', 'entertainment', 'planning', 'other') NOT NULL,
    `s_base_price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `s_pricing_type` ENUM('fixed', 'hourly', 'per_person', 'package', 'custom') NOT NULL DEFAULT 'fixed',
    `s_duration` INT(11) DEFAULT 60 COMMENT 'Duration in minutes',
    `s_max_capacity` INT(11) DEFAULT 1,
    `s_city` VARCHAR(100) DEFAULT NULL,
    `s_state` VARCHAR(100) DEFAULT NULL,
    `s_zip_code` VARCHAR(20) DEFAULT NULL,
    `s_address` VARCHAR(255) DEFAULT NULL,
    `s_location_type` ENUM('physical', 'virtual', 'both') NOT NULL DEFAULT 'physical',
    `s_deposit_percent` DECIMAL(5,2) DEFAULT 100.00,
    `s_cancellation_policy_id` INT(11) DEFAULT NULL,
    `s_rating` DECIMAL(3, 2) DEFAULT 0.00 COMMENT 'Average rating 0-5',
    `s_review_count` INT(11) DEFAULT 0,
    `s_is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `s_created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `s_updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`idservice`),
    INDEX `idx_provider` (`s_provider_id`),
    INDEX `idx_category` (`s_category`),
    INDEX `idx_active` (`s_is_active`),
    INDEX `idx_rating` (`s_rating`),
    FOREIGN KEY (`s_provider_id`) REFERENCES `user`(`iduser`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SERVICE IMAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS `service_image` (
    `idimage` INT(11) NOT NULL AUTO_INCREMENT,
    `si_service_id` INT(11) NOT NULL,
    `si_image_url` TEXT NOT NULL,
    `si_is_primary` TINYINT(1) NOT NULL DEFAULT 0,
    `si_order` INT(11) DEFAULT 0,
    `si_created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`idimage`),
    INDEX `idx_service` (`si_service_id`),
    FOREIGN KEY (`si_service_id`) REFERENCES `service`(`idservice`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SERVICE AVAILABILITY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS `service_availability` (
    `idavailability` INT(11) NOT NULL AUTO_INCREMENT,
    `sa_service_id` INT(11) NOT NULL,
    `sa_day_of_week` TINYINT(1) NOT NULL COMMENT '0=Sunday, 1=Monday, ..., 6=Saturday',
    `sa_specific_date` DATE DEFAULT NULL,
    `sa_start_time` TIME NOT NULL,
    `sa_end_time` TIME NOT NULL,
    `sa_is_available` TINYINT(1) NOT NULL DEFAULT 1,
    `sa_price_override` DECIMAL(10, 2) DEFAULT NULL,
    PRIMARY KEY (`idavailability`),
    INDEX `idx_service` (`sa_service_id`),
    INDEX `idx_specific_date` (`sa_specific_date`),
    FOREIGN KEY (`sa_service_id`) REFERENCES `service`(`idservice`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- PROVIDER BLOCKED DATES TABLE
-- ============================================
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

-- ============================================
-- BOOKINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS `booking` (
    `idbooking` INT(11) NOT NULL AUTO_INCREMENT,
    `b_client_id` INT(11) NOT NULL,
    `b_event_name` VARCHAR(200) NOT NULL,
    `b_event_date` DATE NOT NULL,
    `b_start_time` TIME NOT NULL,
    `b_end_time` TIME NOT NULL,
    `b_location` VARCHAR(255) NOT NULL,
    `b_total_cost` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `b_deposit_paid` TINYINT(1) NOT NULL DEFAULT 0,                     -- Phase 2: deposit tracking
    `b_balance_due_date` DATE DEFAULT NULL,                              -- Phase 2: balance due date
    `b_cancellation_policy_snapshot` JSON DEFAULT NULL,                   -- Phase 2: policy snapshot at booking time
    `b_event_id` INT(11) DEFAULT NULL,                                     -- Phase 3: event workspace association
    `b_status` ENUM('pending', 'confirmed', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
    `b_attendees` INT(11) DEFAULT NULL,
    `b_notes` TEXT,
    `b_created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `b_updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`idbooking`),
    INDEX `idx_client` (`b_client_id`),
    INDEX `idx_status` (`b_status`),
    INDEX `idx_event_date` (`b_event_date`),
    INDEX `idx_event` (`b_event_id`),
    FOREIGN KEY (`b_client_id`) REFERENCES `user`(`iduser`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- BOOKING SERVICES TABLE (Many-to-Many)
-- ============================================
CREATE TABLE IF NOT EXISTS `booking_service` (
    `idbooking_service` INT(11) NOT NULL AUTO_INCREMENT,
    `bs_booking_id` INT(11) NOT NULL,
    `bs_service_id` INT(11) NOT NULL,
    `bs_quantity` INT(11) NOT NULL DEFAULT 1,
    `bs_unit_price` DECIMAL(10, 2) NOT NULL,
    `bs_total_price` DECIMAL(10, 2) NOT NULL,
    `bs_notes` TEXT,
    PRIMARY KEY (`idbooking_service`),
    INDEX `idx_booking` (`bs_booking_id`),
    INDEX `idx_service` (`bs_service_id`),
    FOREIGN KEY (`bs_booking_id`) REFERENCES `booking`(`idbooking`) ON DELETE CASCADE,
    FOREIGN KEY (`bs_service_id`) REFERENCES `service`(`idservice`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- PAYMENT METHODS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS `payment_method` (
    `idpayment_method` INT(11) NOT NULL AUTO_INCREMENT,
    `pm_user_id` INT(11) NOT NULL,
    `pm_type` ENUM('gcash', 'paymaya', 'bank', 'credit_card') NOT NULL DEFAULT 'gcash',
    `pm_account_name` VARCHAR(100) NOT NULL,
    `pm_account_number` VARCHAR(50) NOT NULL,
    `pm_is_default` TINYINT(1) NOT NULL DEFAULT 0,
    `pm_created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `pm_updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`idpayment_method`),
    INDEX `idx_user` (`pm_user_id`),
    INDEX `idx_default` (`pm_user_id`, `pm_is_default`),
    FOREIGN KEY (`pm_user_id`) REFERENCES `user`(`iduser`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- HIRING REQUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS `hiring_request` (
    `idhiring_request` INT(11) NOT NULL AUTO_INCREMENT,
    `hr_client_id` INT(11) NOT NULL,
    `hr_provider_id` INT(11) DEFAULT NULL,
    `hr_service_id` INT(11) DEFAULT NULL,
    `hr_event_id` INT(11) DEFAULT NULL COMMENT 'Reference to booking if linked',
    `hr_title` VARCHAR(200) NOT NULL,
    `hr_description` TEXT NOT NULL,
    `hr_budget_min` DECIMAL(10, 2) NOT NULL,
    `hr_budget_max` DECIMAL(10, 2) NOT NULL,
    `hr_currency` VARCHAR(3) NOT NULL DEFAULT 'PHP',
    `hr_start_date` DATE NOT NULL,
    `hr_end_date` DATE NOT NULL,
    `hr_is_flexible` TINYINT(1) NOT NULL DEFAULT 0,
    `hr_city` VARCHAR(100) NOT NULL,
    `hr_state` VARCHAR(100) NOT NULL,
    `hr_address` VARCHAR(255) DEFAULT NULL,
    `hr_location_type` ENUM('remote', 'on-site', 'hybrid') NOT NULL DEFAULT 'on-site',
    `hr_status` ENUM('draft', 'open', 'in_review', 'closed', 'cancelled', 'completed') NOT NULL DEFAULT 'draft',
    `hr_experience_level` ENUM('entry', 'intermediate', 'expert', 'any') NOT NULL DEFAULT 'any',
    `hr_contract_type` ENUM('fixed_price', 'hourly', 'milestone', 'retainer') NOT NULL DEFAULT 'fixed_price',
    `hr_selected_proposal_id` INT(11) DEFAULT NULL,
    `hr_created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `hr_updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`idhiring_request`),
    INDEX `idx_client` (`hr_client_id`),
    INDEX `idx_provider` (`hr_provider_id`),
    INDEX `idx_service` (`hr_service_id`),
    INDEX `idx_status` (`hr_status`),
    INDEX `idx_event` (`hr_event_id`),
    FOREIGN KEY (`hr_client_id`) REFERENCES `user`(`iduser`) ON DELETE CASCADE,
    FOREIGN KEY (`hr_provider_id`) REFERENCES `user`(`iduser`) ON DELETE SET NULL,
    FOREIGN KEY (`hr_service_id`) REFERENCES `service`(`idservice`) ON DELETE SET NULL,
    FOREIGN KEY (`hr_event_id`) REFERENCES `booking`(`idbooking`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- HIRING REQUEST REQUIREMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS `hiring_requirement` (
    `idrequirement` INT(11) NOT NULL AUTO_INCREMENT,
    `hrq_hiring_request_id` INT(11) NOT NULL,
    `hrq_requirement` VARCHAR(500) NOT NULL,
    `hrq_order` INT(11) DEFAULT 0,
    PRIMARY KEY (`idrequirement`),
    INDEX `idx_hiring_request` (`hrq_hiring_request_id`),
    FOREIGN KEY (`hrq_hiring_request_id`) REFERENCES `hiring_request`(`idhiring_request`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- HIRING REQUEST SKILLS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS `hiring_skill` (
    `idskill` INT(11) NOT NULL AUTO_INCREMENT,
    `hs_hiring_request_id` INT(11) NOT NULL,
    `hs_skill` VARCHAR(100) NOT NULL,
    PRIMARY KEY (`idskill`),
    INDEX `idx_hiring_request` (`hs_hiring_request_id`),
    FOREIGN KEY (`hs_hiring_request_id`) REFERENCES `hiring_request`(`idhiring_request`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- PROPOSALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS `proposal` (
    `idproposal` INT(11) NOT NULL AUTO_INCREMENT,
    `p_provider_id` INT(11) NOT NULL,
    `p_hiring_request_id` INT(11) NOT NULL,
    `p_title` VARCHAR(200) NOT NULL,
    `p_description` TEXT NOT NULL,
    `p_proposed_budget` DECIMAL(10, 2) NOT NULL,
    `p_start_date` DATE NOT NULL,
    `p_end_date` DATE NOT NULL,
    `p_status` ENUM('submitted', 'under_review', 'accepted', 'rejected', 'revised', 'withdrawn') NOT NULL DEFAULT 'submitted',
    `p_client_feedback` TEXT,
    `p_submitted_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `p_updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`idproposal`),
    INDEX `idx_provider` (`p_provider_id`),
    INDEX `idx_hiring_request` (`p_hiring_request_id`),
    INDEX `idx_status` (`p_status`),
    FOREIGN KEY (`p_provider_id`) REFERENCES `user`(`iduser`) ON DELETE CASCADE,
    FOREIGN KEY (`p_hiring_request_id`) REFERENCES `hiring_request`(`idhiring_request`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- PROPOSAL DELIVERABLES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS `proposal_deliverable` (
    `iddeliverable` INT(11) NOT NULL AUTO_INCREMENT,
    `pd_proposal_id` INT(11) NOT NULL,
    `pd_deliverable` VARCHAR(500) NOT NULL,
    `pd_order` INT(11) DEFAULT 0,
    PRIMARY KEY (`iddeliverable`),
    INDEX `idx_proposal` (`pd_proposal_id`),
    FOREIGN KEY (`pd_proposal_id`) REFERENCES `proposal`(`idproposal`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- CONVERSATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS `conversation` (
    `idconversation` INT(11) NOT NULL AUTO_INCREMENT,
    `c_booking_id` INT(11) DEFAULT NULL,
    `c_service_id` INT(11) DEFAULT NULL,
    `c_hiring_request_id` INT(11) DEFAULT NULL,
    `c_subject` VARCHAR(200) DEFAULT NULL,
    `c_priority` ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
    `c_is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `c_created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `c_updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`idconversation`),
    INDEX `idx_booking` (`c_booking_id`),
    INDEX `idx_service` (`c_service_id`),
    INDEX `idx_hiring_request` (`c_hiring_request_id`),
    FOREIGN KEY (`c_booking_id`) REFERENCES `booking`(`idbooking`) ON DELETE SET NULL,
    FOREIGN KEY (`c_service_id`) REFERENCES `service`(`idservice`) ON DELETE SET NULL,
    FOREIGN KEY (`c_hiring_request_id`) REFERENCES `hiring_request`(`idhiring_request`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- CONVERSATION PARTICIPANTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS `conversation_participant` (
    `idparticipant` INT(11) NOT NULL AUTO_INCREMENT,
    `cp_conversation_id` INT(11) NOT NULL,
    `cp_user_id` INT(11) NOT NULL,
    `cp_unread_count` INT(11) NOT NULL DEFAULT 0,
    `cp_joined_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`idparticipant`),
    UNIQUE KEY `unique_conversation_user` (`cp_conversation_id`, `cp_user_id`),
    INDEX `idx_user` (`cp_user_id`),
    FOREIGN KEY (`cp_conversation_id`) REFERENCES `conversation`(`idconversation`) ON DELETE CASCADE,
    FOREIGN KEY (`cp_user_id`) REFERENCES `user`(`iduser`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS `message` (
    `idmessage` INT(11) NOT NULL AUTO_INCREMENT,
    `m_conversation_id` INT(11) NOT NULL,
    `m_sender_id` INT(11) NOT NULL,
    `m_content` TEXT NOT NULL,
    `m_message_type` ENUM('text', 'image', 'file', 'booking_request', 'booking_confirmation', 'booking_cancellation', 'payment_request', 'payment_confirmation', 'system') NOT NULL DEFAULT 'text',
    `m_is_read` TINYINT(1) NOT NULL DEFAULT 0,
    `m_reply_to_id` INT(11) DEFAULT NULL,
    `m_booking_id` INT(11) DEFAULT NULL,
    `m_service_id` INT(11) DEFAULT NULL,
    `m_action_required` TINYINT(1) NOT NULL DEFAULT 0,
    `m_action_type` VARCHAR(50) DEFAULT NULL,
    `m_created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`idmessage`),
    INDEX `idx_conversation` (`m_conversation_id`),
    INDEX `idx_sender` (`m_sender_id`),
    INDEX `idx_read` (`m_is_read`),
    INDEX `idx_created` (`m_created_at`),
    FOREIGN KEY (`m_conversation_id`) REFERENCES `conversation`(`idconversation`) ON DELETE CASCADE,
    FOREIGN KEY (`m_sender_id`) REFERENCES `user`(`iduser`) ON DELETE CASCADE,
    FOREIGN KEY (`m_reply_to_id`) REFERENCES `message`(`idmessage`) ON DELETE SET NULL,
    FOREIGN KEY (`m_booking_id`) REFERENCES `booking`(`idbooking`) ON DELETE SET NULL,
    FOREIGN KEY (`m_service_id`) REFERENCES `service`(`idservice`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MESSAGE ATTACHMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS `message_attachment` (
    `idattachment` INT(11) NOT NULL AUTO_INCREMENT,
    `ma_message_id` INT(11) NOT NULL,
    `ma_file_name` VARCHAR(255) NOT NULL,
    `ma_file_type` VARCHAR(50) NOT NULL,
    `ma_file_size` INT(11) NOT NULL COMMENT 'Size in bytes',
    `ma_download_url` VARCHAR(500) NOT NULL,
    `ma_thumbnail_url` VARCHAR(500) DEFAULT NULL,
    `ma_created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`idattachment`),
    INDEX `idx_message` (`ma_message_id`),
    FOREIGN KEY (`ma_message_id`) REFERENCES `message`(`idmessage`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SERVICE REVIEWS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS `service_review` (
    `idreview` INT(11) NOT NULL AUTO_INCREMENT,
    `sr_service_id` INT(11) NOT NULL,
    `sr_booking_id` INT(11) DEFAULT NULL,
    `sr_user_id` INT(11) NOT NULL,
    `sr_rating` TINYINT(1) NOT NULL COMMENT 'Rating 1-5',
    `sr_comment` TEXT,
    `sr_created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `sr_updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`idreview`),
    INDEX `idx_service` (`sr_service_id`),
    INDEX `idx_user` (`sr_user_id`),
    INDEX `idx_booking` (`sr_booking_id`),
    FOREIGN KEY (`sr_service_id`) REFERENCES `service`(`idservice`) ON DELETE CASCADE,
    FOREIGN KEY (`sr_booking_id`) REFERENCES `booking`(`idbooking`) ON DELETE SET NULL,
    FOREIGN KEY (`sr_user_id`) REFERENCES `user`(`iduser`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- PAYMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS `payment` (
    `idpayment` INT(11) NOT NULL AUTO_INCREMENT,
    `p_booking_id` INT(11) NOT NULL,
    `p_user_id` INT(11) NOT NULL,
    `p_amount` DECIMAL(10, 2) NOT NULL,
    `p_type` ENUM('deposit', 'balance', 'full', 'refund') NOT NULL DEFAULT 'full',  -- Phase 2: payment type
    `p_currency` VARCHAR(3) NOT NULL DEFAULT 'PHP',
    `p_status` ENUM('pending', 'processing', 'completed', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
    `p_payment_method` VARCHAR(50) DEFAULT NULL,
    `p_transaction_id` VARCHAR(100) DEFAULT NULL,
    `p_paid_at` TIMESTAMP NULL DEFAULT NULL,
    `p_created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `p_updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`idpayment`),
    INDEX `idx_booking` (`p_booking_id`),
    INDEX `idx_user` (`p_user_id`),
    INDEX `idx_status` (`p_status`),
    FOREIGN KEY (`p_booking_id`) REFERENCES `booking`(`idbooking`) ON DELETE CASCADE,
    FOREIGN KEY (`p_user_id`) REFERENCES `user`(`iduser`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- CANCELLATION POLICY TABLE (Phase 2)
-- ============================================
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

-- ============================================
-- PAYMENT SCHEDULE TABLE (Phase 2)
-- ============================================
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

-- ============================================
-- ACTIVITY LOG TABLE (For Analytics)
-- ============================================
CREATE TABLE IF NOT EXISTS `activity_log` (
    `idactivity` INT(11) NOT NULL AUTO_INCREMENT,
    `al_user_id` INT(11) DEFAULT NULL,
    `al_action` VARCHAR(100) NOT NULL,
    `al_entity_type` VARCHAR(50) DEFAULT NULL COMMENT 'booking, service, user, etc.',
    `al_entity_id` INT(11) DEFAULT NULL,
    `al_description` TEXT,
    `al_metadata` JSON DEFAULT NULL,
    `al_created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`idactivity`),
    INDEX `idx_user` (`al_user_id`),
    INDEX `idx_action` (`al_action`),
    INDEX `idx_entity` (`al_entity_type`, `al_entity_id`),
    INDEX `idx_created` (`al_created_at`),
    FOREIGN KEY (`al_user_id`) REFERENCES `user`(`iduser`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SERVICE PACKAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS `service_package` (
    `idpackage` INT(11) NOT NULL AUTO_INCREMENT,
    `sp_service_id` INT(11) NOT NULL,
    `sp_name` VARCHAR(200) NOT NULL,
    `sp_description` TEXT,
    `sp_min_pax` INT(11) DEFAULT 1,
    `sp_max_pax` INT(11) DEFAULT NULL,
    `sp_base_price` DECIMAL(10, 2) DEFAULT NULL,
    `sp_price_type` ENUM('fixed', 'calculated', 'per_person') NOT NULL DEFAULT 'calculated',
    `sp_discount_percent` DECIMAL(5, 2) DEFAULT 0.00,
    `sp_is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `sp_display_order` INT(11) DEFAULT 0,
    `sp_created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `sp_updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`idpackage`),
    INDEX `idx_service` (`sp_service_id`),
    FOREIGN KEY (`sp_service_id`) REFERENCES `service`(`idservice`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- PACKAGE CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS `package_category` (
    `idcategory` INT(11) NOT NULL AUTO_INCREMENT,
    `pc_package_id` INT(11) NOT NULL,
    `pc_name` VARCHAR(100) NOT NULL,
    `pc_description` TEXT,
    `pc_display_order` INT(11) DEFAULT 0,
    `pc_created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`idcategory`),
    INDEX `idx_package` (`pc_package_id`),
    FOREIGN KEY (`pc_package_id`) REFERENCES `service_package`(`idpackage`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- PACKAGE ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS `package_item` (
    `iditem` INT(11) NOT NULL AUTO_INCREMENT,
    `pi_category_id` INT(11) NOT NULL,
    `pi_name` VARCHAR(200) NOT NULL,
    `pi_description` TEXT,
    `pi_quantity` INT(11) NOT NULL DEFAULT 1,
    `pi_unit` VARCHAR(50) DEFAULT 'pc',
    `pi_unit_price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `pi_is_optional` TINYINT(1) NOT NULL DEFAULT 0,
    `pi_display_order` INT(11) DEFAULT 0,
    `pi_created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`iditem`),
    INDEX `idx_category` (`pi_category_id`),
    FOREIGN KEY (`pi_category_id`) REFERENCES `package_category`(`idcategory`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- BOOKING PACKAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS `booking_package` (
    `idbooking_package` INT(11) NOT NULL AUTO_INCREMENT,
    `bp_booking_id` INT(11) NOT NULL,
    `bp_package_id` INT(11) NOT NULL,
    `bp_pax_count` INT(11) NOT NULL DEFAULT 1,
    `bp_unit_price` DECIMAL(10, 2) NOT NULL,
    `bp_total_price` DECIMAL(10, 2) NOT NULL,
    `bp_removed_items` JSON DEFAULT NULL COMMENT 'Array of item IDs removed by user',
    `bp_snapshot` JSON DEFAULT NULL COMMENT 'Full package snapshot at booking time',
    `bp_notes` TEXT,
    PRIMARY KEY (`idbooking_package`),
    INDEX `idx_booking` (`bp_booking_id`),
    INDEX `idx_package` (`bp_package_id`),
    FOREIGN KEY (`bp_booking_id`) REFERENCES `booking`(`idbooking`) ON DELETE CASCADE,
    FOREIGN KEY (`bp_package_id`) REFERENCES `service_package`(`idpackage`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- EVENT TABLE (Phase 3: Event Workspace)
-- ============================================
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

-- ============================================
-- EVENT CHECKLIST TABLE (Phase 3)
-- ============================================
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

-- ============================================
-- EVENT TIMELINE TABLE (Phase 3)
-- ============================================
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

-- EVENT REMINDER TABLE (Phase 3.5)
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

-- EVENT COLLABORATOR TABLE (Phase 3.5)
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


