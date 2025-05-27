import db from "@/db";
import { usersTable } from "@/db/schema";
import {
  ActivateUserData,
  InsertUserJobData,
  JobType,
  QueueJob,
  Side,
  UpdateCountData,
  UpdateCountsJobData,
  UpdateParentChainJobData,
  User,
} from "@/types";
import { eq } from "drizzle-orm";
import { EventEmitter } from "events";
import { databaseService } from "./DatabaseService";

export class QueueService extends EventEmitter {
  private jobs: Map<string, QueueJob> = new Map();
  private processing = false;
  // private readonly concurrency = 1; // Sequential processing
  private readonly retryDelay = 1000; // 1 second
  private readonly maxRetryDelay = 30000; // 30 seconds

  constructor() {
    super();
    this.startProcessing();
  }

  /**
   * Add a job to the queue
   */
  async addJob(
    type: JobType,
    data: unknown,
    options: {
      priority: number;
      maxAttempts: number;
    } = { priority: 0, maxAttempts: 3 },
  ): Promise<string> {
    const job: QueueJob = {
      id: crypto.randomUUID(),
      type,
      data,
      priority: options.priority || 0,
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      createdAt: new Date(),
      status: "pending",
    };

    this.jobs.set(job.id, job);
    this.emit("jobAdded", job);

    return job.id;
  }

