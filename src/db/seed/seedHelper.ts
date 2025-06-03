import { eq } from "drizzle-orm";
import db, { adminId } from "..";
import {
  InsertProduct,
  InsertTree,
  InsertUser,
  InsertWallet,
  productsTable,
  treeTable,
  usersTable,
  walletsTable,
} from "../schema";

const generateId = () => Math.floor(1000000 + Math.random() * 9000000);
const adminEmail = Bun.env.ADMIN_EMAIL || "admin@example.com";
// Create user data for all levels
export async function generateUserIds() {
  return {
    level1LeftId: generateId(),
    level1RightId: generateId(),
    level2LeftLeftId: generateId(),
    level2LeftRightId: generateId(),
    level2RightLeftId: generateId(),
    level2RightRightId: generateId(),
    level3LeftLeftLeftId: generateId(),
    level3LeftLeftRightId: generateId(),
    level3LeftRightLeftId: generateId(),
    level3LeftRightRightId: generateId(),
    level3RightLeftLeftId: generateId(),
    level3RightLeftRightId: generateId(),
    level3RightRightLeftId: generateId(),
    level3RightRightRightId: generateId(),
  };
}

export async function createAdminUserData() {
  const adminUser: InsertUser = {
    id: adminId,
    name: "Master",
    mobile: "9999999999",
    email: adminEmail,
    country: "Global",
    dialCode: "+1",
    role: "ADMIN",
    isActive: true,
    passwordHash: await Bun.password.hash(process.env.ADMIN_PASSWORD!),
  };
  const adminWallet: InsertWallet = {
    id: adminId,
  };
  const adminTree: InsertTree = {
    id: adminId,
    sponsor: adminId,
    position: "LEFT",
    parentUser: adminId,
  };

  return { adminUser, adminWallet, adminTree };
}

// Create level 1 user data
export async function createLevel1UserData(ids: {
  level1LeftId: number;
  level1RightId: number;
}) {
  const { level1LeftId, level1RightId } = ids;

  const level1LeftUser: InsertUser = {
    id: level1LeftId,
    name: "User Left L1",
    mobile: "1111111111",
    email: "left1@example.com",
    country: "United States",
    dialCode: "+1",
    role: "USER",
    isActive: false,
    passwordHash: await Bun.password.hash("password123"),
  };
  const level1LeftWallet: InsertWallet = {
    id: level1LeftId,
  };
  const level1LeftTree: InsertTree = {
    id: level1LeftId,
    sponsor: adminId,
    position: "LEFT",
    parentUser: adminId,
  };

  const level1RightUser: InsertUser = {
    id: level1RightId,
    name: "User Right L1",
    mobile: "2222222222",
    email: "right1@example.com",
    country: "United Kingdom",
    dialCode: "+44",
    role: "USER",
    isActive: false,
    passwordHash: await Bun.password.hash("password123"),
  };
  const level1RightWallet: InsertWallet = {
    id: level1RightId,
  };
  const level1RightTree: InsertTree = {
    id: level1RightId,
    sponsor: adminId,
    position: "RIGHT",
    parentUser: adminId,
  };

  return {
    users: [level1LeftUser, level1RightUser],
    wallets: [level1LeftWallet, level1RightWallet],
    trees: [level1LeftTree, level1RightTree],
    ids: { level1LeftId, level1RightId },
  };
}

