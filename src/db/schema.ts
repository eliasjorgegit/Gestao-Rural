import { relations } from 'drizzle-orm';
import { doublePrecision, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// 1. Users Table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID or local UID
  email: text('email').notNull(),
  passwordHash: text('password_hash'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 2. Rural Property (Propriedade Rural) - One property per user in this basic setup
export const properties = pgTable('properties', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  location: text('location').notNull(),
  totalArea: doublePrecision('total_area').notNull(), // Hectares
  createdAt: timestamp('created_at').defaultNow(),
});

// 3. Catalog of Activities (Catálogo de Atividades)
export const activities = pgTable('activities', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(), // e.g. Café, Soja, Milho, Gado de Corte
  createdAt: timestamp('created_at').defaultNow(),
});

// 4. Plots / Areas (Talhões / Áreas)
export const plots = pgTable('plots', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(), // Nome ou Número do Talhão
  size: doublePrecision('size').notNull(), // Tamanho em Hectares
  soilType: text('soil_type').notNull(), // Tipo de Solo ou Relevo
  plantCount: integer('plant_count').default(0), // Número de Plantas / Pés
  variety: text('variety'), // Variedade / Espécie (ex: Catuaí Vermelho, Bourbon, Conilon)
  createdAt: timestamp('created_at').defaultNow(),
});

// 5. Productive Cycles (Ciclos Produtivos - Safras/Lotes)
// Links a "Talhão" to an "Atividade" for a period (e.g. Safra 2026/2027)
export const cycles = pgTable('cycles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  plotId: integer('plot_id')
    .references(() => plots.id, { onDelete: 'cascade' })
    .notNull(),
  activityId: integer('activity_id')
    .references(() => activities.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(), // e.g., "Safra 2026/2027", "Lote B"
  startDate: text('start_date').notNull(), // YYYY-MM-DD
  endDate: text('end_date').notNull(), // YYYY-MM-DD
  status: text('status').notNull().default('Ativo'), // Ativo, Concluído
  createdAt: timestamp('created_at').defaultNow(),
});

// 6. Inventory Items Table (Controle de Estoque)
export const inventoryItems = pgTable('inventory_items', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  category: text('category').notNull(), // 'Adubos', 'Defensivos Agrícolas', 'Ferramentas', 'Mantimentos', 'Outros'
  quantity: doublePrecision('quantity').notNull().default(0),
  unit: text('unit').notNull(), // 'kg', 'L', 'unidades', 'sacos', etc.
  minQuantity: doublePrecision('min_quantity').notNull().default(0),
  unitCost: doublePrecision('unit_cost').notNull().default(0),
  location: text('location'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 7. Stock Movements Table (Histórico de Entrada e Saída)
export const inventoryMovements = pgTable('inventory_movements', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  itemId: integer('item_id')
    .references(() => inventoryItems.id, { onDelete: 'cascade' })
    .notNull(),
  type: text('type').notNull(), // 'entrada' | 'saida'
  quantity: doublePrecision('quantity').notNull(),
  date: text('date').notNull(), // YYYY-MM-DD
  description: text('description'),
  cycleId: integer('cycle_id')
    .references(() => cycles.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
});

// 8. Cost Records (Lançamento de Custos)
export const costs = pgTable('costs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  cycleId: integer('cycle_id')
    .references(() => cycles.id, { onDelete: 'cascade' })
    .notNull(),
  date: text('date').notNull(), // YYYY-MM-DD
  category: text('category').notNull(), // Adubação, Manutenção, Mão de Obra, Plantio, Irrigação, Pulverização, Agrotóxicos, etc.
  description: text('description').notNull(),
  value: doublePrecision('value').notNull(), // R$
  paymentMethod: text('payment_method'), // Dinheiro, Cheque, Cartão, Pix
  payer: text('payer'), // Name of the person who paid
  inventoryMovementId: integer('inventory_movement_id')
    .references(() => inventoryMovements.id, { onDelete: 'set null' }),
  transactionId: integer('transaction_id')
    .references(() => transactions.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
});

// 9. Production/Harvest Records (Registro de Produção/Colheita)
export const harvests = pgTable('harvests', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  cycleId: integer('cycle_id')
    .references(() => cycles.id, { onDelete: 'cascade' })
    .notNull(),
  date: text('date').notNull(), // YYYY-MM-DD
  quantity: doublePrecision('quantity').notNull(), // sacas, kg, toneladas, arrobas, etc.
  unit: text('unit').notNull(), // e.g. sacas, kg, toneladas, arrobas
  pricePerUnit: doublePrecision('price_per_unit').notNull(), // R$ médio de venda unitário
  transactionId: integer('transaction_id')
    .references(() => transactions.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
});

// 10. Financial Transactions (Contas a Pagar e Receber)
export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  type: text('type').notNull(), // 'payable' (A Pagar) | 'receivable' (A Receber)
  description: text('description').notNull(),
  amount: doublePrecision('amount').notNull(),
  dueDate: text('due_date').notNull(), // YYYY-MM-DD
  paymentDate: text('payment_date'), // YYYY-MM-DD
  status: text('status').notNull().default('pending'), // 'pending' | 'paid'
  category: text('category'), // e.g., 'Insumos', 'Venda de Safra', 'Mão de obra'
  cycleId: integer('cycle_id')
    .references(() => cycles.id, { onDelete: 'set null' }), // Optional linkage to a cycle
  createdAt: timestamp('created_at').defaultNow(),
});

