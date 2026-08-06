import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import LoginScreen from './screens/LoginScreen'
import ConfirmationScreen from './screens/ConfirmationScreen'
import TripListScreen from './screens/TripListScreen'
import DaysOverviewScreen from './screens/DaysOverviewScreen'
import DayDetailScreen from './screens/DayDetailScreen'
import DashboardScreen from './screens/DashboardScreen'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://dwhhydftodvyyasgsubf.supabase.co',
  import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_eVlIlqcl66vVSTrbydSzzQ_-lT5vHiK'
)

function AppRoutes() {
  const { user, loading, pendingEmailConfirmation, clearPendingConfirmation } = useAuth()

  console.log('AppRoutes - user:', user?.id, 'pendingEmailConfirmation:', pendingEmailConfirmation, 'loading:', loading)

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#0B4F6C'
      }}>
        Lädt App... 🌍
      </div>
    )
  }

  if (pendingEmailConfirmation) {
    console.log('AppRoutes - showing ConfirmationScreen for:', pendingEmailConfirmation)
    return <ConfirmationScreen email={pendingEmailConfirmation} onBackToLogin={clearPendingConfirmation} />
  }

  if (!user) {
    console.log('AppRoutes - no user, showing LoginScreen')
    return <LoginScreen />
  }

  console.log('AppRoutes - user logged in, showing Dashboard')
  return (
    <Routes>
      <Route path="/" element={<DashboardScreen />} />
      <Route path="/dashboard" element={<DashboardScreen />} />
      <Route path="/trips" element={<TripListScreen />} />
      <Route path="/trip/:tripId" element={<DaysOverviewScreen />} />
      <Route path="/day/:dayId" element={<DayDetailScreen />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  )
}