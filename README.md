# BusinessCards

Cross-Platform-App (React Native / Expo), um gesammelte Visitenkarten per Foto in
strukturierte Kontakte umzuwandeln, lokal zu verwalten und nach Google Contacts oder ins
iPhone-/Android-Adressbuch zu übernehmen.

## Architektur

```
App (React Native / Expo)
 ├─ Capture-Screen: Kamera-Foto der Visitenkarte
 │    ├─ 1. Live-QR-Scan (expo-camera, kostenlos, exakt) → falls ausreichend, fertig
 │    └─ 2. Fallback: Cloud-OCR über eigenen Server-Proxy (server/ocr-worker)
 ├─ Galerie-Import: gleiche Pipeline für mehrere bestehende Fotos nacheinander
 ├─ Review-Screen: Felder prüfen/korrigieren, Kontext-Label (Beruflich/Privat/Bi) + Tags,
 │    Duplikat-Warnung vor dem Anlegen eines neuen Kontakts
 ├─ Lokale SQLite-DB (expo-sqlite) — Quelle der Wahrheit, offline-fähig
 ├─ vCard-Export (.vcf) über expo-sharing — universeller Fallback für jede Kontakte-App
 ├─ Telefon-Kontakte-Sync (expo-contacts) — direkt ins iOS-/Android-Adressbuch
 └─ Google-Contacts-Sync (OAuth + People API) — legt/aktualisiert Kontakte direkt bei Google
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

Am einfachsten über die Expo-Go-App auf einem echten Gerät testen (Kamera-/Kontakte-Zugriff
nötig, funktioniert im Simulator nicht zuverlässig).

### Cloud-OCR aktivieren (optional)

Ohne Konfiguration funktioniert die App bereits: QR-Codes werden weiterhin erkannt, und
Kontaktdaten können im Review-Screen manuell eingetragen werden.

Für die automatische Texterkennung per Foto:

1. Worker deployen: Anleitung in `server/ocr-worker/README.md`
2. `.env` anlegen (siehe `.env.example`) und `EXPO_PUBLIC_OCR_ENDPOINT` auf die Worker-URL setzen

### Google Contacts Sync aktivieren (optional)

1. Google-Cloud-Projekt anlegen, **People API** aktivieren
2. OAuth-Client-ID anlegen (Typ "iOS" oder "Android", je nach Testgerät; Redirect-URI wird
   von `expo-auth-session` über das App-Schema `businesscards://` gebildet)
3. `.env`: `EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID=<deine-client-id>`
4. In der App: Review-Screen → „Speichern & zu Google Contacts" → Google-Anmeldung im
   Browser abschließen → danach erneut auf den Button tippen (die Anmeldung läuft
   asynchronisch ab; siehe Hinweis unten)

