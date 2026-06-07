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

> A configuração do Firebase fica em `src/firebase/config.js`. A `apiKey` do Firebase Web não é secreta — a segurança real depende das **regras do Firestore**. Garanta que as regras exijam usuário autenticado para leitura/escrita.

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
