'use client';

import { create } from 'zustand';
import { format } from 'date-fns';
import {
  readFile,
  writeFile,
  readFileFromSubdir,
  writeFileToSubdir,
  openDirectory,
  clearHandles,
  listFilesInSubdir,
} from '@/lib/file-system';
import { parseYaml, stringifyYaml, clearAllYamlCache } from '@/lib/file-system/yaml-parser';
import {
  categoriesDataSchema,
  accountsDataSchema,
  monthlyDataSchema,
  budgetsDataSchema,
  recurringsDataSchema,
  settingsDataSchema,
  getCategoryTotal as getAmountTotal,
  type CategoriesData,
  type AccountsData,
  type MonthlyData,
  type BudgetsData,
  type RecurringsData,
  type Recurring,
  type RecurringTransfer,
  type SettingsData,
  type Category,
  type Account,
  type CategoryAmount,
  type BudgetAmount,
  type Transfer,
} from '@/lib/schemas';

// Helper to get total from BudgetAmount (same logic as CategoryAmount)
function getBudgetAmountTotal(amount: BudgetAmount): number {
  if (typeof amount === 'number') {
    return amount;
  }
  return Object.values(amount).reduce((sum, val) => sum + val, 0);
}

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

const defaultRecurrings: RecurringsData = {
  version: 1,
  items: [],
  transfers: [],
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
  monthlyData: Map<string, MonthlyData>;
  budgets: BudgetsData;
  recurrings: RecurringsData;
  settings: SettingsData;

  // Actions - File operations
  openDataDirectory: () => Promise<boolean>;
  loadAllData: () => Promise<void>;
  saveCategories: () => Promise<void>;
  saveAccounts: () => Promise<void>;
  saveMonthlyData: (month: string) => Promise<void>;
  saveBudgets: () => Promise<void>;
  saveRecurrings: () => Promise<void>;
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

  // Actions - Monthly Data
  setIncome: (categoryId: string, amount: CategoryAmount) => void;
  setExpense: (categoryId: string, amount: CategoryAmount) => void;
  addTransfer: (transfer: Transfer) => void;
  removeTransfer: (index: number) => void;

  // Actions - Budgets (saves to default template, persists across all months)
  setBaseSalary: (amount: number) => void;
  setBudget: (categoryId: string, amount: number | Record<string, number>) => void;
  setAccountAllocation: (accountId: string, amount: number) => void;

  // Actions - Recurrings
  addRecurring: (recurring: Recurring) => void;
  updateRecurring: (id: string, updates: Partial<Recurring>) => void;
  deleteRecurring: (id: string) => void;
  addRecurringTransfer: (transfer: RecurringTransfer) => void;
  updateRecurringTransfer: (id: string, updates: Partial<RecurringTransfer>) => void;
  deleteRecurringTransfer: (id: string) => void;
  applyRecurrings: (month: string) => void;

  // Computed values
  getMonthlyData: (month: string) => MonthlyData;
  getTotalIncome: (month: string) => number;
  getTotalExpense: (month: string) => number;
  getCategoryTotal: (type: 'income' | 'expense', categoryId: string, month: string) => number;
  getBaseSalary: (month: string) => number;
  getBudgetForCategory: (categoryId: string, month: string) => number;
  getBudgetForSubcategory: (categoryId: string, subcategoryId: string, month: string) => number;
  getAccountAllocations: (month: string) => Record<string, number>;
  getUnallocatedAmount: (month: string) => number;
  getTotalBudgetExpense: (month: string) => number;
  getBudgetSettingsDate: (month: string) => string | null; // 設定日（最新の変更月）を取得
  getCalculatedAccountBalances: () => Record<string, number>;
  getAccountBalancesUpToMonth: (month: string) => Record<string, number>;
  getMonthlyBalance: (month: string) => number;
  getPeriodTotals: (period: 'year' | 'all' | 'range', year?: number, startMonth?: string, endMonth?: string) => {
    income: number;
    expense: number;
    balance: number;
    months: string[];
  };
  getAvailableYears: () => number[];

  // Pool yearly reset (get info for display)
  getPoolYearlyReset: (month: string) => { amount: number; direction: 'pool-to-save' | 'save-to-pool' } | null;

  // Reset
  reset: () => void;
}

