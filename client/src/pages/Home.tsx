import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Wallet, 
  TrendingUp, 
  Shield, 
  Sparkles,
  ArrowRight,
  BarChart3,
  Target,
  Zap
} from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, loading, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="container relative mx-auto px-4 py-24 lg:py-32">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-strong border border-primary/20">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Gestão Inteligente com IA</span>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight">
              Controle Financeiro
              <span className="block text-primary mt-2">Inteligente e Completo</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Sistema profissional de gestão orçamentária com IA integrada, 
              dashboards avançados e controle total sobre suas finanças pessoais e familiares.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a href={getLoginUrl()}>
                <Button size="lg" className="text-lg px-8 glow-primary">
                  Começar Agora
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </a>
              <Button size="lg" variant="outline" className="text-lg px-8 glass">
                Ver Demonstração
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-background/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Recursos Poderosos</h2>
            <p className="text-xl text-muted-foreground">
              Tudo que você precisa para gerenciar suas finanças com excelência
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="glass border-border hover:border-primary/50 transition-all hover:glow-primary">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>IA Inteligente</CardTitle>
                <CardDescription>
                  Categorização automática de lançamentos com aprendizado contínuo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  A IA sugere categorias baseadas em suas transações anteriores e aprende 
                  com suas correções para melhorar continuamente.
                </p>
              </CardContent>
            </Card>

            <Card className="glass border-border hover:border-primary/50 transition-all hover:glow-primary">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Dashboards Avançados</CardTitle>
                <CardDescription>
                  KPIs em tempo real e análises detalhadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Visualize distribuição de gastos, projeções de 12 meses, burn rate diário 
                  e aderência ao orçamento planejado.
                </p>
              </CardContent>
            </Card>

            <Card className="glass border-border hover:border-primary/50 transition-all hover:glow-primary">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Budgeting Inteligente</CardTitle>
                <CardDescription>
                  Defina metas e acompanhe seu progresso
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Configure percentuais de gasto por categoria e receba alertas quando 
                  desviar do planejado.
                </p>
              </CardContent>
            </Card>

            <Card className="glass border-border hover:border-primary/50 transition-all hover:glow-primary">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Wallet className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Controle Completo</CardTitle>
                <CardDescription>
                  Gestão de entradas, saídas e parcelamentos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Registre todas suas transações com hierarquia de categorização 
                  (Divisão, Tipo e Categoria customizável).
                </p>
              </CardContent>
            </Card>

            <Card className="glass border-border hover:border-primary/50 transition-all hover:glow-primary">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Parcelamentos e Recorrências</CardTitle>
                <CardDescription>
                  Suporte completo para compras parceladas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Gerencie parcelamentos e assinaturas mensais com histórico completo 
                  de mudanças de valores.
                </p>
              </CardContent>
            </Card>

            <Card className="glass border-border hover:border-primary/50 transition-all hover:glow-primary">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Multi-usuário Seguro</CardTitle>
                <CardDescription>
                  Isolamento completo de dados por usuário
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Sistema com autenticação robusta e isolamento total de dados. 
                  Cada usuário acessa apenas suas próprias informações.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-background to-background" />
        <div className="container relative mx-auto px-4">
          <Card className="glass-strong border-primary/20 max-w-4xl mx-auto">
            <CardContent className="p-12 text-center space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/20 mb-4">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Comece Gratuitamente</span>
              </div>
              
              <h2 className="text-4xl font-bold">
                Pronto para transformar suas finanças?
              </h2>
              
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Junte-se a milhares de usuários que já estão no controle total 
                de suas finanças pessoais e familiares.
              </p>
              
              <a href={getLoginUrl()}>
                <Button size="lg" className="text-lg px-8 glow-primary">
                  Criar Conta Gratuita
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </a>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border glass-strong py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Wallet className="w-6 h-6 text-primary" />
              <span className="font-semibold">Gestão Orçamentária Inteligente</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 Todos os direitos reservados
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
