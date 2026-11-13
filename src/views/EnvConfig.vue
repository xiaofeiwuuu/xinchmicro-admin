<template>
	<div class="env">
		<a-card :bordered="false" class="env-head">
			<div class="env-top">
				<span class="env-title">服务端配置助手</span>
				<a-tooltip placement="bottomLeft" :overlayStyle="{ maxWidth: '420px' }">
					<div slot="title">
						<p>1. 先点「导入」，把云托管里现在的 JSON 粘进来（这个页面读不出线上的密码和密钥，不导入的话复制出去的只有你填的几项）。</p>
						<p>2. 改你要改的，点「复制 JSON」，到微信云托管 → 服务设置 → 环境变量里整份替换并保存。</p>
						<p style="margin: 0;">3. 你填的内容只在这个页面里，不会发给服务端，也不会保存；密钥类的内容刷新页面就没了。</p>
					</div>
					<a-icon type="question-circle" class="help-icon" />
				</a-tooltip>
				<span class="env-sum">
					已填 <b>{{ filledCount }}</b> 项
					<template v-if="errorCount"> · <span class="bad">{{ errorCount }} 项格式有问题</span></template>
					<template v-if="missingRequired.length"> · <span class="warn">必填未配 {{ missingRequired.length }} 项</span></template>
				</span>
				<a-input-search v-model="search" placeholder="搜索名称或变量名" allowClear style="width: 200px;" />
				<span class="env-bar">
					<a-button @click="importVisible = true"><a-icon type="import" /> 导入</a-button>
					<a-button type="primary" :disabled="!filledCount || errorCount > 0" @click="copyAll"><a-icon type="copy" /> 复制 JSON</a-button>
					<a-button @click="clearAll" :disabled="!filledCount">清空</a-button>
				</span>
			</div>
		</a-card>

		<a-spin :spinning="loading">
			<a-card v-for="g in shownGroups" :key="g.id" :bordered="false" class="env-group">
				<div class="env-group-head" @click="toggle(g.id)">
					<a-icon :type="open[g.id] || search ? 'down' : 'right'" />
					<span class="env-group-title">{{ g.title }}</span>
					<a-tooltip v-if="g.desc" placement="right" :overlayStyle="{ maxWidth: '460px' }">
						<div slot="title"><div v-for="(line, i) in g.desc.split('\n')" :key="i" class="grp-line">{{ line }}</div></div>
						<a-icon type="question-circle" class="help-icon" @click.stop />
					</a-tooltip>
					<a v-for="l in (g.links || [])" :key="l.url" :href="l.url" target="_blank" rel="noopener noreferrer" class="env-link" @click.stop><a-icon type="link" /> {{ l.text }}</a>
					<span class="env-group-count">{{ itemsOf(g.id).length }} 项<template v-if="filledIn(g.id)"> · 已填 {{ filledIn(g.id) }}</template></span>
				</div>
				<div v-show="open[g.id] || search" class="env-items">
					<div v-for="it in itemsOf(g.id)" :key="it.key" class="env-item" :class="{ 'is-dim': it.need === 'unused' || it.need === 'local' }">
						<div class="env-label">
							<div class="env-label-line">
							<span v-if="it.need === 'required'" class="req">*</span>
							<span class="env-name">{{ it.label }}</span>
							<a-tooltip placement="right" :overlayStyle="{ maxWidth: '420px' }">
								<div slot="title" class="env-tip">
									<div>{{ it.desc }}</div>
									<div v-if="it.danger" class="tip-danger">⚠ {{ it.danger }}</div>
									<div class="tip-meta">变量名：{{ it.key }}</div>
									<div v-if="tags(it)" class="tip-meta">{{ tags(it) }}</div>
									<div v-if="it.default" class="tip-meta">默认：{{ it.default }}</div>
									<div v-if="it.example" class="tip-meta">示例：{{ it.example }}</div>
									<div class="tip-meta">{{ liveText(it) }}</div>
								</div>
								<a-icon type="question-circle" class="help-icon" :class="{ danger: !!it.danger }" />
							</a-tooltip>
							</div>
							<a-tooltip title="点一下复制变量名"><code class="env-key" @click="copyText(it.key)">{{ it.key }}</code></a-tooltip>
						</div>
						<div class="env-value">
							<!-- 开关：不设置 / 0 / 1 -->
							<a-radio-group v-if="it.kind === 'flag'" v-model="values[it.key]" button-style="solid" size="small">
								<a-radio-button value="">不设置</a-radio-button>
								<a-radio-button value="0">0 关</a-radio-button>
								<a-radio-button value="1">1 开</a-radio-button>
							</a-radio-group>
							<a-select v-else-if="it.kind === 'enum'" v-model="values[it.key]" allowClear placeholder="不设置" style="width: 100%;">
								<a-select-option v-for="o in it.options" :key="o" :value="o">{{ o }}</a-select-option>
							</a-select>
							<a-textarea v-else-if="it.kind === 'pem' || it.kind === 'json'" v-model="values[it.key]" :rows="it.kind === 'pem' ? 5 : 3" :placeholder="it.kind === 'pem' ? '-----BEGIN … KEY-----\n…\n-----END … KEY-----' : it.example" spellcheck="false" />
							<a-input v-else-if="it.secret" v-model="values[it.key]" :type="reveal[it.key] ? 'text' : 'password'" autocomplete="off" :placeholder="hint(it)">
								<a-icon slot="suffix" :type="reveal[it.key] ? 'eye-invisible' : 'eye'" @click="$set(reveal, it.key, !reveal[it.key])" />
							</a-input>
							<a-input v-else v-model="values[it.key]" autocomplete="off" :placeholder="hint(it)" />
							<div v-if="it.kind === 'json' && values[it.key]" class="env-tools"><a @click="formatJson(it.key)">整理成一行</a></div>
							<div v-if="problem(it).text" class="env-problem" :class="problem(it).level">{{ problem(it).text }}</div>
						</div>
					</div>
				</div>
			</a-card>
		</a-spin>

		<a-modal v-model="importVisible" title="导入线上现在的配置" okText="导入" cancelText="取消" :width="640" @ok="doImport">
			<a-textarea v-model="importText" :rows="10" spellcheck="false" placeholder='把云托管环境变量里现有的 JSON 整个粘贴进来：{ "MYSQL_ADDRESS": "…", … }' />
		</a-modal>
	</div>
