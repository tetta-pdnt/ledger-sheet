'use client';

import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, Text } from 'recharts';
import { useLedgerStore } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';

type PeriodType = 'all' | 'year' | 'range';

interface SemicircleComparisonChartProps {
  periodType: PeriodType;
  selectedYear?: number;
  startMonth?: string;
  endMonth?: string;
}

interface ChartDataItem {
  name: string;
  value: number;
  color: string;
}

export function SemicircleComparisonChart({
  periodType,
  selectedYear,
  startMonth,
  endMonth,
}: SemicircleComparisonChartProps) {
  const { categories, monthlyData, getPeriodTotals } = useLedgerStore();

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
    const balance = totalIncome - totalExpense;

    // Prepare inner circle data (income subcategories)
    const innerData: ChartDataItem[] = Object.entries(incomeSubcategoryTotals)
      .filter(([_, data]) => data.amount > 0)
      .map(([key, data]) => ({
        name: data.categoryName,
        value: data.amount,
        color: data.color,
      }));

    // Add balance to the side with less total
    if (balance > 0) {
      // Income > Expense, add "貯蓄" to inner circle
      innerData.push({
        name: '貯蓄',
        value: balance,
        color: '#10B981', // Green
      });
    }

    // Prepare outer circle data (expense categories)
    const outerData: ChartDataItem[] = Object.entries(expenseCategoryTotals)
      .filter(([_, data]) => data.amount > 0)
      .map(([categoryId, data]) => {
        const category = categories.categories.expense.find((c) => c.id === categoryId);
        return {
          name: category?.name || categoryId,
          value: data.amount,
          color: data.color,
        };
      });

    if (balance < 0) {
      // Expense > Income, add "赤字" to outer circle
      outerData.push({
        name: '赤字',
        value: Math.abs(balance),
        color: '#EF4444', // Red
      });
    }

    return { innerData, outerData, totalIncome, totalExpense };
  }, [categories, monthlyData, periodType, selectedYear, startMonth, endMonth, getPeriodTotals]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm" style={{ color: data.payload.color }}>
            {formatCurrency(data.value)}
          </p>
          <p className="text-xs text-muted-foreground">
            {((data.value / (data.payload.isInner ? chartData.totalIncome : chartData.totalExpense)) * 100).toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };



  if (chartData.innerData.length === 0 && chartData.outerData.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-muted-foreground">
        データがありません
      </div>
    );
  }

  return (
    <div className="h-96 relative">
      {/* Center text overlay */}
      <div className="absolute left-[46.25%] top-[80%] -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-10">
        <div className="text-sm text-muted-foreground mb-1">収入</div>
        <div className="text-lg font-bold text-green-600 mb-2">
          {formatCurrency(chartData.totalIncome)}
        </div>
        <div className="text-sm text-muted-foreground mb-1">支出</div>
        <div className="text-lg font-bold text-red-600">
          {formatCurrency(chartData.totalExpense)}
        </div>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          {/* Inner semicircle - Income subcategories */}
          <Pie
            data={chartData.innerData.map(d => ({ ...d, isInner: true }))}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="75%"
            startAngle={180}
            endAngle={0}
            innerRadius="35%"
            outerRadius="55%"
            stroke="none"
          >
            {chartData.innerData.map((entry, index) => (
              <Cell key={`inner-${index}`} fill={entry.color} stroke="none" />
            ))}
          </Pie>

          {/* Outer semicircle - Expense categories */}
          <Pie
            data={chartData.outerData.map(d => ({ ...d, isInner: false }))}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="75%"
            startAngle={180}
            endAngle={0}
            innerRadius="60%"
            outerRadius="80%"
            stroke="none"
          >
            {chartData.outerData.map((entry, index) => (
              <Cell key={`outer-${index}`} fill={entry.color} stroke="none" />
            ))}
          </Pie>

          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="middle"
            align="right"
            layout="vertical"
            iconSize={8}
            iconType="circle"
            wrapperStyle={{ paddingLeft: '24px', fontSize: '11px', lineHeight: '1.6' }}
            formatter={(value, entry: any) => {
              const percent = ((entry.payload.value / (entry.payload.isInner ? chartData.totalIncome : chartData.totalExpense)) * 100).toFixed(0);
              return `${value} ${percent}%`;
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
