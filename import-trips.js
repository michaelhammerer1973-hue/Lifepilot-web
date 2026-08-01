#!/usr/bin/env node

/**
 * LifePilot Import Script
 * Importiert Reisen direkt in Supabase
 */

import { createClient } from "@supabase/supabase-js";
import { mockTrips, mockDays, mockActivities, mockAccommodations } from "./src/mock-data.js";

// Umgebungsvariablen
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const USER_ID = process.env.LIFEPILOT_USER_ID || "user-001";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Fehler: SUPABASE_URL und SUPABASE_KEY nicht gesetzt!");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function importTrips() {
  console.log("📝 Starte Import in Supabase...\n");

  try {
    // 1. Trips importieren
    console.log("1️⃣  Importiere Trips...");
    for (const trip of mockTrips) {
      const { error } = await supabase.from("trips").insert([trip]);
      if (error) {
        console.warn(`   ⚠️  Trip "${trip.titel}" existiert bereits oder Fehler:`, error.message);
      } else {
        console.log(`   ✅ Trip "${trip.titel}" importiert`);
      }
    }

    // 2. Days importieren
    console.log("\n2️⃣  Importiere Tage...");
    for (const day of mockDays) {
      const { error } = await supabase.from("days").insert([day]);
      if (error) {
        console.warn(`   ⚠️  Tag ${day.datum} Fehler:`, error.message);
      } else {
        console.log(`   ✅ Tag ${day.datum} importiert`);
      }
    }

    // 3. Activities importieren
    console.log("\n3️⃣  Importiere Aktivitäten...");
    for (const activity of mockActivities) {
      const { error } = await supabase.from("activities").insert([activity]);
      if (error) {
        console.warn(`   ⚠️  Aktivität "${activity.titel}" Fehler:`, error.message);
      } else {
        console.log(`   ✅ Aktivität "${activity.titel}" importiert`);
      }
    }

    // 4. Accommodations importieren
    console.log("\n4️⃣  Importiere Übernachtungen...");
    for (const accommodation of mockAccommodations) {
      const { error } = await supabase.from("accommodations").insert([accommodation]);
      if (error) {
        console.warn(`   ⚠️  Unterkunft "${accommodation.name}" Fehler:`, error.message);
      } else {
        console.log(`   ✅ Unterkunft "${accommodation.name}" importiert`);
      }
    }

    console.log("\n✅ Import abgeschlossen!");
    console.log("\n📱 Öffne LifePilot App → F5 drücken → Reisen sollten sichtbar sein!");
  } catch (error) {
    console.error("❌ Fehler beim Import:", error.message);
    process.exit(1);
  }
}

importTrips();
