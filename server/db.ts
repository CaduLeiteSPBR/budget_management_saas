import { eq, and, gte, lte, desc, asc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  categories, 
  transactions, 
  subscriptions, 
  subscriptionHistory,
  installments,
  budgets,
  aiLearning,
  type Category,
  type Transaction,
  type Subscription,
  type SubscriptionHistory,
  type Installment,
  type Budget,
  type AiLearning,
  type InsertCategory,
  type InsertTransaction,
  type InsertSubscription,
  type InsertSubscriptionHistory,
  type InsertInstallment,
  type InsertBudget,
  type InsertAiLearning,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ==================== USER MANAGEMENT ====================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(users).orderBy(desc(users.createdAt));
}

export async function updateUserRole(userId: number, role: "user" | "admin") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

// ==================== CATEGORIES ====================

export async function createCategory(data: InsertCategory): Promise<Category> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(categories).values(data);
  const insertId = Number((result as any).insertId);
  if (isNaN(insertId)) {
    throw new Error("Failed to get insertId after creating category");
  }
  const [newCategory] = await db.select().from(categories).where(eq(categories.id, insertId));
  return newCategory!;
}

export async function getUserCategories(userId: number): Promise<Category[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(categories).where(eq(categories.userId, userId)).orderBy(asc(categories.name));
}

export async function updateCategory(id: number, userId: number, data: Partial<InsertCategory>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(categories).set(data).where(and(eq(categories.id, id), eq(categories.userId, userId)));
}

export async function deleteCategory(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(categories).where(and(eq(categories.id, id), eq(categories.userId, userId)));
}

// ==================== TRANSACTIONS ====================

export async function createTransaction(data: InsertTransaction): Promise<Transaction> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(transactions).values(data);
  const insertId = Number((result as any).insertId);
  if (isNaN(insertId)) {
    throw new Error("Failed to get insertId after creating transaction");
  }
  const [newTransaction] = await db.select().from(transactions).where(eq(transactions.id, insertId));
  return newTransaction!;
}

export async function getUserTransactions(userId: number, startDate?: number, endDate?: number): Promise<Transaction[]> {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select().from(transactions).where(eq(transactions.userId, userId));
  
  if (startDate && endDate) {
    query = db.select().from(transactions).where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate)
      )
    );
  }
  
  return await query.orderBy(desc(transactions.date));
}

export async function updateTransaction(id: number, userId: number, data: Partial<InsertTransaction>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(transactions).set(data).where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
}

export async function deleteTransaction(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
}

export async function getUserBalance(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db
    .select({
      total: sql<string>`SUM(CASE WHEN ${transactions.nature} = 'Entrada' THEN ${transactions.amount} ELSE -${transactions.amount} END)`
    })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.isPaid, true)));
  
  return Number(result[0]?.total || 0);
}

// ==================== SUBSCRIPTIONS ====================

export async function createSubscription(data: InsertSubscription): Promise<Subscription> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(subscriptions).values(data);
  const insertId = Number((result as any).insertId);
  if (isNaN(insertId)) {
    throw new Error("Failed to get insertId after creating subscription");
  }
  const [newSubscription] = await db.select().from(subscriptions).where(eq(subscriptions.id, insertId));
  
  // Criar histórico inicial
  await db.insert(subscriptionHistory).values({
    subscriptionId: newSubscription!.id,
    amount: data.currentAmount,
    effectiveDate: data.startDate,
  });
  
  return newSubscription!;
}

export async function getUserSubscriptions(userId: number): Promise<Subscription[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).orderBy(desc(subscriptions.createdAt));
}

export async function updateSubscription(id: number, userId: number, data: Partial<InsertSubscription>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(subscriptions).set(data).where(and(eq(subscriptions.id, id), eq(subscriptions.userId, userId)));
}

export async function updateSubscriptionAmount(id: number, userId: number, newAmount: string, effectiveDate: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Atualizar valor atual
  await db.update(subscriptions).set({ currentAmount: newAmount }).where(and(eq(subscriptions.id, id), eq(subscriptions.userId, userId)));
  
  // Adicionar ao histórico
  await db.insert(subscriptionHistory).values({
    subscriptionId: id,
    amount: newAmount,
    effectiveDate,
  });
}

