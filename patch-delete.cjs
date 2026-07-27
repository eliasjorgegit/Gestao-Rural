const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target = `      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");
      const result = await db.delete(transactions)
        .where(and(eq(transactions.id, txId), eq(transactions.userId, dbUser.id)))
        .returning();`;

const replacement = `      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");
      
      // Delete associated costs and harvests
      await db.delete(costs).where(and(eq(costs.transactionId, txId), eq(costs.userId, dbUser.id)));
      await db.delete(harvests).where(and(eq(harvests.transactionId, txId), eq(harvests.userId, dbUser.id)));

      const result = await db.delete(transactions)
        .where(and(eq(transactions.id, txId), eq(transactions.userId, dbUser.id)))
        .returning();`;

code = code.replace(target, replacement);

fs.writeFileSync('server.ts', code);
