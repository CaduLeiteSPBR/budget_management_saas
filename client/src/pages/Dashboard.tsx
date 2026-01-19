import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Wallet, 
  TrendingUp,
  Plus,
  Settings,
  LayoutDashboard,
  Receipt,
  CreditCard,
  Target,
  Users
} from "lucide-react";
import { Link } from "wouter";
import { ArrowRight, FolderOpen } from "lucide-react";
import OverviewDashboard from "@/components/OverviewDashboard";

export default function Dashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const { data: balance, isLoading: balanceLoading } = trpc.transactions.balance.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: transactions, isLoading: transactionsLoading } = trpc.transactions.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Calcular totais do mês atual
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).getTime();

  const monthTransactions = transactions?.filter(
    t => t.date >= startOfMonth && t.date <= endOfMonth && t.isPaid
  ) || [];

  const monthIncome = monthTransactions
    .filter(t => t.nature === "Entrada")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const monthExpense = monthTransactions
    .filter(t => t.nature === "Saída")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const monthBalance = monthIncome - monthExpense;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border glass-strong sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wallet className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Gestão Orçamentária</h1>
                <p className="text-sm text-muted-foreground">Bem-vindo, {user?.name || 'Usuário'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/categories">
                <Button variant="outline" size="sm" className="gap-2">
                  <FolderOpen className="w-4 h-4" />
                  <span className="hidden md:inline">Categorias</span>
                </Button>
              </Link>
              {user?.role === 'admin' && (
                <Link href="/admin">
                  <Button variant="outline" size="sm">
                    <Users className="w-4 h-4 mr-2" />
                    Admin
                  </Button>
                </Link>
              )}
              <Link href="/settings">
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="glass border-border hover:border-primary/50 transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Saldo Total
              </CardTitle>
              <Wallet className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {balanceLoading ? '...' : formatCurrency(balance || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Todas as contas
              </p>
            </CardContent>
          </Card>

          <Card className="glass border-income hover:border-income transition-all glow-income">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Entradas do Mês
              </CardTitle>
              <ArrowUpCircle className="w-4 h-4 text-income" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-income">
                {formatCurrency(monthIncome)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {monthTransactions.filter(t => t.nature === "Entrada").length} transações
              </p>
            </CardContent>
          </Card>

          <Card className="glass border-expense hover:border-expense transition-all glow-expense">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Saídas do Mês
              </CardTitle>
              <ArrowDownCircle className="w-4 h-4 text-expense" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-expense">
                {formatCurrency(monthExpense)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {monthTransactions.filter(t => t.nature === "Saída").length} transações
              </p>
            </CardContent>
          </Card>

          <Card className="glass border-border hover:border-primary/50 transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Balanço do Mês
              </CardTitle>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${monthBalance >= 0 ? 'text-income' : 'text-expense'}`}>
                {formatCurrency(monthBalance)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {monthBalance >= 0 ? 'Superávit' : 'Déficit'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="glass-strong">
            <TabsTrigger value="overview">
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="transactions">
              <Receipt className="w-4 h-4 mr-2" />
              Lançamentos
            </TabsTrigger>
            <TabsTrigger value="installments">
              <CreditCard className="w-4 h-4 mr-2" />
              Parcelamentos
            </TabsTrigger>
            <TabsTrigger value="budgets">
              <Target className="w-4 h-4 mr-2" />
              Orçamentos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <OverviewDashboard />
          </TabsContent>

          <TabsContent value="transactions" className="space-y-6">
            <Card className="glass border-border">
              <CardHeader>
                <CardTitle>Gestão de Lançamentos</CardTitle>
                <CardDescription>
                  Acesse a página completa para gerenciar suas transações
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Crie, edite e visualize todos os seus lançamentos financeiros com filtros avançados e sugestões da IA.
                </p>
                <Link href="/transactions">
                  <Button className="gap-2 glow-primary">
                    Gerenciar Lançamentos
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="installments" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Parcelamentos</h2>
              <Button className="glow-primary">
                <Plus className="w-4 h-4 mr-2" />
                Novo Parcelamento
              </Button>
            </div>
            <Card className="glass border-border">
              <CardContent className="pt-6">
                <p className="text-muted-foreground text-center">
                  Página de parcelamentos será implementada em breve
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="budgets" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Orçamentos</h2>
              <Button className="glow-primary">
                <Plus className="w-4 h-4 mr-2" />
                Definir Meta
              </Button>
            </div>
            <Card className="glass border-border">
              <CardContent className="pt-6">
                <p className="text-muted-foreground text-center">
                  Página de orçamentos será implementada em breve
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
