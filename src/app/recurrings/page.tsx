'use client';

import { useState } from 'react';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useLedgerStore } from '@/lib/store';
import { formatCurrency, generateId } from '@/lib/utils';
import { Plus, Trash2, ArrowRightLeft } from 'lucide-react';
import type { Recurring, RecurringTransfer } from '@/lib/schemas';

export default function RecurringsPage() {
  const {
    currentMonth,
    categories,
    accounts,
    recurrings,
    addRecurring,
    updateRecurring,
    deleteRecurring,
    addRecurringTransfer,
    updateRecurringTransfer,
    deleteRecurringTransfer,
    applyRecurrings,
  } = useLedgerStore();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [newRecurring, setNewRecurring] = useState<{
    name?: string;
    type: 'income' | 'expense';
    categoryId?: string;
    amount?: number;
    enabled: boolean;
    note?: string;
  }>({
    type: 'expense',
    enabled: true,
  });
  const [newTransfer, setNewTransfer] = useState<Partial<RecurringTransfer>>({
    enabled: true,
  });

  const incomeCategories = categories.categories.income;
  const expenseCategories = categories.categories.expense;
  const allAccounts = accounts.accounts;

  const handleAddRecurring = () => {
    if (!newRecurring.name || !newRecurring.categoryId || !newRecurring.amount) {
      return;
    }

    const recurring: Recurring = {
      id: generateId(),
      name: newRecurring.name,
      type: newRecurring.type,
      categoryId: newRecurring.categoryId,
      amount: newRecurring.amount,
      enabled: newRecurring.enabled,
      note: newRecurring.note,
    };

    addRecurring(recurring);
    setNewRecurring({ type: 'expense', enabled: true });
    setIsAddDialogOpen(false);
  };

  const handleAddTransfer = () => {
    if (!newTransfer.name || !newTransfer.from || !newTransfer.to || !newTransfer.amount) {
      return;
    }

    const transfer: RecurringTransfer = {
      id: generateId(),
      name: newTransfer.name,
      from: newTransfer.from,
      to: newTransfer.to,
      amount: Number(newTransfer.amount),
      enabled: newTransfer.enabled ?? true,
      note: newTransfer.note,
    };

    addRecurringTransfer(transfer);
    setNewTransfer({ enabled: true });
    setIsTransferDialogOpen(false);
  };

  const handleApplyRecurrings = () => {
    applyRecurrings(currentMonth);
  };

  const getCategoryName = (categoryId: string, type: 'income' | 'expense') => {
    const cats = type === 'income' ? incomeCategories : expenseCategories;
    return cats.find((c) => c.id === categoryId)?.name || categoryId;
  };

  const getAccountName = (accountId: string) => {
    return allAccounts.find((a) => a.id === accountId)?.name || accountId;
  };

  const incomeRecurrings = recurrings.items.filter((r) => r.type === 'income');
  const expenseRecurrings = recurrings.items.filter((r) => r.type === 'expense');

  return (
    <div className="flex flex-col h-full">
      <Header title="定期項目" />

      <div className="flex-1 p-6 space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            毎月固定で発生する収入・支出・振替を管理します
          </p>
          <Button onClick={handleApplyRecurrings}>
            {currentMonth}に適用
          </Button>
        </div>

        {/* Income Recurrings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-green-600">定期収入</CardTitle>
              <p className="text-sm text-muted-foreground">
                毎月発生する固定収入
              </p>
            </div>
            <Dialog open={isAddDialogOpen && newRecurring.type === 'income'} onOpenChange={(open) => {
              setIsAddDialogOpen(open);
              if (open) setNewRecurring({ type: 'income', enabled: true });
            }}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" />
                  追加
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>定期収入を追加</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>名前</Label>
                    <Input
                      value={newRecurring.name || ''}
                      onChange={(e) => setNewRecurring({ ...newRecurring, name: e.target.value })}
                      placeholder="例：給与"
                    />
                  </div>
                  <div>
                    <Label>カテゴリ</Label>
                    <Select
                      value={newRecurring.categoryId}
                      onValueChange={(v) => setNewRecurring({ ...newRecurring, categoryId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="カテゴリを選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {incomeCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>金額</Label>
                    <Input
                      type="number"
                      value={newRecurring.amount || ''}
                      onChange={(e) => setNewRecurring({ ...newRecurring, amount: Number(e.target.value) })}
                      placeholder="300000"
                    />
                  </div>
                  <div>
                    <Label>メモ（任意）</Label>
                    <Input
                      value={newRecurring.note || ''}
                      onChange={(e) => setNewRecurring({ ...newRecurring, note: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleAddRecurring} className="w-full">
                    追加
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {incomeRecurrings.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  定期収入はありません
                </p>
              ) : (
                incomeRecurrings.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-4">
                      <Switch
                        checked={item.enabled}
                        onCheckedChange={(checked) =>
                          updateRecurring(item.id, { enabled: checked })
                        }
                      />
                      <div className={!item.enabled ? 'opacity-50' : ''}>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {getCategoryName(item.categoryId, 'income')}
                          {item.note && ` - ${item.note}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-medium text-green-600">
                        +{formatCurrency(typeof item.amount === 'number' ? item.amount : 0)}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => deleteRecurring(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Expense Recurrings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-red-600">定期支出</CardTitle>
              <p className="text-sm text-muted-foreground">
                毎月発生する固定支出（家賃、サブスク等）
              </p>
            </div>
            <Dialog open={isAddDialogOpen && newRecurring.type === 'expense'} onOpenChange={(open) => {
              setIsAddDialogOpen(open);
              if (open) setNewRecurring({ type: 'expense', enabled: true });
            }}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" />
                  追加
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>定期支出を追加</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>名前</Label>
                    <Input
                      value={newRecurring.name || ''}
                      onChange={(e) => setNewRecurring({ ...newRecurring, name: e.target.value })}
                      placeholder="例：家賃"
                    />
                  </div>
                  <div>
                    <Label>カテゴリ</Label>
                    <Select
                      value={newRecurring.categoryId}
                      onValueChange={(v) => setNewRecurring({ ...newRecurring, categoryId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="カテゴリを選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {expenseCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>金額</Label>
                    <Input
                      type="number"
                      value={newRecurring.amount || ''}
                      onChange={(e) => setNewRecurring({ ...newRecurring, amount: Number(e.target.value) })}
                      placeholder="80000"
                    />
                  </div>
                  <div>
                    <Label>メモ（任意）</Label>
                    <Input
                      value={newRecurring.note || ''}
                      onChange={(e) => setNewRecurring({ ...newRecurring, note: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleAddRecurring} className="w-full">
                    追加
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expenseRecurrings.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  定期支出はありません
                </p>
              ) : (
                expenseRecurrings.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-4">
                      <Switch
                        checked={item.enabled}
                        onCheckedChange={(checked) =>
                          updateRecurring(item.id, { enabled: checked })
                        }
                      />
                      <div className={!item.enabled ? 'opacity-50' : ''}>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {getCategoryName(item.categoryId, 'expense')}
                          {item.note && ` - ${item.note}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-medium text-red-600">
                        -{formatCurrency(typeof item.amount === 'number' ? item.amount : 0)}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => deleteRecurring(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recurring Transfers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5" />
                定期振替
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                毎月行う口座間の振替
              </p>
            </div>
            <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" />
                  追加
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>定期振替を追加</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>名前</Label>
                    <Input
                      value={newTransfer.name || ''}
                      onChange={(e) => setNewTransfer({ ...newTransfer, name: e.target.value })}
                      placeholder="例：貯金"
                    />
                  </div>
                  <div>
                    <Label>振替元</Label>
                    <Select
                      value={newTransfer.from}
                      onValueChange={(v) => setNewTransfer({ ...newTransfer, from: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="口座を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {allAccounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>振替先</Label>
                    <Select
                      value={newTransfer.to}
                      onValueChange={(v) => setNewTransfer({ ...newTransfer, to: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="口座を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {allAccounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>金額</Label>
                    <Input
                      type="number"
                      value={newTransfer.amount || ''}
                      onChange={(e) => setNewTransfer({ ...newTransfer, amount: Number(e.target.value) })}
                      placeholder="50000"
                    />
                  </div>
                  <div>
                    <Label>メモ（任意）</Label>
                    <Input
                      value={newTransfer.note || ''}
                      onChange={(e) => setNewTransfer({ ...newTransfer, note: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleAddTransfer} className="w-full">
                    追加
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recurrings.transfers.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  定期振替はありません
                </p>
              ) : (
                recurrings.transfers.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-4">
                      <Switch
                        checked={item.enabled}
                        onCheckedChange={(checked) =>
                          updateRecurringTransfer(item.id, { enabled: checked })
                        }
                      />
                      <div className={!item.enabled ? 'opacity-50' : ''}>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {getAccountName(item.from)} → {getAccountName(item.to)}
                          {item.note && ` - ${item.note}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-medium">
                        {formatCurrency(item.amount)}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => deleteRecurringTransfer(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
