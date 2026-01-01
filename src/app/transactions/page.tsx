'use client';

import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, ArrowRight, ArrowRightLeft, CheckCircle2, Wallet, GitBranch } from 'lucide-react';
import { Header } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  DialogFooter,
} from '@/components/ui/dialog';
import { useLedgerStore } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';
import { getCategoryTotal } from '@/lib/schemas';
import { AccountFlowDiagram } from '@/components/charts/account-flow-diagram';
import type { Category, CategoryAmount, Transfer } from '@/lib/schemas';

interface CategoryInputProps {
  category: Category;
  type: 'income' | 'expense';
  value: CategoryAmount | undefined;
  onChange: (amount: CategoryAmount) => void;
}

function CategoryInput({ category, type, value, onChange }: CategoryInputProps) {
  const [expanded, setExpanded] = useState(false);
  const hasSubcategories = category.subcategories.length > 0;

  // Determine if value is a breakdown (object) or simple number
  const isBreakdown = value !== undefined && typeof value === 'object';
  const total = value ? getCategoryTotal(value) : 0;

  const handleTotalChange = (newTotal: string) => {
    const numValue = parseFloat(newTotal) || 0;
    if (hasSubcategories && isBreakdown) {
      // Keep breakdown structure but scale proportionally
      const currentTotal = total || 1;
      const scale = numValue / currentTotal;
      const newBreakdown: Record<string, number> = {};
      for (const [key, val] of Object.entries(value as Record<string, number>)) {
        newBreakdown[key] = Math.round(val * scale);
      }
      onChange(newBreakdown);
    } else {
      onChange(numValue);
    }
  };

  const handleSubcategoryChange = (subcatId: string, amount: string) => {
    const numValue = parseFloat(amount) || 0;
    const currentBreakdown = isBreakdown ? (value as Record<string, number>) : {};
    const newBreakdown = {
      ...currentBreakdown,
      [subcatId]: numValue,
    };
    // Remove zero values
    if (numValue === 0) {
      delete newBreakdown[subcatId];
    }
    // If all zero, set to 0
    if (Object.keys(newBreakdown).length === 0) {
      onChange(0);
    } else {
      onChange(newBreakdown);
    }
  };

  const toggleExpand = () => {
    if (!expanded && !isBreakdown && hasSubcategories) {
      // When expanding with a simple number, convert to breakdown
      const breakdown: Record<string, number> = {};
      if (total > 0) {
        // Put all in first subcategory by default
        breakdown[category.subcategories[0].id] = total;
      }
      onChange(breakdown);
    }
    setExpanded(!expanded);
  };

  return (
    <div className="border rounded-lg p-3">
      <div className="flex items-center gap-3">
        {hasSubcategories ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={toggleExpand}
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        ) : (
          <div className="w-6" />
        )}
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: category.color }}
        />
        <span className="flex-1 font-medium">{category.name}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">¥</span>
          <Input
            type="number"
            className="w-32 text-right"
            value={total || ''}
            onChange={(e) => handleTotalChange(e.target.value)}
            placeholder="0"
          />
        </div>
      </div>

      {expanded && hasSubcategories && (
        <div className="mt-3 ml-9 space-y-2 border-l-2 pl-4">
          {category.subcategories.map((subcat) => {
            const subcatValue = isBreakdown
              ? (value as Record<string, number>)[subcat.id] || 0
              : 0;
            return (
              <div key={subcat.id} className="flex items-center gap-3">
                <span className="flex-1 text-sm text-muted-foreground">
                  {subcat.name}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">¥</span>
                  <Input
                    type="number"
                    className="w-28 text-right text-sm"
                    value={subcatValue || ''}
                    onChange={(e) => handleSubcategoryChange(subcat.id, e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function TransactionsPage() {
  const {
    currentMonth,
    categories,
    accounts,
    getMonthlyData,
    setIncome,
    setExpense,
    addTransfer,
    removeTransfer,
    getTotalIncome,
    getTotalExpense,
    getMonthlyBalance,
    getAccountBalancesUpToMonth,
  } = useLedgerStore();

  const monthlyData = getMonthlyData(currentMonth);
  const totalIncome = getTotalIncome(currentMonth);
  const totalExpense = getTotalExpense(currentMonth);
  const balance = totalIncome - totalExpense;
  const monthlyBalance = getMonthlyBalance(currentMonth);
  const hasSaveAccount = accounts.accounts.some(a => a.id === 'save');
  const hasAccountMain = accounts.accounts.some(a => a.id === 'account');
  const accountBalances = getAccountBalancesUpToMonth(currentMonth);
  const totalAssets = Object.values(accountBalances).reduce((sum, b) => sum + b, 0);

  // Calculate expense by account based on flowRules
  const expenseByAccount: Record<string, number> = {};
  for (const [categoryId, amount] of Object.entries(monthlyData.expense)) {
    const rule = accounts.flowRules.expense[categoryId];
    const fromAccount = rule?.fromAccount || 'account';
    const expenseAmount = getCategoryTotal(amount);
    expenseByAccount[fromAccount] = (expenseByAccount[fromAccount] || 0) + expenseAmount;
  }

  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [newTransfer, setNewTransfer] = useState<Partial<Transfer>>({
    from: '',
    to: '',
    amount: 0,
    note: '',
  });

  const handleAddTransfer = () => {
    if (newTransfer.from && newTransfer.to && newTransfer.amount && newTransfer.amount > 0) {
      addTransfer({
        from: newTransfer.from,
        to: newTransfer.to,
        amount: newTransfer.amount,
        note: newTransfer.note,
      });
      setNewTransfer({ from: '', to: '', amount: 0, note: '' });
      setTransferDialogOpen(false);
    }
  };

  const getAccountName = (accountId: string) => {
    return accounts.accounts.find((a) => a.id === accountId)?.name || accountId;
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="月次収支" />

      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                収入合計
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                +{formatCurrency(totalIncome)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                支出合計
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">
                -{formatCurrency(totalExpense)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                収支
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className={`text-2xl font-bold ${
                  balance >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {balance >= 0 ? '+' : ''}
                {formatCurrency(balance)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Month-end Settlement Card */}
        {hasSaveAccount && hasAccountMain && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4" />
                月末精算
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    収支バランス（pool除く）
                  </p>
                  <p className={`text-xl font-bold ${monthlyBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {monthlyBalance >= 0 ? '+' : ''}{formatCurrency(monthlyBalance)}
                  </p>
                </div>
                <div className="text-right">
                  {monthlyBalance >= 0 ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <div>
                        <p className="text-sm font-medium">黒字</p>
                        <p className="text-xs text-muted-foreground">saveへ自動振替</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-red-600">
                      <ArrowRightLeft className="h-4 w-4" />
                      <div>
                        <p className="text-sm font-medium">赤字</p>
                        <p className="text-xs text-muted-foreground">saveから自動補填</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Account Balances at Month End */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                月末時点の口座残高
              </div>
              <span className="text-base font-bold">
                {formatCurrency(totalAssets)}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {accounts.accounts.map((account) => {
                const balance = accountBalances[account.id] || 0;
                return (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: account.color }}
                      />
                      <span className="text-sm">{account.name}</span>
                    </div>
                    <span className={`text-sm font-medium ${balance < 0 ? 'text-red-600' : ''}`}>
                      {formatCurrency(balance)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Money Flow Diagram */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              今月のお金の流れ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AccountFlowDiagram
              accounts={accounts.accounts}
              transfers={monthlyData.transfers}
              totalIncome={totalIncome}
              monthlyBalance={monthlyBalance}
              accountBalances={accountBalances}
              expenseByAccount={expenseByAccount}
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-6">
          {/* Income */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                収入
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {categories.categories.income.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  収入カテゴリがありません
                </p>
              ) : (
                categories.categories.income.map((category) => (
                  <CategoryInput
                    key={category.id}
                    category={category}
                    type="income"
                    value={monthlyData.income[category.id]}
                    onChange={(amount) => setIncome(category.id, amount)}
                  />
                ))
              )}
            </CardContent>
          </Card>

          {/* Expense */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                支出
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {categories.categories.expense.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  支出カテゴリがありません
                </p>
              ) : (
                categories.categories.expense.map((category) => (
                  <CategoryInput
                    key={category.id}
                    category={category}
                    type="expense"
                    value={monthlyData.expense[category.id]}
                    onChange={(amount) => setExpense(category.id, amount)}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Transfers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              振替
            </CardTitle>
            <Button size="sm" onClick={() => setTransferDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              追加
            </Button>
          </CardHeader>
          <CardContent>
            {monthlyData.transfers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                振替がありません
              </p>
            ) : (
              <div className="space-y-2">
                {monthlyData.transfers.map((transfer, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 border rounded-lg"
                  >
                    <span className="font-medium">{getAccountName(transfer.from)}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{getAccountName(transfer.to)}</span>
                    <span className="flex-1 text-sm text-muted-foreground">
                      {transfer.note}
                    </span>
                    <span className="font-medium">{formatCurrency(transfer.amount)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm('この振替を削除しますか？')) {
                          removeTransfer(index);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transfer Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>振替を追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>振替元</Label>
              <Select
                value={newTransfer.from}
                onValueChange={(value) =>
                  setNewTransfer((prev) => ({ ...prev, from: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="口座を選択" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>振替先</Label>
              <Select
                value={newTransfer.to}
                onValueChange={(value) =>
                  setNewTransfer((prev) => ({ ...prev, to: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="口座を選択" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.accounts
                    .filter((a) => a.id !== newTransfer.from)
                    .map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>金額</Label>
              <Input
                type="number"
                value={newTransfer.amount || ''}
                onChange={(e) =>
                  setNewTransfer((prev) => ({
                    ...prev,
                    amount: parseFloat(e.target.value) || 0,
                  }))
                }
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>メモ</Label>
              <Input
                value={newTransfer.note || ''}
                onChange={(e) =>
                  setNewTransfer((prev) => ({ ...prev, note: e.target.value }))
                }
                placeholder="任意"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleAddTransfer}>追加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
