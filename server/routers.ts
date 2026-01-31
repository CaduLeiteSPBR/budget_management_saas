import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { invokeLLM } from "./_core/llm";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ==================== ADMIN ====================
  admin: router({
    listUsers: adminProcedure.query(async () => {
      return await db.getAllUsers();
    }),
    
    updateUserRole: adminProcedure
      .input(z.object({
        userId: z.number(),
        role: z.enum(["user", "admin"]),
      }))
      .mutation(async ({ input }) => {
        await db.updateUserRole(input.userId, input.role);
        return { success: true };
      }),
  }),

  // ==================== CATEGORIES ====================
  categories: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserCategories(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        division: z.enum(["Pessoal", "Familiar", "Investimento"]),
        type: z.enum(["Essencial", "Importante", "Conforto", "Investimento"]),
        color: z.string().optional(),
        icon: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.createCategory({
          userId: ctx.user.id,
          ...input,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(100).optional(),
        color: z.string().optional(),
        icon: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateCategory(id, ctx.user.id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteCategory(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ==================== TRANSACTIONS ====================
  transactions: router({
    list: protectedProcedure
      .input(z.object({
        startDate: z.number().optional(),
        endDate: z.number().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        return await db.getUserTransactions(
          ctx.user.id,
          input?.startDate,
          input?.endDate
        );
      }),

    create: protectedProcedure
      .input(z.object({
        description: z.string().min(1),
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
        nature: z.enum(["Entrada", "Saída"]),
        categoryId: z.number().optional(),
        division: z.enum(["Pessoal", "Familiar", "Investimento"]).optional(),
        type: z.enum(["Essencial", "Importante", "Conforto", "Investimento"]).optional(),
        date: z.number(),
        notes: z.string().optional(),
        paymentType: z.enum(["single", "installment", "recurring"]),
        installments: z.number().min(2).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { paymentType, installments, ...transactionData } = input;

        // Criar transação principal
        const transaction = await db.createTransaction({
          userId: ctx.user.id,
          ...transactionData,
        });

        // Se for parcelado, criar as parcelas futuras
        if (paymentType === "installment" && installments) {
          const installmentAmount = (Number(input.amount) / installments).toFixed(2);
          const baseDate = new Date(input.date);
          
          // Criar parcelas futuras (começa do mês seguinte)
          for (let i = 1; i < installments; i++) {
            const futureDate = new Date(baseDate);
            futureDate.setUTCMonth(futureDate.getUTCMonth() + i);
            
            await db.createTransaction({
              userId: ctx.user.id,
              description: `${input.description} (${i + 1}/${installments})`,
              amount: installmentAmount,
              nature: input.nature,
              categoryId: input.categoryId,
              division: input.division,
              type: input.type,
              date: futureDate.getTime(),
              notes: input.notes ? `${input.notes} | Parcela ${i + 1}/${installments}` : `Parcela ${i + 1}/${installments}`,
            });
          }

          // Atualizar primeira transação com informação de parcela
          await db.updateTransaction(transaction.id, ctx.user.id, {
            description: `${input.description} (1/${installments})`,
            amount: installmentAmount,
            notes: input.notes ? `${input.notes} | Parcela 1/${installments}` : `Parcela 1/${installments}`,
          });
        }

        // Se for recorrente, criar assinatura
        if (paymentType === "recurring") {
          const baseDate = new Date(input.date);
          await db.createSubscription({
            userId: ctx.user.id,
            description: input.description,
            currentAmount: input.amount,
            dayOfMonth: baseDate.getUTCDate(),
            categoryId: input.categoryId,
            division: input.division,
            type: input.type,
            startDate: input.date,
            notes: input.notes,
          });
        }

        // Registrar padrão para IA
        if (input.categoryId || input.division || input.type) {
          await db.recordAiLearning({
            userId: ctx.user.id,
            description: input.description,
            nature: input.nature,
            categoryId: input.categoryId,
            division: input.division,
            type: input.type,
          });
        }

        // Recalcular saldos iniciais em cascata
        const transactionDate = new Date(input.date);
        const transactionMonth = transactionDate.getUTCMonth() + 1;
        const transactionYear = transactionDate.getUTCFullYear();
        
        // Recalcular a partir do mês seguinte
        let nextMonth = transactionMonth + 1;
        let nextYear = transactionYear;
        if (nextMonth > 12) {
          nextMonth = 1;
          nextYear++;
        }
        await db.recalculateInitialBalances(ctx.user.id, nextYear, nextMonth);

        return transaction;
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        description: z.string().min(1).optional(),
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
        nature: z.enum(["Entrada", "Sa\u00edda"]).optional(),
        categoryId: z.number().optional(),
        division: z.enum(["Pessoal", "Familiar", "Investimento"]).optional(),
        type: z.enum(["Essencial", "Importante", "Conforto", "Investimento"]).optional(),
        date: z.number().optional(),
        isPaid: z.boolean().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        
        // Buscar transação original para pegar a data
        const transactions = await db.getUserTransactions(ctx.user.id);
        const originalTransaction = transactions.find(t => t.id === id);
        
        await db.updateTransaction(id, ctx.user.id, data);
        
        // Recalcular saldos iniciais em cascata
        if (originalTransaction) {
          const transactionDate = new Date(data.date || originalTransaction.date);
          const transactionMonth = transactionDate.getUTCMonth() + 1;
          const transactionYear = transactionDate.getUTCFullYear();
          
          // Recalcular a partir do mês seguinte
          let nextMonth = transactionMonth + 1;
          let nextYear = transactionYear;
          if (nextMonth > 12) {
            nextMonth = 1;
            nextYear++;
          }
          await db.recalculateInitialBalances(ctx.user.id, nextYear, nextMonth);
        }
        
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Buscar transação antes de excluir para verificar se é gerada pelo sistema
        const transactions = await db.getUserTransactions(ctx.user.id);
        const transaction = transactions.find(t => t.id === input.id);
        
        if (!transaction) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Transação não encontrada' });
        }
        
        // Proteger exclusão de saldos iniciais gerados pelo sistema
        if (transaction.isSystemGenerated) {
          throw new TRPCError({ 
            code: 'FORBIDDEN', 
            message: 'Não é possível excluir saldos iniciais gerados automaticamente pelo sistema' 
          });
        }
        
        const transactionDate = new Date(transaction.date);
        const transactionMonth = transactionDate.getUTCMonth() + 1;
        const transactionYear = transactionDate.getUTCFullYear();
        
        await db.deleteTransaction(input.id, ctx.user.id);
        
        // Recalcular saldos iniciais em cascata
        let nextMonth = transactionMonth + 1;
        let nextYear = transactionYear;
        if (nextMonth > 12) {
          nextMonth = 1;
          nextYear++;
        }
        await db.recalculateInitialBalances(ctx.user.id, nextYear, nextMonth);
        
        return { success: true };
      }),

    balance: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserBalance(ctx.user.id);
    }),

    // Inicializar saldos iniciais automáticos (Fev/2026 - Dez/2030)
    initializeBalances: protectedProcedure.mutation(async ({ ctx }) => {
      await db.initializeMonthlyBalances(ctx.user.id);
      return { success: true, message: 'Saldos iniciais gerados com sucesso!' };
    }),

    // Processar arquivo de fatura
    processInvoice: protectedProcedure
      .input(z.object({
        fileContent: z.string(), // Base64 ou texto
        fileType: z.enum(["pdf", "csv", "ofx"]),
        bankName: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const { processPDFInvoice, processCSVInvoice, processOFXInvoice } = await import("./invoiceProcessor");
        
        let transactions;
        
        if (input.fileType === "pdf") {
          const buffer = Buffer.from(input.fileContent, "base64");
          transactions = await processPDFInvoice(buffer, input.bankName);
        } else if (input.fileType === "csv") {
          transactions = await processCSVInvoice(input.fileContent, input.bankName);
        } else {
          transactions = await processOFXInvoice(input.fileContent, input.bankName);
        }
        
        return transactions;
      }),

    // Pré-categorizar transação com IA
    precategorize: protectedProcedure
      .input(z.object({
        description: z.string(),
        amount: z.number(),
        nature: z.enum(["Entrada", "Saída"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const { precategorizeTransaction } = await import("./invoiceProcessor");
        const categories = await db.getUserCategories(ctx.user.id);
        const learningHistory = await db.getAiLearningHistory(ctx.user.id);
        
        return await precategorizeTransaction(
          input.description,
          input.amount,
          input.nature,
          categories,
          learningHistory
        );
      }),
  }),

  // ==================== SUBSCRIPTIONS ====================
  subscriptions: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserSubscriptions(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        description: z.string().min(1),
        currentAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
        categoryId: z.number().optional(),
        division: z.enum(["Pessoal", "Familiar", "Investimento"]).optional(),
        type: z.enum(["Essencial", "Importante", "Conforto", "Investimento"]).optional(),
        startDate: z.number(),
        dayOfMonth: z.number().min(1).max(31),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.createSubscription({
          userId: ctx.user.id,
          ...input,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        description: z.string().min(1).optional(),
        categoryId: z.number().optional(),
        division: z.enum(["Pessoal", "Familiar", "Investimento"]).optional(),
        type: z.enum(["Essencial", "Importante", "Conforto", "Investimento"]).optional(),
        dayOfMonth: z.number().min(1).max(31).optional(),
        isActive: z.boolean().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateSubscription(id, ctx.user.id, data);
        return { success: true };
      }),

    updateAmount: protectedProcedure
      .input(z.object({
        id: z.number(),
        newAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
        effectiveDate: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateSubscriptionAmount(
          input.id,
          ctx.user.id,
          input.newAmount,
          input.effectiveDate
        );
        return { success: true };
      }),

    history: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getSubscriptionHistory(input.id);
      }),
  }),

  // ==================== INSTALLMENTS ====================
  installments: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserInstallments(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        description: z.string().min(1),
        totalAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
        totalInstallments: z.number().min(2).max(60),
        categoryId: z.number().optional(),
        division: z.enum(["Pessoal", "Familiar", "Investimento"]).optional(),
        type: z.enum(["Essencial", "Importante", "Conforto", "Investimento"]).optional(),
        firstDueDate: z.number(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const installmentAmount = (Number(input.totalAmount) / input.totalInstallments).toFixed(2);
        
        return await db.createInstallment({
          userId: ctx.user.id,
          ...input,
          installmentAmount,
        });
      }),

    transactions: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getInstallmentTransactions(input.id);
      }),
  }),

  // ==================== BUDGETS ====================
  budgets: router({
    list: protectedProcedure
      .input(z.object({
        monthYear: z.string().regex(/^\d{4}-\d{2}$/), // "2026-01"
      }))
      .query(async ({ ctx, input }) => {
        return await db.getUserBudgets(ctx.user.id, input.monthYear);
      }),

    createOrUpdate: protectedProcedure
      .input(z.object({
        division: z.enum(["Pessoal", "Familiar", "Investimento"]).optional(),
        type: z.enum(["Essencial", "Importante", "Conforto", "Investimento"]).optional(),
        targetPercentage: z.string().regex(/^\d+(\.\d{1,2})?$/),
        monthYear: z.string().regex(/^\d{4}-\d{2}$/),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.createOrUpdateBudget({
          userId: ctx.user.id,
          ...input,
        });
      }),
  }),

  // ==================== AI SUGGESTIONS ====================
  ai: router({
    suggest: protectedProcedure
      .input(z.object({
        description: z.string().min(1),
      }))
      .query(async ({ ctx, input }) => {
        // Buscar padrões aprendidos
        const patterns = await db.getAiLearningPatterns(ctx.user.id, input.description);
        
        if (patterns.length > 0) {
          const best = patterns[0]!;
          return {
            nature: best.nature,
            categoryId: best.categoryId,
            division: best.division,
            type: best.type,
            confidence: "high",
            source: "learned",
          };
        }

        // Usar IA para sugerir categorização
        try {
          const userCategories = await db.getUserCategories(ctx.user.id);
          const categoriesContext = userCategories.length > 0
            ? `Categorias disponíveis do usuário: ${userCategories.map(c => `${c.name} (${c.division} - ${c.type})`).join(", ")}`
            : "Usuário ainda não possui categorias customizadas.";

          const response = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `Você é um assistente financeiro que categoriza lançamentos. Analise a descrição e sugira:
- nature: "Entrada" ou "Saída"
- division: "Pessoal", "Familiar" ou "Investimento"
- type: "Essencial", "Importante", "Conforto" ou "Investimento"
- categoryName: nome sugerido para categoria (se aplicável)

${categoriesContext}

Retorne apenas JSON válido.`,
              },
              {
                role: "user",
                content: `Categorize: "${input.description}"`,
              },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "categorization",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    nature: {
                      type: "string",
                      enum: ["Entrada", "Saída"],
                    },
                    division: {
                      type: "string",
                      enum: ["Pessoal", "Familiar", "Investimento"],
                    },
                    type: {
                      type: "string",
                      enum: ["Essencial", "Importante", "Conforto", "Investimento"],
                    },
                    categoryName: {
                      type: "string",
                    },
                  },
                  required: ["nature", "division", "type", "categoryName"],
                  additionalProperties: false,
                },
              },
            },
          });

          const content = response.choices[0]?.message?.content;
          const contentStr = typeof content === 'string' ? content : '{}';
          const suggestion = JSON.parse(contentStr);
          
          // Tentar encontrar categoria existente que corresponda
          let categoryId: number | undefined;
          const matchingCategory = userCategories.find(
            c => c.division === suggestion.division && c.type === suggestion.type
          );
          if (matchingCategory) {
            categoryId = matchingCategory.id;
          }

          return {
            nature: suggestion.nature as "Entrada" | "Saída",
            categoryId,
            division: suggestion.division as "Pessoal" | "Familiar" | "Investimento",
            type: suggestion.type as "Essencial" | "Importante" | "Conforto" | "Investimento",
            suggestedCategoryName: suggestion.categoryName,
            confidence: "medium",
            source: "ai",
          };
        } catch (error) {
          console.error("AI suggestion error:", error);
          // Fallback para sugestão padrão
          return {
            nature: "Saída" as const,
            division: "Pessoal" as const,
            type: "Essencial" as const,
            confidence: "low",
            source: "default",
          };
        }
      }),
  }),

  // ==================== CREDIT CARDS ====================
  creditCards: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserCreditCards(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        brand: z.string().min(1).max(50),
        limit: z.string().regex(/^\d+(\.\d{1,2})?$/),
        closingDay: z.number().min(1).max(31),
        dueDay: z.number().min(1).max(31),
        recurringAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
        expectedAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
        division: z.enum(["Pessoal", "Familiar", "Investimento"]).optional(),
        type: z.enum(["Essencial", "Importante", "Conforto", "Investimento"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const newCard = await db.createCreditCard({
          userId: ctx.user.id,
          ...input,
          recurringAmount: input.recurringAmount || "0.00",
          expectedAmount: input.expectedAmount || "0.00",
          currentTotalAmount: "0.00",
        });

        // Gerar lançamentos em cascata até Dez/2030
        await generateCascadeInvoices(ctx.user.id, {
          id: newCard.id,
          name: newCard.name,
          brand: newCard.brand,
          closingDay: newCard.closingDay,
          dueDay: newCard.dueDay,
          expectedAmount: newCard.expectedAmount,
          division: newCard.division,
          type: newCard.type,
          isShared: newCard.isShared,
          myPercentage: newCard.myPercentage,
        });

        return newCard;
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(100).optional(),
        brand: z.string().min(1).max(50).optional(),
        limit: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
        closingDay: z.number().min(1).max(31).optional(),
        dueDay: z.number().min(1).max(31).optional(),
        recurringAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
        expectedAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
        division: z.enum(["Pessoal", "Familiar", "Investimento"]).optional(),
        type: z.enum(["Essencial", "Importante", "Conforto", "Investimento"]).optional(),
        isShared: z.boolean().optional(),
        myPercentage: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        
        // Buscar cartão antes de atualizar
        const cardBefore = await db.getCreditCardById(id, ctx.user.id);
        if (!cardBefore) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Cartão não encontrado' });
        }
        
        // Atualizar cartão
        await db.updateCreditCard(id, ctx.user.id, data);
        
        // Se expectedAmount, isShared ou myPercentage mudaram, regenerar cascata
        const needsRegenerateCascade = 
          (input.expectedAmount && input.expectedAmount !== cardBefore.expectedAmount) ||
          (input.isShared !== undefined && input.isShared !== cardBefore.isShared) ||
          (input.myPercentage && input.myPercentage !== cardBefore.myPercentage);
        
        if (needsRegenerateCascade) {
          const updatedCard = await db.getCreditCardById(id, ctx.user.id);
          if (updatedCard) {
            await generateCascadeInvoices(ctx.user.id, {
              id: updatedCard.id,
              name: updatedCard.name,
              brand: updatedCard.brand,
              closingDay: updatedCard.closingDay,
              dueDay: updatedCard.dueDay,
              expectedAmount: updatedCard.expectedAmount,
              division: updatedCard.division,
              type: updatedCard.type,
              isShared: updatedCard.isShared,
              myPercentage: updatedCard.myPercentage,
            });
          }
        }
        
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteCreditCard(input.id, ctx.user.id);
        return { success: true };
      }),

    updateCurrentTotal: protectedProcedure
      .input(z.object({
        id: z.number(),
        currentTotalAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
      }))
      .mutation(async ({ ctx, input }) => {
        // Buscar cartão
        const card = await db.getCreditCardById(input.id, ctx.user.id);
        if (!card) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Cartão não encontrado' });
        }

        // Atualizar currentTotalAmount
        await db.updateCreditCard(input.id, ctx.user.id, {
          currentTotalAmount: input.currentTotalAmount,
        });

        // Identificar fatura ativa
        const activeCycle = identifyActiveBillingCycle(card.closingDay);
        
        // Calcular projeção da fatura ativa
        const projection = calculateInvoiceProjection({
          ...card,
          currentTotalAmount: input.currentTotalAmount,
        });

        // Buscar lançamento da fatura ativa
        const description = `Previsão CC ${card.name} ${card.brand}`;
        const allTransactions = await db.getUserTransactions(ctx.user.id);
        
        // Calcular data de vencimento da fatura ativa
        let activeDueMonth = activeCycle.month;
        let activeDueYear = activeCycle.year;
        if (card.dueDay < card.closingDay) {
          activeDueMonth++;
          if (activeDueMonth > 11) {
            activeDueMonth = 0;
            activeDueYear++;
          }
        }
        const activeDueDate = Date.UTC(activeDueYear, activeDueMonth, card.dueDay, 0, 0, 0, 0);
        
        // Buscar lançamento da fatura ativa especificamente
        const existingTransaction = allTransactions.find(t => 
          t.description === description && 
          t.nature === "Saída" &&
          t.date === activeDueDate
        );

        if (existingTransaction) {
          // Atualizar apenas lançamento da fatura ativa
          await db.updateTransaction(existingTransaction.id, ctx.user.id, {
            amount: projection.myAmount.toFixed(2),
            division: card.division,
            type: card.type,
            notes: `Projeção automática baseada em gasto atual de R$ ${input.currentTotalAmount}`,
          });
        } else {
          // Criar novo lançamento para fatura ativa
          await db.createTransaction({
            userId: ctx.user.id,
            description,
            amount: projection.myAmount.toFixed(2),
            nature: "Saída",
            division: card.division,
            type: card.type,
            date: activeDueDate,
            isPaid: false,
            notes: `Projeção automática baseada em gasto atual de R$ ${input.currentTotalAmount}`,
          });
        }

        return { success: true, projection };
      }),
  }),
});

