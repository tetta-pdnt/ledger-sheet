import type { Transaction, Account, Category } from '@/lib/schemas';

export interface SankeyNode {
  id: string;
  name: string;
  type: 'income' | 'expense' | 'account';
  color: string;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

export function transformToSankeyData(
  transactions: Transaction[],
  accounts: Account[],
  incomeCategories: Category[],
  expenseCategories: Category[]
): SankeyData {
  const nodes: SankeyNode[] = [];
  const linksMap = new Map<string, number>();

  // Add income category nodes
  incomeCategories.forEach((cat) => {
    nodes.push({
      id: `income-${cat.id}`,
      name: cat.name,
      type: 'income',
      color: cat.color,
    });
  });

  // Add account nodes
  accounts.forEach((acc) => {
    nodes.push({
      id: `account-${acc.id}`,
      name: acc.name,
      type: 'account',
      color: acc.color,
    });
  });

  // Add expense category nodes
  expenseCategories.forEach((cat) => {
    nodes.push({
      id: `expense-${cat.id}`,
      name: cat.name,
      type: 'expense',
      color: cat.color,
    });
  });

  // Process transactions to create links
  transactions.forEach((tx) => {
    if (tx.type === 'income' && tx.toAccount) {
      const linkKey = `income-${tx.category}|account-${tx.toAccount}`;
      linksMap.set(linkKey, (linksMap.get(linkKey) || 0) + tx.amount);
    } else if (tx.type === 'expense' && tx.fromAccount) {
      const linkKey = `account-${tx.fromAccount}|expense-${tx.category}`;
      linksMap.set(linkKey, (linksMap.get(linkKey) || 0) + tx.amount);
    } else if (tx.type === 'transfer' && tx.fromAccount && tx.toAccount) {
      const linkKey = `account-${tx.fromAccount}|account-${tx.toAccount}`;
      linksMap.set(linkKey, (linksMap.get(linkKey) || 0) + tx.amount);
    }
  });

  // Convert links map to array
  const links: SankeyLink[] = [];
  linksMap.forEach((value, key) => {
    const [source, target] = key.split('|');
    if (value > 0) {
      links.push({ source, target, value });
    }
  });

  // Filter out nodes that have no links
  const linkedNodeIds = new Set<string>();
  links.forEach((link) => {
    linkedNodeIds.add(link.source);
    linkedNodeIds.add(link.target);
  });

  const filteredNodes = nodes.filter((node) => linkedNodeIds.has(node.id));

  return {
    nodes: filteredNodes,
    links,
  };
}
