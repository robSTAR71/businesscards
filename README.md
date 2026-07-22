# BusinessCards

Cross-Platform-App (React Native / Expo), um gesammelte Visitenkarten per Foto in
strukturierte Kontakte umzuwandeln, lokal zu verwalten und als vCard zu exportieren
(z.B. Import in Google Contacts oder das iPhone-Adressbuch).

## Architektur

```
App (React Native / Expo)
 ├─ Capture-Screen: Kamera-Foto der Visitenkarte
 │    ├─ 1. Live-QR-Scan (expo-camera, kostenlos, exakt) → falls ausreichend, fertig
 │    └─ 2. Fallback: Cloud-OCR über eigenen Server-Proxy (server/ocr-worker)
 ├─ Review-Screen: Felder prüfen/korrigieren, Kontext-Label (Beruflich/Privat/Mischung) + Tags
 ├─ Lokale SQLite-DB (expo-sqlite) — Quelle der Wahrheit, offline-fähig
 └─ vCard-Export (.vcf) über expo-sharing — Import in Google Contacts / iOS Contacts
```

Warum ein separater Server (`server/ocr-worker`) für die Cloud-KI? Ein App-Bundle lässt
sich dekompilieren — ein API-Key im Client-Code wäre damit öffentlich. Der Worker hält den
Anthropic-API-Key als Server-Secret; die App spricht nur mit dem Worker, nie direkt mit der
Vision-API.

## Setup

```bash
npm install
npx expo start
```

Am einfachsten über die Expo-Go-App auf einem echten Gerät testen (Kamera-Zugriff nötig,
funktioniert im Simulator nicht zuverlässig).

### Cloud-OCR aktivieren (optional)

Ohne Konfiguration funktioniert die App bereits: QR-Codes werden weiterhin erkannt, und
Kontaktdaten können im Review-Screen manuell eingetragen werden.

Für die automatische Texterkennung per Foto:

1. Worker deployen: Anleitung in `server/ocr-worker/README.md`
2. `.env` anlegen (siehe `.env.example`) und `EXPO_PUBLIC_OCR_ENDPOINT` auf die Worker-URL setzen

## Tests

```bash
npm test        # Jest — Unit-Tests für Parser, Export, Heuristik, Merge-Logik
npx tsc --noEmit # Type-Check
```

Reine Logik (vCard/MeCard-Parsing, vCard-Export, Kontext-Label-Heuristik, QR/OCR-Merge)
ist unit-getestet. Die UI-Screens selbst sind in dieser Umgebung nicht in einem Simulator
gegengetestet worden (keine grafische Ausgabe verfügbar) — das sollte vor dem produktiven
Einsatz auf einem echten Gerät/Simulator geprüft werden.

## Stand vs. Roadmap

- [x] **Phase 1 (MVP)**: Kamera-Aufnahme, QR-Code-Kurzweg, Cloud-OCR-Fallback, Review-Screen
      mit Feldquellen-Anzeige (QR/KI/manuell), Kontext-Label + Tags, lokale Speicherung,
      vCard-Export (einzeln & gesamt)
- [ ] **Phase 2**: Galerie-Batch-Import (mehrere bestehende Fotos auf einmal verarbeiten)
- [ ] **Phase 3**: Direkte Google-Contacts-Synchronisation (OAuth + People API)
- [ ] **Phase 4**: Direkte iPhone-Synchronisation (natives Contacts-Modul, `CNContactStore`)
- [ ] **Phase 5**: Duplikat-Erkennung/Merge, Suche

## Projektstruktur

```
src/
 ├─ types/contact.ts          Datenmodell
 ├─ db/                       SQLite-Schema + Repository
 ├─ utils/
 │   ├─ vcardParser.ts        QR-Payload (vCard/MeCard) → Kontaktdaten
 │   ├─ vcardExport.ts        Kontakt → vCard-Text
 │   ├─ contextLabelHeuristic.ts  Beruflich/Privat/Mischung-Vorschlag
 │   └─ fieldSources.ts       Trackt, ob ein Feld aus QR/OCR/manuell stammt
 ├─ services/
 │   ├─ ocrService.ts         Client für den OCR-Worker
 │   ├─ cardExtraction.ts     Orchestriert QR-Scan → OCR-Fallback → Merge
 │   └─ vcardShare.ts         .vcf schreiben + teilen
 └─ screens/                  Capture, Review, ContactList
server/ocr-worker/            Cloudflare Worker: Foto → Claude Vision → JSON
```
