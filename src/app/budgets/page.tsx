'use client';

import { useState } from 'react';
import { Header } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useLedgerStore } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';

export default function BudgetsPage() {
  const {
    currentMonth,
    categories,
    budgets,
    getBudgetForCategory,
    getCategoryTotal,
    setBudget,
  } = useLedgerStore();

  const [editingBudget, setEditingBudget] = useState<{
    categoryId: string;
    value: string;
  } | null>(null);

  const expenseCategories = categories.categories.expense;

  const handleEditStart = (categoryId: string) => {
    const currentBudget = getBudgetForCategory(categoryId, currentMonth);
    setEditingBudget({ categoryId, value: currentBudget.toString() });
  };

  const handleEditSave = () => {
    if (!editingBudget) return;
    const amount = parseFloat(editingBudget.value) || 0;
    setBudget(editingBudget.categoryId, amount, currentMonth);
    setEditingBudget(null);
  };

  const handleEditCancel = () => {
    setEditingBudget(null);
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="予算" />

      <div className="flex-1 p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>カテゴリ別予算</CardTitle>
            <p className="text-sm text-muted-foreground">
              各カテゴリの予算と使用状況
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {expenseCategories.map((category) => {
                const budget = getBudgetForCategory(category.id, currentMonth);
                const spent = getCategoryTotal('expense', category.id, currentMonth);
                const percentage = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
                const remaining = budget - spent;
                const isOverBudget = spent > budget && budget > 0;

                return (
                  <div key={category.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="font-medium">{category.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-sm text-right">
                          <span className={isOverBudget ? 'text-red-600' : ''}>
                            {formatCurrency(spent)}
                          </span>
                          <span className="text-muted-foreground"> / </span>
                          {editingBudget?.categoryId === category.id ? (
                            <div className="inline-flex items-center gap-2">
                              <Input
                                type="number"
                                value={editingBudget.value}
                                onChange={(e) =>
                                  setEditingBudget({
                                    ...editingBudget,
                                    value: e.target.value,
                                  })
                                }
                                className="w-24 h-7 text-sm"
                                autoFocus
                              />
                              <Button size="sm" onClick={handleEditSave}>
                                保存
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleEditCancel}
                              >
                                キャンセル
                              </Button>
                            </div>
                          ) : (
                            <button
                              className="hover:underline"
                              onClick={() => handleEditStart(category.id)}
                            >
                              {budget > 0 ? formatCurrency(budget) : '未設定'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {budget > 0 && (
                      <>
                        <Progress
                          value={percentage}
                          className={isOverBudget ? '[&>div]:bg-red-500' : ''}
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{percentage.toFixed(0)}% 使用</span>
                          <span
                            className={isOverBudget ? 'text-red-600' : 'text-green-600'}
                          >
                            {isOverBudget
                              ? `${formatCurrency(Math.abs(remaining))} 超過`
                              : `${formatCurrency(remaining)} 残り`}
                          </span>
                        </div>
                      </>
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
      </div>
    </div>
  );
}
