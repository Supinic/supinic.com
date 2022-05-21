INSERT IGNORE INTO `data`.`Config`
(`Name`,`Value`,`Type`,`Unit`,`Secret`,`Editable`,`Notes`)
VALUES
('ADMIN_USER_ID','REPLACE_ME','string',NULL,0,0,NULL),
('ADMIN_USER_NAME','REPLACE_ME','string',NULL,0,0,NULL),
('COMMAND_PREFIX','$','string',NULL,0,0,NULL),
('DEFAULT_USER_AGENT','REPLACE_ME','string',NULL,0,0,NULL),
('LOG_USER_CRON','*/10 * * * * *','string',NULL,0,0,'Determines how often newly detected users should be added in a batch.'),
('SOUNDCLOUD_CLIENT_ID','REPLACE_ME','string',NULL,1,1,NULL),
('TWITCH_APP_ACCESS_TOKEN','REPLACE_ME','string',NULL,1,0,NULL),
('TWITCH_CLIENT_ID','REPLACE_ME','string',NULL,1,0,NULL),
('VIDEO_TYPE_REPLACE_PREFIX','$','string',NULL,0,0,NULL),
('VIMEO_API_KEY','REPLACE_ME','string',NULL,1,0,NULL),
('WEBSITE_SESSION_SECRET','REPLACE_ME','string',NULL,1,0,NULL)
;
