'use client'

import { useState, useEffect } from 'react'
import { getMembraneClient } from '@/lib/membrane'

interface ConnectionDialogProps {
  integrationKey: string
  integrationName: string
  integrationLogo?: string
  integrationDescription?: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface AuthOption {
  key: string
  type: string
  title?: string
  description?: string
  inputSchema?: any
  ui?: {
    schema?: any
    helpUri?: string
  }
}

interface FormField {
  key: string
  label: string
  type: string
  required: boolean
  description?: string
}

export default function ConnectionDialog({
  integrationKey,
  integrationName,
  integrationLogo,
  integrationDescription,
  isOpen,
  onClose,
  onSuccess,
}: ConnectionDialogProps) {
  const [loading, setLoading] = useState(false)
  const [integrationLoading, setIntegrationLoading] = useState(true)
  const [integration, setIntegration] = useState<any>(null)
  const [authOptions, setAuthOptions] = useState<AuthOption[]>([])
  const [selectedAuthOption, setSelectedAuthOption] = useState<AuthOption | null>(null)
  const [formFields, setFormFields] = useState<FormField[]>([])
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && integrationKey) {
      loadIntegration()
    }
  }, [isOpen, integrationKey])

  const loadIntegration = async () => {
    try {
      setIntegrationLoading(true)
      setError(null)
      const membrane = getMembraneClient()
      const integrationAccessor = membrane.integration(integrationKey)
      const integrationData = await integrationAccessor.get()
      
      setIntegration(integrationData)
      
      // Extract auth options from integration
      const options = integrationData.authOptions || []
      setAuthOptions(options)
      
      // Select first auth option by default
      if (options.length > 0) {
        setSelectedAuthOption(options[0])
        parseInputSchema(options[0])
      }
    } catch (err: any) {
      console.error('Error loading integration:', err)
      setError(err.message || 'Failed to load integration details')
    } finally {
      setIntegrationLoading(false)
    }
  }

  const parseInputSchema = (authOption: AuthOption) => {
    if (!authOption.inputSchema) {
      setFormFields([])
      setFormData({})
      return
    }

    const schema = authOption.inputSchema
    const fields: FormField[] = []

    // Handle different schema formats
    if (schema.properties) {
      Object.keys(schema.properties).forEach((key) => {
        const prop = schema.properties[key]
        const fieldType = prop.type || 'string'
        const isRequired = schema.required?.includes(key) || false
        
        fields.push({
          key,
          label: prop.title || prop.label || key,
          type: fieldType,
          required: isRequired,
          description: prop.description,
        })
      })
    } else if (Array.isArray(schema)) {
      // Handle array-based schema
      schema.forEach((item: any, index: number) => {
        fields.push({
          key: item.key || `field_${index}`,
          label: item.label || item.title || `Field ${index + 1}`,
          type: item.type || 'string',
          required: item.required || false,
          description: item.description,
        })
      })
    }

    setFormFields(fields)
    // Initialize form data with appropriate defaults
    const initialData: Record<string, any> = {}
    fields.forEach((field) => {
      if (field.type === 'boolean') {
        initialData[field.key] = false
      } else if (field.type === 'number') {
        initialData[field.key] = 0
      } else {
        initialData[field.key] = ''
      }
    })
    setFormData(initialData)
  }

  const handleAuthOptionChange = (option: AuthOption) => {
    setSelectedAuthOption(option)
    parseInputSchema(option)
    setError(null)
  }

  const handleFieldChange = (key: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const validateForm = (): boolean => {
    if (!selectedAuthOption) return false

    // Check required fields
    for (const field of formFields) {
      if (field.required) {
        const value = formData[field.key]
        if (value === undefined || value === null || value === '') {
          setError(`${field.label} is required`)
          return false
        }
      }
    }

    return true
  }

  const handleConnect = async () => {
    if (!selectedAuthOption) return

    // Validate form
    if (!validateForm()) {
      return
    }

    try {
      setLoading(true)
      setError(null)
      const membrane = getMembraneClient()
      const integrationAccessor = membrane.integration(integrationKey)

      // Prepare input data - only include non-empty values
      const inputData: Record<string, any> = {}
      Object.keys(formData).forEach((key) => {
        const value = formData[key]
        if (value !== '' && value !== null && value !== undefined) {
          inputData[key] = value
        }
      })

      const result = await integrationAccessor.connect({
        authOptionKey: selectedAuthOption.key,
        input: Object.keys(inputData).length > 0 ? inputData : undefined,
      })

      if (result) {
        onSuccess()
        onClose()
      } else {
        // For OAuth flows, the SDK might handle redirects automatically
        // If result is null, it might mean the flow was initiated
        // We'll wait a bit and then check for success
        setTimeout(() => {
          onSuccess()
          onClose()
        }, 1000)
      }
    } catch (err: any) {
      console.error('Error connecting:', err)
      setError(err.message || 'Failed to connect. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Dialog */}
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
          {/* Header */}
          <div className="flex items-center space-x-4 mb-6">
            {integrationLogo && (
              <img
                src={integrationLogo}
                alt={`${integrationName} logo`}
                className="w-12 h-12 rounded-lg"
              />
            )}
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Connect to {integrationName}
              </h2>
              {integrationDescription && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {integrationDescription}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          {integrationLoading ? (
            <div className="text-center py-8">
              <div className="text-gray-600 dark:text-gray-300">Loading...</div>
            </div>
          ) : error && !loading ? (
            <div className="mb-4 p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100 rounded-lg">
              {error}
            </div>
          ) : (
            <>
              {/* Auth Options Selection */}
              {authOptions.length > 1 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Authentication Method
                  </label>
                  <select
                    value={selectedAuthOption?.key || ''}
                    onChange={(e) => {
                      const option = authOptions.find((opt) => opt.key === e.target.value)
                      if (option) handleAuthOptionChange(option)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {authOptions.map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.title || option.key}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Auth Option Description */}
              {selectedAuthOption?.description && (
                <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    {selectedAuthOption.description}
                  </p>
                </div>
              )}

              {/* Dynamic Form Fields */}
              {formFields.length > 0 && (
                <div className="mb-6 space-y-4">
                  {formFields.map((field) => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {field.label}
                        {field.required && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </label>
                      {field.type === 'boolean' ? (
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id={field.key}
                            checked={formData[field.key] || false}
                            onChange={(e) => handleFieldChange(field.key, e.target.checked)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <label htmlFor={field.key} className="ml-2 text-sm text-gray-600 dark:text-gray-300">
                            {field.description || 'Enable'}
                          </label>
                        </div>
                      ) : field.type === 'number' ? (
                        <input
                          type="number"
                          value={formData[field.key] ?? ''}
                          onChange={(e) =>
                            handleFieldChange(
                              field.key,
                              e.target.value === '' ? '' : parseFloat(e.target.value) || 0
                            )
                          }
                          required={field.required}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : field.type === 'textarea' || (field.type === 'string' && field.description?.length && field.description.length > 50) ? (
                        <textarea
                          value={formData[field.key] || ''}
                          onChange={(e) => handleFieldChange(field.key, e.target.value)}
                          required={field.required}
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        <input
                          type={field.type === 'password' ? 'password' : 'text'}
                          value={formData[field.key] || ''}
                          onChange={(e) => handleFieldChange(field.key, e.target.value)}
                          required={field.required}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      )}
                      {field.description && (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {field.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100 rounded-lg">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConnect}
                  disabled={loading || !selectedAuthOption}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Connecting...' : 'Connect'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
