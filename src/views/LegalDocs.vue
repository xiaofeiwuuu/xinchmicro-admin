<template>
	<div>
		<a-card :bordered="false">
			<!-- 选哪份协议、哪种语言 -->
			<div class="lg-head">
				<a-radio-group v-model="type" button-style="solid" @change="onSwitch('type')">
					<a-radio-button v-for="t in TYPES" :key="t.key" :value="t.key">{{ t.text }}</a-radio-button>
				</a-radio-group>
				<a-radio-group v-model="lang" button-style="solid" style="margin-left: 16px;" @change="onSwitch('lang')">
					<a-radio-button value="zh">中文</a-radio-button>
					<a-radio-button value="en">English</a-radio-button>
				</a-radio-group>
				<span class="lg-meta">
					<template v-if="current">当前第 {{ current.version }} 版，{{ current.updatedBy || '后台' }} 于 {{ current.createdAt }} 保存</template>
					<template v-else>还没有配置过：小程序里显示的是内置默认文本</template>
				</span>
			</div>


			<a-spin :spinning="loading">
				<div class="lg-editor" :class="{ readonly: !main }">
					<Toolbar v-if="main" class="lg-toolbar" :editor="editor" :defaultConfig="toolbarConfig" mode="default" />
					<Editor v-model="html" class="lg-body" :defaultConfig="editorConfig" mode="default" @onCreated="onCreated" />
				</div>
			</a-spin>

			<div class="lg-foot">
				<a-button v-if="main" type="primary" :loading="saving" :disabled="loading" @click="save">保存（立即生效）</a-button>
				<a-button v-if="main" style="margin-left: 8px;" :disabled="loading" @click="loadTemplate">载入内置模板</a-button>
				<a-button v-if="main" style="margin-left: 8px;" :disabled="loading || !current || current.blank" @click="restoreDefault">恢复内置默认</a-button>
				<span v-if="!main" class="muted">只有主账号能修改，你可以查看</span>
				<a class="lg-history" @click="historyVisible = true">历史版本（{{ versions.length }}）</a>
				<span v-if="dirty" class="lg-dirty">有修改还没保存</span>
			</div>
		</a-card>

		<!-- 历史版本：每次保存留一版，最多 50 版。点「查看」把那一版放进编辑器（还没保存，确认没问题再点保存就是恢复到那一版） -->
		<a-modal v-model="historyVisible" title="历史版本" :footer="null" :width="640">
			<a-table :columns="versionColumns" :dataSource="versions" rowKey="id" size="small" :pagination="false" :scroll="{ y: 360 }">
				<template slot="blank" slot-scope="text, r">
					<a-tag v-if="r.blank" color="orange">恢复默认</a-tag>
					<span v-else class="muted">有内容</span>
				</template>
				<template slot="act" slot-scope="text, r">
					<a @click="openVersion(r)">{{ r.id === (current && current.id) ? '当前' : '放进编辑器' }}</a>
				</template>
			</a-table>
		</a-modal>
	</div>
</template>

<script>
import '@wangeditor/editor/dist/css/style.css'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import { i18nChangeLanguage } from '@wangeditor/editor'
import { isMainUser } from '@/utils/auth'
import { notifyError } from '@/utils/notify'
import { getLegalManage, getLegalVersion, saveLegal, uploadFile } from '@/api'
import { LEGAL_TEMPLATES } from '@/utils/legalTemplates'

