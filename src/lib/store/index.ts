'use client';

import { create } from 'zustand';
import { format } from 'date-fns';
import {
  readFile,
  writeFile,
  readFileFromSubdir,
  writeFileToSubdir,
  listFilesInSubdir,
  openDirectory,
  getDirectoryHandle,
  setDirectoryHandle,
  clearHandles,
} from '@/lib/file-system';
import { parseYaml, stringifyYaml, clearAllYamlCache } from '@/lib/file-system/yaml-parser';
import {
  categoriesDataSchema,
  accountsDataSchema,
  monthlyTransactionsSchema,
  budgetsDataSchema,
  settingsDataSchema,
  type CategoriesData,
  type AccountsData,
  type MonthlyTransactions,
  type BudgetsData,
  type SettingsData,
  type Transaction,
  type Category,
  type Account,
} from '@/lib/schemas';

// Default data
const defaultCategories: CategoriesData = {
  version: 1,
  categories: {
    income: [
      {
        id: 'salary',
        name: '給与',
        icon: 'briefcase',
        color: '#10B981',
        subcategories: [
          { id: 'main_job', name: '本業' },
          { id: 'side_job', name: '副業' },
        ],
      },
      {
        id: 'investment',
        name: '投資収入',
        icon: 'trending-up',
        color: '#3B82F6',
        subcategories: [
          { id: 'dividends', name: '配当金' },
          { id: 'interest', name: '利息' },
        ],
      },
    ],
    expense: [
      {
        id: 'food',
        name: '食費',
        icon: 'utensils',
        color: '#F59E0B',
        subcategories: [
          { id: 'groceries', name: '食料品' },
          { id: 'restaurants', name: '外食' },
        ],
      },
      {
        id: 'housing',
        name: '住居費',
        icon: 'home',
        color: '#EF4444',
        subcategories: [
          { id: 'rent', name: '家賃' },
          { id: 'utilities', name: '光熱費' },
        ],
      },
      {
        id: 'transportation',
        name: '交通費',
        icon: 'car',
        color: '#8B5CF6',
        subcategories: [
          { id: 'train', name: '電車' },
          { id: 'gas', name: 'ガソリン' },
        ],
      },
    ],
    transfer: [
      {
        id: 'transfer',
        name: '振替',
        icon: 'arrow-right-left',
        color: '#6B7280',
        subcategories: [],
      },
    ],
  },
};

const defaultAccounts: AccountsData = {
  version: 1,
  accounts: [
    {
      id: 'checking',
      name: '普通預金',
      type: 'bank',
      icon: 'building',
      color: '#2563EB',
      initialBalance: 0,
      currency: 'JPY',
      isDefault: true,
    },
    {
      id: 'cash',
      name: '現金',
      type: 'cash',
      icon: 'wallet',
      color: '#78716C',
      initialBalance: 0,
      currency: 'JPY',
    },
  ],
  flowRules: {
    income: {},
    expense: {},
  },
};

const defaultBudgets: BudgetsData = {
  version: 1,
  defaultCurrency: 'JPY',
  templates: {
    default: {
      expense: {},
    },
  },
  monthly: {},
  alerts: [
    { type: 'percentage', threshold: 80, message: '予算の80%に達しました' },
    { type: 'percentage', threshold: 100, message: '予算を超過しました！' },
  ],
};

const defaultSettings: SettingsData = {
  version: 1,
  locale: 'ja-JP',
  currency: 'JPY',
  dateFormat: 'yyyy-MM-dd',
  firstDayOfWeek: 1,
  theme: 'system',
  display: {
    showDecimals: false,
    compactNumbers: true,
    defaultView: 'monthly',
  },
  sankey: {
    showLabels: true,
    showValues: true,
    colorScheme: 'category',
  },
};

interface LedgerState {
  // Loading state
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;

  // Current month
  currentMonth: string;

  // Data
  categories: CategoriesData;
  accounts: AccountsData;
  transactions: Map<string, MonthlyTransactions>;
  budgets: BudgetsData;
  settings: SettingsData;

