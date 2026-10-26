# 365 dias de nós

Livro digital interativo de aniversário, feito com React, TypeScript, Vite e React PageFlip.

## Requisitos

- Node.js 20.19+ ou 22.12+
- npm

## Começar

```bash
npm install
npm run dev
```

Abra o endereço local indicado pelo Vite.

## Build de produção

```bash
npm run build
npm run preview
```

## Fotografias

Coloque as imagens em `public/images/` e referencie-as a partir da raiz:

```tsx
<img src="/images/memories/foto-01.jpg" alt="Nossa lembrança" />
```

Pastas sugeridas:

- `public/images/cover`
- `public/images/memories`
- `public/images/moments`
- `public/images/backgrounds`

## Música opcional

A estrutura já reserva `public/music/`. Navegadores normalmente bloqueiam autoplay com som; por isso a música deve ser iniciada por um clique explícito da pessoa visitante. A funcionalidade pode ser ligada na etapa de personalização.

## Publicar no Vercel

1. Envie o projeto para um repositório GitHub.
2. Importe o repositório no Vercel.
3. Framework preset: Vite (detecção automática).
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Adicione seu domínio em Settings → Domains e configure o DNS conforme as instruções do Vercel.

O projeto é estático e não precisa de backend ou variáveis de ambiente.

## Estrutura

```text
src/
  components/
    book/
    ui/
  pages/
  data/
  styles/
public/
  images/
  music/
```
