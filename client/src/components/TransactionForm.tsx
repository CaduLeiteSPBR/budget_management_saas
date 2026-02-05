import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

interface TransactionFormProps {
  transactionId?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function TransactionForm({ transactionId, onSuccess, onCancel }: TransactionFormProps) {
  const utils = trpc.useUtils();
  
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [nature, setNature] = useState<"Entrada" | "Saída">("Saída");
  const [division, setDivision] = useState<"Pessoal" | "Familiar" | "Investimento" | "">("");
  const [type, setType] = useState<"Essencial" | "Importante" | "Conforto" | "Investimento" | "">("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [paymentType, setPaymentType] = useState<"single" | "installment" | "recurring">("single");
  const [installments, setInstallments] = useState("2");
  const [aiSuggesting, setAiSuggesting] = useState(false);

  const { data: categories } = trpc.categories.list.useQuery();
  const { data: transactions } = trpc.transactions.list.useQuery();
  const { data: aiSuggestion, refetch: getAiSuggestion } = trpc.ai.suggest.useQuery(
    { description },
    { enabled: false }
  );

  // Load transaction data when editing
  const existingTransaction = transactions?.find(t => t.id === transactionId);

  useEffect(() => {
    if (existingTransaction) {
      setDescription(existingTransaction.description);
      setAmount(existingTransaction.amount.toString());
      setNature(existingTransaction.nature);
      setDivision(existingTransaction.division || "");
      setType(existingTransaction.type || "");
      setCategoryId(existingTransaction.categoryId?.toString() || "");
      // Format date as YYYY-MM-DD in UTC
      const date = new Date(existingTransaction.date);
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      setDate(`${year}-${month}-${day}`);
      setNotes(existingTransaction.notes || "");
    }
  }, [existingTransaction]);

  const createMutation = trpc.transactions.create.useMutation({
    onSuccess: () => {
      toast.success("Lançamento criado com sucesso!");
      utils.transactions.list.invalidate();
      utils.transactions.balance.invalidate();
      utils.transactions.getFinancialSummary.invalidate();
      resetForm();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`Erro ao criar lançamento: ${error.message}`);
    },
  });

  const updateMutation = trpc.transactions.update.useMutation({
    onSuccess: () => {
      toast.success("Lançamento atualizado com sucesso!");
      utils.transactions.list.invalidate();
      utils.transactions.balance.invalidate();
      utils.transactions.getFinancialSummary.invalidate();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar lançamento: ${error.message}`);
    },
  });

  const resetForm = () => {
    setDescription("");
    setAmount("");
    setNature("Saída");
    setDivision("");
    setType("");
    setCategoryId("");
    setDate(new Date().toISOString().slice(0, 10));
    setNotes("");
    setPaymentType("single");
    setInstallments("2");
  };

  const handleAiSuggest = async () => {
    if (!description.trim()) {
      toast.error("Digite uma descrição para obter sugestões da IA");
      return;
    }

    setAiSuggesting(true);
    try {
      const result = await getAiSuggestion();
      if (result.data) {
        setNature(result.data.nature);
        if (result.data.division) setDivision(result.data.division);
        if (result.data.type) setType(result.data.type);
        if (result.data.categoryId) setCategoryId(result.data.categoryId.toString());
        
        toast.success("Sugestões aplicadas! Revise e ajuste se necessário.", {
          description: `Confiança: ${result.data.confidence === "high" ? "Alta" : result.data.confidence === "medium" ? "Média" : "Baixa"}`,
        });
      }
    } catch (error) {
      toast.error("Erro ao obter sugestões da IA");
    } finally {
      setAiSuggesting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      toast.error("Descrição é obrigatória");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      toast.error("Valor deve ser maior que zero");
      return;
    }

    // Parse date as UTC to avoid timezone issues
    const [year, month, day] = date.split('-').map(Number);
    const dateTimestamp = Date.UTC(year, month - 1, day);

    if (paymentType === "installment") {
      const numInstallments = Number(installments);
      if (!numInstallments || numInstallments < 2) {
        toast.error("Número de parcelas deve ser maior ou igual a 2");
        return;
      }
    }

    const data = {
      description: description.trim(),
      amount: Number(amount).toFixed(2),
      nature,
      division: division || undefined,
      type: type || undefined,
      categoryId: categoryId ? Number(categoryId) : undefined,
      date: dateTimestamp,
      notes: notes.trim() || undefined,
      paymentType,
      installments: paymentType === "installment" ? Number(installments) : undefined,
    };

    if (transactionId) {
      updateMutation.mutate({ id: transactionId, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredCategories = categories?.filter(
    (cat) =>
      (!division || cat.division === division) && (!type || cat.type === type)
  );

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Card className="glass border-border">
      <CardHeader>
        <CardTitle>{transactionId ? "Editar" : "Novo"} Lançamento</CardTitle>
        <CardDescription>
          Preencha os dados da transação. Use a IA para sugestões automáticas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Descrição com IA */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <div className="flex gap-2">
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Supermercado, Salário, Netflix..."
                required
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAiSuggest}
                disabled={aiSuggesting || !description.trim()}
                className="gap-2"
              >
                {aiSuggesting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                IA
              </Button>
            </div>
          </div>

          {/* Valor e Natureza */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor (R$) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nature">Natureza *</Label>
              <Select value={nature} onValueChange={(v) => setNature(v as any)}>
                <SelectTrigger id="nature">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Entrada">
                    <span className="text-income">💰 Entrada</span>
                  </SelectItem>
                  <SelectItem value="Saída">
                    <span className="text-expense">💸 Saída</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Divisão e Tipo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="division">Divisão</Label>
              <Select value={division} onValueChange={(v) => setDivision(v as any)}>
                <SelectTrigger id="division">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=" ">Nenhuma</SelectItem>
                  <SelectItem value="Pessoal">Pessoal</SelectItem>
                  <SelectItem value="Familiar">Familiar</SelectItem>
                  <SelectItem value="Investimento">Investimento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as any)}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=" ">Nenhum</SelectItem>
                  <SelectItem value="Essencial">Essencial</SelectItem>
                  <SelectItem value="Importante">Importante</SelectItem>
                  <SelectItem value="Conforto">Conforto</SelectItem>
                  <SelectItem value="Investimento">Investimento</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Categoria */}
          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Selecione uma categoria..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">Nenhuma</SelectItem>
                {filteredCategories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.icon && `${cat.icon} `}
                    {cat.name} ({cat.division} - {cat.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filteredCategories?.length === 0 && (division || type) && (
              <p className="text-xs text-muted-foreground">
                Nenhuma categoria encontrada para esta combinação. Crie uma nova categoria primeiro.
              </p>
            )}
          </div>

          {/* Tipo de Pagamento */}
          <div className="space-y-2">
            <Label htmlFor="paymentType">Tipo de Pagamento *</Label>
            <Select value={paymentType} onValueChange={(v) => setPaymentType(v as any)}>
              <SelectTrigger id="paymentType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Parcela Única</SelectItem>
                <SelectItem value="installment">Dividido em X vezes</SelectItem>
                <SelectItem value="recurring">Recorrente (Mensal)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Número de Parcelas (condicional) */}
          {paymentType === "installment" && (
            <div className="space-y-2">
              <Label htmlFor="installments">Número de Parcelas *</Label>
              <Input
                id="installments"
                type="number"
                min="2"
                value={installments}
                onChange={(e) => setInstallments(e.target.value)}
                placeholder="2"
                required
              />
              <p className="text-xs text-muted-foreground">
                Serão criados {installments} lançamentos de R$ {amount ? (Number(amount) / Number(installments)).toFixed(2) : "0.00"} cada
              </p>
            </div>
          )}

          {/* Aviso de Recorrência */}
          {paymentType === "recurring" && (
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-sm text-blue-400">
                🔁 Este lançamento será criado automaticamente todos os meses neste mesmo dia
              </p>
            </div>
          )}

          {/* Data */}
          <div className="space-y-2">
            <Label htmlFor="date">Data {paymentType === "single" ? "*" : "(Primeira ocorrência) *"}</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Informações adicionais sobre este lançamento..."
              rows={3}
            />
          </div>

          {/* Ações */}
          <div className="flex gap-3 justify-end">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            )}
            <Button type="submit" disabled={isLoading} className="gap-2">
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {transactionId ? "Atualizar" : "Salvar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
