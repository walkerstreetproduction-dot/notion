'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button, Card, EmptyState, LinkButton, ProgressBar } from '@/components/ui';
import { calculateStreak, emptyData, getCurrentTask, progressForBook, todayIso, uid } from '@/lib/reading';
import { clearData, useAppData } from '@/lib/storage';

export default function Dashboard() {
  const { data, setData, ready } = useAppData();
  const [success, setSuccess] = useState('');
  const task = getCurrentTask(data.schedule);
  const book = task ? data.books.find((item) => item.id === task.bookId) : data.books[0];
  const progress = book ? progressForBook(book.id, data.schedule) : { percent: 0, completed: 0, total: 0, remaining: 0 };
  const streak = calculateStreak(data.dailyLogs);

  const completeToday = async () => {
    if (!task || !book) return;
    setData((current) => {
      const now = new Date().toISOString();
      const schedule = current.schedule.map((item) => item.id === task.id ? { ...item, status: 'completed' as const, completedAt: now } : item);
      const allDone = schedule.filter((item) => item.bookId === book.id).every((item) => item.status === 'completed');
      return {
        ...current,
        books: current.books.map((item) => item.id === book.id ? { ...item, status: allDone ? 'finished' : 'reading' } : item),
        schedule,
        dailyLogs: [...current.dailyLogs, { id: uid(), bookId: book.id, scheduleItemId: task.id, date: todayIso(), completed: true, note: '' }],
      };
    });
    if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission();
    setSuccess('Nice work! Today is complete and your next reading task is ready.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!ready) return <Card>Loading your tracker…</Card>;
  if (!book || !task) {
    return <EmptyState title="No reading task yet" body="Add a book or clear the sample data and start fresh." action={<LinkButton href="/add-book">Add your first book</LinkButton>} />;
  }

  return (
    <main className="space-y-4">
      {success && <Card className="border border-emerald-100 bg-emerald-50 font-bold text-emerald-800">{success}</Card>}
      <Card className="border border-amber-100 bg-amber-50">
        <div className="flex items-start gap-3"><span className="text-2xl">⏰</span><div className="flex-1"><p className="font-black">Reminder time</p><p className="text-sm text-stone-600">Open the app each day to see this task. Browser notifications are requested when you complete a task.</p><input className="mt-3 bg-white" type="time" value={data.settings.reminderTime} onChange={(event) => setData((current) => ({ ...current, settings: { ...current.settings, reminderTime: event.target.value } }))} /></div></div>
      </Card>

      <Card>
        <p className="text-sm font-bold uppercase tracking-wide text-sage">Today&apos;s reading</p>
        <h1 className="mt-2 text-3xl font-black">{book.title}</h1>
        <p className="mt-3 text-lg font-semibold">{task.contentToRead}</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-stone-50 p-3"><p className="text-xs text-stone-500">Pages</p><p className="font-black">{task.startPage}-{task.endPage}</p></div>
          <div className="rounded-2xl bg-stone-50 p-3"><p className="text-xs text-stone-500">Read</p><p className="font-black">{task.pagesToRead}</p></div>
          <div className="rounded-2xl bg-stone-50 p-3"><p className="text-xs text-stone-500">Day</p><p className="font-black">{task.dayNumber}</p></div>
        </div>
        <Button className="mt-5" onClick={completeToday}>Mark Today Complete</Button>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <LinkButton href={`/books/${book.id}/bookmarks`} className="bg-white text-ink ring-1 ring-stone-200">Add Bookmark / To-do</LinkButton>
          <LinkButton href={`/books/${book.id}/schedule`} className="bg-white text-ink ring-1 ring-stone-200">View Full Schedule</LinkButton>
        </div>
      </Card>

      <Card>
        <div className="mb-2 flex items-center justify-between"><h2 className="text-xl font-black">Progress</h2><span className="font-black text-sage">{progress.percent}%</span></div>
        <ProgressBar percent={progress.percent} />
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
          <div><p className="font-black text-2xl">{streak}</p><p className="text-stone-500">day streak</p></div>
          <div><p className="font-black text-2xl">{progress.remaining}</p><p className="text-stone-500">days left</p></div>
          <div><p className="font-black text-2xl">{progress.completed}/{progress.total}</p><p className="text-stone-500">done</p></div>
        </div>
      </Card>

      {data.settings.sampleLoaded && <button className="w-full rounded-2xl border border-red-200 bg-white px-4 py-3 font-bold text-red-600" onClick={() => { clearData(); setData(emptyData()); }}>Clear sample data</button>}
      <Link href="/books" className="block text-center text-sm font-bold text-stone-500">Manage all books</Link>
    </main>
  );
}
