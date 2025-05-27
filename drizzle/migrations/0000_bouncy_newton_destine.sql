CREATE TYPE "public"."userPosition" AS ENUM('LEFT', 'RIGHT');--> statement-breakpoint
CREATE TYPE "public"."userRole" AS ENUM('ADMIN', 'SUB_ADMIN', 'USER');--> statement-breakpoint
CREATE TYPE "public"."orderStatus" AS ENUM('PENDING', 'PROCESSING', 'DELIVERED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."payoutStatus" AS ENUM('PENDING', 'PROCESSED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."otp_type" AS ENUM('email_verify', 'forget_password', 'profile_edit', 'fund_transfer', 'usdt_withdrawal', 'convert_income_wallet', 'add_wallet_address', 'ticket_raise_for_wallet');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('pending', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('income_payout', 'income_to_alpoints', 'alpoints_transfer', 'id_activation', 'weekly_payout_earned', 'matching_income_earned', 'fund_addition', 'admin_adjustment');--> statement-breakpoint
CREATE TYPE "public"."wallet_type" AS ENUM('alpoints', 'income_wallet', 'bv');--> statement-breakpoint
CREATE TABLE "config" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"updatedAt" timestamp DEFAULT now(),
	CONSTRAINT "config_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"mobile" text NOT NULL,
	"email" text NOT NULL,
	"country" text NOT NULL,
	"dialCode" text NOT NULL,
	"image" text,
	"sponsor" integer NOT NULL,
	"leftUser" integer,
	"rightUser" integer,
	"parentUser" integer,
	"leftCount" integer DEFAULT 0 NOT NULL,
	"rightCount" integer DEFAULT 0 NOT NULL,
	"leftActiveCount" integer DEFAULT 0 NOT NULL,
	"rightActiveCount" integer DEFAULT 0 NOT NULL,
	"leftBv" real DEFAULT 0 NOT NULL,
	"rightBv" real DEFAULT 0 NOT NULL,
	"isActive" boolean DEFAULT false NOT NULL,
	"isBlocked" boolean DEFAULT false NOT NULL,
	"redeemedCount" integer DEFAULT 0 NOT NULL,
	"directUsersCount" integer DEFAULT 0 NOT NULL,
	"activeDirectUsersCount" integer DEFAULT 0 NOT NULL,
	"passwordHash" text,
	"role" "userRole" DEFAULT 'USER' NOT NULL,
	"permissions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" serial PRIMARY KEY NOT NULL,
	"alpoints" real DEFAULT 0 NOT NULL,
	"bv" real DEFAULT 0 NOT NULL,
	"incomeWallet" real DEFAULT 0 NOT NULL,
	"userId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orderItems" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" integer NOT NULL,
	"productId" integer NOT NULL,
	"quantity" integer NOT NULL,
	"price" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"status" "orderStatus" DEFAULT 'PENDING',
	"deliveryAddress" text,
	"totalAmount" real NOT NULL,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "packages" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"price" real NOT NULL,
	"description" text,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"amount" real NOT NULL,
	"packageId" integer,
	"status" text NOT NULL,
	"transactionId" text,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"amount" real NOT NULL,
	"status" "payoutStatus" DEFAULT 'PENDING',
	"payoutDate" timestamp NOT NULL,
	"adminFee" real NOT NULL,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" real NOT NULL,
	"stock" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"slug" text PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"position" "userPosition" NOT NULL,
	"sponsor" integer NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"registered" integer DEFAULT 0 NOT NULL,
	"activated" integer DEFAULT 0 NOT NULL,
	"isDeleted" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "otp" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "otp_type" NOT NULL,
	"userId" integer,
	"code" text NOT NULL,
	"email" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"isValid" boolean DEFAULT true NOT NULL,
	"isVerified" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"level" text DEFAULT 'info' NOT NULL,
	"action" text NOT NULL,
	"userId" integer,
	"transactionId" integer,
	"message" text NOT NULL,
	"metadata" text,
	"ipAddress" text,
	"userAgent" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "transaction_type" NOT NULL,
	"status" "transaction_status" DEFAULT 'pending' NOT NULL,
	"fromUserId" integer,
	"toUserId" integer,
	"fromWalletType" "wallet_type",
	"toWalletType" "wallet_type",
	"amount" real NOT NULL,
	"deductionAmount" real DEFAULT 0,
	"netAmount" real NOT NULL,
	"deductionPercentage" real DEFAULT 0,
	"description" text,
	"reference" text,
	"metadata" text,
	"otpVerified" boolean DEFAULT false,
	"requiresOtp" boolean DEFAULT false,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_sponsor_users_id_fk" FOREIGN KEY ("sponsor") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_leftUser_users_id_fk" FOREIGN KEY ("leftUser") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_rightUser_users_id_fk" FOREIGN KEY ("rightUser") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_parentUser_users_id_fk" FOREIGN KEY ("parentUser") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "orderItems" ADD CONSTRAINT "orderItems_orderId_orders_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "orderItems" ADD CONSTRAINT "orderItems_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_packageId_packages_id_fk" FOREIGN KEY ("packageId") REFERENCES "public"."packages"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_sponsor_users_id_fk" FOREIGN KEY ("sponsor") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "otp" ADD CONSTRAINT "otp_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "logs" ADD CONSTRAINT "logs_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logs" ADD CONSTRAINT "logs_transactionId_transactions_id_fk" FOREIGN KEY ("transactionId") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_fromUserId_users_id_fk" FOREIGN KEY ("fromUserId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_toUserId_users_id_fk" FOREIGN KEY ("toUserId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_config_key" ON "config" USING btree ("key");--> statement-breakpoint
CREATE INDEX "idx_users_sponsor" ON "users" USING btree ("sponsor");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_orderItems_orderId" ON "orderItems" USING btree ("orderId");--> statement-breakpoint
CREATE INDEX "idx_orderItems_productId" ON "orderItems" USING btree ("productId");--> statement-breakpoint
CREATE INDEX "idx_payments_userId" ON "payments" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "idx_payments_packageId" ON "payments" USING btree ("packageId");--> statement-breakpoint
CREATE INDEX "idx_payments_createdAt" ON "payments" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "idx_payouts_userId" ON "payouts" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "idx_payouts_status" ON "payouts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_payouts_createdAt" ON "payouts" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "idx_products_name" ON "products" USING btree ("name");