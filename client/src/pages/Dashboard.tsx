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
  Trash2
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
import { DebugSaldoTab } from "@/components/DebugSaldoTab";

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
  const currentBalance = financialSummary?.currentBalance || 0;
  const periodIncome = financialSummary?.periodIncome || 0;
  const periodExpense = financialSummary?.periodExpense || 0;
  const endOfPeriodBalance = financialSummary?.endOfPeriodBalance || 0;
  const periodBalance = periodIncome - periodExpense;
  
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
      {/* Header */}
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
              {user?.role === 'admin' && (
                <Link href="/admin">
                  <Button variant="outline" size="sm">
                    <Users className="w-4 h-4 mr-2" />
                    Admin
                  </Button>
                </Link>
              )}
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
        {/* Seletor de Período */}
        <div className="mb-6 flex items-center gap-4">
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
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="glass border-border hover:border-primary/50 transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Saldo Atual
              </CardTitle>
              <Wallet className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(currentBalance)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Saldo real até hoje
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
                {formatCurrency(periodIncome)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {periodTransactions.filter(t => t.nature === "Entrada").length} transações
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
                {formatCurrency(periodExpense)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {periodTransactions.filter(t => t.nature === "Saída").length} transações
              </p>
            </CardContent>
          </Card>

          <Card className="glass border-border hover:border-primary/50 transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Saldo no Fim do Mês
              </CardTitle>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${endOfPeriodBalance >= 0 ? 'text-income' : 'text-expense'}`}>
                {formatCurrency(endOfPeriodBalance)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Projeção com lançamentos futuros
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
            <TabsTrigger value="cards">
              <CreditCard className="w-4 h-4 mr-2" />
              Cartões
            </TabsTrigger>
            <TabsTrigger value="debug">
              <Bug className="w-4 h-4 mr-2" />
              Debug Saldo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <OverviewDashboard selectedMonths={selectedMonths} selectedYear={selectedYear} />
          </TabsContent>

          <TabsContent value="transactions" className="space-y-6">
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

          <TabsContent value="debug" className="space-y-6">
            <DebugSaldoTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
