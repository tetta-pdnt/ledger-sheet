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
}: AccountFlowDiagramProps) {
  const width = 700;
  const height = 400;
  const nodeWidth = 120;
  const nodeHeight = 50;

  // Calculate node positions based on account roles
  const nodePositions = useMemo(() => {
    const positions: Record<string, NodePosition> = {};

    // Income node at top-left
    positions['income'] = { x: 50, y: 30, width: nodeWidth, height: nodeHeight };

    // Main account (account) at left
    const accountNode = accounts.find(a => a.id === 'account');
    if (accountNode) {
      positions['account'] = { x: 50, y: 170, width: nodeWidth, height: nodeHeight };
    }

    // Save account at top-right (for auto-settlement)
    const saveNode = accounts.find(a => a.id === 'save');
    if (saveNode) {
      positions['save'] = { x: width - nodeWidth - 50, y: 30, width: nodeWidth, height: nodeHeight };
    }

    // Pool at center-right top
    const poolNode = accounts.find(a => a.id === 'pool');
    if (poolNode) {
      positions['pool'] = { x: width - nodeWidth - 50, y: 130, width: nodeWidth, height: nodeHeight };
    }

    // NISA below pool
    const nisaNode = accounts.find(a => a.id === 'nisa');
    if (nisaNode) {
      positions['nisa'] = { x: width - nodeWidth - 50, y: 210, width: nodeWidth, height: nodeHeight };
    }

    // Expense node at bottom-left
    positions['expense'] = { x: 50, y: 310, width: nodeWidth, height: nodeHeight };

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
    }> = [];

    // Income -> account
    if (totalIncome > 0 && nodePositions['account']) {
      result.push({
        from: 'income',
        to: 'account',
        amount: totalIncome,
        color: '#22c55e', // green
      });
    }

    // Transfers
    for (const transfer of transfers) {
      if (nodePositions[transfer.from] && nodePositions[transfer.to]) {
        result.push({
          from: transfer.from,
          to: transfer.to,
          amount: transfer.amount,
          label: transfer.note,
          color: '#3b82f6', // blue
        });
      }
    }

    // Expense flows
    for (const [accountId, amount] of Object.entries(expenseByAccount)) {
      if (amount > 0 && nodePositions[accountId]) {
        result.push({
          from: accountId,
          to: 'expense',
          amount,
          color: '#ef4444', // red
        });
      }
    }

    // Auto-settlement
    if (monthlyBalance !== 0 && nodePositions['account'] && nodePositions['save']) {
      result.push({
        from: monthlyBalance > 0 ? 'account' : 'save',
        to: monthlyBalance > 0 ? 'save' : 'account',
        amount: Math.abs(monthlyBalance),
        label: '自動精算',
        color: '#10b981', // emerald
      });
    }

    return result;
  }, [transfers, totalIncome, monthlyBalance, expenseByAccount, nodePositions]);

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
  const getArrowPath = (from: NodePosition, to: NodePosition) => {
    const fromCenterX = from.x + from.width / 2;
    const fromCenterY = from.y + from.height / 2;
    const toCenterX = to.x + to.width / 2;
    const toCenterY = to.y + to.height / 2;

    // Determine direction
    const isBelow = to.y > from.y + from.height / 2;
    const isRight = to.x > from.x + from.width / 2;
    const isLeft = to.x + to.width < from.x + from.width / 2;

    let startX: number, startY: number, endX: number, endY: number;

    if (isBelow) {
      // Arrow goes down
      startX = fromCenterX;
      startY = from.y + from.height;
      endX = toCenterX;
      endY = to.y;
    } else if (isRight) {
      // Arrow goes right
      startX = from.x + from.width;
      startY = fromCenterY;
      endX = to.x;
      endY = toCenterY;
    } else if (isLeft) {
      // Arrow goes left
      startX = from.x;
      startY = fromCenterY;
      endX = to.x + to.width;
      endY = toCenterY;
    } else {
      // Arrow goes up
      startX = fromCenterX;
      startY = from.y;
      endX = toCenterX;
      endY = to.y + to.height;
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
  const getArrowMidpoint = (from: NodePosition, to: NodePosition) => {
    const fromCenterX = from.x + from.width / 2;
    const fromCenterY = from.y + from.height / 2;
    const toCenterX = to.x + to.width / 2;
    const toCenterY = to.y + to.height / 2;

    const isBelow = to.y > from.y + from.height / 2;

    if (isBelow) {
      return {
        x: (fromCenterX + toCenterX) / 2,
        y: (from.y + from.height + to.y) / 2,
      };
    } else {
      return {
        x: (from.x + from.width + to.x) / 2,
        y: (fromCenterY + toCenterY) / 2,
      };
    }
  };

  return (
    <div className="w-full overflow-x-auto">
      <svg width={width} height={height} className="mx-auto">
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="0"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
          </marker>
          {flows.map((flow, i) => (
            <marker
              key={`marker-${i}`}
              id={`arrowhead-${i}`}
              markerWidth="10"
              markerHeight="7"
              refX="0"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill={flow.color} />
            </marker>
          ))}
        </defs>

        {/* Draw flows/arrows */}
        {flows.map((flow, i) => {
          const fromPos = nodePositions[flow.from];
          const toPos = nodePositions[flow.to];
          if (!fromPos || !toPos) return null;

          const midpoint = getArrowMidpoint(fromPos, toPos);

          return (
            <g key={`flow-${i}`}>
              <path
                d={getArrowPath(fromPos, toPos)}
                fill="none"
                stroke={flow.color}
                strokeWidth={2}
                markerEnd={`url(#arrowhead-${i})`}
                opacity={0.8}
              />
              {/* Amount label on arrow */}
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

        {/* Draw nodes */}
        {Object.entries(nodePositions).map(([id, pos]) => {
          const color = getAccountColor(id);
          const value = getNodeValue(id);
          const isSpecial = id === 'income' || id === 'expense';

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
                y={pos.y + 18}
                textAnchor="middle"
                fontSize={12}
                fontWeight="bold"
                fill={isSpecial ? 'white' : color}
              >
                {getAccountName(id)}
              </text>
              <text
                x={pos.x + pos.width / 2}
                y={pos.y + 36}
                textAnchor="middle"
                fontSize={11}
                fill={isSpecial ? 'white' : '#374151'}
              >
                {formatCurrency(value)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
