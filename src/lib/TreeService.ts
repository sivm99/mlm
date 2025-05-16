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
  async insert(userId: string, sponsorId: string, side: Side): Promise<void> {
    try {
      if (!userId) throw new Error("User ID is required");
      if (!sponsorId) throw new Error("Sponsor ID is required");
      if (!side) throw new Error("Side (LEFT or RIGHT) is required");

      const userData = await databaseService.fetchUserData(userId);
      if (userId === sponsorId && userData.role !== "ADMIN") {
        throw new Error("Users cannot sponsor themselves (except root admin)");
      }
      const newNode = new Node(userData);

      if (!this.root) {
        const rootUser = await db
          .select({ id: usersTable.id })
          .from(usersTable)
          .where(eq(usersTable.role, "ADMIN"))
          .limit(1);

        if (!rootUser[0]) throw new Error("Admin user not found");
        await this.buildTreeFromDatabase(rootUser[0].id);
      }

      const sponsorNode = await this.findNodeById(this.root, sponsorId);
      if (!sponsorNode) {
        throw new Error(`Sponsor with ID ${sponsorId} not found in the tree`);
      }

      // Find a place to insert the node by traversing down the specified side
      await this.insertNodeOnSide(sponsorNode, newNode, side);

      // Update sponsor's associated user counts
      await this.updateSponsorCounts(sponsorId, userData.isActive);
    } catch (error) {
      console.error("Error inserting user into tree:", error);
      throw error;
    }
  }

  /**
   * Helper method to insert a node on a specific side, traversing down if needed
   */
  private async insertNodeOnSide(
    parentNode: Node,
    newNode: Node,
    side: Side,
  ): Promise<void> {
    let currentNode = parentNode;
    let placed = false;

    // Try to insert directly if the spot is available
    if (side === "LEFT" && !currentNode.leftUser) {
      currentNode.leftUser = newNode;
      await db
        .update(usersTable)
        .set({ leftUser: newNode.value.id })
        .where(eq(usersTable.id, currentNode.value.id));
      placed = true;
    } else if (side === "RIGHT" && !currentNode.rightUser) {
      currentNode.rightUser = newNode;
      await db
        .update(usersTable)
        .set({ rightUser: newNode.value.id })
        .where(eq(usersTable.id, currentNode.value.id));
      placed = true;
    } else {
      // Spot not available, traverse down the specified side
      let nextNode =
        side === "LEFT" ? currentNode.leftUser : currentNode.rightUser;

      while (nextNode && !placed) {
        currentNode = nextNode;

        if (side === "LEFT" && !currentNode.leftUser) {
          currentNode.leftUser = newNode;
          await db
            .update(usersTable)
            .set({ leftUser: newNode.value.id })
            .where(eq(usersTable.id, currentNode.value.id));
          placed = true;
        } else if (side === "RIGHT" && !currentNode.rightUser) {
          currentNode.rightUser = newNode;
          await db
            .update(usersTable)
            .set({ rightUser: newNode.value.id })
            .where(eq(usersTable.id, currentNode.value.id));
          placed = true;
        } else {
          // Continue traversing down the specified side
          nextNode =
            side === "LEFT" ? currentNode.leftUser : currentNode.rightUser;
        }
      }
    }

    if (!placed) {
      throw new Error(
        `Could not find an available ${side} position in the tree`,
      );
    }
  }

  /**
   * Finds a node in the tree by user ID
   */
  async findNodeById(node: Node | null, userId: string): Promise<Node | null> {
    if (!node) return null;

    if (node.value.id === userId) {
      return node;
    }

    // Search left subtree
    const leftResult = await this.findNodeById(node.leftUser, userId);
    if (leftResult) return leftResult;

    // Search right subtree
    return this.findNodeById(node.rightUser, userId);
  }

  /**
   * Updates the associatedUsersCount and associatedActiveUsersCount for a sponsor
   * Note: Sponsors relationships won't change, only the tree structure changes
   */
  private async updateSponsorCounts(
    sponsorId: string,
    isUserActive: boolean,
  ): Promise<void> {
    try {
      // Get sponsor's current data
      const sponsor = await databaseService.fetchUserData(sponsorId);

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

      // Also update parent sponsors recursively (except for admin who sponsors themselves)
      // if (sponsor.sponsor !== sponsorId) {
      //   await this.updateSponsorCounts(sponsor.sponsor, isUserActive);
      // }
    } catch (error) {
      console.error(`Error updating counts for sponsor ${sponsorId}:`, error);
      throw error;
    }
  }

  /**
   * Builds the tree from database
   * @param rootUserId - The ID of the root user
   */
  async buildTreeFromDatabase(rootUserId: string): Promise<void> {
    try {
      const rootUserData = await databaseService.fetchUserData(rootUserId);
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
      node.leftUser = new Node(leftUserData);
      await this.populateChildren(node.leftUser);
    }

    // Check and add right child
    if (node.value.rightUser) {
      const rightUserData = await databaseService.fetchUserData(
        node.value.rightUser,
      );
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
    if (!rootNode) return [];

    const result: TreeUser[] = [];
    let currentNode = rootNode.leftUser;

    while (currentNode) {
      result.push(currentNode.value);
      await this.collectSubtreeUsers(currentNode, result);
      currentNode = null; // We only traverse one level deep from the root's left child
    }

    return result;
  }

  /**
   * Get all users in the right branch of a specific node
   * @param rootNode - The starting node
   * @returns Array of tree users in the right branch
   */
  async getRightBranch(rootNode: Node | null = this.root): Promise<TreeUser[]> {
    if (!rootNode) return [];

    const result: TreeUser[] = [];
    let currentNode = rootNode.rightUser;

    while (currentNode) {
      result.push(currentNode.value);
      await this.collectSubtreeUsers(currentNode, result);
      currentNode = null; // We only traverse one level deep from the root's right child
    }

    return result;
  }

  /**
   * Finds an available spot for a new user under a specified sponsor
   */
  async findAvailablePlacement(
    sponsorId: string,
    preferredSide: Side,
  ): Promise<{
    parentId: string;
    side: Side;
  }> {
    try {
      const sponsor = await databaseService.fetchUserData(sponsorId);

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
  async initializeTree(rootUserId: string): Promise<void> {
    await this.buildTreeFromDatabase(rootUserId);
  }

  /**
   * Add a user to the tree under their sponsor
   * Note: The sponsor relationship is permanent, only the tree structure changes
   */
  async addUser(userId: string, sponsorId: string, side: Side): Promise<void> {
    await this.insert(userId, sponsorId, side);
  }

  /**
   * Get all users in the tree in order (only for admin)
   * @param userId - Must be admin ID to get full tree
   */
  async getAllUsers(userId?: string): Promise<TreeUser[]> {
    if (!userId) {
      const rootUser = await db
        .select({ id: usersTable.id, role: usersTable.role })
        .from(usersTable)
        .where(eq(usersTable.role, "ADMIN"))
        .limit(1);

      if (!rootUser[0]) throw new Error("Admin user not found");
      return this.inOrderTraversal();
    }

    // Get user data to check role
    const userData = await databaseService.fetchUserData(userId);

    // If admin, return full tree
    if (userData.role === "ADMIN") {
      return this.inOrderTraversal();
    }

    // For regular users, return only their subtree
    return this.getUserDownline(userId);
  }

  /**
   * Get a user's downline (all users in their subtree)
   */
  async getUserDownline(userId: string): Promise<TreeUser[]> {
    // Build tree for this specific user as root
    const userData = await databaseService.fetchUserData(userId);
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
  async getLeftBranchUsers(userId: string): Promise<TreeUser[]> {
    // Build tree for this specific user as root if needed
    const userData = await databaseService.fetchUserData(userId);
    const userNode = new Node(userData);
    await this.populateChildren(userNode);

    return this.getLeftBranch(userNode);
  }

  /**
   * Get users in right branch of a specific user
   */
  async getRightBranchUsers(userId: string): Promise<TreeUser[]> {
    // Build tree for this specific user as root if needed
    const userData = await databaseService.fetchUserData(userId);
    const userNode = new Node(userData);
    await this.populateChildren(userNode);

    return this.getRightBranch(userNode);
  }

  /**
   * Check if a user can be placed at the specified position
   */
  async validatePlacement(parentId: string, side: Side): Promise<boolean> {
    try {
      const parent = await databaseService.fetchUserData(parentId);

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
