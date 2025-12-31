// Category types
export interface Subcategory {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  subcategories: Subcategory[];
}

export interface CategoriesData {
  version: number;
  categories: {
    income: Category[];
    expense: Category[];
    transfer: Category[];
  };
}

// Account types
export type AccountType = 'bank' | 'credit' | 'cash' | 'investment';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  icon: string;
  color: string;
  initialBalance: number;
  currency: string;
  isDefault?: boolean;
  linkedAccount?: string;
}

export interface FlowRule {
  fromAccount?: string;
  toAccount?: string;
}

export interface FlowRules {
  income: Record<string, FlowRule>;
  expense: Record<string, FlowRule>;
}

export interface AccountsData {
  version: number;
  accounts: Account[];
  flowRules: FlowRules;
}

// Transaction types
export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  category: string;
  subcategory?: string;
  amount: number;
  fromAccount?: string;
  toAccount?: string;
  description: string;
  tags?: string[];
  memo?: string;
  isRecurring?: boolean;
}

export interface MonthlyTransactions {
  version: number;
  month: string;
  transactions: Transaction[];
}

// Budget types
export interface BudgetTemplate {
  income?: Record<string, number>;
  expense?: Record<string, number>;
}

export interface MonthlyBudget {
  template: string;
  overrides?: BudgetTemplate;
}

export interface BudgetAlert {
  type: 'percentage' | 'amount';
  threshold: number;
  message: string;
}

export interface BudgetsData {
  version: number;
  defaultCurrency: string;
  templates: Record<string, BudgetTemplate>;
  monthly: Record<string, MonthlyBudget>;
  alerts: BudgetAlert[];
}

// Settings types
export interface SettingsData {
  version: number;
  locale: string;
  currency: string;
  dateFormat: string;
  firstDayOfWeek: number;
  theme: 'light' | 'dark' | 'system';
  display: {
    showDecimals: boolean;
    compactNumbers: boolean;
    defaultView: 'monthly' | 'yearly';
  };
  sankey: {
    showLabels: boolean;
    showValues: boolean;
    colorScheme: 'category' | 'account' | 'gradient';
  };
}

// Sankey types
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

// Budget status
export interface BudgetStatus {
  categoryId: string;
  budget: number;
  spent: number;
  remaining: number;
  percentage: number;
  isOverBudget: boolean;
}
