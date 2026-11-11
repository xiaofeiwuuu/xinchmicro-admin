<template>
	<div>
		<a-card :bordered="false" class="mb-24">
			<div class="roles-bar">
				<div class="roles-tip">
					主账号拥有全部功能。子账号选择角色后，只能使用角色里勾选的功能；没有设置角色的子账号保持原来的权限
					<span class="roles-tip-sub">（不含数据统计、对账与账单、设置会员）</span>。
				</div>
				<a-button type="primary" @click="openCreate"><a-icon type="plus" /> 新增角色</a-button>
			</div>
		</a-card>

		<a-card :bordered="false">
			<a-table rowKey="id" :columns="columns" :dataSource="roles" :loading="loading" :pagination="false">
				<template slot="name" slot-scope="text">
					<b>{{ text }}</b>
				</template>
				<template slot="desc" slot-scope="text">{{ text || '-' }}</template>
				<template slot="perms" slot-scope="text, record">
					<a-tooltip :title="permNames(record) || '没有勾选任何功能'" placement="topLeft">
						<a-tag color="blue">{{ record.permissions.length }} 项功能</a-tag>
					</a-tooltip>
				</template>
				<template slot="users" slot-scope="text">{{ text }} 个账号</template>
				<template slot="action" slot-scope="text, record">
					<a-space>
						<a @click="openEdit(record)">编辑</a>
						<a-divider type="vertical" />
						<a-popconfirm :title="record.userCount ? `有 ${record.userCount} 个账号在使用，需要先给它们换成别的角色才能删除` : '确定删除这个角色吗？'" okText="确定" cancelText="取消" @confirm="remove(record)">
							<a class="text-danger">删除</a>
						</a-popconfirm>
					</a-space>
				</template>
			</a-table>
			<div v-if="loaded && !roles.length" class="roles-empty">还没有角色。点右上角「新增角色」，比如建一个「仓库」角色，只勾选查看订单和发货。</div>
		</a-card>

		<!-- 新增 / 编辑角色 -->
		<a-modal :title="form.id ? '编辑角色' : '新增角色'" :visible="visible" :confirmLoading="saving" width="1000px" okText="保存" cancelText="取消" @ok="save" @cancel="visible = false">
			<a-form-model :model="form" :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
				<a-row type="flex" :gutter="0">
				<!-- 左：角色名称、说明 -->
				<a-col :span="9" class="col-left">
				<a-form-model-item label="角色名称">
					<a-input v-model="form.name" :maxLength="30" placeholder="请输入角色名称" style="max-width: 320px" />
				</a-form-model-item>
				<a-form-model-item label="说明">
					<a-textarea v-model="form.description" :rows="5" :maxLength="200" placeholder="这个角色是做什么的" />
				</a-form-model-item>
				</a-col>
				<!-- 右：可用功能 -->
				<a-col :span="15" class="col-right">
				<a-form-model-item :label-col="{ span: 24 }" :wrapper-col="{ span: 24 }">
					<span slot="label">可用功能 <a-tooltip title="按左侧菜单的结构排列：勾选分组或页面就是勾选它下面的全部功能。账号只能调用勾选的功能对应的接口；鼠标放在「接口」上可以看到每个功能包含哪些接口；选了某个功能会自动带上它依赖的功能。"><a-icon type="question-circle" class="help-icon" /></a-tooltip></span>
					<div class="perm-tools"><a @click="expandAll(true)">全部展开</a><a @click="expandAll(false)">全部收起</a></div>
					<div class="ptree">
						<div v-for="g in catalog.menu" :key="g.label" class="pg">
							<div class="pg-head">
								<span class="arrow" :class="{ open: isOpen('g:' + g.label) }" @click="toggleOpen('g:' + g.label)">▸</span>
								<a-checkbox v-if="!g.mainOnly" :checked="keysAll(groupKeys(g))" :indeterminate="keysSome(groupKeys(g))" @change="toggleKeys(groupKeys(g), $event.target.checked)"><b>{{ g.label }}</b></a-checkbox>
								<b v-else class="locked-title">{{ g.label }}</b>
								<span v-if="!g.mainOnly" class="count">{{ selectedIn(groupKeys(g)) }}/{{ groupKeys(g).length }}</span>
							</div>
							<div v-show="isOpen('g:' + g.label)" class="branch">
								<div v-for="pg in g.pages" :key="pg.label" class="pp">
									<div class="pp-head">
										<span class="arrow" :class="{ open: isOpen('p:' + pg.label) }" @click="toggleOpen('p:' + pg.label)">▸</span>
										<a-checkbox v-if="pg.keys.length" :checked="keysAll(pg.keys)" :indeterminate="keysSome(pg.keys)" @change="toggleKeys(pg.keys, $event.target.checked)">{{ pg.label }}</a-checkbox>
										<span v-else class="locked-title">{{ pg.label }}</span>
									</div>
									<div v-show="isOpen('p:' + pg.label)" class="branch">
										<div v-for="k in pg.keys" :key="k" class="leaf">
											<a-checkbox :checked="has(k)" @change="toggle(byKey.get(k), $event.target.checked)">
												<a-tooltip placement="topLeft" :overlayStyle="{ maxWidth: '360px' }">
													<template slot="title"><div>{{ byKey.get(k).desc }}</div><div v-if="byKey.get(k).requires.length" style="margin-top: 4px;">需要「{{ byKey.get(k).requires.map(nameOf).join('、') }}」</div></template>
													<span class="perm-label">{{ byKey.get(k).short || byKey.get(k).label }}</span>
												</a-tooltip>
											</a-checkbox>
											<span class="perm-spacer"></span>
											<a-tooltip placement="topRight" overlayClassName="api-tip">
												<template slot="title"><div class="api-list"><div v-for="a in byKey.get(k).apis" :key="a" class="api-line">{{ a }}</div></div></template>
												<span class="perm-api">接口 {{ byKey.get(k).apis.length }}</span>
											</a-tooltip>
										</div>
										<div v-for="l in pg.locked" :key="l.label" class="leaf locked">
											<a-checkbox disabled :checked="false"><span class="perm-label">{{ l.label }}</span></a-checkbox>
											<a-tag>只有主账号</a-tag>
											<a-tooltip placement="topRight" overlayClassName="api-tip">
												<template slot="title"><div class="api-list"><div v-for="a in l.apis" :key="a" class="api-line">{{ a }}</div></div></template>
												<span class="perm-api">接口 {{ l.apis.length }}</span>
											</a-tooltip>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</a-form-model-item>
				</a-col>
				</a-row>
			</a-form-model>
		</a-modal>
	</div>
