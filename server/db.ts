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
  
  // Get insertId from result
  let insertId: number;
  if (typeof result === 'object' && result !== null) {
    if ('insertId' in result && typeof result.insertId === 'bigint') {
      insertId = Number(result.insertId);
    } else if ('insertId' in result && typeof result.insertId === 'number') {
      insertId = result.insertId;
    } else {
      // Fallback: query the last inserted record
      const [lastCategory] = await db
        .select()
        .from(categories)
        .where(eq(categories.userId, data.userId))
        .orderBy(desc(categories.id))
        .limit(1);
      if (!lastCategory) throw new Error("Failed to retrieve created category");
      return lastCategory;
    }
  } else {
    throw new Error("Unexpected result format from insert operation");
  }
  
  if (isNaN(insertId)) {
    throw new Error("Failed to get valid insertId after creating category");
  }
  
  const [newCategory] = await db.select().from(categories).where(eq(categories.id, insertId));
  if (!newCategory) throw new Error("Failed to retrieve created category");
  return newCategory;
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
  
  // Get insertId from result
  let insertId: number;
  if (typeof result === 'object' && result !== null) {
    if ('insertId' in result && typeof result.insertId === 'bigint') {
      insertId = Number(result.insertId);
    } else if ('insertId' in result && typeof result.insertId === 'number') {
      insertId = result.insertId;
    } else {
      // Fallback: query the last inserted record
      const [lastTransaction] = await db
        .select()
        .from(transactions)
        .where(eq(transactions.userId, data.userId))
        .orderBy(desc(transactions.id))
        .limit(1);
      if (!lastTransaction) throw new Error("Failed to retrieve created transaction");
      return lastTransaction;
    }
  } else {
    throw new Error("Unexpected result format from insert operation");
  }
  
  if (isNaN(insertId)) {
    throw new Error("Failed to get valid insertId after creating transaction");
  }
  
  const [newTransaction] = await db.select().from(transactions).where(eq(transactions.id, insertId));
  if (!newTransaction) throw new Error("Failed to retrieve created transaction");
  return newTransaction;
}

