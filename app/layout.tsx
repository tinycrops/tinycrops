import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cofounder — AI That Runs Your Company',
  description: 'Paste your idea. Walk away with a company. Autonomous AI agents handle market research, strategy, outreach, and growth — while you sleep.',
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
