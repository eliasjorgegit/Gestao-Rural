import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { requireAuth, AuthRequest, JWT_SECRET } from "./src/middleware/auth.ts";
import { getOrCreateUser } from "./src/db/users.ts";
import { db } from "./src/db/index.ts";
import { users, properties, activities, plots, cycles, costs, harvests, inventoryItems, inventoryMovements, transactions, schedules } from "./src/db/schema.ts";
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

  // Native Registration endpoint (Email / Password)
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres." });
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Check if user already exists
      const existingUser = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
      if (existingUser.length > 0) {
        // If user exists and already has a password or UID
        if (existingUser[0].passwordHash) {
          return res.status(400).json({ error: "Este e-mail já está cadastrado. Faça login." });
        }
        // If user was created via Google sync earlier, attach passwordHash to existing account
        const hashedPassword = await bcrypt.hash(password, 10);
        const updated = await db.update(users)
          .set({ passwordHash: hashedPassword })
          .where(eq(users.id, existingUser[0].id))
          .returning();

        const token = jwt.sign({ uid: updated[0].uid, email: updated[0].email }, JWT_SECRET, { expiresIn: '30d' });
        return res.json({ status: "success", token, user: updated[0] });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const customUid = `local:${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const newUser = await db.insert(users)
        .values({
          uid: customUid,
          email: normalizedEmail,
          passwordHash: hashedPassword,
        })
        .returning();

      const token = jwt.sign({ uid: newUser[0].uid, email: newUser[0].email }, JWT_SECRET, { expiresIn: '30d' });
      res.json({ status: "success", token, user: newUser[0] });
    } catch (error: any) {
      console.error("Error registering user:", error);
      res.status(500).json({ error: "Erro ao cadastrar usuário." });
    }
  });

  // Native Login endpoint (Email / Password)
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const userList = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);

      if (userList.length === 0 || !userList[0].passwordHash) {
        return res.status(400).json({ error: "E-mail ou senha incorretos." });
      }

      const userRecord = userList[0];
      const isMatch = await bcrypt.compare(password, userRecord.passwordHash);
      if (!isMatch) {
        return res.status(400).json({ error: "E-mail ou senha incorretos." });
      }

      const token = jwt.sign({ uid: userRecord.uid, email: userRecord.email }, JWT_SECRET, { expiresIn: '30d' });
      res.json({ status: "success", token, user: userRecord });
    } catch (error: any) {
      console.error("Error logging in:", error);
      res.status(500).json({ error: "Erro ao realizar login." });
    }
  });

  // Verify custom token endpoint
  app.get("/api/auth/me", requireAuth, async (req: AuthRequest, res) => {
    try {
      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");
      res.json({ status: "success", user: dbUser });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
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
          .set({ name, location, totalArea: parseFloat(String(totalArea).replace(",", ".")) })
          .where(eq(properties.id, existing[0].id))
          .returning();
      } else {
        result = await db.insert(properties)
          .values({
            userId: dbUser.id,
            name,
            location,
            totalArea: parseFloat(String(totalArea).replace(",", "."))
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
      const actId = parseInt(id);
      if (isNaN(actId)) return res.status(400).json({ error: "ID inválido." });

      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");
      const result = await db.delete(activities)
        .where(and(eq(activities.id, actId), eq(activities.userId, dbUser.id)))
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
      const { name, size, soilType, plantCount, variety } = req.body;
      if (!name || size === undefined || !soilType) {
        return res.status(400).json({ error: "Nome, tamanho (hectares) e tipo de solo/relevo são obrigatórios." });
      }

      const parsedSize = parseFloat(String(size).replace(",", "."));
      if (isNaN(parsedSize) || parsedSize <= 0) {
        return res.status(400).json({ error: "Tamanho inválido. Deve ser maior que zero." });
      }

      const parsedPlantCount = plantCount !== undefined && plantCount !== null && plantCount !== '' 
        ? parseInt(String(plantCount), 10) 
        : 0;

      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");
      const result = await db.insert(plots)
        .values({
          userId: dbUser.id,
          name,
          size: parsedSize,
          soilType,
          plantCount: isNaN(parsedPlantCount) ? 0 : parsedPlantCount,
          variety: variety ? String(variety).trim() : null,
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
      const { name, size, soilType, plantCount, variety } = req.body;
      if (!name || size === undefined || !soilType) {
        return res.status(400).json({ error: "Nome, tamanho e tipo de solo são obrigatórios." });
      }

      const plotId = parseInt(id);
      if (isNaN(plotId)) {
        return res.status(400).json({ error: "ID inválido." });
      }

      const parsedSize = parseFloat(String(size).replace(",", "."));
      if (isNaN(parsedSize) || parsedSize <= 0) {
        return res.status(400).json({ error: "Tamanho inválido. Deve ser maior que zero." });
      }

      const parsedPlantCount = plantCount !== undefined && plantCount !== null && plantCount !== '' 
        ? parseInt(String(plantCount), 10) 
        : 0;

      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");
      const result = await db.update(plots)
        .set({ 
          name, 
          size: parsedSize, 
          soilType,
          plantCount: isNaN(parsedPlantCount) ? 0 : parsedPlantCount,
          variety: variety ? String(variety).trim() : null
        })
        .where(and(eq(plots.id, plotId), eq(plots.userId, dbUser.id)))
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
      const plotId = parseInt(id);
      if (isNaN(plotId)) return res.status(400).json({ error: "ID inválido." });

      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");
      const result = await db.delete(plots)
        .where(and(eq(plots.id, plotId), eq(plots.userId, dbUser.id)))
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
        plotPlantCount: plots.plantCount,
        plotVariety: plots.variety,
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

      const pId = parseInt(plotId);
      const aId = parseInt(activityId);
      if (isNaN(pId) || isNaN(aId)) {
        return res.status(400).json({ error: "IDs inválidos." });
      }

      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");

      // Tenant Isolation: Verify ownership of related entities (IDOR protection)
      const userPlot = await db.select().from(plots).where(and(eq(plots.id, pId), eq(plots.userId, dbUser.id))).limit(1);
      if (userPlot.length === 0) return res.status(403).json({ error: "Talhão inválido ou sem permissão." });

      const userActivity = await db.select().from(activities).where(and(eq(activities.id, aId), eq(activities.userId, dbUser.id))).limit(1);
      if (userActivity.length === 0) return res.status(403).json({ error: "Atividade inválida ou sem permissão." });

      const result = await db.insert(cycles)
        .values({
          userId: dbUser.id,
          plotId: pId,
          activityId: aId,
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

      const cycleId = parseInt(id);
      const pId = parseInt(plotId);
      const aId = parseInt(activityId);
      if (isNaN(cycleId) || isNaN(pId) || isNaN(aId)) {
        return res.status(400).json({ error: "IDs inválidos." });
      }

      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");

      // Tenant Isolation: Verify ownership of related entities (IDOR protection)
      const userPlot = await db.select().from(plots).where(and(eq(plots.id, pId), eq(plots.userId, dbUser.id))).limit(1);
      if (userPlot.length === 0) return res.status(403).json({ error: "Talhão inválido ou sem permissão." });

      const userActivity = await db.select().from(activities).where(and(eq(activities.id, aId), eq(activities.userId, dbUser.id))).limit(1);
      if (userActivity.length === 0) return res.status(403).json({ error: "Atividade inválida ou sem permissão." });

      const result = await db.update(cycles)
        .set({
          plotId: pId,
          activityId: aId,
          name,
          startDate,
          endDate,
          status: status || "Ativo",
        })
        .where(and(eq(cycles.id, cycleId), eq(cycles.userId, dbUser.id)))
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
      const cycleId = parseInt(id);
      if (isNaN(cycleId)) return res.status(400).json({ error: "ID inválido." });

      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");
      const result = await db.delete(cycles)
        .where(and(eq(cycles.id, cycleId), eq(cycles.userId, dbUser.id)))
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
        paymentMethod: costs.paymentMethod,
        payer: costs.payer,
        transactionId: costs.transactionId,
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
      const { cycleId, date, category, description, value, paymentMethod, payer } = req.body;
      if (!cycleId || !date || !category || !description || value === undefined) {
        return res.status(400).json({ error: "Todos os campos do custo são obrigatórios." });
      }

      const parsedValue = parseFloat(String(value).replace(",", "."));
      const cId = parseInt(cycleId);
      
      if (isNaN(parsedValue) || parsedValue < 0) {
        return res.status(400).json({ error: "Valor inválido ou negativo." });
      }
      if (isNaN(cId)) {
        return res.status(400).json({ error: "Ciclo inválido." });
      }

      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");
      
      // Tenant Isolation: Verify cycle belongs to the user
      const userCycle = await db.select().from(cycles).where(and(eq(cycles.id, cId), eq(cycles.userId, dbUser.id))).limit(1);
      if (userCycle.length === 0) return res.status(403).json({ error: "Ciclo produtivo não encontrado ou sem permissão." });

      const result = await db.insert(costs)
        .values({
          userId: dbUser.id,
          cycleId: cId,
          date,
          category,
          description,
          value: parsedValue,
          paymentMethod: paymentMethod || null,
          payer: payer || null,
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
      const { cycleId, date, category, description, value, paymentMethod, payer } = req.body;
      if (!cycleId || !date || !category || !description || value === undefined) {
        return res.status(400).json({ error: "Todos os campos são obrigatórios." });
      }

      const costId = parseInt(id);
      const parsedValue = parseFloat(String(value).replace(",", "."));
      const cId = parseInt(cycleId);
      
      if (isNaN(costId)) {
        return res.status(400).json({ error: "ID inválido." });
      }
      if (isNaN(parsedValue) || parsedValue < 0) {
        return res.status(400).json({ error: "Valor inválido ou negativo." });
      }
      if (isNaN(cId)) {
        return res.status(400).json({ error: "Ciclo inválido." });
      }

      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");

      // Tenant Isolation: Verify cycle belongs to the user
      const userCycle = await db.select().from(cycles).where(and(eq(cycles.id, cId), eq(cycles.userId, dbUser.id))).limit(1);
      if (userCycle.length === 0) return res.status(403).json({ error: "Ciclo produtivo não encontrado ou sem permissão." });

      const result = await db.update(costs)
        .set({
          cycleId: cId,
          date,
          category,
          description,
          value: parsedValue,
          paymentMethod: paymentMethod || null,
          payer: payer || null,
        })
        .where(and(eq(costs.id, costId), eq(costs.userId, dbUser.id)))
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
      const costId = parseInt(id);

      if (isNaN(costId)) {
        return res.status(400).json({ error: "ID de custo inválido." });
      }

      // Fetch cost record
      const existingCost = await db.select()
        .from(costs)
        .where(and(eq(costs.id, costId), eq(costs.userId, dbUser.id)))
        .limit(1);

      if (existingCost.length === 0) {
        return res.status(404).json({ error: "Registro de custo não encontrado." });
      }

      const cost = existingCost[0];

      // Find associated inventory movement if present
      let movementToReturn: any = null;
      if (cost.inventoryMovementId) {
        try {
          const mov = await db.select()
            .from(inventoryMovements)
            .where(and(eq(inventoryMovements.id, cost.inventoryMovementId), eq(inventoryMovements.userId, dbUser.id)))
            .limit(1);
          if (mov.length > 0) {
            movementToReturn = mov[0];
          }
        } catch (mErr) {
          console.warn("Could not query movement by inventoryMovementId:", mErr);
        }
      }

      // Fallback matching if created prior to inventoryMovementId
      if (!movementToReturn && cost.description && cost.description.startsWith("Consumo de Estoque:") && cost.cycleId && cost.date) {
        try {
          const candidateMovs = await db.select()
            .from(inventoryMovements)
            .where(and(
              eq(inventoryMovements.userId, dbUser.id),
              eq(inventoryMovements.type, 'saida'),
              eq(inventoryMovements.cycleId, cost.cycleId),
              eq(inventoryMovements.date, cost.date)
            ));
          if (candidateMovs.length > 0) {
            movementToReturn = candidateMovs[0];
          }
        } catch (fErr) {
          console.warn("Could not query fallback candidate movements:", fErr);
        }
      }

      // Unlink inventoryMovementId from cost or delete cost directly
      await db.delete(costs)
        .where(and(eq(costs.id, costId), eq(costs.userId, dbUser.id)));

      // If a linked stock output movement was found, return quantity back to inventory stock and delete movement
      if (movementToReturn) {
        try {
          const itemToUpdate = await db.select()
            .from(inventoryItems)
            .where(and(eq(inventoryItems.id, movementToReturn.itemId), eq(inventoryItems.userId, dbUser.id)))
            .limit(1);

          if (itemToUpdate.length > 0) {
            const item = itemToUpdate[0];
            const restoredQuantity = Number(item.quantity || 0) + Number(movementToReturn.quantity || 0);
            await db.update(inventoryItems)
              .set({ quantity: restoredQuantity })
              .where(and(eq(inventoryItems.id, item.id), eq(inventoryItems.userId, dbUser.id)));
          }

          // Delete the associated inventory movement
          await db.delete(inventoryMovements)
            .where(and(eq(inventoryMovements.id, movementToReturn.id), eq(inventoryMovements.userId, dbUser.id)));
        } catch (stockErr) {
          console.error("Error restoring stock quantity during cost deletion:", stockErr);
        }
      }

      res.json({ message: "Custo excluído com sucesso.", stockRestored: !!movementToReturn });
    } catch (error: any) {
      console.error("Error deleting cost:", error);
      res.status(500).json({ error: error?.message || "Erro ao excluir custo." });
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
        transactionId: harvests.transactionId,
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

      const parsedQty = parseFloat(String(quantity).replace(",", "."));
      const parsedPrice = parseFloat(String(pricePerUnit).replace(",", "."));
      const cId = parseInt(cycleId);

      if (isNaN(parsedQty) || parsedQty < 0) {
        return res.status(400).json({ error: "Quantidade inválida ou negativa." });
      }
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json({ error: "Preço inválido ou negativo." });
      }
      if (isNaN(cId)) {
        return res.status(400).json({ error: "Ciclo inválido." });
      }

      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");

      const userCycle = await db.select().from(cycles).where(and(eq(cycles.id, cId), eq(cycles.userId, dbUser.id))).limit(1);
      if (userCycle.length === 0) return res.status(403).json({ error: "Ciclo produtivo não encontrado ou sem permissão." });

      const result = await db.insert(harvests)
        .values({
          userId: dbUser.id,
          cycleId: cId,
          date,
          quantity: parsedQty,
          unit,
          pricePerUnit: parsedPrice,
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

      const harvestId = parseInt(id);
      const parsedQty = parseFloat(String(quantity).replace(",", "."));
      const parsedPrice = parseFloat(String(pricePerUnit).replace(",", "."));
      const cId = parseInt(cycleId);

      if (isNaN(harvestId)) return res.status(400).json({ error: "ID inválido." });
      if (isNaN(parsedQty) || parsedQty < 0) return res.status(400).json({ error: "Quantidade inválida ou negativa." });
      if (isNaN(parsedPrice) || parsedPrice < 0) return res.status(400).json({ error: "Preço inválido ou negativo." });
      if (isNaN(cId)) return res.status(400).json({ error: "Ciclo inválido." });

      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");

      const userCycle = await db.select().from(cycles).where(and(eq(cycles.id, cId), eq(cycles.userId, dbUser.id))).limit(1);
      if (userCycle.length === 0) return res.status(403).json({ error: "Ciclo produtivo não encontrado ou sem permissão." });

      const result = await db.update(harvests)
        .set({
          cycleId: cId,
          date,
          quantity: parsedQty,
          unit,
          pricePerUnit: parsedPrice,
        })
        .where(and(eq(harvests.id, harvestId), eq(harvests.userId, dbUser.id)))
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
      const harvestId = parseInt(id);
      if (isNaN(harvestId)) return res.status(400).json({ error: "ID inválido." });

      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");
      const result = await db.delete(harvests)
        .where(and(eq(harvests.id, harvestId), eq(harvests.userId, dbUser.id)))
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

      const parsedQty = quantity !== undefined ? parseFloat(String(quantity).replace(",", ".")) : 0;
      const parsedMinQty = minQuantity !== undefined ? parseFloat(String(minQuantity).replace(",", ".")) : 0;
      const parsedUnitCost = unitCost !== undefined ? parseFloat(String(unitCost).replace(",", ".")) : 0;

      if (isNaN(parsedQty) || parsedQty < 0 || isNaN(parsedMinQty) || parsedMinQty < 0 || isNaN(parsedUnitCost) || parsedUnitCost < 0) {
        return res.status(400).json({ error: "Valores numéricos inválidos ou negativos." });
      }

      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");
      const result = await db.insert(inventoryItems)
        .values({
          userId: dbUser.id,
          name,
          category,
          quantity: parsedQty,
          unit,
          minQuantity: parsedMinQty,
          unitCost: parsedUnitCost,
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

      const itemId = parseInt(id);
      if (isNaN(itemId)) return res.status(400).json({ error: "ID inválido." });

      const parsedQty = quantity !== undefined ? parseFloat(String(quantity).replace(",", ".")) : 0;
      const parsedMinQty = minQuantity !== undefined ? parseFloat(String(minQuantity).replace(",", ".")) : 0;
      const parsedUnitCost = unitCost !== undefined ? parseFloat(String(unitCost).replace(",", ".")) : 0;

      if (isNaN(parsedQty) || parsedQty < 0 || isNaN(parsedMinQty) || parsedMinQty < 0 || isNaN(parsedUnitCost) || parsedUnitCost < 0) {
        return res.status(400).json({ error: "Valores numéricos inválidos ou negativos." });
      }

      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");
      const result = await db.update(inventoryItems)
        .set({
          name,
          category,
          quantity: parsedQty,
          unit,
          minQuantity: parsedMinQty,
          unitCost: parsedUnitCost,
          location: location || null,
        })
        .where(and(eq(inventoryItems.id, itemId), eq(inventoryItems.userId, dbUser.id)))
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
      const itemId = parseInt(id);
      if (isNaN(itemId)) return res.status(400).json({ error: "ID inválido." });

      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");

      // 1. Find all movements linked to this item
      const itemMovements = await db.select({ id: inventoryMovements.id })
        .from(inventoryMovements)
        .where(and(eq(inventoryMovements.itemId, itemId), eq(inventoryMovements.userId, dbUser.id)));

      const movementIds = itemMovements.map(m => m.id);

      // 2. Unlink/delete any costs created from these movements
      if (movementIds.length > 0) {
        for (const movId of movementIds) {
          await db.delete(costs)
            .where(and(eq(costs.inventoryMovementId, movId), eq(costs.userId, dbUser.id)));
        }

        // Delete movements first to clean up foreign keys
        await db.delete(inventoryMovements)
          .where(and(eq(inventoryMovements.itemId, itemId), eq(inventoryMovements.userId, dbUser.id)));
      }

      // 3. Delete the item
      const result = await db.delete(inventoryItems)
        .where(and(eq(inventoryItems.id, itemId), eq(inventoryItems.userId, dbUser.id)))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ error: "Item de estoque não encontrado ou sem permissão." });
      }
      res.json({ message: "Item de estoque excluído com sucesso." });
    } catch (error: any) {
      console.error("Error deleting inventory item:", error);
      res.status(500).json({ error: "Erro ao excluir item de estoque." });
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

      const parsedQty = parseFloat(String(quantity).replace(",", "."));
      if (isNaN(parsedQty) || parsedQty <= 0) {
        return res.status(400).json({ error: "A quantidade deve ser maior que zero." });
      }

      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");

      let cId: number | null = null;
      if (cycleId) {
        cId = parseInt(cycleId);
        if (isNaN(cId)) {
          return res.status(400).json({ error: "Ciclo inválido." });
        }
        const userCycle = await db.select().from(cycles).where(and(eq(cycles.id, cId), eq(cycles.userId, dbUser.id))).limit(1);
        if (userCycle.length === 0) return res.status(403).json({ error: "Ciclo produtivo não encontrado ou sem permissão." });
      }

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
        .where(and(eq(inventoryItems.id, item.id), eq(inventoryItems.userId, dbUser.id)));

      // Record movement
      const movement = await db.insert(inventoryMovements)
        .values({
          userId: dbUser.id,
          itemId: item.id,
          type,
          quantity: parsedQty,
          date,
          description: description || null,
          cycleId: cId,
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
              inventoryMovementId: movement[0].id,
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
      const movId = parseInt(id);

      // Get movement
      const existingMov = await db.select()
        .from(inventoryMovements)
        .where(and(eq(inventoryMovements.id, movId), eq(inventoryMovements.userId, dbUser.id)))
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
          .where(and(eq(inventoryItems.id, item.id), eq(inventoryItems.userId, dbUser.id)));
      }

      // Delete linked cost if exists
      await db.delete(costs)
        .where(and(eq(costs.inventoryMovementId, movId), eq(costs.userId, dbUser.id)));

      // Delete the movement
      await db.delete(inventoryMovements)
        .where(and(eq(inventoryMovements.id, movId), eq(inventoryMovements.userId, dbUser.id)));

      res.json({ message: "Movimentação estornada com sucesso." });
    } catch (error: any) {
      console.error("Error deleting movement:", error);
      res.status(500).json({ error: "Erro ao estornar movimentação de estoque." });
    }
  });


  // 9. Financial Transactions (Contas a Pagar e Receber) CRUD
  app.get("/api/transactions", requireAuth, async (req: AuthRequest, res) => {
    try {
      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");
      
      const list = await db.select({
        id: transactions.id,
        type: transactions.type,
        description: transactions.description,
        amount: transactions.amount,
        dueDate: transactions.dueDate,
        paymentDate: transactions.paymentDate,
        status: transactions.status,
        category: transactions.category,
        cycleId: transactions.cycleId,
        createdAt: transactions.createdAt,
        cycleName: cycles.name,
      })
      .from(transactions)
      .leftJoin(cycles, eq(transactions.cycleId, cycles.id))
      .where(eq(transactions.userId, dbUser.id))
      .orderBy(desc(transactions.dueDate), desc(transactions.createdAt));

      res.json(list);
    } catch (error: any) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ error: "Erro ao buscar transações financeiras: " + error.message });
    }
  });

  app.post("/api/transactions", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { type, description, amount, dueDate, paymentDate, status, category, cycleId } = req.body;
      if (!type || !description || amount === undefined || !dueDate) {
        return res.status(400).json({ error: "Tipo, descrição, valor e data de vencimento são obrigatórios." });
      }

      const parsedAmount = parseFloat(String(amount).replace(",", "."));
      if (isNaN(parsedAmount) || parsedAmount < 0) {
        return res.status(400).json({ error: "Valor inválido ou negativo." });
      }

      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");

      let cId: number | null = null;
      if (cycleId) {
        cId = parseInt(cycleId);
        if (isNaN(cId)) return res.status(400).json({ error: "Ciclo inválido." });
        
        const userCycle = await db.select().from(cycles).where(and(eq(cycles.id, cId), eq(cycles.userId, dbUser.id))).limit(1);
        if (userCycle.length === 0) return res.status(403).json({ error: "Ciclo produtivo não encontrado ou sem permissão." });
      }

      const result = await db.insert(transactions)
        .values({
          userId: dbUser.id,
          type,
          description,
          amount: parsedAmount,
          dueDate,
          paymentDate: paymentDate || null,
          status: status || 'pending',
          category: category || null,
          cycleId: cId,
        })
        .returning();
      res.json(result[0]);
    } catch (error: any) {
      console.error("Error creating transaction:", error);
      res.status(500).json({ error: "Erro ao registrar transação financeira: " + error.message });
    }
  });

  app.put("/api/transactions/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { type, description, amount, dueDate, paymentDate, status, category, cycleId } = req.body;
      if (!type || !description || amount === undefined || !dueDate) {
        return res.status(400).json({ error: "Tipo, descrição, valor e data de vencimento são obrigatórios." });
      }

      const txId = parseInt(id);
      const parsedAmount = parseFloat(String(amount).replace(",", "."));
      if (isNaN(txId)) return res.status(400).json({ error: "ID inválido." });
      if (isNaN(parsedAmount) || parsedAmount < 0) return res.status(400).json({ error: "Valor inválido ou negativo." });

      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");

      let cId: number | null = null;
      if (cycleId) {
        cId = parseInt(cycleId);
        if (isNaN(cId)) return res.status(400).json({ error: "Ciclo inválido." });
        
        const userCycle = await db.select().from(cycles).where(and(eq(cycles.id, cId), eq(cycles.userId, dbUser.id))).limit(1);
        if (userCycle.length === 0) return res.status(403).json({ error: "Ciclo produtivo não encontrado ou sem permissão." });
      }

      const result = await db.update(transactions)
        .set({
          type,
          description,
          amount: parsedAmount,
          dueDate,
          paymentDate: paymentDate || null,
          status: status || 'pending',
          category: category || null,
          cycleId: cId,
        })
        .where(and(eq(transactions.id, txId), eq(transactions.userId, dbUser.id)))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ error: "Transação não encontrada ou sem permissão." });
      }
      res.json(result[0]);
    } catch (error: any) {
      console.error("Error updating transaction:", error);
      res.status(500).json({ error: "Erro ao editar transação financeira." });
    }
  });

  
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

  app.delete("/api/transactions/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const txId = parseInt(id);
      if (isNaN(txId)) return res.status(400).json({ error: "ID inválido." });

      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");
      
      // Delete associated costs and harvests
      await db.delete(costs).where(and(eq(costs.transactionId, txId), eq(costs.userId, dbUser.id)));
      await db.delete(harvests).where(and(eq(harvests.transactionId, txId), eq(harvests.userId, dbUser.id)));

      const result = await db.delete(transactions)
        .where(and(eq(transactions.id, txId), eq(transactions.userId, dbUser.id)))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ error: "Transação não encontrada ou sem permissão." });
      }
      res.json({ message: "Transação excluída com sucesso." });
    } catch (error: any) {
      console.error("Error deleting transaction:", error);
      res.status(500).json({ error: "Erro ao excluir transação financeira." });
    }
  });


  // 10. Schedules & Management Calendar
  app.get("/api/schedules", requireAuth, async (req: AuthRequest, res) => {
    try {
      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");
      const userSchedules = await db.select({
        id: schedules.id,
        userId: schedules.userId,
        title: schedules.title,
        type: schedules.type,
        scheduledDate: schedules.scheduledDate,
        status: schedules.status,
        priority: schedules.priority,
        description: schedules.description,
        cycleId: schedules.cycleId,
        plotId: schedules.plotId,
        completedDate: schedules.completedDate,
        costValue: schedules.costValue,
        createdAt: schedules.createdAt,
        cycleName: cycles.name,
        plotName: plots.name,
      })
      .from(schedules)
      .leftJoin(cycles, eq(schedules.cycleId, cycles.id))
      .leftJoin(plots, eq(schedules.plotId, plots.id))
      .where(eq(schedules.userId, dbUser.id))
      .orderBy(schedules.scheduledDate);

      res.json(userSchedules);
    } catch (error: any) {
      console.error("Error fetching schedules:", error);
      res.status(500).json({ error: "Erro ao carregar agendamentos de manejo." });
    }
  });

  app.post("/api/schedules", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { title, type, scheduledDate, priority, description, cycleId, plotId, costValue } = req.body;
      if (!title || !type || !scheduledDate) {
        return res.status(400).json({ error: "Título, tipo e data de agendamento são obrigatórios." });
      }

      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");

      let cId = cycleId ? parseInt(cycleId) : null;
      if (cId && isNaN(cId)) cId = null;

      let pId = plotId ? parseInt(plotId) : null;
      if (pId && isNaN(pId)) pId = null;

      const newSchedule = await db.insert(schedules).values({
        userId: dbUser.id,
        title,
        type,
        scheduledDate,
        status: 'Pendente',
        priority: priority || 'Média',
        description: description || null,
        cycleId: cId,
        plotId: pId,
        costValue: costValue !== undefined && costValue !== null && costValue !== '' ? parseFloat(costValue) : null,
      }).returning();

      res.status(201).json(newSchedule[0]);
    } catch (error: any) {
      console.error("Error creating schedule:", error);
      res.status(500).json({ error: "Erro ao criar agendamento de manejo." });
    }
  });

  app.put("/api/schedules/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const scheduleId = parseInt(id);
      if (isNaN(scheduleId)) return res.status(400).json({ error: "ID inválido." });

      const { title, type, scheduledDate, status, priority, description, cycleId, plotId, completedDate, costValue, createCostRecord } = req.body;

      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");

      const currentRecord = await db.select().from(schedules).where(and(eq(schedules.id, scheduleId), eq(schedules.userId, dbUser.id))).limit(1);
      if (currentRecord.length === 0) {
        return res.status(404).json({ error: "Agendamento não encontrado." });
      }

      let cId = cycleId !== undefined ? (cycleId ? parseInt(cycleId) : null) : currentRecord[0].cycleId;
      let pId = plotId !== undefined ? (plotId ? parseInt(plotId) : null) : currentRecord[0].plotId;

      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (type !== undefined) updateData.type = type;
      if (scheduledDate !== undefined) updateData.scheduledDate = scheduledDate;
      if (status !== undefined) updateData.status = status;
      if (priority !== undefined) updateData.priority = priority;
      if (description !== undefined) updateData.description = description;
      if (cId !== undefined) updateData.cycleId = cId;
      if (pId !== undefined) updateData.plotId = pId;
      if (completedDate !== undefined) updateData.completedDate = completedDate;
      if (costValue !== undefined) updateData.costValue = costValue !== null && costValue !== '' ? parseFloat(costValue) : null;

      const result = await db.update(schedules)
        .set(updateData)
        .where(and(eq(schedules.id, scheduleId), eq(schedules.userId, dbUser.id)))
        .returning();

      // If status changed to Concluído and createCostRecord is requested with costValue & cycleId
      const finalCostVal = costValue !== undefined ? (costValue ? parseFloat(costValue) : null) : currentRecord[0].costValue;
      if (status === 'Concluído' && createCostRecord && finalCostVal && finalCostVal > 0 && cId) {
        const costDate = completedDate || new Date().toISOString().split('T')[0];
        const categoryName = type ? (type.includes('Adubação') ? 'Adubação' : type.includes('Pulverização') ? 'Pulverização' : type.includes('Irrigação') ? 'Irrigação' : 'Mão de obra') : 'Manutenção';
        await db.insert(costs).values({
          userId: dbUser.id,
          cycleId: cId,
          date: costDate,
          category: categoryName,
          description: `${title || currentRecord[0].title} (Conclusão de Manejo)`,
          value: finalCostVal,
          paymentMethod: 'Agendamento',
          payer: 'Manejo Agrícola',
        });
      }

      res.json(result[0]);
    } catch (error: any) {
      console.error("Error updating schedule:", error);
      res.status(500).json({ error: "Erro ao atualizar agendamento." });
    }
  });

  app.delete("/api/schedules/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const scheduleId = parseInt(id);
      if (isNaN(scheduleId)) return res.status(400).json({ error: "ID inválido." });

      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");

      const result = await db.delete(schedules)
        .where(and(eq(schedules.id, scheduleId), eq(schedules.userId, dbUser.id)))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ error: "Agendamento não encontrado." });
      }
      res.json({ message: "Agendamento excluído com sucesso." });
    } catch (error: any) {
      console.error("Error deleting schedule:", error);
      res.status(500).json({ error: "Erro ao excluir agendamento." });
    }
  });

  // 10. Export All Data
  app.get("/api/export", requireAuth, async (req: AuthRequest, res) => {
    try {
      const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || "");

      const [
        userProperties,
        userActivities,
        userPlots,
        userCycles,
        userCosts,
        userHarvests,
        userInventoryItems,
        userInventoryMovements
      ] = await Promise.all([
        db.select().from(properties).where(eq(properties.userId, dbUser.id)),
        db.select().from(activities).where(eq(activities.userId, dbUser.id)),
        db.select().from(plots).where(eq(plots.userId, dbUser.id)),
        db.select().from(cycles).where(eq(cycles.userId, dbUser.id)),
        db.select().from(costs).where(eq(costs.userId, dbUser.id)),
        db.select().from(harvests).where(eq(harvests.userId, dbUser.id)),
        db.select().from(inventoryItems).where(eq(inventoryItems.userId, dbUser.id)),
        db.select().from(inventoryMovements).where(eq(inventoryMovements.userId, dbUser.id)),
      ]);

      const exportData = {
        properties: userProperties,
        activities: userActivities,
        plots: userPlots,
        cycles: userCycles,
        costs: userCosts,
        harvests: userHarvests,
        inventoryItems: userInventoryItems,
        inventoryMovements: userInventoryMovements,
        exportedAt: new Date().toISOString()
      };

      res.json(exportData);
    } catch (error: any) {
      console.error("Error exporting data:", error);
      res.status(500).json({ error: "Erro ao exportar dados." });
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
