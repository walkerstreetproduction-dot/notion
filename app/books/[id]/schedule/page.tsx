'use client';

import { useParams } from 'next/navigation';
import { Card, EmptyState, LinkButton } from '@/components/ui';
import { useAppData } from '@/lib/storage';

export default function SchedulePage() {
  const { id } = useParams<{ id: string }>();
  const { data, setData, ready } = useAppData();
  const book = data.books.find((item) => item.id === id);
  const schedule = data.schedule.filter((item) => item.bookId === id).sort((a, b) => a.dayNumber - b.dayNumber);
  if (!ready) return <Card>Loading schedule…</Card>;
  if (!book) return <EmptyState title="Schedule not found" body="Open a book first." action={<LinkButton href="/books">Back to books</LinkButton>} />;

  const toggle = (scheduleId: string) => setData((current) => {
    const nextSchedule = current.schedule.map((item) => item.id === scheduleId ? { ...item, status: item.status === 'completed' ? 'pending' as const : 'completed' as const, completedAt: item.status === 'completed' ? undefined : new Date().toISOString() } : item);
    const allDone = nextSchedule.filter((item) => item.bookId === id).every((item) => item.status === 'completed');
    return { ...current, schedule: nextSchedule, books: current.books.map((item) => item.id === id ? { ...item, status: allDone ? 'finished' : 'reading' } : item) };
  });

  return <main className="space-y-4"><div><h1 className="text-3xl font-black">Schedule</h1><p className="text-stone-600">{book.title}</p></div>{schedule.map((item) => <Card key={item.id} className={item.status === 'completed' ? 'bg-emerald-50' : ''}><div className="flex gap-3"><button aria-label="Toggle complete" onClick={() => toggle(item.id)} className={`mt-1 h-7 w-7 rounded-full border-2 ${item.status === 'completed' ? 'border-sage bg-sage text-white' : 'border-stone-300'}`}>{item.status === 'completed' ? '✓' : ''}</button><div className="flex-1"><div className="flex items-start justify-between gap-2"><h2 className="font-black">Day {item.dayNumber}</h2><span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-stone-500">{item.date}</span></div><p className="mt-1 font-semibold">{item.contentToRead}</p><p className="text-sm text-stone-500">Pages {item.startPage}-{item.endPage} · {item.pagesToRead} pages · {item.status}</p></div></div></Card>)}</main>;
}
