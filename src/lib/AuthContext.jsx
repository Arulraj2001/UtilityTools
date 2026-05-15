import { createContext, useState, useContext, useEffect, useCallback } from 'react'
import { supabase } from '@/api/supabaseClient'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoadingAuth, setIsLoadingAuth] = useState(true)
  const [authError, setAuthError] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)

  const loadUser = useCallback(async () => {
    setIsLoadingAuth(true)
    setAuthError(null)
    try {
      const { data, error } = await supabase.auth.getSession()
      if (error) {
        throw error
      }

      const session = data?.session
      const currentUser = session?.user ?? null

      setUser(currentUser)
      setIsAuthenticated(!!currentUser)
    } catch (error) {
      setUser(null)
      setIsAuthenticated(false)
      setAuthError({ type: 'auth_required', message: 'Unable to verify admin login. Please sign in again.' })
    } finally {
      setIsLoadingAuth(false)
      setAuthChecked(true)
    }
  }, [])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  const checkUserAuth = async () => {
    await loadUser()
  }

  const checkAppState = async () => {
    await loadUser()
  }

  const login = async (email, password) => {
    setIsLoadingAuth(true)
    setAuthError(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        return { error: error.message || 'Invalid login credentials. Please try again.' }
      }

      const authUser = data?.user ?? data?.session?.user
      if (!authUser) {
        return { error: 'Login failed. No authenticated user returned.' }
      }

      setUser(authUser)
      setIsAuthenticated(true)
      return { data: true }
    } catch (error) {
      return { error: error?.message || 'An unexpected error occurred during login.' }
    } finally {
      setIsLoadingAuth(false)
      setAuthChecked(true)
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setIsAuthenticated(false)
    setAuthError(null)
  }

  const navigateToLogin = () => {
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      authError,
      authChecked,
      logout,
      navigateToLogin,
      login,
      checkUserAuth,
      checkAppState,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
