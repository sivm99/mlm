import { treeTable, userStatsTable } from "@/db/schema";
import { Side, TreeStatsUpdate, UserId } from "@/types";
import { eq } from "drizzle-orm";
import db from "@/db";
import { sql } from "drizzle-orm";
import { databaseService } from "./database-service";

export default class TreeService {
  async insertIntoTree(
    userId: UserId,
    side: Side,
    sponsorId: UserId,
  ): Promise<void> {
    console.log(`the sponsor come ${sponsorId}\nthe side ${side}`);
    const parentId = await this.findTheParentUser(sponsorId, side);

    if (!parentId) {
      throw new Error("Could not find a suitable parent node for insertion");
    }

    // Get parent node details
    const parentNode = await databaseService.getTreeData(parentId);
    if (!parentNode) {
      throw new Error(`Parent node with ID ${parentId} not found`);
    }

    // First insert the new tree node
    await db.insert(treeTable).values({
      id: userId,
      sponsor: sponsorId,
      parentUser: parentId,
      position: side,
    });

    // Now update the parent node to point to this new node
    if (side === "left") {
      await db
        .update(treeTable)
        .set({ leftUser: userId })
        .where(eq(treeTable.id, parentId));
    } else {
      await db
        .update(treeTable)
        .set({ rightUser: userId })
        .where(eq(treeTable.id, parentId));
    }

    // Update the counts in the parent chain after insertion
    await this.syncParentChain(parentId, side, { updateCount: true });
  }

  async findTheParentUser(startId: UserId, side: Side): Promise<UserId | null> {
    // Start from the sponsor node
    let currentNode = await databaseService.getTreeData(startId);
    if (!currentNode) return null;

    // Check if we can directly add under the sponsor on the specified side
    if (side === "left" && currentNode.leftUser === null) {
      return currentNode.id;
    } else if (side === "right" && currentNode.rightUser === null) {
      return currentNode.id;
    }

    // We need to traverse down the tree on the specified side
    const queue: number[] = [];

    // Add the next node in the specified side to the queue
    if (side === "left" && currentNode.leftUser !== null) {
      queue.push(currentNode.leftUser);
    } else if (side === "right" && currentNode.rightUser !== null) {
      queue.push(currentNode.rightUser);
    } else {
      return null; // This shouldn't happen based on the checks above
    }

    // Perform BFS to find the first node with an available spot on the specified side
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      currentNode = await databaseService.getTreeData(nodeId);

      if (!currentNode) continue;

      if (side === "left" && currentNode.leftUser === null) {
        return currentNode.id;
      } else if (side === "right" && currentNode.rightUser === null) {
        return currentNode.id;
      }

      // Continue down the same side as specified
      if (side === "left" && currentNode.leftUser !== null) {
        queue.push(currentNode.leftUser);
      } else if (side === "right" && currentNode.rightUser !== null) {
        queue.push(currentNode.rightUser);
      }
    }

