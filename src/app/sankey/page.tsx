'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { Header } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SankeyDiagram } from '@/components/charts/sankey-diagram';
import { useLedgerStore } from '@/lib/store';
import { transformToSankeyData } from '@/lib/sankey';

export default function SankeyPage() {
  const { currentMonth, categories, accounts, getMonthlyTransactions } = useLedgerStore();
  const transactions = getMonthlyTransactions(currentMonth);

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: Math.max(400, width - 48),
          height: Math.max(400, Math.min(600, window.innerHeight - 300)),
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const sankeyData = useMemo(() => {
    return transformToSankeyData(
      transactions,
      accounts.accounts,
      categories.categories.income,
      categories.categories.expense
    );
  }, [transactions, accounts.accounts, categories.categories]);

  return (
    <div className="flex flex-col h-full">
      <Header title="サンキー図" />

      <div className="flex-1 p-6">
        <Card>
          <CardHeader>
            <CardTitle>収支フロー</CardTitle>
            <p className="text-sm text-muted-foreground">
              収入から口座を経由して支出カテゴリへのお金の流れを可視化
            </p>
          </CardHeader>
          <CardContent ref={containerRef}>
            <div className="flex justify-center">
              <SankeyDiagram
                nodes={sankeyData.nodes}
                links={sankeyData.links}
                width={dimensions.width}
                height={dimensions.height}
              />
            </div>

            <div className="mt-6 flex justify-center gap-8 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-green-500" />
                <span>収入</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-blue-500" />
                <span>口座</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-red-500" />
                <span>支出</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