// Create level 2 user data
export async function createLevel2UserData(ids: {
  level1LeftId: number;
  level1RightId: number;
  level2LeftLeftId: number;
  level2LeftRightId: number;
  level2RightLeftId: number;
  level2RightRightId: number;
}) {
  const {
    level1LeftId,
    level1RightId,
    level2LeftLeftId,
    level2LeftRightId,
    level2RightLeftId,
    level2RightRightId,
  } = ids;

  const level2LeftLeftUser: InsertUser = {
    id: level2LeftLeftId,
    name: "User LL L2",
    mobile: "3333333333",
    email: "leftleft2@example.com",
    country: "Canada",
    dialCode: "+1",
    role: "USER",
    isActive: false,
    passwordHash: await Bun.password.hash("password123"),
  };
  const level2LeftLeftWallet: InsertWallet = {
    id: level2LeftLeftId,
  };
  const level2LeftLeftTree: InsertTree = {
    id: level2LeftLeftId,
    sponsor: level1LeftId,
    position: "LEFT",
    parentUser: level1LeftId,
  };

  const level2LeftRightUser: InsertUser = {
    id: level2LeftRightId,
    name: "User LR L2",
    mobile: "4444444444",
    email: "leftright2@example.com",
    country: "Australia",
    dialCode: "+61",
    role: "USER",
    isActive: false,
    passwordHash: await Bun.password.hash("password123"),
  };
  const level2LeftRightWallet: InsertWallet = {
    id: level2LeftRightId,
  };
  const level2LeftRightTree: InsertTree = {
    id: level2LeftRightId,
    sponsor: level1LeftId,
    position: "RIGHT",
    parentUser: level1LeftId,
  };

  const level2RightLeftUser: InsertUser = {
    id: level2RightLeftId,
    name: "User RL L2",
    mobile: "5555555555",
    email: "rightleft2@example.com",
    country: "Germany",
    dialCode: "+49",
    role: "USER",
    isActive: false,
    passwordHash: await Bun.password.hash("password123"),
  };
  const level2RightLeftWallet: InsertWallet = {
    id: level2RightLeftId,
  };
  const level2RightLeftTree: InsertTree = {
    id: level2RightLeftId,
    sponsor: level1RightId,
    position: "LEFT",
    parentUser: level1RightId,
  };

  const level2RightRightUser: InsertUser = {
    id: level2RightRightId,
    name: "User RR L2",
    mobile: "6666666666",
    email: "rightright2@example.com",
    country: "France",
    dialCode: "+33",
    role: "USER",
    isActive: false,
    passwordHash: await Bun.password.hash("password123"),
  };
  const level2RightRightWallet: InsertWallet = {
    id: level2RightRightId,
  };
  const level2RightRightTree: InsertTree = {
    id: level2RightRightId,
    sponsor: level1RightId,
    position: "RIGHT",
    parentUser: level1RightId,
  };

  return {
    users: [
      level2LeftLeftUser,
      level2LeftRightUser,
      level2RightLeftUser,
      level2RightRightUser,
    ],
    wallets: [
      level2LeftLeftWallet,
      level2LeftRightWallet,
      level2RightLeftWallet,
      level2RightRightWallet,
    ],
    trees: [
      level2LeftLeftTree,
      level2LeftRightTree,
      level2RightLeftTree,
      level2RightRightTree,
    ],
  };
}

