import { treeTable } from "@/db/schema";
import { TreeUser, UserId } from "@/types";
import { eq } from "drizzle-orm";
import { databaseService } from "./DatabaseService";
import db from "@/db";

export default class TreeService {
  async insertIntoTree(
    userId: TreeUser["id"],
    side: TreeUser["position"],
    sponsorId: TreeUser["id"],
  ): Promise<void> {
    console.log(`the sponsor come ${sponsorId}\nthe side ${side}`);
    const parentId = await this.findTheParentUser(sponsorId, side);

    if (!parentId) {
      throw new Error("Could not find a suitable parent node for insertion");
    }

    // Get parent node details
    const parentNode = await databaseService.minimalTreeData(parentId);
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
    if (side === "LEFT") {
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
    await this.syncParentChainCount(parentId, side);
  }

  async findTheParentUser(
    startId: TreeUser["id"],
    side: TreeUser["position"],
  ): Promise<TreeUser["id"] | null> {
    // Start from the sponsor node
    let currentNode = await databaseService.minimalTreeData(startId);
    if (!currentNode) return null;

    // Check if we can directly add under the sponsor on the specified side
    if (side === "LEFT" && currentNode.leftUser === null) {
      return currentNode.id;
    } else if (side === "RIGHT" && currentNode.rightUser === null) {
      return currentNode.id;
    }

    // We need to traverse down the tree on the specified side
    const queue: number[] = [];

    // Add the next node in the specified side to the queue
    if (side === "LEFT" && currentNode.leftUser !== null) {
      queue.push(currentNode.leftUser);
    } else if (side === "RIGHT" && currentNode.rightUser !== null) {
      queue.push(currentNode.rightUser);
    } else {
      return null; // This shouldn't happen based on the checks above
    }

    // Perform BFS to find the first node with an available spot on the specified side
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      currentNode = await databaseService.minimalTreeData(nodeId);

      if (!currentNode) continue;

      if (side === "LEFT" && currentNode.leftUser === null) {
        return currentNode.id;
      } else if (side === "RIGHT" && currentNode.rightUser === null) {
        return currentNode.id;
      }

      // Continue down the same side as specified
      if (side === "LEFT" && currentNode.leftUser !== null) {
        queue.push(currentNode.leftUser);
      } else if (side === "RIGHT" && currentNode.rightUser !== null) {
        queue.push(currentNode.rightUser);
      }
    }

    return null; // Could not find a suitable parent
  }

  async getLeftTeam(userId: TreeUser["id"], maxDepth: number = 5) {
    const userIds = await this.getTeam(userId, "LEFT", maxDepth);
    return this.populateIds(userIds);
  }
  async getTeamIds(userId: UserId, side: TreeUser["position"]) {
    return this.getTeam(userId, side, Infinity);
  }
  async getRightTeam(userId: TreeUser["id"], maxDepth: number = 5) {
    const userIds = await this.getTeam(userId, "RIGHT", maxDepth);
    return this.populateIds(userIds);
  }

  async getFullTeam(userId: TreeUser["id"], maxDepth: number = 4) {
    const leftTeam = await this.getLeftTeam(userId, maxDepth);
    const rightTeam = await this.getRightTeam(userId, maxDepth);
    return [...leftTeam, ...rightTeam];
  }

