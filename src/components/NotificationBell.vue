<!-- 后台右上角的通知铃铛：有人下单、订单付款、申请开票、需要退款时推送。
     通知要点「已读」（或点进去）才会消失；每个账号各自记已读。点一条通知跳到订单管理，这一单整行背景色闪几下。
     实现：每 20 秒向服务端取一次未读（没有 WebSocket，云托管多实例下轮询最稳）；切回这个标签页时立刻取一次；
     有新的就弹一条提示、标签页标题前面加未读数。 -->
<template>
	<div class="bell" ref="root">
		<button type="button" class="bell-btn" :class="{ has: unread > 0 }" aria-label="通知" @click="toggle">
			<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path d="M10 2.5a5 5 0 0 0-5 5v2.6c0 .5-.2 1-.5 1.4L3.3 13.2c-.5.6-.1 1.5.7 1.5h12c.8 0 1.2-.9.7-1.5l-1.2-1.7a2.3 2.3 0 0 1-.5-1.4V7.5a5 5 0 0 0-5-5Z" fill="#111827"/>
				<path d="M8.2 16.2a1.9 1.9 0 0 0 3.6 0H8.2Z" fill="#111827"/>
			</svg>
			<span v-if="unread > 0" class="bell-badge">{{ unread > 99 ? '99+' : unread }}</span>
		</button>

		<div v-if="open" class="bell-panel">
			<div class="bell-head">
				<span class="bell-head-title">通知</span>
				<span class="bell-head-actions">
					<a class="bell-sound" :class="{ off: !sound }" @click="toggleSound">提示音：{{ sound ? '开' : '关' }}</a>
					<a v-if="unread > 0" @click="readAll">全部已读</a>
				</span>
			</div>
			<div v-if="!list.length" class="bell-empty">没有未读通知</div>
			<ul v-else class="bell-list">
				<li v-for="n in list" :key="n.id" class="bell-item" @click="go(n)">
					<span class="bell-dot" :class="'t-' + n.type"></span>
					<div class="bell-main">
						<div class="bell-title">{{ n.title }}</div>
						<div v-if="n.content" class="bell-content">{{ n.content }}</div>
						<div class="bell-time">{{ time(n.createdAt) }}</div>
					</div>
					<a class="bell-read" @click.stop="readOne(n)">已读</a>
				</li>
			</ul>
			<div v-if="unread > list.length" class="bell-more">还有 {{ unread - list.length }} 条未读，处理完上面的会显示</div>
		</div>
	</div>
</template>

<script>
import { getAdminNotifications, readAdminNotifications, readAllAdminNotifications } from '@/api'
import newOrderSound from '@/assets/sounds/new-order.mp3'

const POLL_MS = 20000
const SOUND_KEY = 'notifySound' // 提示音开关记在本机浏览器里（每个人自己的习惯），'off' 表示关

function readSound() {
	try { return localStorage.getItem(SOUND_KEY) !== 'off' } catch (e) { return true }
}

