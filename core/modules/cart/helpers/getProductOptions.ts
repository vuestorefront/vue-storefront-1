import CartItem from '@vue-storefront/core/modules/cart/types/CartItem';
import { MappedProductOptionValue } from '@vue-storefront/core/modules/catalog/types/ProductConfiguration'

const mapValues = (current) => (val): MappedProductOptionValue => ({
  id: val.value_index,
  label: val.label,
  attribute_code: current.attribute_code,
  type: current.attribute_code
})

const reduceOptions = (prev, curr): Record<string, MappedProductOptionValue[]> => ({
  ...prev,
  [curr.attribute_code]: curr.values.map(mapValues(curr))
})

const getProductOptions = (product: CartItem): Record<string, MappedProductOptionValue[]> => {
  if (!product.configurable_options) {
    return null
  }

  return product.configurable_options
    .reduce(reduceOptions, {})
}

export default getProductOptions;
