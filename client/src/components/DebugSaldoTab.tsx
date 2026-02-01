import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

export function DebugSaldoTab() {
  const utils = trpc.useUtils();
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Buscar TODAS as transações pagas até hoje (SQL DIRETO)
  const { data: allPaidTransactions, isLoading } = trpc.transactions.getAllPaidTransactions.useQuery();

  // Mutation para deletar transação
  const deleteMutation = trpc.transactions.delete.useMutation({
    onSuccess: () => {
      alert("Transação excluída com sucesso!");
      utils.transactions.getAllPaidTransactions.invalidate();
      utils.transactions.getFinancialSummary.invalidate();
      utils.transactions.list.invalidate();
      utils.transactions.balance.invalidate();
      setDeleteId(null);
    },
    onError: (error) => {
      alert(`Erro ao excluir: ${error.message}`);
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const totalEntradas = allPaidTransactions?.filter(t => t.nature === "Entrada").reduce((sum, t) => sum + Number(t.amount), 0) || 0;
  const totalSaidas = allPaidTransactions?.filter(t => t.nature === "Saída").reduce((sum, t) => sum + Number(t.amount), 0) || 0;
  const saldoCalculado = totalEntradas - totalSaidas;

  return (
    <>
      <Card className="glass-strong border-yellow-500/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            <CardTitle>Debug Saldo - Transações Pagas até Hoje</CardTitle>
          </div>
          <CardDescription>
            Lista completa de TODAS as transações marcadas como "Pagas" até hoje (01/02/2026 23:59:59 UTC).
            Use esta aba para identificar e remover transações fantasmagóricas que estão inflando o saldo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total de Transações</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{allPaidTransactions?.length || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-green-600">Total Entradas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  R$ {totalEntradas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {allPaidTransactions?.filter(t => t.nature === "Entrada").length || 0} transações
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-red-600">Total Saídas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  R$ {totalSaidas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {allPaidTransactions?.filter(t => t.nature === "Saída").length || 0} transações
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-blue-600">Saldo Calculado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  R$ {saldoCalculado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Entradas - Saídas
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabela de Transações */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">ID</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-[120px]">Valor</TableHead>
                  <TableHead className="w-[100px]">Natureza</TableHead>
                  <TableHead className="w-[120px]">Data</TableHead>
                  <TableHead className="w-[150px]">Categoria</TableHead>
                  <TableHead className="w-[80px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allPaidTransactions && allPaidTransactions.length > 0 ? (
                  allPaidTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-mono text-xs">{transaction.id}</TableCell>
                      <TableCell className="font-medium">{transaction.description}</TableCell>
                      <TableCell className={transaction.nature === "Entrada" ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                        R$ {Number(transaction.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          transaction.nature === "Entrada" 
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}>
                          {transaction.nature}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{transaction.dateReadable}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{transaction.categoryName}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(transaction.id)}
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Nenhuma transação paga encontrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
