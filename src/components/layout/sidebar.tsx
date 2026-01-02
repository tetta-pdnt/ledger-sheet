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
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLedgerStore } from '@/lib/store';

const navigation = [
  { name: 'ダッシュボード', href: '/', icon: LayoutDashboard },
  { name: '月次収支', href: '/transactions', icon: Receipt },
  { name: '定期項目', href: '/recurrings', icon: RefreshCw },
  { name: 'カテゴリ', href: '/categories', icon: Tags },
  { name: '口座', href: '/accounts', icon: Wallet },
  { name: '予算', href: '/budgets', icon: PiggyBank },
  { name: 'サンキー図', href: '/sankey', icon: GitGraph },
  { name: '設定', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isLoaded, isLoading } = useLedgerStore();

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-xl font-bold">Ledger Sheet</h1>
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
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            読み込み中...
          </div>
        ) : isLoaded ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            データ読み込み済み
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-yellow-500" />
            起動中...
          </div>
        )}
      </div>
    </div>
  );
}
