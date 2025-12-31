'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Receipt,
  Tags,
  Wallet,
  PiggyBank,
  GitGraph,
  Settings,
  FolderOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useLedgerStore } from '@/lib/store';

const navigation = [
  { name: 'ダッシュボード', href: '/', icon: LayoutDashboard },
  { name: '取引', href: '/transactions', icon: Receipt },
  { name: 'カテゴリ', href: '/categories', icon: Tags },
  { name: '口座', href: '/accounts', icon: Wallet },
  { name: '予算', href: '/budgets', icon: PiggyBank },
  { name: 'サンキー図', href: '/sankey', icon: GitGraph },
  { name: '設定', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isLoaded, openDataDirectory, loadAllData } = useLedgerStore();

  const handleOpenDirectory = async () => {
    const success = await openDataDirectory();
    if (success) {
      await loadAllData();
    }
  };

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-xl font-bold">Ledger</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t p-4">
        {!isLoaded ? (
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={handleOpenDirectory}
          >
            <FolderOpen className="h-4 w-4" />
            データフォルダを開く
          </Button>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            接続済み
          </div>
        )}
      </div>
    </div>
  );
}
