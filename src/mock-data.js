// Mock-Daten für lokales Testen (ohne Supabase)
// UUIDs für Test-Daten

const TRIP_ID = "3cde9d50-261b-4584-b7bb-62ecae35ae39";
const DAY_1_ID = "a2040e07-7bcd-4eae-9254-c603f4d6da01";
const DAY_2_ID = "271e5bee-b88e-4ae3-a5b8-2aff17421742";

export const mockTrips = [
  {
    id: TRIP_ID,
    user_id: "user-001",
    titel: "Test Roadtrip",
    start_datum: "2026-08-15",
    end_datum: "2026-08-16",
    status: "geplant",
    standard_schwerpunkte: ["Roadtrip", "Stellplätze", "Bayern"],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const mockDays = [
  {
    id: DAY_1_ID,
    trip_id: TRIP_ID,
    datum: "2026-08-15",
    start_adresse: "München, Deutschland",
    ziel_adresse: "Chiemsee (Bernau-Felden), Deutschland",
    strecke_km: 80,
    fahrzeit_geschätzt: "1.5h",
    schwerpunkte: ["Fahrt", "Baden", "See"],
    ankunftszeit_geplant: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: DAY_2_ID,
    trip_id: TRIP_ID,
    datum: "2026-08-16",
    start_adresse: "Chiemsee (Bernau-Felden), Deutschland",
    ziel_adresse: "Salzburg, Österreich",
    strecke_km: 85,
    fahrzeit_geschätzt: "1.25h",
    schwerpunkte: ["Fahrt", "Sightseeing", "Kultur"],
    ankunftszeit_geplant: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const mockActivities = [
  {
    id: "b1040e07-7bcd-4eae-9254-c603f4d6ac01",
    day_id: DAY_1_ID,
    typ: "Fahrt",
    titel: "Fahrt München → Chiemsee",
    dauer_geschätzt: "1.5h",
    reihenfolge: 0,
    überschrieben: false,
  },
  {
    id: "b2040e07-7bcd-4eae-9254-c603f4d6ac02",
    day_id: DAY_1_ID,
    typ: "Baden",
    titel: "Baden/Wandern am Chiemsee-Ufer",
    dauer_geschätzt: "2h",
    reihenfolge: 1,
    überschrieben: false,
  },
  {
    id: "b3040e07-7bcd-4eae-9254-c603f4d6ac03",
    day_id: DAY_2_ID,
    typ: "Fahrt",
    titel: "Fahrt Chiemsee → Salzburg",
    dauer_geschätzt: "1.25h",
    reihenfolge: 0,
    überschrieben: false,
  },
  {
    id: "b4040e07-7bcd-4eae-9254-c603f4d6ac04",
    day_id: DAY_2_ID,
    typ: "Sightseeing",
    titel: "Altstadtbummel Salzburg",
    dauer_geschätzt: "3h",
    reihenfolge: 1,
    überschrieben: false,
  },
];

export const mockAccommodations = [
  {
    id: "c1040e07-7bcd-4eae-9254-c603f4d6ac01",
    day_id: DAY_1_ID,
    name: "Wohnmobilhafen am Chiemsee Bernau-Felden",
    typ: "Stellplatz",
    kosten: "€20",
    adresse: "Rasthausstraße 15, 83233 Bernau am Chiemsee",
    überschrieben: false,
  },
  {
    id: "c2040e07-7bcd-4eae-9254-c603f4d6ac02",
    day_id: DAY_2_ID,
    name: "Reisemobil Stellplatz Salzburg",
    typ: "Stellplatz",
    kosten: "€29",
    adresse: "Carl-Zuckmayer-Straße 26, 5020 Salzburg",
    überschrieben: false,
  },
];
