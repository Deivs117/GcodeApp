import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'G-Code Flux-Processor',
  description: 'Concatenate and filter CNC G-Code files',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
