import { createContext, useState, useContext, useEffect, useCallback } from 'react'

const AuthContext = createContext()

const getSupabase = async () => {
  const module = await import('@/api/supabaseClient')
  return module.supabase
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoadingAuth, setIsLoadingAuth] = useState(true)
  const [authError, setAuthError] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)

  const verifyAdminRole = useCallback(async (userId) => {
    if (!userId) return false
    const supabase = await getSupabase()
    const { data, error } = await supabase
      .from('admin_users')
      .select('is_admin')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      throw error
    }

    return !!data?.is_admin
  }, [])

  const loadUser = useCallback(async () => {
    setIsLoadingAuth(true)
    setAuthError(null)
    try {
      const supabase = await getSupabase()
      const { data, error } = await supabase.auth.getSession()
      if (error) {
        throw error
      }

      const session = data?.session
      const currentUser = session?.user ?? null

      if (currentUser) {
        const adminVerified = await verifyAdminRole(currentUser.id)
        if (!adminVerified) {
          setUser(null)
          setIsAuthenticated(false)
          setIsAdmin(false)
          setAuthError({ type: 'user_not_registered', message: 'This account is not registered as an admin.' })
          return
        }
      }

      setUser(currentUser)
      setIsAuthenticated(!!currentUser)
      setIsAdmin(!!currentUser)
    } catch (error) {
      setUser(null)
      setIsAuthenticated(false)
      setIsAdmin(false)
      setAuthError({ type: 'auth_required', message: 'Unable to verify admin login. Please sign in again.' })
    } finally {
      setIsLoadingAuth(false)
      setAuthChecked(true)
    }
  }, [verifyAdminRole])

  useEffect(() => {
    if (typeof window === 'undefined' || window.location.pathname.startsWith('/admin')) {
      loadUser()
      return
    }

    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(() => loadUser(), { timeout: 2500 })
      return () => window.cancelIdleCallback?.(id)
    }

    const timer = window.setTimeout(() => loadUser(), 1200)
    return () => window.clearTimeout(timer)
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
      const supabase = await getSupabase()
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

      const adminVerified = await verifyAdminRole(authUser.id)
      if (!adminVerified) {
        await supabase.auth.signOut({ shouldClearSession: true })
        setUser(null)
        setIsAuthenticated(false)
        setIsAdmin(false)
        return { error: 'This account is not registered as an admin.' }
      }

      setUser(authUser)
      setIsAuthenticated(true)
      setIsAdmin(true)
      return { data: true }
    } catch (error) {
      return { error: error?.message || 'An unexpected error occurred during login.' }
    } finally {
      setIsLoadingAuth(false)
      setAuthChecked(true)
    }
  }

  const logout = async () => {
    setIsLoadingAuth(true)
    setAuthError(null)

    try {
      const supabase = await getSupabase()
      const { error } = await supabase.auth.signOut({ shouldClearSession: true })
      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
      setIsAuthenticated(false)
      setIsAdmin(false)
      setIsLoadingAuth(false)
      setAuthChecked(true)
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }
  }

  const navigateToLogin = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isAdmin,
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