// Função auxiliar para identificar qual é a fatura ativa (mês atual ou próximo)
function identifyActiveBillingCycle(closingDay: number): { year: number; month: number; isClosed: boolean } {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth(); // 0-11
  const currentDay = now.getUTCDate();

  if (currentDay <= closingDay) {
    // Ainda estamos no ciclo do mês atual
    return { year: currentYear, month: currentMonth, isClosed: false };
  } else {
    // Ciclo do mês atual está fechado, fatura ativa é do próximo mês
    let nextMonth = currentMonth + 1;
    let nextYear = currentYear;
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear++;
    }
    return { year: nextYear, month: nextMonth, isClosed: true };
  }
}

// Função auxiliar para gerar lançamentos em cascata até Dez/2030
async function generateCascadeInvoices(
  userId: number,
  card: {
    id: number;
    name: string;
    brand: string;
    closingDay: number;
    dueDay: number;
    expectedAmount: string;
    division: string;
    type: string;
    isShared?: boolean;
    myPercentage?: string;
  }
) {
  const isShared = card.isShared || false;
  const myPercentage = Number(card.myPercentage || "100.00");
  const expectedValue = Number(card.expectedAmount);
  const myExpectedValue = isShared ? (expectedValue * myPercentage / 100) : expectedValue;
  
  // Descrição dinâmica baseada em isShared (mostra finalAmount, não expectedAmount)
  const description = isShared 
    ? `Previsão CC ${card.name} ${card.brand} (Fatura Total: R$ ${expectedValue.toFixed(2)})`
    : `Previsão CC ${card.name} ${card.brand}`;

  // Identificar fatura ativa
  const activeCycle = identifyActiveBillingCycle(card.closingDay);
  
  // Gerar lançamentos do mês ativo até Dez/2030
  const endYear = 2030;
  const endMonth = 11; // Dezembro (0-indexed)

  let currentYear = activeCycle.year;
  let currentMonth = activeCycle.month;

  const invoicesToCreate = [];

  while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
    // Calcular data de vencimento para este mês
    let dueMonth = currentMonth;
    let dueYear = currentYear;
    
    // Se dueDay < closingDay, vencimento é no mês seguinte
    if (card.dueDay < card.closingDay) {
      dueMonth++;
      if (dueMonth > 11) {
        dueMonth = 0;
        dueYear++;
      }
    }

    const dueDate = Date.UTC(dueYear, dueMonth, card.dueDay, 0, 0, 0, 0);

    invoicesToCreate.push({
      userId,
      description,
      amount: myExpectedValue.toFixed(2),
      nature: "Saída" as const,
      division: card.division as any,
      type: card.type as any,
      date: dueDate,
      isPaid: false,
      notes: isShared 
        ? `Previsão automática - Fatura esperada de ${card.name} ${card.brand} (${myPercentage}% de R$ ${expectedValue.toFixed(2)})`
        : `Previsão automática - Fatura esperada de ${card.name} ${card.brand}`,
    });

    // Avançar para próximo mês
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
  }

  // Buscar lançamentos existentes
  const allTransactions = await db.getUserTransactions(userId);
  const existingInvoices = allTransactions.filter(t => 
    t.description === description && t.nature === "Saída"
  );

  // Atualizar ou criar lançamentos
  for (const invoice of invoicesToCreate) {
    const existing = existingInvoices.find(t => t.date === invoice.date);
    
    if (existing) {
      // Atualizar apenas se for mês futuro (não sobrescreve histórico)
      const invoiceMonth = new Date(invoice.date).getUTCMonth();
      const invoiceYear = new Date(invoice.date).getUTCFullYear();
      const now = new Date();
      const currentMonth = now.getUTCMonth();
      const currentYear = now.getUTCFullYear();
      
      // Só atualiza se for mês futuro ou mês atual após closingDay
      if (invoiceYear > currentYear || 
          (invoiceYear === currentYear && invoiceMonth > currentMonth) ||
          (invoiceYear === currentYear && invoiceMonth === currentMonth && now.getUTCDate() > card.closingDay)) {
        await db.updateTransaction(existing.id, userId, {
          amount: invoice.amount,
          division: invoice.division,
          type: invoice.type,
          notes: invoice.notes,
        });
      }
    } else {
      // Criar novo lançamento
      await db.createTransaction(invoice);
    }
  }
}

