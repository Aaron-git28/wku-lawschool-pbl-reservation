CREATE TABLE `reservations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`room_id` int NOT NULL,
	`reservation_date` timestamp NOT NULL,
	`start_time` int NOT NULL,
	`end_time` int NOT NULL,
	`student1_id` int NOT NULL,
	`student2_id` int NOT NULL,
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reservations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `students` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`class_number` varchar(20) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `students_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `study_rooms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`room_number` varchar(10) NOT NULL,
	`floor` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `study_rooms_id` PRIMARY KEY(`id`),
	CONSTRAINT `study_rooms_room_number_unique` UNIQUE(`room_number`)
);
--> statement-breakpoint
ALTER TABLE `reservations` ADD CONSTRAINT `reservations_room_id_study_rooms_id_fk` FOREIGN KEY (`room_id`) REFERENCES `study_rooms`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reservations` ADD CONSTRAINT `reservations_student1_id_students_id_fk` FOREIGN KEY (`student1_id`) REFERENCES `students`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reservations` ADD CONSTRAINT `reservations_student2_id_students_id_fk` FOREIGN KEY (`student2_id`) REFERENCES `students`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reservations` ADD CONSTRAINT `reservations_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;