  private async getTeam(
    userId: TreeUser["id"],
    side: TreeUser["position"],
    maxDepth: number,
  ) {
    const rootNode = await databaseService.minimalTreeData(userId);
    if (!rootNode) return [];

    const userIds: UserId[] = [];
    const queue: { nodeId: TreeUser["id"]; depth: number }[] = [];

    // Start with the appropriate side
    const startNodeId =
      side === "LEFT" ? rootNode.leftUser : rootNode.rightUser;
    if (startNodeId !== null) {
      queue.push({ nodeId: startNodeId, depth: 1 });
    }

    // BFS traversal with depth tracking
    while (queue.length > 0) {
      const { nodeId, depth } = queue.shift()!;
      if (depth > maxDepth) continue;

      userIds.push(nodeId);

      const node = await databaseService.minimalTreeData(nodeId);
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
    return populatedData.filter((d) => d !== null);
  }

  /**
   * Updates the count (leftCount or rightCount) for the entire parent chain
   * starting from the given parentId up to the admin node
   */
  async syncParentChainCount(
    parentId: TreeUser["id"],
    side: TreeUser["position"],
  ): Promise<void> {
    let currentNodeId = parentId;
    let updatedCount = 0;

    try {
      // Start from the immediate parent and traverse up to the admin
      while (true) {
        const currentNode =
          await databaseService.syncCountTreeData(currentNodeId);
        if (!currentNode) break;

        // Increment the appropriate count based on the side
        if (side === "LEFT") {
          updatedCount = currentNode.leftCount + 1;
          await db
            .update(treeTable)
            .set({ leftCount: updatedCount })
            .where(eq(treeTable.id, currentNodeId));
        } else {
          updatedCount = currentNode.rightCount + 1;
          await db
            .update(treeTable)
            .set({ rightCount: updatedCount })
            .where(eq(treeTable.id, currentNodeId));
        }

        // If current node is the admin (parent is self), we're done
        if (currentNode.parentUser === currentNode.id) {
          break;
        }

        // Move up the tree to the parent node
        currentNodeId = currentNode.parentUser;

        // Now we need to check which side of the parent this node is on
        const parentNode = await databaseService.minimalTreeData(currentNodeId);
        if (!parentNode) break;
        side = currentNode.position;
      }
      console.log(`Synced count for parent chain starting from ${parentId}`);
    } catch (error) {
      console.error("Error syncing parent chain count:", error);
      throw error;
    }
  }

  async syncBvAndActiveCount(
    parentId: TreeUser["id"],
    side: TreeUser["position"],
    bv: number = 50,
  ): Promise<void> {
    let currentNodeId = parentId;
    let updatedCount = 0;
    let updatedBv = 0;

    try {
      // Start from the immediate parent and traverse up to the admin
      while (true) {
        const currentNode =
          await databaseService.syncBvAndActiveCountTreeData(currentNodeId);
        if (!currentNode) break;

        // Increment the appropriate count based on the side
        if (side === "LEFT") {
          updatedCount = currentNode.leftActiveCount + 1;
          updatedBv = currentNode.leftBv + bv;
          await db
            .update(treeTable)
            .set({ leftActiveCount: updatedCount, leftBv: updatedBv })
            .where(eq(treeTable.id, currentNodeId));
        } else {
          updatedCount = currentNode.rightActiveCount + 1;
          updatedBv = currentNode.rightBv + bv;
          await db
            .update(treeTable)
            .set({ rightActiveCount: updatedCount, rightBv: updatedBv })
            .where(eq(treeTable.id, currentNodeId));
        }

        // If current node is the admin (parent is self), we're done
        if (currentNode.parentUser === currentNode.id) {
          break;
        }

        // Move up the tree to the parent node
        currentNodeId = currentNode.parentUser;

        // Now we need to check which side of the parent this node is on
        const parentNode = await databaseService.minimalTreeData(currentNodeId);
        if (!parentNode) break;
        side = currentNode.position;
      }
      console.log(`Synced count for parent chain starting from ${parentId}`);
    } catch (error) {
      console.error("Error syncing parent chain count:", error);
      throw error;
    }
  }

  async verifyChildNode(
    childId: TreeUser["id"],
    parentId: TreeUser["id"],
  ): Promise<boolean> {
    const parentNode = await databaseService.minimalTreeData(parentId);
    if (!parentNode) return false;

    if (parentNode.leftUser === childId || parentNode.rightUser === childId)
      return true;

    // Recursively check both children if they exist
    if (parentNode.leftUser) {
      const foundInLeft = await this.verifyChildNode(
        parentNode.leftUser,
        parentNode.id,
      );
      if (foundInLeft) return true;
    }

    if (parentNode.rightUser) {
      const foundInRight = await this.verifyChildNode(
        parentNode.rightUser,
        parentNode.id,
      );
      if (foundInRight) return true;
    }

    return false;
  }
}

export const treeService = new TreeService();
