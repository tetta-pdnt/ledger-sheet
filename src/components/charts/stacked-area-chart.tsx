'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useLedgerStore } from '@/lib/store';
import { getCategoryTotal, type Category } from '@/lib/schemas';
import { formatCurrency } from '@/lib/utils';
import { format, subMonths, parse } from 'date-fns';
import { ja } from 'date-fns/locale';

interface StackedAreaChartProps {
  type: 'income' | 'expense';
  months?: number;
  periodType?: 'all' | 'year' | 'range';
  selectedYear?: number;
  startMonth?: string; // YYYY-MM format
  endMonth?: string; // YYYY-MM format
  selectedCategories?: string[]; // category IDs to display
}

export function StackedAreaChart({
  type,
  months = 6,
  periodType,
  selectedYear,
  startMonth,
  endMonth,
  selectedCategories,
}: StackedAreaChartProps) {
  const { categories, getMonthlyData, currentMonth, monthlyData } = useLedgerStore();

  const categoryList: Category[] =
    type === 'income'
      ? categories.categories.income
      : categories.categories.expense;

  // Manage visible categories internally
  const [visibleCategories, setVisibleCategories] = useState<Set<string>>(new Set());
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const clickCountRef = useRef(0);

  // Initialize visible categories when selectedCategories changes
  useEffect(() => {
    if (selectedCategories && selectedCategories.length > 0) {
      setVisibleCategories(new Set(selectedCategories));
    } else {
      setVisibleCategories(new Set(categoryList.map(c => c.id)));
    }
  }, [selectedCategories, categoryList]);

  // Handle legend click (single/double click)
  const handleLegendClick = (categoryId: string) => {
    clickCountRef.current += 1;

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
    }

    clickTimerRef.current = setTimeout(() => {
      if (clickCountRef.current === 1) {
        // Single click: toggle this category
        setVisibleCategories(prev => {
          const newSet = new Set(prev);
          if (newSet.has(categoryId)) {
            newSet.delete(categoryId);
          } else {
            newSet.add(categoryId);
          }
          return newSet;
        });
      } else if (clickCountRef.current === 2) {
        // Double click: toggle all other categories
        setVisibleCategories(prev => {
          const allCategories = categoryList.map(c => c.id);
          const allVisible = allCategories.every(id => prev.has(id));

          if (allVisible || prev.size === 0) {
            // If all are visible or none are visible, show only this category
            return new Set([categoryId]);
          } else {
            // Otherwise, show all categories
            return new Set(allCategories);
          }
        });
      }
      clickCountRef.current = 0;
    }, 250);
  };

  const chartData = useMemo(() => {
    const data: Record<string, string | number>[] = [];

    if (periodType === 'range' && startMonth && endMonth) {
      // Show months in specified range
      const allMonths = Array.from(monthlyData.keys())
        .filter(m => m >= startMonth && m <= endMonth)
        .sort();

      for (const monthKey of allMonths) {
        const monthDate = parse(monthKey, 'yyyy-MM', new Date());
        const monthLabel = format(monthDate, 'yyyy/M', { locale: ja });

        const monthData = getMonthlyData(monthKey);
        const amounts = type === 'income' ? monthData.income : monthData.expense;

        const dataPoint: Record<string, string | number> = {
          month: monthLabel,
          monthKey,
        };

        categoryList.forEach((cat) => {
          const amount = amounts[cat.id];
          dataPoint[cat.id] = amount ? getCategoryTotal(amount) : 0;
        });

        data.push(dataPoint);
      }
    } else if (periodType === 'all') {
      // Show all available months
      const allMonths = Array.from(monthlyData.keys()).sort();
      for (const monthKey of allMonths) {
        const monthDate = parse(monthKey, 'yyyy-MM', new Date());
        const monthLabel = format(monthDate, 'yyyy/M', { locale: ja });

        const monthData = getMonthlyData(monthKey);
        const amounts = type === 'income' ? monthData.income : monthData.expense;

        const dataPoint: Record<string, string | number> = {
          month: monthLabel,
          monthKey,
        };

        categoryList.forEach((cat) => {
          const amount = amounts[cat.id];
          dataPoint[cat.id] = amount ? getCategoryTotal(amount) : 0;
        });

        data.push(dataPoint);
      }
    } else if (periodType === 'year' && selectedYear) {
      // Show only selected year's months
      const allMonths = Array.from(monthlyData.keys()).sort();
      const yearMonths = allMonths.filter((m) => m.startsWith(`${selectedYear}-`));

      for (const monthKey of yearMonths) {
        const monthDate = parse(monthKey, 'yyyy-MM', new Date());
        const monthLabel = format(monthDate, 'M月', { locale: ja });

        const monthData = getMonthlyData(monthKey);
        const amounts = type === 'income' ? monthData.income : monthData.expense;

        const dataPoint: Record<string, string | number> = {
          month: monthLabel,
          monthKey,
        };

        categoryList.forEach((cat) => {
          const amount = amounts[cat.id];
          dataPoint[cat.id] = amount ? getCategoryTotal(amount) : 0;
        });

        data.push(dataPoint);
      }
    } else {
      // Legacy: show last N months from currentMonth
      const currentDate = parse(currentMonth, 'yyyy-MM', new Date());

      for (let i = months - 1; i >= 0; i--) {
        const targetDate = subMonths(currentDate, i);
        const monthKey = format(targetDate, 'yyyy-MM');
        const monthLabel = format(targetDate, 'M月', { locale: ja });

        const monthData = getMonthlyData(monthKey);
        const amounts = type === 'income' ? monthData.income : monthData.expense;

        const dataPoint: Record<string, string | number> = {
          month: monthLabel,
          monthKey,
        };

        categoryList.forEach((cat) => {
          const amount = amounts[cat.id];
          dataPoint[cat.id] = amount ? getCategoryTotal(amount) : 0;
        });

        data.push(dataPoint);
      }
    }

    return data;
  }, [currentMonth, months, type, categoryList, getMonthlyData, monthlyData, periodType, selectedYear, startMonth, endMonth]);

  // Filter categories that have at least some data
  const activeCategories = useMemo(() => {
    // Filter categories that have at least some data
    return categoryList.filter((cat) =>
      chartData.some((d) => (d[cat.id] as number) > 0)
    );
  }, [categoryList, chartData]);

  const CustomLegend = ({ payload }: { payload?: Array<{ value: string; color: string }> }) => {
    if (!payload || payload.length === 0) return null;

    // Sort payload by categoryList order
    const sortedPayload = [...payload].sort((a, b) => {
      const indexA = categoryList.findIndex(c => c.id === a.value);
      const indexB = categoryList.findIndex(c => c.id === b.value);
      return indexA - indexB;
    });

    return (
      <div className="flex flex-wrap gap-4 justify-center mt-2 text-sm">
        {sortedPayload.map((entry) => {
          const category = categoryList.find(c => c.id === entry.value);
          const isVisible = visibleCategories.has(entry.value);

          return (
            <div
              key={entry.value}
              className="flex items-center gap-2 cursor-pointer select-none"
              onClick={() => handleLegendClick(entry.value)}
              style={{ opacity: isVisible ? 1 : 0.3 }}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span>{category?.name || entry.value}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
  }) => {
    if (!active || !payload || payload.length === 0) return null;

    const total = payload.reduce((sum, entry) => sum + entry.value, 0);

    return (
      <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-medium mb-2">{label}</p>
        <div className="space-y-1">
          {payload.map((entry) => (
            <div key={entry.name} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span>{categoryList.find((c) => c.id === entry.name)?.name || entry.name}</span>
              </div>
              <span className="font-medium">{formatCurrency(entry.value)}</span>
            </div>
          ))}
        </div>
        <div className="border-t mt-2 pt-2 flex justify-between font-medium">
          <span>合計</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>
    );
  };

  if (activeCategories.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        データがありません
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart
        data={chartData}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        syncId={`stacked-${type}`}
      >
        <defs>
          {activeCategories.map((cat) => (
            <linearGradient
              key={`gradient-${cat.id}`}
              id={`gradient-${cat.id}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="5%" stopColor={cat.color} stopOpacity={0.8} />
              <stop offset="95%" stopColor={cat.color} stopOpacity={0.2} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12 }}
          className="text-muted-foreground"
        />
        <YAxis
          tickFormatter={(value) =>
            value >= 10000 ? `${(value / 10000).toFixed(0)}万` : value.toString()
          }
          tick={{ fontSize: 12 }}
          className="text-muted-foreground"
          width={50}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend content={<CustomLegend />} />
        {activeCategories.map((cat) => (
          <Area
            key={cat.id}
            type="monotone"
            dataKey={cat.id}
            stackId="1"
            stroke={cat.color}
            fill={`url(#gradient-${cat.id})`}
            fillOpacity={0.8}
            hide={!visibleCategories.has(cat.id)}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
