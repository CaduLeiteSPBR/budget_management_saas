CREATE TABLE `ai_learning` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`description` text NOT NULL,
	`nature` enum('Entrada','Saída') NOT NULL,
	`categoryId` int,
	`division` enum('Pessoal','Familiar','Investimento'),
	`type` enum('Essencial','Importante','Conforto','Investimento'),
	`frequency` int NOT NULL DEFAULT 1,
	`lastUsed` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_learning_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `budgets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`division` enum('Pessoal','Familiar','Investimento'),
	`type` enum('Essencial','Importante','Conforto','Investimento'),
	`targetPercentage` decimal(5,2) NOT NULL,
	`monthYear` varchar(7) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `budgets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`division` enum('Pessoal','Familiar','Investimento') NOT NULL,
	`type` enum('Essencial','Importante','Conforto','Investimento') NOT NULL,
	`color` varchar(20),
	`icon` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `installments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`description` text NOT NULL,
	`totalAmount` decimal(15,2) NOT NULL,
	`installmentAmount` decimal(15,2) NOT NULL,
	`totalInstallments` int NOT NULL,
	`categoryId` int,
	`division` enum('Pessoal','Familiar','Investimento'),
	`type` enum('Essencial','Importante','Conforto','Investimento'),
	`firstDueDate` bigint NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `installments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscription_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subscriptionId` int NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`effectiveDate` bigint NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `subscription_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`description` text NOT NULL,
	`currentAmount` decimal(15,2) NOT NULL,
	`categoryId` int,
	`division` enum('Pessoal','Familiar','Investimento'),
	`type` enum('Essencial','Importante','Conforto','Investimento'),
	`startDate` bigint NOT NULL,
	`dayOfMonth` int NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`description` text NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`nature` enum('Entrada','Saída') NOT NULL,
	`categoryId` int,
	`division` enum('Pessoal','Familiar','Investimento'),
	`type` enum('Essencial','Importante','Conforto','Investimento'),
	`date` bigint NOT NULL,
	`isRecurring` boolean NOT NULL DEFAULT false,
	`recurringId` int,
	`isInstallment` boolean NOT NULL DEFAULT false,
	`installmentId` int,
	`installmentNumber` int,
	`totalInstallments` int,
	`isPaid` boolean NOT NULL DEFAULT true,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
);
