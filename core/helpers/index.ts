import { remove as removeAccents } from 'remove-accents'
import { formatCategoryLink } from '@vue-storefront/core/modules/url/helpers'
import Vue from 'vue'
import config from 'config'
import { sha3_224 } from 'js-sha3'
import store from '@vue-storefront/core/store'
import { adjustMultistoreApiUrl } from '@vue-storefront/core/lib/multistore'
import { coreHooksExecutors } from '@vue-storefront/core/hooks';
import getApiEndpointUrl from '@vue-storefront/core/helpers/getApiEndpointUrl';
import omit from 'lodash-es/omit'
import { baseFilterProductsQuery } from './baseFilterProductsQuery';

export { baseFilterProductsQuery };

export const processURLAddress = (url: string = '') => {
  if (url.startsWith('/')) return `${getApiEndpointUrl(config.api, 'url')}${url}`
  return url
}

export const processLocalizedURLAddress = (url: string = '') => {
  if (config.storeViews.multistore) {
    return processURLAddress(adjustMultistoreApiUrl(url))
  }

  return processURLAddress(url)
}

/**
 * Create slugify -> "create-slugify" permalink  of text
 * @param {String} text
 */
export function slugify (text) {
  // remove regional characters
  text = removeAccents(text)

  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/&/g, '-and-') // Replace & with 'and'
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-') // Replace multiple - with single -
}

/**
 * @param {string} relativeUrl
 * @param {number} width
 * @param {number} height
 * @param {string} pathType
 * @returns {string}
 */
export function getThumbnailPath (relativeUrl: string, width: number = 0, height: number = 0, pathType: string = 'product'): string {
  if (config.images.useSpecificImagePaths) {
    const path = config.images.paths[pathType] !== undefined ? config.images.paths[pathType] : ''
    relativeUrl = path + relativeUrl
  }

  if (config.images.useExactUrlsNoProxy) {
    return coreHooksExecutors.afterProductThumbnailPathGenerate({ path: relativeUrl, sizeX: width, sizeY: height, pathType }).path // this is exact url mode
  } else {
    let resultUrl
    if (relativeUrl && (relativeUrl.indexOf('://') > 0 || relativeUrl.indexOf('?') > 0 || relativeUrl.indexOf('&') > 0)) relativeUrl = encodeURIComponent(relativeUrl)
    // proxyUrl is not a url base path but contains {{url}} parameters and so on to use the relativeUrl as a template value and then do the image proxy opertions
    let baseUrl = processURLAddress(config.images.proxyUrl ? config.images.proxyUrl : config.images.baseUrl)
    if (baseUrl.indexOf('{{') >= 0) {
      baseUrl = baseUrl.replace('{{url}}', relativeUrl)
      baseUrl = baseUrl.replace('{{width}}', width.toString())
      baseUrl = baseUrl.replace('{{height}}', height.toString())
      resultUrl = baseUrl
    } else {
      resultUrl = `${baseUrl}${width.toString()}/${height.toString()}/resize${relativeUrl}`
    }
    const path = relativeUrl && relativeUrl.indexOf('no_selection') < 0 ? resultUrl : config.images.productPlaceholder || ''

    return coreHooksExecutors.afterProductThumbnailPathGenerate({ path, sizeX: width, sizeY: height, pathType }).path
  }
}

/**
 * Re-format category path to be suitable for breadcrumb
 * @param {Array} categoryPath
 */
export function formatBreadCrumbRoutes (categoryPath) {
  const breadCrumbRoutesArray = []
  for (let category of categoryPath) {
    breadCrumbRoutesArray.push({
      name: category.name,
      route_link: formatCategoryLink(category)
    })
  }
  return breadCrumbRoutesArray
}

/**
 * Return configurable product thumbnail depending on the configurable_children
 * @param {object} product
 * @param {bool} ignoreConfig
 */
export function productThumbnailPath (product, ignoreConfig = false) {
  let thumbnail = product.image
  if ((!thumbnail && product.type_id && product.type_id === 'configurable') && product.hasOwnProperty('configurable_children') &&
    product.configurable_children.length && (ignoreConfig || !product.is_configured) &&
    ('image' in product.configurable_children[0])
  ) {
    thumbnail = product.configurable_children[0].image
    if (!thumbnail || thumbnail === 'no_selection') {
      const childWithImg = product.configurable_children.find(f => f.image && f.image !== 'no_selection')
      if (childWithImg) {
        thumbnail = childWithImg.image
      } else {
        thumbnail = product.image
      }
    }
  }
  return thumbnail
}

export function buildFilterProductsQuery (currentCategory, chosenFilters = {}, defaultFilters = null) {
  let filterQr = baseFilterProductsQuery(currentCategory, defaultFilters == null ? config.products.defaultFilters : defaultFilters)

  // add choosedn filters
  for (let code of Object.keys(chosenFilters)) {
    const filter = chosenFilters[code]
    const attributeCode = Array.isArray(filter) ? filter[0].attribute_code : filter.attribute_code

    if (Array.isArray(filter) && attributeCode !== 'price') {
      const values = filter.map(filter => filter.id)
      filterQr = filterQr.applyFilter({ key: attributeCode, value: { 'in': values }, scope: 'catalog' })
    } else if (attributeCode !== 'price') {
      filterQr = filterQr.applyFilter({ key: attributeCode, value: { 'eq': filter.id }, scope: 'catalog' })
    } else { // multi should be possible filter here?
      const rangeqr = {}
      const filterValues = Array.isArray(filter) ? filter : [filter]
      filterValues.forEach(singleFilter => {
        if (singleFilter.from) rangeqr['gte'] = singleFilter.from
        if (singleFilter.to) rangeqr['lte'] = singleFilter.to
      })
      filterQr = filterQr.applyFilter({ key: attributeCode, value: rangeqr, scope: 'catalog' })
    }
  }

  return filterQr
}

