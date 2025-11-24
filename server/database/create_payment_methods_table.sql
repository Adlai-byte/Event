-- Create payment_methods table if it doesn't exist
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





