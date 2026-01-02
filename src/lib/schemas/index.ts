import { z } from 'zod';

// Subcategory schema
export const subcategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  startMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(), // 有効開始月 (YYYY-MM)
  endMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(), // 有効終了月 (YYYY-MM)
});

// Category schema
export const categorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  icon: z.string().default('circle'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#6B7280'),
  subcategories: z.array(subcategorySchema).default([]),
  startMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(), // 有効開始月 (YYYY-MM)
  endMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(), // 有効終了月 (YYYY-MM)
});

// Categories data schema
export const categoriesDataSchema = z.object({
  version: z.number().default(1),
  categories: z.object({
    income: z.array(categorySchema).default([]),
    expense: z.array(categorySchema).default([]),
    transfer: z.array(categorySchema).default([]),
  }),
});

// Account type schema
export const accountTypeSchema = z.enum(['bank', 'credit', 'cash', 'investment', 'pool']);

// Account schema
export const accountSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: accountTypeSchema,
  icon: z.string().default('wallet'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#6B7280'),
  initialBalance: z.number().default(0),
  currency: z.string().default('JPY'),
  isDefault: z.boolean().optional(),
  linkedAccount: z.string().optional(),
});

// Flow rule schema
export const flowRuleSchema = z.object({
  fromAccount: z.string().optional(),
  toAccount: z.string().optional(),
});

// Flow rules schema
export const flowRulesSchema = z.object({
  income: z.record(z.string(), flowRuleSchema).default({}),
  expense: z.record(z.string(), flowRuleSchema).default({}),
});

// Accounts data schema
export const accountsDataSchema = z.object({
  version: z.number().default(1),
  accounts: z.array(accountSchema).default([]),
  flowRules: flowRulesSchema.default({ income: {}, expense: {} }),
});

// Category amount - either a number or subcategory breakdown
// e.g., food: 45000 or food: { groceries: 30000, restaurants: 15000 }
export const categoryAmountSchema = z.union([
  z.number().nonnegative(),
  z.record(z.string(), z.number().nonnegative()),
]);

// Transfer record
export const transferSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  amount: z.number().positive(),
  note: z.string().optional(),
});

// Monthly data schema - category totals per month
export const monthlyDataSchema = z.object({
  version: z.number().default(1),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  income: z.record(z.string(), categoryAmountSchema).default({}),
  expense: z.record(z.string(), categoryAmountSchema).default({}),
  transfers: z.array(transferSchema).default([]),
});

// Budget amount - either a number or subcategory breakdown (same as categoryAmountSchema)
// e.g., food: 45000 or food: { groceries: 30000, restaurants: 15000 }
export const budgetAmountSchema = z.union([
  z.number().nonnegative(),
  z.record(z.string(), z.number().nonnegative()),
]);

// Salary history entry - tracks salary changes over time
export const salaryHistoryEntrySchema = z.object({
  startMonth: z.string().regex(/^\d{4}-\d{2}$/), // 開始月 (YYYY-MM)
  amount: z.number().nonnegative(),
});

// Budget item history entry - tracks individual budget/allocation changes over time
export const budgetItemHistoryEntrySchema = z.object({
  startMonth: z.string().regex(/^\d{4}-\d{2}$/), // 開始月 (YYYY-MM)
  amount: budgetAmountSchema, // number or subcategory breakdown
});

// Allocation history entry - tracks account allocation changes over time
export const allocationHistoryEntrySchema = z.object({
  startMonth: z.string().regex(/^\d{4}-\d{2}$/), // 開始月 (YYYY-MM)
  amount: z.number().nonnegative(),
});

// Budget template schema
export const budgetTemplateSchema = z.object({
  baseSalary: z.number().nonnegative().optional(), // 基本給与（後方互換）
  salaryHistory: z.array(salaryHistoryEntrySchema).optional(), // 給与履歴
  income: z.record(z.string(), z.number()).optional(),
  expense: z.record(z.string(), budgetAmountSchema).optional(), // 予算（後方互換）
  expenseHistory: z.record(z.string(), z.array(budgetItemHistoryEntrySchema)).optional(), // カテゴリ別予算履歴
  accountAllocations: z.record(z.string(), z.number().nonnegative()).optional(), // 口座振替（後方互換）
  allocationHistory: z.record(z.string(), z.array(allocationHistoryEntrySchema)).optional(), // 口座別振替履歴
});

// Monthly budget schema
export const monthlyBudgetSchema = z.object({
  template: z.string(),
  overrides: budgetTemplateSchema.optional(),
});

// Budget alert schema
export const budgetAlertSchema = z.object({
  type: z.enum(['percentage', 'amount']),
  threshold: z.number().positive(),
  message: z.string(),
});

