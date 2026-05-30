import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-3xl bg-white p-5 shadow-soft ${className}`}>{children}</section>;
}

export function Button({ children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`w-full rounded-2xl bg-sage px-5 py-3 text-base font-extrabold text-white shadow-soft disabled:opacity-50 ${className}`} {...props}>{children}</button>;
}

export function LinkButton({ href, children, className = '' }: { href: string; children: ReactNode; className?: string }) {
  return <Link href={href} className={`block rounded-2xl bg-ink px-5 py-3 text-center text-base font-extrabold text-white shadow-soft ${className}`}>{children}</Link>;
}

export function ProgressBar({ percent }: { percent: number }) {
  return <div className="h-3 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full bg-sage transition-all" style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} /></div>;
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return <Card className="text-center"><div className="text-4xl">🌱</div><h2 className="mt-3 text-xl font-black">{title}</h2><p className="mt-2 text-stone-600">{body}</p>{action && <div className="mt-4">{action}</div>}</Card>;
}
