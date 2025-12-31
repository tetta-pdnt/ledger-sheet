import { z } from 'zod';

// Subcategory schema
export const subcategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

// Category schema
export const categorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  icon: z.string().default('circle'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#6B7280'),
  subcategories: z.array(subcategorySchema).default([]),
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
export const accountTypeSchema = z.enum(['bank', 'credit', 'cash', 'investment']);

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

// Transaction type schema
export const transactionTypeSchema = z.enum(['income', 'expense', 'transfer']);

// Transaction schema
export const transactionSchema = z.object({
  id: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: transactionTypeSchema,
  category: z.string().min(1),
  subcategory: z.string().optional(),
  amount: z.number().positive(),
  fromAccount: z.string().optional(),
  toAccount: z.string().optional(),
  description: z.string().default(''),
  tags: z.array(z.string()).optional(),
  memo: z.string().optional(),
  isRecurring: z.boolean().optional(),
});

// Monthly transactions schema
export const monthlyTransactionsSchema = z.object({
  version: z.number().default(1),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  transactions: z.array(transactionSchema).default([]),
});

// Budget template schema
export const budgetTemplateSchema = z.object({
  income: z.record(z.string(), z.number()).optional(),
  expense: z.record(z.string(), z.number()).optional(),
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
export type TransactionType = z.infer<typeof transactionTypeSchema>;
export type Transaction = z.infer<typeof transactionSchema>;
export type MonthlyTransactions = z.infer<typeof monthlyTransactionsSchema>;
export type BudgetTemplate = z.infer<typeof budgetTemplateSchema>;
export type MonthlyBudget = z.infer<typeof monthlyBudgetSchema>;
export type BudgetAlert = z.infer<typeof budgetAlertSchema>;
export type BudgetsData = z.infer<typeof budgetsDataSchema>;
export type SettingsData = z.infer<typeof settingsDataSchema>;
