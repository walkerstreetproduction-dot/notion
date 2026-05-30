'use client';

import { Card, EmptyState, LinkButton, ProgressBar } from '@/components/ui';
import { progressForBook } from '@/lib/reading';
import { useAppData } from '@/lib/storage';

export default function BooksPage() {
  const { data, ready } = useAppData();
  if (!ready) return <Card>Loading books…</Card>;
  if (!data.books.length) return <EmptyState title="Your shelf is empty" body="Add a book with a photo, OCR text, or manual chapters." action={<LinkButton href="/add-book">Add Book</LinkButton>} />;

  return <main className="space-y-4"><h1 className="text-3xl font-black">Books</h1>{data.books.map((book) => {
    const progress = progressForBook(book.id, data.schedule);
    return <Card key={book.id}><div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-black">{book.title}</h2><p className="text-sm capitalize text-stone-500">{book.status} · {book.totalPages} pages · {book.pagesPerDay}/day</p></div><span className="rounded-full bg-stone-100 px-3 py-1 text-sm font-bold">{progress.percent}%</span></div><div className="mt-4"><ProgressBar percent={progress.percent} /></div><div className="mt-4 grid gap-2 sm:grid-cols-3"><LinkButton href={`/books/${book.id}`}>Open</LinkButton><LinkButton href={`/books/${book.id}/schedule`} className="bg-white text-ink ring-1 ring-stone-200">Schedule</LinkButton><LinkButton href={`/books/${book.id}/bookmarks`} className="bg-white text-ink ring-1 ring-stone-200">Bookmarks</LinkButton></div></Card>;
  })}</main>;
}
