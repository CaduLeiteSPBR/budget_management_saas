# Sistema de Gestão Orçamentária Inteligente

## Visão Geral

Sistema SaaS multi-usuário completo para gestão financeira pessoal e familiar com IA integrada, dashboards avançados e interface premium responsiva.

## Funcionalidades Principais

### 1. Autenticação e Segurança
- **Multi-usuário**: Sistema com autenticação via Manus OAuth
- **Roles**: Usuários comuns e administradores
- **Isolamento de dados**: Cada usuário acessa apenas suas próprias informações
- **Admin inicial**: O proprietário do projeto é automaticamente configurado como admin

### 2. Gestão de Lançamentos Financeiros
- **Natureza obrigatória**: Todo lançamento é Entrada ou Saída
- **Hierarquia de categorização**:
  - **Divisão**: Pessoal, Familiar ou Investimento
  - **Tipo**: Essencial, Importante, Conforto ou Investimento
  - **Categoria**: Customizável pelo usuário
- **Cálculo automático de saldo**: Saldo unificado baseado em todas transações
- **Histórico completo**: Todas as transações são registradas com timestamp

### 3. Parcelamentos e Recorrências
- **Compras parceladas**: Suporte completo com criação automática de parcelas futuras
- **Assinaturas mensais**: Gerenciamento de recorrências
- **Histórico de valores**: Atualização de valores preservando histórico anterior
- **Gestão de parcelas**: Controle de parcelas pagas e pendentes

### 4. Inteligência Artificial
- **Sugestão automática**: IA sugere Natureza, Divisão, Tipo e Categoria
- **Aprendizado contínuo**: Sistema aprende com correções manuais do usuário
- **Padrões personalizados**: Armazena padrões específicos de cada usuário
- **Integração com LLM**: Usa modelo de linguagem para categorização inteligente

### 5. Módulo de Budgeting
- **Metas percentuais**: Defina metas por Divisão e Tipo
- **Aderência ao orçamento**: Cálculo automático de planejado vs realizado
- **Acompanhamento mensal**: Metas configuráveis por mês/ano

### 6. Dashboard e KPIs
- **Saldo total**: Visão consolidada de todas as contas
- **Entradas e saídas do mês**: Resumo mensal com totais
- **Balanço mensal**: Superávit ou déficit do período
- **Burn Rate Diário**: Quanto você pode gastar por dia no mês
- **Aderência ao Orçamento**: Comparação planejado vs realizado
- **Distribuição de Fluxo**: Gráficos de rosca por Divisão e Tipo
- **Projeção de 12 meses**: Gráfico de linha com entradas, saídas e saldo

### 7. Interface Premium
- **Design Modern Dark / Glassmorphism**: Estética profissional com efeitos de transparência
- **Paleta de cores**: Tons grafite, azul profundo e acentos vibrantes
- **Cores financeiras**: Verde para entradas, vermelho para saídas
- **Cards elegantes**: Efeitos glass com blur e bordas sutis
- **Totalmente responsivo**: Design Mobile-First otimizado para todos dispositivos
- **Gráficos interativos**: Visualizações com Recharts

## Tecnologias Utilizadas

### Backend
- **Node.js** com TypeScript
- **tRPC**: Type-safe API com validação automática
- **Drizzle ORM**: ORM moderno para MySQL/TiDB
- **Express**: Servidor HTTP
- **Zod**: Validação de schemas
- **LLM Integration**: IA para sugestões inteligentes

### Frontend
- **React 19**: Framework UI moderno
- **Tailwind CSS 4**: Estilização com design system
- **Wouter**: Roteamento leve
- **Recharts**: Gráficos e visualizações
- **shadcn/ui**: Componentes UI premium
- **TanStack Query**: Gerenciamento de estado e cache

### Banco de Dados
- **MySQL/TiDB**: Banco relacional persistente
- **8 tabelas principais**:
  - users (usuários)
  - categories (categorias customizáveis)
  - transactions (lançamentos)
  - subscriptions (assinaturas recorrentes)
  - subscription_history (histórico de valores)
  - installments (parcelamentos)
  - budgets (metas de orçamento)
  - ai_learning (aprendizado da IA)

## Estrutura do Projeto

