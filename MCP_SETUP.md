# LifePilot MCP Server Setup

## 🎯 Überblick

Der MCP Server ermöglicht es Claude, Reisen direkt in LifePilot zu planen und automatisch in Supabase zu speichern.

**Workflow:**
1. Du chättest mit Claude über eine geplante Reise
2. Du sagst: "Speichere diese Reise in LifePilot"
3. Claude nutzt den MCP Server um die Daten in Supabase zu schreiben
4. Die Reise erscheint sofort in der LifePilot App

---

## 📋 Schritt 1: Dependencies installieren

```bash
npm install @anthropic-sdk/sdk @supabase/supabase-js
```

---

## 🔐 Schritt 2: Supabase Credentials beschaffen

1. Gehe zu [supabase.com](https://supabase.com)
2. Öffne dein LifePilot Projekt
3. Gehe zu **Settings → API**
4. Kopiere:
   - **Project URL** (SUPABASE_URL)
   - **anon public key** (SUPABASE_KEY)

---

## 🔧 Schritt 3: Environment Datei erstellen

Erstelle eine `.env.local` Datei im Projekt-Root:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key-here
LIFEPILOT_USER_ID=user-001
ANTHROPIC_API_KEY=sk-...your-claude-api-key
```

---

## 🚀 Schritt 4: MCP Server mit Claude verbinden

### Option A: Claude Desktop App (Empfohlen)

1. Öffne Claude Desktop auf deinem Mac/Windows
2. Gehe zu **Settings → Developer** (Claude-Menü oben)
3. Klicke auf **Edit Config**
4. Wähle `claude_desktop_config.json`
5. Füge folgendes hinzu:

```json
{
  "mcpServers": {
    "lifepilot": {
      "command": "node",
      "args": ["path/to/mcp-server.js"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_KEY": "your-anon-key-here",
        "LIFEPILOT_USER_ID": "user-001",
        "ANTHROPIC_API_KEY": "sk-..."
      }
    }
  }
}
```

6. Speichern → Claude startet den MCP Server automatisch

### Option B: Claude Web (claude.ai)

Claude Web unterstützt noch keine lokalen MCP Server. Nutze die Desktop App.

---

## ✅ Schritt 5: Test durchführen

1. Öffne Claude Desktop
2. Schreib folgende Nachricht:

```
Ich möchte einen 3-tägigen Roadtrip in Süddeutschland planen.
- Start: München
- Ziel: Bodensee
- Budget-Stellplätze
- Mit Wanderungen

Plane die Reise und speichere sie in LifePilot.
```

3. Claude sollte:
   - ✅ Ein Roadtrip-Szenario mit Stellplätzen planen
   - ✅ Tage, Aktivitäten und Übernachtungen strukturieren
   - ✅ Das `save_trip_to_lifepilot` Tool aufrufen
   - ✅ Bestätigung erhalten

4. Öffne die LifePilot App → Neue Reise sollte da sein! 🎉

---

## 🎨 Claude Prompt (System Message)

Der MCP Server nutzt standardmäßig diesen Prompt. Du kannst ihn anpassen:

```
Du bist ein Reiseplaner für LifePilot.

Wenn der Benutzer eine Reise planen möchte:
1. Sammle alle notwendigen Informationen im Dialog
2. Plane die Reise strukturiert mit Tagen, Aktivitäten und Übernachtungen
3. Nutze das save_trip_to_lifepilot Tool um die Reise zu speichern

Szenarien:
- Roadtrip: Stellplätze/Parkplätze, Budget 0-30€, legale Plätze
- Hiking: Herbergen/Hütten, Budget 0-50€, Wanderrouten
- Hotelurlaub: komfortable Hotels, Budget 0-150€

Gib immer 2 Vorschläge pro Tag für Übernachtungen mit Website-Links.
```

---

## 📊 Reise-Datenstruktur

```javascript
{
  titel: "Alpen Roadtrip",
  start_datum: "2026-08-01",
  end_datum: "2026-08-10",
  schwerpunkte: ["Wandern", "Natur", "Stellplätze"],
  days: [
    {
      datum: "2026-08-01",
      start_adresse: "München, Deutschland",
      ziel_adresse: "Füssen, Deutschland",
      strecke_km: 150,
      fahrzeit_geschätzt: "3h",
      activities: [
        {
          typ: "Fahrt",
          titel: "Autofahrt nach Füssen",
          dauer_geschätzt: "3h"
        },
        {
          typ: "Wandern",
          titel: "Säuling-Wanderung",
          dauer_geschätzt: "2h"
        }
      ],
      accommodations: [
        {
          name: "Campingplatz Füssen",
          typ: "Stellplatz",
          kosten: "€15",
          adresse: "Füssen, Deutschland",
          website: "https://..."
        },
        {
          name: "Budget Hotel am See",
          typ: "Hotel",
          kosten: "€25",
          adresse: "Füssen, Deutschland",
          website: "https://..."
        }
      ]
    }
    // ... mehr Tage
  ]
}
```

---

## 🐛 Troubleshooting

### MCP Server startet nicht
- ✅ Überprüfe: `node mcp-server.js`
- ✅ Sind alle Env-Variablen gesetzt?
- ✅ Sind die Node Modules installiert? `npm install`

### Reise wird nicht gespeichert
- ✅ Überprüfe Supabase URL & Key
- ✅ Schau die Supabase Logs: https://app.supabase.com
- ✅ RLS Policies für deine User ID?

### Claude erkennt das Tool nicht
- ✅ Config neu laden: Claude neu starten
- ✅ Überprüfe JSON Syntax in `claude_desktop_config.json`

---

## 📱 Realtime Updates

Wenn Claude eine Reise speichert:
1. MCP Server schreibt in Supabase
2. Supabase triggert Realtime Events
3. LifePilot App aktualisiert sich automatisch (wenn offen)
4. Neue Reise sollte sofort sichtbar sein

---

## 🎓 Nächste Schritte

- [ ] MCP Server testen
- [ ] Erste Reise mit Claude planen
- [ ] App auf Mobile testen
- [ ] Claude Prompt anpassen (deine Vorlieben)
