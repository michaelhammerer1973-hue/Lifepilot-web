import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'
import TripListScreen from './screens/TripListScreen'
import DaysOverviewScreen from './screens/DaysOverviewScreen'
import DayDetailScreen from './screens/DayDetailScreen'
import DashboardScreen from './screens/DashboardScreen'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
)

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<DashboardScreen />} />
        <Route path="/trips" element={<TripListScreen />} />
        <Route path="/trip/:tripId" element={<DaysOverviewScreen />} />
        <Route path="/day/:dayId" element={<DayDetailScreen />} />
      </Routes>
    </Router>
  )
}