</template>

<script>
import { getRoles, getPermissionCatalog, createRole, updateRole, deleteRole } from '@/api'
import { notifyError } from '@/utils/notify'

export default {
	data() {
		return {
			loading: false,
			loaded: false,
			saving: false,
			roles: [],
			catalog: { groups: [], mainOnly: [], menu: [] },
			closed: {}, // 折叠的树节点（默认全部展开）
			visible: false,
			form: { id: null, name: '', description: '', permissions: [] },
			columns: [
				{ title: '角色名称', dataIndex: 'name', key: 'name', scopedSlots: { customRender: 'name' } },
				{ title: '说明', dataIndex: 'description', key: 'description', scopedSlots: { customRender: 'desc' } },
				{ title: '功能', key: 'perms', scopedSlots: { customRender: 'perms' } },
				{ title: '使用中', dataIndex: 'userCount', key: 'userCount', scopedSlots: { customRender: 'users' } },
				{ title: '操作', key: 'action', scopedSlots: { customRender: 'action' } }
			]
		}
	},
	computed: {
		items() { return this.catalog.groups.flatMap((g) => g.items) },
		byKey() { return new Map(this.items.map((i) => [i.key, i])) }
	},
	created() {
		this.load()
	},
	methods: {
		async load() {
			try {
				this.loading = true
				const [roles, catalog] = await Promise.all([getRoles(), getPermissionCatalog()])
				this.roles = roles
				this.catalog = catalog
				this.loaded = true
			} catch (error) {
				notifyError(this, error, '', '获取角色失败')
			} finally {
				this.loading = false
			}
		},
		nameOf(key) { const i = this.byKey.get(key); return i ? i.label : key },
		permNames(role) { return role.permissions.map(this.nameOf).join('、') },
		has(key) { return this.form.permissions.includes(key) },
		// 勾选：同时勾上它依赖的功能；取消：同时取消依赖它的功能
		toggle(item, on) {
			const set = new Set(this.form.permissions)
			if (on) {
				const add = (k) => { if (set.has(k)) return; set.add(k); (this.byKey.get(k).requires || []).forEach(add) }
				add(item.key)
			} else {
				const drop = (k) => { set.delete(k); this.items.filter((i) => (i.requires || []).includes(k)).forEach((i) => drop(i.key)) }
				drop(item.key)
			}
			this.form.permissions = this.items.map((i) => i.key).filter((k) => set.has(k))
		},
		// 树：分组 / 页面的勾选 = 它下面所有功能的勾选（半选表示只选了一部分）
		groupKeys(g) { return g.pages.flatMap((p) => p.keys) },
		selectedIn(keys) { return keys.filter((k) => this.has(k)).length },
		keysAll(keys) { return keys.length > 0 && keys.every((k) => this.has(k)) },
		keysSome(keys) { return !this.keysAll(keys) && keys.some((k) => this.has(k)) },
		toggleKeys(keys, on) { keys.forEach((k) => { if (this.has(k) !== on) this.toggle(this.byKey.get(k), on) }) },
		isOpen(id) { return !this.closed[id] },
		toggleOpen(id) { this.$set(this.closed, id, this.isOpen(id)) },
		expandAll(open) {
			const c = {}
			if (!open) this.catalog.menu.forEach((g) => { c['g:' + g.label] = true; g.pages.forEach((p) => { c['p:' + p.label] = true }) })
			this.closed = c
		},
		openCreate() {
			this.form = { id: null, name: '', description: '', permissions: [] }
			this.visible = true
		},
		openEdit(role) {
			this.form = { id: role.id, name: role.name, description: role.description, permissions: role.permissions.slice() }
			this.visible = true
		},
		async save() {
			const name = this.form.name.trim()
			if (!name) return this.$message.warning('请填写角色名称')
			const body = { name, description: this.form.description.trim(), permissions: this.form.permissions }
			try {
				this.saving = true
				if (this.form.id) await updateRole(this.form.id, body)
				else await createRole(body)
				this.$message.success('角色已保存')
				this.visible = false
				this.load()
			} catch (error) {
				notifyError(this, error, '', '保存失败')
			} finally {
				this.saving = false
			}
		},
		async remove(role) {
			if (role.userCount) return this.$message.warning(`还有 ${role.userCount} 个账号在使用这个角色，请先给它们换成别的角色再删除`)
			try {
				await deleteRole(role.id)
				this.$message.success('角色已删除')
				this.load()
			} catch (error) {
				notifyError(this, error, '', '删除失败')
			}
		}
	}
}
</script>

