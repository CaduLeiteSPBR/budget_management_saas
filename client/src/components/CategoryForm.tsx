import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Palette } from "lucide-react";
import { toast } from "sonner";

interface CategoryFormProps {
  categoryId?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const PRESET_COLORS = [
  "#EF4444", // red
  "#F97316", // orange
  "#F59E0B", // amber
  "#EAB308", // yellow
  "#84CC16", // lime
  "#22C55E", // green
  "#10B981", // emerald
  "#14B8A6", // teal
  "#06B6D4", // cyan
  "#0EA5E9", // sky
  "#3B82F6", // blue
  "#6366F1", // indigo
  "#8B5CF6", // violet
  "#A855F7", // purple
  "#D946EF", // fuchsia
  "#EC4899", // pink
];

const PRESET_ICONS = [
  "🍔", "🛒", "🏠", "⚡", "💧", "🌐", "📱", "🚗", "⛽", "🎓",
  "📚", "🏥", "💊", "👕", "👟", "🎮", "🎬", "✈️", "🏖️", "💰",
  "📊", "💼", "🏦", "💳", "🎯", "🎁", "🍕", "☕", "🏋️", "⚽",
];

export default function CategoryForm({ categoryId, onSuccess, onCancel }: CategoryFormProps) {
  const utils = trpc.useUtils();
  
  const [name, setName] = useState("");
  const [division, setDivision] = useState<"Pessoal" | "Familiar" | "Investimento">("Pessoal");
  const [type, setType] = useState<"Essencial" | "Importante" | "Conforto" | "Investimento">("Essencial");
  const [color, setColor] = useState("#3B82F6");
  const [icon, setIcon] = useState("📁");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);

  // Load category data if editing
  const { data: categories } = trpc.categories.list.useQuery();
  const existingCategory = categories?.find(c => c.id === categoryId);

  useEffect(() => {
    if (existingCategory) {
      setName(existingCategory.name);
      setDivision(existingCategory.division);
      setType(existingCategory.type);
      setColor(existingCategory.color || "#3B82F6");
      setIcon(existingCategory.icon || "📁");
    }
  }, [existingCategory]);

  const createMutation = trpc.categories.create.useMutation({
    onSuccess: () => {
      toast.success("Categoria criada com sucesso!");
      utils.categories.list.invalidate();
      resetForm();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`Erro ao criar categoria: ${error.message}`);
    },
  });

  const updateMutation = trpc.categories.update.useMutation({
    onSuccess: () => {
      toast.success("Categoria atualizada com sucesso!");
      utils.categories.list.invalidate();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar categoria: ${error.message}`);
    },
  });

  const resetForm = () => {
    setName("");
    setDivision("Pessoal");
    setType("Essencial");
    setColor("#3B82F6");
    setIcon("📁");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    const data = {
      name: name.trim(),
      division,
      type,
      color,
      icon,
    };

    if (categoryId) {
      updateMutation.mutate({ id: categoryId, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Card className="glass border-border">
      <CardHeader>
        <CardTitle>{categoryId ? "Editar" : "Nova"} Categoria</CardTitle>
        <CardDescription>
          Personalize suas categorias com nome, divisão, tipo, cor e ícone.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Preview */}
          <div className="flex items-center justify-center p-6 glass-strong rounded-lg border border-border">
            <Badge 
              className="text-lg px-4 py-2"
              style={{ 
                backgroundColor: color,
                color: "#fff"
              }}
            >
              <span className="text-2xl mr-2">{icon}</span>
              {name || "Nome da Categoria"}
            </Badge>
          </div>

          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Alimentação, Transporte, Lazer..."
              required
            />
          </div>

          {/* Divisão e Tipo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="division">Divisão *</Label>
              <Select value={division} onValueChange={(v) => setDivision(v as any)}>
                <SelectTrigger id="division">
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
              <Label htmlFor="type">Tipo *</Label>
              <Select value={type} onValueChange={(v) => setType(v as any)}>
                <SelectTrigger id="type">
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

          {/* Cor */}
          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="gap-2"
              >
                <div 
                  className="w-4 h-4 rounded border border-border"
                  style={{ backgroundColor: color }}
                />
                <Palette className="w-4 h-4" />
                Escolher Cor
              </Button>
              <Input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-20 h-10"
              />
            </div>
            {showColorPicker && (
              <div className="grid grid-cols-8 gap-2 p-4 glass-strong rounded-lg border border-border">
                {PRESET_COLORS.map((presetColor) => (
                  <button
                    key={presetColor}
                    type="button"
                    onClick={() => setColor(presetColor)}
                    className="w-8 h-8 rounded border-2 border-border hover:scale-110 transition-transform"
                    style={{ 
                      backgroundColor: presetColor,
                      borderColor: color === presetColor ? "#fff" : "transparent"
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Ícone */}
          <div className="space-y-2">
            <Label>Ícone</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowIconPicker(!showIconPicker)}
                className="gap-2"
              >
                <span className="text-xl">{icon}</span>
                Escolher Ícone
              </Button>
              <Input
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="Digite um emoji"
                className="w-32"
                maxLength={2}
              />
            </div>
            {showIconPicker && (
              <div className="grid grid-cols-10 gap-2 p-4 glass-strong rounded-lg border border-border">
                {PRESET_ICONS.map((presetIcon) => (
                  <button
                    key={presetIcon}
                    type="button"
                    onClick={() => setIcon(presetIcon)}
                    className="text-2xl hover:scale-125 transition-transform p-2 rounded hover:bg-accent"
                  >
                    {presetIcon}
                  </button>
                ))}
              </div>
            )}
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
              {categoryId ? "Atualizar" : "Salvar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