</template>

<script>
import { getEnvCatalog } from '@/api'
import { notifyError } from '@/utils/notify'
import { copyToClipboard } from '@/utils/copy'

const DRAFT_KEY = 'envDraft' // 只存不敏感的（数字、开关、模板 ID 这类），机密和密钥文件内容绝不存

// 每个变量的额外检查（比 kind 更具体）：返回 { level: 'error'|'warn', text } 或 null
const EXTRA = {
	WEIXIN_APPID: (v) => (/^wx[0-9a-f]{16}$/.test(v) ? null : { level: 'warn', text: '小程序 AppID 一般是 wx 开头加 16 位字母数字，请核对' }),
	WEIXIN_APPSECRET: (v) => (/^[0-9a-f]{32}$/.test(v) ? null : { level: 'warn', text: 'AppSecret 一般是 32 位字母数字，请核对有没有多复制空格' }),
	WXPAY_API_V3_KEY: (v) => (v.length === 32 ? null : { level: 'error', text: 'APIv3 密钥必须正好 32 个字符，现在是 ' + v.length + ' 个' }),
	WXPAY_PUBLIC_KEY_ID: (v) => (v.startsWith('PUB_KEY_ID_') ? null : { level: 'warn', text: '微信支付公钥 ID 一般以 PUB_KEY_ID_ 开头' }),
	WXPAY_SERIAL_NO: (v) => (/^[0-9A-Fa-f]{40}$/.test(v) ? null : { level: 'warn', text: '证书序列号一般是 40 位十六进制字符，请核对' }),
	WXPAY_MCH_ID: (v) => (/^\d{10}$/.test(v) ? null : { level: 'warn', text: '商户号一般是 10 位数字' }),
	JWT_SECRET: (v) => (v.length >= 16 ? null : { level: 'warn', text: '登录令牌密钥太短了，建议至少 16 位随机字符' }),
	MYSQL_ADDRESS: (v) => (/^[^\s:]+:\d+$/.test(v) ? null : { level: 'error', text: '要写成 地址:端口，比如 10.6.111.195:3306' }),
	WXPAY_PRIVATE_KEY: (v) => (/-----BEGIN PRIVATE KEY-----[\s\S]+-----END PRIVATE KEY-----/.test(v) ? null : { level: 'error', text: '要粘贴 apiclient_key.pem 的全部内容，从 -----BEGIN PRIVATE KEY----- 到 -----END PRIVATE KEY-----' }),
	WXPAY_PUBLIC_KEY: (v) => (/-----BEGIN PUBLIC KEY-----[\s\S]+-----END PUBLIC KEY-----/.test(v) ? null : { level: 'error', text: '要粘贴微信支付公钥文件的全部内容，从 -----BEGIN PUBLIC KEY----- 到 -----END PUBLIC KEY-----' }),
	DEV_FAKE_LOGIN: (v) => (v === '1' ? { level: 'error', text: '这个线上绝对不能开（任何人都能冒充客户登录）' } : null),
	WXPAY_FAKE: (v) => (v === '1' ? { level: 'error', text: '这个线上绝对不能开（不用付钱订单就变成已付款）' } : null),
	REQUIRE_LOGIN: (v) => (v === '1' ? { level: 'warn', text: '确认已经发布了会带登录令牌的新版小程序再开，不然线上旧版小程序会什么数据都取不到' } : null),
	ALLOW_HEADER_OPENID: (v) => (v === '1' ? { level: 'warn', text: '没有核实过这个请求头能不能被伪造，不建议开' } : null)
}

