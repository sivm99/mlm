CREATE TYPE "public"."ar_enum" AS ENUM('activate', 'reactivate');--> statement-breakpoint
CREATE TABLE "ar_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"from_user_id" integer NOT NULL,
	"to_user_id" integer NOT NULL,
	"activity_type" "ar_enum" DEFAULT 'activate' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"investment" real DEFAULT 68 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ar_history" ADD CONSTRAINT "ar_history_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ar_history" ADD CONSTRAINT "ar_history_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;