#!/usr/bin/env node

/**
 * LifePilot MCP Server
 * Standard MCP Protocol Implementation
 * Speichert Reisen direkt in Supabase
 *
 * Keine Claude API Abhängigkeit - Claude (Desktop/Web) nutzt diesen Server
 */

import { createClient } from "@supabase/supabase-js";
import readline from "readline";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Lade .env.local
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  envContent.split("\n").forEach(line => {
    const [key, value] = line.split("=");
    if (key && value && !process.env[key]) {
      process.env[key] = value;
    }
  });
}

// Umgebungsvariablen
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const USER_ID = process.env.LIFEPILOT_USER_ID || "user-001";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Fehler: SUPABASE_URL und SUPABASE_KEY nicht gesetzt!");
  process.exit(1);
}

// Supabase Client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Validierungsfunktion
function validateTripData(data) {
  const errors = [];

  if (!data.titel || typeof data.titel !== "string")
    errors.push("titel ist erforderlich");
  if (!data.start_datum || typeof data.start_datum !== "string")
    errors.push("start_datum ist erforderlich (YYYY-MM-DD)");
  if (!data.end_datum || typeof data.end_datum !== "string")
    errors.push("end_datum ist erforderlich (YYYY-MM-DD)");
  if (!Array.isArray(data.days) || data.days.length === 0)
    errors.push("Mindestens ein Tag ist erforderlich");

  data.days.forEach((day, idx) => {
    if (!day.datum) errors.push(`Tag ${idx + 1}: datum ist erforderlich`);
    if (!day.ziel_adresse)
      errors.push(`Tag ${idx + 1}: ziel_adresse ist erforderlich`);
  });

  return errors;
}

