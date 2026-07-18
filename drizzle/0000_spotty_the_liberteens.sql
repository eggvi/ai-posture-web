CREATE TABLE `ai_posture_assessments` (
	`id` text PRIMARY KEY NOT NULL,
	`client_token` text NOT NULL,
	`asset_token` text NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`source` text,
	`language` text DEFAULT 'zh-CN' NOT NULL,
	`embedded` integer DEFAULT false NOT NULL,
	`profile_json` text NOT NULL,
	`upload_json` text DEFAULT '{}' NOT NULL,
	`report_json` text,
	`annotated_json` text,
	`engine_version` text,
	`error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`submitted_at` text,
	`processing_at` text,
	`completed_at` text
);
--> statement-breakpoint
CREATE INDEX `ai_posture_status_created_idx` ON `ai_posture_assessments` (`status`,`created_at`);