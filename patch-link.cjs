const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const linkEndpoint = `
  app.post("/api/transactions/:id/link", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { cycleId, quantity, unit } = req.body;
      const txId = parseInt(id);
      if (isNaN(txId)) return res.status(400).json({ error: "ID inválido." });

      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");

      const txRecord = await db.select().from(transactions).where(and(eq(transactions.id, txId), eq(transactions.userId, dbUser.id))).limit(1);
      if (txRecord.length === 0) return res.status(404).json({ error: "Transação não encontrada." });
      const tx = txRecord[0];

      if (tx.status !== 'paid') return res.status(400).json({ error: "Apenas transações pagas podem ser vinculadas." });

      const cId = parseInt(cycleId);
      if (isNaN(cId)) return res.status(400).json({ error: "Ciclo inválido." });

      const userCycle = await db.select().from(cycles).where(and(eq(cycles.id, cId), eq(cycles.userId, dbUser.id))).limit(1);
      if (userCycle.length === 0) return res.status(403).json({ error: "Ciclo produtivo não encontrado." });

      if (tx.type === 'payable') {
        const costDate = tx.paymentDate || new Date().toISOString().split('T')[0];
        const existingCost = await db.select().from(costs).where(and(eq(costs.transactionId, tx.id))).limit(1);
        if (existingCost.length > 0) return res.status(400).json({ error: "Esta transação já foi vinculada a um custo." });

        await db.insert(costs).values({
          userId: dbUser.id,
          cycleId: cId,
          date: costDate,
          category: tx.category || 'Financeiro',
          description: tx.description + ' (Vinculado a Transação)',
          value: tx.amount,
          paymentMethod: 'Transação',
          payer: 'Sistema',
          transactionId: tx.id
        });
        res.json({ message: "Custo gerado com sucesso." });
      } else {
        const qty = parseFloat(quantity);
        if (isNaN(qty) || qty <= 0 || !unit) return res.status(400).json({ error: "Quantidade e unidade são obrigatórios para receitas." });
        const harvestDate = tx.paymentDate || new Date().toISOString().split('T')[0];
        const existingHarvest = await db.select().from(harvests).where(and(eq(harvests.transactionId, tx.id))).limit(1);
        if (existingHarvest.length > 0) return res.status(400).json({ error: "Esta transação já foi vinculada a uma receita." });

        const pricePerUnit = tx.amount / qty;

        await db.insert(harvests).values({
          userId: dbUser.id,
          cycleId: cId,
          date: harvestDate,
          quantity: qty,
          unit: unit,
          pricePerUnit: pricePerUnit,
          transactionId: tx.id
        });
        res.json({ message: "Receita gerada com sucesso." });
      }
    } catch (error: any) {
      console.error("Error linking transaction:", error);
      res.status(500).json({ error: "Erro ao vincular transação." });
    }
  });
`;

code = code.replace('app.delete("/api/transactions/:id", requireAuth, async (req: AuthRequest, res) => {', linkEndpoint + '\n  app.delete("/api/transactions/:id", requireAuth, async (req: AuthRequest, res) => {');

fs.writeFileSync('server.ts', code);
