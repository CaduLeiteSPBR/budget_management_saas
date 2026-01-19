# Sistema de Gestão Orçamentária Inteligente - TODO

## 1. Autenticação e Gestão de Usuários
- [x] Sistema de autenticação multi-usuário com Manus OAuth
- [x] Usuário admin inicial com permissões especiais
- [x] Isolamento completo de dados por usuário
- [ ] Painel de administração para gerenciar usuários

## 2. Estrutura de Banco de Dados
- [x] Tabela de usuários com roles (admin/user)
- [x] Tabela de lançamentos financeiros (entradas/saídas)
- [x] Tabela de categorias customizáveis por usuário
- [x] Tabela de parcelamentos
- [x] Tabela de assinaturas recorrentes
- [x] Tabela de metas de orçamento (budgeting)
- [x] Tabela de histórico de aprendizado da IA

## 3. Sistema de Lançamentos Financeiros
- [x] CRUD completo de lançamentos
- [x] Natureza obrigatória: Entrada ou Saída
- [x] Hierarquia de categorização (Divisão > Tipo > Categoria)
- [x] Divisões: Pessoal, Familiar, Investimento
- [x] Tipos: Essencial, Importante, Conforto, Investimento
- [x] Categorias customizáveis pelo usuário
- [x] Cálculo automático de saldo unificado
- [x] Histórico completo de transações

## 4. Parcelamentos e Recorrências
- [x] Suporte a compras parceladas
- [x] Criação automática de parcelas futuras
- [x] Assinaturas mensais recorrentes
- [x] Atualização de valor de assinatura preservando histórico
- [x] Visualização de parcelas futuras
- [x] Gestão de parcelas pagas/pendentes

## 5. Inteligência Artificial
- [x] Input de texto para descrição de lançamento
- [x] IA sugere Natureza, Divisão, Tipo e Categoria
- [x] Sistema aprende com correções manuais do usuário
- [x] Armazenamento de padrões de categorização

## 6. Módulo de Budgeting
- [x] Definição de metas percentuais por Divisão
- [x] Definição de metas percentuais por Tipo
- [x] Cálculo de aderência ao orçamento
- [ ] Alertas de desvio do planejado

## 7. Dashboard e KPIs
- [x] Aderência ao Orçamento (Planejado vs Realizado)
- [x] Distribuição de Fluxo (gráfico de rosca)
- [x] Projeção de 12 meses (gráfico de linha)
- [x] Burn Rate Diário (quanto pode gastar por dia)
- [x] Resumo de entradas e saídas do mês
- [x] Evolução do saldo ao longo do tempo

## 8. Interface Premium Responsiva
- [x] Design Modern Dark / Glassmorphism
- [x] Paleta de cores: grafite, azul profundo, acentos vibrantes
- [x] Cores diferenciadas para entradas (verde) e saídas (vermelho)
- [x] Cards elegantes com efeitos de transparência e blur
- [ ] Micro-interações suaves ao salvar dados
- [x] Design Mobile-First totalmente responsivo
- [x] Gráficos interativos com Recharts

## 9. Testes e Qualidade
- [x] Testes unitários com Vitest para procedures críticas
- [x] Validação de isolamento de dados entre usuários
- [x] Testes de cálculo de saldo
- [x] Testes de parcelamentos e recorrências
- [ ] Testes de IA e aprendizado

## 10. Documentação e Entrega
- [x] Documentação de acesso ao sistema
- [x] Credenciais do usuário admin inicial
- [x] Guia de uso das funcionalidades
- [x] Checkpoint final do projeto

## 11. Página de Lançamentos
- [x] Formulário de criação de lançamento com validação
- [x] Integração com IA para sugestões automáticas
- [x] Seleção de categorias existentes
- [x] Listagem de transações com paginação
- [x] Filtros por data, natureza, divisão e tipo
- [x] Ações de editar e excluir transações
- [x] Modal de confirmação de exclusão
- [x] Indicadores visuais de entradas (verde) e saídas (vermelho)

## 12. Página de Categorias
- [x] Formulário de criação de categoria com validação
- [x] Campos: nome, divisão, tipo, cor e ícone
- [x] Listagem de categorias organizada
- [x] Agrupamento por divisão e tipo
- [x] Ações de editar e excluir categorias
- [x] Modal de confirmação de exclusão
- [x] Seletor de cores visual
- [x] Preview da categoria com cor e ícone
