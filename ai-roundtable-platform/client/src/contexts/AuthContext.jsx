import React, { createContext, useContext, useReducer, useEffect } from 'react'

/**
 * Authentication Context for managing user login state
 * Handles user ID, name, campus, location, and anonymous display name
 */

const AuthContext = createContext()

// Action types for auth reducer
const AUTH_ACTIONS = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  UPDATE_PROFILE: 'UPDATE_PROFILE'
}

// Initial authentication state
const initialState = {
  isAuthenticated: false,
  user: null,
  anonymousName: null
}

// Authentication reducer
function authReducer(state, action) {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN:
      return {
        isAuthenticated: true,
        user: action.payload.user,
        anonymousName: action.payload.anonymousName
      }
    case AUTH_ACTIONS.LOGOUT:
      return initialState
    case AUTH_ACTIONS.UPDATE_PROFILE:
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      }
    default:
      return state
  }
}

/**
 * AuthProvider Component
 * Provides authentication context to the application
 */
export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState)

  // Load authentication state from localStorage on mount
  useEffect(() => {
    const savedAuth = localStorage.getItem('auth')
    if (savedAuth) {
      try {
        const { user, anonymousName } = JSON.parse(savedAuth)
        if (user && anonymousName) {
          dispatch({
            type: AUTH_ACTIONS.LOGIN,
            payload: { user, anonymousName }
          })
        }
      } catch (error) {
        console.error('Error loading saved auth:', error)
        localStorage.removeItem('auth')
      }
    }
  }, [])

  // Save authentication state to localStorage
  useEffect(() => {
    if (state.isAuthenticated) {
      localStorage.setItem('auth', JSON.stringify({
        user: state.user,
        anonymousName: state.anonymousName
      }))
    } else {
      localStorage.removeItem('auth')
    }
  }, [state.isAuthenticated, state.user, state.anonymousName])

  /**
   * Login function
   * @param {Object} userData - User data (id, name, campus, location)
   * @param {string} anonymousName - Anonymous display name for the session
   */
  const login = (userData, anonymousName) => {
    dispatch({
      type: AUTH_ACTIONS.LOGIN,
      payload: {
        user: userData,
        anonymousName
      }
    })
  }

  /**
   * Logout function
   * Clears all authentication data
   */
  const logout = () => {
    dispatch({ type: AUTH_ACTIONS.LOGOUT })
  }

  /**
   * Update user profile
   * @param {Object} updates - Fields to update
   */
  const updateProfile = (updates) => {
    dispatch({
      type: AUTH_ACTIONS.UPDATE_PROFILE,
      payload: updates
    })
  }

  const value = {
    ...state,
    login,
    logout,
    updateProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Custom hook to use authentication context
 * @returns {Object} Authentication context value
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
