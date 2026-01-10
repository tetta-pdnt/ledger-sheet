'use client';

import { useMemo, useState } from 'react';
import { useLedgerStore } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';

type PeriodType = 'all' | 'year' | 'range';

interface HorizontalBalanceChartProps {
  periodType: PeriodType;
  selectedYear?: number;
  startMonth?: string;
  endMonth?: string;
}

interface SegmentData {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

export function HorizontalBalanceChart({
  periodType,
  selectedYear,
  startMonth,
  endMonth,
}: HorizontalBalanceChartProps) {
  const { categories, monthlyData, getPeriodTotals } = useLedgerStore();
  const [hoveredSegment, setHoveredSegment] = useState<{ type: 'income' | 'expense'; index: number } | null>(null);

  const chartData = useMemo(() => {
    // Get period totals
    const periodTotals = getPeriodTotals(
      periodType,
      periodType === 'year' ? selectedYear : undefined,
      periodType === 'range' ? startMonth : undefined,
      periodType === 'range' ? endMonth : undefined
    );

    // Collect income subcategories data
    const incomeSubcategoryTotals: Record<string, { amount: number; color: string; categoryName: string }> = {};

    // Collect expense categories data
    const expenseCategoryTotals: Record<string, { amount: number; color: string }> = {};

    // Iterate through monthlyData
    for (const [month, data] of monthlyData) {
      // Filter by period
      if (periodType === 'year' && selectedYear) {
        const dataYear = parseInt(month.split('-')[0]);
        if (dataYear !== selectedYear) continue;
      }
      if (periodType === 'range' && startMonth && endMonth) {
        if (month < startMonth || month > endMonth) continue;
      }

      // Process income subcategories
      for (const [categoryId, categoryData] of Object.entries(data.income)) {
        const category = categories.categories.income.find((c) => c.id === categoryId);
        if (!category) continue;

        if (typeof categoryData === 'object' && categoryData !== null) {
          // Has subcategories
          for (const [subId, amount] of Object.entries(categoryData)) {
            const subcategory = category.subcategories?.find((s) => s.id === subId);
            const key = `${categoryId}_${subId}`;
            if (!incomeSubcategoryTotals[key]) {
              incomeSubcategoryTotals[key] = {
                amount: 0,
                color: category.color,
                categoryName: `${subcategory?.name || subId}`,
              };
            }
            incomeSubcategoryTotals[key].amount += amount;
          }
        } else if (typeof categoryData === 'number') {
          // No subcategories
          if (!incomeSubcategoryTotals[categoryId]) {
            incomeSubcategoryTotals[categoryId] = {
              amount: 0,
              color: category.color,
              categoryName: category.name,
            };
          }
          incomeSubcategoryTotals[categoryId].amount += categoryData;
        }
      }

      // Process expense categories
      for (const [categoryId, categoryData] of Object.entries(data.expense)) {
        const category = categories.categories.expense.find((c) => c.id === categoryId);
        if (!category) continue;

        let total = 0;
        if (typeof categoryData === 'object' && categoryData !== null) {
          total = Object.values(categoryData).reduce((sum, val) => sum + val, 0);
        } else if (typeof categoryData === 'number') {
          total = categoryData;
        }

        if (!expenseCategoryTotals[categoryId]) {
          expenseCategoryTotals[categoryId] = {
            amount: 0,
            color: category.color,
          };
        }
        expenseCategoryTotals[categoryId].amount += total;
      }
    }

    // Calculate totals
    const totalIncome = periodTotals.income;
    const totalExpense = periodTotals.expense;
    const maxAmount = Math.max(totalIncome, totalExpense);

    // Prepare income segments
    const incomeSegments: SegmentData[] = Object.entries(incomeSubcategoryTotals)
      .filter(([_, data]) => data.amount > 0)
      .map(([key, data]) => ({
        name: data.categoryName,
        value: data.amount,
        color: data.color,
        percentage: totalIncome > 0 ? (data.amount / totalIncome) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);

    // Prepare expense segments
    const expenseSegments: SegmentData[] = Object.entries(expenseCategoryTotals)
      .filter(([_, data]) => data.amount > 0)
      .map(([categoryId, data]) => {
        const category = categories.categories.expense.find((c) => c.id === categoryId);
        return {
          name: category?.name || categoryId,
          value: data.amount,
          color: data.color,
          percentage: totalExpense > 0 ? (data.amount / totalExpense) * 100 : 0,
        };
      })
      .sort((a, b) => b.value - a.value);

    // Calculate bar width percentages relative to the larger amount
    const incomeBarWidth = maxAmount > 0 ? (totalIncome / maxAmount) * 100 : 0;
    const expenseBarWidth = maxAmount > 0 ? (totalExpense / maxAmount) * 100 : 0;

    return { incomeSegments, expenseSegments, totalIncome, totalExpense, incomeBarWidth, expenseBarWidth };
  }, [categories, monthlyData, periodType, selectedYear, startMonth, endMonth, getPeriodTotals]);

  if (chartData.incomeSegments.length === 0 && chartData.expenseSegments.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-muted-foreground">
        データがありません
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Income Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-green-600">収入</h4>
          <span className="text-sm font-bold text-green-600">
            {formatCurrency(chartData.totalIncome)}
          </span>
        </div>
        <div className="relative h-4 rounded-full bg-muted">
          <div
            className="flex h-4 rounded-full overflow-hidden"
            style={{ width: `${chartData.incomeBarWidth}%` }}
          >
            {chartData.incomeSegments.map((segment, index) => (
              <div
                key={index}
                className="transition-opacity hover:opacity-80 cursor-pointer"
                style={{
                  width: `${segment.percentage}%`,
                  backgroundColor: segment.color,
                }}
                onMouseEnter={() => setHoveredSegment({ type: 'income', index })}
                onMouseLeave={() => setHoveredSegment(null)}
              />
            ))}
          </div>
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs">
          {chartData.incomeSegments.map((segment, index) => (
            <div
              key={index}
              className={`flex items-center gap-1.5 transition-opacity ${
                hoveredSegment && hoveredSegment.type === 'income' && hoveredSegment.index === index
                  ? 'opacity-100'
                  : hoveredSegment && hoveredSegment.type === 'income'
                  ? 'opacity-40'
                  : 'opacity-100'
              }`}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: segment.color }}
              />
              <span className="text-muted-foreground">
                {segment.name} {segment.percentage.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Expense Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-red-600">支出</h4>
          <span className="text-sm font-bold text-red-600">
            {formatCurrency(chartData.totalExpense)}
          </span>
        </div>
        <div className="relative h-4 rounded-full bg-muted">
          <div
            className="flex h-4 rounded-full overflow-hidden"
            style={{ width: `${chartData.expenseBarWidth}%` }}
          >
            {chartData.expenseSegments.map((segment, index) => (
              <div
                key={index}
                className="transition-opacity hover:opacity-80 cursor-pointer"
                style={{
                  width: `${segment.percentage}%`,
                  backgroundColor: segment.color,
                }}
                onMouseEnter={() => setHoveredSegment({ type: 'expense', index })}
                onMouseLeave={() => setHoveredSegment(null)}
              />
            ))}
          </div>
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs">
          {chartData.expenseSegments.map((segment, index) => (
            <div
              key={index}
              className={`flex items-center gap-1.5 transition-opacity ${
                hoveredSegment && hoveredSegment.type === 'expense' && hoveredSegment.index === index
                  ? 'opacity-100'
                  : hoveredSegment && hoveredSegment.type === 'expense'
                  ? 'opacity-40'
                  : 'opacity-100'
              }`}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: segment.color }}
              />
              <span className="text-muted-foreground">
                {segment.name} {segment.percentage.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
