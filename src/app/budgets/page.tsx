'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Pencil, Check, X, Calendar } from 'lucide-react';
import { Header } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useLedgerStore } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';
import { getActiveCategories, isActiveForMonth } from '@/lib/schemas';

// Format YYYY-MM to display format
function formatSettingsDate(date: string): string {
  const [year, month] = date.split('-');
  return `${year}年${parseInt(month)}月`;
}

// Editing state types
type EditingState = {
  type: 'baseSalary';
  value: string;
} | {
  type: 'subcategory';
  categoryId: string;
  subcategoryId: string;
  value: string;
} | {
  type: 'account';
  accountId: string;
  value: string;
} | null;

export default function BudgetsPage() {
  const {
    currentMonth,
    categories,
    accounts,
    getBaseSalary,
    setBaseSalary,
    getBudgetForCategory,
    getBudgetForSubcategory,
    setBudget,
    getCategoryTotal,
    getAccountAllocations,
    setAccountAllocation,
    getUnallocatedAmount,
    getTotalBudgetExpense,
    getBudgetSettingsDate,
  } = useLedgerStore();

  const [editing, setEditing] = useState<EditingState>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const expenseCategories = getActiveCategories(categories.categories.expense, currentMonth);
  const baseSalary = getBaseSalary(currentMonth);
  const totalExpenseBudget = getTotalBudgetExpense(currentMonth);
  const accountAllocations = getAccountAllocations(currentMonth);
  const totalAccountAllocations = Object.values(accountAllocations).reduce((sum, val) => sum + val, 0);
  const unallocatedAmount = getUnallocatedAmount(currentMonth);
  const allocatedAmount = totalExpenseBudget + totalAccountAllocations;
  const allocationPercentage = baseSalary > 0 ? Math.min((allocatedAmount / baseSalary) * 100, 100) : 0;
  const settingsDate = getBudgetSettingsDate(currentMonth);

  // Get accounts that can receive allocations (excluding 'account' which is the main one)
  const allocatableAccounts = accounts.accounts.filter(acc => acc.id !== 'account');

  const toggleCategoryExpanded = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleEditStart = (state: EditingState) => {
    setEditing(state);
  };

  const handleEditSave = () => {
    if (!editing) return;

    const amount = parseFloat(editing.value) || 0;

    if (editing.type === 'baseSalary') {
      setBaseSalary(amount);
    } else if (editing.type === 'subcategory') {
      // Get current budget for the category from history or legacy
      const state = useLedgerStore.getState();
      const defaultTemplate = state.budgets.templates['default'] || {};
      const expenseHistory = defaultTemplate.expenseHistory?.[editing.categoryId] || [];

      // Find the most recent applicable budget
      let existingBudget: number | Record<string, number> | undefined;
      for (const entry of expenseHistory) {
        if (entry.startMonth <= currentMonth) {
          existingBudget = entry.amount;
        } else {
          break;
        }
      }
      // Fallback to legacy expense if no history
      if (existingBudget === undefined) {
        existingBudget = defaultTemplate.expense?.[editing.categoryId];
      }

      // Build new subcategory breakdown
      let newBudget: Record<string, number>;
      if (typeof existingBudget === 'object' && existingBudget !== null) {
        newBudget = { ...existingBudget, [editing.subcategoryId]: amount };
      } else {
        newBudget = { [editing.subcategoryId]: amount };
      }

      setBudget(editing.categoryId, newBudget);
    } else if (editing.type === 'account') {
      setAccountAllocation(editing.accountId, amount);
    }

    setEditing(null);
  };

  const handleEditCancel = () => {
    setEditing(null);
  };

  // Get subcategory actual spending
  const getSubcategorySpent = (categoryId: string, subcategoryId: string): number => {
    const data = useLedgerStore.getState().getMonthlyData(currentMonth);
    const categoryAmount = data.expense[categoryId];
    if (!categoryAmount) return 0;
    if (typeof categoryAmount === 'number') return 0;
    return categoryAmount[subcategoryId] || 0;
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="予算" />

      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Settings Date Badge */}
        {settingsDate && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
            <Calendar className="h-4 w-4" />
            <span>
              {settingsDate === currentMonth
                ? '今月の設定'
                : `${formatSettingsDate(settingsDate)}時点の設定`}
            </span>
          </div>
        )}

        {/* Base Salary Card */}
        <Card>
          <CardHeader>
            <CardTitle>基本給与</CardTitle>
            <p className="text-sm text-muted-foreground">
              月の予算総額の基準となる給与
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">
                {editing?.type === 'baseSalary' ? (
                  <div className="inline-flex items-center gap-2">
                    <span className="text-muted-foreground text-base">¥</span>
                    <Input
                      type="number"
                      value={editing.value}
                      onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                      className="w-40 h-9 text-xl"
                      autoFocus
                    />
                    <Button size="icon" variant="ghost" onClick={handleEditSave}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={handleEditCancel}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <button
                    className="hover:underline flex items-center gap-2"
                    onClick={() => handleEditStart({ type: 'baseSalary', value: baseSalary.toString() })}
                  >
                    {baseSalary > 0 ? formatCurrency(baseSalary) : '未設定'}
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
              </span>
            </div>

            {baseSalary > 0 && (
              <>
                <Progress value={allocationPercentage} />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    分配済み: {formatCurrency(allocatedAmount)} ({allocationPercentage.toFixed(0)}%)
                  </span>
                  <span className={unallocatedAmount < 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                    {unallocatedAmount >= 0
                      ? `未分配: ${formatCurrency(unallocatedAmount)}`
                      : `超過: ${formatCurrency(Math.abs(unallocatedAmount))}`
                    }
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Category Budgets Card */}
        <Card>
          <CardHeader>
            <CardTitle>カテゴリ別予算</CardTitle>
            <p className="text-sm text-muted-foreground">
              サブカテゴリごとに予算を設定
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expenseCategories.map((category) => {
                const categoryBudget = getBudgetForCategory(category.id, currentMonth);
                const categorySpent = getCategoryTotal('expense', category.id, currentMonth);
                const isExpanded = expandedCategories.has(category.id);
                const hasSubcategories = category.subcategories.length > 0;

                return (
                  <div key={category.id} className="border rounded-lg p-3">
                    {/* Category Header */}
                    <div className="flex items-center gap-3">
                      {hasSubcategories ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => toggleCategoryExpanded(category.id)}
                        >
                          {isExpanded ? (
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
                      <div className="text-sm text-right">
                        <span className={categorySpent > categoryBudget && categoryBudget > 0 ? 'text-red-600' : ''}>
                          {formatCurrency(categorySpent)}
                        </span>
                        <span className="text-muted-foreground"> / </span>
                        <span>{categoryBudget > 0 ? formatCurrency(categoryBudget) : '未設定'}</span>
                      </div>
                    </div>

                    {/* Progress bar for category */}
                    {categoryBudget > 0 && (
                      <div className="mt-2 ml-9 flex items-center gap-2">
                        <Progress
                          value={Math.min((categorySpent / categoryBudget) * 100, 100)}
                          className={`flex-1 ${categorySpent > categoryBudget ? '[&>div]:bg-red-500' : ''}`}
                        />
                        <span className={`text-xs w-12 text-right ${categorySpent > categoryBudget ? 'text-red-600' : 'text-muted-foreground'}`}>
                          {((categorySpent / categoryBudget) * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}

                    {/* Subcategories */}
                    {isExpanded && hasSubcategories && (
                      <div className="mt-3 ml-9 space-y-2 border-l-2 pl-4">
                        {category.subcategories.map((subcategory) => {
                          const subcategoryBudget = getBudgetForSubcategory(category.id, subcategory.id, currentMonth);
                          const subcategorySpent = getSubcategorySpent(category.id, subcategory.id);
                          const isEditing = editing?.type === 'subcategory'
                            && editing.categoryId === category.id
                            && editing.subcategoryId === subcategory.id;
                          const subcatPercentage = subcategoryBudget > 0
                            ? Math.min((subcategorySpent / subcategoryBudget) * 100, 100)
                            : 0;
                          const isSubcatOverBudget = subcategorySpent > subcategoryBudget && subcategoryBudget > 0;

                          return (
                            <div key={subcategory.id} className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">{subcategory.name}</span>
                                <div className="flex items-center gap-2">
                                  {isEditing ? (
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs text-muted-foreground">¥</span>
                                      <Input
                                        type="number"
                                        value={editing.value}
                                        onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                                        className="w-24 h-7 text-sm"
                                        autoFocus
                                      />
                                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleEditSave}>
                                        <Check className="h-3 w-3" />
                                      </Button>
                                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleEditCancel}>
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <button
                                      className="text-sm hover:underline flex items-center gap-1"
                                      onClick={() => handleEditStart({
                                        type: 'subcategory',
                                        categoryId: category.id,
                                        subcategoryId: subcategory.id,
                                        value: subcategoryBudget.toString(),
                                      })}
                                    >
                                      <span className={isSubcatOverBudget ? 'text-red-600' : ''}>
                                        {formatCurrency(subcategorySpent)}
                                      </span>
                                      <span className="text-muted-foreground">/</span>
                                      <span>{subcategoryBudget > 0 ? formatCurrency(subcategoryBudget) : '未設定'}</span>
                                      <Pencil className="h-3 w-3 text-muted-foreground ml-1" />
                                    </button>
                                  )}
                                </div>
                              </div>
                              {subcategoryBudget > 0 && (
                                <div className="flex items-center gap-2">
                                  <Progress
                                    value={subcatPercentage}
                                    className={`h-2 flex-1 ${isSubcatOverBudget ? '[&>div]:bg-red-500' : ''}`}
                                  />
                                  <span className={`text-xs w-12 text-right ${isSubcatOverBudget ? 'text-red-600' : 'text-muted-foreground'}`}>
                                    {subcatPercentage.toFixed(0)}%
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {expenseCategories.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  支出カテゴリがありません
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Account Allocations Card */}
        <Card>
          <CardHeader>
            <CardTitle>口座への振替分配</CardTitle>
            <p className="text-sm text-muted-foreground">
              貯蓄・投資口座への月次振替予定額
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allocatableAccounts.map((account) => {
                const allocation = accountAllocations[account.id] || 0;
                const isEditing = editing?.type === 'account' && editing.accountId === account.id;

                return (
                  <div key={account.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: account.color }}
                      />
                      <span className="font-medium">{account.name}</span>
                      <span className="text-xs text-muted-foreground">({account.id})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-muted-foreground">¥</span>
                          <Input
                            type="number"
                            value={editing.value}
                            onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                            className="w-28 h-7 text-sm"
                            autoFocus
                          />
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleEditSave}>
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleEditCancel}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          className="text-sm hover:underline flex items-center gap-1"
                          onClick={() => handleEditStart({
                            type: 'account',
                            accountId: account.id,
                            value: allocation.toString(),
                          })}
                        >
                          {allocation > 0 ? formatCurrency(allocation) : '未設定'}
                          <Pencil className="h-3 w-3 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {allocatableAccounts.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  振替可能な口座がありません
                </p>
              )}

              {allocatableAccounts.length > 0 && (
                <div className="pt-3 border-t mt-4 flex justify-between text-sm font-medium">
                  <span>振替合計</span>
                  <span>{formatCurrency(totalAccountAllocations)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
