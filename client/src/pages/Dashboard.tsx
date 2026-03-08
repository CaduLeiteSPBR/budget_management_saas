import { useState, useMemo } from "react";
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
  Target,
  Users,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Bug,
  Trash2,
  TriangleAlert,
  RefreshCw
} from "lucide-react";
import { Link } from "wouter";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowRight, FolderOpen, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import OverviewDashboard from "@/components/OverviewDashboard";
import TransactionsList from "@/components/TransactionsList";
import TransactionForm from "@/components/TransactionForm";
import CreditCardsTab from "@/components/CreditCardsTab";


export default function Dashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<number | undefined>();
  const logoutMutation = trpc.auth.logout.useMutation();

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    window.location.href = "/";
  };
  
  // Estado do seletor de período
  const currentMonth = new Date().getUTCMonth() + 1;
  const currentYear = new Date().getUTCFullYear();
  const [selectedMonths, setSelectedMonths] = useState<number[]>([currentMonth]);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  
  // Função de navegação temporal
  const handleNavigate = (direction: 'prev' | 'next') => {
    const sortedMonths = [...selectedMonths].sort((a, b) => a - b);
    
    if (sortedMonths.length === 0) return;
    
    if (sortedMonths.length === 1) {
      // Navegação de mês único
      const currentMonth = sortedMonths[0];
      let newMonth = direction === 'next' ? currentMonth + 1 : currentMonth - 1;
      let newYear = selectedYear;
      
      // Tratamento de virada de ano
      if (newMonth > 12) {
        newMonth = 1;
        newYear++;
      } else if (newMonth < 1) {
        newMonth = 12;
        newYear--;
      }
      
      setSelectedMonths([newMonth]);
      setSelectedYear(newYear);
    } else {
      // Navegação de múltiplos meses (desloca bloco)
      const blockSize = sortedMonths.length;
      const firstMonth = sortedMonths[0];
      const lastMonth = sortedMonths[sortedMonths.length - 1];
      
      let newMonths: number[];
      let newYear = selectedYear;
      
      if (direction === 'next') {
        // Desloca para frente
        newMonths = sortedMonths.map(m => m + 1);
        
        // Verifica virada de ano
        if (newMonths.some(m => m > 12)) {
          newMonths = newMonths.map(m => m > 12 ? m - 12 : m);
          newYear++;
        }
      } else {
        // Desloca para trás
        newMonths = sortedMonths.map(m => m - 1);
        
        // Verifica virada de ano
        if (newMonths.some(m => m < 1)) {
          newMonths = newMonths.map(m => m < 1 ? m + 12 : m);
          newYear--;
        }
      }
      
      setSelectedMonths(newMonths);
      setSelectedYear(newYear);
    }
  };
  const { data: balance, isLoading: balanceLoading } = trpc.transactions.balance.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: transactions, isLoading: transactionsLoading } = trpc.transactions.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  // Fonte Única da Verdade: Buscar resumo financeiro do backend
  const { data: financialSummary, isLoading: summaryLoading } = trpc.transactions.getFinancialSummary.useQuery(
    { selectedMonths, selectedYear },
    { enabled: isAuthenticated }
  );

  // Usar valores do backend (Fonte Única da Verdade)
  const initialBalance = financialSummary?.initialBalance || 0;
  const currentBalance = financialSummary?.currentBalance || 0;
  const periodIncome = financialSummary?.periodIncome || 0;
  const periodExpense = financialSummary?.periodExpense || 0;
  const endOfPeriodBalance = financialSummary?.endOfPeriodBalance || 0;
  const periodBalance = periodIncome - periodExpense;

  // Calcular Saldo Mínimo a partir de hoje usando dados da tabela
  const { minimumBalance, minimumBalanceDate } = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return { minimumBalance: currentBalance, minimumBalanceDate: null };
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    // Filtrar TODAS as transacoes (pagas e agendadas) do periodo selecionado
    const periodTransactionsAll = transactions.filter((t) => {
      const tDate = new Date(t.date);
      tDate.setUTCHours(0, 0, 0, 0);
      const tMonth = tDate.getUTCMonth() + 1;
      const tYear = tDate.getUTCFullYear();
      return (
        selectedMonths.includes(tMonth) &&
        tYear === selectedYear
      );
    });

    // Ordenar por data, depois por tipo (entradas primeiro)
    periodTransactionsAll.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      // Entradas (0) antes de Saídas (1)
      const aIsIncome = a.nature === 'Entrada' ? 0 : 1;
      const bIsIncome = b.nature === 'Entrada' ? 0 : 1;
      return aIsIncome - bIsIncome;
    });

    // Calcular saldo progressivo dia a dia DESDE O INICIO DO MES
    let dayBalance = initialBalance; // Começar com saldo inicial do período
    let minBalance = initialBalance;
    let minDate: number | null = null;
    let currentDay: number | null = null;

    for (const tx of periodTransactionsAll) {
      const txDate = new Date(tx.date).getTime();
      // Se mudou de dia, verificar saldo mínimo (mas apenas se >= hoje)
      if (currentDay !== null && currentDay !== txDate) {
        if (currentDay >= todayTime && dayBalance < minBalance) {
          minBalance = dayBalance;
          minDate = currentDay;
        }
      }
      currentDay = txDate;
      // Aplicar transação
      const amount = Number(tx.amount) || 0;
      if (tx.nature === 'Entrada') {
        dayBalance += amount;
      } else {
        dayBalance -= amount;
      }
    }

    // Verificar saldo final do último dia (se >= hoje)
    if (currentDay !== null && currentDay >= todayTime && dayBalance < minBalance) {
      minBalance = dayBalance;
      minDate = currentDay;
    }

    return { minimumBalance: minBalance, minimumBalanceDate: minDate };
  }, [transactions, initialBalance, selectedMonths, selectedYear]);
  
  // Filtrar transações do período para exibição na lista (apenas para UI)
  const periodTransactions = useMemo(() => {
    if (!transactions) return [];
    return transactions.filter(t => {
      const tDate = new Date(t.date);
      const tMonth = tDate.getUTCMonth() + 1;
      const tYear = tDate.getUTCFullYear();
      return selectedMonths.includes(tMonth) && tYear === selectedYear;
    });
  }, [transactions, selectedMonths, selectedYear]);

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header Sticky */}
      <header className="sticky top-0 z-50 bg-background border-b border-border">
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

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleLogout()}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Navigation Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
        {/* Sticky Section: Período */}
        <div className="sticky top-16 z-40 bg-background pb-6 -mx-4 px-4 border-b border-border">
        {/* Seletor de Período */}
        <div className="mb-6 flex items-center gap-4 pt-2">
            <span className="text-sm font-medium text-muted-foreground">Período:</span>
            
            {/* Botão Navegar para Trás */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleNavigate('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                {selectedMonths.length === 0 ? "Selecione os meses" :
                 selectedMonths.length === 1 ? new Date(2000, selectedMonths[0] - 1).toLocaleDateString('pt-BR', { month: 'long' }) :
                 selectedMonths.length === 12 ? "Todos os meses" :
                 `${selectedMonths.length} meses selecionados`}
                {" de "}{selectedYear}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Ano</label>
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedYear(selectedYear - 1)}
                    >
                      {selectedYear - 1}
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                    >
                      {selectedYear}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedYear(selectedYear + 1)}
                    >
                      {selectedYear + 1}
                    </Button>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium">Meses</label>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedMonths([1,2,3,4,5,6,7,8,9,10,11,12])}
                      >
                        Todos
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedMonths([])}
                      >
                        Limpar
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(month => (
                      <div key={month} className="flex items-center space-x-2">
                        <Checkbox
                          id={`month-${month}`}
                          checked={selectedMonths.includes(month)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedMonths([...selectedMonths, month].sort((a,b) => a-b));
                            } else {
                              setSelectedMonths(selectedMonths.filter(m => m !== month));
                            }
                          }}
                        />
                        <label
                          htmlFor={`month-${month}`}
                          className="text-sm cursor-pointer"
                        >
                          {new Date(2000, month - 1).toLocaleDateString('pt-BR', { month: 'short' })}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </PopoverContent>
            </Popover>
            
            {/* Botão Navegar para Frente */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleNavigate('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            
            {/* Botão Recalcular Widgets */}
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-2 ml-2"
              onClick={() => {
                // Forçar refetch do financialSummary
                trpc.useUtils().transactions.getFinancialSummary.invalidate();
              }}
              title="Recalcular widgets de resumo financeiro"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden md:inline">Recalcular</span>
            </Button>
        </div>
        
        {/* Stats Cards - 6 Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
          {/* 1. Saldo Inicial */}
          <Card className="glass border-border hover:border-primary/50 transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Saldo Inicial
                </CardTitle>
                <Wallet className="w-4 h-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight">
                {formatCurrency(initialBalance)}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Início do período
              </p>
            </CardContent>
          </Card>

          {/* 2. Entradas do Mês */}
          <Card className="glass border-income hover:border-income transition-all glow-income">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold text-income uppercase tracking-wider">
                  Entradas
                </CardTitle>
                <ArrowUpCircle className="w-4 h-4 text-income" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-income tracking-tight">
                {formatCurrency(periodIncome)}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {periodTransactions.filter(t => t.nature === "Entrada").length} transações
              </p>
            </CardContent>
          </Card>

          {/* 3. Saídas do Mês */}
          <Card className="glass border-expense hover:border-expense transition-all glow-expense">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold text-expense uppercase tracking-wider">
                  Saídas
                </CardTitle>
                <ArrowDownCircle className="w-4 h-4 text-expense" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-expense tracking-tight">
                {formatCurrency(periodExpense)}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {periodTransactions.filter(t => t.nature === "Saída").length} transações
              </p>
            </CardContent>
          </Card>

          {/* 4. Saldo Mínimo */}
          <Card className={`glass transition-all ${
            minimumBalance < 0 
              ? 'border-red-500 border-2 animate-pulse' 
              : 'border-border hover:border-primary/50'
          }`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Saldo Mínimo
                </CardTitle>
                {minimumBalance < 0 ? (
                  <TriangleAlert className="w-4 h-4 text-red-500" />
                ) : (
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold tracking-tight ${
                minimumBalance < 0 ? 'text-red-500' : ''
              }`}>
                {formatCurrency(minimumBalance)}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {minimumBalanceDate
                  ? `Em ${new Date(minimumBalanceDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })}`
                  : 'A partir de hoje'
                }
              </p>
            </CardContent>
          </Card>

          {/* 5. Saldo Atual */}
          <Card className={`glass transition-all ${
            currentBalance < 0 
              ? 'border-red-500 border-2 animate-pulse' 
              : 'border-border hover:border-primary/50'
          }`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Saldo Atual
                </CardTitle>
                {currentBalance < 0 ? (
                  <TriangleAlert className="w-4 h-4 text-red-500" />
                ) : (
                  <Wallet className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold tracking-tight ${
                currentBalance < 0 ? 'text-red-500' : ''
              }`}>
                {formatCurrency(currentBalance)}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Saldo real até hoje
              </p>
            </CardContent>
          </Card>

          {/* 6. Saldo no Fim do Mês */}
          <Card className="glass border-border hover:border-primary/50 transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Fim do Mês
                </CardTitle>
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold tracking-tight ${endOfPeriodBalance >= 0 ? 'text-income' : 'text-expense'}`}>
                {formatCurrency(endOfPeriodBalance)}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Projeção com lançamentos
              </p>
            </CardContent>
          </Card>
        </div>

          <TabsList className="glass-strong">
            <TabsTrigger value="overview">
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="transactions">
              <Receipt className="w-4 h-4 mr-2" />
              Lançamentos
            </TabsTrigger>
            <TabsTrigger value="cards">
              <CreditCard className="w-4 h-4 mr-2" />
              Cartões
            </TabsTrigger>

          </TabsList>
        </div>
        {/* End Sticky Section */}

          <TabsContent value="overview" className="space-y-6">
            <OverviewDashboard selectedMonths={selectedMonths} selectedYear={selectedYear} />
          </TabsContent>

          <TabsContent value="transactions" className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-semibold">Lançamentos</h2>
                <p className="text-sm text-muted-foreground">Gerencie suas transações financeiras</p>
              </div>
              {!showTransactionForm && (
                <Button onClick={() => setShowTransactionForm(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Novo Lançamento
                </Button>
              )}
            </div>
            {showTransactionForm ? (
              <TransactionForm
                transactionId={editingTransactionId}
                onSuccess={() => {
                  setShowTransactionForm(false);
                  setEditingTransactionId(undefined);
                }}
                onCancel={() => {
                  setShowTransactionForm(false);
                  setEditingTransactionId(undefined);
                }}
              />
            ) : (
              <TransactionsList
                onEdit={(id) => {
                  setEditingTransactionId(id);
                  setShowTransactionForm(true);
                }}
                selectedMonths={selectedMonths}
                selectedYear={selectedYear}
              />
            )}
          </TabsContent>

          <TabsContent value="cards" className="space-y-6">
            <CreditCardsTab />
          </TabsContent>


        </Tabs>
      </main>
    </div>
  );
}
