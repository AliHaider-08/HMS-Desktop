import type {
  Expense,
  ExpenseCategory,
  ExpenseInput,
  ExpenseOverview,
  ExpensePaidFrom,
} from '../../src/types/api';
import type { ExpensesRepository } from '../db/repositories/expensesRepository';
import type { ShiftsRepository } from '../db/repositories/shiftsRepository';
import { AppError } from '../utils/errors';
import { toSqlDate } from '../utils/datetime';
import { logInfo } from './logger';

/**
 * Shop expenses (Roadmap 4.F).
 *
 * The client: "shop k kharchy bhi add kron" — so the hisab is complete and the
 * profit figure in 4.G is real money, not an estimate that ignores rent.
 *
 * The one rule that matters here is where the money came from:
 *
 *   * **cash** — paid out of the till. The expense writes a `cash_out` row on the
 *     open shift, so the drawer count at close is right. With no shift open the
 *     entry is refused rather than silently losing the drawer link.
 *   * **bank / other** — paid from outside the shop's cash box (a cheque, the
 *     owner's own pocket). No drawer row, because no notes left the counter.
 *
 * Voiding never deletes anything: the row stays with `status = 'void'`, who and
 * why, and the drawer row it wrote is reversed with a `cash_in` so the till goes
 * back to where it was. The void is a separate, auditable event.
 */
