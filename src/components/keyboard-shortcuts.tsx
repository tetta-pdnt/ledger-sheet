'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { format, addMonths, subMonths, parse } from 'date-fns';
import { useLedgerStore } from '@/lib/store';

const navigationRoutes = [
  '/',
  '/transactions',
  '/budgets',
  '/recurrings',
  '/accounts',
  '/categories',
  '/settings',
];

export function KeyboardShortcuts() {
  const router = useRouter();
  const pathname = usePathname();
  const { currentMonth, setCurrentMonth } = useLedgerStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input, textarea, or contenteditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      switch (e.key) {
        case 'ArrowLeft': {
          // Previous month
          e.preventDefault();
          const currentDate = parse(currentMonth, 'yyyy-MM', new Date());
          const newDate = subMonths(currentDate, 1);
          setCurrentMonth(format(newDate, 'yyyy-MM'));
          break;
        }

        case 'ArrowRight': {
          // Next month
          e.preventDefault();
          const currentDate = parse(currentMonth, 'yyyy-MM', new Date());
          const newDate = addMonths(currentDate, 1);
          setCurrentMonth(format(newDate, 'yyyy-MM'));
          break;
        }

        case 'ArrowUp': {
          // Previous navigation item
          e.preventDefault();
          const currentIndex = navigationRoutes.indexOf(pathname);
          if (currentIndex > 0) {
            router.push(navigationRoutes[currentIndex - 1]);
          }
          break;
        }

        case 'ArrowDown': {
          // Next navigation item
          e.preventDefault();
          const currentIndex = navigationRoutes.indexOf(pathname);
          if (currentIndex >= 0 && currentIndex < navigationRoutes.length - 1) {
            router.push(navigationRoutes[currentIndex + 1]);
          }
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [pathname, currentMonth, setCurrentMonth, router]);

  return null;
}
