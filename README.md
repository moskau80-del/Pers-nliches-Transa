# PackLager Cloud

Cloudfähige Ausrüstungs- und Packlistenverwaltung mit Supabase, Login und synchronisierten Daten.

## Funktionen

- Gleiche Datensammlung auf PC, Smartphone und Tablet
- Anmeldung per E-Mail und Passwort
- Ausrüstung mit Kategorie, Gewicht, Menge, Lagerplatz, Hersteller, Preis und Notizen
- Packlisten mit Drag-and-drop
- Wunschliste
- Artikel- und Packlistenvergleich per Drag-and-drop
- CSV-Import, inklusive LighterPack-Export
- Schweizer Währungsformat CHF
- Datenzugriff geschützt durch Supabase Row Level Security

## 1. Supabase einrichten

1. Auf Supabase ein neues Projekt erstellen.
2. Im Supabase-Dashboard **SQL Editor** öffnen.
3. Den vollständigen Inhalt von `supabase-schema.sql` einfügen und ausführen.
4. Unter **Project Settings → API** folgende Werte kopieren:
   - Project URL
   - anon/public key
5. Optional unter **Authentication → Providers → Email** festlegen, ob neue Konten ihre E-Mail bestätigen müssen.

## 2. Lokal testen

Die Datei `.env.example` zu `.env` kopieren und die Werte einsetzen:

```env
VITE_SUPABASE_URL=https://DEIN-PROJEKT.supabase.co
VITE_SUPABASE_ANON_KEY=DEIN_ANON_KEY
```

Dann:

```bash
npm install
npm run dev
```

## 3. GitHub und Netlify

1. Den gesamten Projektordner in ein GitHub-Repository hochladen.
2. In Netlify **Add new project → Import an existing project** wählen.
3. Das GitHub-Repository verbinden.
4. Build-Einstellungen werden aus `netlify.toml` gelesen.
5. In Netlify unter **Site configuration → Environment variables** anlegen:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Einen neuen Deploy auslösen.

Danach kannst du den Netlify-Link auf allen Geräten öffnen und dich überall mit demselben Konto anmelden.

## Bestehende LighterPack-Daten übernehmen

In der App den Bereich **CSV-Import** öffnen und die CSV-Datei auswählen. Unterstützt werden unter anderem:

`Item Name, Category, desc, qty, weight, unit, url, price, worn, consumable`

Der Import ergänzt standardmässig die bestehende Datensammlung. Alternativ können gleichnamige Artikel aktualisiert werden.
