'use client'

import { useEffect, useState } from 'react'
import { getMembraneClient } from '@/lib/membrane'
import ConnectionDialog from '@/components/ConnectionDialog'

interface Integration {
  id: string
  key?: string
  name: string
  logoUri?: string
  description?: string
  connection?: Connection | null
}

interface Connection {
  id: string
  name: string
  integrationKey?: string
  integrationId?: string
  integrationName?: string
  disconnected?: boolean
  integration?: {
    key?: string
    name?: string
  }
}

export default function Home() {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [configuringKey, setConfiguringKey] = useState<string | null>(null)
  const [connectionDialogOpen, setConnectionDialogOpen] = useState(false)
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null)

  const loadIntegrations = async () => {
    try {
      const membrane = getMembraneClient()
      const result = await membrane.integrations.find()
      console.log('Integrations result:', result)
      // PaginationResponse has an 'items' property
      const integrationsList = (result?.items || []).map((item) => ({
        id: item.id,
        key: item.key,
        name: item.name,
        logoUri: item.logoUri,
        description: item.description,
      }))
      console.log('Processed integrations list:', integrationsList)
      return integrationsList
    } catch (err) {
      console.error('Error loading integrations:', err)
      setError('Failed to load integrations')
      return []
    }
  }

  const loadConnections = async () => {
    try {
      const membrane = getMembraneClient()
      const result = await membrane.connections.find()
      // PaginationResponse has an 'items' property
      const connectionsList = (result?.items || []).map((item) => ({
        id: item.id,
        name: item.name,
        integrationKey: item.integration?.key || item.integrationId,
        integrationId: item.integrationId,
        integrationName: item.integration?.name,
        disconnected: item.disconnected || false,
        integration: item.integration,
      }))
      setConnections(connectionsList)
      return connectionsList
    } catch (err) {
      console.error('Error loading connections:', err)
      setError('Failed to load connections')
      setConnections([])
      return []
    }
  }

  const combineIntegrationsWithConnections = (
    integrationsList: Integration[],
    connectionsList: Connection[]
  ) => {
    return integrationsList.map((integration) => {
      const connection = connectionsList.find(
        (conn) =>
          conn.integrationKey === integration.key ||
          conn.integrationId === integration.id
      )
      return {
        ...integration,
        connection: connection || null,
      }
    })
  }

  useEffect(() => {
    const initialize = async () => {
      setLoading(true)
      try {
        const [integrationsList, connectionsList] = await Promise.all([
          loadIntegrations(),
          loadConnections(),
        ])
        const combined = combineIntegrationsWithConnections(
          integrationsList,
          connectionsList
        )
        setIntegrations(combined)
        setConnections(connectionsList)
      } catch (err) {
        console.error('Initialization error:', err)
      } finally {
        setLoading(false)
      }
    }
    initialize()
  }, [])

  // Update integrations when connections change
  useEffect(() => {
    setIntegrations((prevIntegrations) => {
      if (prevIntegrations.length === 0) return prevIntegrations
      const baseIntegrations = prevIntegrations.map(({ connection, ...rest }) => rest)
      return combineIntegrationsWithConnections(baseIntegrations, connections)
    })
  }, [connections])

  const handleConnect = (integration: Integration) => {
    setSelectedIntegration(integration)
    setConnectionDialogOpen(true)
    setError(null)
  }

  const handleConnectionSuccess = () => {
    // Reload connections after successful connection
    loadConnections()
  }

  const handleDisconnect = async (integration: Integration) => {
    if (!integration.connection) return
    
    try {
      setError(null)
      const membrane = getMembraneClient()
      await membrane.connection(integration.connection.id).archive()
      // Reload connections after disconnection
      loadConnections()
    } catch (err) {
      console.error('Error disconnecting:', err)
      setError('Failed to disconnect. Please try again.')
    }
  }

  const handleConfigure = async (integration: Integration) => {
    if (!integration.connection) return
    
    try {
      setError(null)
      setConfiguringKey(integration.key || integration.id)
      const membrane = getMembraneClient()
      await membrane.connection(integration.connection.id).openReconnectUI()
      // Reload connections after configuration
      setTimeout(() => {
        loadConnections()
        setConfiguringKey(null)
      }, 2000)
    } catch (err) {
      console.error('Error configuring:', err)
      setError('Failed to configure. Please try again.')
      setConfiguringKey(null)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="text-center text-gray-600 dark:text-gray-300">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Membrane Google Integration
          </h1>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100 rounded-lg">
            {error}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Available Integrations
            </h2>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-1">
              Fully customizable
            </p>
          </div>
          {!Array.isArray(integrations) || integrations.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-300">
              No integrations available. Make sure your Membrane workspace is configured correctly.
            </p>
          ) : (
            <ul className="space-y-4 mt-8">
              {integrations
                .filter((integration) => integration.key !== 'token-extract')
                .map((integration) => (
                  <li
                    key={integration.key || integration.id}
                    className="group flex items-center space-x-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow"
                  >
                    <div className="flex-shrink-0">
                      {integration.logoUri ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={integration.logoUri}
                          alt={`${integration.name} logo`}
                          className="w-10 h-10 rounded-lg"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-lg font-medium text-gray-600 dark:text-gray-300">
                          {integration.name[0]}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
                        {integration.name}
                      </h3>
                    </div>
                    <div className="flex gap-2">
                      {integration.connection && (
                        <button
                          onClick={() => handleConfigure(integration)}
                          disabled={configuringKey === (integration.key || integration.id)}
                          className="px-4 py-2 rounded-md font-medium transition-colors bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100 hover:bg-green-200 hover:text-green-800 dark:hover:bg-green-800 dark:hover:text-green-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {configuringKey === (integration.key || integration.id)
                            ? 'Configuring...'
                            : 'Configure'}
                        </button>
                      )}
                      <button
                        onClick={() =>
                          integration.connection
                            ? handleDisconnect(integration)
                            : handleConnect(integration)
                        }
                        className={`px-4 py-2 rounded-md font-medium transition-colors ${
                          integration.connection
                            ? 'bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-100 hover:bg-red-200 hover:text-red-800 dark:hover:bg-red-800 dark:hover:text-red-100'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-700 dark:hover:text-blue-100'
                        }`}
                      >
                        {integration.connection ? 'Disconnect' : 'Connect'}
                      </button>
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </div>

      {/* Connection Dialog */}
      {connectionDialogOpen && selectedIntegration && (
        <ConnectionDialog
          integrationKey={selectedIntegration.key || selectedIntegration.id}
          integrationName={selectedIntegration.name}
          integrationLogo={selectedIntegration.logoUri}
          integrationDescription={selectedIntegration.description}
          isOpen={connectionDialogOpen}
          onClose={() => {
            setConnectionDialogOpen(false)
            setSelectedIntegration(null)
          }}
          onSuccess={handleConnectionSuccess}
        />
      )}
    </div>
  )
}
