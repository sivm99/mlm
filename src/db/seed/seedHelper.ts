import { eq } from "drizzle-orm";
import {
  InsertProduct,
  InsertTree,
  InsertUser,
  productsTable,
  treeTable,
  usersTable,
  walletsTable,
  userStatsTable,
} from "../schema";
import { BunSQLDatabase } from "drizzle-orm/bun-sql";
import { adminId } from "..";

const generateId = () => Math.floor(1_000_000 + Math.random() * 9_000_000);
const adminEmail = Bun.env.ADMIN_EMAIL || "admin@example.com";

interface TreeNode {
  id: number;
  name: string;
  email: string;
  mobile: string;
  country: string;
  dialCode: string;
  isActive: boolean;
  sponsor: number;
  image?: string;
  parentUser: number;
  position: "left" | "right";
  left?: TreeNode;
  right?: TreeNode;
}

export async function generateTreeStructure(): Promise<TreeNode> {
  // Generate all IDs first
  const ids = {
    // Level 1
    level1Left: 1234567,
    level1Right: 1234568,
    // Level 2
    level2LL: generateId(),
    level2LR: generateId(),
    level2RL: generateId(),
    level2RR: generateId(),
    // Level 3
    level3LLL: generateId(),
    level3LLR: generateId(),
    level3LRL: generateId(),
    level3LRR: generateId(),
    level3RLL: generateId(),
    level3RLR: generateId(),
    level3RRL: generateId(),
    level3RRR: generateId(),
  };

  // Build the tree structure
  const tree: TreeNode = {
    id: adminId,
    name: "Master Admin",
    email: adminEmail,
    mobile: "9999999999",
    country: "Global",
    dialCode: "+1",
    isActive: true,
    sponsor: adminId,
    parentUser: adminId,
    position: "left",
    left: {
      id: ids.level1Left,
      name: "User L1-Left",
      email: "l1left@example.com",
      mobile: "1111111111",
      country: "United States",
      dialCode: "+1",
      isActive: true,
      sponsor: adminId,
      parentUser: adminId,
      position: "left",
      left: {
        id: ids.level2LL,
        name: "User L2-LeftLeft",
        email: "l2ll@example.com",
        mobile: "2222222221",
        country: "Canada",
        dialCode: "+1",
        isActive: true,
        sponsor: ids.level1Left,
        parentUser: ids.level1Left,
        position: "left",
        left: {
          id: ids.level3LLL,
          name: "User L3-LLL",
          email: "l3lll@example.com",
          mobile: "3333333331",
          country: "Japan",
          dialCode: "+81",
          isActive: false,
          sponsor: ids.level2LL,
          parentUser: ids.level2LL,
          position: "left",
        },
        right: {
          id: ids.level3LLR,
          name: "User L3-LLR",
          email: "l3llr@example.com",
          mobile: "3333333332",
          country: "India",
          dialCode: "+91",
          isActive: true,
          sponsor: ids.level2LL,
          parentUser: ids.level2LL,
          position: "right",
        },
      },
      right: {
        id: ids.level2LR,
        name: "User L2-LeftRight",
        email: "l2lr@example.com",
        mobile: "2222222222",
        country: "Australia",
        dialCode: "+61",
        isActive: false,
        sponsor: ids.level1Left,
        parentUser: ids.level1Left,
        position: "right",
        left: {
          id: ids.level3LRL,
          name: "User L3-LRL",
          email: "l3lrl@example.com",
          mobile: "3333333333",
          country: "Brazil",
          dialCode: "+55",
          isActive: true,
          sponsor: ids.level2LR,
          parentUser: ids.level2LR,
          position: "left",
        },
        right: {
          id: ids.level3LRR,
          name: "User L3-LRR",
          email: "l3lrr@example.com",
          mobile: "3333333334",
          country: "Mexico",
          dialCode: "+52",
          isActive: true,
          sponsor: ids.level2LR,
          parentUser: ids.level2LR,
          position: "right",
        },
      },
    },
    right: {
      id: ids.level1Right,
      name: "User L1-Right",
      email: "l1right@example.com",
      mobile: "1111111112",
      country: "United Kingdom",
      dialCode: "+44",
      isActive: true,
      sponsor: adminId,
      parentUser: adminId,
      position: "right",
      left: {
        id: ids.level2RL,
        name: "User L2-RightLeft",
        email: "l2rl@example.com",
        mobile: "2222222223",
        country: "Germany",
        dialCode: "+49",
        isActive: false,
        sponsor: ids.level1Right,
        parentUser: ids.level1Right,
        position: "left",
        left: {
          id: ids.level3RLL,
          name: "User L3-RLL",
          email: "l3rll@example.com",
          mobile: "3333333335",
          country: "South Korea",
          dialCode: "+82",
          isActive: true,
          sponsor: ids.level2RL,
          parentUser: ids.level2RL,
          position: "left",
        },
        right: {
          id: ids.level3RLR,
          name: "User L3-RLR",
          email: "l3rlr@example.com",
          mobile: "3333333336",
          country: "Spain",
          dialCode: "+34",
          isActive: false,
          sponsor: ids.level2RL,
          parentUser: ids.level2RL,
          position: "right",
        },
      },
      right: {
        id: ids.level2RR,
        name: "User L2-RightRight",
        email: "l2rr@example.com",
        mobile: "2222222224",
        country: "France",
        dialCode: "+33",
        isActive: true,
        sponsor: ids.level1Right,
        parentUser: ids.level1Right,
        position: "right",
        left: {
          id: ids.level3RRL,
          name: "User L3-RRL",
          email: "l3rrl@example.com",
          mobile: "3333333337",
          country: "Italy",
          dialCode: "+39",
          isActive: true,
          sponsor: ids.level2RR,
          parentUser: ids.level2RR,
          position: "left",
        },
        right: {
          id: ids.level3RRR,
          name: "User L3-RRR",
          email: "l3rrr@example.com",
          mobile: "3333333338",
          country: "Russia",
          dialCode: "+7",
          isActive: true,
          sponsor: ids.level2RR,
          parentUser: ids.level2RR,
          position: "right",
        },
      },
    },
  };

  return tree;
}

