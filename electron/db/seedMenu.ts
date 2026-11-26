import type { CatalogRepository } from './repositories/catalogRepository';
import { logInfo } from '../services/logger';

/** Starter names for a new restaurant menu. Prices must be set by the owner. */
const STARTER_CATEGORIES = [
  {
    name: 'Fast Food',
    sortOrder: 1,
    items: [
      'Zinger Burger',
      'Chicken Burger',
      'Beef Burger',
      'Chicken Cheese Burger',
      'Club Sandwich',
      'Chicken Sandwich',
      'Chicken Shawarma',
      'Chicken Roll',
      'Chicken Broast',
      'Chicken Nuggets',
      'Chicken Wings',
      'French Fries',
      'Loaded Fries',
      'Chicken Pizza',
      'Pepperoni Pizza',
      'Garlic Bread',
      'Coleslaw',
      'Soft Drink',
    ],
  },
  {
    name: 'Desi Food',
    sortOrder: 2,
    items: [
      'Chicken Karahi (Half)',
      'Chicken Karahi (Full)',
      'Mutton Karahi (Half)',
      'Mutton Karahi (Full)',
      'Chicken Handi',
      'Mutton Handi',
      'Chicken Biryani',
      'Beef Biryani',
      'Chicken Pulao',
      'Daal Chawal',
      'Nihari',
      'Haleem',
      'Seekh Kebab',
      'Chicken Tikka',
      'Chapli Kebab',
      'Tandoori Roti',
      'Naan',
      'Raita',
    ],
  },
] as const;

/**
 * Adds a useful menu scaffold without replacing a restaurant's existing data.
 * Placeholder items stay unavailable and at Rs 0 until the owner enters prices.
 */
export function seedStarterMenu(catalog: CatalogRepository): void {
  let addedItems = 0;

  for (const [index, group] of STARTER_CATEGORIES.entries()) {
    const categories = catalog.listCategories();
    const existing = categories.find(
      (category) => category.name.toLowerCase() === group.name.toLowerCase(),
    );

    // A deliberately deactivated category is left untouched.
    if (existing && !existing.active) continue;

    const categoryId = existing?.id ?? catalog.createCategory(group.name, index + 1);
    for (const name of group.items) {
      if (catalog.itemNameExists(categoryId, name)) continue;
      catalog.createItem({
        categoryId,
        name,
        price: 0,
        available: false,
        image: null,
      });
      addedItems += 1;
    }
  }

  if (addedItems > 0) logInfo(`Starter menu added (${addedItems} items; prices need setup).`);
}
