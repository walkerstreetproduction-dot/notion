import { AppData, Book, BookmarkTodo, Chapter, DailyLog, ScheduleItem } from './types';

export const todayIso = () => new Date().toISOString().slice(0, 10);
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const emptyData = (): AppData => ({
  books: [],
  chapters: [],
  schedule: [],
  bookmarks: [],
  dailyLogs: [],
  settings: { reminderTime: '08:00', sampleLoaded: false },
});

export const sampleData = (): AppData => {
  const bookId = 'sample-book';
  const startDate = todayIso();
  const book: Book = { id: bookId, title: 'Sample: Atomic Habits', totalPages: 30, pagesPerDay: 5, startDate, status: 'reading', createdAt: new Date().toISOString() };
  const chapters: Chapter[] = [
    { id: 'c1', bookId, title: 'The Fundamentals', section: 'Part 1', startPage: 1, endPage: 10, totalPages: 10 },
    { id: 'c2', bookId, title: 'Make It Obvious', section: 'Part 2', startPage: 11, endPage: 20, totalPages: 10 },
    { id: 'c3', bookId, title: 'Make It Attractive', section: 'Part 3', startPage: 21, endPage: 30, totalPages: 10 },
  ];
  const schedule = generateSchedule(book, chapters);
  const bookmarks: BookmarkTodo[] = [{ id: 'b1', bookId, title: 'Write one habit idea', note: 'Apply a small habit after reading.', pageNumber: 12, status: 'pending', createdAt: new Date().toISOString() }];
  return { books: [book], chapters, schedule, bookmarks, dailyLogs: [], settings: { reminderTime: '08:00', sampleLoaded: true } };
};

export function parseChapters(text: string, totalPages?: number): Omit<Chapter, 'id' | 'bookId'>[] {
  const lines = text.split('\n').map((line) => line.replace(/\.{2,}/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean);
  const parsed: { title: string; section: string; startPage: number }[] = [];
  let currentSection = '';

  for (const line of lines) {
    if (/^(part|section)\s+[ivx\d]+/i.test(line) && !/\d+$/.test(line)) {
      currentSection = line;
      continue;
    }
    const match = line.match(/^(?:(chapter|ch\.?|\d+)\s*[\d\w.:\-–—]*\s*)?(.+?)\s+(\d{1,4})$/i);
    if (!match) continue;
    const title = match[2].replace(/^(chapter|ch\.?)\s*\d+\s*[:.\-–—]?\s*/i, '').trim();
    const page = Number(match[3]);
    if (!title || Number.isNaN(page)) continue;
    parsed.push({ title, section: currentSection, startPage: page });
  }

  if (parsed.length === 0 && totalPages) {
    parsed.push({ title: 'Reading', section: '', startPage: 1 });
  }

  return parsed.map((chapter, index) => {
    const next = parsed[index + 1]?.startPage;
    const endPage = next ? Math.max(chapter.startPage, next - 1) : Math.max(chapter.startPage, totalPages || chapter.startPage);
    return { ...chapter, endPage, totalPages: Math.max(1, endPage - chapter.startPage + 1) };
  });
}

export function generateSchedule(book: Book, chapters: Chapter[]): ScheduleItem[] {
  const ordered = [...chapters].sort((a, b) => a.startPage - b.startPage);
  const items: ScheduleItem[] = [];
  let day = 1;
  let date = new Date(`${book.startDate}T00:00:00`);

  for (const chapter of ordered) {
    let page = chapter.startPage;
    while (page <= chapter.endPage) {
      const end = Math.min(chapter.endPage, page + book.pagesPerDay - 1);
      items.push({
        id: uid(),
        bookId: book.id,
        dayNumber: day,
        date: date.toISOString().slice(0, 10),
        contentToRead: [chapter.section, chapter.title].filter(Boolean).join(' · '),
        startPage: page,
        endPage: end,
        pagesToRead: end - page + 1,
        status: 'pending',
      });
      page = end + 1;
      day += 1;
      date.setDate(date.getDate() + 1);
    }
  }
  return items;
}

export function getCurrentTask(schedule: ScheduleItem[]) {
  return schedule.find((item) => item.date === todayIso() && item.status === 'pending') || schedule.find((item) => item.status === 'pending');
}

export function progressForBook(bookId: string, schedule: ScheduleItem[]) {
  const items = schedule.filter((item) => item.bookId === bookId);
  const completed = items.filter((item) => item.status === 'completed').length;
  return { total: items.length, completed, percent: items.length ? Math.round((completed / items.length) * 100) : 0, remaining: Math.max(0, items.length - completed) };
}

export function calculateStreak(logs: DailyLog[]) {
  const completedDates = new Set(logs.filter((log) => log.completed).map((log) => log.date));
  let streak = 0;
  const cursor = new Date(`${todayIso()}T00:00:00`);
  while (completedDates.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
