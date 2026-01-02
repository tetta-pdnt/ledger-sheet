'use client';

import { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, Calendar, Filter } from 'lucide-react';
import { Header } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { StackedAreaChart } from '@/components/charts/stacked-area-chart';
import { useLedgerStore } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';

type PeriodType = 'all' | 'year' | 'range';

export default function DashboardPage() {
  const {
    categories,
    accounts,
    monthlyData,
    getCalculatedAccountBalances,
    getPeriodTotals,
    getAvailableYears,
  } = useLedgerStore();

  const [periodType, setPeriodType] = useState<PeriodType>('all');
  const availableYears = getAvailableYears();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Chart filters
  const [incomeCategories, setIncomeCategories] = useState<string[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<string[]>([]);
  const [startMonth, setStartMonth] = useState('');
  const [endMonth, setEndMonth] = useState('');

  const toggleCategory = (type: 'income' | 'expense', categoryId: string) => {
    if (type === 'income') {
      setIncomeCategories(prev =>
        prev.includes(categoryId)
          ? prev.filter(id => id !== categoryId)
          : [...prev, categoryId]
      );
    } else {
      setExpenseCategories(prev =>
        prev.includes(categoryId)
          ? prev.filter(id => id !== categoryId)
          : [...prev, categoryId]
      );
    }
  };

  // Get period totals based on selection
  const periodTotals = getPeriodTotals(
    periodType,
    periodType === 'year' ? selectedYear : undefined,
    periodType === 'range' ? startMonth : undefined,
    periodType === 'range' ? endMonth : undefined
  );
  const { income: totalIncome, expense: totalExpense, balance, months } = periodTotals;

  // Get dynamically calculated account balances
  const calculatedBalances = getCalculatedAccountBalances();
  const totalBalance = Object.values(calculatedBalances).reduce((sum, bal) => sum + bal, 0);

  // Calculate category totals for the period
  const getCategoryTotalsForPeriod = (type: 'income' | 'expense') => {
    const totals: Record<string, number> = {};

    for (const [month] of monthlyData) {
      // Filter by year if needed
      if (periodType === 'year') {
        const dataYear = parseInt(month.split('-')[0]);
        if (dataYear !== selectedYear) continue;
      }

      const data = monthlyData.get(month);
      if (!data) continue;

      const categoryData = type === 'income' ? data.income : data.expense;
      for (const [categoryId, amount] of Object.entries(categoryData)) {
        const value = typeof amount === 'number' ? amount : Object.values(amount).reduce((s, v) => s + v, 0);
        totals[categoryId] = (totals[categoryId] || 0) + value;
      }
    }

    return Object.entries(totals)
      .map(([categoryId, amount]) => {
        const categoryList = type === 'income' ? categories.categories.income : categories.categories.expense;
        const category = categoryList.find((c) => c.id === categoryId);
        return {
          id: categoryId,
          name: category?.name || categoryId,
          color: category?.color || '#6B7280',
          amount,
        };
      })
      .filter((item) => item.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  };

  const topExpenses = getCategoryTotalsForPeriod('expense');
  const topIncomes = getCategoryTotalsForPeriod('income');

  // Period label
  const periodLabel = periodType === 'all'
    ? '全期間'
    : `${selectedYear}年`;

  // Chart description based on period
  const chartDescription = periodType === 'all'
    ? '全期間のカテゴリ別'
    : `${selectedYear}年のカテゴリ別`;

  return (
    <div className="flex flex-col h-full">
      <Header title="ダッシュボード" showMonthPicker={false} />

      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Period Selector */}
        <div className="flex items-center gap-4">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <div className="flex gap-2">
            <Button
              variant={periodType === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriodType('all')}
            >
              全期間
            </Button>
            <Button
              variant={periodType === 'year' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriodType('year')}
            >
              年単位
            </Button>
            <Button
              variant={periodType === 'range' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriodType('range')}
            >
              範囲指定
            </Button>
          </div>
          {periodType === 'range' && (
            <>
              <Input
                type="month"
                value={startMonth}
                onChange={(e) => setStartMonth(e.target.value)}
                className="w-40"
                placeholder="開始月"
              />
              <span className="text-sm text-muted-foreground">〜</span>
              <Input
                type="month"
                value={endMonth}
                onChange={(e) => setEndMonth(e.target.value)}
                className="w-40"
                placeholder="終了月"
              />
            </>
          )}
          {periodType === 'year' && (
            <Select
              value={selectedYear.toString()}
              onValueChange={(v) => setSelectedYear(parseInt(v))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.length > 0 ? (
                  availableYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}年
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value={currentYear.toString()}>
                    {currentYear}年
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          )}
          <span className="text-sm text-muted-foreground">
            {months.length}ヶ月分のデータ
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">収入</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totalIncome)}
              </div>
              <p className="text-xs text-muted-foreground">{periodLabel}の総収入</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">支出</CardTitle>
              <ArrowDownRight className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(totalExpense)}
              </div>
              <p className="text-xs text-muted-foreground">{periodLabel}の総支出</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">収支</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  balance >= 0 ? 'text-blue-600' : 'text-red-600'
                }`}
              >
                {balance >= 0 ? '+' : ''}{formatCurrency(balance)}
              </div>
              <p className="text-xs text-muted-foreground">{periodLabel}の収支</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">総資産</CardTitle>
              <Wallet className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(totalBalance)}
              </div>
              <p className="text-xs text-muted-foreground">全口座の合計</p>
            </CardContent>
          </Card>
        </div>

        {/* Stacked Area Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-green-600">収入推移</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {chartDescription}収入
                </p>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>表示カテゴリ選択</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {categories.categories.income.map(cat => (
                      <div key={cat.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`income-${cat.id}`}
                          checked={incomeCategories.length === 0 || incomeCategories.includes(cat.id)}
                          onChange={() => toggleCategory('income', cat.id)}
                          className="h-4 w-4"
                        />
                        <label htmlFor={`income-${cat.id}`} className="flex items-center gap-2 cursor-pointer">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                          <span className="text-sm">{cat.name}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                  <Button onClick={() => setIncomeCategories([])} variant="outline" size="sm">
                    全て選択
                  </Button>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <StackedAreaChart
                type="income"
                periodType={periodType}
                selectedYear={selectedYear}
                startMonth={startMonth}
                endMonth={endMonth}
                selectedCategories={incomeCategories.length > 0 ? incomeCategories : undefined}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-red-600">支出推移</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {chartDescription}支出
                </p>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>表示カテゴリ選択</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {categories.categories.expense.map(cat => (
                      <div key={cat.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`expense-${cat.id}`}
                          checked={expenseCategories.length === 0 || expenseCategories.includes(cat.id)}
                          onChange={() => toggleCategory('expense', cat.id)}
                          className="h-4 w-4"
                        />
                        <label htmlFor={`expense-${cat.id}`} className="flex items-center gap-2 cursor-pointer">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                          <span className="text-sm">{cat.name}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                  <Button onClick={() => setExpenseCategories([])} variant="outline" size="sm">
                    全て選択
                  </Button>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <StackedAreaChart
                type="expense"
                periodType={periodType}
                selectedYear={selectedYear}
                startMonth={startMonth}
                endMonth={endMonth}
                selectedCategories={expenseCategories.length > 0 ? expenseCategories : undefined}
              />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>収入内訳（{periodLabel}）</CardTitle>
            </CardHeader>
            <CardContent>
              {topIncomes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  収入データがありません
                </p>
              ) : (
                <div className="space-y-4">
                  {topIncomes.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <p className="text-sm font-medium">{item.name}</p>
                      </div>
                      <div className="text-sm font-medium text-green-600">
                        +{formatCurrency(item.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>支出内訳（{periodLabel}）</CardTitle>
            </CardHeader>
            <CardContent>
              {topExpenses.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  支出データがありません
                </p>
              ) : (
                <div className="space-y-4">
                  {topExpenses.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <p className="text-sm font-medium">{item.name}</p>
                      </div>
                      <div className="text-sm font-medium text-red-600">
                        -{formatCurrency(item.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>口座残高</CardTitle>
            </CardHeader>
            <CardContent>
              {accounts.accounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  口座がありません。データフォルダを開いてください。
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {accounts.accounts.map((account) => {
                    const accountBalance = calculatedBalances[account.id] || 0;
                    return (
                      <div
                        key={account.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: account.color }}
                          />
                          <p className="text-sm font-medium">{account.name}</p>
                        </div>
                        <div className={`text-sm font-medium ${accountBalance < 0 ? 'text-red-600' : ''}`}>
                          {formatCurrency(accountBalance)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