```
budget_management_saas/
├── client/                    # Frontend React
│   ├── src/
│   │   ├── components/       # Componentes reutilizáveis
│   │   │   └── OverviewDashboard.tsx
│   │   ├── pages/           # Páginas da aplicação
│   │   │   ├── Home.tsx     # Landing page
│   │   │   ├── Dashboard.tsx # Dashboard principal
│   │   │   └── NotFound.tsx
│   │   ├── lib/             # Utilitários
│   │   │   └── trpc.ts      # Cliente tRPC
│   │   ├── App.tsx          # Rotas e layout
│   │   └── index.css        # Estilos globais e tema
│   └── public/              # Assets estáticos
├── server/                   # Backend Node.js
│   ├── routers.ts           # Procedures tRPC
│   ├── db.ts                # Helpers de banco de dados
│   ├── transactions.test.ts # Testes de transações
│   ├── categories.test.ts   # Testes de categorias
│   └── _core/               # Infraestrutura (OAuth, LLM, etc)
├── drizzle/                 # Schemas e migrations
│   └── schema.ts            # Definição das tabelas
└── shared/                  # Tipos compartilhados
```

## Como Usar

### Acesso ao Sistema

1. **Acesse a URL do projeto** fornecida pelo Manus
2. **Faça login** usando sua conta Manus
3. **Usuário admin**: O proprietário do projeto é automaticamente admin

### Navegação Principal

- **Home**: Landing page com apresentação do sistema
- **Dashboard**: Painel principal com estatísticas e gráficos
  - **Visão Geral**: KPIs e gráficos interativos
  - **Lançamentos**: Gestão de entradas e saídas
  - **Parcelamentos**: Controle de compras parceladas
  - **Orçamentos**: Definição e acompanhamento de metas

### Criando um Lançamento

1. Acesse a aba **Lançamentos** no Dashboard
2. Clique em **Novo Lançamento**
3. Preencha:
   - Descrição (ex: "Supermercado")
   - Valor (ex: "250.50")
   - Natureza (Entrada ou Saída)
   - Data
4. **Opcional**: A IA pode sugerir categorização automaticamente
5. Ajuste Divisão, Tipo e Categoria conforme necessário
6. Salve o lançamento

### Usando a IA

1. Ao criar um lançamento, digite a descrição
2. A IA analisa e sugere:
   - Natureza (Entrada/Saída)
   - Divisão (Pessoal/Familiar/Investimento)
   - Tipo (Essencial/Importante/Conforto/Investimento)
   - Nome de categoria sugerido
3. Aceite ou corrija as sugestões
4. O sistema aprende com suas correções

### Criando Parcelamentos

1. Acesse a aba **Parcelamentos**
2. Clique em **Novo Parcelamento**
3. Preencha:
   - Descrição da compra
   - Valor total
   - Número de parcelas
   - Data da primeira parcela
4. O sistema cria automaticamente todas as parcelas futuras

### Definindo Orçamentos

1. Acesse a aba **Orçamentos**
2. Clique em **Definir Meta**
3. Escolha Divisão ou Tipo
4. Defina o percentual desejado
5. O dashboard mostrará a aderência ao orçamento

### Interpretando os KPIs

- **Saldo Total**: Soma de todas entradas menos saídas pagas
- **Entradas do Mês**: Total de receitas do mês atual
- **Saídas do Mês**: Total de despesas do mês atual
- **Balanço do Mês**: Diferença entre entradas e saídas
- **Burn Rate Diário**: Quanto você pode gastar por dia considerando o saldo restante
- **Aderência ao Orçamento**: Percentual de gastos em relação ao planejado
  - ≤ 100%: Dentro do planejado (verde)
  - > 100%: Acima do planejado (vermelho)

## Administração

### Painel Admin (apenas para administradores)

1. Clique no botão **Admin** no header
2. Funcionalidades disponíveis:
   - Listar todos os usuários
   - Promover usuários a admin
   - Visualizar estatísticas gerais

## Segurança e Privacidade

- **Isolamento total**: Cada usuário vê apenas seus próprios dados
- **Autenticação segura**: OAuth via Manus
- **Validação de permissões**: Todas operações verificam ownership
- **Testes de segurança**: Suíte de testes valida isolamento de dados

## Suporte e Desenvolvimento

### Testes

Execute os testes com:
```bash
pnpm test
```

Os testes cobrem:
- Criação e listagem de transações
- Isolamento de dados entre usuários
- Cálculo de saldo
- Gestão de categorias
- Validação de permissões

### Banco de Dados

Para aplicar mudanças no schema:
```bash
pnpm db:push
```

### Desenvolvimento Local

```bash
pnpm dev
```

## Próximas Funcionalidades

- [ ] Painel de administração completo para gerenciar usuários
- [ ] Alertas automáticos de desvio do orçamento
- [ ] Micro-interações suaves ao salvar dados
- [ ] Exportação de relatórios em PDF
- [ ] Importação de extratos bancários
- [ ] Notificações de parcelas a vencer
- [ ] Metas de economia e investimento
- [ ] Análise de tendências e previsões

## Contato

Para dúvidas ou sugestões, entre em contato através do painel Manus.

---

**Desenvolvido com ❤️ usando Manus Platform**
