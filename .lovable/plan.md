## Diagnóstico

- A base SQLite não está sendo criada como arquivo em um path do servidor.
- O projeto usa `sql.js` no navegador: a base roda em memória (`new SQL.Database()`) e é persistida como snapshot binário no IndexedDB.
- Local atual:
  - IndexedDB database: `officecup-sqlite`
  - Object store: `db`
  - Key: `snapshot`
  - Tabela SQLite: `oc_users`
  - Sessão atual: `localStorage.current_user_id`
- Portanto, cada navegador/perfil tem sua própria base local. Não há um arquivo tipo `/data/app.db` no projeto ou no servidor.
- O erro de hidratação no `/login` foi causado por extensões do navegador (LastPass/Kaspersky) injetando elementos dentro dos inputs antes do React hidratar.
- O fluxo “Esqueci” atual troca a senha direto no SQLite, mas a UX deixa o usuário no formulário de reset e pode causar tentativa de login com senha antiga/nova sem feedback de voltar para “Entrar”.

## Plano de correção

1. Tornar o login resistente a extensões de senha
   - Adicionar `suppressHydrationWarning` no shell/body ou no container do login.
   - Definir atributos de autocomplete corretos nos inputs:
     - login: `username`, `current-password`
     - cadastro: `name`, `email`, `new-password`
     - redefinição: `email`, `new-password`
   - Ajustar o componente `Field` para aceitar props extras sem quebrar os inputs existentes.

2. Melhorar o fluxo de “Esqueci a senha” local
   - Após redefinir senha com sucesso, mudar automaticamente para a aba “Entrar”.
   - Pré-preencher o e-mail no login quando possível.
   - Mostrar mensagem clara: “Senha local atualizada. Entre com a nova senha.”

3. Blindar sessão e persistência local
   - Ao redefinir senha, limpar sessão antiga se ela pertencer ao mesmo e-mail, evitando estado inconsistente.
   - Garantir que cadastro/login só executem depois do `SqliteBootstrap` marcar `ready`.
   - Melhorar mensagens de erro para diferenciar e-mail não encontrado, senha incorreta e falha de IndexedDB.

4. Adicionar utilitários de inspeção local para análise
   - Criar funções de debug/exportação controladas em desenvolvimento para listar usuários locais sem expor hash completo.
   - Exibir no console apenas em dev algo como: database `officecup-sqlite`, store `db`, key `snapshot`, users count.
   - Opcionalmente adicionar um botão discreto em tela de login para “Limpar base local” apenas se necessário para testes.

5. Validar o fluxo completo
   - Testar criar conta -> sair -> esqueci senha -> definir nova senha -> entrar com nova senha -> sair.
   - Verificar que `/dashboard` não cai no error boundary.
   - Confirmar que o erro de hidratação não impede uso; se extensão continuar injetando DOM, ele deve ficar apenas como warning recuperável.

## Observação importante

Como a base é IndexedDB do navegador, ela não é compartilhada entre usuários, dispositivos, abas anônimas ou outro navegador. Se a intenção for testes multiusuário reais ou persistência centralizada, depois teremos que voltar para Lovable Cloud/Supabase ou implementar uma camada backend de SQLite, porque o SQLite atual é 100% client-side.