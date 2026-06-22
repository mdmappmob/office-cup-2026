# Demo — Office Cup 2026

Ambiente isolado com dados fictícios (LGPD-safe) para gravação de vídeo de
demonstração. Nenhum dado real é exposto.

## Pré-requisitos

- Node 20+
- Conta gratuita [Supabase](https://supabase.com)
- Acesso ao repositório (`v1.0-stable` já taggeado)

## Setup

### 1. Criar projeto Supabase demo

1. Acesse https://supabase.com → **New project**
2. Nome: `officecup-demo`
3. Senha do banco: anote (não usaremos diretamente)
4. Região: mesma do projeto real (EUA ou South America)
5. Após criar, anote:
   - **Project Settings → API → Project URL** → `VITE_SUPABASE_URL`
   - **Project Settings → API → anon public** → `VITE_SUPABASE_ANON_KEY`
   - **Project Settings → API → service_role secret** → `SUPABASE_SERVICE_ROLE_KEY`

### 2. Aplicar migrations

No SQL Editor do Supabase demo, execute os scripts na ordem:

1. `supabase/migration.sql` — schema base
2. `supabase/invite_code.sql` — coluna invite_code + tabela profiles
3. `supabase/update.sql` — ajustes finais

### 3. Configurar `.env.demo`

Copie o template:

```bash
cp .env.demo .env
```

Edite com as credenciais do projeto demo.

### 4. Instalar dependências

```bash
npm install
```

### 5. Rodar seed

```bash
npx tsx scripts/seed-demo.ts
```

Isso cria:

- **8 usuários** fictícios no `auth.users` + `profiles`
- **1 liga** "Bolão Corporativo 2026"
- **103 partidas** (72 grupos + 31 mata-mata)
- **Grupos com resultados** reais simulados (todos os 72 jogos da fase de grupos
  com placares)
- **Palpites** para todos os usuários em todas as partidas da fase de grupos,
  com pontos já calculados
- **Admin**: `admin@demo.com` / `demo123`

### 6. Rodar app

```bash
npm run dev
```

Acesse http://localhost:3000

Login como admin: `admin@demo.com` / `demo123`
Login como membro: qualquer outro (ex: `bruno@demo.com` / `demo123`)

## Roteiro de gravação

### Tomada 1 — Homepage (15s)
- Mostrar hero com imagem da Copa
- CTA "Acessar" leva ao login

### Tomada 2 — Login + Dashboard (20s)
- Login como admin@demo.com
- Dashboard aparece: cards de classificação, pontos, acertos em cheio, top 5
- Gráfico de evolução
- Breakdown por fase

### Tomada 3 — Palpites (30s)
- Aba "Grupos" (✓ encerrada): placar real + palpite + pontos (view-only)
- Mostrar badge de pontos (ex: 10 pts para placar exato)
- Navegar para fase atual (r32 ▶): inputs habilitados
- Mostrar banner azul "Janela de alteração: 10 min após o início"
- Aba "Quartas" (🔒 futura): cadeado

### Tomada 4 — Ranking (20s)
- Aba "Geral": tabela completa com todos os membros
- Aba "Por Fase": sub-abas Grupos/R32/Oitavas/Quartas/Semi/Final
- Mostrar multiplicador ex: "Grupos ×1", "R32 ×2"

### Tomada 5 — Apuração (admin, 25s)
- Acessar página de Apuração
- Partidas da fase de grupos com badge ENCERRADO
- Clicar "Sincronizar resultados" (mostrar feedback)
- Exemplo: abrir partida da fase atual, digitar placar, "Encerrar partida"
- Toast de confirmação com contagem de palpites

### Tomada 6 — Perfil + Convite (15s)
- Perfil do admin: código de convite visível, botão Copiar
- Mostrar link gerado: `https://app/login?invite=CODE`

### Tomada 7 — Login como membro (20s)
- Logout
- Login como bruno@demo.com
- Dashboard diferente (outra pontuação)
- Perfil mostra "Você está participando do Bolão Corporativo 2026"

### Encerramento (10s)
- Link para o app real: `https://officecup.vercel.app`
- "Crie seu bolão ou entre com um código de convite"

## Dados fictícios

| Nome | Email | Admin | Pontos |
|---|---|---|---|
| Ana Costa | admin@demo.com | Sim | 89 |
| Bruno Oliveira | bruno@demo.com | Não | 72 |
| Carla Mendes | carla@demo.com | Não | 65 |
| Daniel Rocha | daniel@demo.com | Não | 58 |
| Eduarda Lima | eduarda@demo.com | Não | 51 |
| Felipe Santos | felipe@demo.com | Não | 44 |
| Gabriela Torres | gabriela@demo.com | Não | 37 |
| Henrique Barbosa | henrique@demo.com | Não | 30 |

Senha de todos: `demo123`

## Restaurar ambiente real

Ao finalizar a demo:

1. Remova o `.env` editado ou troque as credenciais de volta
2. Delete o projeto `officecup-demo` no Supabase (ou apenas limpe as tabelas)

A tag `v1.0-stable` garante que o código estável está preservado:

```bash
git checkout v1.0-stable
```
