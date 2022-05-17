CREATE TABLE IF NOT EXISTS `supinic.com`.`Log` (
	`ID` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
	`Route` ENUM('API','View') NOT NULL COLLATE 'utf8mb4_general_ci',
	`Method` VARCHAR(10) NOT NULL COLLATE 'utf8mb4_general_ci',
	`Endpoint` TEXT NOT NULL COLLATE 'utf8mb4_general_ci',
	`Source_IP` VARCHAR(100) NOT NULL COLLATE 'utf8mb4_general_ci',
	`User_Agent` TEXT NULL DEFAULT NULL COLLATE 'utf8mb4_general_ci',
	`Headers` LONGTEXT NULL DEFAULT NULL COLLATE 'utf8mb4_bin',
	`Query` LONGTEXT NULL DEFAULT NULL COLLATE 'utf8mb4_bin',
	`Body` LONGTEXT NULL DEFAULT NULL COLLATE 'utf8mb4_general_ci',
	`Timestamp` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
	PRIMARY KEY (`ID`) USING BTREE
)
COLLATE='utf8mb4_general_ci'
ENGINE=InnoDB
;