export function once (key, fn) {
  const { process = {} } = global
  const processKey = key + '__ONCE__'
  if (!process.hasOwnProperty(processKey)) {
    // Logger.debug(`Once ${key}`, 'helper')()
    process[processKey] = true
    fn()
  }
}

export const isServer: boolean = typeof window === 'undefined'

// Online/Offline helper
export const onlineHelper = Vue.observable({
  isOnline: isServer || navigator.onLine
})

export const routerHelper = Vue.observable({
  popStateDetected: false
})

!isServer && window.addEventListener('online', () => { onlineHelper.isOnline = true })
!isServer && window.addEventListener('offline', () => { onlineHelper.isOnline = false })
!isServer && window.addEventListener('popstate', () => { routerHelper.popStateDetected = true })
if (!isServer && 'scrollRestoration' in history) {
  history.scrollRestoration = 'manual'
}

/*
  * serial executes Promises sequentially.
  * @param {funcs} An array of funcs that return promises.
  * @example
  * const urls = ['/url1', '/url2', '/url3']
  * serial(urls.map(url => () => $.ajax(url)))
  *     .then(Logger.log.bind(Logger))()
  */
export const serial = async promises => {
  const results = []
  for (const item of promises) {
    const result = await item;
    results.push(result)
  }
  return results
}

// helper to calculate the hash of the shopping cart
export const calcItemsHmac = (items = [], token) => {
  return sha3_224(JSON.stringify({
    // we need to omit those properties because they are loaded async and added to product data
    // and they are not needed to compare products
    items: items.map(item => omit(item, ['stock', 'totals'])),
    token: token
  }))
}

export function extendStore (moduleName: string | string[], module: any) {
  const merge = function (object: any = {}, source: any) {
    for (let key in source) {
      if (Array.isArray(source[key])) {
        object[key] = merge([], source[key])
      } else if (source[key] === null && !object[key]) {
        object[key] = null
      } else if (typeof source[key] === 'object' && Object.keys(source[key]).length > 0) {
        object[key] = merge(object[key], source[key])
      } else if (typeof source[key] === 'object' && object === null) {
        object = {}
        object[key] = source[key]
      } else {
        object[key] = source[key]
      }
    }
    return object
  };
  moduleName = Array.isArray(moduleName) ? moduleName : [moduleName]
  const originalModule: any = moduleName.reduce(
    (state: any, moduleName: string) => state._children[moduleName],
    (store as any)._modules.root
  )
  const rawModule: any = merge({}, originalModule._rawModule)
  const extendedModule: any = merge(rawModule, module)

  store.unregisterModule(moduleName)
  store.registerModule(moduleName, extendedModule)
}

export function reviewJsonLd (reviews, { name, category, mpn, url_path, price, stock, is_in_stock, sku, image, description }, priceCurrency) {
  return reviews.map(({ title, detail, nickname, created_at }) => (
    {
      '@context': 'http://schema.org/',
      '@type': 'Review',
      reviewAspect: title,
      reviewBody: detail,
      datePublished: created_at,
      author: nickname,
      itemReviewed: {
        '@type': 'Product',
        name,
        sku,
        image,
        description,
        offers: {
          '@type': 'Offer',
          category: category
            ? category
              .map(({ name }) => name || null)
              .filter(name => name !== null)
            : null,
          mpn,
          url: url_path,
          priceCurrency,
          price,
          itemCondition: 'https://schema.org/NewCondition',
          availability: stock && is_in_stock ? 'InStock' : 'OutOfStock'
        }
      }
    }
  )
  )
}

function getMaterials (material, customAttributes) {
  const materialsArr = []
  if (customAttributes && customAttributes.length && customAttributes.length > 0 && material && material.length && material.length > 0) {
    const materialOptions = customAttributes.find(({ attribute_code }) => attribute_code === 'material').options
    if (Array.isArray(material)) {
      for (let key in materialOptions) {
        material.forEach(el => {
          if (String(el) === materialOptions[key].value) {
            materialsArr.push(materialOptions[key].label)
          }
        })
      }
    } else {
      for (let key in materialOptions) {
        if (material === materialOptions[key].value) {
          materialsArr.push(materialOptions[key].label)
        }
      }
    }
  }
  return materialsArr
}

export function productJsonLd ({ category, image, name, id, sku, mpn, description, price, url_path, stock, is_in_stock, material }, color, priceCurrency, customAttributes) {
  return {
    '@context': 'http://schema.org',
    '@type': 'Product',
    category: category
      ? category
        .map(({ name }) => name || null)
        .filter(name => name !== null)
      : null,
    color,
    description,
    image,
    itemCondition: 'http://schema.org/NewCondition',
    material: getMaterials(material, customAttributes),
    name,
    productID: id,
    sku,
    mpn,
    offers: {
      '@type': 'Offer',
      category: category
        ? category
          .map(({ name }) => name || null)
          .filter(name => name !== null)
        : null,
      mpn,
      url: url_path,
      priceCurrency,
      price,
      itemCondition: 'https://schema.org/NewCondition',
      availability: stock && is_in_stock ? 'InStock' : 'OutOfStock',
      sku
    }
  }
}
