import Script from 'next/script';
import type { Metadata } from 'next';
import './globals.css';
import { Layout } from '@/app/3D-scan/3D-scan-components/layout';

export const metadata: Metadata = {
  title: 'Scanning effect with depth map | Codrops',
  description: 'Scanning effect with depth map',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="text-white">
        <Layout />
        {children}
      </body>
    </html>
  );
}
