import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Calendar } from "lucide-react";

export default function OverviewDashboard() {
  const { data: transactions } = trpc.transactions.list.useQuery();
  const { data: budgets } = trpc.budgets.list.useQuery({
    monthYear: new Date().toISOString().slice(0, 7)
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Calcular dados do mês atual
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).getTime();

  const monthTransactions = transactions?.filter(
    t => t.date >= startOfMonth && t.date <= endOfMonth && t.isPaid
  ) || [];

  // Distribuição por Divisão (Gráfico de Rosca)
  const divisionData = [
    { name: "Pessoal", value: 0, color: "hsl(var(--chart-1))" },
    { name: "Familiar", value: 0, color: "hsl(var(--chart-2))" },
    { name: "Investimento", value: 0, color: "hsl(var(--chart-3))" }
  ];

  monthTransactions.forEach(t => {
    if (t.nature === "Saída" && t.division) {
      const div = divisionData.find(d => d.name === t.division);
      if (div) div.value += Number(t.amount);
    }
  });

  // Distribuição por Tipo (Gráfico de Rosca)
  const typeData = [
    { name: "Essencial", value: 0, color: "hsl(var(--chart-1))" },
    { name: "Importante", value: 0, color: "hsl(var(--chart-2))" },
    { name: "Conforto", value: 0, color: "hsl(var(--chart-3))" },
    { name: "Investimento", value: 0, color: "hsl(var(--chart-4))" }
  ];

  monthTransactions.forEach(t => {
    if (t.nature === "Saída" && t.type) {
      const type = typeData.find(d => d.name === t.type);
      if (type) type.value += Number(t.amount);
    }
  });

  // Projeção de 12 meses
  const projectionData = [];
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const monthStart = date.getTime();
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59).getTime();

    const monthTrans = transactions?.filter(
      t => t.date >= monthStart && t.date <= monthEnd
    ) || [];

    const income = monthTrans
      .filter(t => t.nature === "Entrada" && t.isPaid)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expense = monthTrans
      .filter(t => t.nature === "Saída" && t.isPaid)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    projectionData.push({
      month: date.toLocaleDateString('pt-BR', { month: 'short' }),
      Entradas: income,
      Saídas: expense,
      Saldo: income - expense
    });
  }

  // Burn Rate Diário
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentDay = now.getDate();
  const daysRemaining = daysInMonth - currentDay;

  const monthIncome = monthTransactions
    .filter(t => t.nature === "Entrada")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const monthExpense = monthTransactions
    .filter(t => t.nature === "Saída")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const remainingBudget = monthIncome - monthExpense;
  const dailyBurnRate = daysRemaining > 0 ? remainingBudget / daysRemaining : 0;

  // Aderência ao Orçamento
  const totalBudgetPercentage = budgets?.reduce((sum, b) => sum + Number(b.targetPercentage), 0) || 0;
  const budgetAdherence = totalBudgetPercentage > 0 ? (monthExpense / monthIncome) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* KPIs Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="glass border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Burn Rate Diário
            </CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(dailyBurnRate)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Disponível por dia ({daysRemaining} dias restantes)
            </p>
          </CardContent>
        </Card>

        <Card className="glass border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Aderência ao Orçamento
            </CardTitle>
            {budgetAdherence <= 100 ? (
              <TrendingUp className="w-4 h-4 text-income" />
            ) : (
              <TrendingDown className="w-4 h-4 text-expense" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${budgetAdherence <= 100 ? 'text-income' : 'text-expense'}`}>
              {budgetAdherence.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {budgetAdherence <= 100 ? 'Dentro do planejado' : 'Acima do planejado'}
            </p>
          </CardContent>
        </Card>

        <Card className="glass border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Dias até Fim do Mês
            </CardTitle>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {daysRemaining}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {currentDay} de {daysInMonth} dias decorridos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuição por Divisão */}
        <Card className="glass border-border">
          <CardHeader>
            <CardTitle>Distribuição por Divisão</CardTitle>
            <CardDescription>Gastos do mês atual por divisão</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={divisionData.filter(d => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  label={(entry) => `${entry.name}: ${formatCurrency(entry.value)}`}
                >
                  {divisionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribuição por Tipo */}
        <Card className="glass border-border">
          <CardHeader>
            <CardTitle>Distribuição por Tipo</CardTitle>
            <CardDescription>Gastos do mês atual por tipo</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={typeData.filter(d => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  label={(entry) => `${entry.name}: ${formatCurrency(entry.value)}`}
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Projeção 12 Meses */}
      <Card className="glass border-border">
        <CardHeader>
          <CardTitle>Projeção de 12 Meses</CardTitle>
          <CardDescription>Entradas, saídas e saldo projetado</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={projectionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="month" 
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="Entradas" 
                stroke="hsl(var(--income))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--income))' }}
              />
              <Line 
                type="monotone" 
                dataKey="Saídas" 
                stroke="hsl(var(--expense))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--expense))' }}
              />
              <Line 
                type="monotone" 
                dataKey="Saldo" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
