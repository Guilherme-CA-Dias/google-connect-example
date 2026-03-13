'use client'

import { useEffect, useState } from 'react'
import { getMembraneClient } from '@/lib/membrane'

interface GoogleDriveDocument {
  id: string
  name: string
  description: string
  url: string
  embedUrl: string
  iconUrl: string
  mimeType: string
  type: string
  serviceId: string
  sizeBytes: number
  lastEditedUtc: number
  isShared: boolean
  organizationDisplayName?: string
}

interface SelectedFile {
  id: string
  name: string
  url: string
  mimeType: string
  size: number
  lastEditedUtc: number
  iconUrl: string
  isShared: boolean
  type: string
  serviceId: string
  integrationKey: string
}

declare global {
  interface Window {
    google: any
    gapi: any
  }
}

export default function FilePickerPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connectionId, setConnectionId] = useState<string | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([])
  const [pickerReady, setPickerReady] = useState(false)

  // Load Google APIs
  useEffect(() => {
    const loadGoogleAPIs = () => {
      return new Promise<void>((resolve, reject) => {
        // Check if already loaded
        if (window.google && window.google.picker) {
          setPickerReady(true)
          resolve()
          return
        }

        // Load Google Picker API
        const script = document.createElement('script')
        script.src = 'https://apis.google.com/js/api.js'
        script.async = true
        script.defer = true
        
        script.onload = () => {
          if (window.gapi) {
            window.gapi.load('picker', {
              callback: () => {
                setPickerReady(true)
                resolve()
              },
              onerror: reject,
            })
          } else {
            reject(new Error('Google API not loaded'))
          }
        }
        script.onerror = reject
        document.head.appendChild(script)
      })
    }

    loadGoogleAPIs().catch((err) => {
      console.error('Error loading Google APIs:', err)
      setError('Failed to load Google APIs')
      setLoading(false)
    })
  }, [])

  // Get Google Drive connection
  useEffect(() => {
    const getConnection = async () => {
      try {
        const membrane = getMembraneClient()
        const result = await membrane.connections.find()
        const connections = result?.items || []

        // Find Google Drive connection
        const googleDriveConnection = connections.find(
          (conn) =>
            conn.integration?.key === 'google-drive' &&
            !conn.disconnected
        )

        if (!googleDriveConnection) {
          setError('No active Google Drive connection found. Please connect to Google Drive first.')
          setLoading(false)
          return
        }

        setConnectionId(googleDriveConnection.id)
        setLoading(false)
      } catch (err) {
        console.error('Error fetching connections:', err)
        setError('Failed to fetch connections')
        setLoading(false)
      }
    }

    getConnection()
  }, [])

  const fetchConnectionCredentials = async (connId: string) => {
    const response = await fetch(`/api/connections/${connId}`)
    if (!response.ok) {
      throw new Error('Failed to fetch connection credentials')
    }
    return await response.json()
  }

  const openPicker = async () => {
    if (!connectionId || !pickerReady) {
      setError('Connection or Google APIs not ready')
      return
    }

    try {
      setError(null)
      const connectionInfo = await fetchConnectionCredentials(connectionId)

      const connectorParams = connectionInfo.connectorParameters || {}
      const credentials = connectionInfo.credentials || {}

      const clientId = connectorParams.clientId
      const accessToken = credentials.accessToken

      if (!accessToken) {
        throw new Error('No access token found in connection')
      }

      // Initialize Google Picker
      const picker = new window.google.picker.PickerBuilder()
        .addView(window.google.picker.ViewId.DOCS)
        .setOAuthToken(accessToken)
        .setCallback(pickerCallback)
        .setTitle('Select files from Google Drive')
        .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
        .build()

      picker.setVisible(true)
    } catch (err: any) {
      console.error('Error opening picker:', err)
      setError(err.message || 'Failed to open file picker')
    }
  }

  const pickerCallback = (data: any) => {
    if (data.action === 'picked') {
      const files: SelectedFile[] = data.docs.map((doc: GoogleDriveDocument) => ({
        id: doc.id,
        name: doc.name,
        url: doc.url,
        mimeType: doc.mimeType,
        size: doc.sizeBytes,
        lastEditedUtc: doc.lastEditedUtc,
        iconUrl: doc.iconUrl,
        isShared: doc.isShared,
        type: doc.type,
        serviceId: doc.serviceId,
        integrationKey: 'google-drive',
      }))

      setSelectedFiles(files)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600 dark:text-gray-300">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Google Drive File Picker
          </h1>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-1">
            Select files from your Google Drive
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100 rounded-lg">
            {error}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <button
            onClick={openPicker}
            disabled={!connectionId || !pickerReady}
            className="px-6 py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {pickerReady ? 'Open Google Drive Picker' : 'Loading Google APIs...'}
          </button>
        </div>

        {selectedFiles.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Selected Files ({selectedFiles.length})
            </h2>
            <div className="space-y-4">
              {selectedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center space-x-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  {file.iconUrl && (
                    <img
                      src={file.iconUrl}
                      alt={file.type}
                      className="w-10 h-10"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
                      {file.name}
                    </h3>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      <span>Type: {file.type}</span>
                      {file.size > 0 && (
                        <span className="ml-4">
                          Size: {(file.size / 1024).toFixed(2)} KB
                        </span>
                      )}
                      {file.isShared && (
                        <span className="ml-4 text-blue-600 dark:text-blue-400">
                          Shared
                        </span>
                      )}
                    </div>
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-block"
                    >
                      Open in Google Drive
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