<style scoped>
.roles-bar { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.roles-tip { flex: 1; min-width: 0; color: #595959; font-size: 14px; }
.roles-tip-sub { color: #8c8c8c; }
.roles-empty { padding: 28px 0 8px; text-align: center; color: #8c8c8c; }
.help-icon { color: #8c8c8c; cursor: help; }
.help-icon:hover { color: #1890ff; }
/* 表单里 label 和内容的行高被全局设成了输入框高度（40px），树里每一行会被撑得很高，这里压回正常行高 */
.col-left { padding-right: 24px; }
.col-right { padding-left: 24px; border-left: 1px dashed #d9d9d9; }
.perm-tools { margin-bottom: 8px; font-size: 13px; line-height: 22px; }
.perm-tools a { margin-right: 14px; }
.ptree { line-height: 22px; border: 1px solid #e8ecf3; border-radius: 8px; padding: 6px 10px 10px; max-height: 56vh; overflow-y: auto; }
.pg { margin-top: 4px; }
.pg-head, .pp-head { display: flex; align-items: center; gap: 6px; padding: 5px 0; }
.pg-head { background: #f5f7fa; border-radius: 6px; padding: 6px 8px; margin-top: 6px; }
.arrow { display: inline-block; width: 16px; text-align: center; color: #8c8c8c; cursor: pointer; transition: transform .15s; user-select: none; }
.arrow.open { transform: rotate(90deg); }
.count { margin-left: auto; color: #8c8c8c; font-size: 12px; }
.branch { margin-left: 16px; padding-left: 14px; border-left: 1px dashed #d0d7e2; }
.pp-head { margin-top: 2px; font-weight: 500; }
.leaf { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 12px; padding: 4px 0 4px 6px; }
.leaf.locked .perm-label, .locked-title { color: #8c8c8c; font-weight: 400; }
.perm-label { font-weight: 500; }
.perm-spacer { flex: 1; }
.perm-api { color: #1890ff; font-size: 12.5px; cursor: help; white-space: nowrap; }
.perm-req { color: #fa8c16; font-size: 12px; white-space: nowrap; }
.api-list { max-height: 260px; overflow-y: auto; }
.api-line { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 12px; line-height: 1.7; white-space: nowrap; }
</style>
