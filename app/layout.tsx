import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Membrane Google Integration',
  description: 'Connect your Google account using Membrane',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
