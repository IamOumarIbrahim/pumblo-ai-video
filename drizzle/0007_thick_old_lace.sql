CREATE TABLE `comment_reactions` (
	`comment_id` text NOT NULL,
	`user_email` text NOT NULL,
	`value` integer NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`comment_id`, `user_email`),
	FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_email`) REFERENCES `profiles`(`email`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `comment_reactions_comment_idx` ON `comment_reactions` (`comment_id`);--> statement-breakpoint
ALTER TABLE `profile_settings` ADD `show_chatgpt` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `profile_settings` ADD `show_discord` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `profile_settings` ADD `show_x` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `profile_settings` ADD `show_github` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `profile_settings` ADD `show_youtube` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `profile_settings` ADD `social_placement` text DEFAULT 'under-title' NOT NULL;