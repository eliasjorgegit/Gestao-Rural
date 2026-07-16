import { relations } from 'drizzle-orm';
import { doublePrecision, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// 1. Users Table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
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

// 6. Cost Records (Lançamento de Custos)
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
  createdAt: timestamp('created_at').defaultNow(),
});

// 7. Production/Harvest Records (Registro de Produção/Colheita)
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
