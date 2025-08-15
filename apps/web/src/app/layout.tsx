import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'RoomSense GPT - AI-Powered Smart Home Control',
  description: 'Control your smart home devices with natural language using AI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50">
          <main className="container mx-auto max-w-7xl px-4 py-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
