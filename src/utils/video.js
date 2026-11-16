import { toCsv } from '@/utils/shop';

// 教学视频三个页面（课程、章节、视频）共用的小函数。金额一律整数「分」
export const yuan = (fen) => (fen / 100).toFixed(2);
export const toFen = (v) => (v === null || v === undefined || v === '' ? null : Math.round(Number(v) * 100));
export const mmss = (sec) => {
	if (!sec) return '-';
	return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
};
// 把目录树摊平成三张列表：课程、章节（带课程名）、视频（带课程名、章节名）
export function flatten(tree) {
	const courses = [];
	const chapters = [];
	const videos = [];
	(tree || []).forEach((c) => {
		const all = c.videos.map((v) => ({ ...v, courseTitle: c.title, chapterTitle: '-' }));
		c.chapters.forEach((ch) => {
			chapters.push({ id: ch.id, courseId: c.id, title: ch.title, sortOrder: ch.sortOrder, status: ch.status, courseTitle: c.title, videoCount: ch.videos.length });
			ch.videos.forEach((v) => all.push({ ...v, courseTitle: c.title, chapterTitle: ch.title }));
		});
		videos.push(...all);
		courses.push({ id: c.id, title: c.title, intro: c.intro, sortOrder: c.sortOrder, status: c.status, chapterCount: c.chapters.length, videoCount: all.length });
	});
	return { courses, chapters, videos };
}

// 视频订单导出（CSV，Excel 能直接打开）。手机号是接口给的打码后的（后台任何地方都看不到完整手机号）。
// 客户昵称、视频标题、备注是别人填的文字：以 = + - @ 开头的在 Excel 里会被当成公式执行，前面补一个单引号挡住
export const VIDEO_ORDER_HEADERS = ['订单号', '下单时间', '付款时间', '订单状态', '客户', '客户手机', '视频', '所属课程', '原价（元）', '实付（元）', '会员价优惠（元）', '微信支付单号', '备注', '退款状态', '退款到账时间', '退款原因'];
const safeText = (v) => { const t = v === null || v === undefined ? '' : String(v); return /^[=+\-@\t\r]/.test(t) ? `'${t}` : t; };
export function videoOrderRow(o, statusText = {}) {
	const list = Number(o.listPrice); const pay = Number(o.amount);
	return [o.orderNo, o.createdAt || '', o.paidAt || '', statusText[o.status] || o.status, safeText(o.customerName), o.customerPhone || '', safeText(o.title), safeText(o.courseTitle), o.listPrice, o.amount,
		list > pay ? (list - pay).toFixed(2).replace(/\.00$/, '') : '', o.transactionId || '', safeText(o.note),
		{ success: '已退款', processing: '退款中', failed: '退款失败' }[o.refundStatus] || '', o.refundedAt || '', safeText(o.refundReason)];
}
export const videoOrdersCsv = (orders, statusText) => toCsv([VIDEO_ORDER_HEADERS, ...orders.map((o) => videoOrderRow(o, statusText))]);
