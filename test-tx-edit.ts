import 'dotenv/config';
import { db } from "./src/db/index.ts";
import { transactions } from "./src/db/schema.ts";
import { and, eq } from "drizzle-orm";

async function main() {
  const result = await db.update(transactions)
    .set({
      status: 'paid',
    })
    .where(and(eq(transactions.id, 5), eq(transactions.userId, 1)))
    .returning();
  console.log("Edit result:", result);
}
main();
