# LifePilot - Projekt Dokumentation

## 🎯 Projekt-Übersicht

**LifePilot** ist eine Web-App zur Verwaltung geplanter Reisen. Der Benutzer (Single User: `user-001`) plant Reisen mit Claude im Chat und die Daten werden strukturiert gespeichert.

**Besonderheit:** Die App hat aktuell noch KEINE echte Datenbank/Supabase-Integration im Einsatz. Das MCP-Server-Setup ist vorbereitet für zukünftige Integration.

---

## 🛠️ Technischer Stack

- **Frontend:** React 18 + React Router 7 + Vite
- **Styling:** CSS (Mobile-First, responsive)
- **Datenbank:** Supabase (vorbereitet, noch nicht in Betrieb)
- **MCP Server:** Node.js (für Claude Desktop Integration, noch nicht aktiviert)
- **Umgebung:** Windows 11, Node.js installiert

---

## 📁 Projekt-Struktur

```
LifePilot-Web/
├── src/
│   ├── screens/
│   │   ├── TripListScreen.jsx      (Seite 1: Reiseliste)
│   │   ├── DaysOverviewScreen.jsx  (Seite 2: Tagesübersicht)
│   │   └── DayDetailScreen.jsx     (Seite 3: Tagesdetail + Edit/Delete)
│   ├── App.jsx                     (Main Component + Supabase Client)
│   ├── main.jsx                    (Entry Point)
│   └── index.css                   (Mobile-First Styling)
├── public/
│   └── Logo_LifePilot-solo.png
├── index.html                      (mit viewport meta-tag)
├── mcp-server.js                   (MCP Server für Claude Desktop)
├── scenarios.js                    (Reisetypen: Roadtrip, Hiking, Hotelurlaub)
├── .env.local                      (Supabase Credentials)
├── package.json
├── vite.config.js
├── CLAUDE.md                       (diese Datei)
├── MCP_SETUP.md                    (MCP Server Setup-Anleitung)
├── CLAUDE_PROMPT.md                (Claude Reiseplaner Prompt)
└── README.md                       (Falls vorhanden)
```

---

## 🗄️ Datenmodell

### Tabellen (Supabase Schema)

**trips**
```
id, user_id, titel, start_datum, end_datum, status, 
standard_schwerpunkte, created_at
```

**days**
```
id, trip_id, user_id, datum, start_adresse, ziel_adresse, 
strecke_km, fahrzeit_geschätzt, schwerpunkte, ankunftszeit_geplant, created_at
```

**activities**
```
id, day_id, typ, titel, dauer_geschätzt, reihenfolge, 
überschrieben, created_at
```

**accommodations**
```
id, day_id, name, typ, kosten, adresse, website, 
überschrieben, created_at
```

---

## 🎨 UI/UX Design

### Seite 1: TripListScreen
- Logo + "LifePilot" + "Deine Reisen" (18px)
- FlatList von Reisen
- Jede Reise: Card mit blauem Border
  - Titel, Datum-Range, Status-Badge
  - Schwerpunkte als Badges
- Tap → Seite 2

### Seite 2: DaysOverviewScreen
- Back-Button
- Trip-Titel
- Fortschrittsbar (Tag X von Y)
- Card mit allen Tagen
  - Jeder Tag als graues Element mit blauem Border
  - Datum-Badge, Ziel-Adresse, Strecke
- Tap → Seite 3

### Seite 3: DayDetailScreen
- Back-Button
- Datum (vollständig formatiert)
- 3 Karten (weiß, mit blauem/goldenem Border):
  1. **Fahrtinfo** (blau)
     - Start-Adresse (Google Maps Link 🗺️)
     - Ziel-Adresse (Google Maps Link 🗺️)
     - Strecke (km)
     - Edit Button (✎)
  2. **Aktivitäten** (blau)
     - List von grauen Activity-Cards
     - Jede mit: Typ, Titel, Dauer
     - Buttons: ↑↓ (Reorder), ✎ (Edit), ✕ (Delete)
  3. **Übernachtung** (gold)
     - Name, Typ, Kosten, Adresse (Google Maps Link 🗺️)
     - Edit (✎), Delete (✕) Buttons

