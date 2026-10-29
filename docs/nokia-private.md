# Consulta privada de senhas Nokia

A seção 4 consulta automaticamente após 350 ms e pelo menos quatro caracteres (serial completo ou qualquer trecho, sem diferenciar maiúsculas). `SALCL` e `ALCL` são equivalentes. Correspondências exatas têm prioridade. A resposta contém até 20 registros; a interface solicita refinar quando houver mais. Senhas retornadas existem apenas na memória/DOM da sessão, sem persistência local. Operadores autorizados podem visualizar/copiar os resultados.

## Infraestrutura e decisões de ativação

Reutiliza Firebase Auth e Firestore do projeto `ips-isp`. Adiciona Cloud Functions de segunda geração em `southamerica-east1`. A hospedagem Vercel permanece igual. Confirmar plano Blaze/faturamento, região e quais UIDs de operadores receberão `nokiaLookup: true` antes da ativação. Nenhum login, chave administrativa ou permissão foi criado por este PR.

O callable valida o token Firebase e exige a custom claim `nokiaLookup === true`; fazer login sozinho não concede acesso. Não há endpoint de exportação. Cada UID pode realizar 60 consultas por minuto, com contador transacional compartilhado entre instâncias. O limite reduz extração automatizada, mas não impede um operador autorizado de copiar resultados ao longo do tempo.

`privateNokiaCredentials` e `privateNokiaRateLimits` são excluídas da regra genérica permissiva existente: nenhum SDK de cliente pode ler, listar ou escrever nessas coleções. Apenas o serviço com IAM administrativo as acessa. Não mover dados para outras coleções, que continuam com as regras anteriores. Não registrar consultas, senhas ou respostas no console, analytics ou logs adicionais.

## Publicação pelo administrador

1. Revisar e publicar `firestore.rules` **antes de importar qualquer senha**: `firebase deploy --only firestore:rules --project ips-isp`. Validar regras no Emulator Suite ou simulador do console: anônimo e autenticado não podem ler/listar/escrever nas duas coleções privadas; ocorrências e cidades públicas continuam legíveis.
2. Instalar dependências em `functions/` com `npm ci`. Publicar `firebase deploy --only functions:lookupNokia --project ips-isp` usando uma conta administrativa local. O deploy precisa de permissões e faturamento do projeto.
3. No ambiente administrativo local, configurar Application Default Credentials por identidade Google ou arquivo de serviço **fora do checkout**. Nunca usar variáveis `VITE_*` para segredos. Validar primeiro: `node scripts/import-nokia.mjs "<caminho-privado>/Security_Key_Ont .xlsx"`. O importador usa a aba `Base_sec_key_ont` e colunas `CODIGO`, `SERIAL`, `sec-key-ont`; não imprime valores. Linhas inválidas interrompem antes de escrever. Pares diferentes para o mesmo serial são preservados; duplicatas idênticas são colapsadas.
4. Importar explicitamente: `node scripts/import-nokia.mjs "<caminho-privado>/Security_Key_Ont .xlsx" --write --project=ips-isp`. Todos os registros e índices de trechos ficam apenas no Firestore privado. A importação em lotes é retomável/idempotente para o mesmo arquivo; realizar antes de liberar operadores. Alterações futuras que removam registros exigem substituição privada planejada; o script rejeita registros antigos inesperados.
5. Conceder a claim aos UIDs aprovados via Admin SDK: obter o usuário e executar `setCustomUserClaims(uid, { ...user.customClaims, nokiaLookup: true })`, preservando outras claims. Não conceder por documento Firestore editável pelo usuário. Pedir ao operador para sair e entrar novamente. Para revogar, remover a claim e revogar sessões; tokens já emitidos podem permanecer válidos até expirar (até uma hora).
6. Revisar/mesclar o PR e publicar a interface pelo fluxo Vercel existente. Confirmar que um operador autorizado consulta um serial conhecido, um trecho com múltiplos resultados e um inexistente; login sem claim deve receber recusa. Não incluir senhas em capturas ou evidências públicas.

Não há gravação automática de credenciais nem deploy administrativo neste PR. Se Cloud Functions/faturamento não forem aprovados, manter a consulta indisponível até definir outro backend protegido; não embutir a planilha no build.

Linhas contendo somente código de produto, sem serial nem senha, são ignoradas e contadas separadamente; pares incompletos continuam causando erro.

## Validação e reversão

`npm test` executa regressões de validação, autenticação/autorização, limite compartilhado, busca e interface com dados sintéticos. `npm run build` valida o build da interface. Testes unitários com doubles não substituem validação das regras no emulador e teste de integração após publicação.

Reversão: remover as claims de acesso e desativar `lookupNokia`; reverter a interface se necessário. Manter a exclusão das coleções privadas nas regras enquanto houver dados: reverter essas regras para a versão antiga exporia a base a qualquer usuário autenticado. Excluir a base apenas conforme política de retenção/backup da organização.

Referências: [callables Firebase](https://firebase.google.com/docs/functions/callable), [regras e sobreposição de permissões](https://firebase.google.com/docs/firestore/security/rules-structure).
