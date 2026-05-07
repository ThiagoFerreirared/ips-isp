# IPs ISP

Sistema web para gerenciamento de IPs por cidade.

## Stack
- React + Vite
- Firebase Firestore
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

## Firebase Firestore Rules (console.firebase.google.com)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```
> Atenção: em produção adicione autenticação!

## Coleções no Firestore

Uma coleção por cidade:
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

Cada documento tem: `ip`, `login`, `data`