export async function getUserTransactions(userId: number, startDate?: number, endDate?: number) {
  const db = await getDb();
  if (!db) return [];
  
  let baseConditions = [eq(transactions.userId, userId)];
  
  if (startDate && endDate) {
    baseConditions.push(gte(transactions.date, startDate));
    baseConditions.push(lte(transactions.date, endDate));
  }
  
  const results = await db
    .select({
      id: transactions.id,
      userId: transactions.userId,
      description: transactions.description,
      amount: transactions.amount,
      nature: transactions.nature,
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      division: transactions.division,
      type: transactions.type,
      date: transactions.date,
      notes: transactions.notes,
      createdAt: transactions.createdAt,
      updatedAt: transactions.updatedAt,
      isRecurring: transactions.isRecurring,
      recurringId: transactions.recurringId,
      isInstallment: transactions.isInstallment,
      installmentId: transactions.installmentId,
      installmentNumber: transactions.installmentNumber,
      totalInstallments: transactions.totalInstallments,
      isPaid: transactions.isPaid,
      isSystemGenerated: transactions.isSystemGenerated,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(...baseConditions))
    .orderBy(desc(transactions.date));
  
  return results;
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
  
  // Get insertId from result
  let insertId: number;
  if (typeof result === 'object' && result !== null) {
    if ('insertId' in result && typeof result.insertId === 'bigint') {
      insertId = Number(result.insertId);
    } else if ('insertId' in result && typeof result.insertId === 'number') {
      insertId = result.insertId;
    } else {
      // Fallback: query the last inserted record
      const [lastSubscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, data.userId))
        .orderBy(desc(subscriptions.id))
        .limit(1);
      if (!lastSubscription) throw new Error("Failed to retrieve created subscription");
      
      // Criar histórico inicial
      await db.insert(subscriptionHistory).values({
        subscriptionId: lastSubscription.id,
        amount: data.currentAmount,
        effectiveDate: data.startDate,
      });
      
      return lastSubscription;
    }
  } else {
    throw new Error("Unexpected result format from insert operation");
  }
  
  if (isNaN(insertId)) {
    throw new Error("Failed to get valid insertId after creating subscription");
  }
  
  const [newSubscription] = await db.select().from(subscriptions).where(eq(subscriptions.id, insertId));
  if (!newSubscription) throw new Error("Failed to retrieve created subscription");
  
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
  
  // Get insertId from result
  let insertId: number;
  if (typeof result === 'object' && result !== null) {
    if ('insertId' in result && typeof result.insertId === 'bigint') {
      insertId = Number(result.insertId);
    } else if ('insertId' in result && typeof result.insertId === 'number') {
      insertId = result.insertId;
    } else {
      // Fallback: query the last inserted record
      const [lastInstallment] = await db
        .select()
        .from(installments)
        .where(eq(installments.userId, data.userId))
        .orderBy(desc(installments.id))
        .limit(1);
      if (!lastInstallment) throw new Error("Failed to retrieve created installment");
      return lastInstallment;
    }
  } else {
    throw new Error("Unexpected result format from insert operation");
  }
  
  if (isNaN(insertId)) {
    throw new Error("Failed to get valid insertId after creating installment");
  }
  
  const [newInstallment] = await db.select().from(installments).where(eq(installments.id, insertId));
  if (!newInstallment) throw new Error("Failed to retrieve created installment");
  
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

export async function getAiLearningHistory(userId: number): Promise<AiLearning[]> {
  const db = await getDb();
  if (!db) return [];
  
  // Buscar todo o histórico de aprendizado do usuário, ordenado por frequência
  const history = await db.select().from(aiLearning).where(
    eq(aiLearning.userId, userId)
  ).orderBy(desc(aiLearning.frequency), desc(aiLearning.lastUsed)).limit(50);
  
  return history;
}

// ==================== SALDO INICIAL AUTOMÁTICO ====================

/**
 * Calcula o saldo final de um mês específico
 * @param userId ID do usuário
 * @param year Ano (ex: 2026)
 * @param month Mês (1-12)
 * @returns Saldo final do mês (Entradas - Saídas)
 */
export async function calculateMonthEndBalance(userId: number, year: number, month: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  // Calcular timestamps UTC para início e fim do mês
  const monthStart = Date.UTC(year, month - 1, 1, 0, 0, 0, 0);
  const monthEnd = Date.UTC(year, month, 0, 23, 59, 59, 999);
  
  // Somar todas as transações do mês (Entradas - Saídas)
  const result = await db
    .select({
      total: sql<string>`SUM(CASE WHEN ${transactions.nature} = 'Entrada' THEN ${transactions.amount} ELSE -${transactions.amount} END)`
    })
    .from(transactions)
    .where(and(
      eq(transactions.userId, userId),
      gte(transactions.date, monthStart),
      lte(transactions.date, monthEnd)
    ));
  
  return Number(result[0]?.total || 0);
}

/**
 * Recalcula saldos iniciais em cascata a partir de um mês específico
 * @param userId ID do usuário
 * @param fromYear Ano inicial
 * @param fromMonth Mês inicial (1-12)
 */
export async function recalculateInitialBalances(userId: number, fromYear: number, fromMonth: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Calcular saldo final do mês anterior
  let previousBalance = 0;
  if (fromMonth === 1) {
    // Se é Janeiro, pegar saldo final de Dezembro do ano anterior
    previousBalance = await calculateMonthEndBalance(userId, fromYear - 1, 12);
  } else {
    // Senão, pegar saldo final do mês anterior
    previousBalance = await calculateMonthEndBalance(userId, fromYear, fromMonth - 1);
  }
  
  // Iterar de fromYear/fromMonth até Dezembro/2030
  let currentYear = fromYear;
  let currentMonth = fromMonth;
  
  while (currentYear < 2031) {
    // Data do saldo inicial: dia 01 do mês às 00:00:00 UTC
    const initialBalanceDate = Date.UTC(currentYear, currentMonth - 1, 1, 0, 0, 0, 0);
    
    // Buscar se já existe saldo inicial para este mês
    const existingBalance = await db
      .select()
      .from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        eq(transactions.isSystemGenerated, true),
        eq(transactions.date, initialBalanceDate)
      ))
      .limit(1);
    
    if (existingBalance.length > 0) {
      // Atualizar saldo inicial existente
      await db
        .update(transactions)
        .set({ amount: previousBalance.toFixed(2) })
        .where(eq(transactions.id, existingBalance[0].id));
    } else {
      // Criar novo saldo inicial
      await db.insert(transactions).values({
        userId,
        description: "Saldo Inicial",
        amount: previousBalance.toFixed(2),
        nature: "Entrada",
        division: "Pessoal",
        type: "Essencial",
        date: initialBalanceDate,
        isSystemGenerated: true,
        isPaid: true,
        notes: "Saldo inicial automático gerado pelo sistema",
      });
    }
    
    // Calcular saldo final do mês atual para usar como saldo inicial do próximo mês
    previousBalance = await calculateMonthEndBalance(userId, currentYear, currentMonth);
    
    // Avançar para o próximo mês
    currentMonth++;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }
  }
}

/**
 * Inicializa saldos iniciais automáticos de Fevereiro/2026 até Dezembro/2030
 * @param userId ID do usuário
 */
export async function initializeMonthlyBalances(userId: number): Promise<void> {
  // Janeiro/2026 não tem saldo inicial (mês de partida)
  // Começar de Fevereiro/2026
  await recalculateInitialBalances(userId, 2026, 2);
}
