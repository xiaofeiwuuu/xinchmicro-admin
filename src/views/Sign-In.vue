<!-- 
	This is the sign in page, it uses the dashboard layout in: 
	"./layouts/Default.vue" .
 -->

<template>
	<!-- 登录页：左边登录卡片，右边一个会动的 3D 芯片（纯 CSS + SVG，没有图片）。盖满整个窗口，不显示默认布局里的顶部导航 -->
	<div class="login-page">
		<div class="lp-grid"></div>

		<div class="lp-left">
			<div class="lp-brand">
				<svg class="lp-logo" viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
					<rect x="9" y="9" width="22" height="22" rx="4" fill="none" stroke="#4fc8ff" stroke-width="2.4" />
					<rect x="15" y="15" width="10" height="10" rx="2" fill="#4fc8ff" />
					<path d="M14 9V4M20 9V4M26 9V4M14 36v-5M20 36v-5M26 36v-5M9 14H4M9 20H4M9 26H4M36 14h-5M36 20h-5M36 26h-5" stroke="#4fc8ff" stroke-width="2.4" stroke-linecap="round" />
				</svg>
				<div>
					<div class="lp-name">芯辰微电子</div>
					<div class="lp-sub">管理后台</div>
				</div>
			</div>

			<div class="lp-card">
				<h1>登录</h1>
				<h5>输入您的账号和密码以登录</h5>

				<!-- 登录表单 -->
				<a-form
					id="components-form-demo-normal-login"
					:form="form"
					class="login-form"
					@submit="handleSubmit"
					:hideRequiredMark="true"
				>
					<a-form-item class="mb-10" label="账号" :colon="false">
						<a-input
						v-decorator="[
						'username',
						{ rules: [{ required: true, message: '请输入您的账号!' }] },
						]" placeholder="账号" />
					</a-form-item>
					<a-form-item class="mb-5" label="密码" :colon="false">
						<a-input
						v-decorator="[
						'password',
						{ rules: [{ required: true, message: '请输入您的密码!' }] },
						]" type="password" placeholder="密码" />
					</a-form-item>
					<a-form-item>
						<a-button type="primary" block html-type="submit" class="login-form-button" :loading="loading">
							登录
						</a-button>
					</a-form-item>
				</a-form>
				<!-- / 登录表单 -->
			</div>

			<div class="lp-copy">© 厦门芯辰微电子有限公司</div>
		</div>

		<!-- 右边：3D 芯片场景。按窗口大小整体缩放（scale 由 JS 算），窗口太窄时整块隐藏 -->
		<div class="lp-right" ref="stage" aria-hidden="true">
			<div class="stage">
				<div class="scene-wrap" :style="{ transform: 'scale(' + scale + ')' }">
					<div class="scene"><div class="board">
						<div class="plate"></div>
						<svg class="traces" viewBox="0 0 640 640">
							<path v-for="(t, i) in traces" :key="'b' + i" class="t-base" :d="t.d" />
							<path v-for="(t, i) in traces" :key="'f' + i" class="t-flow" :d="t.d" :style="{ animationDuration: t.dur / 2 + 's' }" />
							<path v-for="(t, i) in traces" :key="'s' + i" class="t-spark" :d="t.d" :style="{ animationDuration: t.dur + 's', animationDelay: t.delay + 's' }" />
							<circle v-for="(t, i) in traces" :key="'v' + i" class="via" :cx="t.end[0]" :cy="t.end[1]" r="5" />
						</svg>
						<div class="shadow"></div>
						<div v-for="(p, i) in pins" :key="'p' + i" class="pin" :style="{ left: p.x + 'px', top: p.y + 'px', width: p.w + 'px', height: p.h + 'px' }"></div>
						<div class="chip">
							<div class="face f-left"></div><div class="face f-back"></div><div class="face f-right"></div><div class="face f-front"></div>
							<div class="face f-top">
								<span class="mark"></span>
								<div class="die"><b>XCW</b><i>芯辰微</i></div>
								<div class="lines"><span>MCU</span><span>POWER</span><span>ANALOG</span></div>
							</div>
						</div>
					</div></div>
				</div>
				<span v-for="(d, i) in dots" :key="'d' + i" class="dot" :style="{ left: d.left + '%', top: d.top + '%', animationDuration: d.dur + 's', animationDelay: d.delay + 's' }"></span>
			</div>
		</div>
	</div>
</template>

<script>
import { notifyError } from '@/utils/notify';
import { saveAuth } from '@/utils/auth';
import { login } from '@/api'
import { PINS, TRACES, DOTS } from '@/utils/chipScene'

