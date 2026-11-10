// 价格、库存、起订量的固定范围（要和服务端 utils/shopLimits.js 保持一致，服务端会再校验一次）。
// 价格上限是 2000 万元而不是 99999999：金额在数据库里是整数「分」（INT），一个订单的总金额上限也是 2000 万元，再高的单价买不了。
export const LIMITS = {
	priceMin: 0.01,
	priceMax: 20000000,
	stockMax: 99999999,
	qtyMax: 99999999, // 阶梯价档位的数量上限（和服务端 QTY_MAX 一致）
	minOrderMax: 99999999
}
export const PRICE_TEXT = `价格要在 ${LIMITS.priceMin} 到 ${LIMITS.priceMax} 元之间`
