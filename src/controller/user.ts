import db from "@/db";

async function main() {
  const user = await db.query.usersTable.findFirst();
  console.log(user);
}
main();
