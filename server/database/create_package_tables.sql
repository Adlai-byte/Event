-- Service Package Tables Migration
-- Run this to create the package system tables

-- SERVICE PACKAGES TABLE
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

-- PACKAGE CATEGORIES TABLE
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

-- PACKAGE ITEMS TABLE
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

-- BOOKING PACKAGES TABLE
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
