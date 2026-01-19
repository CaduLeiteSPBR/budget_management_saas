import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TransactionForm from "@/components/TransactionForm";
import TransactionsList from "@/components/TransactionsList";
import { Plus, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function Transactions() {
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

  const handleNewTransaction = () => {
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
                <h1 className="text-2xl font-bold">Lançamentos</h1>
                <p className="text-sm text-muted-foreground">
                  Gerencie suas entradas e saídas
                </p>
              </div>
            </div>
            {!showForm && (
              <Button onClick={handleNewTransaction} className="gap-2">
                <Plus className="w-4 h-4" />
                Novo Lançamento
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        {showForm ? (
          <TransactionForm
            transactionId={editingId}
            onSuccess={handleFormSuccess}
            onCancel={handleCancel}
          />
        ) : (
          <TransactionsList onEdit={handleEdit} />
        )}
      </main>
    </div>
  );
}