export function createExpensesService(deps: {
  expenses: ExpensesRepository;
  shifts: ShiftsRepository;
}) {
  const { expenses, shifts } = deps;

  /** Refuses politely on a database that predates migration 020. */
  function ensureReady(): void {
    if (!expenses.isReady) {
      throw new AppError(
        'CONFLICT',
        'Expenses are not available in this database yet. Restart the app to finish the update.',
      );
    }
  }

  function categoryOrFail(id: number): ExpenseCategory {
    const category = expenses.findCategory(id);
    if (!category) throw new AppError('NOT_FOUND', 'That expense category does not exist');
    if (!category.active) {
      throw new AppError('CONFLICT', 'That expense category has been removed');
    }
    return category;
  }

  function expenseOrFail(id: number): Expense {
    const expense = expenses.find(id);
    if (!expense) throw new AppError('NOT_FOUND', 'That expense does not exist');
    return expense;
  }

  /** The drawer row an expense wrote, if any. */
  function drawerRow(expenseId: number): { id: number; shiftId: number; amount: number } | null {
    return expenses.drawerMovement(expenseId);
  }

  return {
    overview(input: { from: string; to: string; status?: 'active' | 'void' | 'all' }): ExpenseOverview {
      ensureReady();

      const summary = expenses.summary(input.from, input.to);

      return {
        from: input.from,
        to: input.to,
        expenses: expenses.list({
          from: input.from,
          to: input.to,
          status: input.status ?? 'active',
        }),
        categories: expenses.listCategories(),
        summary: summary.rows,
        total: summary.total,
        drawerOpen: shifts.current() !== null,
      };
    },

    categories(): ExpenseCategory[] {
      ensureReady();
      return expenses.listCategories();
    },

    saveCategory(input: { id?: number; name: string; sortOrder: number }): ExpenseCategory {
      ensureReady();

      const name = input.name.trim();
      if (name.length === 0) throw new AppError('VALIDATION_ERROR', 'Give the category a name');

      if (expenses.categoryNameTaken(name, input.id ?? null)) {
        throw new AppError('CONFLICT', `${name} already exists`);
      }

      if (typeof input.id === 'number') {
        const existing = expenses.findCategory(input.id);
        if (!existing) throw new AppError('NOT_FOUND', 'That category does not exist');
        return expenses.updateCategory({ id: input.id, name, sortOrder: input.sortOrder });
      }

      return expenses.createCategory({ name, sortOrder: input.sortOrder });
    },

    /** Soft delete. Refused while active expenses still use it, on purpose. */
    deleteCategory(id: number): void {
      ensureReady();

      const category = expenses.findCategory(id);
      if (!category) throw new AppError('NOT_FOUND', 'That category does not exist');
      if (category.isSystem) {
        throw new AppError('CONFLICT', 'This category ships with the app and cannot be removed');
      }
      if (category.expenseCount > 0) {
        throw new AppError(
          'CONFLICT',
          `${category.expenseCount} expense${category.expenseCount === 1 ? '' : 's'} use this category. ` +
            'Rename it, or void those expenses first.',
        );
      }

      expenses.deactivateCategory(id);
      logInfo(`Expense category removed: ${category.name}`);
    },

    /**
     * Records one expense and, when it was paid in cash, takes the money out of
     * the open drawer in the same transaction.
     */
    save(input: ExpenseInput, createdBy: number): Expense {
      ensureReady();
      categoryOrFail(input.categoryId);

      if (input.amount <= 0) {
        throw new AppError('VALIDATION_ERROR', 'The amount must be more than zero');
      }

      const spentOn = input.spentOn || toSqlDate();
      if (spentOn > toSqlDate()) {
        throw new AppError('VALIDATION_ERROR', 'An expense cannot be dated in the future');
      }

      const paidFrom: ExpensePaidFrom = input.paidFrom;
      const shift = paidFrom === 'cash' ? shifts.current() : null;

      if (paidFrom === 'cash' && !shift) {
        throw new AppError(
          'CONFLICT',
          'No drawer is open. Open the day first, or record this as paid from the bank.',
        );
      }

      const expenseId = expenses.transaction(() => {
        const id = expenses.create({
          expenseNo: expenses.nextExpenseNo(),
          categoryId: input.categoryId,
          spentOn,
          amount: Math.round(input.amount),
          paidFrom,
          payee: input.payee.trim(),
          notes: input.notes.trim(),
          shiftId: shift?.id ?? null,
          createdBy,
        });

        if (shift) {
          shifts.addMovement({
            shiftId: shift.id,
            // 'expense' is the kind the day-close report and expectedCash both
            // subtract. Using cash_out here would take the money out of the
            // drawer but leave the "expenses" line on the Z report at zero.
            kind: 'expense',
            amount: Math.round(input.amount),
            reason: `Expense ${expenses.find(id)?.expenseNo ?? ''}: ${
              input.payee.trim() || 'shop expense'
            }`,
            refOrderId: null,
            refExpenseId: id,
            createdBy,
          });
        }

        return id;
      });

      const saved = expenseOrFail(expenseId);
      logInfo(`Expense recorded: ${saved.expenseNo} ${saved.amount} paisa (${saved.paidFrom})`);
      return saved;
    },

    /**
     * Voids an expense. The money goes back into the drawer if it left the drawer,
     * and the entry itself stays with the reason it was reversed.
     */
    void(input: { id: number; reason: string }, voidedBy: number): Expense {
      ensureReady();

      const expense = expenseOrFail(input.id);
      if (expense.status === 'void') {
        throw new AppError('CONFLICT', 'This expense is already void');
      }

      const reason = input.reason.trim();
      if (reason.length < 3) {
        throw new AppError('VALIDATION_ERROR', 'Give a short reason for voiding this expense');
      }

      expenses.transaction(() => {
        expenses.void(expense.id, reason, voidedBy);

        /*
         * Put the drawer back. The cash_in goes on the shift that originally paid
         * when it is still open; if that day was already closed the money is in
         * the current drawer instead, because the closed shift's count is history
         * and must never be rewritten (the same rule the purchase void follows).
         */
        const row = drawerRow(expense.id);
        if (!row) return;

        const payingShift = shifts.find(row.shiftId);
        const target = payingShift?.status === 'open' ? payingShift : shifts.current();
        if (!target) return;

        const earlier = target.id !== row.shiftId;

        shifts.addMovement({
          shiftId: target.id,
          kind: 'cash_in',
          amount: row.amount,
          reason: `Void expense ${expense.expenseNo}: ${reason}${
            earlier ? ' (paid in an earlier shift)' : ''
          }`,
          refOrderId: null,
          refExpenseId: expense.id,
          createdBy: voidedBy,
        });
      });

      const saved = expenseOrFail(expense.id);
      logInfo(`Expense voided: ${saved.expenseNo} (${reason})`);
      return saved;
    },
  };
}

export type ExpensesService = ReturnType<typeof createExpensesService>;