// Função auxiliar para calcular projeção de fatura
function calculateInvoiceProjection(card: {
  closingDay: number;
  dueDay: number;
  recurringAmount: string;
  expectedAmount: string;
  currentTotalAmount: string;
  isShared?: boolean;
  myPercentage?: string;
}) {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth();
  const currentDay = now.getUTCDate();

  // Determinar o ciclo atual (período entre fechamentos)
  let cycleStartYear = currentYear;
  let cycleStartMonth = currentMonth;
  
  if (currentDay < card.closingDay) {
    // Ainda estamos no ciclo anterior
    cycleStartMonth--;
    if (cycleStartMonth < 0) {
      cycleStartMonth = 11;
      cycleStartYear--;
    }
  }

  // Data de fechamento do ciclo atual
  const cycleStartDate = Date.UTC(cycleStartYear, cycleStartMonth, card.closingDay, 0, 0, 0, 0);
  
  // Data de fechamento do próximo ciclo
  let nextClosingMonth = cycleStartMonth + 1;
  let nextClosingYear = cycleStartYear;
  if (nextClosingMonth > 11) {
    nextClosingMonth = 0;
    nextClosingYear++;
  }
  const nextClosingDate = Date.UTC(nextClosingYear, nextClosingMonth, card.closingDay, 0, 0, 0, 0);

  // Calcular dias transcorridos desde o fechamento
  const nowTimestamp = Date.UTC(currentYear, currentMonth, currentDay, 0, 0, 0, 0);
  const daysSinceClosing = Math.floor((nowTimestamp - cycleStartDate) / (1000 * 60 * 60 * 24));
  
  // Total de dias no ciclo
  const totalDaysInCycle = Math.floor((nextClosingDate - cycleStartDate) / (1000 * 60 * 60 * 24));

  // Projeção variável
  const currentTotal = Number(card.currentTotalAmount);
  const recurring = Number(card.recurringAmount);
  const expected = Number(card.expectedAmount);
  
  const variableAmount = currentTotal - recurring;
  const projectedVariable = daysSinceClosing > 0 
    ? (variableAmount / daysSinceClosing) * totalDaysInCycle 
    : variableAmount;
  
  // Projeção Real (sem trava) - sempre mostra cálculo bruto
  const rawProjection = projectedVariable + recurring;
  
  // Valor final com trava de mínimo esperado
  const finalAmount = Math.max(rawProjection, expected);
  
  // Se for gasto compartilhado, calcular valor proporcional DEPOIS da trava
  const isShared = card.isShared || false;
  const myPercentage = Number(card.myPercentage || "100.00");
  const myAmount = isShared ? (finalAmount * myPercentage / 100) : finalAmount;

  // Próximo vencimento
  let nextDueMonth = nextClosingMonth;
  let nextDueYear = nextClosingYear;
  
  // Vencimento é geralmente após o fechamento
  if (card.dueDay < card.closingDay) {
    nextDueMonth++;
    if (nextDueMonth > 11) {
      nextDueMonth = 0;
      nextDueYear++;
    }
  }
  
  const nextDueDate = Date.UTC(nextDueYear, nextDueMonth, card.dueDay, 0, 0, 0, 0);

  return {
    rawProjection,
    finalAmount,
    myAmount,
    isShared,
    myPercentage,
    projectedVariable,
    daysSinceClosing,
    totalDaysInCycle,
    nextDueDate,
  };
}

export type AppRouter = typeof appRouter;
