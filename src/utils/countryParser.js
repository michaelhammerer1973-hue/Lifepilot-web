import countries from '../data/countries.json'

// Finde Land by Name (fuzzy matching)
export const findCountryByName = (countryName) => {
  if (!countryName) return null

  const normalized = countryName.trim().toLowerCase()

  // Exact match
  for (const [code, data] of Object.entries(countries)) {
    if (data.name.toLowerCase() === normalized) {
      return { code, ...data }
    }
  }

  // Partial match
  for (const [code, data] of Object.entries(countries)) {
    if (data.name.toLowerCase().includes(normalized) || normalized.includes(data.name.toLowerCase())) {
      return { code, ...data }
    }
  }

  return null
}

// Extrahiere Land aus Adresse (z.B. "Porto, Portugal" → {code: "PT", name: "Portugal"})
export const extractCountryFromAddress = (address) => {
  if (!address) return null

  // Split by comma und nimm den letzten Teil
  const parts = address.split(',').map(p => p.trim())
  const lastPart = parts[parts.length - 1]

  return findCountryByName(lastPart)
}

// Extrahiere alle geplanten Länder aus Trips
export const getAllPlannedCountries = (trips) => {
  const countryCodes = new Set()

  if (!trips || trips.length === 0) return []

  trips.forEach(trip => {
    if (trip.days && Array.isArray(trip.days)) {
      trip.days.forEach(day => {
        if (day.ziel_adresse) {
          const country = extractCountryFromAddress(day.ziel_adresse)
          if (country) {
            countryCodes.add(country.code)
          }
        }
      })
    }
  })

  return Array.from(countryCodes)
}

// Get country by code
export const getCountryByCode = (code) => {
  return countries[code] || null
}

// Get all countries
export const getAllCountries = () => {
  return countries
}
