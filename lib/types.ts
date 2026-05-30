export type BookStatus = 'reading' | 'finished';
export type ItemStatus = 'pending' | 'completed';

export type Book = {
  id: string;
  title: string;
  totalPages: number;
  pagesPerDay: number;
  startDate: string;
  status: BookStatus;
  createdAt: string;
};

export type Chapter = {
  id: string;
  bookId: string;
  title: string;
  section: string;
  startPage: number;
  endPage: number;
  totalPages: number;
};

export type ScheduleItem = {
  id: string;
  bookId: string;
  dayNumber: number;
  date: string;
  contentToRead: string;
  startPage: number;
  endPage: number;
  pagesToRead: number;
  status: ItemStatus;
  completedAt?: string;
};

export type BookmarkTodo = {
  id: string;
  bookId: string;
  title: string;
  note: string;
  pageNumber: number;
  status: ItemStatus;
  createdAt: string;
};

export type DailyLog = {
  id: string;
  bookId: string;
  scheduleItemId: string;
  date: string;
  completed: boolean;
  note: string;
};

export type AppData = {
  books: Book[];
  chapters: Chapter[];
  schedule: ScheduleItem[];
  bookmarks: BookmarkTodo[];
  dailyLogs: DailyLog[];
  settings: { reminderTime: string; sampleLoaded: boolean };
};
