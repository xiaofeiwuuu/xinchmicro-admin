// 轮播图链接：小程序首页点击轮播图时（pages/home/index.vue 的 handleBannerClick）
//   - 空：不跳转
//   - http 开头：只复制网址，不跳转
//   - 其他：当作小程序内页面路径跳转（底部标签页用 switchTab，其余用 navigateTo，见小程序 utils/nav.js）
// 这里负责把「选了哪个分类/目录/产品」拼成路径，以及把已保存的路径还原成选择。

export const LINK_TYPES = {
  none: 'none',
  category: 'category',
  catalog: 'catalog',
  product: 'product',
  company: 'company',
  custom: 'custom'
};

const enc = (name) => encodeURIComponent(name == null ? '' : String(name));

// 根据选择生成链接。名称放进路径里是为了让小程序页面标题能显示；含 & # ? % 等符号必须编码。
export const COMPANY_LINK = '/pages/about/index';

export function buildLink(type, id, name) {
  if (type === LINK_TYPES.company) return COMPANY_LINK;
  if (id === undefined || id === null || id === '') return '';
  if (type === LINK_TYPES.category) return `/pages/catalog/index?categoryId=${id}&categoryName=${enc(name)}`;
  if (type === LINK_TYPES.catalog) return `/pages/product/list?catalogId=${id}&catalogName=${enc(name)}`;
  if (type === LINK_TYPES.product) return `/pages/product/detail?id=${id}`;
  return '';
}

// 把已保存的链接还原成 { type, id, custom }。
// 旧数据里「无」是链接必填时的占位，按「不跳转」处理。
export function parseLink(link) {
  const s = typeof link === 'string' ? link.trim() : '';
  if (!s || s === '无') return { type: LINK_TYPES.none, id: undefined, custom: '' };
  if (s === COMPANY_LINK) return { type: LINK_TYPES.company, id: undefined, custom: '' };
  let m = s.match(/^\/pages\/catalog\/index\?categoryId=(\d+)(?:&|$)/);
  if (m) return { type: LINK_TYPES.category, id: Number(m[1]), custom: '' };
  m = s.match(/^\/pages\/product\/list\?catalogId=(\d+)(?:&|$)/);
  if (m) return { type: LINK_TYPES.catalog, id: Number(m[1]), custom: '' };
  m = s.match(/^\/pages\/product\/detail\?id=(\d+)$/);
  if (m) return { type: LINK_TYPES.product, id: Number(m[1]), custom: '' };
  return { type: LINK_TYPES.custom, id: undefined, custom: s };
}
