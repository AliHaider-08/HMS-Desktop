import { CHANNELS } from '../../src/types/api';
import {
  expenseCategorySchema,
  expenseIdSchema,
  expenseListSchema,
  expenseSchema,
  expenseVoidSchema,
} from '../../src/types/schemas';
import type { ExpensesService } from '../services/expensesService';
import type { HandlerRegistry } from './registry';

/**
 * Shop expenses (Roadmap 4.F).
 *
 * `expenses:read` sees the list and the totals, `expenses:write` records one,
 * `expenses:void` reverses a mistake. A cashier gets none of the three: the shop's
 * running costs are not till business.
 */
export function expensesHandlers(expenses: ExpensesService): HandlerRegistry {
  return {
    [CHANNELS.expensesOverview]: {
      capability: 'expenses:read',
      schema: expenseListSchema,
      handler: (input: { from: string; to: string; status: 'active' | 'void' | 'all' }) =>
        expenses.overview(input),
    },

    [CHANNELS.expenseSave]: {
      capability: 'expenses:write',
      schema: expenseSchema,
      handler: (input: Parameters<ExpensesService['save']>[0], context) =>
        expenses.save(input, context.user.id),
    },

    [CHANNELS.expenseVoid]: {
      capability: 'expenses:void',
      schema: expenseVoidSchema,
      handler: (input: { id: number; reason: string }, context) =>
        expenses.void(input, context.user.id),
    },

    [CHANNELS.expenseCategorySave]: {
      capability: 'expenses:write',
      schema: expenseCategorySchema,
      handler: (input: Parameters<ExpensesService['saveCategory']>[0]) =>
        expenses.saveCategory(input),
    },

    [CHANNELS.expenseCategoryDelete]: {
      capability: 'expenses:write',
      schema: expenseIdSchema,
      handler: (input: { id: number }) => {
        expenses.deleteCategory(input.id);
        return null;
      },
    },
  };
}
