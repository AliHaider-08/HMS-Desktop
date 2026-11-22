import { z } from 'zod';
import { CHANNELS } from '../../src/types/api';
import {
  ingredientSchema,
  loadStarterListSchema,
  openingStockSchema,
  purchaseFilterSchema,
  purchaseSchema,
  supplierSchema,
  voidPurchaseSchema,
} from '../../src/types/schemas';
import type { InventoryService } from '../services/inventoryService';
import type { HandlerContext, HandlerRegistry } from './registry';

/* Shape-only schemas; business rules live in inventoryService. */

const ingredientIdSchema = z.object({ id: z.number().int().positive() });
const supplierIdSchema = z.object({ id: z.number().int().positive() });
const purchaseIdSchema = z.object({ id: z.number().int().positive() });
const movementsSchema = z.object({
  ingredientId: z.number().int().positive(),
  limit: z.number().int().min(1).max(500).default(100),
});

/** Stock levels, ingredients, suppliers and purchases (Roadmap Phase 4.A / 4.B). */
export function stockHandlers(inventory: InventoryService): HandlerRegistry {
  return {
    /* ----------------------------- stock levels ----------------------------- */

    [CHANNELS.stockOverview]: {
      capability: 'inventory:read',
      handler: () => inventory.overview(),
    },

    [CHANNELS.ingredients]: {
      capability: 'inventory:read',
      handler: () => inventory.ingredients(),
    },

    [CHANNELS.ingredientGet]: {
      capability: 'inventory:read',
      schema: ingredientIdSchema,
      handler: (input: { id: number }) => inventory.ingredient(input.id),
    },

    [CHANNELS.ingredientSave]: {
      capability: 'inventory:write',
      schema: ingredientSchema,
      handler: (input: Parameters<InventoryService['saveIngredient']>[0]) =>
        inventory.saveIngredient(input),
    },

    [CHANNELS.ingredientDelete]: {
      capability: 'inventory:write',
      schema: ingredientIdSchema,
      handler: (input: { id: number }) => {
        inventory.deleteIngredient(input.id);
        return null;
      },
    },

    [CHANNELS.starterCatalogue]: {
      capability: 'inventory:read',
      handler: () => inventory.starterCatalogue(),
    },

    [CHANNELS.starterLoad]: {
      capability: 'inventory:write',
      schema: loadStarterListSchema,
      handler: (input: { names: string[] }) => inventory.loadStarterList(input.names),
    },

    /* ------------------------------- suppliers ------------------------------ */

    [CHANNELS.suppliers]: {
      capability: 'inventory:read',
      handler: () => inventory.suppliers(),
    },

    [CHANNELS.supplierSave]: {
      capability: 'inventory:write',
      schema: supplierSchema,
      handler: (input: Parameters<InventoryService['saveSupplier']>[0]) =>
        inventory.saveSupplier(input),
    },

    [CHANNELS.supplierDelete]: {
      capability: 'inventory:write',
      schema: supplierIdSchema,
      handler: (input: { id: number }) => {
        inventory.deleteSupplier(input.id);
        return null;
      },
    },

    /* ------------------------------- purchases ------------------------------ */

    [CHANNELS.purchases]: {
      capability: 'inventory:read',
      schema: purchaseFilterSchema,
      handler: (input: { fromDate: string; toDate: string; limit: number }) =>
        inventory.purchases(input),
    },

    [CHANNELS.purchaseGet]: {
      capability: 'inventory:read',
      schema: purchaseIdSchema,
      handler: (input: { id: number }) => inventory.purchase(input.id),
    },

    [CHANNELS.purchaseCreate]: {
      capability: 'purchases:write',
      schema: purchaseSchema,
      handler: (
        input: Parameters<InventoryService['createPurchase']>[0],
        context: HandlerContext,
      ) => inventory.createPurchase(input, context.user.id),
    },

    [CHANNELS.purchaseVoid]: {
      capability: 'purchases:void',
      schema: voidPurchaseSchema,
      handler: (input: { id: number; reason: string }, context: HandlerContext) =>
        inventory.voidPurchase(input.id, input.reason, context.user.id),
    },

    [CHANNELS.openingStock]: {
      // Opening stock is a one-time set-up act, not till work: gated on
      // purchases:void (admin/manager) rather than a cashier capability.
      capability: 'purchases:void',
      schema: openingStockSchema,
      handler: (
        input: Parameters<InventoryService['openingStock']>[0],
        context: HandlerContext,
      ) => inventory.openingStock(input, context.user.id),
    },

    [CHANNELS.stockMovements]: {
      capability: 'inventory:read',
      schema: movementsSchema,
      handler: (input: { ingredientId: number; limit: number }) => inventory.movements(input),
    },
  };
}
