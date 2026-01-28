CREATE TABLE `folders` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`parent_id` text,
	`order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `folders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_folders_user` ON `folders` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_folders_parent` ON `folders` (`parent_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_folders_user_slug` ON `folders` (`user_id`,`slug`);--> statement-breakpoint
CREATE TABLE `pages` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`indent` integer DEFAULT 0 NOT NULL,
	`daily_date` text,
	`folder_id` text,
	`parent_page_id` text,
	`order` integer DEFAULT 0 NOT NULL,
	`is_task` integer DEFAULT false NOT NULL,
	`task_completed` integer DEFAULT false NOT NULL,
	`task_completed_at` integer,
	`task_date` text,
	`task_priority` text,
	`starred` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`folder_id`) REFERENCES `folders`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`parent_page_id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_pages_user_daily` ON `pages` (`user_id`,`daily_date`);--> statement-breakpoint
CREATE INDEX `idx_pages_user_folder` ON `pages` (`user_id`,`folder_id`);--> statement-breakpoint
CREATE INDEX `idx_pages_parent` ON `pages` (`parent_page_id`);--> statement-breakpoint
CREATE INDEX `idx_pages_tasks` ON `pages` (`user_id`,`is_task`,`task_date`);--> statement-breakpoint
CREATE INDEX `idx_pages_starred` ON `pages` (`user_id`,`starred`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_sessions_user` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_sessions_expires` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);