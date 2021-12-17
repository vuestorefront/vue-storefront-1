export interface Category {
  id: number,
  children_data?: Category[],
  [key: string]: any
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
