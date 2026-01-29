ALTER TABLE `credit_cards` ADD `isShared` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `credit_cards` ADD `myPercentage` decimal(5,2) DEFAULT '100.00' NOT NULL;