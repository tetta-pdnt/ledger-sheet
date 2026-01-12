'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
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
  categoryId?: string;
  subcategories?: SubcategoryData[];
}

interface SubcategoryData {
  name: string;
  value: number;
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
  const [hoveredCategory, setHoveredCategory] = useState<{
    categoryId: string;
    name: string;
    color: string;
    subcategories: SubcategoryData[];
    position: { x: number; y: number };
  } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipPlacement, setTooltipPlacement] = useState<'top' | 'bottom'>('top');

  // Adjust tooltip position to prevent overflow
  useEffect(() => {
    if (hoveredCategory && tooltipRef.current) {
      const tooltipHeight = tooltipRef.current.offsetHeight;
      const viewportHeight = window.innerHeight;
      const spaceAbove = hoveredCategory.position.y;
      const spaceBelow = viewportHeight - hoveredCategory.position.y;

      // If tooltip doesn't fit above and there's more space below, show below
      if (spaceAbove < tooltipHeight + 20 && spaceBelow > spaceAbove) {
        setTooltipPlacement('bottom');
      } else {
        setTooltipPlacement('top');
      }
    }
  }, [hoveredCategory]);

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

    // Collect expense categories data with subcategories
    const expenseCategoryTotals: Record<string, {
      amount: number;
      color: string;
      subcategories: Record<string, { amount: number; name: string }>;
    }> = {};

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

      // Process expense categories with subcategories
      for (const [categoryId, categoryData] of Object.entries(data.expense)) {
        const category = categories.categories.expense.find((c) => c.id === categoryId);
        if (!category) continue;

        if (!expenseCategoryTotals[categoryId]) {
          expenseCategoryTotals[categoryId] = {
            amount: 0,
            color: category.color,
            subcategories: {},
          };
        }

        if (typeof categoryData === 'object' && categoryData !== null) {
          // Has subcategories
          for (const [subId, amount] of Object.entries(categoryData)) {
            const subcategory = category.subcategories?.find((s) => s.id === subId);
            if (!expenseCategoryTotals[categoryId].subcategories[subId]) {
              expenseCategoryTotals[categoryId].subcategories[subId] = {
                amount: 0,
                name: subcategory?.name || subId,
              };
            }
            expenseCategoryTotals[categoryId].subcategories[subId].amount += amount;
            expenseCategoryTotals[categoryId].amount += amount;
          }
        } else if (typeof categoryData === 'number') {
          // No subcategories
          expenseCategoryTotals[categoryId].amount += categoryData;
        }
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

    // Prepare expense segments with subcategories
    const expenseSegments: SegmentData[] = Object.entries(expenseCategoryTotals)
      .filter(([_, data]) => data.amount > 0)
      .map(([categoryId, data]) => {
        const category = categories.categories.expense.find((c) => c.id === categoryId);
        const subcategories: SubcategoryData[] = Object.entries(data.subcategories)
          .map(([subId, subData]) => ({
            name: subData.name,
            value: subData.amount,
            percentage: data.amount > 0 ? (subData.amount / data.amount) * 100 : 0,
          }))
          .sort((a, b) => b.value - a.value);

        return {
          name: category?.name || categoryId,
          value: data.amount,
          color: data.color,
          percentage: totalExpense > 0 ? (data.amount / totalExpense) * 100 : 0,
          categoryId,
          subcategories: subcategories.length > 0 ? subcategories : undefined,
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
    <div className="space-y-4">
      {/* Income Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-green-600">収入</h4>
          <span className="text-sm font-bold text-green-600">
            {formatCurrency(chartData.totalIncome)}
          </span>
        </div>
        <div className="relative h-3 rounded-full bg-muted">
          <div
            className="flex h-3 rounded-full overflow-hidden"
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
        <div className="relative h-3 rounded-full bg-muted">
          <div
            className="flex h-3 rounded-full overflow-hidden"
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
                onMouseEnter={(e) => {
                  setHoveredSegment({ type: 'expense', index });
                  if (segment.categoryId && segment.subcategories) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setHoveredCategory({
                      categoryId: segment.categoryId,
                      name: segment.name,
                      color: segment.color,
                      subcategories: segment.subcategories,
                      position: { x: rect.left + rect.width / 2, y: rect.top },
                    });
                  }
                }}
                onMouseLeave={() => {
                  setHoveredSegment(null);
                  setHoveredCategory(null);
                }}
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
              onMouseEnter={(e) => {
                setHoveredSegment({ type: 'expense', index });
                if (segment.categoryId && segment.subcategories) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setHoveredCategory({
                    categoryId: segment.categoryId,
                    name: segment.name,
                    color: segment.color,
                    subcategories: segment.subcategories,
                    position: { x: rect.left + rect.width / 2, y: rect.bottom },
                  });
                }
              }}
              onMouseLeave={() => {
                setHoveredSegment(null);
                setHoveredCategory(null);
              }}
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

      {/* Tooltip with Pie Chart */}
      {hoveredCategory && typeof document !== 'undefined' && createPortal(
        <div
          ref={tooltipRef}
          className="fixed z-50 pointer-events-none"
          style={{
            left: `${hoveredCategory.position.x}px`,
            top: tooltipPlacement === 'top'
              ? `${hoveredCategory.position.y - 10}px`
              : `${hoveredCategory.position.y + 10}px`,
            transform: tooltipPlacement === 'top'
              ? 'translate(-50%, -100%)'
              : 'translate(0%, -80%)',
            maxHeight: '80vh',
          }}
        >
          <div className="bg-card border border-border rounded-lg shadow-xl p-3 max-h-[80vh] overflow-y-auto">
            <p className="text-sm font-semibold text-card-foreground">{hoveredCategory.name}</p>
            <div className="w-48 h-38">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={hoveredCategory.subcategories.map((sub) => ({
                      name: sub.name,
                      value: sub.value,
                    }))}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    innerRadius={30}
                    stroke="var(--color-card)"
                  >
                    {hoveredCategory.subcategories.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={hoveredCategory.color}
                        opacity={1 - index * 0.15}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 space-y-1">
              {hoveredCategory.subcategories.map((sub, index) => (
                <div key={index} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: hoveredCategory.color,
                        opacity: 1 - index * 0.15,
                      }}
                    />
                    <span className="text-muted-foreground">{sub.name}</span>
                  </div>
                  <span className="font-medium text-card-foreground">{sub.percentage.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