    return null; // Could not find a suitable parent
  }

  async getLeftTeam(userId: UserId, maxDepth: number = 5) {
    const userIds = await this.getTeam(userId, "left", maxDepth);
    return this.populateIds(userIds);
  }
  async getTeamIds(userId: UserId, side: Side) {
    return this.getTeam(userId, side, Infinity);
  }
  async getRightTeam(userId: UserId, maxDepth: number = 5) {
    const userIds = await this.getTeam(userId, "right", maxDepth);
    return this.populateIds(userIds);
  }

  async getFullTeam(userId: UserId, maxDepth: number = 4) {
    const leftTeam = await this.getLeftTeam(userId, maxDepth);
    const rightTeam = await this.getRightTeam(userId, maxDepth);
    return [...leftTeam, ...rightTeam];
  }

  private async getTeam(userId: UserId, side: Side, maxDepth: number) {
    const rootNode = await databaseService.getMinimalTreeData(userId);
    if (!rootNode) return [];

    const userIds: UserId[] = [];
    const queue: { nodeId: UserId; depth: number }[] = [];

    // Start with the appropriate side
    const startNodeId =
      side === "left" ? rootNode.leftUser : rootNode.rightUser;
    if (startNodeId !== null) {
      queue.push({ nodeId: startNodeId, depth: 1 });
    }

    // BFS traversal with depth tracking
    while (queue.length > 0) {
      const { nodeId, depth } = queue.shift()!;
      if (depth > maxDepth) continue;

      userIds.push(nodeId);

      const node = await databaseService.getMinimalTreeData(nodeId);
      if (!node) continue;

      if (node.leftUser !== null) {
        queue.push({ nodeId: node.leftUser, depth: depth + 1 });
      }

      if (node.rightUser !== null) {
        queue.push({ nodeId: node.rightUser, depth: depth + 1 });
      }
    }
    return userIds;
  }

  async populateIds(userIds: UserId[]) {
    const populatedData = await Promise.all(
      userIds.map((id) => databaseService.fetchTreeUserData(id)),
    );
    // we have verified it already that these exist so we just return
    // return populatedData.filter((d) => d !== null);
    return populatedData;
  }

  /**
   * Updates the count (leftCount or rightCount) for the entire parent chain
   * starting from the given parentId up to the admin node
   */
  async syncParentChain(
    parentId: UserId,
    side: Side,
    options: {
      updateCount?: boolean;
      updateActiveCount?: boolean;
      bv?: number;
    } = { updateCount: true },
  ): Promise<void> {
    let currentNodeId = parentId;

    try {
      // Start from the immediate parent and traverse up to the admin
      while (true) {
        const currentNode = await databaseService.getTreeData(currentNodeId);
        if (!currentNode) break;

        // Prepare update object based on side and options
        const updateSet: TreeStatsUpdate = {};

        if (side === "left") {
          if (options.updateCount) {
            updateSet.leftCount = sql`${userStatsTable.leftCount} + 1`;
            updateSet.todayLeftCount = sql`${userStatsTable.todayLeftCount} + 1`;
          }
          if (options.updateActiveCount) {
            updateSet.leftActiveCount = sql`${userStatsTable.leftActiveCount} + 1`;
            updateSet.todayLeftActiveCount = sql`${userStatsTable.todayLeftActiveCount} + 1`;
          }
          if (options.bv && options.bv > 0) {
            updateSet.leftBv = sql`${userStatsTable.leftBv} + ${options.bv}`;
            updateSet.todayLeftBv = sql`${userStatsTable.todayLeftBv} + ${options.bv}`;
          }
        } else {
          if (options.updateCount) {
            updateSet.rightCount = sql`${userStatsTable.rightCount} + 1`;
            updateSet.todayRightCount = sql`${userStatsTable.todayRightCount} + 1`;
          }
          if (options.updateActiveCount) {
            updateSet.rightActiveCount = sql`${userStatsTable.rightActiveCount} + 1`;
            updateSet.todayRightActiveCount = sql`${userStatsTable.todayRightActiveCount} + 1`;
          }
          if (options.bv && options.bv > 0) {
            updateSet.rightBv = sql`${userStatsTable.rightBv} + ${options.bv}`;
            updateSet.todayRightBv = sql`${userStatsTable.todayRightBv} + ${options.bv}`;
          }
        }

        // Update the user stats
        await db
          .update(userStatsTable)
          .set(updateSet)
          .where(eq(userStatsTable.id, currentNodeId));

        // If current node is the admin (parent is self), we're done
        if (currentNode.parentUser === currentNode.id) {
          break;
        }

        // Move up the tree to the parent node
        currentNodeId = currentNode.parentUser;
        side = currentNode.position;
      }

      console.log(`Synced parent chain starting from ${parentId}`);
    } catch (error) {
      console.error("Error syncing parent chain:", error);
      throw error;
    }
  }

  async verifyChildNode(childId: UserId, parentId: UserId) {
    const queue = [parentId];
    const visited = new Set();

    while (queue.length > 0) {
      const nodeId = queue.shift();
      if (!nodeId || visited.has(nodeId)) continue;

      if (nodeId === childId) return true;
      visited.add(nodeId);

      const nodeData = await databaseService.getMinimalTreeData(nodeId);
      if (nodeData) {
        if (nodeData.leftUser) queue.push(nodeData.leftUser);
        if (nodeData.rightUser) queue.push(nodeData.rightUser);
      }
    }
    return false;
  }
}

export const treeService = new TreeService();