// Create level 3 user data
export async function createLevel3UserData(ids: {
  level2LeftLeftId: number;
  level2LeftRightId: number;
  level2RightLeftId: number;
  level2RightRightId: number;
  level3LeftLeftLeftId: number;
  level3LeftLeftRightId: number;
  level3LeftRightLeftId: number;
  level3LeftRightRightId: number;
  level3RightLeftLeftId: number;
  level3RightLeftRightId: number;
  level3RightRightLeftId: number;
  level3RightRightRightId: number;
}) {
  const {
    level2LeftLeftId,
    level2LeftRightId,
    level2RightLeftId,
    level2RightRightId,
    level3LeftLeftLeftId,
    level3LeftLeftRightId,
    level3LeftRightLeftId,
    level3LeftRightRightId,
    level3RightLeftLeftId,
    level3RightLeftRightId,
    level3RightRightLeftId,
    level3RightRightRightId,
  } = ids;

  const level3LeftLeftLeftUser: InsertUser = {
    id: level3LeftLeftLeftId,
    name: "User LLL L3",
    mobile: "7777777771",
    email: "lll3@example.com",
    country: "Japan",
    dialCode: "+81",
    role: "USER",
    isActive: false,
    passwordHash: await Bun.password.hash("password123"),
  };
  const level3LeftLeftLeftWallet: InsertWallet = {
    id: level3LeftLeftLeftId,
  };
  const level3LeftLeftLeftTree: InsertTree = {
    id: level3LeftLeftLeftId,
    sponsor: level2LeftLeftId,
    position: "LEFT",
    parentUser: level2LeftLeftId,
  };

  const level3LeftLeftRightUser: InsertUser = {
    id: level3LeftLeftRightId,
    name: "User LLR L3",
    mobile: "7777777772",
    email: "llr3@example.com",
    country: "India",
    dialCode: "+91",
    role: "USER",
    isActive: false,
    passwordHash: await Bun.password.hash("password123"),
  };
  const level3LeftLeftRightWallet: InsertWallet = {
    id: level3LeftLeftRightId,
  };
  const level3LeftLeftRightTree: InsertTree = {
    id: level3LeftLeftRightId,
    sponsor: level2LeftLeftId,
    position: "RIGHT",
    parentUser: level2LeftLeftId,
  };

  // Additional level 3 users
  const users: InsertUser[] = [
    {
      id: level3LeftRightLeftId,
      name: "User LRL L3",
      mobile: "7777777773",
      email: "lrl3@example.com",
      country: "Brazil",
      dialCode: "+55",
      role: "USER",
      isActive: false,
      passwordHash: await Bun.password.hash("password123"),
    },
    {
      id: level3LeftRightRightId,
      name: "User LRR L3",
      mobile: "7777777774",
      email: "lrr3@example.com",
      country: "Mexico",
      dialCode: "+52",
      role: "USER",
      isActive: false,
      passwordHash: await Bun.password.hash("password123"),
    },
    {
      id: level3RightLeftLeftId,
      name: "User RLL L3",
      mobile: "7777777775",
      email: "rll3@example.com",
      country: "South Korea",
      dialCode: "+82",
      role: "USER",
      isActive: false,
      passwordHash: await Bun.password.hash("password123"),
    },
    {
      id: level3RightLeftRightId,
      name: "User RLR L3",
      mobile: "7777777776",
      email: "rlr3@example.com",
      country: "Spain",
      dialCode: "+34",
      role: "USER",
      isActive: false,
      passwordHash: await Bun.password.hash("password123"),
    },
    {
      id: level3RightRightLeftId,
      name: "User RRL L3",
      mobile: "7777777777",
      email: "rrl3@example.com",
      country: "Italy",
      dialCode: "+39",
      role: "USER",
      isActive: false,
      passwordHash: await Bun.password.hash("password123"),
    },
    {
      id: level3RightRightRightId,
      name: "User RRR L3",
      mobile: "7777777778",
      email: "rrr3@example.com",
      country: "Russia",
      dialCode: "+7",
      role: "USER",
      isActive: false,
      passwordHash: await Bun.password.hash("password123"),
    },
  ];

  const wallets: InsertWallet[] = users.map((user) => ({ id: user.id }));

  const trees: InsertTree[] = [
    {
      id: level3LeftRightLeftId,
      sponsor: level2LeftRightId,
      position: "LEFT",
      parentUser: level2LeftRightId,
    },
    {
      id: level3LeftRightRightId,
      sponsor: level2LeftRightId,
      position: "RIGHT",
      parentUser: level2LeftRightId,
    },
    {
      id: level3RightLeftLeftId,
      sponsor: level2RightLeftId,
      position: "LEFT",
      parentUser: level2RightLeftId,
    },
    {
      id: level3RightLeftRightId,
      sponsor: level2RightLeftId,
      position: "RIGHT",
      parentUser: level2RightLeftId,
    },
    {
      id: level3RightRightLeftId,
      sponsor: level2RightRightId,
      position: "LEFT",
      parentUser: level2RightRightId,
    },
    {
      id: level3RightRightRightId,
      sponsor: level2RightRightId,
      position: "RIGHT",
      parentUser: level2RightRightId,
    },
  ];

  return {
    mainUsers: [level3LeftLeftLeftUser, level3LeftLeftRightUser],
    mainWallets: [level3LeftLeftLeftWallet, level3LeftLeftRightWallet],
    mainTrees: [level3LeftLeftLeftTree, level3LeftLeftRightTree],
    additionalUsers: users,
    additionalWallets: wallets,
    additionalTrees: trees,
  };
}

