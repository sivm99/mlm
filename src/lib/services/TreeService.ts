import { Side, TreeUser } from "@/types";
import db from "@/db";
import { usersTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import Node from "./Node";
import DatabaseService from "./DatabaseService";

const databaseService = new DatabaseService();
class BinaryTree {
  #tree: TreeUser[] = [];
  root: Node | null;

  constructor() {
    this.root = null;
  }

  /**
   * Inserts a user into the binary tree
   * @param userId - The ID of the user to insert
   * @param sponsorId - The ID of the sponsor user
   * @param side - Which side to insert the user (LEFT or RIGHT)
   */
  async insert(
    userId: TreeUser["id"],
    sponsorId: TreeUser["id"],
    side: Side,
  ): Promise<void> {
    try {
      if (!userId) throw new Error("User ID is required");
      if (!sponsorId) throw new Error("Sponsor ID is required");
      if (!side) throw new Error("Side (LEFT or RIGHT) is required");

      // Fetch user data for the new user
      const userData = await databaseService.fetchUserData(userId);
      // Users cannot sponsor themselves (except root admin)
      if (!userData) throw new Error("User was not found");
      if (userId === sponsorId && userData.role !== "ADMIN") {
        throw new Error("Users cannot sponsor themselves (except root admin)");
      }

      // We'll find the place to insert directly in the database rather than loading the whole tree
      await this.insertUserInDatabase(userData.id, sponsorId, side);

      // Update sponsor's associated user counts
      await this.updateSponsorCounts(sponsorId, userData.isActive);
    } catch (error) {
      console.error("Error inserting user into tree:", error);
      throw error;
    }
  }

  /**
   * Inserts a user directly in the database by finding the proper position
   * @param userId - The ID of the user to insert
   * @param sponsorId - The ID of the sponsor user
   * @param preferredSide - The preferred side to insert (LEFT or RIGHT)
   */
  private async insertUserInDatabase(
    userId: TreeUser["id"],
    sponsorId: TreeUser["id"],
    preferredSide: Side,
  ): Promise<void> {
    // Start with the sponsor node
    let currentNodeId = sponsorId;

    while (true) {
      // Get the current node's information
      const currentNode = await databaseService.fetchUserData(currentNodeId);
      if (!currentNode) throw new Error("User was not found");
      if (preferredSide === "LEFT") {
        if (!currentNode.leftUser) {
          // Found empty spot on left
          await db
            .update(usersTable)
            .set({ leftUser: userId })
            .where(eq(usersTable.id, currentNodeId));
          break;
        } else {
          // Continue down the left side
          currentNodeId = currentNode.leftUser;
        }
      } else {
        // RIGHT side
        if (!currentNode.rightUser) {
          // Found empty spot on right
          await db
            .update(usersTable)
            .set({ rightUser: userId })
            .where(eq(usersTable.id, currentNodeId));
          break;
        } else {
          // Continue down the right side
          currentNodeId = currentNode.rightUser;
        }
      }
    }
  }

  /**
   * Updates the associatedUsersCount and associatedActiveUsersCount for a sponsor
   * Note: Sponsors relationships won't change, only the tree structure changes
   */
  private async updateSponsorCounts(
    sponsorId: TreeUser["id"],
    isUserActive: boolean,
  ): Promise<void> {
    try {
      // Get sponsor's current data
      const sponsor = await databaseService.fetchUserData(sponsorId);
      if (!sponsor) throw new Error("Sponsor could not be found");
      // Update sponsor's counts
      const updates = {
        associatedUsersCount: sponsor.associatedUsersCount + 1,
        associatedActiveUsersCount: isUserActive
          ? sponsor.associatedActiveUsersCount + 1
          : sponsor.associatedActiveUsersCount,
        updatedAt: new Date(),
      };

      await db
        .update(usersTable)
        .set(updates)
        .where(eq(usersTable.id, sponsorId));
    } catch (error) {
      console.error(`Error updating counts for sponsor ${sponsorId}:`, error);
      throw error;
    }
  }

  /**
   * Builds the tree from database
   * @param rootUserId - The ID of the root user
   */
  async buildTreeFromDatabase(rootUserId: TreeUser["id"]): Promise<void> {
    try {
      const rootUserData = await databaseService.fetchUserData(rootUserId);
      if (!rootUserData) throw new Error("User not found");
      this.root = new Node(rootUserData);
      await this.populateChildren(this.root);
    } catch (error) {
      console.error("Error building tree from database:", error);
      throw error;
    }
  }

  /**
   * Recursively populates children nodes
   */
  async populateChildren(node: Node): Promise<void> {
    // Check and add left child
    if (node.value.leftUser) {
      const leftUserData = await databaseService.fetchUserData(
        node.value.leftUser,
      );
      if (!leftUserData) throw new Error("User not found");
      node.leftUser = new Node(leftUserData);
      await this.populateChildren(node.leftUser);
    }

    // Check and add right child
    if (node.value.rightUser) {
      const rightUserData = await databaseService.fetchUserData(
        node.value.rightUser,
      );
      if (!rightUserData) throw new Error("User not found");
      node.rightUser = new Node(rightUserData);
      await this.populateChildren(node.rightUser);
    }
  }

  /**
   * Performs an in-order traversal of the tree
   * @returns Array of tree users in order
   */
  async inOrderTraversal(node: Node | null = this.root): Promise<TreeUser[]> {
    this.#tree = [];
    await this.traverseInOrder(node);
    return this.#tree;
  }

  private async traverseInOrder(node: Node | null): Promise<void> {
    if (node) {
      await this.traverseInOrder(node.leftUser);
      this.#tree.push(node.value);
      await this.traverseInOrder(node.rightUser);
    }
  }

  /**
   * Performs a level-order traversal of the tree
   * @param rootNode - The starting node for traversal
   * @returns Array of tree users in level order
   */
  async levelOrderTraversal(
    rootNode: Node | null = this.root,
  ): Promise<TreeUser[]> {
    if (!rootNode) return [];

    const result: TreeUser[] = [];
    const queue: Node[] = [rootNode];

    while (queue.length > 0) {
      const currentNode = queue.shift();
      if (currentNode) {
        result.push(currentNode.value);

        if (currentNode.leftUser) {
          queue.push(currentNode.leftUser);
        }

        if (currentNode.rightUser) {
          queue.push(currentNode.rightUser);
        }
      }
    }

    return result;
  }

  /**
   * Helper method to collect all users in a subtree
   */
  async collectSubtreeUsers(node: Node, users: TreeUser[]): Promise<void> {
    if (!node) return;

    users.push(node.value);

    if (node.leftUser) {
      await this.collectSubtreeUsers(node.leftUser, users);
    }

    if (node.rightUser) {
      await this.collectSubtreeUsers(node.rightUser, users);
    }
  }

  /**
   * Get all users in the left branch of a specific node
   * @param rootNode - The starting node
   * @returns Array of tree users in the left branch
   */
  async getLeftBranch(rootNode: Node | null = this.root): Promise<TreeUser[]> {
    if (!rootNode || !rootNode.leftUser) return [];

    const result: TreeUser[] = [];
    await this.collectSubtreeUsers(rootNode.leftUser, result);
    return result;
  }

  /**
   * Get all users in the right branch of a specific node
   * @param rootNode - The starting node
   * @returns Array of tree users in the right branch
   */
  async getRightBranch(rootNode: Node | null = this.root): Promise<TreeUser[]> {
    if (!rootNode || !rootNode.rightUser) return [];

    const result: TreeUser[] = [];
    await this.collectSubtreeUsers(rootNode.rightUser, result);
    return result;
  }

  /**
   * Finds an available spot for a new user under a specified sponsor
   */
  async findAvailablePlacement(
    sponsorId: TreeUser["id"],
    preferredSide: Side,
  ): Promise<{
    parentId: TreeUser["id"];
    side: Side;
  }> {
    try {
      const sponsor = await databaseService.fetchUserData(sponsorId);
      if (!sponsor) throw new Error("Sponsor not found");
      if (preferredSide === "LEFT" && !sponsor.leftUser) {
        return { parentId: sponsorId, side: "LEFT" };
      }

      if (preferredSide === "RIGHT" && !sponsor.rightUser) {
        return { parentId: sponsorId, side: "RIGHT" };
      }

      return { parentId: sponsorId, side: preferredSide };
    } catch (error) {
      console.error("Error finding available placement:", error);
      throw error;
    }
  }
}

class TreeService extends BinaryTree {
  /**
   * Initialize the tree service with a root user
   */
  async initializeTree(rootUserId: TreeUser["id"]): Promise<void> {
    await this.buildTreeFromDatabase(rootUserId);
  }

  /**
   * Add a user to the tree under their sponsor
   * Note: The sponsor relationship is permanent, only the tree structure changes
   */
  async addUser(
    userId: TreeUser["id"],
    sponsorId: TreeUser["id"],
    side: Side,
  ): Promise<void> {
    await this.insert(userId, sponsorId, side);
  }

  /**
   * Get a user's downline (all users in their subtree)
   */
  async getUserDownline(userId: number): Promise<TreeUser[]> {
    // Build tree for this specific user as root
    const userData = await databaseService.fetchUserData(userId);
    if (!userData) throw new Error("User not found");
    const userNode = new Node(userData);
    await this.populateChildren(userNode);

    // Get all users in this subtree
    const downlineUsers: TreeUser[] = [];
    await this.collectSubtreeUsers(userNode, downlineUsers);

    return downlineUsers;
  }

  /**
   * Get users in left branch of a specific user
   */
  async getLeftBranchUsers(userId: number): Promise<TreeUser[]> {
    // Build tree for this specific user as root if needed
    const userData = await databaseService.fetchUserData(userId);
    if (!userData) throw new Error("User not found");
    const userNode = new Node(userData);
    await this.populateChildren(userNode);
    return this.getLeftBranch(userNode);
  }

  /**
   * Get users in right branch of a specific user
   */
  async getRightBranchUsers(userId: number): Promise<TreeUser[]> {
    // Build tree for this specific user as root if needed
    const userData = await databaseService.fetchUserData(userId);
    if (!userData) throw new Error("User not found");
    const userNode = new Node(userData);
    await this.populateChildren(userNode);
    return this.getRightBranch(userNode);
  }

  /**
   * Check if a user can be placed at the specified position
   */
  async validatePlacement(
    parentId: TreeUser["id"],
    side: Side,
  ): Promise<boolean> {
    try {
      const parent = await databaseService.fetchUserData(parentId);
      if (!parent) throw new Error("Parent not found");
      if (side === "LEFT" && parent.leftUser) {
        return false;
      }

      if (side === "RIGHT" && parent.rightUser) {
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error validating placement:", error);
      return false;
    }
  }
}

export default TreeService;
