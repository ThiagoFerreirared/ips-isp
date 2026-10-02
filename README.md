# WSP FIBRA — Sistema ISP

Sistema web para documentação e gerenciamento de endereçamento IP, links e eventos de rede de um provedor (ISP).

## Funcionalidades

- **Dashboard** — visão geral com ocupação de IPs (usados/vagos), gráfico por cidade e eventos recentes.
- **IPs** — abas por cidade (arrastar para reordenar, criar e excluir), tabela com classificação automática (vago / equipamento / CGNAT / cliente), busca, filtros por tipo e bloco /24, paginação, histórico por IP, copiar IP, importação (colar lista ou Excel), geração de blocos e exportação para Excel.
- **Relatório de Links** — cadastro de links de transporte e IP, dados da empresa, exportação para Excel e PDF.
- **Histórico de Eventos** — registro de degradações / indisponibilidades / normalizações, filtros e exportação Excel/PDF.
- **Busca rápida (Ctrl/Cmd + K)** — paleta de comandos para pular para qualquer cidade, seção ou IP.
- **Tempo real** — alterações aparecem instantaneamente para todos (Firestore `onSnapshot`).
- **Tema claro/escuro** — alternável e persistido no navegador.

## Stack

- React 18 + Vite 5
- Tailwind CSS 4
- Firebase (Firestore + Auth)
- lucide-react (ícones), jsPDF + autotable, SheetJS (xlsx)
- Deploy: Vercel

## Setup

```bash
npm install
npm run dev      # ambiente de desenvolvimento
npm run build    # build de produção (dist/)
npm run preview  # pré-visualiza o build
```

## Deploy no Vercel

1. Push para o GitHub.
2. Importe o repositório no Vercel.
3. Root directory: `ips-isp` · Build: `npm run build` · Output: `dist`.

O `vercel.json` já reescreve todas as rotas para `index.html` (SPA).

## Firebase

Ative **Authentication > Sign-in method > Email/Password** e crie um usuário em **Authentication > Users**.

> A configuração do Firebase fica em `src/firebase/config.js`. A `apiKey` do Firebase Web não é secreta — a segurança real depende das **regras do Firestore**. O monitoramento permite leitura pública das ocorrências e dos nomes das cidades; escrita e os demais dados exigem autenticação.

### Monitoramento público do call center

- O botão na tela de login abre `/monitoramento`, também acessível diretamente sem senha.
- A página acompanha as ocorrências em tempo real com filtros de cidade, status e busca. Não monta o painel administrativo nem oferece ações de escrita.
- As ocorrências (incluindo observações e responsável) são públicas. Evite inserir informações confidenciais nesses campos. O Firestore concede leitura por documento, não por campo.
- **As regras não são publicadas pelo Vercel.** Publique `firestore.rules` no Console Firebase, projeto `ips-isp`, Firestore Database → Regras, ou use `firebase deploy --only firestore:rules --project ips-isp` em uma sessão administrativa autorizada. Sem essa etapa, ocultar botões não impede gravações pela API.
- As regras mantêm os operadores autenticados com acesso administrativo, bloqueiam escrita anônima e bloqueiam leitura anônima das demais coleções. Não há criação de contas na interface; contas do Firebase Auth devem ser provisionadas apenas para operadores autorizados.

### Estrutura no Firestore

- `ips_<CIDADE>` — um documento por IP: `ip`, `login`, `data`, `obs` e campos extras da cidade.
- `config/cidades` — `{ lista: [...] }` com a ordem das abas.
- `config/empresa` — dados da empresa do relatório.
- `relatorio_links` — links de transporte e IP.
- `historico` — alterações de IPs (auditoria por IP).
- `historico_eventos` — eventos de rede.

## Estrutura do código

```
src/
  lib/         utilidades puras (classify, ip, cities, exports, cn)
  context/     Auth, Theme, Toast (+confirm), Cities
  hooks/       useCollection / useDocument (tempo real)
  components/  ui.jsx, charts.jsx, CommandPalette, layout/, ip/
  pages/       Dashboard, IPs, RelatorioLinks, HistoricoEventos, Login
```

## Gestão de IPs e sub-redes

- Selecione a máscara (/24 a /32, incluindo /28, /29 e /30) e depois a sub-rede. A exportação Excel respeita os filtros.
- Em **Blocos da cidade**, informe um CIDR por linha (até 100 blocos). Endereços fora dos blocos já cadastrados continuam visíveis. Sem configuração, a listagem detecta blocos /24 como antes.
- Use **Reservado** na situação do IP para separá-lo dos usados e vagos; endereços sem registro continuam como **Não cadastrado**.
- A importação reconhece as colunas IP, Login e Data pelo cabeçalho, mostra avisos, ignora duplicados e bloqueia IP inválido.
- Salvamento, exclusão, geração e importação usam uma revisão por cidade para serializar gravações feitas por esta versão do aplicativo. Clientes antigos ou alterações externas ao aplicativo não participam desse controle; a garantia não substitui regras de validação do servidor.
- A correção de Manaus preserva os IDs e salva cada original em **ip_backups**, junto com auditoria em **historico**, na mesma transação da correção. O botão só aparece se houver registros invertidos.
- Configurações: **config/blocos_<CIDADE>** (blocks) e **config/ip_revision_<CIDADE>** (version).
- Testes: **npm test**. Os testes de persistência simulam Firestore, incluindo concorrência e falha de backup.

## Economia de leituras

- Dashboard usa contagens agregadas por cidade e cache em memória de cinco minutos. A ocupação detalhada é uma consulta explícita e pode ler todos os IPs. Atualizar força nova consulta.
- Busca rápida reutiliza consultas completas por cinco minutos. Os resultados podem refletir esse intervalo; a edição continua validando os dados no servidor.
- Listas compartilham a assinatura durante a navegação e a encerram 60 segundos após o último consumidor sair. Dados não são persistidos em disco; troca de usuário limpa caches.
- Chamados ativos permanecem em tempo real. Resolvidos são opcionais, inicialmente 50. Históricos também começam com 50. Carregar mais amplia a consulta (pode reler a janela anterior). Filtros, contadores e exportação consideram apenas registros carregados; as janelas usam ordem de ID, sem presumir que sejam os mais recentes.
- A cota já consumida não é recuperada por essas alterações. Regras do Firestore continuam exigindo publicação administrativa separada conforme seção acima.
