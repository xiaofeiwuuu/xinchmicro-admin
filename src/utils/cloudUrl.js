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

// 云存储文件 ID → 公开访问链接：cloud://环境ID.存储桶/path → https://存储桶.tcb.qcloud.la/path
// 这个地址在浏览器里直接打开 PDF 就是内嵌预览（Content-Type: application/pdf，没有 Content-Disposition），
// 不需要先向服务端请求下载链接，也就没有"异步之后再弹窗被浏览器拦截"的问题。格式不对返回空串。
const CLOUD_ID = /^cloud:\/\/[^.]+\.([^/]+)(\/.*)$/;

export function fileIdToUrl(fileID) {
  const m = String(fileID || '').trim().match(CLOUD_ID);
  return m ? `https://${m[1]}.tcb.qcloud.la${m[2]}` : '';
}

// 打开文件用的链接：优先用文件 ID 算出的公开链接，算不出来（格式不对）再用记录里存的 URL（转成可访问的地址）
export function fileHref(fileID, storedUrl) {
  return fileIdToUrl(fileID) || toDisplayUrl(storedUrl);
}
