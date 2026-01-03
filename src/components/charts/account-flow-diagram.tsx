'use client';

import { useMemo } from 'react';
import { formatCurrency } from '@/lib/utils';
import type { Account, Transfer } from '@/lib/schemas';

interface AccountFlowDiagramProps {
  accounts: Account[];
  transfers: Transfer[];
  totalIncome: number;
  monthlyBalance: number;
  accountBalances: Record<string, number>;
  expenseByAccount: Record<string, number>;
  incomeByAccount: Record<string, number>; // Income destination by account
  poolYearlyReset: { amount: number; direction: 'pool-to-save' | 'save-to-pool' } | null;
}

interface NodePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function AccountFlowDiagram({
  accounts,
  transfers,
  totalIncome,
  monthlyBalance,
  accountBalances,
  expenseByAccount,
  incomeByAccount,
  poolYearlyReset,
}: AccountFlowDiagramProps) {
  const width = 700;
  const height = 350;
  const nodeWidth = 120;
  const nodeHeight = 50;
  const envelopeHeight = nodeHeight*2
  const widthCenter = width/2 - nodeWidth/2
  const heightCenter = height/2 - nodeHeight/2
  const heightCEnvelope = height/2 - envelopeHeight/2
  const offset = 5
  const widthEnd = width - nodeWidth - offset
  const heightEnd = height - nodeHeight - offset

  // Calculate node positions based on account roles
  const nodePositions = useMemo(() => {
    const positions: Record<string, NodePosition> = {};

    // Income node at top-left
    positions['income'] = { x: offset, y: heightCenter, width: nodeWidth, height: nodeHeight };

    // Main account (account) at left
    const accountNode = accounts.find(a => a.id === 'account');
    if (accountNode) {
      positions['account'] = { x: widthCenter, y: heightCEnvelope, width: nodeWidth, height: envelopeHeight };
    }

    // Save account at top-right (for auto-settlement)
    const saveNode = accounts.find(a => a.id === 'save');
    if (saveNode) {
      positions['save'] = { x: offset, y: offset, width: nodeWidth, height: nodeHeight };
    }

    // Pool at center-right top
    const poolNode = accounts.find(a => a.id === 'pool');
    if (poolNode) {
      positions['pool'] = { x: widthCenter, y: offset, width: nodeWidth, height: nodeHeight };
    }

    // NISA below pool
    const nisaNode = accounts.find(a => a.id === 'nisa');
    if (nisaNode) {
      positions['nisa'] = { x: widthCenter, y: heightEnd, width: nodeWidth, height: nodeHeight };
    }

    // Expense node at bottom-left
    positions['expense'] = { x: widthEnd, y: heightCenter, width: nodeWidth, height: nodeHeight };

    // Position any remaining accounts
    let otherIndex = 0;
    for (const account of accounts) {
      if (!positions[account.id]) {
        positions[account.id] = {
          x: 200 + otherIndex * 140,
          y: 220,
          width: nodeWidth,
          height: nodeHeight,
        };
        otherIndex++;
      }
    }

    return positions;
  }, [accounts, width]);

  // Build flows
  const flows = useMemo(() => {
    const result: Array<{
      from: string;
      to: string;
      amount: number;
      label?: string;
      color: string;
      offsetIndex: number;
      totalCount: number;
    }> = [];

    const flowCount: Record<string, number> = {};

    const getFlowKey = (from: string, to: string) => {
      const [a, b] = [from, to].sort(); // アルファベット順でソート
      return `${a}->${b}`;
    };

    // Income flows to destination accounts
    for (const [accountId, amount] of Object.entries(incomeByAccount)) {
      if (amount > 0 && nodePositions[accountId]) {
        const key = getFlowKey('income', accountId);
        const index = flowCount[key] || 0;
        flowCount[key] = index + 1;

        result.push({
          from: 'income',
          to: accountId,
          amount,
          color: '#22c55e',
          offsetIndex: index,
          totalCount: 0, // Will be set later
        });
      }
    }

    // Transfers
    for (const transfer of transfers) {
      if (nodePositions[transfer.from] && nodePositions[transfer.to]) {
        const key = getFlowKey(transfer.from, transfer.to);
        const index = flowCount[key] || 0;
        flowCount[key] = index + 1;

        result.push({
          from: transfer.from,
          to: transfer.to,
          amount: transfer.amount,
          label: transfer.note,
          color: '#3b82f6',
          offsetIndex: index,
          totalCount: 0, // Will be set later
        });
      }
    }

    // Expense flows
    for (const [accountId, amount] of Object.entries(expenseByAccount)) {
      if (amount > 0 && nodePositions[accountId]) {
        const key = getFlowKey(accountId, 'expense');
        const index = flowCount[key] || 0;
        flowCount[key] = index + 1;

        result.push({
          from: accountId,
          to: 'expense',
          amount,
          color: '#ef4444',
          offsetIndex: index,
          totalCount: 0, // Will be set later
        });
      }
    }

    // Auto-settlement
    if (monthlyBalance !== 0 && nodePositions['account'] && nodePositions['save']) {
      const key = getFlowKey(monthlyBalance > 0 ? 'account' : 'save', monthlyBalance > 0 ? 'save' : 'account');
      const index = flowCount[key] || 0;
      flowCount[key] = index + 1;

      result.push({
        from: monthlyBalance > 0 ? 'account' : 'save',
        to: monthlyBalance > 0 ? 'save' : 'account',
        amount: Math.abs(monthlyBalance),
        label: '自動精算',
        color: monthlyBalance > 0 ? '#8B5CF6' : '#EC4899',
        offsetIndex: index,
        totalCount: 0, // Will be set later
      });
    }

    // Pool yearly reset
    if (poolYearlyReset && nodePositions['pool'] && nodePositions['save']) {
      const key = getFlowKey(
        poolYearlyReset.direction === 'pool-to-save' ? 'pool' : 'save',
        poolYearlyReset.direction === 'pool-to-save' ? 'save' : 'pool'
      );
      const index = flowCount[key] || 0;
      flowCount[key] = index + 1;

      result.push({
        from: poolYearlyReset.direction === 'pool-to-save' ? 'pool' : 'save',
        to: poolYearlyReset.direction === 'pool-to-save' ? 'save' : 'pool',
        amount: poolYearlyReset.amount,
        label: 'pool年次リセット',
        color: '#F59E0B', // amber color
        offsetIndex: index,
        totalCount: 0, // Will be set later
      });
    }

    // Set totalCount for each flow
    for (const flow of result) {
      const key = getFlowKey(flow.from, flow.to);
      flow.totalCount = flowCount[key] || 1;
    }

    return result;
  }, [transfers, totalIncome, monthlyBalance, expenseByAccount, incomeByAccount, nodePositions, poolYearlyReset]);

  const getAccountName = (id: string) => {
    if (id === 'income') return '収入';
    if (id === 'expense') return '支出';
    return accounts.find(a => a.id === id)?.name || id;
  };

  const getAccountColor = (id: string) => {
    if (id === 'income') return '#22c55e';
    if (id === 'expense') return '#ef4444';
    return accounts.find(a => a.id === id)?.color || '#6b7280';
  };

  const getNodeValue = (id: string) => {
    if (id === 'income') return totalIncome;
    if (id === 'expense') return Object.values(expenseByAccount).reduce((s, v) => s + v, 0);
    return accountBalances[id] || 0;
  };

  // Calculate arrow path between two nodes
  const getArrowPath = (from: NodePosition, to: NodePosition, offsetIndex = 0, totalCount = 1) => {
    const fromCenterX = from.x + from.width / 2;
    const fromCenterY = from.y + from.height / 2;
    const toCenterX = to.x + to.width / 2;
    const toCenterY = to.y + to.height / 2;
    const dx = toCenterX - fromCenterX;
    const dy = toCenterY - fromCenterY;
    const deg = Math.atan2(dy, dx) * 180 / Math.PI;

    // Determine direction
    const isBelow = deg >= 45 && deg < 135;
    const isRight = deg >= -45 && deg < 45;
    const isLeft = deg >= 135 || deg < -135;

    let startX: number, startY: number, endX: number, endY: number;

    const gap = 10;
    // Calculate offset from center: distribute arrows symmetrically around center
    const offset = (offsetIndex - (totalCount - 1) / 2) * gap;

    if (isBelow) {
      startX = fromCenterX + offset;
      startY = from.y + from.height;
      endX = toCenterX + offset;
      endY = to.y - 14;
    } else if (isRight) {
      startX = from.x + from.width;
      startY = fromCenterY + offset;
      endX = to.x - 14;
      endY = toCenterY + offset;
    } else if (isLeft) {
      startX = from.x;
      startY = fromCenterY + offset;
      endX = to.x + to.width + 14;
      endY = toCenterY + offset;
    } else {
      startX = fromCenterX + offset;
      startY = from.y;
      endX = toCenterX + offset;
      endY = to.y + to.height + 14;
    }

    // Curved path
    if (isBelow) {
      const midY = (startY + endY) / 2;
      return `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;
    } else if (isRight || isLeft) {
      const midX = (startX + endX) / 2;
      return `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
    } else {
      const midY = (startY + endY) / 2;
      return `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;
    }
  };

  // Get arrow position for label
  const getArrowMidpoint = (from: NodePosition, to: NodePosition, offsetIndex = 0, totalCount = 1) => {
    const fromCenterX = from.x + from.width / 2;
    const fromCenterY = from.y + from.height / 2;
    const toCenterX = to.x + to.width / 2;
    const toCenterY = to.y + to.height / 2;
    const dx = toCenterX - fromCenterX;
    const dy = toCenterY - fromCenterY;
    const deg = Math.atan2(dy, dx) * 180 / Math.PI;

    const isBelow = deg >= 45 && deg < 135;
    const isRight = deg >= -45 && deg < 45;
    const isLeft  = deg >= 135 || deg < -135;

    let startX: number, startY: number, endX: number, endY: number;

    const gap = 24;
    const offset = (offsetIndex - (totalCount - 1) / 2) * gap;

    if (isBelow) {
      startX = fromCenterX + offset;
      startY = from.y + from.height;
      endX = toCenterX + offset;
      endY = to.y - 14;
    } else if (isRight) {
      startX = from.x + from.width;
      startY = fromCenterY + offset;
      endX = to.x - 14;
      endY = toCenterY + offset;
    } else if (isLeft) {
      startX = from.x;
      startY = fromCenterY + offset;
      endX = to.x + to.width + 14;
      endY = toCenterY + offset;
    } else {
      startX = fromCenterX + offset;
      startY = from.y;
      endX = toCenterX + offset;
      endY = to.y + to.height + 14;
    }

    return {
      x: (startX + endX) / 2,
      y: (startY + endY) / 2,
    };
  };

  return (
    <div className="w-full overflow-x-auto">
      <svg width={width} height={height} className="mx-auto">
        <defs>
          {flows.map((flow, i) => (
            <marker
              key={`marker-${i}`}
              id={`arrowhead-${i}`}
              markerWidth="7"
              markerHeight="5"
              refX="0"
              refY="2.5"
              orient="auto"
            >
              <polygon points="0 0, 7 2.5, 0 5" fill={flow.color} />
            </marker>
          ))}
        </defs>

        {/* Draw flow arrows first */}
        {flows.map((flow, i) => {
          const fromPos = nodePositions[flow.from];
          const toPos = nodePositions[flow.to];
          if (!fromPos || !toPos) return null;

          return (
            <path
              key={`flow-path-${i}`}
              d={getArrowPath(fromPos, toPos, flow.offsetIndex, flow.totalCount)}
              fill="none"
              stroke={flow.color}
              strokeWidth={2}
              markerEnd={`url(#arrowhead-${i})`}
              opacity={0.8}
            />
          );
        })}

        {/* Draw nodes */}
        {Object.entries(nodePositions).map(([id, pos]) => {
          const color = getAccountColor(id);
          const value = getNodeValue(id);
          const isSpecial = id === 'income' || id === 'expense';
          const hideAmount = id === 'account';

          return (
            <g key={id}>
              <rect
                x={pos.x}
                y={pos.y}
                width={pos.width}
                height={pos.height}
                rx={8}
                fill={isSpecial ? color : 'white'}
                stroke={color}
                strokeWidth={2}
              />
              <text
                x={pos.x + pos.width / 2}
                y={hideAmount ? pos.y + pos.height / 2 + 4 : pos.y + 18}
                textAnchor="middle"
                fontSize={12}
                fontWeight="bold"
                fill={isSpecial ? 'white' : color}
              >
                {getAccountName(id)}
              </text>
              {!hideAmount && (
                <text
                  x={pos.x + pos.width / 2}
                  y={pos.y + 36}
                  textAnchor="middle"
                  fontSize={11}
                  fill={isSpecial ? 'white' : '#374151'}
                >
                  {formatCurrency(value)}
                </text>
              )}
            </g>
          );
        })}

        {/* Draw flow labels on top of everything */}
        {flows.map((flow, i) => {
          const fromPos = nodePositions[flow.from];
          const toPos = nodePositions[flow.to];
          if (!fromPos || !toPos) return null;

          const midpoint = getArrowMidpoint(fromPos, toPos, flow.offsetIndex, flow.totalCount);

          return (
            <g key={`flow-label-${i}`}>
              <rect
                x={midpoint.x - 40}
                y={midpoint.y - 10}
                width={80}
                height={20}
                rx={4}
                fill="white"
                stroke={flow.color}
                strokeWidth={1}
              />
              <text
                x={midpoint.x}
                y={midpoint.y + 4}
                textAnchor="middle"
                fontSize={11}
                fill={flow.color}
                fontWeight="bold"
              >
                {formatCurrency(flow.amount)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
