// 云存储图片地址 → 可以直接放进 <img> 的地址。
//
// 上传时服务端返回的 url 是 COS 的对象地址（xxx.cos.ap-shanghai.myqcloud.com），
// 轮播图/公司 Logo 把它原样存进了数据库。但这个桶是私有的，直接访问返回 403，图片会显示成碎图。
// 同一个对象换成 xxx.tcb.qcloud.la 域名就能公开访问（小程序 utils/common.js 里做的是同样的转换）。
// 只用于显示：数据库里存的值不要改（小程序依赖它）。
const COS_URL = /^https:\/\/([\w-]+)\.cos\.[\w-]+\.myqcloud\.com(\/.*)$/;

export function toDisplayUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const m = url.match(COS_URL);
  return m ? `https://${m[1]}.tcb.qcloud.la${m[2]}` : url;
}
