import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface InvoiceImportProps {
  onTransactionsExtracted: (transactions: any[], paymentDate: number, bankName: string) => void;
}

export default function InvoiceImport({ onTransactionsExtracted }: InvoiceImportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [bankName, setBankName] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const processInvoiceMutation = trpc.transactions.processInvoice.useMutation();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleProcess = async () => {
    if (!file || !bankName || !paymentDate) {
      toast.error("Preencha todos os campos");
      return;
    }

    setIsProcessing(true);

    try {
      // Determinar tipo de arquivo
      const extension = file.name.split(".").pop()?.toLowerCase();
      let fileType: "pdf" | "csv" | "ofx";

      if (extension === "pdf") {
        fileType = "pdf";
      } else if (extension === "csv") {
        fileType = "csv";
      } else if (extension === "ofx") {
        fileType = "ofx";
      } else {
        toast.error("Formato de arquivo não suportado. Use PDF, CSV ou OFX.");
        setIsProcessing(false);
        return;
      }

      // Ler arquivo
      const fileContent = await readFileContent(file, fileType);

      // Processar com backend
      const transactions = await processInvoiceMutation.mutateAsync({
        fileContent,
        fileType,
        bankName,
      });

      if (transactions.length === 0) {
        toast.error("Nenhuma transação encontrada no arquivo");
        setIsProcessing(false);
        return;
      }

      // Converter data para timestamp
      const paymentTimestamp = new Date(paymentDate).getTime();

      toast.success(`${transactions.length} transações extraídas com sucesso!`);
      
      // Passar transações para validação
      onTransactionsExtracted(transactions, paymentTimestamp, bankName);
      
      // Fechar dialog
      setIsOpen(false);
      resetForm();
    } catch (error: any) {
      console.error("Erro ao processar fatura:", error);
      toast.error("Erro ao processar fatura: " + (error.message || "Erro desconhecido"));
    } finally {
      setIsProcessing(false);
    }
  };

  const readFileContent = (file: File, fileType: "pdf" | "csv" | "ofx"): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const result = e.target?.result;
        if (!result) {
          reject(new Error("Erro ao ler arquivo"));
          return;
        }

        if (fileType === "pdf") {
          // Para PDF, converter para base64
          const base64 = (result as string).split(",")[1];
          resolve(base64);
        } else {
          // Para CSV e OFX, usar texto direto
          resolve(result as string);
        }
      };

      reader.onerror = () => reject(new Error("Erro ao ler arquivo"));

      if (fileType === "pdf") {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });
  };

  const resetForm = () => {
    setFile(null);
    setBankName("");
    setPaymentDate("");
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        className="gap-2"
      >
        <Upload className="w-4 h-4" />
        Importar Fatura
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Importar Fatura de Cartão</DialogTitle>
            <DialogDescription>
              Envie um arquivo PDF, CSV ou OFX da fatura do seu cartão de crédito
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="file">Arquivo da Fatura</Label>
              <Input
                id="file"
                type="file"
                accept=".pdf,.csv,.ofx"
                onChange={handleFileChange}
                disabled={isProcessing}
              />
              {file && (
                <p className="text-sm text-muted-foreground">
                  Arquivo selecionado: {file.name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankName">Nome do Banco</Label>
              <Input
                id="bankName"
                placeholder="Ex: Nubank, Itaú, Bradesco..."
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                disabled={isProcessing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentDate">Data de Pagamento</Label>
              <Input
                id="paymentDate"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                disabled={isProcessing}
              />
              <p className="text-xs text-muted-foreground">
                Todos os lançamentos serão registrados com esta data
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsOpen(false);
                resetForm();
              }}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleProcess}
              disabled={!file || !bankName || !paymentDate || isProcessing}
              className="gap-2"
            >
              {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
              Processar Fatura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
