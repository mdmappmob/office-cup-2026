## Objetivo
No painel inline de detalhes do jogo (Palpites), remover as seções **Escalações** e **Artilheiros do jogo**, deixando o **Copilot das Zebras** ocupar 100% da largura.

## Mudanças (apenas `src/pages/Palpites.tsx`)

1. Em `MatchDetailsInline`:
   - Remover as duas `<section>` de Escalações e Artilheiros.
   - Trocar o grid `lg:grid-cols-3` por um container simples de largura total contendo apenas a seção do Copilot.
2. Remover componentes não utilizados: `LineupForm` e `ScorersForm`.
3. Limpar imports órfãos: `Users`, `Goal` (do `lucide-react`).

Nenhuma alteração em store, repositórios ou tipos — os campos `predicted_home_lineup`, `predicted_away_lineup` e `predicted_goalscorers` permanecem no modelo (só não são mais editáveis pela UI), evitando regressões.
