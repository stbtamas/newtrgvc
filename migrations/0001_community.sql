CREATE TABLE `entries` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`owner` text NOT NULL,
	`target` text DEFAULT '' NOT NULL,
	`data` text NOT NULL,
	`created_at` integer NOT NULL,
	`publish_at` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	FOREIGN KEY (`owner`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `entry_kind_date` ON `entries` (`kind`,`publish_at`);--> statement-breakpoint
CREATE INDEX `entry_owner_kind` ON `entries` (`owner`,`kind`);--> statement-breakpoint
CREATE INDEX `entry_target` ON `entries` (`target`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`name` text NOT NULL,
	`bio` text DEFAULT '' NOT NULL,
	`region` text DEFAULT '' NOT NULL,
	`avatar` text,
	`preferences` text DEFAULT '{}' NOT NULL,
	`accepted_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profile_username` ON `profiles` (`username`);