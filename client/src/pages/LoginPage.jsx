import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Users, MessageSquare, Brain } from 'lucide-react'

/**
 * Login Page Component
 * Handles user authentication with ID, basic details, and anonymous name selection
 */
function LoginPage() {
  const navigate = useNavigate()
  const { login, isAuthenticated } = useAuth()
  
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    campus: '',
    location: '',
    anonymousName: ''
  })
  
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/lobby')
    }
  }, [isAuthenticated, navigate])

  /**
   * Handle form input changes
   */
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  /**
   * Validate form data
   */
  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.id.trim()) {
      newErrors.id = 'User ID is required'
    }
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }
    
    if (!formData.campus.trim()) {
      newErrors.campus = 'Campus is required'
    }
    
    if (!formData.location.trim()) {
      newErrors.location = 'Location is required'
    }
    
    if (!formData.anonymousName.trim()) {
      newErrors.anonymousName = 'Anonymous display name is required'
    } else if (formData.anonymousName.length < 2) {
      newErrors.anonymousName = 'Anonymous name must be at least 2 characters'
    } else if (formData.anonymousName.length > 20) {
      newErrors.anonymousName = 'Anonymous name must be less than 20 characters'
    }
    
    return newErrors
  }

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    const newErrors = validateForm()
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setIsSubmitting(false)
      return
    }
    
    try {
      // Extract user data and anonymous name
      const { anonymousName, ...userData } = formData
      
      // Login with the provided data
      login(userData, anonymousName)
      
      // Navigate to lobby
      navigate('/lobby')
    } catch (error) {
      console.error('Login error:', error)
      setErrors({ submit: 'Login failed. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  /**
   * Generate random anonymous name suggestions
   */
  const getRandomSuggestions = () => {
    const adjectives = ['Curious', 'Thoughtful', 'Wise', 'Creative', 'Insightful', 'Brilliant', 'Analytical', 'Innovative']
    const nouns = ['Thinker', 'Explorer', 'Scholar', 'Philosopher', 'Researcher', 'Learner', 'Discussant', 'Mind']
    
    return Array.from({ length: 3 }, () => {
      const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
      const noun = nouns[Math.floor(Math.random() * nouns.length)]
      return `${adj}${noun}`
    })
  }

  const suggestions = React.useMemo(() => getRandomSuggestions(), [])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary-600 rounded-full">
              <MessageSquare className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">AI Roundtable Discussion</h2>
          <p className="mt-2 text-gray-600">
            Join intelligent conversations with AI-powered topics
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 text-center text-sm">
          <div className="p-3 bg-white rounded-lg shadow-sm">
            <Users className="w-6 h-6 text-primary-600 mx-auto mb-1" />
            <span className="text-gray-700">Anonymous</span>
          </div>
          <div className="p-3 bg-white rounded-lg shadow-sm">
            <Brain className="w-6 h-6 text-primary-600 mx-auto mb-1" />
            <span className="text-gray-700">AI Topics</span>
          </div>
          <div className="p-3 bg-white rounded-lg shadow-sm">
            <MessageSquare className="w-6 h-6 text-primary-600 mx-auto mb-1" />
            <span className="text-gray-700">Real-time</span>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-lg">
          {/* User ID */}
          <div>
            <label htmlFor="id" className="block text-sm font-medium text-gray-700">
              User ID
            </label>
            <input
              id="id"
              name="id"
              type="text"
              required
              value={formData.id}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                         focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              placeholder="Enter your unique ID"
            />
            {errors.id && <p className="mt-1 text-sm text-red-600">{errors.id}</p>}
          </div>

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={formData.name}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                         focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              placeholder="Enter your full name"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>

          {/* Campus */}
          <div>
            <label htmlFor="campus" className="block text-sm font-medium text-gray-700">
              Campus
            </label>
            <input
              id="campus"
              name="campus"
              type="text"
              required
              value={formData.campus}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                         focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              placeholder="Enter your campus name"
            />
            {errors.campus && <p className="mt-1 text-sm text-red-600">{errors.campus}</p>}
          </div>

          {/* Location */}
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700">
              Location
            </label>
            <input
              id="location"
              name="location"
              type="text"
              required
              value={formData.location}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                         focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              placeholder="Enter your location"
            />
            {errors.location && <p className="mt-1 text-sm text-red-600">{errors.location}</p>}
          </div>

          {/* Anonymous Name */}
          <div>
            <label htmlFor="anonymousName" className="block text-sm font-medium text-gray-700">
              Anonymous Display Name
            </label>
            <input
              id="anonymousName"
              name="anonymousName"
              type="text"
              required
              value={formData.anonymousName}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                         focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              placeholder="Choose your anonymous name"
            />
            {errors.anonymousName && <p className="mt-1 text-sm text-red-600">{errors.anonymousName}</p>}
            
            {/* Suggestions */}
            <div className="mt-2">
              <p className="text-xs text-gray-500 mb-1">Suggestions:</p>
              <div className="flex flex-wrap gap-1">
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={suggestion + '-' + idx}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, anonymousName: suggestion }))}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="text-sm text-red-600 text-center">
              {errors.submit}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md 
                       shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 
                       focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Joining...' : 'Join Discussion'}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500">
          Your real identity remains private. Only your anonymous name is visible to others.
        </p>
      </div>
    </div>
  )
}

export default LoginPage
