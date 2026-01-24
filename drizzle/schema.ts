import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, bigint } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Categorias customizáveis por usuário
 * Hierarquia: Divisão > Tipo > Categoria
 */
export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  division: mysqlEnum("division", ["Pessoal", "Familiar", "Investimento"]).notNull(),
  type: mysqlEnum("type", ["Essencial", "Importante", "Conforto", "Investimento"]).notNull(),
  color: varchar("color", { length: 20 }), // Cor para visualização
  icon: varchar("icon", { length: 50 }), // Ícone opcional
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

/**
 * Lançamentos financeiros (Entradas e Saídas)
 */
export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  nature: mysqlEnum("nature", ["Entrada", "Saída"]).notNull(),
  categoryId: int("categoryId"),
  division: mysqlEnum("division", ["Pessoal", "Familiar", "Investimento"]),
  type: mysqlEnum("type", ["Essencial", "Importante", "Conforto", "Investimento"]),
  date: bigint("date", { mode: "number" }).notNull(), // Unix timestamp em ms
  isRecurring: boolean("isRecurring").default(false).notNull(),
  recurringId: int("recurringId"), // Referência para assinatura recorrente
  isInstallment: boolean("isInstallment").default(false).notNull(),
  installmentId: int("installmentId"), // Referência para parcelamento
  installmentNumber: int("installmentNumber"), // Número da parcela (1/12, 2/12, etc)
  totalInstallments: int("totalInstallments"), // Total de parcelas
  isPaid: boolean("isPaid").default(true).notNull(), // Para parcelas futuras
  isSystemGenerated: boolean("isSystemGenerated").default(false).notNull(), // Saldo Inicial automático
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

/**
 * Assinaturas recorrentes mensais
 */
export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  description: text("description").notNull(),
  currentAmount: decimal("currentAmount", { precision: 15, scale: 2 }).notNull(),
  categoryId: int("categoryId"),
  division: mysqlEnum("division", ["Pessoal", "Familiar", "Investimento"]),
  type: mysqlEnum("type", ["Essencial", "Importante", "Conforto", "Investimento"]),
  startDate: bigint("startDate", { mode: "number" }).notNull(), // Unix timestamp em ms
  dayOfMonth: int("dayOfMonth").notNull(), // Dia do mês para cobrança (1-31)
  isActive: boolean("isActive").default(true).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

/**
 * Histórico de valores de assinaturas (preserva mudanças de valor)
 */
export const subscriptionHistory = mysqlTable("subscription_history", {
  id: int("id").autoincrement().primaryKey(),
  subscriptionId: int("subscriptionId").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  effectiveDate: bigint("effectiveDate", { mode: "number" }).notNull(), // Unix timestamp em ms
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SubscriptionHistory = typeof subscriptionHistory.$inferSelect;
export type InsertSubscriptionHistory = typeof subscriptionHistory.$inferInsert;

/**
 * Parcelamentos de compras
 */
export const installments = mysqlTable("installments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  description: text("description").notNull(),
  totalAmount: decimal("totalAmount", { precision: 15, scale: 2 }).notNull(),
  installmentAmount: decimal("installmentAmount", { precision: 15, scale: 2 }).notNull(),
  totalInstallments: int("totalInstallments").notNull(),
  categoryId: int("categoryId"),
  division: mysqlEnum("division", ["Pessoal", "Familiar", "Investimento"]),
  type: mysqlEnum("type", ["Essencial", "Importante", "Conforto", "Investimento"]),
  firstDueDate: bigint("firstDueDate", { mode: "number" }).notNull(), // Unix timestamp em ms
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Installment = typeof installments.$inferSelect;
export type InsertInstallment = typeof installments.$inferInsert;

/**
 * Metas de orçamento (budgeting)
 */
export const budgets = mysqlTable("budgets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  division: mysqlEnum("division", ["Pessoal", "Familiar", "Investimento"]),
  type: mysqlEnum("type", ["Essencial", "Importante", "Conforto", "Investimento"]),
  targetPercentage: decimal("targetPercentage", { precision: 5, scale: 2 }).notNull(), // 0-100
  monthYear: varchar("monthYear", { length: 7 }).notNull(), // Formato: "2026-01"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Budget = typeof budgets.$inferSelect;
export type InsertBudget = typeof budgets.$inferInsert;

/**
 * Aprendizado da IA para categorização
 * Armazena padrões de descrição -> categoria para melhorar sugestões
 */
export const aiLearning = mysqlTable("ai_learning", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  description: text("description").notNull(),
  nature: mysqlEnum("nature", ["Entrada", "Saída"]).notNull(),
  categoryId: int("categoryId"),
  division: mysqlEnum("division", ["Pessoal", "Familiar", "Investimento"]),
  type: mysqlEnum("type", ["Essencial", "Importante", "Conforto", "Investimento"]),
  frequency: int("frequency").default(1).notNull(), // Quantas vezes foi usado
  lastUsed: timestamp("lastUsed").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AiLearning = typeof aiLearning.$inferSelect;
export type InsertAiLearning = typeof aiLearning.$inferInsert;
