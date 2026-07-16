import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { requireAuth, AuthRequest } from "./src/middleware/auth.ts";
import { getOrCreateUser } from "./src/db/users.ts";
import { db } from "./src/db/index.ts";
import { properties, activities, plots, cycles, costs, harvests, inventoryItems, inventoryMovements } from "./src/db/schema.ts";
import { eq, and, desc } from "drizzle-orm";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON
  app.use(express.json());

  // --- API ROUTES ---

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // User Profile synchronization endpoint
  app.post("/api/auth/sync", requireAuth, async (req: AuthRequest, res) => {
    try {
      const firebaseUser = req.user;
      if (!firebaseUser) {
        return res.status(401).json({ error: "No user found in token" });
      }
      const userRecord = await getOrCreateUser(firebaseUser.uid, firebaseUser.email || "");
      res.json({ status: "success", user: userRecord });
    } catch (error: any) {
      console.error("Error in sync auth:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // 1. Property CRUD
  app.get("/api/property", requireAuth, async (req: AuthRequest, res) => {
    try {
      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");
      const result = await db.select()
        .from(properties)
        .where(eq(properties.userId, dbUser.id))
        .limit(1);
      
      res.json(result[0] || null);
    } catch (error: any) {
      console.error("Error fetching property:", error);
      res.status(500).json({ error: "Erro ao carregar propriedade." });
    }
  });

  app.post("/api/property", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { name, location, totalArea } = req.body;
      if (!name || !location || totalArea === undefined) {
        return res.status(400).json({ error: "Todos os campos (nome, localização, área total) são obrigatórios." });
      }

      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");
      
      // Upsert pattern for property
      const existing = await db.select()
        .from(properties)
        .where(eq(properties.userId, dbUser.id))
        .limit(1);

      let result;
      if (existing.length > 0) {
        result = await db.update(properties)
          .set({ name, location, totalArea: parseFloat(totalArea) })
          .where(eq(properties.id, existing[0].id))
          .returning();
      } else {
        result = await db.insert(properties)
          .values({
            userId: dbUser.id,
            name,
            location,
            totalArea: parseFloat(totalArea)
          })
          .returning();
      }

      res.json(result[0]);
    } catch (error: any) {
      console.error("Error saving property:", error);
      res.status(500).json({ error: "Erro ao salvar dados da propriedade." });
    }
  });

  // 2. Activities CRUD
  app.get("/api/activities", requireAuth, async (req: AuthRequest, res) => {
    try {
      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");
      const list = await db.select()
        .from(activities)
        .where(eq(activities.userId, dbUser.id))
        .orderBy(desc(activities.createdAt));
      res.json(list);
    } catch (error: any) {
      console.error("Error fetching activities:", error);
      res.status(500).json({ error: "Erro ao buscar atividades." });
    }
  });

  app.post("/api/activities", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ error: "O nome da atividade é obrigatório." });
      }

      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");
      const result = await db.insert(activities)
        .values({
          userId: dbUser.id,
          name,
        })
        .returning();
      res.json(result[0]);
    } catch (error: any) {
      console.error("Error creating activity:", error);
      res.status(500).json({ error: "Erro ao adicionar atividade." });
    }
  });

  app.put("/api/activities/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ error: "O nome da atividade é obrigatório." });
      }

      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");
      const result = await db.update(activities)
        .set({ name })
        .where(and(eq(activities.id, parseInt(id)), eq(activities.userId, dbUser.id)))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ error: "Atividade não encontrada ou sem permissão." });
      }
      res.json(result[0]);
    } catch (error: any) {
      console.error("Error updating activity:", error);
      res.status(500).json({ error: "Erro ao editar atividade." });
    }
  });

  app.delete("/api/activities/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");
      const result = await db.delete(activities)
        .where(and(eq(activities.id, parseInt(id)), eq(activities.userId, dbUser.id)))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ error: "Atividade não encontrada ou sem permissão." });
      }
      res.json({ message: "Atividade excluída com sucesso." });
    } catch (error: any) {
      console.error("Error deleting activity:", error);
      res.status(500).json({ error: "Erro ao excluir atividade. Verifique se ela possui ciclos produtivos vinculados." });
    }
  });

  // 3. Plots CRUD
  app.get("/api/plots", requireAuth, async (req: AuthRequest, res) => {
    try {
      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");
      const list = await db.select()
        .from(plots)
        .where(eq(plots.userId, dbUser.id))
        .orderBy(desc(plots.createdAt));
      res.json(list);
    } catch (error: any) {
      console.error("Error fetching plots:", error);
      res.status(500).json({ error: "Erro ao buscar talhões." });
    }
  });

  app.post("/api/plots", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { name, size, soilType } = req.body;
      if (!name || size === undefined || !soilType) {
        return res.status(400).json({ error: "Nome, tamanho (hectares) e tipo de solo/relevo são obrigatórios." });
      }

      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");
      const result = await db.insert(plots)
        .values({
          userId: dbUser.id,
          name,
          size: parseFloat(size),
          soilType,
        })
        .returning();
      res.json(result[0]);
    } catch (error: any) {
      console.error("Error creating plot:", error);
      res.status(500).json({ error: "Erro ao adicionar talhão." });
    }
  });

  app.put("/api/plots/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { name, size, soilType } = req.body;
      if (!name || size === undefined || !soilType) {
        return res.status(400).json({ error: "Nome, tamanho e tipo de solo são obrigatórios." });
      }

      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");
      const result = await db.update(plots)
        .set({ name, size: parseFloat(size), soilType })
        .where(and(eq(plots.id, parseInt(id)), eq(plots.userId, dbUser.id)))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ error: "Talhão não encontrado ou sem permissão." });
      }
      res.json(result[0]);
    } catch (error: any) {
      console.error("Error updating plot:", error);
      res.status(500).json({ error: "Erro ao editar talhão." });
    }
  });

  app.delete("/api/plots/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");
      const result = await db.delete(plots)
        .where(and(eq(plots.id, parseInt(id)), eq(plots.userId, dbUser.id)))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ error: "Talhão não encontrado ou sem permissão." });
      }
      res.json({ message: "Talhão excluído com sucesso." });
    } catch (error: any) {
      console.error("Error deleting plot:", error);
      res.status(500).json({ error: "Erro ao excluir talhão. Verifique se possui ciclos produtivos vinculados." });
    }
  });

  // 4. Productive Cycles CRUD (with joins to plots and activities)
  app.get("/api/cycles", requireAuth, async (req: AuthRequest, res) => {
    try {
      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");
      
      // In Drizzle, we can do direct join or select with relations.
      // Doing inner joins to return details in one neat payload:
      const list = await db.select({
        id: cycles.id,
        name: cycles.name,
        plotId: cycles.plotId,
        activityId: cycles.activityId,
        startDate: cycles.startDate,
        endDate: cycles.endDate,
        status: cycles.status,
        createdAt: cycles.createdAt,
        plotName: plots.name,
        plotSize: plots.size,
        activityName: activities.name,
      })
      .from(cycles)
      .innerJoin(plots, eq(cycles.plotId, plots.id))
      .innerJoin(activities, eq(cycles.activityId, activities.id))
      .where(eq(cycles.userId, dbUser.id))
      .orderBy(desc(cycles.createdAt));

      res.json(list);
    } catch (error: any) {
      console.error("Error fetching cycles:", error);
      res.status(500).json({ error: "Erro ao buscar ciclos produtivos." });
    }
  });

  app.post("/api/cycles", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { plotId, activityId, name, startDate, endDate, status } = req.body;
      if (!plotId || !activityId || !name || !startDate || !endDate) {
        return res.status(400).json({ error: "Todos os campos são obrigatórios para o ciclo produtivo." });
      }

      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");
      const result = await db.insert(cycles)
        .values({
          userId: dbUser.id,
          plotId: parseInt(plotId),
          activityId: parseInt(activityId),
          name,
          startDate,
          endDate,
          status: status || "Ativo",
        })
        .returning();
      res.json(result[0]);
    } catch (error: any) {
      console.error("Error creating cycle:", error);
      res.status(500).json({ error: "Erro ao criar ciclo produtivo." });
    }
  });

  app.put("/api/cycles/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { plotId, activityId, name, startDate, endDate, status } = req.body;
      if (!plotId || !activityId || !name || !startDate || !endDate) {
        return res.status(400).json({ error: "Todos os campos são obrigatórios." });
      }

      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");
      const result = await db.update(cycles)
        .set({
          plotId: parseInt(plotId),
          activityId: parseInt(activityId),
          name,
          startDate,
          endDate,
          status: status || "Ativo",
        })
        .where(and(eq(cycles.id, parseInt(id)), eq(cycles.userId, dbUser.id)))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ error: "Ciclo produtivo não encontrado." });
      }
      res.json(result[0]);
    } catch (error: any) {
      console.error("Error updating cycle:", error);
      res.status(500).json({ error: "Erro ao editar ciclo produtivo." });
    }
  });

  app.delete("/api/cycles/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");
      const result = await db.delete(cycles)
        .where(and(eq(cycles.id, parseInt(id)), eq(cycles.userId, dbUser.id)))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ error: "Ciclo produtivo não encontrado." });
      }
      res.json({ message: "Ciclo produtivo excluído com sucesso." });
    } catch (error: any) {
      console.error("Error deleting cycle:", error);
      res.status(500).json({ error: "Erro ao excluir ciclo. Verifique se ele possui custos ou registros de colheita vinculados." });
    }
  });

  // 5. Costs CRUD
  app.get("/api/costs", requireAuth, async (req: AuthRequest, res) => {
    try {
      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");
      
      const list = await db.select({
        id: costs.id,
        cycleId: costs.cycleId,
        date: costs.date,
        category: costs.category,
        description: costs.description,
        value: costs.value,
        createdAt: costs.createdAt,
        cycleName: cycles.name,
        plotName: plots.name,
      })
      .from(costs)
      .innerJoin(cycles, eq(costs.cycleId, cycles.id))
      .innerJoin(plots, eq(cycles.plotId, plots.id))
      .where(eq(costs.userId, dbUser.id))
      .orderBy(desc(costs.date), desc(costs.createdAt));

      res.json(list);
    } catch (error: any) {
      console.error("Error fetching costs:", error);
      res.status(500).json({ error: "Erro ao buscar custos." });
    }
  });

  app.post("/api/costs", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { cycleId, date, category, description, value } = req.body;
      if (!cycleId || !date || !category || !description || value === undefined) {
        return res.status(400).json({ error: "Todos os campos do custo são obrigatórios." });
      }

      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");
      const result = await db.insert(costs)
        .values({
          userId: dbUser.id,
          cycleId: parseInt(cycleId),
          date,
          category,
          description,
          value: parseFloat(value),
        })
        .returning();
      res.json(result[0]);
    } catch (error: any) {
      console.error("Error creating cost:", error);
      res.status(500).json({ error: "Erro ao registrar custo." });
    }
  });

  app.put("/api/costs/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { cycleId, date, category, description, value } = req.body;
      if (!cycleId || !date || !category || !description || value === undefined) {
        return res.status(400).json({ error: "Todos os campos são obrigatórios." });
      }

      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");
      const result = await db.update(costs)
        .set({
          cycleId: parseInt(cycleId),
          date,
          category,
          description,
          value: parseFloat(value),
        })
        .where(and(eq(costs.id, parseInt(id)), eq(costs.userId, dbUser.id)))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ error: "Registro de custo não encontrado." });
      }
      res.json(result[0]);
    } catch (error: any) {
      console.error("Error updating cost:", error);
      res.status(500).json({ error: "Erro ao editar custo." });
    }
  });

  app.delete("/api/costs/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");
      const result = await db.delete(costs)
        .where(and(eq(costs.id, parseInt(id)), eq(costs.userId, dbUser.id)))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ error: "Registro de custo não encontrado." });
      }
      res.json({ message: "Custo excluído com sucesso." });
    } catch (error: any) {
      console.error("Error deleting cost:", error);
      res.status(500).json({ error: "Erro ao excluir custo." });
    }
  });

  // 6. Harvests/Production CRUD
  app.get("/api/harvests", requireAuth, async (req: AuthRequest, res) => {
    try {
      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");
      
      const list = await db.select({
        id: harvests.id,
        cycleId: harvests.cycleId,
        date: harvests.date,
        quantity: harvests.quantity,
        unit: harvests.unit,
        pricePerUnit: harvests.pricePerUnit,
        createdAt: harvests.createdAt,
        cycleName: cycles.name,
        plotName: plots.name,
      })
      .from(harvests)
      .innerJoin(cycles, eq(harvests.cycleId, cycles.id))
      .innerJoin(plots, eq(cycles.plotId, plots.id))
      .where(eq(harvests.userId, dbUser.id))
      .orderBy(desc(harvests.date), desc(harvests.createdAt));

      res.json(list);
    } catch (error: any) {
      console.error("Error fetching harvests:", error);
      res.status(500).json({ error: "Erro ao buscar colheitas." });
    }
  });

  app.post("/api/harvests", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { cycleId, date, quantity, unit, pricePerUnit } = req.body;
      if (!cycleId || !date || quantity === undefined || !unit || pricePerUnit === undefined) {
        return res.status(400).json({ error: "Todos os campos do registro de colheita são obrigatórios." });
      }

      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");
      const result = await db.insert(harvests)
        .values({
          userId: dbUser.id,
          cycleId: parseInt(cycleId),
          date,
          quantity: parseFloat(quantity),
          unit,
          pricePerUnit: parseFloat(pricePerUnit),
        })
        .returning();
      res.json(result[0]);
    } catch (error: any) {
      console.error("Error creating harvest:", error);
      res.status(500).json({ error: "Erro ao registrar colheita." });
    }
  });

  app.put("/api/harvests/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { cycleId, date, quantity, unit, pricePerUnit } = req.body;
      if (!cycleId || !date || quantity === undefined || !unit || pricePerUnit === undefined) {
        return res.status(400).json({ error: "Todos os campos são obrigatórios." });
      }

      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");
      const result = await db.update(harvests)
        .set({
          cycleId: parseInt(cycleId),
          date,
          quantity: parseFloat(quantity),
          unit,
          pricePerUnit: parseFloat(pricePerUnit),
        })
        .where(and(eq(harvests.id, parseInt(id)), eq(harvests.userId, dbUser.id)))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ error: "Registro de colheita não encontrado." });
      }
      res.json(result[0]);
    } catch (error: any) {
      console.error("Error updating harvest:", error);
      res.status(500).json({ error: "Erro ao editar colheita." });
    }
  });

  app.delete("/api/harvests/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");
      const result = await db.delete(harvests)
        .where(and(eq(harvests.id, parseInt(id)), eq(harvests.userId, dbUser.id)))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ error: "Registro de colheita não encontrado." });
      }
      res.json({ message: "Registro de colheita excluído com sucesso." });
    } catch (error: any) {
      console.error("Error deleting harvest:", error);
      res.status(500).json({ error: "Erro ao excluir colheita." });
    }
  });

  // 7. Inventory Items (Controle de Estoque) CRUD
  app.get("/api/inventory", requireAuth, async (req: AuthRequest, res) => {
    try {
      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");
      const list = await db.select()
        .from(inventoryItems)
        .where(eq(inventoryItems.userId, dbUser.id))
        .orderBy(desc(inventoryItems.createdAt));
      res.json(list);
    } catch (error: any) {
      console.error("Error fetching inventory items:", error);
      res.status(500).json({ error: "Erro ao buscar itens de estoque." });
    }
  });

  app.post("/api/inventory", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { name, category, quantity, unit, minQuantity, unitCost, location } = req.body;
      if (!name || !category || !unit) {
        return res.status(400).json({ error: "Nome, categoria e unidade são obrigatórios." });
      }

      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");
      const result = await db.insert(inventoryItems)
        .values({
          userId: dbUser.id,
          name,
          category,
          quantity: quantity !== undefined ? parseFloat(quantity) : 0,
          unit,
          minQuantity: minQuantity !== undefined ? parseFloat(minQuantity) : 0,
          unitCost: unitCost !== undefined ? parseFloat(unitCost) : 0,
          location: location || null,
        })
        .returning();
      res.json(result[0]);
    } catch (error: any) {
      console.error("Error creating inventory item:", error);
      res.status(500).json({ error: "Erro ao criar item de estoque." });
    }
  });

  app.put("/api/inventory/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { name, category, quantity, unit, minQuantity, unitCost, location } = req.body;
      if (!name || !category || !unit) {
        return res.status(400).json({ error: "Nome, categoria e unidade são obrigatórios." });
      }

      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");
      const result = await db.update(inventoryItems)
        .set({
          name,
          category,
          quantity: quantity !== undefined ? parseFloat(quantity) : 0,
          unit,
          minQuantity: minQuantity !== undefined ? parseFloat(minQuantity) : 0,
          unitCost: unitCost !== undefined ? parseFloat(unitCost) : 0,
          location: location || null,
        })
        .where(and(eq(inventoryItems.id, parseInt(id)), eq(inventoryItems.userId, dbUser.id)))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ error: "Item de estoque não encontrado ou sem permissão." });
      }
      res.json(result[0]);
    } catch (error: any) {
      console.error("Error updating inventory item:", error);
      res.status(500).json({ error: "Erro ao editar item de estoque." });
    }
  });

  app.delete("/api/inventory/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");
      const result = await db.delete(inventoryItems)
        .where(and(eq(inventoryItems.id, parseInt(id)), eq(inventoryItems.userId, dbUser.id)))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ error: "Item de estoque não encontrado ou sem permissão." });
      }
      res.json({ message: "Item de estoque excluído com sucesso." });
    } catch (error: any) {
      console.error("Error deleting inventory item:", error);
      res.status(500).json({ error: "Erro ao excluir item de estoque. Verifique se ele possui movimentações vinculadas." });
    }
  });

  // 8. Inventory Movements (Histórico) CRUD
  app.get("/api/inventory/movements", requireAuth, async (req: AuthRequest, res) => {
    try {
      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");
      
      const list = await db.select({
        id: inventoryMovements.id,
        itemId: inventoryMovements.itemId,
        type: inventoryMovements.type,
        quantity: inventoryMovements.quantity,
        date: inventoryMovements.date,
        description: inventoryMovements.description,
        cycleId: inventoryMovements.cycleId,
        createdAt: inventoryMovements.createdAt,
        itemName: inventoryItems.name,
        itemUnit: inventoryItems.unit,
        cycleName: cycles.name,
      })
      .from(inventoryMovements)
      .innerJoin(inventoryItems, eq(inventoryMovements.itemId, inventoryItems.id))
      .leftJoin(cycles, eq(inventoryMovements.cycleId, cycles.id))
      .where(eq(inventoryMovements.userId, dbUser.id))
      .orderBy(desc(inventoryMovements.date), desc(inventoryMovements.createdAt));

      res.json(list);
    } catch (error: any) {
      console.error("Error fetching inventory movements:", error);
      res.status(500).json({ error: "Erro ao buscar movimentações de estoque." });
    }
  });

  app.post("/api/inventory/movements", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { itemId, type, quantity, date, description, cycleId } = req.body;
      if (!itemId || !type || quantity === undefined || !date) {
        return res.status(400).json({ error: "Item, tipo, quantidade e data são obrigatórios." });
      }

      const parsedQty = parseFloat(quantity);
      if (parsedQty <= 0) {
        return res.status(400).json({ error: "A quantidade deve ser maior que zero." });
      }

      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");

      // Get current item to check stock availability and update it
      const currentItem = await db.select()
        .from(inventoryItems)
        .where(and(eq(inventoryItems.id, parseInt(itemId)), eq(inventoryItems.userId, dbUser.id)))
        .limit(1);

      if (currentItem.length === 0) {
        return res.status(404).json({ error: "Item de estoque não encontrado." });
      }

      const item = currentItem[0];
      let newQuantity = item.quantity;

      if (type === 'saida') {
        if (item.quantity < parsedQty) {
          return res.status(400).json({ error: `Saldo insuficiente em estoque. Saldo atual: ${item.quantity} ${item.unit}` });
        }
        newQuantity -= parsedQty;
      } else {
        newQuantity += parsedQty;
      }

      // Update inventory item quantity
      await db.update(inventoryItems)
        .set({ quantity: newQuantity })
        .where(eq(inventoryItems.id, item.id));

      // Record movement
      const movement = await db.insert(inventoryMovements)
        .values({
          userId: dbUser.id,
          itemId: item.id,
          type,
          quantity: parsedQty,
          date,
          description: description || null,
          cycleId: cycleId ? parseInt(cycleId) : null,
        })
        .returning();

      // INTEGRATION: If movement is 'saida' and cycleId is provided, automatically record a cost in the costs table!
      if (type === 'saida' && cycleId) {
        let costCategory = "Outros";
        if (item.category === "Adubos") {
          costCategory = "Adubação";
        } else if (item.category === "Defensivos Agrícolas") {
          costCategory = "Agrotóxicos";
        } else if (item.category === "Sementes / Mudas") {
          costCategory = "Sementes / Mudas";
        } else if (item.category === "Mantimentos") {
          costCategory = "Outros";
        } else if (item.category === "Ferramentas") {
          costCategory = "Manutenção";
        }

        const calculatedCost = parsedQty * item.unitCost;
        if (calculatedCost > 0) {
          await db.insert(costs)
            .values({
              userId: dbUser.id,
              cycleId: parseInt(cycleId),
              date,
              category: costCategory,
              description: `Consumo de Estoque: ${item.name} (${parsedQty} ${item.unit})`,
              value: calculatedCost,
            });
        }
      }

      res.json(movement[0]);
    } catch (error: any) {
      console.error("Error creating inventory movement:", error);
      res.status(500).json({ error: "Erro ao registrar movimentação de estoque." });
    }
  });

  app.delete("/api/inventory/movements/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");

      // Get movement
      const existingMov = await db.select()
        .from(inventoryMovements)
        .where(and(eq(inventoryMovements.id, parseInt(id)), eq(inventoryMovements.userId, dbUser.id)))
        .limit(1);

      if (existingMov.length === 0) {
        return res.status(404).json({ error: "Movimentação não encontrada." });
      }

      const mov = existingMov[0];

      // Get item to update quantity
      const existingItem = await db.select()
        .from(inventoryItems)
        .where(and(eq(inventoryItems.id, mov.itemId), eq(inventoryItems.userId, dbUser.id)))
        .limit(1);

      if (existingItem.length > 0) {
        const item = existingItem[0];
        let reversedQuantity = item.quantity;

        if (mov.type === 'entrada') {
          reversedQuantity -= mov.quantity;
        } else {
          reversedQuantity += mov.quantity;
        }

        if (reversedQuantity < 0) {
          return res.status(400).json({ error: "Não é possível estornar esta movimentação pois resultaria em saldo negativo do estoque." });
        }

        await db.update(inventoryItems)
          .set({ quantity: reversedQuantity })
          .where(eq(inventoryItems.id, item.id));
      }

      // Delete the movement
      await db.delete(inventoryMovements)
        .where(eq(inventoryMovements.id, mov.id));

      res.json({ message: "Movimentação estornada com sucesso." });
    } catch (error: any) {
      console.error("Error deleting movement:", error);
      res.status(500).json({ error: "Erro ao estornar movimentação de estoque." });
    }
  });


  // --- VITE MIDDLEWARE OR STATIC FILES ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Fatal server start error:", err);
});