// Insert user data into database
export async function insertUserData(
  users: InsertUser[],
  wallets: InsertWallet[],
  trees: InsertTree[],
  message: string,
) {
  console.log(`Adding ${message}`);
  await db.insert(usersTable).values(users).onConflictDoNothing();
  await db.insert(walletsTable).values(wallets).onConflictDoNothing();
  await db.insert(treeTable).values(trees).onConflictDoNothing();
  console.log(`${message} seeded successfully!`);
}

// Update tree references
export async function updateTreeReferences(ids: {
  level1LeftId: number;
  level1RightId: number;
  level2LeftLeftId: number;
  level2LeftRightId: number;
  level2RightLeftId: number;
  level2RightRightId: number;
  level3LeftLeftLeftId: number;
  level3LeftLeftRightId: number;
  level3LeftRightLeftId: number;
  level3LeftRightRightId: number;
  level3RightLeftLeftId: number;
  level3RightLeftRightId: number;
  level3RightRightLeftId: number;
  level3RightRightRightId: number;
}) {
  const {
    level1LeftId,
    level1RightId,
    level2LeftLeftId,
    level2LeftRightId,
    level2RightLeftId,
    level2RightRightId,
    level3LeftLeftLeftId,
    level3LeftLeftRightId,
    level3LeftRightLeftId,
    level3LeftRightRightId,
    level3RightLeftLeftId,
    level3RightLeftRightId,
    level3RightRightLeftId,
    level3RightRightRightId,
  } = ids;

  // Update tree references for admin
  await db
    .update(treeTable)
    .set({
      leftUser: level1LeftId,
      rightUser: level1RightId,
      leftCount: 7, // Left subtree has 7 users
      rightCount: 7, // Right subtree has 7 users
      leftActiveCount: 6, // Based on isActive flags
      rightActiveCount: 6, // Based on isActive flags
    })
    .where(eq(treeTable.id, adminId));

  // Update tree references for level 1 left
  await db
    .update(treeTable)
    .set({
      leftUser: level2LeftLeftId,
      rightUser: level2LeftRightId,
      leftCount: 3,
      rightCount: 3,
      leftActiveCount: 2,
      rightActiveCount: 3,
    })
    .where(eq(treeTable.id, level1LeftId));

  // Update tree references for level 1 right
  await db
    .update(treeTable)
    .set({
      leftUser: level2RightLeftId,
      rightUser: level2RightRightId,
      leftCount: 3,
      rightCount: 3,
      leftActiveCount: 2,
      rightActiveCount: 3,
    })
    .where(eq(treeTable.id, level1RightId));

  // Update tree references for level 2 left-left
  await db
    .update(treeTable)
    .set({
      leftUser: level3LeftLeftLeftId,
      rightUser: level3LeftLeftRightId,
      leftCount: 1,
      rightCount: 1,
      leftActiveCount: 1,
      rightActiveCount: 0,
    })
    .where(eq(treeTable.id, level2LeftLeftId));

  // Update tree references for level 2 left-right
  await db
    .update(treeTable)
    .set({
      leftUser: level3LeftRightLeftId,
      rightUser: level3LeftRightRightId,
      leftCount: 1,
      rightCount: 1,
      leftActiveCount: 1,
      rightActiveCount: 1,
    })
    .where(eq(treeTable.id, level2LeftRightId));

  // Update tree references for level 2 right-left
  await db
    .update(treeTable)
    .set({
      leftUser: level3RightLeftLeftId,
      rightUser: level3RightLeftRightId,
      leftCount: 1,
      rightCount: 1,
      leftActiveCount: 1,
      rightActiveCount: 0,
    })
    .where(eq(treeTable.id, level2RightLeftId));

  // Update tree references for level 2 right-right
  await db
    .update(treeTable)
    .set({
      leftUser: level3RightRightLeftId,
      rightUser: level3RightRightRightId,
      leftCount: 1,
      rightCount: 1,
      leftActiveCount: 1,
      rightActiveCount: 1,
    })
    .where(eq(treeTable.id, level2RightRightId));

  console.log("Tree structure completely updated!");
}

export async function insertProduct() {
  const cellogen: InsertProduct = {
    name: "Cellogen",
    price: 52,
    description: "By Alprimus",
  };
  await db.insert(productsTable).values(cellogen);
}
