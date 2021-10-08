import { SearchQuery } from 'storefront-query-builder';
import config from 'config';

interface Category {
  id: number,
  children_data?: Category[]
};

export enum PRODUCT_VISIBILITY {
  NOT_VISIBLE_INDIVIDUALLY = 1,
  CATALOG,
  SEARCH,
  CATALOG_AND_SEARCH
};

export enum PRODUCT_STATUS {
  NO_STATUS = 0,
  ENABLED,
  DISABLED,
  OUT_OF_STOCK = 4
}

const _findChildCategories = (categories: number[], category: Category): void => {
  if (!category || !category.children_data) {
    return;
  }

  for (const subcategory of category.children_data) {
    if (subcategory && subcategory.id) {
      categories.push(subcategory.id);
    }
    _findChildCategories(categories, subcategory);
  }
};

const _flatCategoriesTree = (parentCategory: Category): number[] => {
  const categories = [parentCategory.id];
  if (parentCategory.children_data) {
    _findChildCategories(categories, parentCategory)
  }
  return categories;
};

const _addAvailableCatalogFilters = (searchProductQuery: SearchQuery, filters: string[]): void => {
  for (let attrToFilter of filters) {
    searchProductQuery.addAvailableFilter({ field: attrToFilter, scope: 'catalog' });
  }
}

export function baseFilterProductsQuery (parentCategory: Category, filters: string[] = []): SearchQuery {
  const searchProductQuery = new SearchQuery()
    .applyFilter({
      key: 'visibility',
      value: {
        in: [
          PRODUCT_VISIBILITY.CATALOG,
          PRODUCT_VISIBILITY.SEARCH,
          PRODUCT_VISIBILITY.CATALOG_AND_SEARCH
        ]
      }
    })
    .applyFilter({
      key: 'status',
      value: {
        in: [
          PRODUCT_STATUS.NO_STATUS,
          PRODUCT_STATUS.ENABLED
        ]
      }
    });

  if (config.products.listOutOfStockProducts === false) {
    searchProductQuery.applyFilter({ key: 'stock.is_in_stock', value: { eq: true } });
  }

  _addAvailableCatalogFilters(searchProductQuery, filters);

  const categories = _flatCategoriesTree(parentCategory);
  searchProductQuery.applyFilter({ key: 'category_ids', value: { in: categories } });
  return searchProductQuery;
}