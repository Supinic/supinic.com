CREATE TABLE IF NOT EXISTS `supinic.com`.`Link_Relay` (
	`Hash` VARCHAR(8) NOT NULL COLLATE 'utf8mb4_general_ci',
	`Link` TEXT NOT NULL COLLATE 'utf8mb4_general_ci',
	`Type` ENUM('Local','Global') NOT NULL DEFAULT 'Local' COLLATE 'utf8mb4_general_ci',
	`Created` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP(),
	PRIMARY KEY (`Hash`) USING BTREE
)
COLLATE='utf8mb4_general_ci'
ENGINE=InnoDB
;