export async function getSubscriptionHistory(subscriptionId: number): Promise<SubscriptionHistory[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(subscriptionHistory).where(eq(subscriptionHistory.subscriptionId, subscriptionId)).orderBy(desc(subscriptionHistory.effectiveDate));
}

// ==================== INSTALLMENTS ====================

export async function createInstallment(data: InsertInstallment): Promise<Installment> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(installments).values(data);
  const insertId = Number((result as any).insertId);
  if (isNaN(insertId)) {
    throw new Error("Failed to get insertId after creating installment");
  }
  const [newInstallment] = await db.select().from(installments).where(eq(installments.id, insertId));
  
  // Criar transações para cada parcela
  const installmentId = newInstallment!.id;
  const firstDueDate = new Date(data.firstDueDate);
  
  for (let i = 0; i < data.totalInstallments; i++) {
    const dueDate = new Date(firstDueDate);
    dueDate.setMonth(dueDate.getMonth() + i);
    
    await db.insert(transactions).values({
      userId: data.userId,
      description: `${data.description} (${i + 1}/${data.totalInstallments})`,
      amount: data.installmentAmount,
      nature: "Saída",
      categoryId: data.categoryId,
      division: data.division,
      type: data.type,
      date: dueDate.getTime(),
      isInstallment: true,
      installmentId,
      installmentNumber: i + 1,
      totalInstallments: data.totalInstallments,
      isPaid: i === 0, // Primeira parcela já paga
      notes: data.notes,
    });
  }
  
  return newInstallment!;
}

export async function getUserInstallments(userId: number): Promise<Installment[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(installments).where(eq(installments.userId, userId)).orderBy(desc(installments.createdAt));
}

export async function getInstallmentTransactions(installmentId: number): Promise<Transaction[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(transactions).where(eq(transactions.installmentId, installmentId)).orderBy(asc(transactions.installmentNumber));
}

// ==================== BUDGETS ====================

export async function createOrUpdateBudget(data: InsertBudget): Promise<Budget> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Verificar se já existe
  const existing = await db.select().from(budgets).where(
    and(
      eq(budgets.userId, data.userId),
      eq(budgets.monthYear, data.monthYear),
      data.division ? eq(budgets.division, data.division) : sql`${budgets.division} IS NULL`,
      data.type ? eq(budgets.type, data.type) : sql`${budgets.type} IS NULL`
    )
  ).limit(1);
  
  if (existing.length > 0) {
    await db.update(budgets).set({ targetPercentage: data.targetPercentage }).where(eq(budgets.id, existing[0]!.id));
    return existing[0]!;
  }
  
  const result = await db.insert(budgets).values(data);
  const insertId = Number((result as any).insertId);
  if (isNaN(insertId)) {
    throw new Error("Failed to get insertId after creating budget");
  }
  const [newBudget] = await db.select().from(budgets).where(eq(budgets.id, insertId));
  return newBudget!;
}

export async function getUserBudgets(userId: number, monthYear: string): Promise<Budget[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(budgets).where(and(eq(budgets.userId, userId), eq(budgets.monthYear, monthYear)));
}

// ==================== AI LEARNING ====================

export async function recordAiLearning(data: InsertAiLearning) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Verificar se já existe padrão similar
  const existing = await db.select().from(aiLearning).where(
    and(
      eq(aiLearning.userId, data.userId),
      eq(aiLearning.description, data.description)
    )
  ).limit(1);
  
  if (existing.length > 0) {
    // Incrementar frequência
    await db.update(aiLearning).set({
      frequency: existing[0]!.frequency + 1,
      lastUsed: new Date(),
      nature: data.nature,
      categoryId: data.categoryId,
      division: data.division,
      type: data.type,
    }).where(eq(aiLearning.id, existing[0]!.id));
  } else {
    await db.insert(aiLearning).values(data);
  }
}

export async function getAiLearningPatterns(userId: number, description: string): Promise<AiLearning[]> {
  const db = await getDb();
  if (!db) return [];
  
  // Buscar padrões similares (case-insensitive)
  const patterns = await db.select().from(aiLearning).where(
    and(
      eq(aiLearning.userId, userId),
      sql`LOWER(${aiLearning.description}) LIKE LOWER(${`%${description}%`})`
    )
  ).orderBy(desc(aiLearning.frequency), desc(aiLearning.lastUsed)).limit(5);
  
  return patterns;
}
