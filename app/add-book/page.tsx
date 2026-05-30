'use client';

/* eslint-disable @next/next/no-img-element */

import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Button, Card } from '@/components/ui';
import { generateSchedule, parseChapters, todayIso, uid } from '@/lib/reading';
import { useAppData } from '@/lib/storage';
import type { Chapter } from '@/lib/types';

type DraftChapter = Omit<Chapter, 'id' | 'bookId'> & { key: string };

type TesseractResult = {
  data: {
    text: string;
    confidence?: number;
  };
};

const MIN_SCAN_WIDTH = 1400;
const MAX_SCAN_WIDTH = 2200;

function revokePreview(url: string) {
  if (url) URL.revokeObjectURL(url);
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not load image. Please choose another photo.'));
    };
    image.src = url;
  });
}

function sharpenPixel(data: Uint8ClampedArray, width: number, height: number, x: number, y: number, channel: number) {
  const center = (y * width + x) * 4 + channel;
  const left = (y * width + x - 1) * 4 + channel;
  const right = (y * width + x + 1) * 4 + channel;
  const top = ((y - 1) * width + x) * 4 + channel;
  const bottom = ((y + 1) * width + x) * 4 + channel;
  return Math.max(0, Math.min(255, data[center] * 5 - data[left] - data[right] - data[top] - data[bottom]));
}

async function preprocessImage(file: File) {
  const image = await loadImage(file);
  const scale = image.width < MIN_SCAN_WIDTH ? MIN_SCAN_WIDTH / image.width : Math.min(1, MAX_SCAN_WIDTH / image.width);
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Canvas is not available in this browser.');

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, width, height);

  const imageData = context.getImageData(0, 0, width, height);
  const { data } = imageData;
  for (let index = 0; index < data.length; index += 4) {
    const gray = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
    const contrasted = Math.max(0, Math.min(255, (gray - 128) * 1.55 + 128));
    data[index] = contrasted;
    data[index + 1] = contrasted;
    data[index + 2] = contrasted;
  }

  const sharpened = new Uint8ClampedArray(data);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const offset = (y * width + x) * 4;
      const value = sharpenPixel(data, width, height, x, y, 0);
      sharpened[offset] = value;
      sharpened[offset + 1] = value;
      sharpened[offset + 2] = value;
    }
  }
  imageData.data.set(sharpened);
  context.putImageData(imageData, 0, 0);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((processedBlob) => {
      if (processedBlob) resolve(processedBlob);
      else reject(new Error('Could not prepare image for OCR.'));
    }, 'image/png');
  });

  return { blob, previewUrl: URL.createObjectURL(blob), width, height };
}

