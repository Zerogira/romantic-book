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

Cada push na branch `main` publica sozinho uma nova versão.

### Armazenamento e variáveis de ambiente

A foto, a carta que ela escreve no final e as assinaturas da cartinha da surpresa (Abb e Obb) ficam no **Vercel Blob** (Storage → Create → Blob, conectado ao projeto; isso cria `BLOB_READ_WRITE_TOKEN`). Em Settings → Environment Variables:

| Variável | Para quê |
| --- | --- |
| `BLOB_READ_WRITE_TOKEN` | Criada ao conectar o Blob ao projeto. |
| `ADMIN_KEY` | Senha para apagar a foto, a carta e as assinaturas (reset). Precisa ser igual à do `.env.local`. |
| `LOCKED_UNLOCK_AT` | Quando a página trancada abre, ex.: `2027-11-15T00:00:00-03:00`. |
| `LOCKED_MESSAGE` | Texto da mensagem trancada (só é entregue depois da data). |

Depois de mudar variáveis, faça um **Redeploy**.

## Antes do grande dia: conferir e zerar

Depois de testar a foto, a carta e as assinaturas no site publicado, deixe tudo vazio para ela:

```bash
npm run registro:status   # mostra o que existe e se está pronto para o dia
npm run registro:reset    # apaga a foto, a carta e as assinaturas (pede para digitar SIM)
```

No Windows, dá para dar dois cliques em `ver-registro.bat` e `resetar-registro.bat` (na raiz do projeto).

Os comandos leem o arquivo `.env.local` (fica só no seu computador, fora do GitHub):

```text
ADMIN_KEY=<a mesma senha cadastrada no Vercel>
SITE_URL=https://nossoalbum.nagatins.com
```

## Testes locais (npm run dev)

No modo de desenvolvimento a foto, a carta, as assinaturas e a página trancada usam um servidor de teste local (os arquivos ficam em `.dev-registro/`, fora do GitHub). Para testar a página já aberta, coloque `LOCKED_UNLOCK_AT` (uma data no passado) e `LOCKED_MESSAGE` no `.env.local`. Os botões de edição (figurinhas e páginas) só existem nesse modo e não vão para o site publicado.

Para repetir os testes do zero (foto, carta, assinaturas e o envelope da surpresa), dê dois cliques em `reset.bat` e recarregue a página do livro (F5). Ele só mexe no teste local; para zerar o site publicado, use `resetar-registro.bat`.

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