  /**
   * Get next job to process (highest priority first, then FIFO)
   */
  private getNextJob(): QueueJob | null {
    const pendingJobs = Array.from(this.jobs.values())
      .filter((job) => job.status === "pending")
      .sort((a, b) => {
        // Higher priority first, then earlier created first
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

    return pendingJobs[0] || null;
  }

  /**
   * Start processing jobs sequentially
   */
  private async startProcessing(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.processing) {
      const job = this.getNextJob();

      if (!job) {
        // No jobs to process, wait a bit
        await this.sleep(100);
        continue;
      }

      await this.processJob(job);
    }
  }

  /**
   * Process a single job
   */
  private async processJob(job: QueueJob): Promise<void> {
    try {
      // Update job status
      job.status = "processing";
      job.processedAt = new Date();
      job.attempts++;

      this.emit("jobProcessing", job);

      // Process the job based on its type
      await this.executeJob(job);

      // Mark as completed
      job.status = "completed";
      job.completedAt = new Date();

      this.emit("jobCompleted", job);

      // Clean up completed job after some time
      setTimeout(() => {
        this.jobs.delete(job.id);
      }, 60000); // Keep for 1 minute for debugging
    } catch (error) {
      console.error(`Job ${job.id} failed:`, error);

      job.error = error instanceof Error ? error.message : String(error);

      if (job.attempts >= job.maxAttempts) {
        job.status = "failed";
        job.failedAt = new Date();
        this.emit("jobFailed", job);
      } else {
        job.status = "pending"; // Will be retried

        // Exponential backoff
        const delay = Math.min(
          this.retryDelay * Math.pow(2, job.attempts - 1),
          this.maxRetryDelay,
        );

        setTimeout(() => {
          this.emit("jobRetrying", job);
        }, delay);
      }
    }
  }

  /**
   * Execute job based on its type
   */
  private async executeJob(job: QueueJob): Promise<void> {
    switch (job.type) {
      case "INSERT_USER_TO_TREE":
        await this.handleInsertUserToTree(job.data as InsertUserJobData);
        break;

      case "UPDATE_TREE_COUNTS":
        await this.handleUpdateTreeCounts(job.data as UpdateCountsJobData);
        break;

      case "UPDATE_PARENT_CHAIN":
        await this.handleUpdateParentChain(
          job.data as UpdateParentChainJobData,
        );
        break;

      case "ACTIVATE_USER":
        await this.handleActivateUser(job.data as ActivateUserData);
        break;

      case "DEACTIVATE_USER":
        await this.handleDeactivateUser(job.data as ActivateUserData);
        break;

      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }
  }

  /**
   * Handle inserting user to tree
   */
  private async handleInsertUserToTree(data: InsertUserJobData): Promise<void> {
    const { userId, sponsorId, preferredSide } = data;

    // Find the insertion point
    let currentNodeId = sponsorId;
    let parentId = null;

    while (true) {
      const currentNode = await databaseService.fetchUserData(currentNodeId);
      if (!currentNode) throw new Error(`User ${currentNodeId} not found`);

      const targetField = preferredSide === "LEFT" ? "leftUser" : "rightUser";

      if (!currentNode[targetField]) {
        // Found empty spot
        await db
          .update(usersTable)
          .set({ [targetField]: userId })
          .where(eq(usersTable.id, currentNodeId));

        parentId = currentNodeId;
        break;
      } else {
        // Continue down the tree
        currentNodeId = currentNode[targetField];
      }
    }

    // Update the inserted user's parentUser field
    await db
      .update(usersTable)
      .set({ parentUser: parentId })
      .where(eq(usersTable.id, userId));
  }

  /**
   * Handle updating tree counts up the chain
   */
  private async handleUpdateTreeCounts(
    data: UpdateCountsJobData,
  ): Promise<void> {
    const { userId, isActive, operation } = data;

    const user = await databaseService.fetchUserData(userId);
    if (!user || !user.parentUser) return;

    // Update counts up the parent chain
    let currentParentId = user.parentUser;

    while (currentParentId) {
      const parent = await databaseService.fetchUserData(currentParentId);
      if (!parent) break;

      // Determine which side this user is on
      const isLeftChild =
        parent.leftUser === userId ||
        (await this.isUserInLeftSubtree(parent.leftUser, userId));

      const increment = operation === "INCREMENT" ? 1 : -1;

      const updates: UpdateCountData = {};

      if (isLeftChild) {
        updates.leftCount = parent.leftCount + increment;
        if (isActive) {
          updates.leftActiveCount = parent.leftActiveCount + increment;
        }
      } else {
        updates.rightCount = parent.rightCount + increment;
        if (isActive) {
          updates.rightActiveCount = parent.rightActiveCount + increment;
        }
      }

      await db
        .update(usersTable)
        .set(updates)
        .where(eq(usersTable.id, currentParentId));

      // Move up the chain
      currentParentId = parent.parentUser || 0; // here 0 is for edge case and we will be throwing error
      if (currentParentId === 0) return;

      // Stop if we reach the root (admin whose parent is themselves)
      if (parent.parentUser === currentParentId) break;
    }
  }

  /**
   * Handle updating parent chain with specific changes
   */
  private async handleUpdateParentChain(
    data: UpdateParentChainJobData,
  ): Promise<void> {
    const { userId, changes } = data;

    const user = await databaseService.fetchUserData(userId);
    if (!user || !user.parentUser) return;

    let currentParentId = user.parentUser;

    while (currentParentId) {
      const parent = await databaseService.fetchUserData(currentParentId);
      if (!parent) break;

      await db
        .update(usersTable)
        .set(changes)
        .where(eq(usersTable.id, currentParentId));

      currentParentId = parent.parentUser || 0; // here 0 is for edge case and we will be throwing error
      if (currentParentId === 0) return;
      // Stop if we reach the root
      if (parent.parentUser === currentParentId) break;
    }
  }

  /**
   * Handle user activation
   */
  private async handleActivateUser(data: ActivateUserData): Promise<void> {
    const { userId } = data;

    await db
      .update(usersTable)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(usersTable.id, userId));

    // Queue job to update parent counts
    await this.addJob(
      "UPDATE_TREE_COUNTS",
      {
        userId,
        isActive: true,
        operation: "INCREMENT",
      },
      { priority: 1, maxAttempts: 3 },
    );
  }

  /**
   * Handle user deactivation
   */
  private async handleDeactivateUser(data: ActivateUserData): Promise<void> {
    const { userId } = data;

    await db
      .update(usersTable)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(usersTable.id, userId));

