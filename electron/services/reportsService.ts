import type {
  DailySalesRow,
  DashboardStats,
  DateRange,
  DeliveryReportRow,
  ProfitAndLoss,
  ReportBundle,
  SalarySummaryRow,
  TopItemRow,
  VehicleExpenseRow,
} from '../../src/types/api';
import type { OrdersRepository } from '../db/repositories/ordersRepository';
import type { CatalogRepository } from '../db/repositories/catalogRepository';
import type { StaffRepository } from '../db/repositories/staffRepository';
import type { VehiclesRepository } from '../db/repositories/vehiclesRepository';
import type { ExpensesRepository } from '../db/repositories/expensesRepository';
import type { StaffService } from './staffService';
import { daysUntil, monthEnd, monthStart, toSqlDate, todaySqlDate } from '../utils/datetime';

/** Last `count` days ending today, filling gaps with zero rows. */
export function lastNDays(count: number): { fromDate: string; toDate: string; days: string[] } {
  const days: string[] = [];
  const today = new Date();

  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    days.push(toSqlDate(date));
  }

  return {
    fromDate: days[0] ?? todaySqlDate(),
    toDate: days[days.length - 1] ?? todaySqlDate(),
    days,
  };
}

export function createReportsService(deps: {
  orders: OrdersRepository;
  catalog: CatalogRepository;
  staff: StaffRepository;
  vehicles: VehiclesRepository;
  staffService: StaffService;
  /** Shop expenses (4.E). Null while that migration has not run. */
  expenses?: ExpensesRepository;
}) {
  const { orders, catalog, staff, vehicles, staffService, expenses } = deps;

  function fillDaily(
    days: string[],
    rows: Array<{ date: string; orders: number; sales: number }>,
  ): DailySalesRow[] {
    const byDate = new Map(rows.map((row) => [row.date, row]));
    return days.map((date) => ({
      date,
      orders: byDate.get(date)?.orders ?? 0,
      sales: byDate.get(date)?.sales ?? 0,
    }));
  }

  return {
    dashboard(): DashboardStats {
      const today = todaySqlDate();
      const week = lastNDays(7);
      const month = today.slice(0, 7);

      const todayTotals = orders.todayTotals(today);
      const weekRows = orders.salesByDay(week.fromDate, week.toDate);

      const expiring = vehicles.expiringBefore(toSqlDate(new Date(Date.now() + 30 * 86_400_000)));

      const expiringVehicles = expiring.flatMap((vehicle) => {
        const alerts: DashboardStats['expiringVehicles'] = [];

        if (vehicle.registrationExpiry) {
          alerts.push({
            vehicleId: vehicle.id,
            plateNo: vehicle.plateNo,
            document: 'registration',
            expiryDate: vehicle.registrationExpiry,
            daysLeft: daysUntil(vehicle.registrationExpiry),
          });
        }
        if (vehicle.insuranceExpiry) {
          alerts.push({
            vehicleId: vehicle.id,
            plateNo: vehicle.plateNo,
            document: 'insurance',
            expiryDate: vehicle.insuranceExpiry,
            daysLeft: daysUntil(vehicle.insuranceExpiry),
          });
        }

        return alerts;
      });

      return {
        todaySales: todayTotals.sales,
        todayOrders: todayTotals.orders,
        pendingDeliveries: orders.pendingDeliveries(),
        monthSales: orders.rangeSales(monthStart(month), monthEnd(month)),
        totalItems: catalog.countActiveItems(),
        activeStaff: staff.listWaiters().length + staff.listDeliveryBoys().length,
        expiringVehicles: expiringVehicles.sort((a, b) => a.daysLeft - b.daysLeft),
        recentOrders: orders.recent(8),
        salesByDay: fillDaily(week.days, weekRows),
      };
    },

    /**
     * Profit & loss (Roadmap 4.G) — the number the owner actually asked for.
     *
     *   net sales − cost of the food sold = gross profit
     *   gross profit − the shop's expenses = net profit
     *
     * Two honesty rules are baked in:
     *
     *   * Sales and cost are summed over the SAME bills. A bill saved before its
     *     item had a recipe can never be priced after the fact, so it is excluded
     *     from the profit and reported separately as `unknownNetSales`. Zeroing the
     *     whole period would make the P&L useless in any shop that added recipes
     *     later; treating those bills as free would invent profit.
     *   * Tax is shown and then excluded. It is collected for the government; a
     *     P&L that counts it as income would inflate every margin.
     */
    profitAndLoss(range: DateRange): ProfitAndLoss {
      const sales = orders.profitAndLoss(range.fromDate, range.toDate);
      const shop = expenses?.summary(range.fromDate, range.toDate) ?? { rows: [], total: 0 };

      // The pair that actually belongs together: the sales we could price, and
      // what those sales cost.
      const grossProfit = sales.knownNetSales - sales.cogs;

      return {
        from: range.fromDate,
        to: range.toDate,
        orderCount: sales.orders,
        subtotal: sales.subtotal,
        discount: sales.discount,
        netSales: sales.netSales,
        knownNetSales: sales.knownNetSales,
        unknownNetSales: sales.unknownNetSales,
        unpricedBills: sales.unpricedBills,
        tax: sales.tax,
        totalCollected: sales.total,
        cogs: sales.cogs,
        linesWithoutCost: sales.linesWithoutCost,
        grossProfit,
        shopExpenses: shop.total,
        wastageValue: sales.wastageValue,
        wastageQty: sales.wastageQty,
        netProfit: grossProfit - shop.total,
        cancelledCount: sales.cancelled,
        cancelledValue: sales.cancelledValue,
        expensesByCategory: shop.rows,
      };
    },

    range(range: DateRange): ReportBundle {
      const totals = orders.rangeTotals(range.fromDate, range.toDate);
      const days = enumerateDays(range);

      return {
        range,
        dailySales: fillDaily(days, orders.salesByDay(range.fromDate, range.toDate)),
        topItems: orders.topItems(range.fromDate, range.toDate, 10) as TopItemRow[],
        totals: {
          orders: totals.orders,
          sales: totals.sales,
          discount: totals.discount,
          tax: totals.tax,
          cancelled: totals.cancelled,
        },
        byType: orders.salesByType(range.fromDate, range.toDate),
      };
    },

    salarySummary(month: string): SalarySummaryRow[] {
      return staffService.peopleWithSalary(month);
    },

    deliveryReport(range: DateRange): DeliveryReportRow[] {
      return orders.deliveriesByBoy(range.fromDate, range.toDate) as DeliveryReportRow[];
    },

    vehicleExpenses(range: DateRange): VehicleExpenseRow[] {
      return vehicles.list().map((vehicle) => {
        const rows = vehicles.expenses(vehicle.id, range.fromDate, range.toDate);
        const fuel = rows
          .filter((row) => row.type === 'fuel')
          .reduce((sum, row) => sum + row.amount, 0);
        const maintenance = rows
          .filter((row) => row.type === 'maintenance' || row.type === 'repair')
          .reduce((sum, row) => sum + row.amount, 0);
        const other = rows
          .filter((row) => row.type === 'other')
          .reduce((sum, row) => sum + row.amount, 0);

        return {
          vehicleId: vehicle.id,
          plateNo: vehicle.plateNo,
          fuel,
          maintenance,
          other,
          total: fuel + maintenance + other,
          entries: rows.length,
        };
      });
    },
  };
}

/** Every date between two `YYYY-MM-DD` values, inclusive. */
export function enumerateDays(range: DateRange): string[] {
  const days: string[] = [];
  const cursor = new Date(`${range.fromDate}T00:00:00`);
  const end = new Date(`${range.toDate}T00:00:00`);
  let guard = 0;

  while (cursor <= end && guard < 400) {
    days.push(toSqlDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
    guard += 1;
  }

  return days;
}

export type ReportsService = ReturnType<typeof createReportsService>;
