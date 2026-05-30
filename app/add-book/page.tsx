'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Button, Card } from '@/components/ui';
import { generateSchedule, parseChapters, todayIso, uid } from '@/lib/reading';
import { useAppData } from '@/lib/storage';
import { Chapter } from '@/lib/types';

type DraftChapter = Omit<Chapter, 'id' | 'bookId'> & { key: string };

export default function AddBookPage() {
  const router = useRouter();
  const { setData } = useAppData();
  const [title, setTitle] = useState('');
  const [totalPages, setTotalPages] = useState(100);
  const [pagesPerDay, setPagesPerDay] = useState(5);
  const [startDate, setStartDate] = useState(todayIso());
  const [ocrText, setOcrText] = useState('');
  const [chapters, setChapters] = useState<DraftChapter[]>([]);
  const [ocrStatus, setOcrStatus] = useState('');
  const canSave = title.trim() && chapters.length > 0;

  const schedulePreview = useMemo(() => {
    const fakeBook = { id: 'preview', title, totalPages, pagesPerDay, startDate, status: 'reading' as const, createdAt: new Date().toISOString() };
    return generateSchedule(fakeBook, chapters.map((chapter) => ({ ...chapter, id: chapter.key, bookId: 'preview' })));
  }, [chapters, pagesPerDay, startDate, title, totalPages]);

  const runOcr = async (file: File) => {
    setOcrStatus('Reading image… this can take a minute on phones.');
    const Tesseract = await import('tesseract.js');
    const result = await Tesseract.recognize(file, 'eng');
    setOcrText(result.data.text);
    setOcrStatus('OCR complete. Review and edit the text below.');
  };

  const detectChapters = () => {
    const detected = parseChapters(ocrText, totalPages).map((chapter) => ({ ...chapter, key: uid() }));
    setChapters(detected.length ? detected : [{ key: uid(), title: 'Reading', section: '', startPage: 1, endPage: totalPages, totalPages }]);
  };

  const updateChapter = (key: string, patch: Partial<DraftChapter>) => setChapters((current) => current.map((chapter) => {
    if (chapter.key !== key) return chapter;
    const next = { ...chapter, ...patch };
    return { ...next, totalPages: Math.max(1, next.endPage - next.startPage + 1) };
  }));

  const saveBook = () => {
    const bookId = uid();
    const book = { id: bookId, title: title.trim(), totalPages, pagesPerDay, startDate, status: 'reading' as const, createdAt: new Date().toISOString() };
    const finalChapters: Chapter[] = chapters.map((chapter) => ({ ...chapter, id: uid(), bookId, totalPages: Math.max(1, chapter.endPage - chapter.startPage + 1) }));
    const schedule = generateSchedule(book, finalChapters);
    setData((current) => ({ ...current, books: [...current.books, book], chapters: [...current.chapters, ...finalChapters], schedule: [...current.schedule, ...schedule], settings: { ...current.settings, sampleLoaded: false } }));
    router.push(`/books/${bookId}`);
  };

  return <main className="space-y-4"><h1 className="text-3xl font-black">Add Book</h1>
    <Card className="space-y-4">
      <div><label>Book title</label><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Deep Work" /></div>
      <div className="grid gap-3 sm:grid-cols-3"><div><label>Total pages</label><input type="number" value={totalPages} min={1} onChange={(event) => setTotalPages(Number(event.target.value))} /></div><div><label>Pages/day</label><input type="number" value={pagesPerDay} min={1} onChange={(event) => setPagesPerDay(Number(event.target.value) || 5)} /></div><div><label>Start date</label><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></div></div>
    </Card>

    <Card className="space-y-4">
      <h2 className="text-xl font-black">Upload table of contents</h2>
      <input type="file" accept="image/*" capture="environment" onChange={(event) => event.target.files?.[0] && runOcr(event.target.files[0])} />
      {ocrStatus && <p className="rounded-2xl bg-stone-50 p-3 text-sm font-semibold text-stone-600">{ocrStatus}</p>}
      <div><label>Extracted text (editable)</label><textarea rows={8} value={ocrText} onChange={(event) => setOcrText(event.target.value)} placeholder={'Part 1\nChapter 1 Getting Started 1\nChapter 2 Building a Habit 12'} /></div>
      <Button type="button" onClick={detectChapters}>Extract / Refresh Chapter Rows</Button>
    </Card>

    <Card className="space-y-4">
      <div className="flex items-center justify-between"><h2 className="text-xl font-black">Chapter rows</h2><button className="rounded-full bg-stone-100 px-3 py-2 text-sm font-bold" onClick={() => setChapters((rows) => [...rows, { key: uid(), title: 'New chapter', section: '', startPage: 1, endPage: 1, totalPages: 1 }])}>+ Add row</button></div>
      {!chapters.length && <p className="rounded-2xl bg-stone-50 p-4 text-stone-600">Run extraction or add chapter rows manually.</p>}
      <div className="space-y-3">{chapters.map((chapter) => <div key={chapter.key} className="rounded-2xl border border-stone-200 p-3">
        <div className="grid gap-2"><input value={chapter.title} onChange={(event) => updateChapter(chapter.key, { title: event.target.value })} placeholder="Chapter title" /><input value={chapter.section} onChange={(event) => updateChapter(chapter.key, { section: event.target.value })} placeholder="Section (optional)" /></div>
        <div className="mt-2 grid grid-cols-3 gap-2"><input type="number" value={chapter.startPage} onChange={(event) => updateChapter(chapter.key, { startPage: Number(event.target.value) })} /><input type="number" value={chapter.endPage} onChange={(event) => updateChapter(chapter.key, { endPage: Number(event.target.value) })} /><button className="rounded-2xl bg-red-50 font-bold text-red-600" onClick={() => setChapters((rows) => rows.filter((row) => row.key !== chapter.key))}>Delete</button></div>
      </div>)}</div>
      <p className="text-sm font-semibold text-stone-500">Schedule preview: {schedulePreview.length} reading days at about {pagesPerDay || 5} pages/day.</p>
      <Button disabled={!canSave} onClick={saveBook}>Save Book & Generate Schedule</Button>
    </Card>
  </main>;
}
