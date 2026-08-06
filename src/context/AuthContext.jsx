import { createContext, useState, useContext, useEffect } from 'react'
import { supabase } from '../App'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pendingEmailConfirmation, setPendingEmailConfirmation] = useState(null)

  const translateError = (message) => {
    const errorMap = {
      'Invalid login credentials': 'Ungültige Anmeldedaten',
      'Email not confirmed': 'E-Mail nicht bestätigt',
      'User already registered': 'Benutzer bereits registriert',
      'Invalid API Key': 'Ungültiger API-Schlüssel',
      "Could not find the 'username' column": 'Username-Spalte fehlt in der Datenbank',
      'duplicate key value': 'Benutzername bereits vergeben',
      'new row violates row-level security': 'Zugriff verweigert',
    }

    for (const [en, de] of Object.entries(errorMap)) {
      if (message.includes(en)) {
        return de
      }
    }
    return message
  }

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        await loadUserProfile(session.user.id)
      }
    } catch (err) {
      console.error('Auth check error:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadUserProfile = async (userId) => {
    try {
      console.log('loadUserProfile - fetching profile for:', userId)
      const { data, error: err } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      console.log('loadUserProfile - result:', { data, error: err })

      if (err) throw err

      if (data) {
        console.log('loadUserProfile - setting user:', data)
        setUser({
          id: data.id,
          email: data.email,
          username: data.username,
          subscription: data.subscription
        })
      } else {
        console.warn('loadUserProfile - no profile data found for user:', userId)
      }
    } catch (err) {
      console.error('Error loading profile:', err)
    }
  }

  const signUp = async (email, password, username) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: err } = await supabase.auth.signUp({
        email,
        password
      })

      if (err) throw err
      if (!data.user) throw new Error('Registrierung fehlgeschlagen')

      console.log('signUp - saving username for user:', data.user.id)

      const { error: usernameErr } = await supabase
        .rpc('save_username', {
          user_id: data.user.id,
          new_username: username
        })

      console.log('signUp - save_username result:', usernameErr)

      if (usernameErr) {
        console.error('signUp - save_username error:', usernameErr)
        console.error('signUp - error message:', usernameErr?.message)
        console.error('signUp - error code:', usernameErr?.code)
        throw usernameErr
      }

      console.log('signUp - success, showing confirmation screen')
      setPendingEmailConfirmation(email)
    } catch (err) {
      const translatedError = translateError(err.message || 'Registrierung fehlgeschlagen')
      setError(translatedError)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (emailOrUsername, password) => {
    try {
      setLoading(true)
      setError(null)

      console.log('Login attempt with:', emailOrUsername)

      let email = emailOrUsername

      if (!emailOrUsername.includes('@')) {
        console.log('Looking up username:', emailOrUsername)
        const { data: profileData, error: profileErr } = await supabase
          .from('user_profiles')
          .select('email')
          .eq('username', emailOrUsername)
          .maybeSingle()

        console.log('Username lookup result:', profileData, profileErr)

        if (profileErr || !profileData) {
          throw new Error('Benutzer nicht gefunden')
        }

        email = profileData.email
      }

      console.log('Signing in with email:', email)
      const { data, error: err } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      console.log('Sign in result:', { user: data?.user?.id, error: err })

      if (err) throw err
      if (!data.user) throw new Error('Anmeldung fehlgeschlagen')

      console.log('Loading profile for user:', data.user.id)
      await loadUserProfile(data.user.id)
      console.log('Login successful')
    } catch (err) {
      console.error('Login error:', err)
      const translatedError = translateError(err.message || 'Anmeldung fehlgeschlagen')
      setError(translatedError)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      await supabase.auth.signOut()
      setUser(null)
    } catch (err) {
      const translatedError = translateError(err.message || 'Abmeldung fehlgeschlagen')
      setError(translatedError)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const clearPendingConfirmation = () => {
    setPendingEmailConfirmation(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, signUp, signIn, signOut, pendingEmailConfirmation, clearPendingConfirmation }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth muss innerhalb von AuthProvider verwendet werden')
  }
  return context
}