// 11. Handling Schedules & Management Calendar (Calendário de Manejo e Agendamentos)
export const schedules = pgTable('schedules', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  type: text('type').notNull(), // 'Adubação', 'Pulverização / Defensivo', 'Irrigação', 'Poda / Roçagem', 'Análise de Solo', 'Outro'
  scheduledDate: text('scheduled_date').notNull(), // YYYY-MM-DD
  status: text('status').notNull().default('Pendente'), // 'Pendente' | 'Concluído' | 'Cancelado'
  priority: text('priority').notNull().default('Média'), // 'Baixa' | 'Média' | 'Alta'
  description: text('description'),
  cycleId: integer('cycle_id')
    .references(() => cycles.id, { onDelete: 'set null' }),
  plotId: integer('plot_id')
    .references(() => plots.id, { onDelete: 'set null' }),
  completedDate: text('completed_date'), // YYYY-MM-DD
  costValue: doublePrecision('cost_value'), // Optional cost when completed
  createdAt: timestamp('created_at').defaultNow(),
});

// --- Relations ---

export const usersRelations = relations(users, ({ many }) => ({
  properties: many(properties),
  activities: many(activities),
  plots: many(plots),
  cycles: many(cycles),
  costs: many(costs),
  harvests: many(harvests),
  inventoryItems: many(inventoryItems),
  inventoryMovements: many(inventoryMovements),
  transactions: many(transactions),
  schedules: many(schedules),
}));

export const propertiesRelations = relations(properties, ({ one }) => ({
  user: one(users, {
    fields: [properties.userId],
    references: [users.id],
  }),
}));

export const activitiesRelations = relations(activities, ({ one, many }) => ({
  user: one(users, {
    fields: [activities.userId],
    references: [users.id],
  }),
  cycles: many(cycles),
}));

export const plotsRelations = relations(plots, ({ one, many }) => ({
  user: one(users, {
    fields: [plots.userId],
    references: [users.id],
  }),
  cycles: many(cycles),
}));

export const cyclesRelations = relations(cycles, ({ one, many }) => ({
  user: one(users, {
    fields: [cycles.userId],
    references: [users.id],
  }),
  plot: one(plots, {
    fields: [cycles.plotId],
    references: [plots.id],
  }),
  activity: one(activities, {
    fields: [cycles.activityId],
    references: [activities.id],
  }),
  costs: many(costs),
  harvests: many(harvests),
  inventoryMovements: many(inventoryMovements),
  transactions: many(transactions),
}));

export const costsRelations = relations(costs, ({ one }) => ({
  user: one(users, {
    fields: [costs.userId],
    references: [users.id],
  }),
  cycle: one(cycles, {
    fields: [costs.cycleId],
    references: [cycles.id],
  }),
}));

export const harvestsRelations = relations(harvests, ({ one }) => ({
  user: one(users, {
    fields: [harvests.userId],
    references: [users.id],
  }),
  cycle: one(cycles, {
    fields: [harvests.cycleId],
    references: [cycles.id],
  }),
}));

// Relations for Inventory
export const inventoryItemsRelations = relations(inventoryItems, ({ one, many }) => ({
  user: one(users, {
    fields: [inventoryItems.userId],
    references: [users.id],
  }),
  movements: many(inventoryMovements),
}));

export const inventoryMovementsRelations = relations(inventoryMovements, ({ one }) => ({
  user: one(users, {
    fields: [inventoryMovements.userId],
    references: [users.id],
  }),
  item: one(inventoryItems, {
    fields: [inventoryMovements.itemId],
    references: [inventoryItems.id],
  }),
  cycle: one(cycles, {
    fields: [inventoryMovements.cycleId],
    references: [cycles.id],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  cycle: one(cycles, {
    fields: [transactions.cycleId],
    references: [cycles.id],
  }),
}));

export const schedulesRelations = relations(schedules, ({ one }) => ({
  user: one(users, {
    fields: [schedules.userId],
    references: [users.id],
  }),
  cycle: one(cycles, {
    fields: [schedules.cycleId],
    references: [cycles.id],
  }),
  plot: one(plots, {
    fields: [schedules.plotId],
    references: [plots.id],
  }),
}));
