'use client';

import { useParams, useRouter } from 'next/navigation';
import { Button, Card, EmptyState, LinkButton, ProgressBar } from '@/components/ui';
import { progressForBook } from '@/lib/reading';
import { useAppData } from '@/lib/storage';

export default function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, setData, ready } = useAppData();
  const book = data.books.find((item) => item.id === id);
  if (!ready) return <Card>Loading book…</Card>;
  if (!book) return <EmptyState title="Book not found" body="This book may have been deleted from localStorage." action={<LinkButton href="/books">Back to books</LinkButton>} />;
  const chapters = data.chapters.filter((chapter) => chapter.bookId === id).sort((a, b) => a.startPage - b.startPage);
  const progress = progressForBook(id, data.schedule);

  const deleteBook = () => {
    if (!confirm('Delete this book and all of its local data?')) return;
    setData((current) => ({ ...current, books: current.books.filter((item) => item.id !== id), chapters: current.chapters.filter((item) => item.bookId !== id), schedule: current.schedule.filter((item) => item.bookId !== id), bookmarks: current.bookmarks.filter((item) => item.bookId !== id), dailyLogs: current.dailyLogs.filter((item) => item.bookId !== id) }));
    router.push('/books');
  };

  return <main className="space-y-4"><Card><p className="text-sm font-bold uppercase text-sage">{book.status}</p><h1 className="mt-1 text-3xl font-black">{book.title}</h1><p className="mt-2 text-stone-600">{book.totalPages} pages · {book.pagesPerDay} pages per day · started {book.startDate}</p><div className="mt-4"><ProgressBar percent={progress.percent} /></div><p className="mt-2 text-sm font-semibold text-stone-500">{progress.completed} of {progress.total} tasks complete</p><div className="mt-4 grid gap-2 sm:grid-cols-2"><LinkButton href={`/books/${id}/schedule`}>View Schedule</LinkButton><LinkButton href={`/books/${id}/bookmarks`} className="bg-white text-ink ring-1 ring-stone-200">Bookmarks / To-dos</LinkButton></div></Card>
    <Card><h2 className="text-xl font-black">Content list</h2><div className="mt-3 space-y-2">{chapters.map((chapter) => <div key={chapter.id} className="rounded-2xl bg-stone-50 p-3"><p className="font-black">{chapter.title}</p><p className="text-sm text-stone-500">{chapter.section || 'No section'} · pages {chapter.startPage}-{chapter.endPage}</p></div>)}</div></Card>
    <Button className="bg-red-600" onClick={deleteBook}>Delete Book</Button>
  </main>;
}
