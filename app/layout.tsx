import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Reading Habit Tracker',
  description: 'A simple local-first reading planner with OCR, schedules, streaks, and bookmarks.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 pb-24 pt-4 sm:px-6">
          <header className="sticky top-0 z-10 -mx-4 mb-4 bg-stone-50/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <Link href="/" className="text-lg font-black tracking-tight text-ink">📚 Reading Tracker</Link>
              <Link href="/add-book" className="rounded-full bg-ink px-4 py-2 text-sm font-bold text-white shadow-soft">Add Book</Link>
            </div>
            <nav className="mt-3 grid grid-cols-3 gap-2 text-center text-sm font-semibold">
              <Link className="rounded-full bg-white px-3 py-2 shadow-sm" href="/">Today</Link>
              <Link className="rounded-full bg-white px-3 py-2 shadow-sm" href="/books">Books</Link>
              <Link className="rounded-full bg-white px-3 py-2 shadow-sm" href="/add-book">New</Link>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