  // Actions - File operations
  openDataDirectory: () => Promise<boolean>;
  loadAllData: () => Promise<void>;
  saveCategories: () => Promise<void>;
  saveAccounts: () => Promise<void>;
  saveTransactions: (month: string) => Promise<void>;
  saveBudgets: () => Promise<void>;
  saveSettings: () => Promise<void>;

  // Actions - Month navigation
  setCurrentMonth: (month: string) => void;

  // Actions - Categories
  addCategory: (type: 'income' | 'expense', category: Category) => void;
  updateCategory: (type: 'income' | 'expense', categoryId: string, updates: Partial<Category>) => void;
  deleteCategory: (type: 'income' | 'expense', categoryId: string) => void;

  // Actions - Accounts
  addAccount: (account: Account) => void;
  updateAccount: (accountId: string, updates: Partial<Account>) => void;
  deleteAccount: (accountId: string) => void;

  // Actions - Transactions
  addTransaction: (transaction: Transaction) => void;
  updateTransaction: (transactionId: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (transactionId: string) => void;

  // Actions - Budgets
  setBudget: (categoryId: string, amount: number, month?: string) => void;

  // Computed values
  getMonthlyTransactions: (month: string) => Transaction[];
  getAccountBalance: (accountId: string, upToDate?: Date) => number;
  getCategoryTotal: (categoryId: string, month: string) => number;
  getBudgetForCategory: (categoryId: string, month: string) => number;

  // Reset
  reset: () => void;
}

export const useLedgerStore = create<LedgerState>((set, get) => ({
  // Initial state
  isLoading: false,
  isLoaded: false,
  error: null,
  currentMonth: format(new Date(), 'yyyy-MM'),
  categories: defaultCategories,
  accounts: defaultAccounts,
  transactions: new Map(),
  budgets: defaultBudgets,
  settings: defaultSettings,

  // Open data directory
  openDataDirectory: async () => {
    try {
      const handle = await openDirectory();
      if (!handle) return false;
      return true;
    } catch (error) {
      set({ error: (error as Error).message });
      return false;
    }
  },

  // Load all data from files
  loadAllData: async () => {
    set({ isLoading: true, error: null });

    try {
      // Load categories
      const categoriesContent = await readFile('categories.yaml');
      if (categoriesContent) {
        const parsed = parseYaml<CategoriesData>(categoriesContent, 'categories');
        const validated = categoriesDataSchema.parse(parsed);
        set({ categories: validated });
      }

      // Load accounts
      const accountsContent = await readFile('accounts.yaml');
      if (accountsContent) {
        const parsed = parseYaml<AccountsData>(accountsContent, 'accounts');
        const validated = accountsDataSchema.parse(parsed);
        set({ accounts: validated });
      }

      // Load budgets
      const budgetsContent = await readFile('budgets.yaml');
      if (budgetsContent) {
        const parsed = parseYaml<BudgetsData>(budgetsContent, 'budgets');
        const validated = budgetsDataSchema.parse(parsed);
        set({ budgets: validated });
      }

      // Load settings
      const settingsContent = await readFile('settings.yaml');
      if (settingsContent) {
        const parsed = parseYaml<SettingsData>(settingsContent, 'settings');
        const validated = settingsDataSchema.parse(parsed);
        set({ settings: validated });
      }

      // Load current month's transactions
      const { currentMonth } = get();
      const txContent = await readFileFromSubdir('transactions', `${currentMonth}.yaml`);
      if (txContent) {
        const parsed = parseYaml<MonthlyTransactions>(txContent, `transactions-${currentMonth}`);
        const validated = monthlyTransactionsSchema.parse(parsed);
        const transactions = new Map(get().transactions);
        transactions.set(currentMonth, validated);
        set({ transactions });
      }

      set({ isLoading: false, isLoaded: true });
    } catch (error) {
      set({ isLoading: false, error: (error as Error).message });
    }
  },

  // Save categories
  saveCategories: async () => {
    const { categories } = get();
    const content = stringifyYaml(categories, 'categories');
    await writeFile('categories.yaml', content);
  },

  // Save accounts
  saveAccounts: async () => {
    const { accounts } = get();
    const content = stringifyYaml(accounts, 'accounts');
    await writeFile('accounts.yaml', content);
  },

  // Save transactions for a specific month
  saveTransactions: async (month: string) => {
    const { transactions } = get();
    const monthData = transactions.get(month);
    if (monthData) {
      const content = stringifyYaml(monthData, `transactions-${month}`);
      await writeFileToSubdir('transactions', `${month}.yaml`, content);
    }
  },

  // Save budgets
  saveBudgets: async () => {
    const { budgets } = get();
    const content = stringifyYaml(budgets, 'budgets');
    await writeFile('budgets.yaml', content);
  },

  // Save settings
  saveSettings: async () => {
    const { settings } = get();
    const content = stringifyYaml(settings, 'settings');
    await writeFile('settings.yaml', content);
  },

  // Set current month
  setCurrentMonth: async (month: string) => {
    set({ currentMonth: month });

    // Load transactions for the new month if not already loaded
    const { transactions } = get();
    if (!transactions.has(month)) {
      try {
        const txContent = await readFileFromSubdir('transactions', `${month}.yaml`);
        if (txContent) {
          const parsed = parseYaml<MonthlyTransactions>(txContent, `transactions-${month}`);
          const validated = monthlyTransactionsSchema.parse(parsed);
          const newTransactions = new Map(transactions);
          newTransactions.set(month, validated);
          set({ transactions: newTransactions });
        }
      } catch {
        // No transactions for this month yet
      }
    }
  },

  // Add category
  addCategory: (type, category) => {
    const { categories } = get();
    const updated = {
      ...categories,
      categories: {
        ...categories.categories,
        [type]: [...categories.categories[type], category],
      },
    };
    set({ categories: updated });
    get().saveCategories();
  },

  // Update category
  updateCategory: (type, categoryId, updates) => {
    const { categories } = get();
    const updated = {
      ...categories,
      categories: {
        ...categories.categories,
        [type]: categories.categories[type].map((cat) =>
          cat.id === categoryId ? { ...cat, ...updates } : cat
        ),
      },
    };
    set({ categories: updated });
    get().saveCategories();
  },

  // Delete category
  deleteCategory: (type, categoryId) => {
    const { categories } = get();
    const updated = {
      ...categories,
      categories: {
        ...categories.categories,
        [type]: categories.categories[type].filter((cat) => cat.id !== categoryId),
      },
    };
    set({ categories: updated });
    get().saveCategories();
  },

  // Add account
  addAccount: (account) => {
    const { accounts } = get();
    const updated = {
      ...accounts,
      accounts: [...accounts.accounts, account],
    };
    set({ accounts: updated });
    get().saveAccounts();
  },

  // Update account
  updateAccount: (accountId, updates) => {
    const { accounts } = get();
    const updated = {
      ...accounts,
      accounts: accounts.accounts.map((acc) =>
        acc.id === accountId ? { ...acc, ...updates } : acc
      ),
    };
    set({ accounts: updated });
    get().saveAccounts();
  },

  // Delete account
  deleteAccount: (accountId) => {
    const { accounts } = get();
    const updated = {
      ...accounts,
      accounts: accounts.accounts.filter((acc) => acc.id !== accountId),
    };
    set({ accounts: updated });
    get().saveAccounts();
  },

  // Add transaction
  addTransaction: (transaction) => {
    const month = transaction.date.substring(0, 7);
    const { transactions } = get();
    const monthData = transactions.get(month) || {
      version: 1,
      month,
      transactions: [],
    };

    const updatedMonthData = {
      ...monthData,
      transactions: [...monthData.transactions, transaction],
    };

    const newTransactions = new Map(transactions);
    newTransactions.set(month, updatedMonthData);
    set({ transactions: newTransactions });
    get().saveTransactions(month);
  },

  // Update transaction
  updateTransaction: (transactionId, updates) => {
    const { transactions, currentMonth } = get();
    const monthData = transactions.get(currentMonth);
    if (!monthData) return;

    const updatedMonthData = {
      ...monthData,
      transactions: monthData.transactions.map((tx) =>
        tx.id === transactionId ? { ...tx, ...updates } : tx
      ),
    };

    const newTransactions = new Map(transactions);
    newTransactions.set(currentMonth, updatedMonthData);
    set({ transactions: newTransactions });
    get().saveTransactions(currentMonth);
  },

  // Delete transaction
  deleteTransaction: (transactionId) => {
    const { transactions, currentMonth } = get();
    const monthData = transactions.get(currentMonth);
    if (!monthData) return;

    const updatedMonthData = {
      ...monthData,
      transactions: monthData.transactions.filter((tx) => tx.id !== transactionId),
    };

    const newTransactions = new Map(transactions);
    newTransactions.set(currentMonth, updatedMonthData);
    set({ transactions: newTransactions });
    get().saveTransactions(currentMonth);
  },

  // Set budget
  setBudget: (categoryId, amount, month) => {
    const { budgets, currentMonth } = get();
    const targetMonth = month || currentMonth;

    const monthlyBudget = budgets.monthly[targetMonth] || { template: 'default' };
    const overrides = monthlyBudget.overrides || { expense: {} };

    const updated = {
      ...budgets,
      monthly: {
        ...budgets.monthly,
        [targetMonth]: {
          ...monthlyBudget,
          overrides: {
            ...overrides,
            expense: {
              ...overrides.expense,
              [categoryId]: amount,
            },
          },
        },
      },
    };

    set({ budgets: updated });
    get().saveBudgets();
  },

  // Get monthly transactions
  getMonthlyTransactions: (month) => {
    const { transactions } = get();
    const monthData = transactions.get(month);
    return monthData?.transactions || [];
  },

  // Get account balance
  getAccountBalance: (accountId, upToDate) => {
    const { accounts, transactions } = get();
    const account = accounts.accounts.find((a) => a.id === accountId);
    if (!account) return 0;

    let balance = account.initialBalance;
    const targetDate = upToDate || new Date();

    transactions.forEach((monthData) => {
      monthData.transactions.forEach((tx) => {
        const txDate = new Date(tx.date);
        if (txDate <= targetDate) {
          if (tx.toAccount === accountId) {
            balance += tx.amount;
          }
          if (tx.fromAccount === accountId) {
            balance -= tx.amount;
          }
        }
      });
    });

    return balance;
  },

  // Get category total for a month
  getCategoryTotal: (categoryId, month) => {
    const { transactions } = get();
    const monthData = transactions.get(month);
    if (!monthData) return 0;

    return monthData.transactions
      .filter((tx) => tx.category === categoryId)
      .reduce((sum, tx) => sum + tx.amount, 0);
  },

  // Get budget for category
  getBudgetForCategory: (categoryId, month) => {
    const { budgets } = get();
    const monthlyBudget = budgets.monthly[month];
    if (!monthlyBudget) {
      const defaultTemplate = budgets.templates['default'];
      return defaultTemplate?.expense?.[categoryId] || 0;
    }

    const template = budgets.templates[monthlyBudget.template] || budgets.templates['default'];
    const templateAmount = template?.expense?.[categoryId] || 0;
    const overrideAmount = monthlyBudget.overrides?.expense?.[categoryId];

    return overrideAmount !== undefined ? overrideAmount : templateAmount;
  },

  // Reset store
  reset: () => {
    clearHandles();
    clearAllYamlCache();
    set({
      isLoading: false,
      isLoaded: false,
      error: null,
      currentMonth: format(new Date(), 'yyyy-MM'),
      categories: defaultCategories,
      accounts: defaultAccounts,
      transactions: new Map(),
      budgets: defaultBudgets,
      settings: defaultSettings,
    });
  },
}));
