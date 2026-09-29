import '../styles/globals.css';
import { DemoNetworkProvider } from '../context/DemoNetworkContext';
import { Navigation } from '../components/Navigation';
import { PublicSafetyNotice } from '../components/PublicSafetyNotice';

export const metadata = {
  title: 'VeriqoMesh Network | Programmable Trust Layer for Human & AI Commerce',
  description:
    'VeriqoMesh Network connects humans, businesses, and AI agents through verifiable agreements, protected execution, evidence-based verification, and accountable dispute resolution.',
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
