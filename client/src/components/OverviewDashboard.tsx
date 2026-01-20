import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Calendar } from "lucide-react";

interface OverviewDashboardProps {
  selectedMonths: number[];
  selectedYear: number;
}

export default function OverviewDashboard({ selectedMonths, selectedYear }: OverviewDashboardProps) {
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

  // Calcular dados do período selecionado
  const periodTransactions = transactions?.filter(t => {
    const tDate = new Date(t.date);
    const tMonth = tDate.getMonth() + 1;
    const tYear = tDate.getFullYear();
    return selectedMonths.includes(tMonth) && tYear === selectedYear;
  }) || [];

  // Distribuição por Divisão (Gráfico de Rosca)
  const divisionData = [
    { name: "Pessoal", value: 0, color: "#3b82f6" }, // Azul vibrante
    { name: "Familiar", value: 0, color: "#8b5cf6" }, // Roxo vibrante
    { name: "Investimento", value: 0, color: "#10b981" } // Verde vibrante
  ];

  periodTransactions.forEach(t => {
    if (t.nature === "Saída" && t.division) {
      const div = divisionData.find(d => d.name === t.division);
      if (div) div.value += Number(t.amount);
    }
  });

  // Distribuição por Tipo (Gráfico de Rosca)
  const typeData = [
    { name: "Essencial", value: 0, color: "#ef4444" }, // Vermelho vibrante
    { name: "Importante", value: 0, color: "#f59e0b" }, // Laranja vibrante
    { name: "Conforto", value: 0, color: "#06b6d4" }, // Ciano vibrante
    { name: "Investimento", value: 0, color: "#10b981" } // Verde vibrante
  ];

  periodTransactions.forEach(t => {
    if (t.nature === "Saída" && t.type) {
      const type = typeData.find(d => d.name === t.type);
      if (type) type.value += Number(t.amount);
    }
  });

  // Projeção de 12 meses
  const now = new Date();
  const projectionData = [];
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
    // Usar UTC para consistência com as datas das transações
    const monthStart = Date.UTC(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = Date.UTC(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

    const monthTrans = transactions?.filter(
      t => t.date >= monthStart && t.date <= monthEnd
    ) || [];

    const income = monthTrans
      .filter(t => t.nature === "Entrada")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expense = monthTrans
      .filter(t => t.nature === "Sa\u00edda")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    projectionData.push({
      month: date.toLocaleDateString('pt-BR', { month: 'short' }),
      Entradas: income,
      Saídas: expense,
      Saldo: income - expense
    });
  }

  // Burn Rate Diário (baseado no mês atual se selecionado, senão no primeiro mês selecionado)
  const referenceMonth = selectedMonths.includes(now.getMonth() + 1) ? now.getMonth() + 1 : selectedMonths[0] || 1;
  const daysInMonth = new Date(selectedYear, referenceMonth, 0).getDate();
  const currentDay = referenceMonth === (now.getMonth() + 1) && selectedYear === now.getFullYear() ? now.getDate() : 1;
  const daysRemaining = daysInMonth - currentDay;

  const periodIncome = periodTransactions
    .filter(t => t.nature === "Entrada")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const periodExpense = periodTransactions
    .filter(t => t.nature === "Saída")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const remainingBudget = periodIncome - periodExpense;
  const dailyBurnRate = daysRemaining > 0 ? remainingBudget / daysRemaining : 0;

  // Aderência ao Orçamento
  const totalBudgetPercentage = budgets?.reduce((sum, b) => sum + Number(b.targetPercentage), 0) || 0;
  const budgetAdherence = totalBudgetPercentage > 0 ? (periodExpense / periodIncome) * 100 : 0;

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
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis 
                dataKey="month" 
                stroke="#9ca3af"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="#9ca3af"
                tickFormatter={(value) => formatCurrency(value)}
                style={{ fontSize: '12px' }}
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
                stroke="#10b981" 
                strokeWidth={3}
                dot={{ fill: '#10b981', r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="Saídas" 
                stroke="#ef4444" 
                strokeWidth={3}
                dot={{ fill: '#ef4444', r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="Saldo" 
                stroke="#3b82f6" 
                strokeWidth={3}
                dot={{ fill: '#3b82f6', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
