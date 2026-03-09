CREATE TABLE `dashboard_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`widgetOrder` text NOT NULL,
	`hiddenWidgets` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dashboard_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `dashboard_preferences_userId_unique` UNIQUE(`userId`)
);
