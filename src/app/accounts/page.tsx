'use client';

import { useState } from 'react';
import { Plus, Trash2, Pencil, Building, Wallet, CreditCard, TrendingUp } from 'lucide-react';
import { Header } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLedgerStore } from '@/lib/store';
import { formatCurrency, generateAccountId } from '@/lib/utils';
import type { Account, AccountType } from '@/lib/schemas';

const accountTypeLabels: Record<AccountType, string> = {
  bank: '銀行口座',
  credit: 'クレジットカード',
  cash: '現金',
  investment: '投資',
};

const accountTypeIcons: Record<AccountType, typeof Building> = {
  bank: Building,
  credit: CreditCard,
  cash: Wallet,
  investment: TrendingUp,
};

export default function AccountsPage() {
  const { accounts, addAccount, updateAccount, deleteAccount } = useLedgerStore();

  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const [formData, setFormData] = useState<{
    name: string;
    type: AccountType;
    color: string;
    initialBalance: string;
  }>({
    name: '',
    type: 'bank',
    color: '#2563EB',
    initialBalance: '0',
  });

  const handleAdd = () => {
    setEditingAccount(null);
    setFormData({
      name: '',
      type: 'bank',
      color: '#2563EB',
      initialBalance: '0',
    });
    setFormOpen(true);
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      type: account.type,
      color: account.color,
      initialBalance: account.initialBalance.toString(),
    });
    setFormOpen(true);
  };

  const handleDelete = (accountId: string) => {
    if (confirm('この口座を削除しますか？')) {
      deleteAccount(accountId);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const accountData: Account = {
      id: editingAccount?.id || generateAccountId(formData.name),
      name: formData.name,
      type: formData.type,
      icon: formData.type,
      color: formData.color,
      initialBalance: parseFloat(formData.initialBalance) || 0,
      currency: 'JPY',
    };

    if (editingAccount) {
      updateAccount(editingAccount.id, accountData);
    } else {
      addAccount(accountData);
    }

    setFormOpen(false);
  };

  const totalBalance = accounts.accounts.reduce(
    (sum, acc) => sum + acc.initialBalance,
    0
  );

  return (
    <div className="flex flex-col h-full">
      <Header title="口座" showMonthPicker={false} />

      <div className="flex-1 p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-muted-foreground">
              総資産: <span className="font-bold text-foreground">{formatCurrency(totalBalance)}</span>
            </p>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            新規口座
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.accounts.map((account) => {
            const Icon = accountTypeIcons[account.type];
            return (
              <Card key={account.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: account.color + '20' }}
                    >
                      <Icon className="h-4 w-4" style={{ color: account.color }} />
                    </div>
                    <div>
                      <CardTitle className="text-base">{account.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {accountTypeLabels[account.type]}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(account)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(account.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(account.initialBalance)}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {accounts.accounts.length === 0 && (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">口座がありません</p>
                <Button className="mt-4" onClick={handleAdd}>
                  <Plus className="h-4 w-4 mr-2" />
                  口座を追加
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAccount ? '口座を編集' : '新規口座'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>名前</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="口座名"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>種類</Label>
              <Select
                value={formData.type}
                onValueChange={(v) => setFormData({ ...formData, type: v as AccountType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">銀行口座</SelectItem>
                  <SelectItem value="credit">クレジットカード</SelectItem>
                  <SelectItem value="cash">現金</SelectItem>
                  <SelectItem value="investment">投資</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>色</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-16 h-10 p-1"
                />
                <Input
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#000000"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>初期残高</Label>
              <Input
                type="number"
                value={formData.initialBalance}
                onChange={(e) =>
                  setFormData({ ...formData, initialBalance: e.target.value })
                }
                placeholder="0"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
              >
                キャンセル
              </Button>
              <Button type="submit">{editingAccount ? '更新' : '追加'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
