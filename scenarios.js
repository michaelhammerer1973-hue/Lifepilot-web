// Vordefinierte Reisetypen mit Eckdaten
export const travelScenarios = {
  roadtrip: {
    name: "Roadtrip",
    description: "Budget-Roadtrip mit kostenlosen/günstigen Stellplätzen",
    accommodation: {
      priority: "kostenfrei/günstig",
      types: ["Stellplatz", "Parkplatz", "Budget-Hotel", "Airbnb"],
      maxBudget: 30,
      suggestions: 2,
      requireWebsite: true
    },
    focus: "Legale Stellplätze & Parkplätze bevorzugt",
    activities: ["Fahrt", "Stopover", "Sightseeing", "Picknick"],
    instructions: "Plane Etappen mit legalen Stellplätzen/Parkplätzen. Budget für Unterkunft 0-30€. 2 Vorschläge pro Tag mit Website-Links."
  },

  hiking: {
    name: "Hiking",
    description: "Wanderurlaub mit günstigen Herbergen und Hütten",
    accommodation: {
      priority: "günstig",
      types: ["Herberge", "Hütte", "Guesthouse", "Budget-Hotel"],
      maxBudget: 50,
      suggestions: 2,
      requireWebsite: true
    },
    focus: "Günstige Herbergen & Hütten, Wanderrouten-Fokus",
    activities: ["Wandern", "Naturbeobachtung", "Picknick", "Aussichtspunkt"],
    instructions: "Plane Wanderrouten und günstige Unterkünfte. Budget 0-50€. 2 Herbergen/Hütten pro Tag mit Website-Links wenn vorhanden."
  },

  hotelurlaub: {
    name: "Hotelurlaub",
    description: "Komfortabler Hotelurlaub mit guten Unterkünften",
    accommodation: {
      priority: "komfort",
      types: ["Hotel", "Gasthof", "Pension", "Guesthouse"],
      maxBudget: 150,
      suggestions: 2,
      requireWebsite: true
    },
    focus: "Komfortable Unterkünfte, gutes Preis-Leistungs-Verhältnis",
    activities: ["Sightseeing", "Kultur", "Restaurants", "Relaxation", "Wandern"],
    instructions: "Plane komfortable Hotels/Gasthöfe. Budget 0-150€. 2 Vorschläge pro Tag mit Website-Links und Bewertungen."
  }
}

export function getScenario(name) {
  return travelScenarios[name.toLowerCase()] || null
}