const emptyMonthlyData = (month: string): MonthlyData => ({
  version: 1,
  month,
  income: {},
  expense: {},
  transfers: [],
});

export const useLedgerStore = create<LedgerState>((set, get) => ({
  // Initial state
  isLoading: false,
  isLoaded: false,
  error: null,
  currentMonth: format(new Date(), 'yyyy-MM'),
  categories: defaultCategories,
  accounts: defaultAccounts,
  monthlyData: new Map(),
  budgets: defaultBudgets,
  recurrings: defaultRecurrings,
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

      // Load recurrings
      const recurringsContent = await readFile('recurrings.yaml');
      if (recurringsContent) {
        const parsed = parseYaml<RecurringsData>(recurringsContent, 'recurrings');
        const validated = recurringsDataSchema.parse(parsed);
        set({ recurrings: validated });
      }

      // Load settings
      const settingsContent = await readFile('settings.yaml');
      if (settingsContent) {
        const parsed = parseYaml<SettingsData>(settingsContent, 'settings');
        const validated = settingsDataSchema.parse(parsed);
        set({ settings: validated });
      }

      // Load all transaction files
      const transactionFiles = await listFilesInSubdir('transactions');
      const newMonthlyData = new Map<string, MonthlyData>();

      for (const filename of transactionFiles) {
        if (!filename.endsWith('.yaml')) continue;
        const month = filename.replace('.yaml', '');

        try {
          const dataContent = await readFileFromSubdir('transactions', filename);
          if (dataContent) {
            const parsed = parseYaml<MonthlyData>(dataContent, `data-${month}`);
            const validated = monthlyDataSchema.parse(parsed);
            newMonthlyData.set(month, validated);
          }
        } catch (e) {
          console.warn(`Failed to load transaction file: ${filename}`, e);
        }
      }

      set({ monthlyData: newMonthlyData });

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

  // Save monthly data
  saveMonthlyData: async (month: string) => {
    const { monthlyData } = get();
    const data = monthlyData.get(month);
    if (data) {
      const content = stringifyYaml(data, `data-${month}`);
      await writeFileToSubdir('transactions', `${month}.yaml`, content);
    }
  },

  // Save budgets
  saveBudgets: async () => {
    const { budgets } = get();
    const content = stringifyYaml(budgets, 'budgets');
    await writeFile('budgets.yaml', content);
  },

  // Save recurrings
  saveRecurrings: async () => {
    const { recurrings } = get();
    const content = stringifyYaml(recurrings, 'recurrings');
    await writeFile('recurrings.yaml', content);
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

    // Load data for the new month if not already loaded
    const { monthlyData } = get();
    if (!monthlyData.has(month)) {
      try {
        const dataContent = await readFileFromSubdir('transactions', `${month}.yaml`);
        if (dataContent) {
          const parsed = parseYaml<MonthlyData>(dataContent, `data-${month}`);
          const validated = monthlyDataSchema.parse(parsed);
          const newMonthlyData = new Map(monthlyData);
          newMonthlyData.set(month, validated);
          set({ monthlyData: newMonthlyData });
        }
      } catch {
        // No data for this month yet
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

  // Set income for a category
  setIncome: (categoryId, amount) => {
    const { currentMonth, monthlyData } = get();
    const data = monthlyData.get(currentMonth) || emptyMonthlyData(currentMonth);

    const updated: MonthlyData = {
      ...data,
      income: {
        ...data.income,
        [categoryId]: amount,
      },
    };

    const newMonthlyData = new Map(monthlyData);
    newMonthlyData.set(currentMonth, updated);
    set({ monthlyData: newMonthlyData });
    get().saveMonthlyData(currentMonth);
  },

  // Set expense for a category
  setExpense: (categoryId, amount) => {
    const { currentMonth, monthlyData } = get();
    const data = monthlyData.get(currentMonth) || emptyMonthlyData(currentMonth);

    const updated: MonthlyData = {
      ...data,
      expense: {
        ...data.expense,
        [categoryId]: amount,
      },
    };

    const newMonthlyData = new Map(monthlyData);
    newMonthlyData.set(currentMonth, updated);
    set({ monthlyData: newMonthlyData });
    get().saveMonthlyData(currentMonth);
  },

  // Add transfer
  addTransfer: (transfer) => {
    const { currentMonth, monthlyData } = get();
    const data = monthlyData.get(currentMonth) || emptyMonthlyData(currentMonth);

    const updated: MonthlyData = {
      ...data,
      transfers: [...data.transfers, transfer],
    };

    const newMonthlyData = new Map(monthlyData);
    newMonthlyData.set(currentMonth, updated);
    set({ monthlyData: newMonthlyData });
    get().saveMonthlyData(currentMonth);
  },

  // Remove transfer
  removeTransfer: (index) => {
    const { currentMonth, monthlyData } = get();
    const data = monthlyData.get(currentMonth);
    if (!data) return;

    const updated: MonthlyData = {
      ...data,
      transfers: data.transfers.filter((_, i) => i !== index),
    };

    const newMonthlyData = new Map(monthlyData);
    newMonthlyData.set(currentMonth, updated);
    set({ monthlyData: newMonthlyData });
    get().saveMonthlyData(currentMonth);
  },

  // Set base salary (saves to salary history, effective from specified month onwards)
  setBaseSalary: (amount) => {
    const { budgets, currentMonth } = get();
    const defaultTemplate = budgets.templates['default'] || {};
    const salaryHistory = defaultTemplate.salaryHistory || [];

    // Check if there's already an entry for this month
    const existingIndex = salaryHistory.findIndex(e => e.startMonth === currentMonth);
    let newHistory;
    if (existingIndex >= 0) {
      // Update existing entry
      newHistory = [...salaryHistory];
      newHistory[existingIndex] = { startMonth: currentMonth, amount };
    } else {
      // Add new entry and sort by startMonth
      newHistory = [...salaryHistory, { startMonth: currentMonth, amount }]
        .sort((a, b) => a.startMonth.localeCompare(b.startMonth));
    }

    const updated = {
      ...budgets,
      templates: {
        ...budgets.templates,
        default: {
          ...defaultTemplate,
          salaryHistory: newHistory,
        },
      },
    };

    set({ budgets: updated });
    get().saveBudgets();
  },

  // Set budget (saves to expense history, effective from current month onwards)
  setBudget: (categoryId, amount) => {
    const { budgets, currentMonth } = get();
    const defaultTemplate = budgets.templates['default'] || {};
    const expenseHistory = defaultTemplate.expenseHistory || {};
    const categoryHistory = expenseHistory[categoryId] || [];

    // Check if there's already an entry for this month
    const existingIndex = categoryHistory.findIndex(e => e.startMonth === currentMonth);
    let newHistory;
    if (existingIndex >= 0) {
      // Update existing entry
      newHistory = [...categoryHistory];
      newHistory[existingIndex] = { startMonth: currentMonth, amount };
    } else {
      // Add new entry and sort by startMonth
      newHistory = [...categoryHistory, { startMonth: currentMonth, amount }]
        .sort((a, b) => a.startMonth.localeCompare(b.startMonth));
    }

    const updated = {
      ...budgets,
      templates: {
        ...budgets.templates,
        default: {
          ...defaultTemplate,
          expenseHistory: {
            ...expenseHistory,
            [categoryId]: newHistory,
          },
        },
      },
    };

    set({ budgets: updated });
    get().saveBudgets();
  },

  // Set account allocation (saves to allocation history, effective from current month onwards)
  setAccountAllocation: (accountId, amount) => {
    const { budgets, currentMonth } = get();
    const defaultTemplate = budgets.templates['default'] || {};
    const allocationHistory = defaultTemplate.allocationHistory || {};
    const accountHistory = allocationHistory[accountId] || [];

    // Check if there's already an entry for this month
    const existingIndex = accountHistory.findIndex(e => e.startMonth === currentMonth);
    let newHistory;
    if (existingIndex >= 0) {
      // Update existing entry
      newHistory = [...accountHistory];
      newHistory[existingIndex] = { startMonth: currentMonth, amount };
    } else {
      // Add new entry and sort by startMonth
      newHistory = [...accountHistory, { startMonth: currentMonth, amount }]
        .sort((a, b) => a.startMonth.localeCompare(b.startMonth));
    }

    const updated = {
      ...budgets,
      templates: {
        ...budgets.templates,
        default: {
          ...defaultTemplate,
          allocationHistory: {
            ...allocationHistory,
            [accountId]: newHistory,
          },
        },
      },
    };

    set({ budgets: updated });
    get().saveBudgets();
  },

  // Add recurring
  addRecurring: (recurring) => {
    const { recurrings } = get();
    const updated = {
      ...recurrings,
      items: [...recurrings.items, recurring],
    };
    set({ recurrings: updated });
    get().saveRecurrings();
  },

  // Update recurring
  updateRecurring: (id, updates) => {
    const { recurrings } = get();
    const updated = {
      ...recurrings,
      items: recurrings.items.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    };
    set({ recurrings: updated });
    get().saveRecurrings();
  },

  // Delete recurring
  deleteRecurring: (id) => {
    const { recurrings } = get();
    const updated = {
      ...recurrings,
      items: recurrings.items.filter((item) => item.id !== id),
    };
    set({ recurrings: updated });
    get().saveRecurrings();
  },

  // Add recurring transfer
  addRecurringTransfer: (transfer) => {
    const { recurrings } = get();
    const updated = {
      ...recurrings,
      transfers: [...recurrings.transfers, transfer],
    };
    set({ recurrings: updated });
    get().saveRecurrings();
  },

  // Update recurring transfer
  updateRecurringTransfer: (id, updates) => {
    const { recurrings } = get();
    const updated = {
      ...recurrings,
      transfers: recurrings.transfers.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    };
    set({ recurrings: updated });
    get().saveRecurrings();
  },

  // Delete recurring transfer
  deleteRecurringTransfer: (id) => {
    const { recurrings } = get();
    const updated = {
      ...recurrings,
      transfers: recurrings.transfers.filter((t) => t.id !== id),
    };
    set({ recurrings: updated });
    get().saveRecurrings();
  },

  // Apply recurrings to a month
  applyRecurrings: (month) => {
    const { recurrings, monthlyData } = get();
    const data = monthlyData.get(month) || emptyMonthlyData(month);

    // Apply income/expense recurrings
    let updatedIncome = { ...data.income };
    let updatedExpense = { ...data.expense };

    for (const item of recurrings.items) {
      if (!item.enabled) continue;

      if (item.type === 'income') {
        updatedIncome = {
          ...updatedIncome,
          [item.categoryId]: item.amount,
        };
      } else {
        updatedExpense = {
          ...updatedExpense,
          [item.categoryId]: item.amount,
        };
      }
    }

    // Apply recurring transfers
    const updatedTransfers = [...data.transfers];
    for (const t of recurrings.transfers) {
      if (!t.enabled) continue;
      updatedTransfers.push({
        from: t.from,
        to: t.to,
        amount: t.amount,
        note: t.note,
      });
    }

    const updated: MonthlyData = {
      ...data,
      income: updatedIncome,
      expense: updatedExpense,
      transfers: updatedTransfers,
    };

    const newMonthlyData = new Map(monthlyData);
    newMonthlyData.set(month, updated);
    set({ monthlyData: newMonthlyData });
    get().saveMonthlyData(month);
  },

  // Get monthly data
  getMonthlyData: (month) => {
    const { monthlyData } = get();
    return monthlyData.get(month) || emptyMonthlyData(month);
  },

  // Get total income for a month
  getTotalIncome: (month: string): number => {
    const data = get().getMonthlyData(month);
    return Object.values(data.income).reduce<number>((sum, amount) => sum + getAmountTotal(amount), 0);
  },

  // Get total expense for a month
  getTotalExpense: (month: string): number => {
    const data = get().getMonthlyData(month);
    return Object.values(data.expense).reduce<number>((sum, amount) => sum + getAmountTotal(amount), 0);
  },

  // Get category total
  getCategoryTotal: (type, categoryId, month) => {
    const data = get().getMonthlyData(month);
    const amounts = type === 'income' ? data.income : data.expense;
    const amount = amounts[categoryId];
    return amount ? getAmountTotal(amount) : 0;
  },

  // Get base salary for a month (finds the most recent salary entry for the given month)
  getBaseSalary: (month) => {
    const { budgets } = get();
    const defaultTemplate = budgets.templates['default'];
    const salaryHistory = defaultTemplate?.salaryHistory || [];

    // Find the most recent entry that is <= the given month
    let applicableSalary = 0;
    for (const entry of salaryHistory) {
      if (entry.startMonth <= month) {
        applicableSalary = entry.amount;
      } else {
        break; // History is sorted, so we can stop early
      }
    }

    // Fall back to legacy baseSalary if no history entries found
    if (applicableSalary === 0 && defaultTemplate?.baseSalary) {
      return defaultTemplate.baseSalary;
    }

    return applicableSalary;
  },

  // Get budget for category (returns total if subcategories exist)
  getBudgetForCategory: (categoryId, month) => {
    const { budgets } = get();
    const defaultTemplate = budgets.templates['default'];
    const expenseHistory = defaultTemplate?.expenseHistory?.[categoryId] || [];

    // Find the most recent entry that is <= the given month
    let applicableBudget: number | Record<string, number> | undefined;
    for (const entry of expenseHistory) {
      if (entry.startMonth <= month) {
        applicableBudget = entry.amount;
      } else {
        break; // History is sorted, so we can stop early
      }
    }

    // Fall back to legacy expense if no history entries found
    if (applicableBudget === undefined) {
      applicableBudget = defaultTemplate?.expense?.[categoryId];
    }

    if (applicableBudget === undefined) return 0;
    return getBudgetAmountTotal(applicableBudget);
  },

  // Get budget for a specific subcategory
  getBudgetForSubcategory: (categoryId, subcategoryId, month) => {
    const { budgets } = get();
    const defaultTemplate = budgets.templates['default'];
    const expenseHistory = defaultTemplate?.expenseHistory?.[categoryId] || [];

    // Find the most recent entry that is <= the given month
    let applicableBudget: number | Record<string, number> | undefined;
    for (const entry of expenseHistory) {
      if (entry.startMonth <= month) {
        applicableBudget = entry.amount;
      } else {
        break; // History is sorted, so we can stop early
      }
    }

    // Fall back to legacy expense if no history entries found
    if (applicableBudget === undefined) {
      applicableBudget = defaultTemplate?.expense?.[categoryId];
    }

    if (applicableBudget === undefined) return 0;
    if (typeof applicableBudget === 'number') return 0; // No subcategory breakdown
    return applicableBudget[subcategoryId] || 0;
  },

  // Get account allocations for a month
  getAccountAllocations: (month) => {
    const { budgets } = get();
    const defaultTemplate = budgets.templates['default'];
    const allocationHistory = defaultTemplate?.allocationHistory || {};

    const result: Record<string, number> = {};

    // Process each account's history
    for (const [accountId, history] of Object.entries(allocationHistory)) {
      // Find the most recent entry that is <= the given month
      let applicableAmount = 0;
      for (const entry of history) {
        if (entry.startMonth <= month) {
          applicableAmount = entry.amount;
        } else {
          break; // History is sorted, so we can stop early
        }
      }
      if (applicableAmount > 0) {
        result[accountId] = applicableAmount;
      }
    }

    // Fall back to legacy accountAllocations if no history found
    if (Object.keys(result).length === 0 && defaultTemplate?.accountAllocations) {
      return defaultTemplate.accountAllocations;
    }

    return result;
  },

  // Get total budget expense for a month
  getTotalBudgetExpense: (month) => {
    const { budgets, categories } = get();
    let total = 0;

    for (const category of categories.categories.expense) {
      total += get().getBudgetForCategory(category.id, month);
    }

    return total;
  },

  // Get budget settings date (the most recent change date that is <= the given month)
  getBudgetSettingsDate: (month) => {
    const { budgets } = get();
    const defaultTemplate = budgets.templates['default'];
    if (!defaultTemplate) return null;

    let latestDate: string | null = null;

    // Check salary history
    const salaryHistory = defaultTemplate.salaryHistory || [];
    for (const entry of salaryHistory) {
      if (entry.startMonth <= month) {
        if (!latestDate || entry.startMonth > latestDate) {
          latestDate = entry.startMonth;
        }
      }
    }

    // Check expense history
    const expenseHistory = defaultTemplate.expenseHistory || {};
    for (const history of Object.values(expenseHistory)) {
      for (const entry of history) {
        if (entry.startMonth <= month) {
          if (!latestDate || entry.startMonth > latestDate) {
            latestDate = entry.startMonth;
          }
        }
      }
    }

    // Check allocation history
    const allocationHistory = defaultTemplate.allocationHistory || {};
    for (const history of Object.values(allocationHistory)) {
      for (const entry of history) {
        if (entry.startMonth <= month) {
          if (!latestDate || entry.startMonth > latestDate) {
            latestDate = entry.startMonth;
          }
        }
      }
    }

    return latestDate;
  },

  // Get unallocated amount (baseSalary - total expense budget - total account allocations)
  getUnallocatedAmount: (month) => {
    const baseSalary = get().getBaseSalary(month);
    const totalExpenseBudget = get().getTotalBudgetExpense(month);
    const accountAllocations = get().getAccountAllocations(month);
    const totalAccountAllocations = Object.values(accountAllocations).reduce((sum, val) => sum + val, 0);

    return baseSalary - totalExpenseBudget - totalAccountAllocations;
  },

  // Get monthly balance (income to account - expense from account)
  getMonthlyBalance: (month: string): number => {
    const data = get().getMonthlyData(month);
    const { accounts } = get();
    const flowRules = accounts.flowRules;

    // Calculate income that goes to 'account' (excluding income with toAccount set to other accounts)
    const incomeToAccount = Object.entries(data.income).reduce<number>(
      (sum, [categoryId, amount]) => {
        const rule = flowRules.income[categoryId];
        const toAccount = rule?.toAccount || 'account';
        // Only count income that goes to 'account'
        if (toAccount !== 'account') {
          return sum;
        }
        return sum + getAmountTotal(amount);
      },
      0
    );

    // Calculate expense from account (excluding pool and other special accounts)
    const expenseFromAccount = Object.entries(data.expense).reduce<number>(
      (sum, [categoryId, amount]) => {
        const rule = flowRules.expense[categoryId];
        const fromAccount = rule?.fromAccount || 'account';
        // Only count expense from 'account'
        if (fromAccount !== 'account') {
          return sum;
        }
        return sum + getAmountTotal(amount);
      },
      0
    );

    return incomeToAccount - expenseFromAccount;
  },

  // Get calculated account balances based on all monthly data
  getCalculatedAccountBalances: (): Record<string, number> => {
    const { accounts, monthlyData } = get();
    const flowRules = accounts.flowRules;

    // Initialize balances with initial amounts
    const balances: Record<string, number> = {};
    for (const account of accounts.accounts) {
      balances[account.id] = account.initialBalance;
    }

    // Process each month's data
    for (const [, data] of monthlyData) {
      // Add income based on flowRules (toAccount)
      for (const [categoryId, amount] of Object.entries(data.income)) {
        const rule = flowRules.income[categoryId];
        const toAccount = rule?.toAccount || 'account'; // Default to 'account'
        const incomeAmount = getAmountTotal(amount);

        if (balances[toAccount] !== undefined) {
          balances[toAccount] += incomeAmount;
        }
      }

      // Subtract expenses based on flowRules
      for (const [categoryId, amount] of Object.entries(data.expense)) {
        const rule = flowRules.expense[categoryId];
        const fromAccount = rule?.fromAccount || 'account';
        const expenseAmount = getAmountTotal(amount);

        if (balances[fromAccount] !== undefined) {
          balances[fromAccount] -= expenseAmount;
        }
      }

      // Process explicit transfers (nisa, bank, pool積立 etc.)
      for (const transfer of data.transfers) {
        if (balances[transfer.from] !== undefined) {
          balances[transfer.from] -= transfer.amount;
        }
        if (balances[transfer.to] !== undefined) {
          balances[transfer.to] += transfer.amount;
        }
      }

      // Auto-settlement: remaining balance in account goes to/from save
      // Calculate what's left in account after income, expense, and transfers
      const monthlyBalance = get().getMonthlyBalance(data.month);
      const transfersFromAccount = data.transfers
        .filter(t => t.from === 'account')
        .reduce((sum, t) => sum + t.amount, 0);
      const transfersToAccount = data.transfers
        .filter(t => t.to === 'account')
        .reduce((sum, t) => sum + t.amount, 0);

      // Net balance after explicit transfers
      const netBalance = monthlyBalance - transfersFromAccount + transfersToAccount;

      // Auto-transfer to/from save
      if (balances['save'] !== undefined && balances['account'] !== undefined) {
        // This is implicit: account balance stays at 0 after settlement
        // save gets the surplus or pays the deficit
        balances['save'] += netBalance;
        balances['account'] -= netBalance;
      }

      // Pool yearly reset at year-end
      const [, month] = data.month.split('-');
      if (month === '03' && balances['pool'] !== undefined && balances['save'] !== undefined) {
        const poolBalance = balances['pool'];
        if (poolBalance !== 0) {
          // Transfer pool balance to/from save
          balances['save'] += poolBalance;
          balances['pool'] = 0;
        }
      }
    }

    return balances;
  },

  // Get account balances up to and including a specific month
  getAccountBalancesUpToMonth: (targetMonth: string): Record<string, number> => {
    const { accounts, monthlyData } = get();
    const flowRules = accounts.flowRules;

    // Initialize balances with initial amounts
    const balances: Record<string, number> = {};
    for (const account of accounts.accounts) {
      balances[account.id] = account.initialBalance;
    }

    // Get sorted months up to and including targetMonth
    const sortedMonths = Array.from(monthlyData.keys())
      .filter(m => m <= targetMonth)
      .sort();

    // Process each month's data
    for (const month of sortedMonths) {
      const data = monthlyData.get(month);
      if (!data) continue;

      // Add income based on flowRules (toAccount)
      for (const [categoryId, amount] of Object.entries(data.income)) {
        const rule = flowRules.income[categoryId];
        const toAccount = rule?.toAccount || 'account'; // Default to 'account'
        const incomeAmount = getAmountTotal(amount);

        if (balances[toAccount] !== undefined) {
          balances[toAccount] += incomeAmount;
        }
      }

      // Subtract expenses based on flowRules
      for (const [categoryId, amount] of Object.entries(data.expense)) {
        const rule = flowRules.expense[categoryId];
        const fromAccount = rule?.fromAccount || 'account';
        const expenseAmount = getAmountTotal(amount);

        if (balances[fromAccount] !== undefined) {
          balances[fromAccount] -= expenseAmount;
        }
      }

      // Process explicit transfers
      for (const transfer of data.transfers) {
        if (balances[transfer.from] !== undefined) {
          balances[transfer.from] -= transfer.amount;
        }
        if (balances[transfer.to] !== undefined) {
          balances[transfer.to] += transfer.amount;
        }
      }

      // Auto-settlement
      const monthlyBalance = get().getMonthlyBalance(month);
      const transfersFromAccount = data.transfers
        .filter(t => t.from === 'account')
        .reduce((sum, t) => sum + t.amount, 0);
      const transfersToAccount = data.transfers
        .filter(t => t.to === 'account')
        .reduce((sum, t) => sum + t.amount, 0);

      const netBalance = monthlyBalance - transfersFromAccount + transfersToAccount;

      if (balances['save'] !== undefined && balances['account'] !== undefined) {
        balances['save'] += netBalance;
        balances['account'] -= netBalance;
      }

      // Pool yearly reset at year-end
      const [, monthNum] = month.split('-');
      if (monthNum === '03' && balances['pool'] !== undefined && balances['save'] !== undefined) {
        const poolBalance = balances['pool'];
        if (poolBalance !== 0) {
          // Transfer pool balance to/from save
          balances['save'] += poolBalance;
          balances['pool'] = 0;
        }
      }
    }

    return balances;
  },

  // Get available years from monthly data
  getAvailableYears: (): number[] => {
    const { monthlyData } = get();
    const years = new Set<number>();
    for (const [month] of monthlyData) {
      const year = parseInt(month.split('-')[0]);
      years.add(year);
    }
    return Array.from(years).sort((a, b) => b - a); // Most recent first
  },

  // Get totals for a period (year or all time)
  getPeriodTotals: (period, year, startMonth, endMonth) => {
    const { monthlyData } = get();
    let totalIncome = 0;
    let totalExpense = 0;
    const months: string[] = [];

    for (const [month, data] of monthlyData) {
      // Filter by period type
      if (period === 'year' && year) {
        const dataYear = parseInt(month.split('-')[0]);
        if (dataYear !== year) continue;
      } else if (period === 'range' && startMonth && endMonth) {
        if (month < startMonth || month > endMonth) continue;
      }

      months.push(month);

      // Sum income
      totalIncome += Object.values(data.income).reduce<number>(
        (sum, amount) => sum + getAmountTotal(amount),
        0
      );

      // Sum expense
      totalExpense += Object.values(data.expense).reduce<number>(
        (sum, amount) => sum + getAmountTotal(amount),
        0
      );
    }

    return {
      income: totalIncome,
      expense: totalExpense,
      balance: totalIncome - totalExpense,
      months: months.sort(),
    };
  },

  getPoolYearlyReset: (month: string): { amount: number; direction: 'pool-to-save' | 'save-to-pool' } | null => {
    const [, monthNum] = month.split('-');

    // Only apply reset in March
    if (monthNum !== '03') {
      return null;
    }

    const { accounts } = get();

    // Check if pool and save accounts exist
    if (!accounts.accounts.find(a => a.id === 'pool') || !accounts.accounts.find(a => a.id === 'save')) {
      return null;
    }

    const balances = get().getAccountBalancesUpToMonth(month);

    const { accounts: accs, monthlyData } = get();
    const flowRules = accs.flowRules;

    const tempBalances: Record<string, number> = {};
    for (const account of accs.accounts) {
      tempBalances[account.id] = account.initialBalance;
    }

    const sortedMonths = Array.from(monthlyData.keys())
      .filter(m => m <= month)
      .sort();

    for (const m of sortedMonths) {
      const data = monthlyData.get(m);
      if (!data) continue;

      // Add income
      for (const [categoryId, amount] of Object.entries(data.income)) {
        const rule = flowRules.income[categoryId];
        const toAccount = rule?.toAccount || 'account';
        const incomeAmount = getAmountTotal(amount);
        if (tempBalances[toAccount] !== undefined) {
          tempBalances[toAccount] += incomeAmount;
        }
      }

      // Subtract expenses
      for (const [categoryId, amount] of Object.entries(data.expense)) {
        const rule = flowRules.expense[categoryId];
        const fromAccount = rule?.fromAccount || 'account';
        const expenseAmount = getAmountTotal(amount);
        if (tempBalances[fromAccount] !== undefined) {
          tempBalances[fromAccount] -= expenseAmount;
        }
      }

      // Process transfers
      for (const transfer of data.transfers) {
        if (tempBalances[transfer.from] !== undefined) {
          tempBalances[transfer.from] -= transfer.amount;
        }
        if (tempBalances[transfer.to] !== undefined) {
          tempBalances[transfer.to] += transfer.amount;
        }
      }

      // Auto-settlement
      const monthlyBalance = get().getMonthlyBalance(m);
      const transfersFromAccount = data.transfers
        .filter(t => t.from === 'account')
        .reduce((sum, t) => sum + t.amount, 0);
      const transfersToAccount = data.transfers
        .filter(t => t.to === 'account')
        .reduce((sum, t) => sum + t.amount, 0);
      const netBalance = monthlyBalance - transfersFromAccount + transfersToAccount;

      if (tempBalances['save'] !== undefined && tempBalances['account'] !== undefined) {
        tempBalances['save'] += netBalance;
        tempBalances['account'] -= netBalance;
      }

    }

    const poolBalanceBeforeReset = tempBalances['pool'] || 0;

    if (poolBalanceBeforeReset === 0) {
      return null;
    }

    return {
      amount: Math.abs(poolBalanceBeforeReset),
      direction: poolBalanceBeforeReset > 0 ? 'pool-to-save' : 'save-to-pool',
    };
  },

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
      monthlyData: new Map(),
      budgets: defaultBudgets,
      recurrings: defaultRecurrings,
      settings: defaultSettings,
    });
  },
}));
