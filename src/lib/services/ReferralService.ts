import db from "@/db";
import { Side } from "@/types";
import { generateRandomAlphanumeric } from "@/lib/cr";
import { referralsTable } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import DatabaseService from "./DatabaseService";

export type ReferralStat = "impressions" | "registered" | "activated";

const databaseService = new DatabaseService();
export default class ReferralService {
  #frontendHost = process.env.FRONTEND_HOST || "http://localhost:5173";

  /**
   * Generate a new referral link
   * @param userId - The user who will use this referral link
   * @param sponsor - The user who is sponsoring this referral
   * @param side - The position side for the referral
   * @returns Generated slug and full referral URL
   */
  async generateReferralLink(userId: string, sponsor: string, side: Side) {
    let success = false;
    let slug = "";
    let attempts = 0;
    const maxAttempts = 5;

    while (!success && attempts < maxAttempts) {
      slug = generateRandomAlphanumeric(7);
      attempts++;

      try {
        await db.insert(referralsTable).values({
          slug,
          userId,
          sponsor,
          position: side,
        });
        success = true;
      } catch (error) {
        // If it's a unique constraint error, try again with a new slug
        if (
          error instanceof Error &&
          error.message.includes("unique constraint")
        ) {
          continue;
        }
        // If it's another error, throw it
        throw error;
      }
    }

    if (!success) {
      throw new Error(
        "Failed to generate unique referral link after multiple attempts",
      );
    }

    const referralUrl = `${this.#frontendHost}/ref/${slug}`;
    return { slug, referralUrl };
  }

  /**
   * Get a referral by its slug with user relationship loaded
   * @param slug - The referral slug to look up
   * @returns The referral record with user data or null if not found
   */
  async getReferralBySlug(slug: string) {
    // we can make it better using leftJoin avoided it
    // due to types not being infered
    const result = await db
      .select()
      .from(referralsTable)
      .where(
        and(eq(referralsTable.isDeleted, false), eq(referralsTable.slug, slug)),
      )
      .limit(1);

    if (!result[0]) {
      return null;
    }
    const referral = result[0];
    const user = await databaseService.fetchUserData(result[0].userId);
    return {
      ...referral,
      user,
    };
  }

  async updateReferralBySlug(slug: string, side: Side) {
    const result = await db
      .update(referralsTable)
      .set({ position: side })
      .where(eq(referralsTable.slug, slug))
      .returning({ slug: referralsTable.slug });
    return result.length > 0;
  }
  /**
   * Record a stat update for a referral
   * @param slug - The referral slug
   * @param statType - The type of stat to update ("impressions", "registered", or "activated")
   * @returns The updated referral or null if not found
   */
  async updateReferralStat(slug: string, statType: ReferralStat) {
    const referral = await this.getReferralBySlug(slug);

    if (!referral) {
      return null;
    }

    await db
      .update(referralsTable)
      .set({
        [statType]: referral[statType] + 1,
        updatedAt: new Date(),
      })
      .where(eq(referralsTable.slug, slug))
      .execute();

    return;
  }

  /**
   * Record an impression (link click) for a referral
   * @param slug - The referral slug
   * @returns The updated referral or null if not found
   */
  async recordImpression(slug: string) {
    return this.updateReferralStat(slug, "impressions");
  }

  /**
   * Record a successful registration using this referral
   * @param slug - The referral slug
   * @returns The updated referral or null if not found
   */
  async recordRegistration(slug: string) {
    return this.updateReferralStat(slug, "registered");
  }

  /**
   * Record a successful activation using this referral
   * @param slug - The referral slug
   * @returns The updated referral or null if not found
   */
  async recordActivation(slug: string) {
    return this.updateReferralStat(slug, "activated");
  }

  /**
   * Delete a referral by its slug
   * @param slug - The referral slug to delete
   * @returns Boolean indicating if the deletion was successful
   */
  async deleteReferral(slug: string) {
    const result = await db
      .update(referralsTable)
      .set({ isDeleted: true })
      .where(eq(referralsTable.slug, slug))
      .returning({ slug: referralsTable.slug });

    return result.length > 0;
  }

  /**
   * Get all referrals for a specific user
   * @param userId - The user ID to get referrals for
   * @returns Array of referrals
   */
  async getReferralsByUserId(userId: number) {
    return db
      .select()
      .from(referralsTable)
      .where(eq(referralsTable.userId, userId));
  }

  /**
   * Get all referrals where user is the sponsor
   * @param sponsorId - The sponsor ID to get referrals for
   * @returns Array of referrals
   */
  async getReferralsBySponsor(sponsorId: string) {
    return db
      .select()
      .from(referralsTable)
      .where(eq(referralsTable.sponsor, sponsorId));
  }
}
