'use client';

import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, ArrowRightLeft, CheckCircle2 } from 'lucide-react';
import { Header } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StackedAreaChart } from '@/components/charts/stacked-area-chart';
import { useLedgerStore } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';
import { getCategoryTotal } from '@/lib/schemas';

export default function DashboardPage() {
  const {
    currentMonth,
    categories,
    accounts,
    getTotalIncome,
    getTotalExpense,
    getMonthlyData,
    getCalculatedAccountBalances,
    getMonthlyBalance,
  } = useLedgerStore();

  const totalIncome = getTotalIncome(currentMonth);
  const totalExpense = getTotalExpense(currentMonth);
  const balance = totalIncome - totalExpense;
  const monthlyData = getMonthlyData(currentMonth);

  // Get dynamically calculated account balances
  const calculatedBalances = getCalculatedAccountBalances();
  const totalBalance = Object.values(calculatedBalances).reduce((sum, bal) => sum + bal, 0);

  // Monthly balance for current month (auto-settled to save)
  const monthlyBalance = getMonthlyBalance(currentMonth);
  const hasSaveAccount = accounts.accounts.some(a => a.id === 'save');
  const hasAccountMain = accounts.accounts.some(a => a.id === 'account');

  // Get top expense categories
  const topExpenses = Object.entries(monthlyData.expense)
    .map(([categoryId, amount]) => {
      const category = categories.categories.expense.find((c) => c.id === categoryId);
      return {
        id: categoryId,
        name: category?.name || categoryId,
        color: category?.color || '#6B7280',
        amount: getCategoryTotal(amount),
      };
    })
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  // Get top income categories
  const topIncomes = Object.entries(monthlyData.income)
    .map(([categoryId, amount]) => {
      const category = categories.categories.income.find((c) => c.id === categoryId);
      return {
        id: categoryId,
        name: category?.name || categoryId,
        color: category?.color || '#6B7280',
        amount: getCategoryTotal(amount),
      };
    })
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return (
    <div className="flex flex-col h-full">
      <Header title="ダッシュボード" />

      <div className="flex-1 p-6 space-y-6 overflow-auto">
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
              <p className="text-xs text-muted-foreground">今月の総収入</p>
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
              <p className="text-xs text-muted-foreground">今月の総支出</p>
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
              <p className="text-xs text-muted-foreground">収入 - 支出</p>
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

        {/* Month-end Settlement Card */}
        {hasSaveAccount && hasAccountMain && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5" />
                月末精算
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    今月の収支（pool除く）
                  </p>
                  <p className={`text-2xl font-bold ${monthlyBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {monthlyBalance >= 0 ? '+' : ''}{formatCurrency(monthlyBalance)}
                  </p>
                </div>
                <div className="text-right space-y-1">
                  {monthlyBalance >= 0 ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="h-5 w-5" />
                      <div>
                        <p className="font-medium">黒字</p>
                        <p className="text-xs text-muted-foreground">
                          saveへ自動振替
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-red-600">
                      <ArrowRightLeft className="h-5 w-5" />
                      <div>
                        <p className="font-medium">赤字</p>
                        <p className="text-xs text-muted-foreground">
                          saveから自動補填
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stacked Area Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">支出推移</CardTitle>
              <p className="text-sm text-muted-foreground">
                過去6ヶ月のカテゴリ別支出
              </p>
            </CardHeader>
            <CardContent>
              <StackedAreaChart type="expense" months={6} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">収入推移</CardTitle>
              <p className="text-sm text-muted-foreground">
                過去6ヶ月のカテゴリ別収入
              </p>
            </CardHeader>
            <CardContent>
              <StackedAreaChart type="income" months={6} />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>支出内訳</CardTitle>
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

          <Card>
            <CardHeader>
              <CardTitle>収入内訳</CardTitle>
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
                    const balance = calculatedBalances[account.id] || 0;
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
                        <div className={`text-sm font-medium ${balance < 0 ? 'text-red-600' : ''}`}>
                          {formatCurrency(balance)}
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
