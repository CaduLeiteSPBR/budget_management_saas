CREATE TABLE `credit_cards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`brand` varchar(50) NOT NULL,
	`limit` decimal(15,2) NOT NULL,
	`closingDay` int NOT NULL,
	`dueDay` int NOT NULL,
	`recurringAmount` decimal(15,2) NOT NULL DEFAULT '0.00',
	`expectedAmount` decimal(15,2) NOT NULL DEFAULT '0.00',
	`currentTotalAmount` decimal(15,2) NOT NULL DEFAULT '0.00',
	`division` enum('Pessoal','Familiar','Investimento') NOT NULL DEFAULT 'Pessoal',
	`type` enum('Essencial','Importante','Conforto','Investimento') NOT NULL DEFAULT 'Essencial',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `credit_cards_id` PRIMARY KEY(`id`)
);
