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

## Bugs Reportados
- [x] Corrigir erro de insertId ao criar categoria (status 500)
- [x] Corrigir erro de insertId ao criar transação (status 500)
- [x] Aplicar correção em todos os métodos de criação (subscriptions, installments, budgets, aiLearning)
- [x] Corrigir formulário de edição que abre em branco ao invés de carregar dados da transação
- [x] Corrigir exibição de datas (01/01/2026 aparece como 31/12/2025 - problema de timezone)

## 13. Parcelamento e Recorrência no Formulário de Lançamentos
- [x] Adicionar campo de tipo de pagamento (Parcela Única, Dividido, Recorrente)
- [x] Campo condicional para número de parcelas quando "Dividido" selecionado
- [x] Lógica de criação automática de parcelas futuras (mesmo dia do mês)
- [x] Lógica de criação automática de recorrências mensais
- [ ] Indicador visual de lançamentos parcelados/recorrentes na listagem

## 14. Melhorias na Listagem de Lançamentos
- [x] Adicionar ícone de ordenação clicável nas colunas (asc/desc)
- [x] Implementar ordenação por data, descrição, valor e natureza
- [x] Adicionar coluna de saldo acumulado após cada transação
- [x] Calcular saldo progressivo considerando ordem cronológica

## 15. Ordenação Secundária por Natureza
- [x] Modificar lógica de ordenação para usar Natureza como critério secundário
- [x] Priorizar Entradas antes de Saídas em caso de empate no critério principal

## 16. Melhorias na Tela de Lançamentos
- [x] Adicionar coluna Categoria entre Tipo e Valor
- [x] Implementar combo-box de mês no topo
- [x] Implementar combo-box de ano no topo
- [x] Adicionar botão Aplicar para filtros de mês/ano
- [x] Inicializar filtros com mês e ano atuais
- [x] Aplicar filtro automaticamente ao carregar
- [x] Adicionar card de Saldo Inicial do período
- [x] Adicionar card de Saldo Final do período
- [x] Calcular saldos baseados no período filtrado

## Bugs Reportados (Novos)
- [x] Ajustar cores dos gráficos para ficarem visíveis no tema dark
- [x] Adicionar cores vibrantes e contrastantes nos gráficos de rosca
- [x] Melhorar visibilidade do gráfico de linha de projeção

## 17. Melhorias de Ordenação e Visualização
- [x] Alterar ordenação padrão para ascendente (ordem cronológica)
- [x] Implementar ordenação multi-nível: Data → Natureza → Divisão → Tipo → Categoria
- [x] Aplicar ordenação padrão ao carregar pela primeira vez
- [x] Manter ordenação após salvar novo lançamento
- [x] Adicionar cores alternadas nas linhas agrupadas por data
- [x] Facilitar distinção visual de lançamentos de dias diferentes

## Bugs Reportados (Atualização)
- [x] Corrigir atualização da tabela após editar lançamento (não reflete mudança de natureza)
- [x] Adicionar campo nature ao schema de update de transação

## Bugs e Melhorias (Dashboard)
- [x] Corrigir cálculo de Entradas no gráfico (removido filtro isPaid que excluía transações)
- [x] Remover botão Parcelamentos da tela inicial (funcionalidade já integrada em Lançamentos)

## Bug Crítico (Gráfico de Projeção)
- [x] Corrigir cálculo do gráfico de projeção de 12 meses (não inclui todas as transações)
- [x] Remover filtro isPaid do cálculo de projeção mensal

## Bug Persistente (Gráfico Dezembro)
- [x] Investigar por que dezembro ainda mostra apenas R$800 de Entradas
- [x] Verificar lógica de monthStart e monthEnd no loop de projeção
- [x] Corrigido: problema era timezone - agora usa Date.UTC para consistência

## 18. Integração de Lançamentos no Dashboard
- [x] Mover conteúdo de Lançamentos para aba no Dashboard
- [x] Remover rota /transactions separada (mantida para compatibilidade)
- [x] Integrar TransactionsList como TabsContent

## 19. Importação de Fatura com IA
- [x] Botão "Importar Fatura" na tela de Lançamentos
- [x] Upload de arquivos (PDF, CSV, OFX)
- [x] Pop-up para coletar data de pagamento e nome do banco
- [x] Backend para processar PDF com IA (extrair lançamentos)
- [x] Backend para processar CSV (parsing estruturado com suporte a formatos BR e US)
- [x] Backend para processar OFX (parsing estruturado)
- [x] IA identifica natureza (Entrada para estornos, Saída para compras)
- [x] Formatar descrição: "CC - [Banco] - [Descrição]"
- [x] Pré-categorização por IA de cada lançamento
- [x] Tela de validação um por um com modal overlay
- [x] Campos editáveis: valor, descrição, categorização completa
- [x] Checkbox "Não importar" por lançamento
- [x] Navegação: Confirmar e Próximo / Pular / Finalizar
- [x] Salvar lançamentos confirmados individualmente
- [x] Testes unitários para processamento de CSV e OFX
- [x] Correção de bug de parsing de valores decimais

## Bug Reportado (Importação de PDF)
- [x] Corrigir erro "Dynamic require of pdf-parse is not supported" ao processar PDF
- [x] Substituir pdf-parse por processamento direto com IA multimodal (file_url)
- [x] IA agora lê PDF visualmente usando data URL base64

