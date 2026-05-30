'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Button, Card, EmptyState, LinkButton } from '@/components/ui';
import { uid } from '@/lib/reading';
import { useAppData } from '@/lib/storage';

export default function BookmarksPage() {
  const { id } = useParams<{ id: string }>();
  const { data, setData, ready } = useAppData();
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const book = data.books.find((item) => item.id === id);
  const bookmarks = data.bookmarks.filter((item) => item.bookId === id);
  const pending = bookmarks.filter((item) => item.status === 'pending');
  const completed = bookmarks.filter((item) => item.status === 'completed');
  if (!ready) return <Card>Loading bookmarks…</Card>;
  if (!book) return <EmptyState title="Book not found" body="Choose a book before adding bookmarks." action={<LinkButton href="/books">Back to books</LinkButton>} />;

  const add = () => {
    if (!title.trim()) return;
    setData((current) => ({ ...current, bookmarks: [...current.bookmarks, { id: uid(), bookId: id, title: title.trim(), note, pageNumber, status: 'pending', createdAt: new Date().toISOString() }] }));
    setTitle(''); setNote(''); setPageNumber(1);
  };
  const toggle = (bookmarkId: string) => setData((current) => ({ ...current, bookmarks: current.bookmarks.map((item) => item.id === bookmarkId ? { ...item, status: item.status === 'completed' ? 'pending' : 'completed' } : item) }));
  const remove = (bookmarkId: string) => setData((current) => ({ ...current, bookmarks: current.bookmarks.filter((item) => item.id !== bookmarkId) }));

  const list = (items: typeof bookmarks) => <div className="space-y-2">{items.map((item) => <div key={item.id} className="rounded-2xl bg-stone-50 p-3"><div className="flex items-start gap-3"><button onClick={() => toggle(item.id)} className={`h-7 w-7 rounded-full border-2 ${item.status === 'completed' ? 'border-sage bg-sage text-white' : 'border-stone-300'}`}>{item.status === 'completed' ? '✓' : ''}</button><div className="flex-1"><p className="font-black">{item.title}</p><p className="text-sm text-stone-500">Page {item.pageNumber}{item.note ? ` · ${item.note}` : ''}</p></div><button className="text-sm font-bold text-red-500" onClick={() => remove(item.id)}>Delete</button></div></div>)}</div>;

  return <main className="space-y-4"><div><h1 className="text-3xl font-black">Bookmarks / To-dos</h1><p className="text-stone-600">{book.title}</p></div>
    <Card className="space-y-3"><h2 className="text-xl font-black">Add item</h2><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Re-read page 23" /><textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional note, idea, or action" /><div><label>Page number</label><input type="number" min={1} value={pageNumber} onChange={(event) => setPageNumber(Number(event.target.value) || 1)} /></div><Button onClick={add}>Add Bookmark / To-do</Button></Card>
    <Card><h2 className="text-xl font-black">Pending</h2><div className="mt-3">{pending.length ? list(pending) : <p className="text-stone-500">No pending items.</p>}</div></Card>
    <Card><h2 className="text-xl font-black">Completed</h2><div className="mt-3">{completed.length ? list(completed) : <p className="text-stone-500">Completed items will appear here.</p>}</div></Card>
  </main>;
}