// Speichern der Reise
async function saveTripToSupabase(tripData) {
  try {
    // Validierung
    const errors = validateTripData(tripData);
    if (errors.length > 0) {
      return {
        success: false,
        error: "Validierungsfehler: " + errors.join(", "),
      };
    }

    // 1. Trip erstellen
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .insert([
        {
          user_id: USER_ID,
          titel: tripData.titel,
          start_datum: tripData.start_datum,
          end_datum: tripData.end_datum,
          status: "geplant",
          standard_schwerpunkte: tripData.schwerpunkte || [],
        },
      ])
      .select();

    if (tripError) throw tripError;
    if (!trip || trip.length === 0) throw new Error("Trip nicht erstellt");

    const tripId = trip[0].id;

    // 2. Tage erstellen
    const daysToInsert = tripData.days.map((day) => ({
      trip_id: tripId,
      user_id: USER_ID,
      datum: day.datum,
      start_adresse: day.start_adresse || null,
      ziel_adresse: day.ziel_adresse,
      strecke_km: day.strecke_km || null,
      fahrzeit_geschätzt: day.fahrzeit_geschätzt || null,
      schwerpunkte: day.schwerpunkte || [],
      ankunftszeit_geplant: day.ankunftszeit_geplant || null,
    }));

    const { data: days, error: daysError } = await supabase
      .from("days")
      .insert(daysToInsert)
      .select();

    if (daysError) throw daysError;

    // 3. Aktivitäten erstellen
    const activitiesToInsert = [];
    tripData.days.forEach((day, dayIdx) => {
      if (day.activities && Array.isArray(day.activities)) {
        day.activities.forEach((activity, actIdx) => {
          activitiesToInsert.push({
            day_id: days[dayIdx].id,
            typ: activity.typ,
            titel: activity.titel,
            dauer_geschätzt: activity.dauer_geschätzt || null,
            reihenfolge: actIdx,
            überschrieben: false,
          });
        });
      }
    });

    if (activitiesToInsert.length > 0) {
      const { error: activitiesError } = await supabase
        .from("activities")
        .insert(activitiesToInsert);

      if (activitiesError) throw activitiesError;
    }

    // 4. Übernachtungen erstellen
    const accommodationsToInsert = [];
    tripData.days.forEach((day, dayIdx) => {
      if (day.accommodations && Array.isArray(day.accommodations)) {
        day.accommodations.forEach((acc) => {
          accommodationsToInsert.push({
            day_id: days[dayIdx].id,
            name: acc.name,
            typ: acc.typ,
            kosten: acc.kosten || null,
            adresse: acc.adresse,
            website: acc.website || null,
            überschrieben: false,
          });
        });
      }
    });

    if (accommodationsToInsert.length > 0) {
      const { error: accommodationsError } = await supabase
        .from("accommodations")
        .insert(accommodationsToInsert);

      if (accommodationsError) throw accommodationsError;
    }

    return {
      success: true,
      tripId,
      message: `✅ Reise "${tripData.titel}" erfolgreich in LifePilot gespeichert!`,
      stats: {
        trip: 1,
        days: days.length,
        activities: activitiesToInsert.length,
        accommodations: accommodationsToInsert.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// MCP JSON-RPC Handler
async function handleRequest(request) {
  const { jsonrpc, id, method, params } = request;

  if (jsonrpc !== "2.0") {
    return { jsonrpc: "2.0", id, error: { code: -32600, message: "Invalid Request" } };
  }

  if (method === "initialize") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        serverInfo: {
          name: "lifepilot",
          version: "1.0.0",
        },
      },
    };
  }

  if (method === "tools/list") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        tools: [
          {
            name: "save_trip_to_lifepilot",
            description: "Speichert eine geplante Reise in LifePilot (Supabase)",
            inputSchema: {
              type: "object",
              properties: {
                titel: { type: "string", description: "Name der Reise" },
                start_datum: { type: "string", description: "Start-Datum (YYYY-MM-DD)" },
                end_datum: { type: "string", description: "End-Datum (YYYY-MM-DD)" },
                schwerpunkte: { type: "array", items: { type: "string" } },
                days: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      datum: { type: "string" },
                      start_adresse: { type: "string" },
                      ziel_adresse: { type: "string" },
                      strecke_km: { type: "number" },
                      fahrzeit_geschätzt: { type: "string" },
                      schwerpunkte: { type: "array", items: { type: "string" } },
                      activities: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            typ: { type: "string" },
                            titel: { type: "string" },
                            dauer_geschätzt: { type: "string" },
                          },
                        },
                      },
                      accommodations: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            name: { type: "string" },
                            typ: { type: "string" },
                            kosten: { type: "string" },
                            adresse: { type: "string" },
                            website: { type: "string" },
                          },
                        },
                      },
                    },
                    required: ["datum", "ziel_adresse"],
                  },
                },
              },
              required: ["titel", "start_datum", "end_datum", "days"],
            },
          },
        ],
      },
    };
  }

  if (method === "tools/call") {
    const { name, arguments: args } = params;

    if (name === "save_trip_to_lifepilot") {
      const result = await saveTripToSupabase(args);
      return {
        jsonrpc: "2.0",
        id,
        result: {
          content: [
            {
              type: "text",
              text: result.message || result.error,
            },
          ],
          isError: !result.success,
        },
      };
    }

    return {
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message: `Unknown tool: ${name}` },
    };
  }

  return {
    jsonrpc: "2.0",
    id,
    error: { code: -32601, message: `Unknown method: ${method}` },
  };
}

// Starte Server
console.error("🚀 LifePilot MCP Server läuft...");
console.error(`📍 Supabase: ${SUPABASE_URL}`);
console.error(`👤 User ID: ${USER_ID}\n`);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

rl.on("line", async (line) => {
  if (!line.trim()) return;

  try {
    const request = JSON.parse(line);
    const response = await handleRequest(request);
    console.log(JSON.stringify(response));
  } catch (error) {
    console.log(JSON.stringify({
      jsonrpc: "2.0",
      error: { code: -32700, message: "Parse error" },
    }));
  }
});

rl.on("close", () => {
  process.exit(0);
});
