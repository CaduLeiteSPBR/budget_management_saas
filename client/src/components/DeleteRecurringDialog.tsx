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

interface DeleteRecurringDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleteSingle: () => void;
  onDeleteFuture: () => void;
  transactionDescription: string;
}

export function DeleteRecurringDialog({
  open,
  onOpenChange,
  onDeleteSingle,
  onDeleteFuture,
  transactionDescription,
}: DeleteRecurringDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Lançamento Recorrente</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Você está prestes a excluir o lançamento recorrente:{" "}
              <span className="font-semibold text-foreground">{transactionDescription}</span>
            </p>
            <p className="text-sm">
              Como este é um lançamento recorrente, você pode escolher:
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-col gap-2">
          <AlertDialogAction
            onClick={onDeleteSingle}
            className="w-full bg-orange-600 hover:bg-orange-700"
          >
            Apenas este
          </AlertDialogAction>
          <AlertDialogAction
            onClick={onDeleteFuture}
            className="w-full bg-red-600 hover:bg-red-700"
          >
            Este e todos os futuros
          </AlertDialogAction>
          <AlertDialogCancel className="w-full mt-0">
            Cancelar
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
