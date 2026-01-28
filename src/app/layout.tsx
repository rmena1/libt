import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { ToastProvider } from '@/components/providers/toast-provider'
import { MobileToolbarProvider } from '@/components/providers/mobile-toolbar-provider'
import { MobileToolbar } from '@/components/daily/mobile-toolbar'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'libt',
  description: 'Minimalist personal knowledge management',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'libt',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#ffffff',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <ToastProvider>
          <MobileToolbarProvider>
            {children}
            <MobileToolbar />
          </MobileToolbarProvider>
        </ToastProvider>
      </body>
    </html>
  )
}
