import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Filter, X, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { toast } from "sonner";

interface TransactionsListProps {
  onEdit?: (transactionId: number) => void;
}

export default function TransactionsList({ onEdit }: TransactionsListProps) {
  const utils = trpc.useUtils();
  
  // Obter mês e ano atuais
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentYear = now.getFullYear();
  
  const [filterNature, setFilterNature] = useState<string>("all");
  const [filterDivision, setFilterDivision] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [sortField, setSortField] = useState<"date" | "description" | "amount" | "nature">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  // Filtros de período
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [appliedMonth, setAppliedMonth] = useState<number>(currentMonth);
  const [appliedYear, setAppliedYear] = useState<number>(currentYear);

  // Calcular startDate e endDate baseado no período aplicado
  const startDate = Date.UTC(appliedYear, appliedMonth - 1, 1);
  const endDate = Date.UTC(appliedYear, appliedMonth, 0, 23, 59, 59, 999);

  const { data: transactions, isLoading } = trpc.transactions.list.useQuery({ startDate, endDate });

  const deleteMutation = trpc.transactions.delete.useMutation({
    onSuccess: () => {
      toast.success("Lançamento excluído com sucesso!");
      utils.transactions.list.invalidate();
      utils.transactions.balance.invalidate();
      setDeleteId(null);
    },
    onError: (error) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    },
  });

  const formatCurrency = (value: string | number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(value));
  };

  const formatDate = (timestamp: number) => {
    // Use UTC to avoid timezone issues
    const date = new Date(timestamp);
    return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  };

  const handleDelete = (id: number) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteMutation.mutate({ id: deleteId });
    }
  };

  // Função para alternar ordenação
  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Filtrar transações
  const filteredTransactions = transactions?.filter((t) => {
    if (filterNature !== "all" && t.nature !== filterNature) return false;
    if (filterDivision !== "all" && t.division !== filterDivision) return false;
    if (filterType !== "all" && t.type !== filterType) return false;
    if (searchTerm && !t.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Ordenar transações
  const sortedTransactions = [...(filteredTransactions || [])].sort((a, b) => {
    let comparison = 0;
    
    switch (sortField) {
      case "date":
        comparison = a.date - b.date;
        break;
      case "description":
        comparison = a.description.localeCompare(b.description);
        break;
      case "amount":
        comparison = Number(a.amount) - Number(b.amount);
        break;
      case "nature":
        comparison = a.nature.localeCompare(b.nature);
        break;
    }
    
    // Aplicar ordem principal
    const primaryComparison = sortOrder === "asc" ? comparison : -comparison;
    
    // Se houver empate, usar Natureza como critério secundário (Entrada antes de Saída)
    if (primaryComparison === 0 && sortField !== "nature") {
      // "Entrada" vem antes de "Saída" alfabeticamente, então usamos localeCompare diretamente
      return a.nature.localeCompare(b.nature);
    }
    
    return primaryComparison;
  });

  // Calcular saldo acumulado
  let runningBalance = 0;
  const transactionsWithBalance = sortedTransactions.map((t) => {
    const amount = Number(t.amount);
    runningBalance += t.nature === "Entrada" ? amount : -amount;
    return {
      ...t,
      balance: runningBalance,
    };
  });

  const hasActiveFilters = filterNature !== "all" || filterDivision !== "all" || filterType !== "all" || searchTerm;

  const clearFilters = () => {
    setFilterNature("all");
    setFilterDivision("all");
    setFilterType("all");
    setSearchTerm("");
  };

  if (isLoading) {
    return (
      <Card className="glass border-border">
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Carregando transações...</div>
        </CardContent>
      </Card>
    );
  }

  const applyPeriodFilter = () => {
    setAppliedMonth(selectedMonth);
    setAppliedYear(selectedYear);
  };

  // Calcular saldo inicial e final do período
  const initialBalance = 0; // TODO: buscar saldo anterior ao período
  let periodBalance = initialBalance;
  transactionsWithBalance.forEach((t) => {
    const amount = Number(t.amount);
    periodBalance += t.nature === "Entrada" ? amount : -amount;
  });
  const finalBalance = periodBalance;

  const months = [
    { value: 1, label: "Janeiro" },
    { value: 2, label: "Fevereiro" },
    { value: 3, label: "Março" },
    { value: 4, label: "Abril" },
    { value: 5, label: "Maio" },
    { value: 6, label: "Junho" },
    { value: 7, label: "Julho" },
    { value: 8, label: "Agosto" },
    { value: 9, label: "Setembro" },
    { value: 10, label: "Outubro" },
    { value: 11, label: "Novembro" },
    { value: 12, label: "Dezembro" },
  ];

  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

  return (
    <>
      {/* Cards de Saldo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card className="glass border-border">
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground mb-1">Saldo Inicial</div>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(initialBalance)}
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-border">
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground mb-1">Saldo Final</div>
            <div className={`text-2xl font-bold ${finalBalance >= 0 ? 'text-income' : 'text-expense'}`}>
              {formatCurrency(finalBalance)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass border-border">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle>Lançamentos</CardTitle>
              <CardDescription>
                {transactionsWithBalance?.length || 0} transação(ões) encontrada(s)
              </CardDescription>
            </div>
          </div>

          {/* Filtros de Período */}
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div className="flex-1 min-w-[150px]">
              <label className="text-sm font-medium mb-2 block">Mês</label>
              <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m.value} value={m.value.toString()}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[120px]">
              <label className="text-sm font-medium mb-2 block">Ano</label>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={applyPeriodFilter} className="mb-0">
              Aplicar
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2 mb-0">
                <X className="w-4 h-4" />
                Limpar Filtros
              </Button>
            )}
          </div>

        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Input
                placeholder="Buscar descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <Select value={filterNature} onValueChange={setFilterNature}>
              <SelectTrigger>
                <SelectValue placeholder="Natureza" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="Entrada">Entradas</SelectItem>
                <SelectItem value="Saída">Saídas</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterDivision} onValueChange={setFilterDivision}>
              <SelectTrigger>
                <SelectValue placeholder="Divisão" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="Pessoal">Pessoal</SelectItem>
                <SelectItem value="Familiar">Familiar</SelectItem>
                <SelectItem value="Investimento">Investimento</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Essencial">Essencial</SelectItem>
                <SelectItem value="Importante">Importante</SelectItem>
                <SelectItem value="Conforto">Conforto</SelectItem>
                <SelectItem value="Investimento">Investimento</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabela */}
          {transactionsWithBalance && transactionsWithBalance.length > 0 ? (
            <div className="rounded-md border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-accent/50"
                      onClick={() => handleSort("date")}
                    >
                      <div className="flex items-center gap-2">
                        Data
                        {sortField === "date" && (
                          sortOrder === "asc" ? 
                            <span className="text-primary">↑</span> : 
                            <span className="text-primary">↓</span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-accent/50"
                      onClick={() => handleSort("description")}
                    >
                      <div className="flex items-center gap-2">
                        Descrição
                        {sortField === "description" && (
                          sortOrder === "asc" ? 
                            <span className="text-primary">↑</span> : 
                            <span className="text-primary">↓</span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-accent/50"
                      onClick={() => handleSort("nature")}
                    >
                      <div className="flex items-center gap-2">
                        Natureza
                        {sortField === "nature" && (
                          sortOrder === "asc" ? 
                            <span className="text-primary">↑</span> : 
                            <span className="text-primary">↓</span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead>Divisão</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead 
                      className="text-right cursor-pointer select-none hover:bg-accent/50"
                      onClick={() => handleSort("amount")}
                    >
                      <div className="flex items-center justify-end gap-2">
                        Valor
                        {sortField === "amount" && (
                          sortOrder === "asc" ? 
                            <span className="text-primary">↑</span> : 
                            <span className="text-primary">↓</span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactionsWithBalance.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">
                        {formatDate(transaction.date)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{transaction.description}</div>
                          {transaction.notes && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {transaction.notes}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={transaction.nature === "Entrada" ? "default" : "destructive"}
                          className={transaction.nature === "Entrada" ? "bg-income hover:bg-income" : "bg-expense hover:bg-expense"}
                        >
                          {transaction.nature === "Entrada" ? (
                            <ArrowUpCircle className="w-3 h-3 mr-1" />
                          ) : (
                            <ArrowDownCircle className="w-3 h-3 mr-1" />
                          )}
                          {transaction.nature}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {transaction.division ? (
                          <Badge variant="outline">{transaction.division}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {transaction.type ? (
                          <Badge variant="outline">{transaction.type}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {transaction.categoryName ? (
                          <Badge variant="secondary">{transaction.categoryName}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        <span className={transaction.nature === "Entrada" ? "text-income" : "text-expense"}>
                          {formatCurrency(transaction.amount)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        <span className={transaction.balance >= 0 ? "text-income" : "text-expense"}>
                          {formatCurrency(transaction.balance)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit?.(transaction.id)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(transaction.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Filter className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhuma transação encontrada</p>
              <p className="text-sm mt-2">
                {hasActiveFilters
                  ? "Tente ajustar os filtros ou limpar para ver todas as transações"
                  : "Comece criando seu primeiro lançamento"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
