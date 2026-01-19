import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Edit, Trash2, FolderOpen } from "lucide-react";
import { toast } from "sonner";

interface CategoriesListProps {
  onEdit?: (categoryId: number) => void;
}

export default function CategoriesList({ onEdit }: CategoriesListProps) {
  const utils = trpc.useUtils();
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: categories, isLoading } = trpc.categories.list.useQuery();

  const deleteMutation = trpc.categories.delete.useMutation({
    onSuccess: () => {
      toast.success("Categoria excluída com sucesso!");
      utils.categories.list.invalidate();
      setDeleteId(null);
    },
    onError: (error) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    },
  });

  const handleDelete = (id: number) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteMutation.mutate({ id: deleteId });
    }
  };

  // Organizar categorias por divisão e tipo
  const divisions = ["Pessoal", "Familiar", "Investimento"] as const;
  const types = ["Essencial", "Importante", "Conforto", "Investimento"] as const;

  const groupedCategories = divisions.map(division => ({
    division,
    types: types.map(type => ({
      type,
      categories: categories?.filter(c => c.division === division && c.type === type) || []
    })).filter(t => t.categories.length > 0)
  })).filter(d => d.types.length > 0);

  if (isLoading) {
    return (
      <Card className="glass border-border">
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Carregando categorias...</div>
        </CardContent>
      </Card>
    );
  }

  if (!categories || categories.length === 0) {
    return (
      <Card className="glass border-border">
        <CardContent className="pt-12 pb-12">
          <div className="text-center text-muted-foreground">
            <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhuma categoria cadastrada</p>
            <p className="text-sm mt-2">
              Comece criando sua primeira categoria para organizar seus lançamentos
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {groupedCategories.map(({ division, types: divisionTypes }) => (
          <Card key={division} className="glass border-border">
            <CardHeader>
              <CardTitle className="text-xl">{division}</CardTitle>
              <CardDescription>
                {divisionTypes.reduce((sum, t) => sum + t.categories.length, 0)} categoria(s)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {divisionTypes.map(({ type, categories: typeCategories }) => (
                <div key={type} className="space-y-3">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    {type}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {typeCategories.map((category) => (
                      <div
                        key={category.id}
                        className="glass-strong rounded-lg border border-border p-4 flex items-center justify-between hover:border-primary/50 transition-all group"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
                            style={{ backgroundColor: category.color || "#3B82F6" }}
                          >
                            {category.icon || "📁"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium truncate">{category.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {category.division} • {category.type}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit?.(category.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(category.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta categoria? Os lançamentos associados não serão excluídos, mas perderão a referência à categoria.
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
