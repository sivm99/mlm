CREATE TYPE "public"."ar_enum" AS ENUM('activate', 'reactivate');--> statement-breakpoint
CREATE TYPE "public"."userRole" AS ENUM('ADMIN', 'SUB_ADMIN', 'USER');--> statement-breakpoint
CREATE TYPE "public"."delivery_method" AS ENUM('self_collect', 'shipping');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('PENDING', 'PROCESSING', 'DELIVERED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."payoutStatus" AS ENUM('PENDING', 'PROCESSED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."otp_type" AS ENUM('email_verify', 'forget_password', 'profile_edit', 'fund_transfer', 'usdt_withdrawal', 'convert_income_wallet', 'add_wallet_address', 'ticket_raise_for_wallet');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('pending', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('income_payout', 'income_to_alpoints', 'alpoints_transfer', 'id_activation', 'weekly_payout_earned', 'matching_income_earned', 'fund_addition', 'admin_adjustment', 'increase_wallet_limit', 'order_partial_payment');--> statement-breakpoint
CREATE TYPE "public"."wallet_type" AS ENUM('alpoints', 'income_wallet', 'bv');--> statement-breakpoint
CREATE TYPE "public"."userPosition" AS ENUM('LEFT', 'RIGHT');--> statement-breakpoint
CREATE TYPE "public"."sale_reward_type" AS ENUM('payout', 'order', 'na');--> statement-breakpoint
CREATE TYPE "public"."sale_reward_status" AS ENUM('active', 'pending', 'closed', 'paused');--> statement-breakpoint
CREATE TABLE "addresses" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"mobile" text NOT NULL,
	"address1" text NOT NULL,
	"address2" text,
	"address3" text,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"zip" text NOT NULL,
	"country" text NOT NULL,
	"added_by" integer,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ar_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"from_user_id" integer NOT NULL,
	"to_user_id" integer NOT NULL,
	"activity_type" "ar_enum" DEFAULT 'activate' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"investment" real DEFAULT 68 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "config" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "config_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"mobile" text NOT NULL,
	"email" text NOT NULL,
	"country" text NOT NULL,
	"dial_code" text NOT NULL,
	"image" text,
	"is_active" boolean DEFAULT false NOT NULL,
	"is_blocked" boolean DEFAULT false NOT NULL,
	"is_complementory_id" boolean DEFAULT false NOT NULL,
	"password_hash" text NOT NULL,
	"role" "userRole" DEFAULT 'USER' NOT NULL,
	"permissions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" integer PRIMARY KEY NOT NULL,
	"alpoints" real DEFAULT 0 NOT NULL,
	"bv" real DEFAULT 0 NOT NULL,
	"income_wallet" real DEFAULT 0 NOT NULL,
	"income_wallet_limit" real DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"product_id" integer,
	"quantity" integer NOT NULL,
	"price" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"status" "order_status" DEFAULT 'PENDING',
	"delivery_address" integer,
	"delivery_method" "delivery_method" DEFAULT 'self_collect',
	"total_amount" real NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "packages" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"price" real NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"amount" real NOT NULL,
	"package_id" integer,
	"status" text NOT NULL,
	"transaction_id" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"sale_reward_id" integer,
	"matching_income_id" integer,
	"amount" real NOT NULL,
	"status" "payoutStatus" DEFAULT 'PENDING',
	"payout_date" timestamp NOT NULL,
	"admin_fee" real NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" real NOT NULL,
	"stock" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"slug" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"position" "userPosition" NOT NULL,
	"sponsor" integer NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"registered" integer DEFAULT 0 NOT NULL,
	"activated" integer DEFAULT 0 NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "otp" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "otp_type" NOT NULL,
	"user_id" integer,
	"code" text NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_valid" boolean DEFAULT true NOT NULL,
	"is_verified" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"level" text DEFAULT 'info' NOT NULL,
	"action" text NOT NULL,
	"user_id" integer,
	"transaction_id" integer,
	"message" text NOT NULL,
	"metadata" text,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "transaction_type" NOT NULL,
	"status" "transaction_status" DEFAULT 'pending' NOT NULL,
	"from_user_id" integer,
	"to_user_id" integer,
	"from_wallet_type" "wallet_type",
	"to_wallet_type" "wallet_type",
	"amount" real NOT NULL,
	"deduction_amount" real DEFAULT 0,
	"net_amount" real NOT NULL,
	"deduction_percentage" real DEFAULT 0,
	"description" text,
	"reference" text,
	"metadata" text,
	"otp_verified" boolean DEFAULT false,
	"requires_otp" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_trees" (
	"id" integer PRIMARY KEY NOT NULL,
	"left_user" integer,
	"right_user" integer,
	"parent_user" integer NOT NULL,
	"sponsor" integer NOT NULL,
	"position" "userPosition" DEFAULT 'LEFT' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sale_rewards" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "sale_reward_type" DEFAULT 'na' NOT NULL,
	"status" "sale_reward_status" DEFAULT 'pending' NOT NULL,
	"amount_paid" real DEFAULT 0 NOT NULL,
	"next_payment_date" timestamp (3) DEFAULT '2020-01-01T00:00:00.000Z' NOT NULL,
	"order_id" integer,
	"user_id" integer NOT NULL,
	"completed_at" timestamp (3),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_stats" (
	"id" integer PRIMARY KEY NOT NULL,
	"redeemed_count" integer DEFAULT 0 NOT NULL,
	"left_direct_users_count" integer DEFAULT 0 NOT NULL,
	"right_direct_users_count" integer DEFAULT 0 NOT NULL,
	"left_active_direct_users_count" integer DEFAULT 0 NOT NULL,
	"right_active_direct_users_count" integer DEFAULT 0 NOT NULL,
	"left_count" integer DEFAULT 0 NOT NULL,
	"right_count" integer DEFAULT 0 NOT NULL,
	"left_active_count" integer DEFAULT 0 NOT NULL,
	"right_active_count" integer DEFAULT 0 NOT NULL,
	"left_bv" integer DEFAULT 0 NOT NULL,
	"right_bv" integer DEFAULT 0 NOT NULL,
	"cf_left_bv" integer DEFAULT 0 NOT NULL,
	"cf_right_bv" integer DEFAULT 0 NOT NULL,
	"today_left_count" integer DEFAULT 0 NOT NULL,
	"today_right_count" integer DEFAULT 0 NOT NULL,
	"today_left_active_count" integer DEFAULT 0 NOT NULL,
	"today_right_active_count" integer DEFAULT 0 NOT NULL,
	"today_left_bv" integer DEFAULT 0 NOT NULL,
	"today_right_bv" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matching_income" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"amount_paid" real NOT NULL,
	"matching_bv" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE set null;--> statement-breakpoint
ALTER TABLE "ar_history" ADD CONSTRAINT "ar_history_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ar_history" ADD CONSTRAINT "ar_history_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_address_addresses_id_fk" FOREIGN KEY ("delivery_address") REFERENCES "public"."addresses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_sale_reward_id_sale_rewards_id_fk" FOREIGN KEY ("sale_reward_id") REFERENCES "public"."sale_rewards"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_matching_income_id_matching_income_id_fk" FOREIGN KEY ("matching_income_id") REFERENCES "public"."matching_income"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_sponsor_users_id_fk" FOREIGN KEY ("sponsor") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "otp" ADD CONSTRAINT "otp_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "logs" ADD CONSTRAINT "logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logs" ADD CONSTRAINT "logs_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_trees" ADD CONSTRAINT "user_trees_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_trees" ADD CONSTRAINT "user_trees_left_user_users_id_fk" FOREIGN KEY ("left_user") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_trees" ADD CONSTRAINT "user_trees_right_user_users_id_fk" FOREIGN KEY ("right_user") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_trees" ADD CONSTRAINT "user_trees_parent_user_users_id_fk" FOREIGN KEY ("parent_user") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_trees" ADD CONSTRAINT "user_trees_sponsor_users_id_fk" FOREIGN KEY ("sponsor") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sale_rewards" ADD CONSTRAINT "sale_rewards_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_rewards" ADD CONSTRAINT "sale_rewards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_stats" ADD CONSTRAINT "user_stats_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "matching_income" ADD CONSTRAINT "matching_income_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "idx_config_key" ON "config" USING btree ("key");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_orderItems_orderId" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_orderItems_productId" ON "order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_payments_userId" ON "payments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_payments_packageId" ON "payments" USING btree ("package_id");--> statement-breakpoint
CREATE INDEX "idx_payments_createdAt" ON "payments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_payouts_userId" ON "payouts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_payouts_status" ON "payouts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_payouts_createdAt" ON "payouts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_products_name" ON "products" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_user_trees_user" ON "user_trees" USING btree ("id");--> statement-breakpoint
CREATE INDEX "idx_user_trees_parent" ON "user_trees" USING btree ("parent_user");