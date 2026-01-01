'use client';

import { useMemo } from 'react';
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
  periodType?: 'all' | 'year';
  selectedYear?: number;
}

export function StackedAreaChart({
  type,
  months = 6,
  periodType,
  selectedYear,
}: StackedAreaChartProps) {
  const { categories, getMonthlyData, currentMonth, monthlyData } = useLedgerStore();

  const categoryList: Category[] =
    type === 'income'
      ? categories.categories.income
      : categories.categories.expense;

  const chartData = useMemo(() => {
    const data: Record<string, string | number>[] = [];

    if (periodType === 'all') {
      // Show all available months
      const allMonths = Array.from(monthlyData.keys()).sort();
      for (const monthKey of allMonths) {
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
  }, [currentMonth, months, type, categoryList, getMonthlyData, monthlyData, periodType, selectedYear]);

  // Filter categories that have at least some data
  const activeCategories = useMemo(() => {
    return categoryList.filter((cat) =>
      chartData.some((d) => (d[cat.id] as number) > 0)
    );
  }, [categoryList, chartData]);

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
        <Legend
          formatter={(value) =>
            categoryList.find((c) => c.id === value)?.name || value
          }
          wrapperStyle={{ fontSize: 12 }}
        />
        {activeCategories.map((cat) => (
          <Area
            key={cat.id}
            type="monotone"
            dataKey={cat.id}
            stackId="1"
            stroke={cat.color}
            fill={`url(#gradient-${cat.id})`}
            fillOpacity={1}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
