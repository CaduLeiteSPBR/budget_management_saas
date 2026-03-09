'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { GripVertical, Save } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface Widget {
  id: string;
  name: string;
  label: string;
}

const WIDGETS: Widget[] = [
  { id: 'saldoInicial', name: 'Saldo Inicial', label: 'Saldo Inicial' },
  { id: 'entradas', name: 'Entradas', label: 'Entradas' },
  { id: 'saidas', name: 'Saídas', label: 'Saídas' },
  { id: 'saldoMinimo', name: 'Saldo Mínimo', label: 'Saldo Mínimo' },
  { id: 'saldoAtual', name: 'Saldo Atual', label: 'Saldo Atual' },
  { id: 'fimDoMes', name: 'Fim do Mês', label: 'Fim do Mês' },
];

interface CustomizeDashboardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomizeDashboardModal({ open, onOpenChange }: CustomizeDashboardModalProps) {
  const [widgets, setWidgets] = useState<Widget[]>(WIDGETS);
  const [hiddenWidgets, setHiddenWidgets] = useState<string[]>([]);
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);

  const savePreferencesMutation = trpc.dashboard.savePreferences.useMutation();
  const getPreferencesQuery = trpc.dashboard.getPreferences.useQuery(undefined, {
    enabled: open,
  });

  useEffect(() => {
    if (getPreferencesQuery.data && open) {
      const { widgetOrder, hiddenWidgets: hidden } = getPreferencesQuery.data;
      if (widgetOrder && widgetOrder.length > 0) {
        const orderedWidgets = widgetOrder
          .map((id: string) => WIDGETS.find((w: Widget) => w.id === id))
          .filter((w: Widget | undefined) => w !== undefined) as Widget[];
        setWidgets(orderedWidgets);
      }
      if (hidden) {
        setHiddenWidgets(hidden);
      }
    }
  }, [getPreferencesQuery.data, open]);

  const handleToggleWidget = (widgetId: string) => {
    setHiddenWidgets((prev) =>
      prev.includes(widgetId) ? prev.filter((id) => id !== widgetId) : [...prev, widgetId]
    );
  };

  const handleDragStart = (e: React.DragEvent, widgetId: string) => {
    setDraggedWidget(widgetId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedWidget || draggedWidget === targetId) return;

    const draggedIndex = widgets.findIndex((w) => w.id === draggedWidget);
    const targetIndex = widgets.findIndex((w) => w.id === targetId);

    const newWidgets = [...widgets];
    [newWidgets[draggedIndex], newWidgets[targetIndex]] = [
      newWidgets[targetIndex],
      newWidgets[draggedIndex],
    ];

    setWidgets(newWidgets);
    setDraggedWidget(null);
  };

  const handleSave = async () => {
    try {
      await savePreferencesMutation.mutateAsync({
        widgetOrder: widgets.map((w) => w.id),
        hiddenWidgets,
      });
      console.log('Preferências salvas com sucesso!');
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao salvar preferências:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Personalizar Dashboard</DialogTitle>
          <DialogDescription>
            Reordene os widgets arrastando-os e escolha quais deseja exibir.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Widgets</label>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {widgets.map((widget) => (
                <div
                  key={widget.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, widget.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, widget.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-move transition-all ${
                    draggedWidget === widget.id
                      ? 'opacity-50 border-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <Checkbox
                    checked={!hiddenWidgets.includes(widget.id)}
                    onCheckedChange={() => handleToggleWidget(widget.id)}
                    className="flex-shrink-0"
                  />
                  <span className="text-sm flex-1">{widget.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={savePreferencesMutation.isPending}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
