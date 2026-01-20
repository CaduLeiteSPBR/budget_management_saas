import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, ChevronRight, ChevronLeft, Check, X } from "lucide-react";

interface Transaction {
  description: string;
  amount: number;
  nature: "Entrada" | "Saída";
  suggestedDivision?: string;
  suggestedType?: string;
  suggestedCategoryId?: number;
}

interface InvoiceValidationProps {
  transactions: Transaction[];
  paymentDate: number;
  bankName: string;
  onComplete: () => void;
  onCancel: () => void;
}

export default function InvoiceValidation({
  transactions,
  paymentDate,
  bankName,
  onComplete,
  onCancel,
}: InvoiceValidationProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [validatedTransactions, setValidatedTransactions] = useState<any[]>([]);
  const [skipCurrent, setSkipCurrent] = useState(false);

  // Estados do formulário
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [nature, setNature] = useState<"Entrada" | "Saída">("Saída");
  const [division, setDivision] = useState("");
  const [type, setType] = useState("");
  const [categoryId, setCategoryId] = useState<number | undefined>();

  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { data: categories } = trpc.categories.list.useQuery();
  const precategorizeMutation = trpc.transactions.precategorize.useMutation();
  const createMutation = trpc.transactions.create.useMutation();
  const utils = trpc.useUtils();

  const currentTransaction = transactions[currentIndex];
  const progress = `${currentIndex + 1}/${transactions.length}`;

  // Carregar dados da transação atual
  useEffect(() => {
    if (currentTransaction) {
      setDescription(currentTransaction.description);
      setAmount(currentTransaction.amount.toFixed(2));
      setNature(currentTransaction.nature);
      setSkipCurrent(false);

      // Resetar mutation anterior
      precategorizeMutation.reset();

      // Usar cache se disponível, senão chamar IA
      if (currentTransaction.suggestedDivision && currentTransaction.suggestedType) {
        console.log('[Pré-categorização] Usando cache:', {
          division: currentTransaction.suggestedDivision,
          type: currentTransaction.suggestedType,
          categoryId: currentTransaction.suggestedCategoryId,
        });
        setDivision(currentTransaction.suggestedDivision);
        setType(currentTransaction.suggestedType);
        setCategoryId(currentTransaction.suggestedCategoryId || undefined);
      } else {
        loadPrecategorization();
      }
    }
  }, [currentIndex, currentTransaction]);

  const loadPrecategorization = async () => {
    if (!currentTransaction) return;

    setIsLoadingCategories(true);
    try {
      const result = await precategorizeMutation.mutateAsync({
        description: currentTransaction.description,
        amount: currentTransaction.amount,
        nature: currentTransaction.nature,
      });

      console.log('[Pré-categorização] Resultado da IA:', result);
      
      // Salvar no cache da transação
      currentTransaction.suggestedDivision = result.division;
      currentTransaction.suggestedType = result.type;
      currentTransaction.suggestedCategoryId = result.categoryId || undefined;
      
      setDivision(result.division);
      setType(result.type);
      setCategoryId(result.categoryId || undefined);
    } catch (error) {
      console.error("Erro ao pré-categorizar:", error);
      // Usar valores padrão
      setDivision("Pessoal");
      setType("Importante");
      setCategoryId(undefined);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const handleConfirm = async () => {
    if (skipCurrent) {
      // Pular esta transação
      goToNext();
      return;
    }

    if (!description || !amount || !division || !type) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    // Adicionar à lista de validadas
    const validated = {
      description,
      amount,
      nature,
      division,
      type,
      categoryId,
      date: paymentDate,
    };

    setValidatedTransactions([...validatedTransactions, validated]);
    
    if (currentIndex < transactions.length - 1) {
      goToNext();
    } else {
      // Última transação - salvar todas
      saveAll();
    }
  };

  const goToNext = () => {
    if (currentIndex < transactions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      // Remover última transação validada se voltar
      if (validatedTransactions.length > 0) {
        setValidatedTransactions(validatedTransactions.slice(0, -1));
      }
    }
  };

  const handleApplyToSimilar = () => {
    if (!description || !division || !type) {
      toast.error("Preencha a categorização antes de aplicar");
      return;
    }

    // Identificar transações similares (mesma descrição, case-insensitive)
    const currentDesc = description.toLowerCase().trim();
    let appliedCount = 0;

    transactions.forEach((trx) => {
      const trxDesc = trx.description.toLowerCase().trim();
      // Match exato ou contido
      if (trxDesc === currentDesc || trxDesc.includes(currentDesc) || currentDesc.includes(trxDesc)) {
        trx.suggestedDivision = division;
        trx.suggestedType = type;
        trx.suggestedCategoryId = categoryId;
        appliedCount++;
      }
    });

    toast.success(`Categorização aplicada a ${appliedCount} transações similares`);
  };

  const saveAll = async () => {
    setIsSaving(true);

    try {
      // Salvar todas as transações validadas
      for (const trx of validatedTransactions) {
        await createMutation.mutateAsync({
          ...trx,
          paymentType: "single" as const,
        });
      }

      // Salvar a última se não foi pulada
      if (!skipCurrent && description && amount && division && type) {
        await createMutation.mutateAsync({
          description,
          amount,
          nature,
          division: division as "Pessoal" | "Familiar" | "Investimento",
          type: type as "Essencial" | "Importante" | "Conforto" | "Investimento",
          categoryId,
          date: paymentDate,
          paymentType: "single" as const,
        });
      }

      // Invalidar cache
      utils.transactions.list.invalidate();
      utils.transactions.balance.invalidate();

      toast.success(`${validatedTransactions.length + (skipCurrent ? 0 : 1)} lançamentos importados com sucesso!`);
      onComplete();
    } catch (error: any) {
      console.error("Erro ao salvar lançamentos:", error);
      toast.error("Erro ao salvar lançamentos: " + (error.message || "Erro desconhecido"));
    } finally {
      setIsSaving(false);
    }
  };

  const filteredCategories = categories?.filter(
    (c) => c.division === division && c.type === type
  );

  if (!currentTransaction) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl glass border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Validar Lançamento {progress}</CardTitle>
              <CardDescription>
                Revise e ajuste os dados antes de importar
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {isLoadingCategories && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Pré-categorizando com IA...
            </div>
          )}

          <div className="flex items-center gap-2">
            <Checkbox
              id="skip"
              checked={skipCurrent}
              onCheckedChange={(checked) => setSkipCurrent(checked as boolean)}
            />
            <Label htmlFor="skip" className="cursor-pointer">
              Não importar este lançamento
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={skipCurrent}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor (R$)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={skipCurrent}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nature">Natureza</Label>
              <Select value={nature} onValueChange={(v) => setNature(v as any)} disabled={skipCurrent}>
                <SelectTrigger id="nature">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Entrada">Entrada</SelectItem>
                  <SelectItem value="Saída">Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="division">Divisão</Label>
              <Select value={division} onValueChange={setDivision} disabled={skipCurrent}>
                <SelectTrigger id="division">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pessoal">Pessoal</SelectItem>
                  <SelectItem value="Familiar">Familiar</SelectItem>
                  <SelectItem value="Investimento">Investimento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select value={type} onValueChange={setType} disabled={skipCurrent}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Selecione..." />
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

          <div className="space-y-2">
            <Label htmlFor="category">Categoria (Opcional)</Label>
            <Select
              value={categoryId?.toString() || "none"}
              onValueChange={(v) => setCategoryId(v === "none" ? undefined : Number(v))}
              disabled={skipCurrent}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Selecione uma categoria..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {filteredCategories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.icon} {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-muted-foreground">
              {validatedTransactions.length} confirmados
            </div>
            <Button 
              variant="secondary" 
              size="sm"
              onClick={handleApplyToSimilar} 
              disabled={skipCurrent || !division || !type}
              className="gap-2"
            >
              Aplicar a Todos Similares
            </Button>
          </div>
          <div className="flex gap-2 w-full justify-end">
            <Button variant="outline" onClick={onCancel}>
              Cancelar Importação
            </Button>
            {currentIndex > 0 && (
              <Button variant="outline" onClick={goToPrevious} disabled={isSaving} className="gap-2">
                <ChevronLeft className="w-4 h-4" />
                Voltar
              </Button>
            )}
            <Button onClick={handleConfirm} disabled={isSaving} className="gap-2">
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {currentIndex < transactions.length - 1 ? (
                <>
                  Confirmar e Próximo
                  <ChevronRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  Finalizar Importação
                  <Check className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
