# IPs ISP

Sistema web para gerenciamento de IPs por cidade.

## Stack
- React + Vite
- Firebase Firestore
- Firebase Auth
- Deploy: Vercel

## Setup
```bash
cd ips-isp
npm install
npm run dev
```

## Deploy no Vercel
1. Push para GitHub
2. Importe o repositório no Vercel
3. Root directory: `ips-isp`
4. Build command: `npm run build`
5. Output directory: `dist`

## Firebase Auth
Ative **Authentication > Sign-in method > Email/Password** no console do Firebase.
Depois crie um usuário em **Authentication > Users**.

## Firestore
Coleções por cidade:
- `ips_SANTAREM`
- `ips_MANAUS`
- `ips_ITAITUBA`
- `ips_RUROPOLIS`
- `ips_ALTAMIRA_ALENQUER`
- `ips_ALENQUER`
- `ips_SAPEZAL_CJ`
- `ips_VILHENA`
- `ips_COMODORO`
- `ips_PRIVADO_BACKBONE`
- `ips_IPV6_WSP`
- `ips_DDOS_A10_TPS`

Cada documento pode ter:
- `ip`
- `login`
- `data`
- `obs`
- campos extras da cidade