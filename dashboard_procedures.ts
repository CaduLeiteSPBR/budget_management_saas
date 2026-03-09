// Adicionar este router ao appRouter em routers.ts

dashboard: router({
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    const prefs = await db.getDashboardPreferences(ctx.user.id);
    if (!prefs) {
      return {
        widgetOrder: ['saldoInicial', 'entradas', 'saidas', 'saldoMinimo', 'saldoAtual', 'fimDoMes'],
        hiddenWidgets: [],
      };
    }
    return {
      widgetOrder: JSON.parse(prefs.widgetOrder),
      hiddenWidgets: JSON.parse(prefs.hiddenWidgets),
    };
  }),

  savePreferences: protectedProcedure
    .input(z.object({
      widgetOrder: z.array(z.string()),
      hiddenWidgets: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      await db.saveDashboardPreferences(ctx.user.id, input);
      return { success: true };
    }),

  generateSuggestions: protectedProcedure.query(async ({ ctx }) => {
    const transactions = await db.getUserTransactions(ctx.user.id);
    const now = new Date();
    const currentMonth = now.getUTCMonth();
    const currentYear = now.getUTCFullYear();
    
    const monthStart = Date.UTC(currentYear, currentMonth, 1, 0, 0, 0, 0);
    const monthEnd = Date.UTC(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
    
    const monthTransactions = transactions.filter(t => t.date >= monthStart && t.date <= monthEnd);
    
    const expenses = monthTransactions.filter(t => t.nature === 'Saída');
    const income = monthTransactions.filter(t => t.nature === 'Entrada');
    
    const totalExpenses = expenses.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalIncome = income.reduce((sum, t) => sum + Number(t.amount), 0);
    
    const expensesByCategory: Record<string, number> = {};
    expenses.forEach(t => {
      const cat = t.division || 'Sem categoria';
      expensesByCategory[cat] = (expensesByCategory[cat] || 0) + Number(t.amount);
    });
    
    const topCategory = Object.entries(expensesByCategory).sort(([,a], [,b]) => b - a)[0];
    
    const prompt = `Baseado nos seguintes dados financeiros, gere 3 sugestões práticas para melhorar a gestão financeira:

Mês: ${new Date(monthStart).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
Renda: R$ ${totalIncome.toFixed(2)}
Gastos: R$ ${totalExpenses.toFixed(2)}
Saldo: R$ ${(totalIncome - totalExpenses).toFixed(2)}
Maior gasto: ${topCategory?.[0]} (R$ ${topCategory?.[1].toFixed(2) || '0.00'})

Forneça 3 sugestões em bullets, cada uma com no máximo 1 linha.`;

    try {
      const response = await invokeLLM({
        messages: [
          {
            role: 'system',
            content: 'Você é um consultor financeiro. Forneça sugestões práticas e acionáveis.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = response.choices[0]?.message?.content || '';
      
      const bullets = content
        .split('\n')
        .filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'))
        .map(line => line.replace(/^[-•]\s*/, '').trim())
        .filter(line => line.length > 0)
        .slice(0, 3);

      if (bullets.length === 0) {
        const lines = content
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .slice(0, 3);
        return { suggestions: lines };
      }

      return { suggestions: bullets };
    } catch (error) {
      console.error('[generateSuggestions] Error:', error);
      return {
        suggestions: [
          'Analise seus gastos e identifique oportunidades de economia',
          'Estabeleça metas mensais para cada categoria de gasto',
          'Revise suas assinaturas e cancele as não utilizadas',
        ],
      };
    }
  }),
}),
