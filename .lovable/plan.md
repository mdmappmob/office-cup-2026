## Diagnóstico

A rota `/palpites` está registrada e o link funciona, mas a tela atual apresenta os jogos como **cards verticais**, o que não corresponde ao formato esperado. A referência enviada mostra uma **tabela de jogos por grupo** (estilo FIFA), e é isso que será implementado.

Também há um bug pequeno: na fase de grupos, o `mockMatches` só gera **2 jogos por grupo** (ex.: A×B e C×D). O correto na Copa é **6 jogos por grupo** (todos contra todos). Sem isso a tabela de classificação derivada dos palpites não fecha.

## O que será feito

### 1. Corrigir geração de jogos da fase de grupos
Arquivo: `src/mocks/matches.ts`
- Gerar os 6 confrontos round-robin de cada grupo (A×B, A×C, A×D, B×C, B×D, C×D), totalizando **72 jogos** na fase de grupos (12 grupos seriam o ideal real, mas mantemos os 6 grupos atuais para não inflar o mock — total 36 jogos).
- Distribuir as datas ao longo de junho/2026 com horários realistas.

### 2. Reformular `Palpites.tsx` para layout de tabela por grupo
Arquivo: `src/pages/Palpites.tsx`
- Manter as **abas de fases** no topo (Grupos / Oitavas / Quartas / Semi / Final) com bloqueio progressivo.
- Para a aba **Grupos**, renderizar **uma tabela por grupo** com colunas:
  `Data | Mandante | Bandeira | Placar (input × input) | Bandeira | Visitante | Status`
- Cabeçalho de cada grupo com nome do grupo + mini-resumo (jogos preenchidos / total).
- Linhas zebradas, hover destacado, inputs compactos centralizados.
- Para as fases eliminatórias, manter cards (faz mais sentido em chaveamento), mas com visual de tabela enxuta.

### 3. Mover detalhes avançados para um Drawer/Sheet
Os accordions de **Escalação / Artilheiros / Copilot** poluem a tabela. Serão movidos para um botão "Detalhes" por linha que abre um `Sheet` lateral com:
- Escalações dos dois times
- Artilheiros previstos
- Painel do Copilot das Zebras

### 4. Barra de progresso + Ctrl+S
- Manter a barra de progresso da fase acima da tabela.
- Implementar atalho `Ctrl+S` que dispara um toast "Palpites salvos" (já estão persistidos em localStorage via Zustand).

### 5. Visual alinhado ao Tactical Terminal
- Bordas finas, tipografia mono nos cabeçalhos e placares
- Acentos azul/verde para linhas preenchidas
- Sem cores hardcoded — uso de tokens semânticos do `styles.css`

## Resultado esperado
Na rota `/palpites`, o usuário verá uma tabela limpa por grupo, igual em densidade à referência da FIFA, podendo digitar o placar diretamente em cada linha e abrir um painel lateral para escalações/artilheiros/Copilot quando quiser detalhar.
