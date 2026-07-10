import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });

export const metadata: Metadata = {
  title: 'SuperBull — the BullMQ dashboard',
  description:
    'Monitor, debug and operate BullMQ queues. Standalone board, headless proxy, or a federated hub with analytics, error tracking, email alerts and public status pages.',
};

export default function RootLayout(props: { children: ReactNode }) {
  const { children } = props;
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="bg-bg-default font-sans text-content-default antialiased">{children}</body>
    </html>
  );
}