export default {
	name: 'EnvConfig',
	data() {
		return { loading: false, groups: [], items: [], values: {}, reveal: {}, open: {}, search: '', importVisible: false, importText: '' }
	},
	computed: {
		filledCount() { return this.items.filter((i) => this.isFilled(i.key)).length },
		errorCount() { return this.items.filter((i) => this.isFilled(i.key) && this.problem(i).level === 'error').length },
		// 有搜索结果的分组（没搜索就是全部分组）
		shownGroups() { return this.search.trim() ? this.groups.filter((g) => this.itemsOf(g.id).length) : this.groups },
		// 必填的，线上没设置、表单里也没填的（线上已经设置了的，这里不算缺）
		missingRequired() { return this.items.filter((i) => i.need === 'required' && !i.set && !this.isFilled(i.key)) },
		// 线上已经设置、但表单里没有填的（复制出去的 JSON 里不会有它们：整份替换的话要小心）
		notInForm() { return this.items.filter((i) => i.set && !this.isFilled(i.key) && i.need !== 'unused') }
	},
	watch: {
		values: { deep: true, handler() { this.saveDraft() } }
	},
	async created() {
		this.loading = true
		try {
			const res = await getEnvCatalog()
			this.groups = res.groups
			this.items = res.items
			const values = {}
			res.items.forEach((i) => { values[i.key] = '' })
			Object.assign(values, this.loadDraft(res.items))
			this.values = values
			// 分组默认全部收起（项目多，一进来就是一长串）；点分组标题展开，或者用搜索
			const open = {}
			res.groups.forEach((g) => { open[g.id] = false })
			this.open = open
		} catch (error) {
			notifyError(this, error, '获取配置说明失败')
		} finally {
			this.loading = false
		}
	},
	methods: {
		// 输入框里的灰色提示：线上已有就写线上的情况，没有就写默认值/示例
		hint(it) {
			if (it.set) return it.secret ? '线上已设置，不改就留空' : (it.value !== null ? '线上：' + it.value : '线上已设置')
			return it.example || (it.default ? '默认 ' + it.default : '不设置')
		},
		tags(it) {
			const t = []
			if (it.need === 'required') t.push('必填')
			if (it.need === 'local') t.push('只在本机用，线上不要配')
			if (it.need === 'unused') t.push('代码里已经不用了，可以去云托管里删掉')
			if (it.secret) t.push('机密：这个页面不会显示它的值')
			return t.join('；')
		},
		liveText(it) {
			if (it.set) return '线上：已设置' + (it.value !== null ? '，当前是 ' + it.value : '')
			return '线上：' + (it.need === 'required' ? '没有设置' : '没有设置（用默认值）')
		},
		// 搜索：名称、变量名里包含关键字（不区分大小写）；没搜索就是全部
		matches(it) {
			const q = this.search.trim().toLowerCase()
			return !q || it.label.toLowerCase().includes(q) || it.key.toLowerCase().includes(q)
		},
		itemsOf(groupId) { return this.items.filter((i) => i.group === groupId && this.matches(i)) },
		filledIn(groupId) { return this.itemsOf(groupId).filter((i) => this.isFilled(i.key)).length },
		isFilled(key) { return String(this.values[key] === undefined || this.values[key] === null ? '' : this.values[key]).trim() !== '' },
		toggle(id) { this.$set(this.open, id, !this.open[id]) },
		// 这一项的问题：{ level: 'error' | 'warn' | '', text }。没填的不检查（必填没填在顶部汇总里提醒）
		problem(it) {
			if (!this.isFilled(it.key)) return { level: '', text: '' }
			const raw = String(this.values[it.key])
			const v = it.kind === 'pem' ? raw.trim() : raw.trim()
			const err = (text) => ({ level: 'error', text })
			if (it.kind === 'number') {
				if (!/^-?\d+$/.test(v)) return err('要填整数')
				if (Number(v) < it.min || Number(v) > it.max) return err(`要在 ${it.min} 到 ${it.max} 之间`)
			} else if (it.kind === 'flag') {
				if (!['0', '1'].includes(v)) return err('只能填 0 或 1')
			} else if (it.kind === 'enum') {
				if (!it.options.includes(v)) return err('只能是：' + it.options.join('、'))
			} else if (it.kind === 'list') {
				const bad = v.split(',').map((s) => s.trim()).filter(Boolean).filter((s) => !it.options.includes(s))
				if (bad.length) return err('不认识的类型：' + bad.join('、') + '（用逗号分开，只能是目录里有的通知类型）')
			} else if (it.kind === 'url') {
				if (!/^https:\/\/[^\s]+$/.test(v)) return err('要以 https:// 开头，中间不能有空格')
				if (v.endsWith('/')) return { level: 'warn', text: '末尾的 / 建议去掉' }
			} else if (it.kind === 'webhook') {
				try {
					const u = new URL(v)
					if (u.protocol !== 'https:' || u.hostname !== 'qyapi.weixin.qq.com' || u.pathname !== '/cgi-bin/webhook/send' || !u.searchParams.get('key')) throw new Error('bad')
				} catch (e) { return err('要是企业微信群机器人的地址：https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=…') }
			} else if (it.kind === 'json') {
				try {
					const o = JSON.parse(v)
					if (!o || typeof o !== 'object' || Array.isArray(o)) throw new Error('bad')
					if (Object.values(o).some((x) => typeof x !== 'string')) return err('每个字段的值都要用引号括起来（写成字符串）')
				} catch (e) { return err('不是合法的 JSON：字段名和值都要用英文双引号，字段之间用英文逗号') }
			}
			if (raw !== raw.trim() && it.kind !== 'pem') return { level: 'warn', text: '前后有空格，复制时会自动去掉' }
			const extra = EXTRA[it.key] && EXTRA[it.key](v)
			return extra || { level: '', text: '' }
		},
		formatJson(key) {
			try { this.values[key] = JSON.stringify(JSON.parse(this.values[key])) } catch (e) { this.$message.warning('格式不对，先改正再整理') }
		},
		// 生成要复制的 JSON：只含填了的，按目录顺序；值去掉前后空格
		buildJson() {
			const out = {}
			this.items.forEach((i) => { if (this.isFilled(i.key)) out[i.key] = String(this.values[i.key]).trim() })
			return JSON.stringify(out, null, 2)
		},
		copyAll() {
			if (this.errorCount) return this.$message.error('还有格式不对的项，先改掉')
			const extra = []
			if (this.missingRequired.length) extra.push(`还有 ${this.missingRequired.length} 项必填的线上没有、这里也没填（${this.missingRequired.slice(0, 5).map((i) => i.key).join('、')}${this.missingRequired.length > 5 ? '…' : ''}）`)
			if (this.notInForm.length) extra.push(`线上已经设置、但这里没填的有 ${this.notInForm.length} 项（${this.notInForm.slice(0, 5).map((i) => i.key).join('、')}${this.notInForm.length > 5 ? '…' : ''}），如果云托管是整份替换，这些会丢掉，请先点「导入」`)
			const risky = this.items.filter((i) => this.isFilled(i.key) && (i.need === 'local' || i.need === 'unused'))
			if (risky.length) extra.push('里面有「线上不要配 / 已不使用」的项：' + risky.map((i) => i.key).join('、'))
			const go = async () => {
				if (await copyToClipboard(this.buildJson())) this.$message.success('已复制，去云托管的环境变量里粘贴')
				else this.$message.error('复制失败，请手动选择复制')
			}
			if (!extra.length) return go()
			this.$confirm({ title: '复制之前再确认一下', content: extra.join('；') + '。确定要复制吗？', okText: '照样复制', cancelText: '回去看看', onOk: go })
		},
		async copyText(text) {
			if (await copyToClipboard(text)) this.$message.success('已复制 ' + text)
			else this.$message.error('复制失败，请手动选择复制')
		},
		clearAll() {
			this.$confirm({
				title: '清空已填的内容？', content: '页面上填的都会清掉（线上的配置不受影响）。', okText: '清空', okType: 'danger', cancelText: '取消',
				onOk: () => { this.items.forEach((i) => { this.values[i.key] = '' }); this.reveal = {} }
			})
		},
		doImport() {
			let obj
			try { obj = JSON.parse(this.importText) } catch (e) { return this.$message.error('不是合法的 JSON') }
			if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return this.$message.error('要是 { "名字": "值" } 这种格式')
			const known = new Set(this.items.map((i) => i.key))
			const unknown = []
			let n = 0
			Object.keys(obj).forEach((k) => {
				if (known.has(k)) { this.$set(this.values, k, String(obj[k])); n += 1 } else unknown.push(k)
			})
			this.importVisible = false
			this.importText = ''
			this.$message.success(`已导入 ${n} 项`)
			if (unknown.length) this.$warning({ title: '有 ' + unknown.length + ' 个名字这里不认识，没有导入', content: unknown.join('、') + '。可能是名字写错了，或者是代码里根本没有用到的变量。' })
		},
		// 草稿：只存不敏感的项（机密、密钥文件内容不存）
		saveDraft() {
			try {
				const safe = {}
				this.items.forEach((i) => { if (!i.secret && i.kind !== 'pem' && this.isFilled(i.key)) safe[i.key] = this.values[i.key] })
				localStorage.setItem(DRAFT_KEY, JSON.stringify(safe))
			} catch (e) { /* 存不了就算了 */ }
		},
		loadDraft(items) {
			try {
				const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}')
				const ok = {}
				items.forEach((i) => { if (!i.secret && i.kind !== 'pem' && typeof d[i.key] === 'string') ok[i.key] = d[i.key] })
				return ok
			} catch (e) { return {} }
		}
	}
}
</script>

