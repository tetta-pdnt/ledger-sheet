'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLedgerStore } from '@/lib/store';
import { generateTransactionId } from '@/lib/utils';
import type { Transaction, TransactionType } from '@/lib/schemas';
import { cn } from '@/lib/utils';

interface TransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction;
}

export function TransactionForm({ open, onOpenChange, transaction }: TransactionFormProps) {
  const { categories, accounts, addTransaction, updateTransaction } = useLedgerStore();
  const isEditing = !!transaction;

  const [type, setType] = useState<TransactionType>(transaction?.type || 'expense');
  const [date, setDate] = useState<Date>(
    transaction ? new Date(transaction.date) : new Date()
  );
  const [category, setCategory] = useState(transaction?.category || '');
  const [subcategory, setSubcategory] = useState(transaction?.subcategory || '');
  const [amount, setAmount] = useState(transaction?.amount?.toString() || '');
  const [fromAccount, setFromAccount] = useState(transaction?.fromAccount || '');
  const [toAccount, setToAccount] = useState(transaction?.toAccount || '');
  const [description, setDescription] = useState(transaction?.description || '');

  const categoryList = type === 'income'
    ? categories.categories.income
    : type === 'expense'
    ? categories.categories.expense
    : categories.categories.transfer;

  const selectedCategory = categoryList.find((c) => c.id === category);
  const subcategories = selectedCategory?.subcategories || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const txData: Transaction = {
      id: transaction?.id || generateTransactionId(),
      date: format(date, 'yyyy-MM-dd'),
      type,
      category,
      subcategory: subcategory || undefined,
      amount: parseFloat(amount),
      fromAccount: type === 'expense' || type === 'transfer' ? fromAccount : undefined,
      toAccount: type === 'income' || type === 'transfer' ? toAccount : undefined,
      description,
    };

    if (isEditing) {
      updateTransaction(transaction.id, txData);
    } else {
      addTransaction(txData);
    }

    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setType('expense');
    setDate(new Date());
    setCategory('');
    setSubcategory('');
    setAmount('');
    setFromAccount('');
    setToAccount('');
    setDescription('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? '取引を編集' : '新規取引'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>種類</Label>
            <Select value={type} onValueChange={(v) => setType(v as TransactionType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">収入</SelectItem>
                <SelectItem value="expense">支出</SelectItem>
                <SelectItem value="transfer">振替</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>日付</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'yyyy/MM/dd') : '日付を選択'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>カテゴリ</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="カテゴリを選択" />
              </SelectTrigger>
              <SelectContent>
                {categoryList.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {subcategories.length > 0 && (
            <div className="space-y-2">
              <Label>サブカテゴリ</Label>
              <Select value={subcategory} onValueChange={setSubcategory}>
                <SelectTrigger>
                  <SelectValue placeholder="サブカテゴリを選択" />
                </SelectTrigger>
                <SelectContent>
                  {subcategories.map((sub) => (
                    <SelectItem key={sub.id} value={sub.id}>
                      {sub.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>金額</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              min="0"
              step="1"
              required
            />
          </div>

          {(type === 'expense' || type === 'transfer') && (
            <div className="space-y-2">
              <Label>支払元</Label>
              <Select value={fromAccount} onValueChange={setFromAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="口座を選択" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(type === 'income' || type === 'transfer') && (
            <div className="space-y-2">
              <Label>入金先</Label>
              <Select value={toAccount} onValueChange={setToAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="口座を選択" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>説明</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="メモ（任意）"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              キャンセル
            </Button>
            <Button type="submit">
              {isEditing ? '更新' : '追加'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