export default ({
	data() {
		return {
			loading: false,
			pins: PINS,
			traces: TRACES,
			dots: DOTS,
			scale: 1, // 3D 场景的缩放：按右边区域的大小算，让芯片在大屏小屏上都完整显示
		}
	},
	mounted() {
		this.fit();
		window.addEventListener('resize', this.fit);
	},
	beforeDestroy() {
		window.removeEventListener('resize', this.fit);
	},
	beforeCreate() {
		this.form = this.$form.createForm(this, { name: 'normal_login' });
	},
	methods: {
		fit() {
			const el = this.$refs.stage;
			if (!el) return;
			// 场景本身 640×640，旋转后实际占 760×680 左右；留一点边距
			this.scale = Math.max(0.5, Math.min(el.clientWidth / 800, el.clientHeight / 720, 1.2));
		},
		async handleSubmit(e) {
			e.preventDefault();
			this.form.validateFields(async (err, values) => {
				if (!err) {
					try {
						this.loading = true;
						const res = await login(values);
						
						// 存储登录信息到localStorage
						saveAuth(res.data.token, {
							id: res.data.user.id,
							username: res.data.user.username,
							userType: res.data.user.userType,
							roleId: res.data.user.roleId || null,
							permissions: res.data.user.permissions
						});
						
						this.$message.success(res.message || '登录成功');
						// 登录前想访问的页面（地址里的 redirect）：只认站内路径，防止被人构造链接登录后跳到别的网站
						const r = this.$route.query.redirect;
						this.$router.push(typeof r === 'string' && /^\/(?!\/)/.test(r) && !r.startsWith('/login') ? r : '/');
					} catch (error) {
						notifyError(this, error, '', '登录失败');
					} finally {
						this.loading = false;
					}
				}
			});
		},
	},
})
</script>

<style lang="scss">
	body {
		background-color: #ffffff;
	}
</style>

