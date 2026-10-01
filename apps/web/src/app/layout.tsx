import '../styles/globals.css';
import { DemoNetworkProvider } from '../context/DemoNetworkContext';
import { Navigation } from '../components/Navigation';
import { PublicSafetyNotice } from '../components/PublicSafetyNotice';

export const metadata = {
  metadataBase: new URL('https://veriqomesh.xyz'),
  title: 'VeriqoMesh Network | Programmable Trust Layer for Human & AI Commerce',
  description:
    'VeriqoMesh Network connects humans, businesses, and AI agents through verifiable agreements, protected execution, evidence-based verification, and accountable dispute resolution.',
  icons: {
    icon: [
      { url: '/brand/veriqomesh-mark.png', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [
      { url: '/brand/veriqomesh-mark.png', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'VeriqoMesh Network | Programmable Trust Layer',
    description:
      'The programmable trust layer for human and AI-assisted commerce on Monad. Define the deal. Protect the transaction. Verify the outcome.',
    url: 'https://veriqomesh.xyz',
    siteName: 'VeriqoMesh Network',
    images: [
      {
        url: '/brand/veriqomesh-og.png',
        width: 1200,
        height: 630,
        alt: 'VeriqoMesh Network',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VeriqoMesh Network | Programmable Trust Layer',
    description:
      'The programmable trust layer for human and AI-assisted commerce on Monad. Define the deal. Protect the transaction. Verify the outcome.',
    images: ['/brand/veriqomesh-og.png'],
    creator: '@veriqomesh_ai',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#090a10] text-[#ededed] antialiased flex flex-col justify-between">
        <DemoNetworkProvider>
          <Navigation />
          <main className="flex-1">{children}</main>
          <PublicSafetyNotice />
        </DemoNetworkProvider>
      </body>
    </html>
  );
}
