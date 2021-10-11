import { baseFilterProductsQuery } from '../../baseFilterProductsQuery';
import { PRODUCT_VISIBILITY, PRODUCT_STATUS } from '../../types';
import { SearchQuery } from 'storefront-query-builder';
import config from 'config';

jest.mock('config', () => ({
  products: {
    listOutOfStockProducts: true
  }
}))

describe('baseFilterProductsQuery', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('builds basic search query', () => {
    const category = {
      id: 1,
      children_data: []
    };
    const spy = jest.spyOn(SearchQuery.prototype, 'applyFilter');

    baseFilterProductsQuery(category);

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      key: 'visibility',
      value: { in: [
        PRODUCT_VISIBILITY.CATALOG,
        PRODUCT_VISIBILITY.SEARCH,
        PRODUCT_VISIBILITY.CATALOG_AND_SEARCH
      ] }
    }));
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      key: 'status',
      value: { in: [
        PRODUCT_STATUS.NO_STATUS,
        PRODUCT_STATUS.ENABLED
      ] }
    }));
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      key: 'category_ids',
      value: { in: [1] }
    }));
  });

  it('adds available filters to the query', () => {
    const category = {
      id: 1,
      children_data: []
    };
    const filters = [
      'color',
      'size'
    ];
    const spy = jest.spyOn(SearchQuery.prototype, 'addAvailableFilter');

    baseFilterProductsQuery(category, filters);

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      field: 'color',
      scope: 'catalog'
    }));
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      field: 'size',
      scope: 'catalog'
    }));
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('flats category tree', () => {
    const category = {
      id: 1,
      children_data: [
        {
          id: 2,
          children_data: [
            {
              id: 3,
              children_data: [
                {
                  id: 4
                }
              ]
            }
          ]
        },
        {
          id: 5
        }
      ]
    };
    const filters = [];
    const spy = jest.spyOn(SearchQuery.prototype, 'applyFilter');

    baseFilterProductsQuery(category, filters);

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      key: 'category_ids',
      value: { in: [1, 2, 3, 4, 5] }
    }));
  });

  it('removes out of stock products based on config', () => {
    const category = {
      id: 1,
      children_data: []
    };
    const filters = [];
    config.products.listOutOfStockProducts = false;
    const spy = jest.spyOn(SearchQuery.prototype, 'applyFilter');

    baseFilterProductsQuery(category, filters);

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      key: 'stock.is_in_stock',
      value: { eq: true }
    }));
    expect(spy).toHaveBeenCalledTimes(4);
  });
});