export default {
	name: 'NotificationBell',
	data() {
		return { unread: 0, list: [], open: false, sound: readSound() }
	},
	created() {
		this.audio = null
		this.maxId = null // 已经见过的最大通知 id；null 表示还没取过（第一次取到的不弹提示）
		this.baseTitle = ''
	},
	mounted() {
		this.poll()
		this.timer = setInterval(this.poll, POLL_MS)
		document.addEventListener('visibilitychange', this.onVisible)
		document.addEventListener('click', this.onDocClick)
		// 浏览器不允许页面在用户操作过之前自动出声：第一次点击/按键时「预热」一下提示音（静音播放再停），之后新通知才能响
		document.addEventListener('click', this.unlockAudio, true)
		document.addEventListener('keydown', this.unlockAudio, true)
	},
	beforeDestroy() {
		clearInterval(this.timer)
		document.removeEventListener('visibilitychange', this.onVisible)
		document.removeEventListener('click', this.onDocClick)
		document.removeEventListener('click', this.unlockAudio, true)
		document.removeEventListener('keydown', this.unlockAudio, true)
		this.setTitle(0)
	},
	watch: {
		// 路由切换时页面标题会被改掉，重新加上未读数
		$route() {
			this.$nextTick(() => this.setTitle(this.unread))
		}
	},
	methods: {
		time(v) {
			return v ? String(v).slice(5, 16) : '' // "MM-DD HH:mm"（服务端返回的已经是北京时间）
		},
		getAudio() {
			if (!this.audio) this.audio = new Audio(newOrderSound)
			return this.audio
		},
		unlockAudio() {
			document.removeEventListener('click', this.unlockAudio, true)
			document.removeEventListener('keydown', this.unlockAudio, true)
			try {
				const a = this.getAudio()
				a.muted = true
				const p = a.play()
				const done = () => { a.pause(); a.currentTime = 0; a.muted = false }
				if (p && p.then) p.then(done, done)
				else done()
			} catch (e) { /* 不支持就算了，只是没有声音 */ }
		},
		// 播放提示音。被浏览器拦截（用户还没操作过页面）或关了提示音就什么都不做
		playSound() {
			if (!this.sound) return
			try {
				const a = this.getAudio()
				a.currentTime = 0
				const p = a.play()
				if (p && p.catch) p.catch(() => {})
			} catch (e) { /* 忽略 */ }
		},
		toggleSound() {
			this.sound = !this.sound
			try { localStorage.setItem(SOUND_KEY, this.sound ? 'on' : 'off') } catch (e) { /* 隐私模式等：只是记不住 */ }
			if (this.sound) this.playSound() // 打开时响一下，让人知道是什么声音
		},
		onVisible() {
			if (!document.hidden) this.poll()
		},
		onDocClick(e) {
			if (this.open && this.$refs.root && !this.$refs.root.contains(e.target)) this.open = false
		},
		toggle() {
			this.open = !this.open
			if (this.open) this.poll()
		},
		// 标签页标题前面加未读数：别的标签页也能看到有新通知
		setTitle(n) {
			const t = document.title.replace(/^\(\d+\+?\)\s*/, '')
			if (!this.baseTitle) this.baseTitle = t
			document.title = n > 0 ? `(${n > 99 ? '99+' : n}) ${t}` : t
		},
		apply(d) {
			this.unread = d.unread || 0
			this.list = d.list || []
			this.setTitle(this.unread)
		},
		async poll() {
			try {
				const d = await getAdminNotifications()
				const topId = d.list.length ? Math.max(...d.list.map((n) => n.id)) : 0
				if (this.maxId !== null && topId > this.maxId) {
					const fresh = d.list.filter((n) => n.id > this.maxId)
					this.$message.info(fresh.length === 1 ? fresh[0].title : `有 ${fresh.length} 条新通知`)
					this.playSound()
				}
				if (this.maxId === null || topId > this.maxId) this.maxId = topId
				this.apply(d)
			} catch (e) {
				// 轮询失败（断网、登录过期会由请求层统一处理）：安静地等下一轮
			}
		},
		// 标记已读：先在界面上去掉（马上有反馈），再告诉服务端；失败就重新取一次，以服务端为准
		async markRead(ids) {
			const set = new Set(ids)
			this.list = this.list.filter((n) => !set.has(n.id))
			this.unread = Math.max(0, this.unread - ids.length)
			this.setTitle(this.unread)
			try {
				this.apply(await readAdminNotifications(ids))
			} catch (e) {
				this.poll()
			}
		},
		readOne(n) {
			this.markRead([n.id])
		},
		async readAll() {
			try {
				this.apply(await readAllAdminNotifications())
			} catch (e) {
				this.poll()
			}
		},
		// 点一条通知：标记已读，跳到订单管理，让这一单整行闪几下
		go(n) {
			this.markRead([n.id])
			this.open = false
			// 库存通知跳到价格库存页并搜这个产品；其它的跳到订单管理并让这一单闪
			// 「N 个订单超过 24 小时没发货」这种汇总通知没有具体订单：跳到订单管理，只看待发货的
			const to = n.keyword && !n.orderNo
				? { path: '/shop/products', query: { keyword: n.keyword, n: String(n.id) } }
				: n.orderNo
				? { path: '/shop/orders', query: { highlight: n.orderNo, n: String(n.id) } }
				: n.type === 'ship_overdue'
				? { path: '/shop/orders', query: { status: 'pending_ship', n: String(n.id) } }
				: { path: '/shop/orders', query: {} }
			this.$router.push(to).catch(() => {}) // 已经在这个地址上会抛「重复导航」，忽略
		}
	}
}
</script>

<style scoped>
.bell { position: relative; margin-right: 4px; }
.bell-btn { position: relative; width: 36px; height: 36px; padding: 0; border: 0; border-radius: 50%; background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.15s; }
.bell-btn:hover { background: rgba(0, 0, 0, 0.05); }
.bell-btn.has svg path { fill: #1890ff; }
.bell-badge { position: absolute; top: 0; right: -2px; min-width: 18px; height: 18px; padding: 0 5px; box-sizing: border-box; border-radius: 9px; background: #f5222d; color: #fff; font-size: 11px; line-height: 18px; text-align: center; font-weight: 600; box-shadow: 0 0 0 2px #fff; }
.bell-panel { position: absolute; top: 44px; right: -8px; z-index: 1000; width: 360px; max-width: calc(100vw - 24px); background: #fff; border-radius: 10px; box-shadow: 0 6px 24px rgba(0, 0, 0, 0.16); overflow: hidden; }
.bell-head { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #f0f0f0; }
.bell-head-title { font-weight: 600; color: #262626; }
.bell-head-actions a + a { margin-left: 14px; }
.bell-sound { color: #8c8c8c; }
.bell-sound.off { color: #bfbfbf; }
.bell-empty { padding: 36px 0; text-align: center; color: #bfbfbf; }
.bell-list { margin: 0; padding: 0; list-style: none; max-height: 420px; overflow-y: auto; }
.bell-item { display: flex; align-items: flex-start; padding: 12px 16px; border-bottom: 1px solid #f5f5f5; cursor: pointer; }
.bell-item:last-child { border-bottom: 0; }
.bell-item:hover { background: #f7faff; }
.bell-dot { flex: 0 0 8px; width: 8px; height: 8px; margin: 7px 10px 0 0; border-radius: 50%; background: #1890ff; }
.bell-dot.t-order_paid { background: #52c41a; }
.bell-dot.t-invoice_requested, .bell-dot.t-after_sales_requested, .bell-dot.t-after_sales_returning { background: #fa8c16; }
.bell-dot.t-low_stock { background: #fa8c16; }
.bell-dot.t-refund_needed, .bell-dot.t-refund_failed, .bell-dot.t-out_of_stock, .bell-dot.t-ship_overdue { background: #f5222d; }
.bell-main { flex: 1; min-width: 0; }
.bell-title { color: #262626; font-weight: 500; line-height: 22px; word-break: break-all; }
.bell-content { color: #8c8c8c; font-size: 12px; line-height: 18px; margin-top: 2px; word-break: break-all; }
.bell-time { color: #bfbfbf; font-size: 12px; margin-top: 4px; }
.bell-read { flex: 0 0 auto; margin-left: 12px; font-size: 12px; line-height: 22px; }
.bell-more { padding: 8px 16px; text-align: center; color: #8c8c8c; font-size: 12px; background: #fafafa; }
</style>
