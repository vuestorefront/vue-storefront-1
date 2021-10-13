import CartItem from '@vue-storefront/core/modules/cart/types/CartItem'
import { ProductConfiguration } from '@vue-storefront/core/modules/catalog/types/ProductConfiguration'
import getProductOptions from './getProductOptions'
import { MappedProductOptionValue } from '@vue-storefront/core/modules/catalog/types/ProductConfiguration'

const ATTRIBUTES = ['color', 'size'];
const getAttributesFields = (attrOptions: MappedProductOptionValue[] = [], productAttrValue) =>
  attrOptions.find(attrOption => String(attrOption.id) === String(productAttrValue))

const getProductConfiguration = (product: CartItem): ProductConfiguration => {
  const options = getProductOptions(product);

  if (!options) {
    return null
  }

  return ATTRIBUTES.reduce((prev, curr) => ({
    ...prev,
    [curr]: {
      attribute_code: curr,
      ...getAttributesFields(options[curr], product[curr])
    }
  }), {}) as any as ProductConfiguration
}

export default getProductConfiguration;
