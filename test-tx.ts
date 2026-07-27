import 'dotenv/config';
import { db } from "./src/db/index.ts";
import { transactions, users } from "./src/db/schema.ts";

async function main() {
  const allTx = await db.select().from(transactions);
  console.log("Tx:", allTx);
  const allUsers = await db.select().from(users);
  console.log("Users:", allUsers);
}
main();
