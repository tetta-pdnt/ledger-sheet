'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useLedgerStore } from '@/lib/store';
import { getCategoryTotal } from '@/lib/schemas';
import { formatCurrency } from '@/lib/utils';
import { format, subMonths, parse } from 'date-fns';
import { ja } from 'date-fns/locale';

interface IncomeExpenseLineChartProps {
  months?: number;
  periodType?: 'all' | 'year' | 'range';
  selectedYear?: number;
  startMonth?: string; // YYYY-MM format
  endMonth?: string; // YYYY-MM format
}

export function IncomeExpenseLineChart({
  months = 6,
  periodType,
  selectedYear,
  startMonth,
  endMonth,
}: IncomeExpenseLineChartProps) {
  const { getMonthlyData, currentMonth, monthlyData } = useLedgerStore();

  const chartData = useMemo(() => {
    const data: Array<{
      month: string;
      monthKey: string;
      income: number;
      expense: number;
    }> = [];

    if (periodType === 'range' && startMonth && endMonth) {
      // Show months in specified range
      const allMonths = Array.from(monthlyData.keys())
        .filter(m => m >= startMonth && m <= endMonth)
        .sort();

      for (const monthKey of allMonths) {
        const monthDate = parse(monthKey, 'yyyy-MM', new Date());
        const monthLabel = format(monthDate, 'yyyy/M', { locale: ja });

        const monthData = getMonthlyData(monthKey);

        // Calculate total income (excluding bonus, misc, pool)
        const totalIncome = Object.entries(monthData.income)
          .filter(([categoryId]) => !['bonus', 'misc', 'pool'].includes(categoryId))
          .reduce((sum: number, [, amount]) => {
            return sum + getCategoryTotal(amount);
          }, 0);

        // Calculate total expense (excluding bonus, misc, pool)
        const totalExpense = Object.entries(monthData.expense)
          .filter(([categoryId]) => !['bonus', 'misc', 'pool'].includes(categoryId))
          .reduce((sum: number, [, amount]) => {
            return sum + getCategoryTotal(amount);
          }, 0);

        data.push({
          month: monthLabel,
          monthKey,
          income: totalIncome,
          expense: totalExpense,
        });
      }
    } else if (periodType === 'all') {
      // Show all available months
      const allMonths = Array.from(monthlyData.keys()).sort();
      for (const monthKey of allMonths) {
        const monthDate = parse(monthKey, 'yyyy-MM', new Date());
        const monthLabel = format(monthDate, 'yyyy/M', { locale: ja });

        const monthData = getMonthlyData(monthKey);

        // Calculate total income (excluding bonus, misc, pool)
        const totalIncome = Object.entries(monthData.income)
          .filter(([categoryId]) => !['bonus', 'misc', 'pool'].includes(categoryId))
          .reduce((sum: number, [, amount]) => {
            return sum + getCategoryTotal(amount);
          }, 0);

        // Calculate total expense (excluding bonus, misc, pool)
        const totalExpense = Object.entries(monthData.expense)
          .filter(([categoryId]) => !['bonus', 'misc', 'pool'].includes(categoryId))
          .reduce((sum: number, [, amount]) => {
            return sum + getCategoryTotal(amount);
          }, 0);

        data.push({
          month: monthLabel,
          monthKey,
          income: totalIncome,
          expense: totalExpense,
        });
      }
    } else if (periodType === 'year' && selectedYear) {
      // Show only selected year's months
      const allMonths = Array.from(monthlyData.keys()).sort();
      const yearMonths = allMonths.filter((m) => m.startsWith(`${selectedYear}-`));

      for (const monthKey of yearMonths) {
        const monthDate = parse(monthKey, 'yyyy-MM', new Date());
        const monthLabel = format(monthDate, 'M月', { locale: ja });

        const monthData = getMonthlyData(monthKey);

        // Calculate total income (excluding bonus, misc, pool)
        const totalIncome = Object.entries(monthData.income)
          .filter(([categoryId]) => !['bonus', 'misc', 'pool'].includes(categoryId))
          .reduce((sum: number, [, amount]) => {
            return sum + getCategoryTotal(amount);
          }, 0);

        // Calculate total expense (excluding bonus, misc, pool)
        const totalExpense = Object.entries(monthData.expense)
          .filter(([categoryId]) => !['bonus', 'misc', 'pool'].includes(categoryId))
          .reduce((sum: number, [, amount]) => {
            return sum + getCategoryTotal(amount);
          }, 0);

        data.push({
          month: monthLabel,
          monthKey,
          income: totalIncome,
          expense: totalExpense,
        });
      }
    } else {
      // Legacy: show last N months from currentMonth
      const currentDate = parse(currentMonth, 'yyyy-MM', new Date());

      for (let i = months - 1; i >= 0; i--) {
        const targetDate = subMonths(currentDate, i);
        const monthKey = format(targetDate, 'yyyy-MM');
        const monthLabel = format(targetDate, 'M月', { locale: ja });

        const monthData = getMonthlyData(monthKey);

        // Calculate total income (excluding bonus, misc, pool)
        const totalIncome = Object.entries(monthData.income)
          .filter(([categoryId]) => !['bonus', 'misc', 'pool'].includes(categoryId))
          .reduce((sum: number, [, amount]) => {
            return sum + getCategoryTotal(amount);
          }, 0);

        // Calculate total expense (excluding bonus, misc, pool)
        const totalExpense = Object.entries(monthData.expense)
          .filter(([categoryId]) => !['bonus', 'misc', 'pool'].includes(categoryId))
          .reduce((sum: number, [, amount]) => {
            return sum + getCategoryTotal(amount);
          }, 0);

        data.push({
          month: monthLabel,
          monthKey,
          income: totalIncome,
          expense: totalExpense,
        });
      }
    }

    return data;
  }, [currentMonth, months, getMonthlyData, monthlyData, periodType, selectedYear, startMonth, endMonth]);

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
  }) => {
    if (!active || !payload || payload.length === 0) return null;

    const incomeEntry = payload.find(p => p.name === 'income');
    const expenseEntry = payload.find(p => p.name === 'expense');
    const balance = (incomeEntry?.value || 0) - (expenseEntry?.value || 0);

    return (
      <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-medium mb-2">{label}</p>
        <div className="space-y-1">
          {incomeEntry && (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: incomeEntry.color }}
                />
                <span>収入</span>
              </div>
              <span className="font-medium text-green-600">{formatCurrency(incomeEntry.value)}</span>
            </div>
          )}
          {expenseEntry && (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: expenseEntry.color }}
                />
                <span>支出</span>
              </div>
              <span className="font-medium text-red-600">{formatCurrency(expenseEntry.value)}</span>
            </div>
          )}
        </div>
        <div className="border-t mt-2 pt-2 flex justify-between font-medium">
          <span>収支</span>
          <span className={balance >= 0 ? 'text-blue-600' : 'text-red-600'}>
            {balance >= 0 ? '+' : ''}{formatCurrency(balance)}
          </span>
        </div>
      </div>
    );
  };

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        データがありません
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={chartData}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        syncId="income-expense-line"
      >
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
          formatter={(value) => (value === 'income' ? '収入' : '支出')}
          wrapperStyle={{ fontSize: 12 }}
        />
        <Line
          type="monotone"
          dataKey="income"
          stroke="#10B981"
          strokeWidth={2}
          dot={{ fill: '#10B981', r: 4 }}
          activeDot={{ r: 6 }}
          name="income"
        />
        <Line
          type="monotone"
          dataKey="expense"
          stroke="#EF4444"
          strokeWidth={2}
          dot={{ fill: '#EF4444', r: 4 }}
          activeDot={{ r: 6 }}
          name="expense"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