<style lang="scss" scoped>
.login-page { position: fixed; left: 0; top: 0; right: 0; bottom: 0; z-index: 1000; display: flex; overflow: hidden; background: radial-gradient(1200px 760px at 72% 50%, #12365f 0%, #0a1627 55%, #060c17 100%); }
.lp-grid { position: absolute; left: 0; top: 0; right: 0; bottom: 0; background-image: linear-gradient(rgba(90, 170, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(90, 170, 255, 0.05) 1px, transparent 1px); background-size: 48px 48px; pointer-events: none; }
.lp-left { position: relative; z-index: 2; flex: 0 0 min(520px, 46%); display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 32px; box-sizing: border-box; }
.lp-brand { width: 100%; max-width: 400px; display: flex; align-items: center; margin-bottom: 28px; }
.lp-logo { flex-shrink: 0; margin-right: 14px; filter: drop-shadow(0 0 8px rgba(79, 200, 255, 0.6)); }
.lp-name { color: #fff; font-size: 24px; font-weight: 700; letter-spacing: 3px; line-height: 1.2; }
.lp-sub { color: #7fb8e8; font-size: 14px; letter-spacing: 6px; margin-top: 4px; }
.lp-card { width: 100%; max-width: 400px; box-sizing: border-box; padding: 32px 32px 12px; border-radius: 16px; background: linear-gradient(160deg, rgba(20, 48, 84, 0.78), rgba(8, 20, 38, 0.82)); -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px); border: 1px solid rgba(90, 175, 255, 0.35); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(40, 140, 255, 0.18), inset 0 1px 0 rgba(160, 215, 255, 0.18); }
.lp-card h1 { margin: 0 0 6px; font-size: 26px; font-weight: 700; color: #fff; letter-spacing: 2px; }
.lp-card h5 { margin: 0 0 22px; font-size: 14px; font-weight: 400; color: #8fb4d9; }
/* 表单控件改成深色：标签浅色，输入框半透明深底 + 浅色字，聚焦时发青光；Chrome 自动填充的米黄底色也盖掉 */
.lp-card ::v-deep .ant-form-item-label > label { color: #b9d4ee; }
.lp-card ::v-deep .ant-input { height: 42px; color: #eaf6ff; background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(120, 190, 255, 0.3); border-radius: 8px; transition: border-color 0.2s, box-shadow 0.2s, background 0.2s; }
.lp-card ::v-deep .ant-input::placeholder { color: rgba(185, 212, 238, 0.4); }
.lp-card ::v-deep .ant-input:hover { border-color: rgba(120, 210, 255, 0.6); }
.lp-card ::v-deep .ant-input:focus { border-color: #4fc8ff; background: rgba(79, 200, 255, 0.08); box-shadow: 0 0 0 3px rgba(79, 200, 255, 0.2), 0 0 14px rgba(79, 200, 255, 0.25); }
.lp-card ::v-deep .ant-input:-webkit-autofill, .lp-card ::v-deep .ant-input:-webkit-autofill:focus { -webkit-text-fill-color: #eaf6ff; caret-color: #eaf6ff; -webkit-box-shadow: 0 0 0 1000px #11294a inset; transition: background-color 9999s ease-out 0s; }
.lp-card ::v-deep .has-error .ant-input, .lp-card ::v-deep .has-error .ant-input:hover { border-color: #ff7875; background: rgba(255, 120, 117, 0.08); }
.lp-card ::v-deep .ant-form-explain { color: #ff9a97; }
.lp-card ::v-deep .ant-btn-primary { height: 44px; font-size: 16px; letter-spacing: 6px; border: 0; border-radius: 8px; background: linear-gradient(90deg, #1677ff 0%, #25b7ff 100%); box-shadow: 0 6px 20px rgba(37, 160, 255, 0.4); transition: box-shadow 0.2s, filter 0.2s; }
.lp-card ::v-deep .ant-btn-primary:hover, .lp-card ::v-deep .ant-btn-primary:focus { filter: brightness(1.1); box-shadow: 0 8px 28px rgba(60, 190, 255, 0.6); }
.lp-copy { position: absolute; left: 0; right: 0; bottom: 18px; text-align: center; color: rgba(160, 200, 240, 0.5); font-size: 12px; }
.lp-right { position: relative; flex: 1; min-width: 0; }
@media (max-width: 900px) {
	.lp-left { flex: 1 1 100%; }
	.lp-right { display: none; }
}
.stage { position: relative; width: 100%; height: 100%; overflow: hidden; }
.scene { position: absolute; left: 50%; top: 50%; width: 640px; height: 640px; margin: -320px 0 0 -320px; perspective: 1500px; perspective-origin: 50% 40%; }
.board { position: absolute; left: 0; top: 0; width: 640px; height: 640px; transform-style: preserve-3d; transform: rotateX(58deg) rotateZ(-40deg); animation: sway 16s ease-in-out infinite alternate; }
@keyframes sway { from { transform: rotateX(58deg) rotateZ(-46deg); } to { transform: rotateX(54deg) rotateZ(-32deg); } }
.plate { position: absolute; left: 10px; top: 10px; right: 10px; bottom: 10px; border-radius: 28px; background: linear-gradient(145deg, #0f2a4a 0%, #0b1d36 60%, #091628 100%); border: 1px solid rgba(90, 170, 255, 0.35); box-shadow: 0 0 80px rgba(40, 140, 255, 0.28), inset 0 0 60px rgba(40, 140, 255, 0.12); }
.plate::after { content: ''; position: absolute; inset: 0; border-radius: 28px; background-image: linear-gradient(rgba(90, 170, 255, 0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(90, 170, 255, 0.07) 1px, transparent 1px); background-size: 32px 32px; }
.traces { position: absolute; left: 0; top: 0; width: 640px; height: 640px; overflow: visible; }
.t-base { fill: none; stroke: rgba(80, 170, 255, 0.35); stroke-width: 2.4; stroke-linejoin: round; stroke-linecap: round; }
.t-flow { fill: none; stroke: #5fd4ff; stroke-width: 2.4; stroke-linecap: round; stroke-dasharray: 3 16; animation: flow 1.6s linear infinite; opacity: 0.8; }
.t-spark { fill: none; stroke: #bff0ff; stroke-width: 4; stroke-linecap: round; stroke-dasharray: 26 900; stroke-dashoffset: 26; filter: drop-shadow(0 0 5px #5fd4ff); animation: spark linear infinite; }
.via { fill: #0b1d36; stroke: #5fd4ff; stroke-width: 2; }
@keyframes flow { to { stroke-dashoffset: -19; } }
@keyframes spark { 0% { stroke-dashoffset: 26; opacity: 0; } 8% { opacity: 1; } 85% { opacity: 1; } 100% { stroke-dashoffset: -330; opacity: 0; } }
.pin { position: absolute; background: linear-gradient(180deg, #ffe08a, #c99a2e); border-radius: 2px; box-shadow: 0 0 6px rgba(255, 210, 100, 0.35); transform: translateZ(4px); }
.shadow { position: absolute; left: 50%; top: 50%; width: 230px; height: 230px; margin: -115px 0 0 -115px; background: rgba(0, 0, 0, 0.55); filter: blur(26px); transform: translateZ(2px); animation: shadowPulse 5s ease-in-out infinite; }
@keyframes shadowPulse { 0%, 100% { transform: translateZ(2px) scale(1.05); opacity: 0.8; } 50% { transform: translateZ(2px) scale(0.9); opacity: 0.55; } }
.chip { position: absolute; left: 50%; top: 50%; width: 0; height: 0; transform-style: preserve-3d; animation: bob 5s ease-in-out infinite; }
@keyframes bob { 0%, 100% { transform: translateZ(0); } 50% { transform: translateZ(26px); } }
.face { position: absolute; }
.f-top { width: 230px; height: 230px; left: -115px; top: -115px; transform: translateZ(52px); border-radius: 10px; background: radial-gradient(circle at 30% 25%, #2b3b52 0%, #162233 55%, #0d1624 100%); border: 1px solid rgba(140, 200, 255, 0.35); box-shadow: inset 0 0 30px rgba(60, 150, 255, 0.18); transform-style: preserve-3d; }
.f-front, .f-back { width: 230px; height: 46px; left: -115px; transform-origin: top center; background: linear-gradient(180deg, #1c2b41, #0c1522); }
.f-front { top: 115px; transform: translateZ(6px) rotateX(90deg); background: linear-gradient(180deg, #23344d, #0e1828); }
.f-back { top: -115px; transform: translateZ(6px) rotateX(90deg); }
.f-left, .f-right { width: 46px; height: 230px; top: -115px; transform-origin: left center; background: linear-gradient(90deg, #1a2940, #0c1522); }
.f-right { left: 115px; transform: translateZ(6px) rotateY(-90deg); background: linear-gradient(90deg, #14223a, #0a111d); }
.f-left { left: -115px; transform: translateZ(6px) rotateY(-90deg); }
.die { position: absolute; left: 50px; top: 50px; width: 130px; height: 130px; border-radius: 8px; border: 2px solid #4fc8ff; background: radial-gradient(circle at 50% 40%, rgba(60, 160, 255, 0.35), rgba(10, 40, 80, 0.85)); box-shadow: 0 0 18px rgba(79, 200, 255, 0.7), inset 0 0 22px rgba(79, 200, 255, 0.45); animation: dieGlow 2.8s ease-in-out infinite; display: flex; flex-direction: column; align-items: center; justify-content: center; }
@keyframes dieGlow { 0%, 100% { box-shadow: 0 0 14px rgba(79, 200, 255, 0.55), inset 0 0 16px rgba(79, 200, 255, 0.35); } 50% { box-shadow: 0 0 30px rgba(79, 200, 255, 0.95), inset 0 0 30px rgba(79, 200, 255, 0.6); } }
.die b { font: 800 34px/1 Arial, Helvetica, sans-serif; letter-spacing: 3px; color: #e8fbff; text-shadow: 0 0 10px #4fc8ff; }
.die i { font: normal 600 16px/1 "PingFang SC", "Microsoft YaHei", sans-serif; letter-spacing: 5px; color: #9fdcff; margin-top: 9px; }
.die u { position: absolute; left: 8px; right: 8px; height: 1px; background: rgba(120, 210, 255, 0.4); text-decoration: none; }
.mark { position: absolute; left: 12px; top: 12px; width: 12px; height: 12px; border-radius: 50%; background: #4fc8ff; box-shadow: 0 0 8px #4fc8ff; }
.lines { position: absolute; left: 14px; right: 14px; bottom: 12px; display: flex; justify-content: space-between; font: 600 9px/1 Arial, sans-serif; letter-spacing: 1.5px; color: rgba(160, 210, 255, 0.55); }
.dot { position: absolute; width: 4px; height: 4px; border-radius: 50%; background: #7fdcff; box-shadow: 0 0 8px #5fd4ff; opacity: 0; animation: rise linear infinite; }
@keyframes rise { 0% { transform: translateY(0); opacity: 0; } 15% { opacity: 0.9; } 100% { transform: translateY(-340px); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .board, .chip, .shadow, .die, .t-flow, .t-spark, .dot { animation: none !important; } }

.scene-wrap { position: absolute; left: 50%; top: 50%; width: 640px; height: 640px; margin: -320px 0 0 -320px; transform-origin: 50% 50%; }
.scene { margin: 0; left: 0; top: 0; }
</style>