i18nChangeLanguage('zh-CN')

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export default {
	components: { Editor, Toolbar },
	data() {
		return {
			TYPES: [{ key: 'terms', text: '用户协议' }, { key: 'privacy', text: '隐私政策' }, { key: 'returns', text: '退换货规则' }],
			type: 'terms',
			lang: 'zh',
			prevType: 'terms', // 切换前的值（有没保存的修改时先退回去，用户确认丢弃才真的切）
			prevLang: 'zh',
			html: '',
			loadedHtml: '', // 载入后编辑器里的内容，用来判断有没有改动
			current: null,
			versions: [],
			loading: false,
			saving: false,
			historyVisible: false,
			editor: null,
			versionColumns: [
				{ title: '版本', dataIndex: 'version', key: 'version', width: 70 },
				{ title: '保存时间', dataIndex: 'createdAt', key: 'createdAt' },
				{ title: '保存人', dataIndex: 'updatedBy', key: 'updatedBy', width: 100 },
				{ title: '', key: 'blank', scopedSlots: { customRender: 'blank' }, width: 90 },
				{ title: '', key: 'act', scopedSlots: { customRender: 'act' }, width: 110 }
			],
			// 工具栏：去掉视频、代码块、待办、表情、全屏这些协议里用不到的；图片只能上传（不能随便贴外链）
			toolbarConfig: { excludeKeys: ['group-video', 'insertVideo', 'uploadVideo', 'codeBlock', 'todo', 'emotion', 'fullScreen', 'insertImage', 'group-more-style'] },
			editorConfig: {
				placeholder: '在这里写协议内容。可以加标题、加粗、列表、表格，也可以上传图片。',
				readOnly: !isMainUser(),
				MENU_CONF: {
					// 图片走公司统一的上传流程（云存储，单独的 web/legal-images 目录），上传完把地址放进文章里
					uploadImage: {
						customUpload: async (file, insertFn) => {
							if (!IMAGE_TYPES.includes(file.type)) return this.$message.error('只能上传 jpg、png、webp、gif 图片')
							if (file.size > 5 * 1024 * 1024) return this.$message.error('图片不能超过 5MB')
							try {
								const r = await uploadFile(file, 'legal')
								insertFn(r.url, file.name, '')
							} catch (error) {
								notifyError(this, error, '图片上传失败')
							}
						}
					}
				}
			}
		}
	},
	computed: {
		main() {
			return isMainUser()
		},
		dirty() {
			return !this.loading && this.html !== this.loadedHtml
		}
	},
	mounted() {
		this.load()
	},
	beforeDestroy() {
		if (this.editor) {
			this.editor.destroy()
			this.editor = null
		}
	},
	methods: {
		onCreated(editor) {
			this.editor = Object.seal(editor) // Vue2 里编辑器实例不能被响应式代理
		},
		// 编辑器按自己的格式整理内容后，才是「没改动」时的内容
		markLoaded() {
			this.$nextTick(() => setTimeout(() => { this.loadedHtml = this.editor ? this.editor.getHtml() : this.html }, 150))
		},
		async load() {
			try {
				this.loading = true
				const d = await getLegalManage(this.type, this.lang)
				this.current = d.current
				this.versions = d.versions || []
				// 没配置过：编辑器里放内置模板当起点；配置过（包括「恢复默认」那一版是空的）：放当前内容
				this.html = d.current && !d.current.blank ? d.html : d.current ? '' : LEGAL_TEMPLATES[this.type][this.lang]
				this.markLoaded()
			} catch (error) {
				notifyError(this, error, '获取协议内容失败')
			} finally {
				this.loading = false
			}
		},
		// 切换协议或语言：有没保存的修改先问一下
		onSwitch(which) {
			const to = which === 'type' ? this.type : this.lang
			const back = which === 'type' ? this.prevType : this.prevLang
			if (!this.dirty) {
				this.prevType = this.type
				this.prevLang = this.lang
				return this.load()
			}
			// 先退回去，用户确认丢弃才真的切
			if (which === 'type') this.type = back; else this.lang = back
			this.$confirm({
				title: '有修改还没保存',
				content: '切换之后这些修改会丢失，确定切换吗？',
				okText: '丢弃并切换',
				okType: 'danger',
				cancelText: '回去保存',
				onOk: () => {
					if (which === 'type') this.type = to; else this.lang = to
					this.prevType = this.type
					this.prevLang = this.lang
					this.load()
				}
			})
		},
		loadTemplate() {
			const go = () => {
				this.html = LEGAL_TEMPLATES[this.type][this.lang]
				this.$message.info('已载入内置模板，修改后点「保存」才会生效')
			}
			if (!this.dirty && !this.html) return go()
			this.$confirm({ title: '载入内置模板？', content: '编辑器里现在的内容会被替换（还没保存，不影响已经生效的版本）。', okText: '载入', cancelText: '取消', onOk: go })
		},
		async openVersion(v) {
			if (v.id === (this.current && this.current.id)) return (this.historyVisible = false)
			try {
				const d = await getLegalVersion(v.id)
				this.html = d.html
				this.historyVisible = false
				this.$message.info(`已把第 ${v.version} 版放进编辑器，确认后点「保存」才会生效`)
			} catch (error) {
				notifyError(this, error, '获取历史版本失败')
			}
		},
		save() {
			this.$confirm({
				title: '保存并生效？',
				content: `「${this.TYPES.find((t) => t.key === this.type).text}」（${this.lang === 'zh' ? '中文' : 'English'}）保存后，小程序里马上显示这一版，客户都能看到。`,
				okText: '保存',
				cancelText: '再看看',
				onOk: () => this.doSave(this.html)
			})
		},
		restoreDefault() {
			this.$confirm({
				title: '恢复内置默认？',
				content: '小程序会改回显示内置的默认文本。这次操作也会记成一个历史版本，之后还能找回现在的内容。',
				okText: '恢复默认',
				okType: 'danger',
				cancelText: '取消',
				onOk: () => this.doSave('')
			})
		},
		async doSave(html) {
			try {
				this.saving = true
				const d = await saveLegal(this.type, this.lang, html)
				this.current = d.current
				this.versions = d.versions || []
				this.html = d.html
				this.markLoaded()
				this.$message.success(d.saved ? (html ? '已保存，小程序里马上生效' : '已恢复内置默认') : '内容没有变化')
			} catch (error) {
				notifyError(this, error, '保存失败')
			} finally {
				this.saving = false
			}
		}
	},
	// 离开页面前，有没保存的修改要问一下
	beforeRouteLeave(to, from, next) {
		if (!this.dirty) return next()
		this.$confirm({ title: '有修改还没保存', content: '离开后这些修改会丢失，确定离开吗？', okText: '离开', okType: 'danger', cancelText: '留下', onOk: () => next(), onCancel: () => next(false) })
	}
}
</script>

<style scoped>
.lg-head { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 0; margin-bottom: 14px; }
.lg-meta { margin-left: 16px; color: #8c8c8c; font-size: 12px; }
.lg-editor { border: 1px solid #d9d9d9; border-radius: 4px; }
.lg-editor.readonly { background: #fafafa; }
.lg-toolbar { border-bottom: 1px solid #e8e8e8; }
.lg-body { height: calc(100vh - 305px); min-height: 360px; overflow-y: hidden; }
.lg-foot { display: flex; align-items: center; margin-top: 16px; }
.lg-history { margin-left: 16px; }
.lg-dirty { margin-left: 16px; color: #fa8c16; font-size: 12px; }
.muted { color: #8c8c8c; }
</style>
