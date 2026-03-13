import { MembraneClient } from '@membranehq/sdk'

let membraneClient: MembraneClient | null = null

export function getMembraneClient(): MembraneClient {
  if (!membraneClient) {
    membraneClient = new MembraneClient({
      fetchToken: async () => {
        const response = await fetch('/api/membrane-token')
        if (!response.ok) {
          throw new Error('Failed to fetch Membrane token')
        }
        const { token } = await response.json()
        return token
      },
    })
  }
  return membraneClient
}