    // Queue job to update parent counts
    await this.addJob(
      "UPDATE_TREE_COUNTS",
      {
        userId,
        isActive: false,
        operation: "DECREMENT",
      },
      { priority: 1, maxAttempts: 3 },
    );
  }

  /**
   * Check if a user is in the left subtree of a given node
   */
  private async isUserInLeftSubtree(
    rootId: number | null,
    targetUserId: number,
  ): Promise<boolean> {
    if (!rootId) return false;

    const queue = [rootId];
    const visited = new Set<number>();

    while (queue.length > 0) {
      const currentId = queue.shift()!;

      if (visited.has(currentId)) continue;
      visited.add(currentId);

      if (currentId === targetUserId) return true;

      const user = await databaseService.fetchUserData(currentId);
      if (user) {
        if (user.leftUser) queue.push(user.leftUser);
        if (user.rightUser) queue.push(user.rightUser);
      }
    }

    return false;
  }

  /**
   * Utility method for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): QueueJob | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get queue statistics
   */
  getQueueStats() {
    const jobs = Array.from(this.jobs.values());
    return {
      total: jobs.length,
      pending: jobs.filter((j) => j.status === "pending").length,
      processing: jobs.filter((j) => j.status === "processing").length,
      completed: jobs.filter((j) => j.status === "completed").length,
      failed: jobs.filter((j) => j.status === "failed").length,
    };
  }

  /**
   * Stop processing (for graceful shutdown)
   */
  stop(): void {
    this.processing = false;
  }
}

// Create singleton instance
export const queueService = new QueueService();

// services/TreeQueueService.ts
/**
 * Service that handles binary tree operations using the queue system
 */
export class TreeQueueService {
  private queueService: QueueService;

  constructor(queueService: QueueService) {
    this.queueService = queueService;
  }

  /**
   * Add user to tree through queue
   */
  async addUserToTree(
    userId: User["id"],
    sponsorId: User["id"],
    preferredSide: Side,
  ): Promise<string> {
    return await this.queueService.addJob(
      "INSERT_USER_TO_TREE",
      { userId, sponsorId, preferredSide },
      { priority: 10, maxAttempts: 3 }, // High priority for tree structure
    );
  }

  /**
   * Update user counts through queue
   */
  async updateUserCounts(
    userId: User["id"],
    isActive: boolean,
    operation: "INCREMENT" | "DECREMENT",
  ): Promise<string> {
    return await this.queueService.addJob(
      "UPDATE_TREE_COUNTS",
      { userId, isActive, operation },
      { priority: 5, maxAttempts: 3 },
    );
  }

  /**
   * Activate user through queue
   */
  async activateUser(userId: User["id"]): Promise<string> {
    return await this.queueService.addJob(
      "ACTIVATE_USER",
      { userId },
      { priority: 8, maxAttempts: 3 },
    );
  }

  /**
   * Deactivate user through queue
   */
  async deactivateUser(userId: User["id"]): Promise<string> {
    return await this.queueService.addJob(
      "DEACTIVATE_USER",
      { userId },
      { priority: 8, maxAttempts: 3 },
    );
  }

  /**
   * Process user registration with all required tree operations
   */
  async processUserRegistration(
    userId: User["id"],
    sponsorId: User["id"],
    preferredSide: Side,
    isActive: boolean = false,
  ): Promise<{ jobIds: string[] }> {
    const jobIds: string[] = [];

    // 1. Add user to tree structure -> it works ✅
    const insertJobId = await this.addUserToTree(
      userId,
      sponsorId,
      preferredSide,
    );
    jobIds.push(insertJobId);

    // 2. Update sponsor's direct user count -> it works ✅
    const sponsorUpdateJobId = await this.queueService.addJob(
      "UPDATE_PARENT_CHAIN",
      {
        userId: sponsorId,
        changes: {
          directUsersCount: 1, // This will be handled by a database increment
        },
      },
      { priority: 7, maxAttempts: 3 },
    );
    jobIds.push(sponsorUpdateJobId);

    // 3.Update the counts counts
    const activeCountJobId = await this.updateUserCounts(
      userId,
      isActive,
      "INCREMENT",
    );
    jobIds.push(activeCountJobId);

    return { jobIds };
  }
}

// Create singleton instance
export const treeQueueService = new TreeQueueService(queueService);
