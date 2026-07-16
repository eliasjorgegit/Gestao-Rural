import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { requireAuth, AuthRequest } from "./src/middleware/auth.ts";
import { getOrCreateUser } from "./src/db/users.ts";
import { db } from "./src/db/index.ts";
import { properties, activities, plots, cycles, costs, harvests } from "./src/db/schema.ts";
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
