import type { Account, Category, MonthlyData, AccountsData } from '@/lib/schemas';
import { getCategoryTotal } from '@/lib/schemas';

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
  monthlyData: MonthlyData,
  accountsData: AccountsData,
  incomeCategories: Category[],
  expenseCategories: Category[]
): SankeyData {
  const nodes: SankeyNode[] = [];
  const linksMap = new Map<string, number>();

  const accounts = accountsData.accounts;
  const flowRules = accountsData.flowRules;

  // Find default account
  const defaultAccount = accounts.find((a) => a.isDefault) || accounts[0];
  const defaultAccountId = defaultAccount?.id;

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

  // Process income data to create links (income category -> account)
  Object.entries(monthlyData.income).forEach(([categoryId, amount]) => {
    const total = getCategoryTotal(amount);
    if (total <= 0) return;

    // Get target account from flow rules, or use default
    const rule = flowRules.income[categoryId];
    const targetAccountId = rule?.toAccount || defaultAccountId;

    if (targetAccountId) {
      const linkKey = `income-${categoryId}|account-${targetAccountId}`;
      linksMap.set(linkKey, (linksMap.get(linkKey) || 0) + total);
    }
  });

  // Process expense data to create links (account -> expense category)
  Object.entries(monthlyData.expense).forEach(([categoryId, amount]) => {
    const total = getCategoryTotal(amount);
    if (total <= 0) return;

    // Get source account from flow rules, or use default
    const rule = flowRules.expense[categoryId];
    const sourceAccountId = rule?.fromAccount || defaultAccountId;

    if (sourceAccountId) {
      const linkKey = `account-${sourceAccountId}|expense-${categoryId}`;
      linksMap.set(linkKey, (linksMap.get(linkKey) || 0) + total);
    }
  });

  // Process transfers (account -> account)
  monthlyData.transfers.forEach((transfer) => {
    if (transfer.amount > 0) {
      const linkKey = `account-${transfer.from}|account-${transfer.to}`;
      linksMap.set(linkKey, (linksMap.get(linkKey) || 0) + transfer.amount);
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
