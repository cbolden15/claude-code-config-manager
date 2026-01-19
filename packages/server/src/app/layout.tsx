import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/layout/sidebar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CCM - Claude Code Config Manager',
  description: 'Manage Claude Code project configurations',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-[#0f172a] flex">
          <Sidebar />
          <main className="flex-1 flex flex-col max-w-[1200px]">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