// Budgets data schema
export const budgetsDataSchema = z.object({
  version: z.number().default(1),
  defaultCurrency: z.string().default('JPY'),
  templates: z.record(z.string(), budgetTemplateSchema).default({}),
  monthly: z.record(z.string(), monthlyBudgetSchema).default({}),
  alerts: z.array(budgetAlertSchema).default([]),
});

// Recurring transaction schema - monthly fixed amounts
export const recurringSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['income', 'expense']),
  categoryId: z.string().min(1),
  amount: categoryAmountSchema, // number or subcategory breakdown
  enabled: z.boolean().default(true),
  note: z.string().optional(),
});

// Recurring transfer schema
export const recurringTransferSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  amount: z.number().positive(),
  enabled: z.boolean().default(true),
  note: z.string().optional(),
});

// Recurrings data schema
export const recurringsDataSchema = z.object({
  version: z.number().default(1),
  items: z.array(recurringSchema).default([]),
  transfers: z.array(recurringTransferSchema).default([]),
});

// Settings schema
export const settingsDataSchema = z.object({
  version: z.number().default(1),
  locale: z.string().default('ja-JP'),
  currency: z.string().default('JPY'),
  dateFormat: z.string().default('yyyy-MM-dd'),
  firstDayOfWeek: z.number().min(0).max(6).default(1),
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  display: z.object({
    showDecimals: z.boolean().default(false),
    compactNumbers: z.boolean().default(true),
    defaultView: z.enum(['monthly', 'yearly']).default('monthly'),
  }).default({
    showDecimals: false,
    compactNumbers: true,
    defaultView: 'monthly',
  }),
  sankey: z.object({
    showLabels: z.boolean().default(true),
    showValues: z.boolean().default(true),
    colorScheme: z.enum(['category', 'account', 'gradient']).default('category'),
  }).default({
    showLabels: true,
    showValues: true,
    colorScheme: 'category',
  }),
});

// Type exports
export type Subcategory = z.infer<typeof subcategorySchema>;
export type Category = z.infer<typeof categorySchema>;
export type CategoriesData = z.infer<typeof categoriesDataSchema>;
export type AccountType = z.infer<typeof accountTypeSchema>;
export type Account = z.infer<typeof accountSchema>;
export type FlowRule = z.infer<typeof flowRuleSchema>;
export type FlowRules = z.infer<typeof flowRulesSchema>;
export type AccountsData = z.infer<typeof accountsDataSchema>;
export type CategoryAmount = z.infer<typeof categoryAmountSchema>;
export type Transfer = z.infer<typeof transferSchema>;
export type MonthlyData = z.infer<typeof monthlyDataSchema>;
export type BudgetAmount = z.infer<typeof budgetAmountSchema>;
export type SalaryHistoryEntry = z.infer<typeof salaryHistoryEntrySchema>;
export type BudgetItemHistoryEntry = z.infer<typeof budgetItemHistoryEntrySchema>;
export type AllocationHistoryEntry = z.infer<typeof allocationHistoryEntrySchema>;
export type BudgetTemplate = z.infer<typeof budgetTemplateSchema>;
export type MonthlyBudget = z.infer<typeof monthlyBudgetSchema>;
export type BudgetAlert = z.infer<typeof budgetAlertSchema>;
export type BudgetsData = z.infer<typeof budgetsDataSchema>;
export type Recurring = z.infer<typeof recurringSchema>;
export type RecurringTransfer = z.infer<typeof recurringTransferSchema>;
export type RecurringsData = z.infer<typeof recurringsDataSchema>;
export type SettingsData = z.infer<typeof settingsDataSchema>;

// Helper function to get total from CategoryAmount
export function getCategoryTotal(amount: CategoryAmount): number {
  if (typeof amount === 'number') {
    return amount;
  }
  return Object.values(amount).reduce((sum, val) => sum + val, 0);
}

// Helper function to check if a category/subcategory is active for a given month
export function isActiveForMonth(
  item: { startMonth?: string; endMonth?: string },
  month: string
): boolean {
  if (item.startMonth && month < item.startMonth) {
    return false; // Not yet started
  }
  if (item.endMonth && month > item.endMonth) {
    return false; // Already ended
  }
  return true;
}

// Helper function to filter active subcategories for a given month
export function getActiveSubcategories(
  category: Category,
  month: string
): Subcategory[] {
  return category.subcategories.filter(sub => isActiveForMonth(sub, month));
}

// Helper function to filter active categories for a given month
export function getActiveCategories(
  categories: Category[],
  month: string
): Category[] {
  return categories
    .filter(cat => isActiveForMonth(cat, month))
    .map(cat => ({
      ...cat,
      subcategories: getActiveSubcategories(cat, month),
    }));
}
