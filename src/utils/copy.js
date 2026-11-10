// 复制文字到剪贴板：优先用剪贴板接口，不可用（非 https 等）时退回到临时文本框。返回是否成功
export function copyToClipboard(text) {
	const fallback = () => {
		const el = document.createElement('textarea')
		el.value = text
		el.style.position = 'fixed'
		el.style.opacity = '0'
		document.body.appendChild(el)
		el.select()
		let ok = false
		try { ok = document.execCommand('copy') } catch (e) { ok = false }
		document.body.removeChild(el)
		return ok
	}
	if (navigator.clipboard && navigator.clipboard.writeText) {
		return navigator.clipboard.writeText(text).then(() => true, () => fallback())
	}
	return Promise.resolve(fallback())
}
