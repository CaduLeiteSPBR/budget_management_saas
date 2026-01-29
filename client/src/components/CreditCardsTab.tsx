import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CreditCard as CreditCardIcon, Plus, Edit, Trash2, Calendar } from "lucide-react";
import { toast } from "sonner";

// Função auxiliar para identificar mês ativo
function getActiveBillingMonth(closingDay: number): string {
  const now = new Date();
  const currentDay = now.getUTCDate();
  const currentMonth = now.getUTCMonth();
  const currentYear = now.getUTCFullYear();
  
  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  
  if (currentDay <= closingDay) {
    // Ciclo do mês atual
    return `${monthNames[currentMonth]} ${currentYear}`;
  } else {
    // Ciclo do próximo mês
    let nextMonth = currentMonth + 1;
    let nextYear = currentYear;
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear++;
    }
    return `${monthNames[nextMonth]} ${nextYear}`;
  }
}

export default function CreditCardsTab() {
  const utils = trpc.useUtils();
  const { data: cards, isLoading } = trpc.creditCards.list.useQuery();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    brand: "",
    limit: "",
    closingDay: "15",
    dueDay: "25",
    recurringAmount: "0.00",
    expectedAmount: "0.00",
    division: "Pessoal" as "Pessoal" | "Familiar" | "Investimento",
    type: "Essencial" as "Essencial" | "Importante" | "Conforto" | "Investimento",
  });

  const createMutation = trpc.creditCards.create.useMutation({
    onSuccess: () => {
      toast.success("Cartão cadastrado com sucesso!");
      utils.creditCards.list.invalidate();
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Erro ao cadastrar: ${error.message}`);
    },
  });

  const updateMutation = trpc.creditCards.update.useMutation({
    onSuccess: () => {
      toast.success("Cartão atualizado com sucesso!");
      utils.creditCards.list.invalidate();
      setEditingCard(null);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  const deleteMutation = trpc.creditCards.delete.useMutation({
    onSuccess: () => {
      toast.success("Cartão excluído com sucesso!");
      utils.creditCards.list.invalidate();
      setDeleteId(null);
    },
    onError: (error) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    },
  });

  const updateCurrentTotalMutation = trpc.creditCards.updateCurrentTotal.useMutation({
    onSuccess: (data) => {
      toast.success("Valor atualizado e projeção recalculada!");
      utils.creditCards.list.invalidate();
      utils.transactions.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      brand: "",
      limit: "",
      closingDay: "15",
      dueDay: "25",
      recurringAmount: "0.00",
      expectedAmount: "0.00",
      division: "Pessoal",
      type: "Essencial",
    });
  };

  const handleSubmit = () => {
    const payload = {
      ...formData,
      closingDay: parseInt(formData.closingDay),
      dueDay: parseInt(formData.dueDay),
    };
    
    if (editingCard) {
      updateMutation.mutate({
        id: editingCard.id,
        ...payload,
      });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (card: any) => {
    setEditingCard(card);
    setFormData({
      name: card.name,
      brand: card.brand,
      limit: card.limit,
      closingDay: card.closingDay.toString(),
      dueDay: card.dueDay.toString(),
      recurringAmount: card.recurringAmount,
      expectedAmount: card.expectedAmount,
      division: card.division,
      type: card.type,
    });
  };

  const handleCurrentTotalBlur = (cardId: number, value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) {
      toast.error("Valor inválido");
      return;
    }
    updateCurrentTotalMutation.mutate({
      id: cardId,
      currentTotalAmount: numValue.toFixed(2),
    });
  };

  const formatCurrency = (value: string | number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(value));
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Carregando cartões...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header com botão de adicionar */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Cartões de Crédito</h2>
          <p className="text-muted-foreground">Gerencie seus cartões e projete faturas automaticamente</p>
        </div>
        <Dialog open={isCreateOpen || !!editingCard} onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingCard(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Cartão
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCard ? "Editar Cartão" : "Novo Cartão"}</DialogTitle>
              <DialogDescription>
                Preencha as informações do cartão de crédito
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Banco</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Nubank, Itaú"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand">Bandeira</Label>
                  <Input
                    id="brand"
                    placeholder="Ex: Mastercard, Visa"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="limit">Limite</Label>
                <Input
                  id="limit"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.limit}
                  onChange={(e) => setFormData({ ...formData, limit: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="closingDay">Dia do Fechamento</Label>
                  <Input
                    id="closingDay"
                    type="number"
                    min="1"
                    max="31"
                    value={formData.closingDay}
                    onChange={(e) => setFormData({ ...formData, closingDay: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDay">Dia do Vencimento</Label>
                  <Input
                    id="dueDay"
                    type="number"
                    min="1"
                    max="31"
                    value={formData.dueDay}
                    onChange={(e) => setFormData({ ...formData, dueDay: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="recurringAmount">Valor Fixo Recorrente</Label>
                  <Input
                    id="recurringAmount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.recurringAmount}
                    onChange={(e) => setFormData({ ...formData, recurringAmount: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expectedAmount">Fatura Esperada</Label>
                  <Input
                    id="expectedAmount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.expectedAmount}
                    onChange={(e) => setFormData({ ...formData, expectedAmount: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="division">Divisão Padrão</Label>
                  <Select
                    value={formData.division}
                    onValueChange={(value: any) => setFormData({ ...formData, division: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pessoal">Pessoal</SelectItem>
                      <SelectItem value="Familiar">Familiar</SelectItem>
                      <SelectItem value="Investimento">Investimento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo Padrão</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Essencial">Essencial</SelectItem>
                      <SelectItem value="Importante">Importante</SelectItem>
                      <SelectItem value="Conforto">Conforto</SelectItem>
                      <SelectItem value="Investimento">Investimento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditingCard(null);
                  resetForm();
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleSubmit}>
                {editingCard ? "Salvar Alterações" : "Cadastrar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de cartões */}
      {!cards || cards.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CreditCardIcon className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum cartão cadastrado</p>
            <p className="text-sm text-muted-foreground">Clique em "Adicionar Cartão" para começar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <Card key={card.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{card.name}</CardTitle>
                    <CardDescription>{card.brand}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(card)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(card.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Limite:</span>
                    <span className="font-medium">{formatCurrency(card.limit)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Fechamento:</span>
                    <span className="font-medium">Dia {card.closingDay}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Vencimento:</span>
                    <span className="font-medium">Dia {card.dueDay}</span>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor={`current-total-${card.id}`} className="text-sm font-medium">
                      Valor Total Hoje
                    </Label>
                    <Badge variant="secondary" className="text-xs">
                      <Calendar className="w-3 h-3 mr-1" />
                      {getActiveBillingMonth(card.closingDay)}
                    </Badge>
                  </div>
                  <Input
                    id={`current-total-${card.id}`}
                    type="number"
                    step="0.01"
                    defaultValue={card.currentTotalAmount}
                    onBlur={(e) => handleCurrentTotalBlur(card.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur();
                      }
                    }}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Pressione Enter ou clique fora para salvar
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este cartão? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  deleteMutation.mutate({ id: deleteId });
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
