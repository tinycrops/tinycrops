import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cofounder — AI That Runs Your Company',
  description: 'Paste your idea. Walk away with a company.',
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
