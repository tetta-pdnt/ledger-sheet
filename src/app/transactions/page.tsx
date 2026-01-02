'use client';

import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, ArrowRight, ArrowRightLeft, CheckCircle2, Waves } from 'lucide-react';
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
import { getCategoryTotal, getActiveCategories, isActiveForMonth } from '@/lib/schemas';
import { AccountFlowDiagram } from '@/components/charts/account-flow-diagram';
import type { Category, CategoryAmount, Transfer } from '@/lib/schemas';

interface CategoryInputProps {
  category: Category;
  type: 'income' | 'expense';
  value: CategoryAmount | undefined;
  onChange: (amount: CategoryAmount) => void;
  currentMonth: string;
  expanded: boolean;
  onExpandChange: (expanded: boolean) => void;
}

// Freeform category input for pool-like categories
function FreeformCategoryInput({ category, value, onChange, currentMonth, expanded, onExpandChange }: Omit<CategoryInputProps, 'type'>) {
  const [newItemName, setNewItemName] = useState('');

  const isBreakdown = value !== undefined && typeof value === 'object';
  const total = value ? getCategoryTotal(value) : 0;
  const items = isBreakdown ? Object.entries(value as Record<string, number>) : [];

  const handleAddItem = () => {
    if (!newItemName.trim()) return;
    const currentBreakdown = isBreakdown ? (value as Record<string, number>) : {};
    onChange({
      ...currentBreakdown,
      [newItemName.trim()]: 0,
    });
    setNewItemName('');
  };

  const handleItemChange = (key: string, amount: string) => {
    const numValue = parseFloat(amount) || 0;
    const currentBreakdown = isBreakdown ? (value as Record<string, number>) : {};
    const newBreakdown = {
      ...currentBreakdown,
      [key]: numValue,
    };
    onChange(newBreakdown);
  };

  const handleRemoveItem = (key: string) => {
    if (!isBreakdown) return;
    const currentBreakdown = { ...(value as Record<string, number>) };
    delete currentBreakdown[key];
    if (Object.keys(currentBreakdown).length === 0) {
      onChange(0);
    } else {
      onChange(currentBreakdown);
    }
  };

  return (
    <div className="border rounded-lg p-3">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => onExpandChange(!expanded)}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
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
            readOnly
            placeholder="0"
          />
        </div>
      </div>

      {expanded && (
        <div className="mt-3 ml-9 space-y-2 border-l-2 pl-4">
          {items.map(([key, amount]) => (
            <div key={key} className="flex items-center gap-2">
              <span className="flex-1 text-sm text-muted-foreground truncate" title={key}>
                {key}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">¥</span>
                <Input
                  type="number"
                  className="w-28 text-right text-sm"
                  value={amount || ''}
                  onChange={(e) => handleItemChange(key, e.target.value)}
                  placeholder="0"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemoveItem(key)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
          {/* Add new item */}
          <div className="flex items-center gap-2 pt-2 border-t">
            <Input
              type="text"
              className="flex-1 text-sm"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  handleAddItem();
                }
              }}
              placeholder="項目名を入力..."
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddItem}
              disabled={!newItemName.trim()}
            >
              <Plus className="h-3 w-3 mr-1" />
              追加
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryInput({ category, value, onChange, currentMonth, expanded, onExpandChange }: CategoryInputProps) {
  // Use freeform input for pool category
  if (category.id === 'pool') {
    return <FreeformCategoryInput category={category} value={value} onChange={onChange} currentMonth={currentMonth} expanded={expanded} onExpandChange={onExpandChange} />;
  }

  // Filter subcategories by active period
  const activeSubcategories = category.subcategories.filter(sub => isActiveForMonth(sub, currentMonth));
  const hasSubcategories = activeSubcategories.length > 0;

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
        // Put all in first active subcategory by default
        breakdown[activeSubcategories[0].id] = total;
      }
      onChange(breakdown);
    }
    onExpandChange(!expanded);
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
          {activeSubcategories.map((subcat) => {
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
    getPoolYearlyReset,
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

  // Calculate income by account based on flowRules
  const incomeByAccount: Record<string, number> = {};
  for (const [categoryId, amount] of Object.entries(monthlyData.income)) {
    const rule = accounts.flowRules.income?.[categoryId];
    const toAccount = rule?.toAccount || 'account';
    const incomeAmount = getCategoryTotal(amount);
    incomeByAccount[toAccount] = (incomeByAccount[toAccount] || 0) + incomeAmount;
  }

  // Calculate expense by account based on flowRules
  const expenseByAccount: Record<string, number> = {};
  for (const [categoryId, amount] of Object.entries(monthlyData.expense)) {
    const rule = accounts.flowRules.expense[categoryId];
    const fromAccount = rule?.fromAccount || 'account';
    const expenseAmount = getCategoryTotal(amount);
    expenseByAccount[fromAccount] = (expenseByAccount[fromAccount] || 0) + expenseAmount;
  }

  const poolYearlyReset = getPoolYearlyReset(currentMonth);

  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [newTransfer, setNewTransfer] = useState<Partial<Transfer>>({
    from: '',
    to: '',
    amount: 0,
    note: '',
  });

  // Category expansion state
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const toggleAllCategories = (type: 'income' | 'expense', expand: boolean) => {
    const activeCategories = type === 'income'
      ? getActiveCategories(categories.categories.income, currentMonth)
      : getActiveCategories(categories.categories.expense, currentMonth);

    const newState = { ...expandedCategories };
    activeCategories.forEach(cat => {
      newState[cat.id] = expand;
    });
    setExpandedCategories(newState);
  };

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
        <div className="grid grid-cols-4 gap-4">
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
          {hasSaveAccount && hasAccountMain && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                  <ArrowRightLeft className="h-4 w-4" />
                  月末精算
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
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
                          <p className="text-xs text-muted-foreground">saveへ振替</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-600">
                        <ArrowRightLeft className="h-4 w-4" />
                        <div>
                          <p className="text-sm font-medium">赤字</p>
                          <p className="text-xs text-muted-foreground">saveから補填</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Income */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                収入
              </CardTitle>
              <Button
                size="icon"
                variant="outline"
                onClick={() => {
                  const allExpanded = getActiveCategories(categories.categories.income, currentMonth)
                    .every(cat => expandedCategories[cat.id]);
                  toggleAllCategories('income', !allExpanded);
                }}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {(() => {
                const activeIncomeCategories = getActiveCategories(categories.categories.income, currentMonth);
                return activeIncomeCategories.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    収入カテゴリがありません
                  </p>
                ) : (
                  activeIncomeCategories.map((category) => (
                    <CategoryInput
                      key={category.id}
                      category={category}
                      type="income"
                      value={monthlyData.income[category.id]}
                      onChange={(amount) => setIncome(category.id, amount)}
                      currentMonth={currentMonth}
                      expanded={expandedCategories[category.id] || false}
                      onExpandChange={(expanded) => setExpandedCategories({ ...expandedCategories, [category.id]: expanded })}
                    />
                  ))
                );
              })()}
            </CardContent>
          </Card>

          {/* Expense */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                支出
              </CardTitle>
              <Button
                size="icon"
                variant="outline"
                onClick={() => {
                  const allExpanded = getActiveCategories(categories.categories.expense, currentMonth)
                    .every(cat => expandedCategories[cat.id]);
                  toggleAllCategories('expense', !allExpanded);
                }}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {(() => {
                const activeExpenseCategories = getActiveCategories(categories.categories.expense, currentMonth);
                return activeExpenseCategories.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    支出カテゴリがありません
                  </p>
                ) : (
                  activeExpenseCategories.map((category) => (
                    <CategoryInput
                      key={category.id}
                      category={category}
                      type="expense"
                      value={monthlyData.expense[category.id]}
                      onChange={(amount) => setExpense(category.id, amount)}
                      currentMonth={currentMonth}
                      expanded={expandedCategories[category.id] || false}
                      onExpandChange={(expanded) => setExpandedCategories({ ...expandedCategories, [category.id]: expanded })}
                    />
                  ))
                );
              })()}
            </CardContent>
          </Card>

          {/* Transfers */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                振替
              </CardTitle>
              <Button size="icon" onClick={() => setTransferDialogOpen(true)}>
                <Plus className="h-4 w-4" />
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

        {/* Money Flow Diagram */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Waves className="h-4 w-4" />
              Flow
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
              incomeByAccount={incomeByAccount}
              poolYearlyReset={poolYearlyReset}
            />
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
