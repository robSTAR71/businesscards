/**
 * Minimal Cloudflare Worker that proxies business-card photos to the Claude Vision API.
 *
 * Why this exists as a separate service instead of calling Anthropic straight from the app:
 * a mobile app bundle can be decompiled, so an API key embedded in client code is effectively
 * public. This worker holds ANTHROPIC_API_KEY as a server-side secret and is the only thing
 * that talks to api.anthropic.com; the app only ever talks to this worker's URL.
 *
 * Deploy: see README.md in this folder.
 */

export interface Env {
  ANTHROPIC_API_KEY: string;
}

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL = 'claude-sonnet-5';
const MAX_IMAGE_BASE64_LENGTH = 8_000_000; // ~6MB decoded, comfortably under Anthropic's per-image limit

const EXTRACTION_PROMPT = `Du bekommst das Foto einer Visitenkarte. Extrahiere die Kontaktdaten und antworte
AUSSCHLIESSLICH mit einem einzigen JSON-Objekt (kein Markdown, kein Fließtext davor oder danach) in exakt
diesem Format:

{
  "firstName": string oder null,
  "lastName": string oder null,
  "organization": string oder null,
  "jobTitle": string oder null,
  "phones": [{"label": "work"|"mobile"|"fax"|"other", "number": string}],
  "emails": [{"label": "work"|"other", "address": string}],
  "addresses": [{"label": "work"|"other", "street": string oder null, "city": string oder null, "postalCode": string oder null, "country": string oder null}],
  "website": string oder null,
  "notes": string oder null
}

Regeln:
- Erfinde keine Werte. Wenn ein Feld auf der Karte nicht erkennbar ist, lasse es weg bzw. setze null.
- "notes" nur befüllen, wenn zusätzlicher Text auf der Karte steht, der in kein anderes Feld passt
  (z.B. Zertifizierungen, Slogan).
- Telefonnummern und E-Mails als Array, auch wenn nur ein Eintrag vorhanden ist.`;

interface AnthropicContentBlock {
  type: string;
  text?: string;
}

interface AnthropicResponse {
  content: AnthropicContentBlock[];
}

function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

/** The model is instructed to return raw JSON, but strips a defensive markdown fence if present. */
function extractJsonText(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : trimmed;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }
    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }
    if (!env.ANTHROPIC_API_KEY) {
      return jsonResponse({ error: 'Server ist nicht konfiguriert (ANTHROPIC_API_KEY fehlt).' }, 500);
    }

    let body: { image?: string; mediaType?: string };
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Ungültiger JSON-Body.' }, 400);
    }

    const { image, mediaType } = body;
    if (!image || (mediaType !== 'image/jpeg' && mediaType !== 'image/png')) {
      return jsonResponse({ error: 'Erwarte { image: base64String, mediaType: "image/jpeg" | "image/png" }.' }, 400);
    }
    if (image.length > MAX_IMAGE_BASE64_LENGTH) {
      return jsonResponse({ error: 'Bild ist zu groß.' }, 413);
    }

    const anthropicResponse = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 1024,
        temperature: 0,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
              { type: 'text', text: EXTRACTION_PROMPT },
            ],
          },
        ],
      }),
    });

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      return jsonResponse({ error: `Vision-API-Fehler: ${anthropicResponse.status} ${errorText}` }, 502);
    }

    const result = (await anthropicResponse.json()) as AnthropicResponse;
    const textBlock = result.content.find((block) => block.type === 'text');
    if (!textBlock?.text) {
      return jsonResponse({ error: 'Keine Textantwort vom Vision-Modell erhalten.' }, 502);
    }

    try {
      const parsed = JSON.parse(extractJsonText(textBlock.text));
      return jsonResponse(parsed);
    } catch {
      return jsonResponse({ error: 'Vision-Modell lieferte kein gültiges JSON.', raw: textBlock.text }, 502);
    }
  },
};