// Extract all users from tree structure
async function extractUsers(node: TreeNode): Promise<InsertUser[]> {
  const users: InsertUser[] = [];

  const traverse = async (currentNode: TreeNode) => {
    const user: InsertUser = {
      id: currentNode.id,
      name: currentNode.name,
      image: currentNode.image,
      email: currentNode.email,
      mobile: currentNode.mobile,
      country: currentNode.country,
      dialCode: currentNode.dialCode,
      isActive: currentNode.isActive,
      role: currentNode.id === adminId ? "admin" : "user",
      passwordHash: await Bun.password.hash(
        currentNode.id === adminId ? Bun.env.ADMIN_PASSWORD! : "password123",
      ),
    };
    users.push(user);

    if (currentNode.left) await traverse(currentNode.left);
    if (currentNode.right) await traverse(currentNode.right);
  };

  await traverse(node);
  return users;
}

// Extract all tree relationships
function extractTrees(node: TreeNode): InsertTree[] {
  const trees: InsertTree[] = [];

  const traverse = (currentNode: TreeNode) => {
    const tree: InsertTree = {
      id: currentNode.id,
      sponsor: currentNode.sponsor,
      parentUser: currentNode.parentUser,
      position: currentNode.position,
    };
    trees.push(tree);

    if (currentNode.left) traverse(currentNode.left);
    if (currentNode.right) traverse(currentNode.right);
  };

  traverse(node);
  return trees;
}

// Generate user IDs for wallet and stats tables
function extractUserIds(node: TreeNode): number[] {
  const ids: number[] = [];

  const traverse = (currentNode: TreeNode) => {
    ids.push(currentNode.id);
    if (currentNode.left) traverse(currentNode.left);
    if (currentNode.right) traverse(currentNode.right);
  };

  traverse(node);
  return ids;
}

// Update tree references (left/right users)
async function updateTreeReferences(node: TreeNode, db: BunSQLDatabase) {
  const updateNode = async (currentNode: TreeNode) => {
    await db
      .update(treeTable)
      .set({
        leftUser: currentNode.left?.id || null,
        rightUser: currentNode.right?.id || null,
      })
      .where(eq(treeTable.id, currentNode.id));

    if (currentNode.left) await updateNode(currentNode.left);
    if (currentNode.right) await updateNode(currentNode.right);
  };

  await updateNode(node);
  console.log("Tree references updated successfully!");
}

// Main seeding function
export async function seedBinaryTree(db: BunSQLDatabase) {
  try {
    console.log("🌱 Starting binary tree seeding...");

    // 1. Generate tree structure
    const treeStructure = await generateTreeStructure();

    // 2. Extract data for each table
    const users = await extractUsers(treeStructure);
    const trees = extractTrees(treeStructure);
    const userIds = extractUserIds(treeStructure);

    // 3. Insert users first
    console.log("👥 Inserting users...");
    await db.insert(usersTable).values(users).onConflictDoNothing();

    // 4. Insert wallets (just IDs needed)
    console.log("💰 Creating wallets...");
    const wallets = userIds.map((id) => ({ id }));
    await db.insert(walletsTable).values(wallets).onConflictDoNothing();

    // 5. Insert user stats (just IDs needed)
    console.log("📊 Creating user stats...");
    const userStats = userIds.map((id) => ({ id }));
    await db.insert(userStatsTable).values(userStats).onConflictDoNothing();

    // 6. Insert tree relationships
    console.log("🌳 Creating tree structure...");
    await db.insert(treeTable).values(trees).onConflictDoNothing();

    // 7. Update tree references (left/right users)
    console.log("🔗 Updating tree references...");
    await updateTreeReferences(treeStructure, db);

    // 8. Insert sample product
    console.log("📦 Adding sample product...");
    await insertProduct(db);

    console.log("✅ Binary tree seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    throw error;
  }
}

export async function insertProduct(db: BunSQLDatabase) {
  const cellogen: InsertProduct = {
    name: "Cellogen",
    price: 52,
    description: "By Alprimus",
  };
  await db.insert(productsTable).values(cellogen).onConflictDoNothing();
}
