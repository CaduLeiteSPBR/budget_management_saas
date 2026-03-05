import { useState, useEffect } from "react";
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
import { Edit, Trash2, Filter, X, ArrowUpCircle, ArrowDownCircle, Download, Clock } from "lucide-react";
import { toast } from "sonner";
import InvoiceImport from "@/components/InvoiceImport";
import InvoiceValidation from "@/components/InvoiceValidation";
import { DeleteRecurringDialog } from "@/components/DeleteRecurringDialog";

interface TransactionsListProps {
  onEdit?: (transactionId: number) => void;
  selectedMonths: number[];
  selectedYear: number;
}

export default function TransactionsList({ onEdit, selectedMonths, selectedYear }: TransactionsListProps) {
  const utils = trpc.useUtils();
  
  const [filterNature, setFilterNature] = useState<string>("all");
  const [filterDivision, setFilterDivision] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteRecurringId, setDeleteRecurringId] = useState<number | null>(null);
  const [deleteRecurringDescription, setDeleteRecurringDescription] = useState<string>("");
  const [sortField, setSortField] = useState<"date" | "description" | "amount" | "nature">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  
  const [importedTransactions, setImportedTransactions] = useState<any[]>([]);
  const [importPaymentDate, setImportPaymentDate] = useState<number>(0);
  const [importBankName, setImportBankName] = useState<string>("");
  const [showValidation, setShowValidation] = useState(false);

  const minMonth = Math.min(...selectedMonths);
  const maxMonth = Math.max(...selectedMonths);
  const startDate = Date.UTC(selectedYear, minMonth - 1, 1);
  const endDate = Date.UTC(selectedYear, maxMonth, 0, 23, 59, 59, 999);

  const { data: transactions, isLoading } = trpc.transactions.list.useQuery({ startDate, endDate });

  const deleteMutation = trpc.transactions.delete.useMutation({
    onSuccess: () => {
      toast.success("Lançamento excluído com sucesso!");
      utils.transactions.list.invalidate();
      utils.transactions.balance.invalidate();
      utils.transactions.getFinancialSummary.invalidate();
      setDeleteId(null);
    },
    onError: (error) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    },
  });

  const deleteRecurringSingleMutation = trpc.transactions.delete.useMutation({
    onSuccess: () => {
      toast.success("Lançamento recorrente excluído com sucesso!");
      utils.transactions.list.invalidate();
      utils.transactions.balance.invalidate();
      utils.transactions.getFinancialSummary.invalidate();
      setDeleteRecurringId(null);
      setDeleteRecurringDescription("");
    },
    onError: (error) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    },
  });

  const deleteRecurringFutureMutation = trpc.transactions.deleteRecurringSeries.useMutation({
    onSuccess: (result) => {
      toast.success(`Lançamento e ${result.deletedCount - 1} parcelas futuras removidas com sucesso!`);
      utils.transactions.list.invalidate();
      utils.transactions.balance.invalidate();
      utils.transactions.getFinancialSummary.invalidate();
      setDeleteRecurringId(null);
      setDeleteRecurringDescription("");
    },
    onError: (error) => {
      toast.error(`Erro ao excluir série: ${error.message}`);
    },
  });

  const updateIsPaidMutation = trpc.transactions.update.useMutation({
    onSuccess: () => {
      utils.transactions.list.invalidate();
      utils.transactions.balance.invalidate();
      utils.transactions.getFinancialSummary.invalidate();
    },
    onError: (error) => {
      console.error("Erro ao atualizar isPaid:", error.message);
    },
  });

  useEffect(() => {
    if (!transactions) return;

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();

    const scheduledTransactionsThatExpired = transactions.filter(
      (t) => t.date <= todayTimestamp && !t.isPaid
    );

    scheduledTransactionsThatExpired.forEach((transaction) => {
      updateIsPaidMutation.mutate({
        id: transaction.id,
        isPaid: true,
      });
    });
  }, [transactions]);

  const formatCurrency = (value: string | number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(value));
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  };

  const handleDelete = (id: number) => {
    const transaction = sortedTransactions?.find(t => t.id === id);
    
    if (transaction && transaction.recurringGroupId) {
      setDeleteRecurringId(id);
      setDeleteRecurringDescription(transaction.description);
    } else {
      setDeleteId(id);
    }
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteMutation.mutate({ id: deleteId });
    }
  };

  const handleDeleteRecurringSingle = () => {
    if (deleteRecurringId) {
      deleteRecurringSingleMutation.mutate({ id: deleteRecurringId });
    }
  };

  const handleDeleteRecurringFuture = () => {
    if (deleteRecurringId) {
      deleteRecurringFutureMutation.mutate({ id: deleteRecurringId, deleteAllFuture: true });
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
    utils.transactions.getFinancialSummary.invalidate();
  };

  const handleExport = () => {
    if (!sortedTransactions || sortedTransactions.length === 0) {
      toast.error("Nenhum lançamento para exportar");
      return;
    }

    const headers = ["Data", "Descrição", "Natureza", "Divisão", "Tipo", "Categoria", "Valor", "Notas"];
    const rows = sortedTransactions.map(t => [
      formatDate(t.date),
      t.description,
      t.nature,
      t.division || "-",
      t.type || "-",
      t.categoryName || "-",
      t.amount,
      t.notes || ""
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    const today = new Date().toISOString().split('T')[0];
    link.setAttribute("href", url);
    link.setAttribute("download", `lancamentos_${today}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`${sortedTransactions.length} lançamentos exportados com sucesso!`);
  };

  const filteredTransactions = transactions?.filter((t) => {
    const transactionDate = new Date(t.date);
    const transactionMonth = transactionDate.getUTCMonth() + 1;
    if (!selectedMonths.includes(transactionMonth)) return false;
    
    if (filterNature !== "all" && t.nature !== filterNature) return false;
    if (filterDivision !== "all" && t.division !== filterDivision) return false;
    if (filterType !== "all" && t.type !== filterType) return false;
    if (filterCategory !== "all" && t.categoryName !== filterCategory) return false;
    if (searchTerm && !t.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const sortedTransactions = [...(filteredTransactions || [])].sort((a, b) => {
    const aIsSystem = (a as any).isSystemGenerated || false;
    const bIsSystem = (b as any).isSystemGenerated || false;
    
    if (aIsSystem && !bIsSystem) return -1;
    if (!aIsSystem && bIsSystem) return 1;
    
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
    
    const primaryComparison = sortOrder === "asc" ? comparison : -comparison;
    if (primaryComparison !== 0) return primaryComparison;
    
    if (sortField !== "date") {
      const dateComp = a.date - b.date;
      if (dateComp !== 0) return dateComp;
    }
    
    if (sortField !== "nature") {
      const natureComp = a.nature.localeCompare(b.nature);
      if (natureComp !== 0) return natureComp;
    }

    return 0;
  });

  const transactionsWithBalance = sortedTransactions.map((transaction, index) => {
    let balance = 0;
    for (let i = 0; i <= index; i++) {
      const t = sortedTransactions[i];
      balance += t.nature === "Entrada" ? Number(t.amount) : -Number(t.amount);
    }
    return { ...transaction, balance };
  });

  const handleSort = (field: "date" | "description" | "amount" | "nature") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const uniqueDivisions = Array.from(new Set(transactions?.map(t => t.division).filter(Boolean) || [])) as string[];
  const uniqueTypes = Array.from(new Set(transactions?.map(t => t.type).filter(Boolean) || [])) as string[];
  const uniqueCategories = Array.from(new Set(transactions?.map(t => t.categoryName).filter(Boolean) || [])) as string[];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Lançamentos</CardTitle>
          <CardDescription>Gerencie suas transações financeiras</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4">
            <div className="flex gap-2 flex-wrap">
              <Input
                placeholder="Buscar por descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 min-w-[200px]"
              />
              
              <Select value={filterNature} onValueChange={setFilterNature}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Natureza" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="Entrada">Entradas</SelectItem>
                  <SelectItem value="Saída">Saídas</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterDivision} onValueChange={setFilterDivision}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Divisão" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {uniqueDivisions.map(div => (
                    <SelectItem key={div} value={div}>{div}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {uniqueTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {uniqueCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilterNature("all");
                  setFilterDivision("all");
                  setFilterType("all");
                  setFilterCategory("all");
                  setSearchTerm("");
                }}
              >
                <X className="w-4 h-4 mr-2" />
                Limpar
              </Button>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-auto p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleExport}
                    className="w-full justify-start"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Exportar como CSV
                  </Button>
                </PopoverContent>
              </Popover>

              <InvoiceImport onTransactionsExtracted={handleTransactionsExtracted} />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8">Carregando lançamentos...</div>
          ) : (
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
                        {sortField === "date" && (sortOrder === "asc" ? " ↑" : " ↓")}
                      </div>
                    </TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-accent/50"
                      onClick={() => handleSort("nature")}
                    >
                      <div className="flex items-center gap-2">
                        Natureza
                        {sortField === "nature" && (sortOrder === "asc" ? " ↑" : " ↓")}
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
                        {sortField === "amount" && (sortOrder === "asc" ? " ↑" : " ↓")}
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactionsWithBalance.map((transaction, index) => {
                    let isNewDateGroup = false;
                    if (index === 0) {
                      isNewDateGroup = true;
                    } else {
                      const currentDate = new Date(transaction.date).toDateString();
                      const prevDate = new Date(transactionsWithBalance[index - 1].date).toDateString();
                      isNewDateGroup = currentDate !== prevDate;
                    }

                    let dateGroupIndex = 0;
                    for (let i = 0; i < index; i++) {
                      const currentDate = new Date(transactionsWithBalance[i].date).toDateString();
                      const nextDate = new Date(transactionsWithBalance[i + 1]?.date || 0).toDateString();
                      if (currentDate !== nextDate) {
                        dateGroupIndex++;
                      }
                    }

                    const rowBgClass = dateGroupIndex % 2 === 0 ? "" : "bg-muted/30";
                    
                    return (
                    <TableRow key={transaction.id} className={rowBgClass}>
                      <TableCell className="font-medium">
                        {formatDate(transaction.date)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="font-medium">{transaction.description}</div>
                            {transaction.date > Date.now() && !transaction.isPaid && (
                              <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-xs gap-1">
                                <Clock className="w-3 h-3" />
                                Agendado
                              </Badge>
                            )}
                          </div>
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
                          className={transaction.nature === "Entrada" ? "bg-green-600 hover:bg-green-700 text-white" : "bg-red-600 hover:bg-red-700 text-white"}
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
                        <span className={transaction.nature === "Entrada" ? "text-green-600" : "text-red-600"}>
                          {formatCurrency(transaction.amount)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        <span className={transaction.balance >= 0 ? "text-green-600" : "text-red-600"}>
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
          )}
        </CardContent>
      </Card>

      <DeleteRecurringDialog
        open={deleteRecurringId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteRecurringId(null);
            setDeleteRecurringDescription("");
          }
        }}
        onDeleteSingle={handleDeleteRecurringSingle}
        onDeleteFuture={handleDeleteRecurringFuture}
        transactionDescription={deleteRecurringDescription}
      />

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showValidation && (
        <InvoiceValidation
          transactions={importedTransactions}
          paymentDate={importPaymentDate}
          bankName={importBankName}
          onComplete={handleImportComplete}
          onCancel={() => setShowValidation(false)}
        />
      )}
    </div>
  );
}
