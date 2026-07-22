# OCR Worker

Kleiner Cloudflare Worker, der Visitenkarten-Fotos an die Claude Vision API schickt und
strukturierte Kontaktdaten als JSON zurückgibt.

Der `ANTHROPIC_API_KEY` bleibt server-seitig als Secret. Er darf **nicht** in die
React-Native-App gebaut werden, da App-Bundles dekompiliert werden können.

## Deployment

```bash
cd server/ocr-worker
npm install
npx wrangler login
npx wrangler secret put ANTHROPIC_API_KEY   # Anthropic API Key eingeben
npm run deploy
```

Wrangler gibt danach eine URL aus (z.B. `https://businesscards-ocr-worker.<dein-account>.workers.dev`).
Diese URL trägst du in der App als `EXPO_PUBLIC_OCR_ENDPOINT` ein (siehe Haupt-README).

## Lokal testen

```bash
npm run dev
curl -X POST http://localhost:8787 \
  -H "Content-Type: application/json" \
  -d '{"image": "<base64>", "mediaType": "image/jpeg"}'
```

## API-Vertrag

**Request** `POST /` — `{ "image": "<base64>", "mediaType": "image/jpeg" | "image/png" }`

**Response** `200` — JSON-Objekt mit `firstName`, `lastName`, `organization`, `jobTitle`,
`phones[]`, `emails[]`, `addresses[]`, `website`, `notes` (alle Felder optional, je nachdem
was auf der Karte erkennbar war). Wird von `src/services/ocrService.ts::normalizeOcrResponse`
in der App defensiv geparst.
