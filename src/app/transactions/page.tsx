'use client';

import { useState } from 'react';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { Header } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TransactionForm } from '@/components/transactions/transaction-form';
import { useLedgerStore } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';
import type { Transaction } from '@/lib/schemas';

export default function TransactionsPage() {
  const { currentMonth, categories, accounts, getMonthlyTransactions, deleteTransaction } =
    useLedgerStore();
  const transactions = getMonthlyTransactions(currentMonth);

  const [formOpen, setFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>();

  const getCategoryName = (categoryId: string, type: string) => {
    const list =
      type === 'income'
        ? categories.categories.income
        : type === 'expense'
        ? categories.categories.expense
        : categories.categories.transfer;
    return list.find((c) => c.id === categoryId)?.name || categoryId;
  };

  const getAccountName = (accountId: string | undefined) => {
    if (!accountId) return '-';
    return accounts.accounts.find((a) => a.id === accountId)?.name || accountId;
  };

  const handleEdit = (tx: Transaction) => {
    setEditingTransaction(tx);
    setFormOpen(true);
  };

  const handleDelete = (txId: string) => {
    if (confirm('この取引を削除しますか？')) {
      deleteTransaction(txId);
    }
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) {
      setEditingTransaction(undefined);
    }
  };

  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="flex flex-col h-full">
      <Header title="取引" />

      <div className="flex-1 p-6 space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {transactions.length} 件の取引
          </p>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            新規取引
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日付</TableHead>
                  <TableHead>種類</TableHead>
                  <TableHead>カテゴリ</TableHead>
                  <TableHead>説明</TableHead>
                  <TableHead>口座</TableHead>
                  <TableHead className="text-right">金額</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      取引がありません
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>{tx.date}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            tx.type === 'income'
                              ? 'default'
                              : tx.type === 'expense'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {tx.type === 'income'
                            ? '収入'
                            : tx.type === 'expense'
                            ? '支出'
                            : '振替'}
                        </Badge>
                      </TableCell>
                      <TableCell>{getCategoryName(tx.category, tx.type)}</TableCell>
                      <TableCell>{tx.description || '-'}</TableCell>
                      <TableCell>
                        {tx.type === 'transfer' ? (
                          <span>
                            {getAccountName(tx.fromAccount)} → {getAccountName(tx.toAccount)}
                          </span>
                        ) : tx.type === 'income' ? (
                          getAccountName(tx.toAccount)
                        ) : (
                          getAccountName(tx.fromAccount)
                        )}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                          tx.type === 'income'
                            ? 'text-green-600'
                            : tx.type === 'expense'
                            ? 'text-red-600'
                            : ''
                        }`}
                      >
                        {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                        {formatCurrency(tx.amount)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(tx)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(tx.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <TransactionForm
        open={formOpen}
        onOpenChange={handleFormClose}
        transaction={editingTransaction}
      />
    </div>
  );
}
