// Utility functions for Membrane API calls

const MEMBRANE_API_BASE = 'https://api.getmembrane.com'

export async function getMembraneToken(baseUrl?: string): Promise<string> {
  // Use absolute URL for server-side, relative for client-side
  const url = baseUrl 
    ? `${baseUrl}/api/membrane-token`
    : typeof window !== 'undefined'
    ? '/api/membrane-token'
    : 'http://localhost:3000/api/membrane-token' // Fallback for server-side
  
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch Membrane token')
  }
  const { token } = await response.json()
  return token
}

export async function fetchIntegrations() {
  const token = await getMembraneToken()
  const response = await fetch(`${MEMBRANE_API_BASE}/integrations`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch integrations')
  }

  return await response.json()
}

export async function fetchIntegration(integrationKey: string) {
  const token = await getMembraneToken()
  const response = await fetch(`${MEMBRANE_API_BASE}/integrations/${integrationKey}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch integration')
  }

  return await response.json()
}

export async function fetchConnections() {
  const token = await getMembraneToken()
  const response = await fetch(`${MEMBRANE_API_BASE}/connections`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch connections')
  }

  return await response.json()
}
