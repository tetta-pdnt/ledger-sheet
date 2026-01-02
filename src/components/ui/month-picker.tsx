'use client';

import * as React from 'react';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface MonthPickerProps {
  value?: string; // YYYY-MM format
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function MonthPicker({ value, onChange, placeholder = '月を選択', className }: MonthPickerProps) {
  const [open, setOpen] = React.useState(false);
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();

  // Parse value to year and month
  const [year, month] = value ? value.split('-').map(Number) : [currentYear, currentDate.getMonth() + 1];

  // Generate years (current year ± 5 years)
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  // Generate months
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: `${i + 1}月`,
  }));

  const handleYearChange = (newYear: string) => {
    const monthStr = String(month).padStart(2, '0');
    onChange?.(`${newYear}-${monthStr}`);
  };

  const handleMonthChange = (newMonth: string) => {
    const monthStr = String(newMonth).padStart(2, '0');
    onChange?.(`${year}-${monthStr}`);
  };

  const handleClear = () => {
    onChange?.('');
    setOpen(false);
  };

  const displayValue = value
    ? `${year}年${month}月`
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <Calendar className="mr-2 h-4 w-4" />
          {displayValue}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="space-y-4">
          <div className="flex gap-2">
            <Select value={String(year)} onValueChange={handleYearChange}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}年
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={String(month)} onValueChange={handleMonthChange}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m.value} value={String(m.value)}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={handleClear}
            >
              クリア
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              決定
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
