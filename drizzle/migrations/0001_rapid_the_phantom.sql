CREATE TYPE "public"."otp_type" AS ENUM('email_verify', 'profile_edit', 'fund_transfer', 'usdt_withdrawal', 'convert_income_wallet', 'add_wallet_address', 'ticket_raise_for_wallet');--> statement-breakpoint
CREATE TABLE "otp" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "otp_type" NOT NULL,
	"userId" text,
	"code" text NOT NULL,
	"email" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"isValid" boolean DEFAULT true NOT NULL,
	"isVerified" boolean DEFAULT false
);
--> statement-breakpoint
ALTER TABLE "otp" ADD CONSTRAINT "otp_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;