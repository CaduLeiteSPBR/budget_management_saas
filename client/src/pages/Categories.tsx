import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import CategoryForm from "@/components/CategoryForm";
import CategoriesList from "@/components/CategoriesList";
import { Plus, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function Categories() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | undefined>();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    setLocation("/");
    return null;
  }

  const handleEdit = (id: number) => {
    setEditingId(id);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingId(undefined);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(undefined);
  };

  const handleNewCategory = () => {
    setEditingId(undefined);
    setShowForm(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border glass-strong sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/dashboard")}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Categorias</h1>
                <p className="text-sm text-muted-foreground">
                  Personalize suas categorias de lançamentos
                </p>
              </div>
            </div>
            {!showForm && (
              <Button onClick={handleNewCategory} className="gap-2">
                <Plus className="w-4 h-4" />
                Nova Categoria
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        {showForm ? (
          <CategoryForm
            categoryId={editingId}
            onSuccess={handleFormSuccess}
            onCancel={handleCancel}
          />
        ) : (
          <CategoriesList onEdit={handleEdit} />
        )}
      </main>
    </div>
  );
}