Kontakte landen automatisch in einer Google-Kontaktgruppe passend zum Kontext-Label
(„Beruflich" / „Privat" / „Bi"), damit die Gruppierung auch außerhalb der App sichtbar bleibt.

### Telefon-Kontakte-Sync

Keine Konfiguration nötig — „Speichern & in Telefon-Kontakte übernehmen" fragt beim ersten
Mal nach der Kontakte-Berechtigung und schreibt danach direkt über `expo-contacts` (iOS
`CNContactStore` / Android `ContactsContract`) einen neuen oder aktualisierten Eintrag.

> Hinweis iOS: Das Notizfeld eines Kontakts erfordert ein separates, von Apple erteiltes
> Entitlement, das Expo Go nicht hat. Tags landen dort trotzdem im vCard-Export und in
> Google Contacts, nur nicht im nativen iPhone-Notizfeld.

## Tests

```bash
npm test        # Jest — Unit-Tests für Parser, Export, Heuristik, Merge- und Sync-Logik
npx tsc --noEmit # Type-Check
```

Reine Logik (vCard/MeCard-Parsing, vCard-Export, Kontext-Label-Heuristik, QR/OCR-Merge,
Duplikat-Erkennung, Google-People-API-Mapping inkl. gemocktem Netzwerk-Client) ist
unit-getestet.

**Nicht in dieser Umgebung testbar** (kein Simulator, kein Gerät, kein eigenes Google-Cloud-
Projekt verfügbar):
- Die UI-Screens selbst (nur Type-Check, kein visueller/interaktiver Test)
- Der komplette Google-OAuth-Browser-Flow (Anmeldung, Redirect, Token-Austausch)
- `expo-contacts`-Schreibzugriff auf ein echtes Adressbuch

Vor dem produktiven Einsatz auf einem echten Gerät durchklicken, insbesondere den
Google-Sign-in-Flow und die Telefon-Kontakte-Übernahme.

## Stand vs. Roadmap

- [x] **Phase 1 (MVP)**: Kamera-Aufnahme, QR-Code-Kurzweg, Cloud-OCR-Fallback, Review-Screen
      mit Feldquellen-Anzeige (QR/KI/manuell), Kontext-Label + Tags, lokale Speicherung,
      vCard-Export (einzeln & gesamt)
- [x] **Phase 2**: Galerie-Batch-Import (mehrere bestehende Fotos nacheinander verarbeiten,
      mit Fortschrittsanzeige und "Überspringen")
- [x] **Phase 3**: Direkte Google-Contacts-Synchronisation (OAuth + People API,
      Kontextlabel → Google-Kontaktgruppe, Re-Sync statt Duplikat)
- [x] **Phase 4**: Direkte Telefon-Kontakte-Synchronisation (`expo-contacts`, iOS + Android)
- [x] **Phase 5**: Duplikat-Erkennung (E-Mail/Telefon/Name) mit Warnhinweis vor dem Anlegen
- [ ] Mögliche nächste Schritte: Volltextsuche, Merge-UI für erkannte Duplikate (statt nur
      warnen), Mehrfach-Label pro Kontakt für Tags analog zum Kontextlabel bei Google

## Projektstruktur

```
src/
 ├─ types/contact.ts          Datenmodell
 ├─ db/                       SQLite-Schema, Migrationen + Repository
 ├─ utils/
 │   ├─ vcardParser.ts        QR-Payload (vCard/MeCard) → Kontaktdaten
 │   ├─ vcardExport.ts        Kontakt → vCard-Text
 │   ├─ contextLabelHeuristic.ts  Beruflich/Privat/Bi-Vorschlag
 │   ├─ fieldSources.ts       Trackt, ob ein Feld aus QR/OCR/manuell stammt
 │   └─ duplicateDetection.ts Erkennt wahrscheinlich gleiche Kontakte (E-Mail/Telefon/Name)
 ├─ services/
 │   ├─ ocrService.ts         Client für den OCR-Worker
 │   ├─ cardExtraction.ts     Orchestriert QR-Scan → OCR-Fallback → Merge
 │   ├─ vcardShare.ts         .vcf schreiben + teilen
 │   ├─ deviceContactsService.ts  Schreibt ins native Adressbuch (expo-contacts)
 │   ├─ googleAuth.ts         Token-Refresh/-Validierung (OAuth)
 │   ├─ googleAuthStorage.ts  Verschlüsselte Token-Ablage (expo-secure-store)
 │   ├─ googlePeoplePayload.ts  Kontakt → Google-People-API-JSON (rein, getestet)
 │   └─ googleContactsService.ts  People-API-Client (Gruppen, Create/Update)
 ├─ hooks/useGoogleContactsSync.ts  Google-Sign-in + Sync für den Review-Screen
 ├─ navigation/photoQueue.ts  Verarbeitet eine Galerie-Import-Warteschlange Foto für Foto
 └─ screens/                  Capture, GalleryImport, Review, ContactList
server/ocr-worker/            Cloudflare Worker: Foto → Claude Vision → JSON
```
