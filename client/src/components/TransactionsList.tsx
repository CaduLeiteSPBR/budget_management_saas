import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Edit, Trash2, Filter, X, ArrowUpCircle, ArrowDownCircle, Download, ChevronRight, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import InvoiceImport from "@/components/InvoiceImport";
import InvoiceValidation from "@/components/InvoiceValidation";

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
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc"); // Ordem ascendente (cronológica)
  
  // Estados para importação de faturas
  const [importedTransactions, setImportedTransactions] = useState<any[]>([]);
  const [importPaymentDate, setImportPaymentDate] = useState<number>(0);
  const [importBankName, setImportBankName] = useState<string>("");
  const [showValidation, setShowValidation] = useState(false);
  
  // Filtros de período - suporte a múltiplos meses
  const [selectedMonths, setSelectedMonths] = useState<number[]>([currentMonth]);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [appliedMonths, setAppliedMonths] = useState<number[]>([currentMonth]);
  const [appliedYear, setAppliedYear] = useState<number>(currentYear);

  // Calcular startDate e endDate baseado nos meses aplicados
  const minMonth = Math.min(...appliedMonths);
  const maxMonth = Math.max(...appliedMonths);
  const startDate = Date.UTC(appliedYear, minMonth - 1, 1);
  const endDate = Date.UTC(appliedYear, maxMonth, 0, 23, 59, 59, 999);

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

  const handleTransactionsExtracted = (transactions: any[], paymentDate: number, bankName: string) => {
    setImportedTransactions(transactions);
    setImportPaymentDate(paymentDate);
    setImportBankName(bankName);
    setShowValidation(true);
  };

  const handleImportComplete = () => {
    setShowValidation(false);
    setImportedTransactions([]);
    setImportPaymentDate(0);
    setImportBankName("");
    utils.transactions.list.invalidate();
    utils.transactions.balance.invalidate();
  };

  const handleImportCancel = () => {
    setShowValidation(false);
    setImportedTransactions([]);
    setImportPaymentDate(0);
    setImportBankName("");
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

  // Função para exportar para CSV
  const handleExport = () => {
    if (!sortedTransactions || sortedTransactions.length === 0) {
      toast.error("Nenhum lançamento para exportar");
      return;
    }

    // Cabeçalho do CSV
    const headers = ["Data", "Descrição", "Valor", "Natureza", "Divisão", "Tipo", "Categoria"];
    
    // Linhas de dados
    const rows = sortedTransactions.map(t => [
      formatDate(t.date),
      `"${t.description.replace(/"/g, '""')}"`, // Escapar aspas
      Number(t.amount).toFixed(2),
      t.nature,
      t.division || "",
      t.type || "",
      t.categoryName || ""
    ]);

    // Montar CSV
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    // Criar blob e fazer download
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" }); // BOM para Excel
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    link.setAttribute("href", url);
    link.setAttribute("download", `lancamentos_${today}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`${sortedTransactions.length} lançamentos exportados com sucesso!`);
  };

  // Filtrar transações
  const filteredTransactions = transactions?.filter((t) => {
    // Filtrar por meses selecionados
    const transactionDate = new Date(t.date);
    const transactionMonth = transactionDate.getUTCMonth() + 1; // 1-12
    if (!appliedMonths.includes(transactionMonth)) return false;
    
    if (filterNature !== "all" && t.nature !== filterNature) return false;
    if (filterDivision !== "all" && t.division !== filterDivision) return false;
    if (filterType !== "all" && t.type !== filterType) return false;
    if (searchTerm && !t.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Ordenar transações com múltiplos critérios
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
    if (primaryComparison !== 0) return primaryComparison;
    
    // Critérios secundários (sempre ascendente): Data → Natureza → Divisão → Tipo → Categoria
    
    // 1. Data
    if (sortField !== "date") {
      const dateComp = a.date - b.date;
      if (dateComp !== 0) return dateComp;
    }
    
    // 2. Natureza (Entrada antes de Saída)
    if (sortField !== "nature") {
      const natureComp = a.nature.localeCompare(b.nature);
      if (natureComp !== 0) return natureComp;
    }
    
    // 3. Divisão
    const divisionComp = (a.division || "").localeCompare(b.division || "");
    if (divisionComp !== 0) return divisionComp;
    
    // 4. Tipo
    const typeComp = (a.type || "").localeCompare(b.type || "");
    if (typeComp !== 0) return typeComp;
    
    // 5. Categoria
    const categoryComp = (a.categoryName || "").localeCompare(b.categoryName || "");
    return categoryComp;
  });

  // Estado para controlar expansão de grupos de CC
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Função para alternar expansão de grupo
  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  // Agrupar lançamentos de cartão de crédito
  const groupedTransactions = sortedTransactions.reduce((acc, transaction) => {
    const isCC = transaction.description.startsWith("CC - ");
    
    if (isCC) {
      // Extrair banco do formato "CC - [Banco] - Descrição"
      const parts = transaction.description.split(" - ");
      const bank = parts[1] || "Cartão";
      const date = transaction.date;
      const groupKey = `cc_${bank}_${date}`;
      
      if (!acc.groups[groupKey]) {
        acc.groups[groupKey] = {
          key: groupKey,
          bank,
          date,
          transactions: [],
          totalAmount: 0,
          nature: transaction.nature,
          division: transaction.division,
          type: transaction.type,
        };
      }
      
      acc.groups[groupKey].transactions.push(transaction);
      acc.groups[groupKey].totalAmount += Number(transaction.amount);
    } else {
      acc.ungrouped.push(transaction);
    }
    
    return acc;
  }, { groups: {} as Record<string, any>, ungrouped: [] as any[] });

  // Combinar grupos e lançamentos não agrupados, mantendo ordem por data
  const displayTransactions: any[] = [];
  
  sortedTransactions.forEach((transaction) => {
    const isCC = transaction.description.startsWith("CC - ");
    
    if (isCC) {
      const parts = transaction.description.split(" - ");
      const bank = parts[1] || "Cartão";
      const date = transaction.date;
      const groupKey = `cc_${bank}_${date}`;
      const group = groupedTransactions.groups[groupKey];
      
      // Adicionar grupo apenas uma vez (na primeira transação do grupo)
      if (group && group.transactions[0].id === transaction.id) {
        const isExpanded = expandedGroups.has(groupKey);
        
        displayTransactions.push({
          type: 'group',
          groupKey,
          bank,
          date,
          totalAmount: group.totalAmount,
          count: group.transactions.length,
          nature: group.nature,
          division: group.division,
          typeField: group.type,
          isExpanded,
        });
        
        if (isExpanded) {
          group.transactions.forEach((t: any) => {
            displayTransactions.push({
              type: 'transaction',
              isChild: true,
              ...t,
            });
          });
        }
      }
    } else {
      const { type: typeField, ...transactionRest } = transaction;
      displayTransactions.push({
        type: 'transaction',
        isChild: false,
        typeField,
        ...transactionRest,
      });
    }
  });

  // Calcular saldo acumulado considerando agrupamento
  let runningBalance = 0;
  const transactionsWithBalance = displayTransactions.map((item) => {
    if (item.type === 'group') {
      const amount = item.totalAmount;
      runningBalance += item.nature === "Entrada" ? amount : -amount;
      return {
        ...item,
        balance: runningBalance,
      };
    } else if (item.type === 'transaction' && !item.isChild) {
      const amount = Number(item.amount);
      runningBalance += item.nature === "Entrada" ? amount : -amount;
      return {
        ...item,
        balance: runningBalance,
      };
    } else {
      // Transações filhas não afetam saldo (já contado no grupo)
      return {
        ...item,
        balance: runningBalance,
      };
    }
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
    if (selectedMonths.length === 0) {
      toast.error("Selecione pelo menos um mês");
      return;
    }
    setAppliedMonths(selectedMonths);
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
            <div className="flex gap-2">
              <Button onClick={handleExport} variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Exportar
              </Button>
              <Button onClick={() => onEdit?.(0)} variant="default">
                Novo Lançamento
              </Button>
              <InvoiceImport onTransactionsExtracted={handleTransactionsExtracted} />
            </div>
          </div>

          {/* Filtros de Período */}
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div className="flex-1 min-w-[150px]">
              <label className="text-sm font-medium mb-2 block">Meses</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    {selectedMonths.length === 0
                      ? "Selecione os meses"
                      : selectedMonths.length === 12
                      ? "Todos os meses"
                      : selectedMonths.length === 1
                      ? months.find(m => m.value === selectedMonths[0])?.label
                      : `${selectedMonths.length} meses selecionados`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-4" align="start">
                  <div className="space-y-3">
                    <div className="flex gap-2 mb-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setSelectedMonths(months.map(m => m.value))}
                      >
                        Todos
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setSelectedMonths([])}
                      >
                        Limpar
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {months.map((month) => (
                        <div key={month.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`month-${month.value}`}
                            checked={selectedMonths.includes(month.value)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedMonths([...selectedMonths, month.value].sort((a, b) => a - b));
                              } else {
                                setSelectedMonths(selectedMonths.filter(m => m !== month.value));
                              }
                            }}
                          />
                          <label
                            htmlFor={`month-${month.value}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {month.label.substring(0, 3)}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
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
                  {transactionsWithBalance.map((item, index) => {
                    // Determinar cor alternada baseada em mudança de data
                    let isNewDateGroup = false;
                    if (index === 0) {
                      isNewDateGroup = true;
                    } else {
                      const prevDate = new Date(transactionsWithBalance[index - 1].date).toDateString();
                      const currentDate = new Date(item.date).toDateString();
                      isNewDateGroup = prevDate !== currentDate;
                    }
                    
                    // Contar quantos grupos de data já passaram
                    let dateGroupIndex = 0;
                    for (let i = 0; i < index; i++) {
                      const prevDate = new Date(transactionsWithBalance[i].date).toDateString();
                      const currentDate = new Date(transactionsWithBalance[i + 1]?.date || item.date).toDateString();
                      if (prevDate !== currentDate) {
                        dateGroupIndex++;
                      }
                    }
                    
                    const rowBgClass = dateGroupIndex % 2 === 0 ? "" : "bg-muted/30";
                    
                    // Renderizar grupo de CC
                    if (item.type === 'group') {
                      return (
                        <TableRow key={item.groupKey} className={rowBgClass}>
                          <TableCell className="font-medium">
                            {formatDate(item.date)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => toggleGroup(item.groupKey)}
                              >
                                {item.isExpanded ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </Button>
                              <div>
                                <div className="font-medium">Fatura Cartão - {item.bank}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {item.count} lançamentos
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={item.nature === "Entrada" ? "default" : "destructive"}
                              className={item.nature === "Entrada" ? "bg-income hover:bg-income" : "bg-expense hover:bg-expense"}
                            >
                              {item.nature === "Entrada" ? (
                                <ArrowUpCircle className="w-3 h-3 mr-1" />
                              ) : (
                                <ArrowDownCircle className="w-3 h-3 mr-1" />
                              )}
                              {item.nature}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {item.division ? (
                              <Badge variant="outline">{item.division}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {item.typeField ? (
                              <Badge variant="outline">{item.typeField}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-muted-foreground text-sm">-</span>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            <span className={item.nature === "Entrada" ? "text-income" : "text-expense"}>
                              {formatCurrency(item.totalAmount)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            <span className={item.balance >= 0 ? "text-income" : "text-expense"}>
                              {formatCurrency(item.balance)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-muted-foreground text-sm">-</span>
                          </TableCell>
                        </TableRow>
                      );
                    }
                    
                    // Renderizar transação normal ou filha
                    const transaction = item;
                    const isChild = item.isChild;
                    
                    return (
                    <TableRow key={transaction.id} className={`${rowBgClass} ${isChild ? 'bg-muted/50' : ''}`}>
                      <TableCell className="font-medium">
                        {formatDate(transaction.date)}
                      </TableCell>
                      <TableCell>
                        <div className={isChild ? "ml-10" : ""}>
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
                    );
                  })}
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

      {/* Validação de importação */}
      {showValidation && importedTransactions.length > 0 && (
        <InvoiceValidation
          transactions={importedTransactions}
          paymentDate={importPaymentDate}
          bankName={importBankName}
          onComplete={handleImportComplete}
          onCancel={handleImportCancel}
        />
      )}
    </>
  );
}