<style scoped>
.env { padding: 0 0 40px; }
.env-head, .env-group { margin-bottom: 16px; border-radius: 8px; }
.env-top { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 12px; }
.env-title { font-size: 18px; font-weight: 600; color: #262626; }
.env-sum { color: #595959; font-size: 13px; }
.env-sum .bad { color: #f5222d; }
.env-sum .warn { color: #fa8c16; }
.env-bar { margin-left: auto; display: flex; gap: 8px; }
.help-icon { color: #8c8c8c; cursor: help; }
.help-icon:hover { color: #1890ff; }
.help-icon.danger { color: #f5222d; }
.env-group-head { display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; }
.env-group-title { font-size: 16px; font-weight: 600; color: #262626; }
.env-group-count { color: #8c8c8c; font-size: 13px; }
.env-link { font-size: 13px; }
.grp-line + .grp-line { margin-top: 6px; }
.env-items { margin-top: 10px; }
.env-item { display: flex; align-items: flex-start; gap: 16px; padding: 10px 0; border-top: 1px solid #f5f5f5; }
.env-label { flex: 0 0 240px; display: flex; flex-direction: column; justify-content: center; gap: 2px; min-height: 40px; color: #262626; }
.env-label-line { display: flex; align-items: center; gap: 6px; }
.env-key { align-self: flex-start; font-size: 12px; color: #8c8c8c; background: #f5f5f5; padding: 0 6px; border-radius: 3px; cursor: pointer; word-break: break-all; }
.env-key:hover { color: #1890ff; background: #e6f7ff; }
.env-label .req { color: #f5222d; }
.env-item.is-dim .env-name { color: #8c8c8c; }
.env-value { flex: 1; min-width: 0; max-width: 640px; }
.env-tip div + div { margin-top: 4px; }
.env-tip .tip-danger { color: #ffa39e; }
.env-tip .tip-meta { opacity: 0.75; font-size: 12px; }
.env-tools { margin-top: 4px; font-size: 12px; }
.env-problem { margin-top: 4px; font-size: 12px; line-height: 18px; }
.env-problem.error { color: #f5222d; }
.env-problem.warn { color: #fa8c16; }
@media (max-width: 900px) { .env-item { flex-direction: column; gap: 4px; } .env-label { flex-basis: auto; min-height: 0; } }
</style>