## Bugs Reportados (Importação de Fatura)
- [x] Parser de CSV não consegue encontrar lançamentos no arquivo real
- [x] Detectar delimitador automaticamente (vírgula ou ponto e vírgula)
- [x] Suportar nomes de colunas do C6 Bank ("Valor (em R$)", "Descrição")
- [x] Detectar estornos por valores negativos e palavras-chave
- [x] IA não pré-categoriza o campo Categoria (apenas Divisão e Tipo)
- [x] IA agora sugere categoryId baseado nas categorias disponíveis
- [x] IA não aprende com histórico de categorizações anteriores
- [x] Implementar aprendizado baseado em descrições similares
- [x] Buscar padrões no histórico antes de chamar IA (otimização)
- [x] Adicionar histórico ao contexto da IA para melhor precisão

## Novos Bugs Reportados
- [x] Botão "Novo Lançamento" sumiu da aba Lançamentos
- [x] Restaurado botão ao lado de "Importar Fatura"
- [x] IA pré-categoriza Categoria apenas no primeiro registro
- [x] Corrigida lógica para sempre chamar pré-categorização em cada registro
- [x] Removida condição que pulava pré-categorização após primeiro registro

## Bug: Botão Novo Lançamento
- [x] Botão "Novo Lançamento" não abre pop-up de criação
- [x] Implementado estado showTransactionForm e editingTransactionId no Dashboard
- [x] Adicionado TransactionForm com callbacks onSuccess e onCancel
- [x] Botão agora abre formulário corretamente (id=0 para novo, id>0 para edição)

## Bug: Parser CSV não encontra transações
- [x] Parser retorna "nenhuma transação encontrada" para arquivo CSV válido
- [x] Problema: delimitador não estava sendo detectado automaticamente
- [x] Adicionada detecção automática de delimitador (`;` ou `,`)
- [x] Adicionado suporte a colunas do C6 Bank: "Descrição", "Valor (em R$)"

## Bugs: Importação de Fatura
- [x] IA pré-categoriza Categoria apenas no primeiro registro
- [x] Problema: mutation não estava sendo resetada entre chamadas
- [x] Adicionado precategorizeMutation.reset() antes de cada pré-categorização
- [x] Adicionado log de debug para monitorar resultado da IA
- [x] Resetar categoryId para undefined em caso de erro
- [x] Adicionar botão "Voltar" para revisar item anterior na validação
- [x] Botão Voltar aparece apenas quando currentIndex > 0
- [x] Ao voltar, remove última transação validada da lista
- [x] Botão com ícone ChevronLeft e desabilitado durante salvamento

## Bug: Erro 500 na Pré-categorização
- [x] Procedure precategorize retorna erro 500
- [x] Erro: "Cannot read properties of undefined (reading '0')" ao acessar response.choices[0]
- [x] Problema: resposta da IA não tinha validação robusta
- [x] Adicionada validação de response.choices antes de acessar
- [x] Adicionado try-catch para parsear JSON
- [x] Logs de erro detalhados para debug
- [x] Retorno de valores padrão em caso de falha

## Novas Features: Otimização de Importação
- [x] Implementar cache de pré-categorizações
- [x] Verificar se transação já tem suggestedDivision/Type/CategoryId
- [x] Usar cache quando disponível, evitando chamada da IA
- [x] Salvar resultado da IA no objeto de transação após primeira chamada
- [x] Logs de debug para monitorar uso de cache vs IA
- [x] Adicionar botão "Aplicar a Todos Similares" na validação
- [x] Identificar transações com descrição similar (case-insensitive, match exato ou contido)
- [x] Aplicar mesma categorização (division, type, categoryId) em lote
- [x] Toast com feedback de quantas transações foram atualizadas
- [x] Botão desabilitado quando skipCurrent ou campos vazios

## Nova Feature: Preview de Transa\u00e7\u00f5es Similares
- [x] Criar modal de preview ao clicar em "Aplicar a Todos Similares"
- [x] Mostrar lista de transa\u00e7\u00f5es que ser\u00e3o afetadas (scroll\u00e1vel, max 96 altura)
- [x] Exibir quantidade total e valor total das transa\u00e7\u00f5es no header
- [x] Mostrar categoriza\u00e7\u00e3o que ser\u00e1 aplicada (Divis\u00e3o \u2192 Tipo \u2192 Categoria)
- [x] Card para cada transa\u00e7\u00e3o com descri\u00e7\u00e3o, natureza e valor
- [x] Hover effect nos cards de transa\u00e7\u00e3o
- [x] Bot\u00f5es Confirmar e Cancelar no footer do modal
- [x] Aplicar categoriza\u00e7\u00e3o apenas ap\u00f3s confirma\u00e7\u00e3o
- [x] Toast de feedback ap\u00f3s aplica\u00e7\u00e3o
- [x] Validar se h\u00e1 transa\u00e7\u00f5es similares antes de abrir modal
## Nova Feature: Exportação de Lançamentos
- [x] Adicionar botão "Exportar" na tela de Lançamentos
- [x] Botão com ícone Download e variant outline
- [x] Exportar apenas lançamentos visíveis (respeitando filtros e ordenação)
- [x] Formato CSV com colunas: Data, Descrição, Valor, Natureza, Divisão, Tipo, Categoria
- [x] Escapar aspas duplas nas descrições ("" para compatibilidade CSV)
- [x] BOM UTF-8 para compatibilidade com Excel
- [x] Nome do arquivo com data atual: lancamentos_YYYY-MM-DD.csv
- [x] Download automático do arquivo
- [x] Toast de feedback com quantidade de lançamentos exportados
- [x] Validação: mensagem de erro se não houver lançamentos