function looksMessy(text: string, confidence?: number) {
  const compact = text.replace(/\s/g, '');
  if (compact.length < 20) return true;
  const randomCharacterCount = (compact.match(/[^a-zA-Z0-9.,:;()\-–—'"&/]/g) || []).length;
  const randomRatio = randomCharacterCount / compact.length;
  const pagePatternCount = (text.match(/\b\d{1,4}\b/g) || []).length;
  return randomRatio > 0.22 || pagePatternCount === 0 || (typeof confidence === 'number' && confidence < 60);
}

export default function AddBookPage() {
  const router = useRouter();
  const { setData } = useAppData();
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const [title, setTitle] = useState('');
  const [totalPages, setTotalPages] = useState(100);
  const [pagesPerDay, setPagesPerDay] = useState(5);
  const [startDate, setStartDate] = useState(todayIso());
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [processedPreviewUrl, setProcessedPreviewUrl] = useState('');
  const [processedSize, setProcessedSize] = useState('');
  const [ocrText, setOcrText] = useState('');
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);
  const [chapters, setChapters] = useState<DraftChapter[]>([]);
  const [ocrStatus, setOcrStatus] = useState('');
  const [scanWarning, setScanWarning] = useState('');
  const [extractMessage, setExtractMessage] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const canSave = title.trim() && chapters.length > 0;

  const schedulePreview = useMemo(() => {
    const fakeBook = { id: 'preview', title, totalPages, pagesPerDay, startDate, status: 'reading' as const, createdAt: new Date().toISOString() };
    return generateSchedule(fakeBook, chapters.map((chapter) => ({ ...chapter, id: chapter.key, bookId: 'preview' })));
  }, [chapters, pagesPerDay, startDate, title, totalPages]);

  const chooseImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    revokePreview(imagePreviewUrl);
    revokePreview(processedPreviewUrl);
    setSelectedFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    setProcessedPreviewUrl('');
    setProcessedSize('');
    setOcrStatus('Image ready. Review the preview, then tap “Scan this image”.');
    setScanWarning('');
    setExtractMessage('');
    setChapters([]);
    setOcrConfidence(null);
  };

  const resetImage = () => {
    revokePreview(imagePreviewUrl);
    revokePreview(processedPreviewUrl);
    setSelectedFile(null);
    setImagePreviewUrl('');
    setProcessedPreviewUrl('');
    setProcessedSize('');
    setOcrStatus('Choose or take a new photo.');
    setScanWarning('');
    setExtractMessage('');
    setChapters([]);
    setOcrText('');
    setOcrConfidence(null);
    setFileInputKey((key) => key + 1);
  };

  const runOcr = async () => {
    if (!selectedFile) {
      setScanWarning('Choose or take a photo first.');
      return;
    }
    setIsScanning(true);
    setScanWarning('');
    setOcrStatus('Preprocessing image for cleaner OCR…');
    try {
      revokePreview(processedPreviewUrl);
      const processed = await preprocessImage(selectedFile);
      setProcessedPreviewUrl(processed.previewUrl);
      setProcessedSize(`${processed.width} × ${processed.height}`);
      setOcrStatus('Scanning processed image… this can take a minute on phones.');
      const Tesseract = await import('tesseract.js') as any;
      const worker = await Tesseract.createWorker('eng');
      try {
        await worker.setParameters({
          tessedit_pageseg_mode: Tesseract.PSM?.SINGLE_BLOCK || '6',
          preserve_interword_spaces: '1',
        });
        const result = await worker.recognize(processed.blob) as TesseractResult;
        const text = result.data.text.trim();
        const confidence = typeof result.data.confidence === 'number' ? Math.round(result.data.confidence) : null;
        setOcrText(text);
        setOcrConfidence(confidence);
        setOcrStatus('OCR complete. Review and edit the text before extracting chapter rows.');
        if (looksMessy(text, confidence ?? undefined)) {
          setScanWarning('Scan looks unclear. Please retake photo or edit text manually.');
        }
      } finally {
        await worker.terminate();
      }
    } catch (error) {
      setScanWarning(error instanceof Error ? error.message : 'Could not scan this image. Please retake photo or paste text manually.');
      setOcrStatus('Scan failed. You can retake, upload again, or paste manually.');
    } finally {
      setIsScanning(false);
    }
  };

  const detectChapters = () => {
    const detected = parseChapters(ocrText, totalPages).map((chapter) => ({ ...chapter, key: uid() }));
    if (!detected.length) {
      setExtractMessage('Could not detect chapters clearly. Please edit the text or add rows manually.');
      setChapters([]);
      return;
    }
    setChapters(detected);
    setExtractMessage(`Detected ${detected.length} chapter row${detected.length === 1 ? '' : 's'}. Review before saving.`);
  };

  const useSimplePageSchedule = () => {
    setChapters([{ key: uid(), title: 'Simple page schedule', section: '', startPage: 1, endPage: totalPages, totalPages }]);
    setExtractMessage(`Simple schedule ready: pages 1-${totalPages}, split by ${pagesPerDay || 5} pages per day.`);
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

    <Card className="space-y-4 border border-sage/10 bg-sage/5">
      <h2 className="text-xl font-black">Mobile scanning tips</h2>
      <ul className="grid gap-2 text-sm font-semibold text-stone-700 sm:grid-cols-2">
        <li>• Use bright lighting</li>
        <li>• Keep the page flat</li>
        <li>• Avoid shadows</li>
        <li>• Take photo straight from top</li>
        <li>• Make text large and clear</li>
        <li>• Crop only the table of contents area if possible</li>
      </ul>
    </Card>

    <Card className="space-y-4">
      <h2 className="text-xl font-black">Scan table of contents</h2>
      <p className="text-sm text-stone-600">Take a photo or upload an image. You will preview it first, then scan when ready.</p>
      <input key={fileInputKey} type="file" accept="image/*" capture="environment" onChange={chooseImage} />
      {imagePreviewUrl && <div className="space-y-2"><p className="text-sm font-bold text-stone-600">Original preview</p><img src={imagePreviewUrl} alt="Selected book page preview" className="max-h-96 w-full rounded-2xl border border-stone-200 object-contain" /></div>}
      {processedPreviewUrl && <details className="rounded-2xl bg-stone-50 p-3"><summary className="cursor-pointer text-sm font-bold text-stone-600">Show processed OCR preview {processedSize && `(${processedSize})`}</summary><img src={processedPreviewUrl} alt="Processed OCR preview" className="mt-3 max-h-96 w-full rounded-2xl border border-stone-200 object-contain" /></details>}
      {ocrStatus && <p className="rounded-2xl bg-stone-50 p-3 text-sm font-semibold text-stone-600">{ocrStatus}</p>}
      {ocrConfidence !== null && <p className="rounded-2xl bg-blue-50 p-3 text-sm font-bold text-blue-700">OCR confidence: {ocrConfidence}%</p>}
      {scanWarning && <p className="rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-800">{scanWarning}</p>}
      <div className="grid gap-2 sm:grid-cols-2"><Button type="button" disabled={!selectedFile || isScanning} onClick={runOcr}>{isScanning ? 'Scanning…' : 'Scan this image'}</Button><button type="button" className="rounded-2xl bg-stone-100 px-5 py-3 font-extrabold text-ink" onClick={resetImage}>Retake / Upload again</button></div>
    </Card>

    <Card className="space-y-4">
      <h2 className="text-xl font-black">Review extracted text</h2>
      <div><label>Extracted text (editable)</label><textarea ref={textAreaRef} rows={12} value={ocrText} onChange={(event) => setOcrText(event.target.value)} placeholder={'Part 1\nChapter 1 Getting Started 1\nChapter 2 Building a Habit 12'} /></div>
      <div className="grid gap-2 sm:grid-cols-3"><button type="button" className="rounded-2xl bg-stone-100 px-5 py-3 font-extrabold text-ink" onClick={() => setOcrText('')}>Clear text</button><button type="button" className="rounded-2xl bg-stone-100 px-5 py-3 font-extrabold text-ink" onClick={() => textAreaRef.current?.focus()}>Paste manually</button><Button type="button" onClick={detectChapters}>Extract chapter rows</Button></div>
      {extractMessage && <p className={`rounded-2xl p-3 text-sm font-bold ${chapters.length ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{extractMessage}</p>}
    </Card>

    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-black">Manual fallback</h2><p className="text-sm text-stone-600">If OCR is unclear, generate a simple pages-only schedule.</p></div><button type="button" className="rounded-full bg-stone-100 px-3 py-2 text-sm font-bold" onClick={useSimplePageSchedule}>Use simple page schedule</button></div>
    </Card>

    <Card className="space-y-4">
      <div className="flex items-center justify-between"><h2 className="text-xl font-black">Chapter rows</h2><button type="button" className="rounded-full bg-stone-100 px-3 py-2 text-sm font-bold" onClick={() => setChapters((rows) => [...rows, { key: uid(), title: 'New chapter', section: '', startPage: 1, endPage: 1, totalPages: 1 }])}>+ Add row</button></div>
      {!chapters.length && <p className="rounded-2xl bg-stone-50 p-4 text-stone-600">No chapter rows yet. Extract rows after reviewing text, use the simple page schedule, or add rows manually.</p>}
      <div className="space-y-3">{chapters.map((chapter) => <div key={chapter.key} className="rounded-2xl border border-stone-200 p-3">
        <div className="grid gap-2"><input value={chapter.title} onChange={(event) => updateChapter(chapter.key, { title: event.target.value })} placeholder="Chapter title" /><input value={chapter.section} onChange={(event) => updateChapter(chapter.key, { section: event.target.value })} placeholder="Section (optional)" /></div>
        <div className="mt-2 grid grid-cols-3 gap-2"><input type="number" value={chapter.startPage} onChange={(event) => updateChapter(chapter.key, { startPage: Number(event.target.value) })} /><input type="number" value={chapter.endPage} onChange={(event) => updateChapter(chapter.key, { endPage: Number(event.target.value) })} /><button type="button" className="rounded-2xl bg-red-50 font-bold text-red-600" onClick={() => setChapters((rows) => rows.filter((row) => row.key !== chapter.key))}>Delete</button></div>
      </div>)}</div>
      <p className="text-sm font-semibold text-stone-500">Schedule preview: {schedulePreview.length} reading days at about {pagesPerDay || 5} pages/day.</p>
      <Button disabled={!canSave} onClick={saveBook}>Save Book & Generate Schedule</Button>
    </Card>
  </main>;
}
