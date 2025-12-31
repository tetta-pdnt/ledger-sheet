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
  type Transfer,
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

  // Actions - Budgets
  setBudget: (categoryId: string, amount: number, month?: string) => void;

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
  getBudgetForCategory: (categoryId: string, month: string) => number;

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

      // Load current month's data
      const { currentMonth } = get();
      const dataContent = await readFileFromSubdir('transactions', `${currentMonth}.yaml`);
      if (dataContent) {
        const parsed = parseYaml<MonthlyData>(dataContent, `data-${currentMonth}`);
        const validated = monthlyDataSchema.parse(parsed);
        const newMonthlyData = new Map(get().monthlyData);
        newMonthlyData.set(currentMonth, validated);
        set({ monthlyData: newMonthlyData });
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
      monthlyData: new Map(),
      budgets: defaultBudgets,
      recurrings: defaultRecurrings,
      settings: defaultSettings,
    });
  },
}));