### Responsive Design (Mobile-First)
- **Mobile (< 768px):** 100% width, padding 16px, 44px Buttons
- **Tablet (768px+):** max-width 700px, padding 24px
- **Desktop (1024px+):** max-width 900px, padding 32px, Hover Effects

---

## ✨ Features (Implementiert)

### ✅ Seiten & Navigation
- 3-Screen Navigation (React Router)
- Back-Buttons funktionieren
- Responsives Design auf allen Screens

### ✅ Daten-Management (Frontend-Only)
- Fake-Daten aus Supabase laden (wenn konfiguriert)
- **Edit:** Aktivitäten & Übernachtungen editierbar
- **Delete:** Mit Bestätigung
- **Reorder:** Aktivitäten ↑↓ verschiebbar
- **Maps Links:** Alle Adressen öffnen Google Maps

### ✅ Styling
- Mobile-First responsive CSS
- Einheitliche Card-Design (weiß, Border-Left farbig)
- Touch-friendly Buttons (44px Mindesthöhe)
- Farb-Schema: Blau (#0B4F6C), Gold (#C79A2B)

---

## 🚀 Features (In Vorbereitung)

### 📝 MCP Server (Vorbereitet, nicht aktiv)
- `mcp-server.js` – Node.js MCP Server (Standard-Protokoll)
- Speichert Reisen in Supabase (wenn verbunden)
- Claude Desktop kann damit Reisen planen

### 🎯 Reisetypen (Definiert, nicht aktiv)
`scenarios.js` enthält:
1. **Roadtrip** – Budget 0-30€, Stellplätze, legale Parkplätze
2. **Hiking** – Budget 0-50€, Herbergen, Hütten, Wanderrouten
3. **Hotelurlaub** – Budget 0-150€, komfortable Hotels

Jeder Typ mit vordefinierten Eckdaten, Aktivitätstypen, Fokus.

### 💬 Claude Integration (Prompt vorbereitet)
- `CLAUDE_PROMPT.md` – System Prompt für Reiseplaner
- Claude kennt die 3 Szenarien
- Claude plant strukturiert mit 2 Unterkunftsvorschlägen/Tag
- Claude nutzt `save_trip_to_lifepilot` Tool

---

## 🔌 Supabase Setup

**Status:** Vorbereitet, aber noch nicht verbunden

**Credentials** (in `.env.local`):
- `SUPABASE_URL`: https://dwhhydftodvyyasgsubf.supabase.co
- `SUPABASE_KEY`: (siehe .env.local)
- `LIFEPILOT_USER_ID`: user-001

**Um zu aktivieren:**
1. Supabase Tabellen erstellen (siehe Schema oben)
2. RLS Policies setzen (user_id = auth.uid())
3. App Code aktualisieren (loadData() funktioniert, aber braucht Realtime)

---

## 🎮 MCP Server Aktivierung (Für Claude Desktop)

**Setup:**
1. Claude Desktop Config öffnen: `%APPDATA%/Claude/claude_desktop_config.json`
2. MCP Server eintragen (siehe MCP_SETUP.md)
3. Claude Desktop neu starten
4. MCP Server läuft automatisch

**Test:**
- Schreib in Claude Desktop: "Plane einen 3-Tage-Roadtrip..."
- Claude nutzt `save_trip_to_lifepilot` Tool
- Speichert in Supabase (wenn verbunden)

---

## 📊 Bisherige Arbeiten (Diese Session)

### ✅ Abgeschlossen
1. **Design Vereinheitlichung**
   - Alle Screens: weiße Cards mit farbigen Borders
   - Aktivitäten in einer Card (nicht einzeln)
   - Konsistentes Styling überall

2. **Mobile-First Optimierung**
   - CSS komplett umgeschrieben
   - Touch-friendly Buttons (44px)
   - Responsive auf 3 Breakpoints (Mobile/Tablet/Desktop)
   - Input-Felder 16px (kein Auto-Zoom iOS)

3. **Maps Links**
   - Alle Adressen sind Google Maps Links (🗺️)
   - Öffnen in neuem Tab

4. **Fahrtinfo editierbar**
   - Wie Aktivitäten/Übernachtungen
   - Mit Edit (✎) Button
   - Speichern funktioniert

5. **MCP Server Setup**
   - `mcp-server.js` – Standard MCP Protocol
   - `scenarios.js` – 3 Reisetypen mit Eckdaten
   - `CLAUDE_PROMPT.md` – Reiseplaner Prompt
   - `MCP_SETUP.md` – Komplette Setup-Anleitung
   - `.env.local` – Supabase Credentials

---

## 🔄 Workflow (Geplant, Sobald MCP Aktiv)

1. **Benutzer chattet mit Claude** (Claude Desktop)
2. **Sagt:** "Plane diese Reise und speichere in LifePilot"
3. **Claude nutzt MCP Tool** `save_trip_to_lifepilot`
4. **MCP Server speichert in Supabase**
5. **App zeigt neue Reise sofort** (Realtime Updates)

---

## 📋 Bekannte Limitationen & TODOs

### Aktuell
- ❌ Echte Datenbank: Noch nicht verbunden (Supabase API funktioniert, aber keine echten Daten)
- ❌ MCP Server: Ist bereit, aber nicht aktiviert (braucht Claude Desktop Config)
- ❌ Realtime: Nicht implementiert (braucht Supabase Subscriptions)
- ❌ Add-Buttons: Fehlen noch (für neue Aktivitäten/Übernachtungen hinzufügen)
- ❌ Schwerpunkte: Auf Seite 3 nicht angezeigt (nur auf Seite 1)

### Zukünftig
- [ ] Add-Button für neue Aktivitäten
- [ ] Add-Button für neue Übernachtungen (wenn nicht vorhanden)
- [ ] Schwerpunkte auf Seite 3 anzeigen (als Badges)
- [ ] Realtime-Subscriptions (wenn Daten sich ändern, aktualisieren)
- [ ] Deployment (z.B. Vercel, Netlify)
- [ ] Mobile App (React Native, wenn gewünscht)

---

## 🚦 Nächste Prioritäten

**Nach dieser Session:**
1. MCP Server in Claude Desktop aktivieren & testen
2. Erste Reise mit Claude planen & speichern
3. Add-Buttons für Aktivitäten/Übernachtungen
4. Supabase vollständig verbinden (Realtime)
5. Deployment prüfen

---

## 📚 Wichtige Dateien für Nächste Sessions

- `src/screens/DayDetailScreen.jsx` – Komplexeste Logik (Edit/Delete/Reorder)
- `mcp-server.js` – MCP Server (Kern der Claude-Integration)
- `scenarios.js` – Reisetypen mit Eckdaten
- `src/index.css` – Mobile-First Styling
- `CLAUDE_PROMPT.md` – Claude System Prompt

---

## 🎓 Gelernte Lessons

1. **Mobile-First ist essential:** CSS sollte immer mobil anfangen
2. **Touch-Targets:** Mindestens 44px für Buttons (Apple/Google Standard)
3. **Consistent Design:** Einheitliche Cards mit Borders sparen viel Verwirrung
4. **MCP Protocol:** Standard JSON-RPC über stdio ist simpel & robust
5. **Single User:** Hardcoded User ID ist ok für Prototypen

---

## 📞 Kontakt & Support

**Benutzer:** Micha Hammerer (m.hammerer@zahlen-werk.com)
**Projekt:** LifePilot Web App
**Status:** In aktiver Entwicklung
**Ziel:** Reiseplanung mit Claude Integration

---

**Zuletzt aktualisiert:** 2026-07-31
**Von:** Claude Code (Claude Haiku 4.5)
