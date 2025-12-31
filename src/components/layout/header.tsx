'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths, parse } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { useLedgerStore } from '@/lib/store';

interface HeaderProps {
  title: string;
  showMonthPicker?: boolean;
}

export function Header({ title, showMonthPicker = true }: HeaderProps) {
  const { currentMonth, setCurrentMonth } = useLedgerStore();

  const currentDate = parse(currentMonth, 'yyyy-MM', new Date());

  const handlePreviousMonth = () => {
    const newDate = subMonths(currentDate, 1);
    setCurrentMonth(format(newDate, 'yyyy-MM'));
  };

  const handleNextMonth = () => {
    const newDate = addMonths(currentDate, 1);
    setCurrentMonth(format(newDate, 'yyyy-MM'));
  };

  const handleToday = () => {
    setCurrentMonth(format(new Date(), 'yyyy-MM'));
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <h2 className="text-lg font-semibold">{title}</h2>

      {showMonthPicker && (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handlePreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <button
            onClick={handleToday}
            className="min-w-[140px] rounded-md px-3 py-1.5 text-sm font-medium hover:bg-accent"
          >
            {format(currentDate, 'yyyy年M月', { locale: ja })}
          </button>

          <Button variant="ghost" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </header>
  );
}
