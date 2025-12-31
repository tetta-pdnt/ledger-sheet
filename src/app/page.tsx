'use client';

import { useMemo } from 'react';
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp } from 'lucide-react';
import { Header } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLedgerStore } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';

export default function DashboardPage() {
  const { currentMonth, accounts, getMonthlyTransactions } = useLedgerStore();
  const transactions = getMonthlyTransactions(currentMonth);

  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;

    transactions.forEach((tx) => {
      if (tx.type === 'income') {
        income += tx.amount;
      } else if (tx.type === 'expense') {
        expense += tx.amount;
      }
    });

    return {
      income,
      expense,
      balance: income - expense,
      transactionCount: transactions.length,
    };
  }, [transactions]);

  const totalBalance = useMemo(() => {
    return accounts.accounts.reduce((sum, account) => {
      return sum + account.initialBalance;
    }, 0);
  }, [accounts]);

  return (
    <div className="flex flex-col h-full">
      <Header title="ダッシュボード" />

      <div className="flex-1 p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">収入</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.income)}
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
                {formatCurrency(stats.expense)}
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
                  stats.balance >= 0 ? 'text-blue-600' : 'text-red-600'
                }`}
              >
                {formatCurrency(stats.balance)}
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

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>最近の取引</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  取引がありません。データフォルダを開いてください。
                </p>
              ) : (
                <div className="space-y-4">
                  {transactions.slice(-5).reverse().map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium">{tx.description || tx.category}</p>
                        <p className="text-xs text-muted-foreground">{tx.date}</p>
                      </div>
                      <div
                        className={`text-sm font-medium ${
                          tx.type === 'income'
                            ? 'text-green-600'
                            : tx.type === 'expense'
                            ? 'text-red-600'
                            : 'text-gray-600'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                        {formatCurrency(tx.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>口座残高</CardTitle>
            </CardHeader>
            <CardContent>
              {accounts.accounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  口座がありません。データフォルダを開いてください。
                </p>
              ) : (
                <div className="space-y-4">
                  {accounts.accounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: account.color }}
                        />
                        <p className="text-sm font-medium">{account.name}</p>
                      </div>
                      <div className="text-sm font-medium">
                        {formatCurrency(account.initialBalance)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
