<template>
	<div>
		<a-card class="mb-24" :bordered="false">
			<a-button type="primary" @click="showModal()">
				<a-icon type="plus" /> 新增轮播图
			</a-button>
		</a-card>

		<a-card :bordered="false">
			<a-table
				:columns="columns"
				:dataSource="carousels"
				:loading="loading"
				:pagination="false"
				rowKey="id"
			>
				<template slot="image" slot-scope="text">
					<img :src="toDisplayUrl(text)" style="max-width: 100px; max-height: 60px;" />
				</template>
				<template slot="status" slot-scope="text">
					<a-tag :color="text === 'active' ? 'green' : 'red'">
						{{ text === 'active' ? '启用' : '禁用' }}
					</a-tag>
				</template>
				<template slot="action" slot-scope="text, record">
					<a-space>
						<a @click="showModal(record)">编辑</a>
						<a-divider type="vertical" />
						<a-popconfirm
							title="确定要删除这个轮播图吗？"
							@confirm="handleDelete(record.id)"
							okText="是"
							cancelText="否"
						>
							<a>删除</a>
						</a-popconfirm>
					</a-space>
				</template>
			</a-table>
		</a-card>

		<a-modal
			:title="modalTitle"
			:visible="visible"
			@ok="handleSubmit"
			@cancel="handleCancel"
			:confirmLoading="confirmLoading"
		>
			<a-form-model ref="form" :model="form" :rules="rules">
				<a-form-model-item label="标题" prop="title">
					<a-input v-model="form.title" placeholder="请输入标题" />
				</a-form-model-item>
				<a-form-model-item label="图片" prop="imageUrl">
					<a-upload
						name="file"
						listType="picture-card"
						v-show="!fileList.length || uploading"
						:fileList="fileList"
						:showUploadList="false"
						:beforeUpload="beforeUpload"
						:remove="handleRemove"
						:disabled="uploading"
					>
						<div>
							<a-icon :type="uploading ? 'loading' : 'plus'" />
							<div class="ant-upload-text">{{ uploading ? '上传中...' : '上传' }}</div>
						</div>
					</a-upload>
					<div v-if="uploadError" style="margin-top: 8px;">
						<a-alert type="error" :message="uploadError" banner />
						<a-button type="link" @click="retryUpload" style="padding-left: 0;">
							<a-icon type="reload" /> 重试上传
						</a-button>
					</div>
					<div v-if="fileList.length && fileList[0].url" style="margin-top: 8px;">
						<img :src="toDisplayUrl(fileList[0].url)" alt="轮播图" style="max-width: 200px; max-height: 200px;" />
						<div style="margin-top: 8px;">
							<a-button type="primary" @click="handleChangeImage">
								<a-icon type="edit" /> 修改
							</a-button>
						</div>
					</div>
				</a-form-model-item>
				<a-form-model-item label="链接" prop="link">
					<a-input v-model="form.link" placeholder="请输入链接" />
				</a-form-model-item>
				<a-form-model-item label="排序" prop="order">
					<a-input-number v-model="form.order" :min="0" />
				</a-form-model-item>
				<a-form-model-item label="状态" prop="status">
					<!-- 开关要的是布尔值，状态字段存的是 'active' / 'inactive'：不能直接 v-model（'inactive' 也是真值，会把已禁用显示成启用） -->
					<a-switch
						:checked="form.status === 'active'"
						checked-children="启用"
						un-checked-children="禁用"
						@change="val => form.status = val ? 'active' : 'inactive'"
					/>
				</a-form-model-item>
			</a-form-model>
		</a-modal>

	</div>
</template>

<script>
import { notifyError } from '@/utils/notify';
import { toDisplayUrl } from '@/utils/cloudUrl';
import { getCarousels, createCarousel, updateCarousel, deleteCarousel, updateCarouselOrder, uploadFile, deletePdf } from '@/api'

export default {
	data() {
		return {
			loading: false,
			carousels: [],
			visible: false,
			confirmLoading: false,
			form: {
				title: '',
				imageUrl: '',
				fileID: '',
				link: '',
				order: 0,
				status: 'active'
			},
			rules: {
				title: [{ required: true, message: '请输入标题' }],
				imageUrl: [{ required: true, message: '请上传图片' }],
				link: [{ required: true, message: '请输入链接' }],
				order: [{ required: true, message: '请输入排序值' }],
				status: [{ required: true, message: '请选择状态' }]
			},
			columns: [
				{
					title: '图片',
					dataIndex: 'imageUrl',
					key: 'image',
					scopedSlots: { customRender: 'image' }
				},
				{
					title: '标题',
					dataIndex: 'title',
					key: 'title'
				},
				{
					title: '链接',
					dataIndex: 'link',
					key: 'link'
				},
				{
					title: '排序',
					dataIndex: 'order',
					key: 'order',
					sorter: (a, b) => a.order - b.order
				},
				{
					title: '状态',
					dataIndex: 'status',
					key: 'status',
					scopedSlots: { customRender: 'status' }
				},
				{
					title: '操作',
					key: 'action',
					scopedSlots: { customRender: 'action' }
				}
			],
			fileList: [],
			uploading: false,
			uploadError: null,
			uploadFile: null,
			uploadedFileInfo: null,
			// 已保存在服务端的图片文件 ID：和当前图片不同，说明当前图片是本次新传、还没保存的
			originalFileID: ''
		}
	},
	computed: {
		modalTitle() {
			return this.form.id ? '编辑轮播图' : '新增轮播图'
		}
	},
	methods: {
		async fetchCarousels() {
			try {
				this.loading = true
				const res = await getCarousels()
				this.carousels = res.data
			} catch (error) {
				notifyError(this, error, '获取轮播图列表失败')
			} finally {
				this.loading = false
			}
		},
		showModal(record) {
			this.originalFileID = record ? (record.fileID || '') : ''
			this.fileList = []
			this.uploadFile = null
			this.uploadedFileInfo = null
			this.uploadError = null
			
			if (record) {
				this.form = JSON.parse(JSON.stringify(record))
				
				// 如果有图片，设置文件列表
				if (record.imageUrl) {
					this.fileList = [{
						uid: '-1',
						name: record.imageUrl.split('/').pop() || '轮播图',
						status: 'done',
						url: record.imageUrl
					}]
					
					this.uploadedFileInfo = {
						fileID: record.fileID || '',
						url: record.imageUrl,
						filename: record.imageUrl.split('/').pop() || '轮播图'
					}
				}
			} else {
				this.form = {
					title: '',
					imageUrl: '',
					fileID: '',
					link: '',
					order: this.carousels.length,
					status: 'active'
				}
			}
			this.visible = true
		},
		async handleSubmit() {
			this.$refs.form.validate(async valid => {
				if (valid) {
					try {
						this.confirmLoading = true
						
						// 检查是否有图片但尚未上传
						if (this.uploadFile && !this.uploadedFileInfo) {
							this.$message.warning('图片正在上传中，请等待上传完成后再提交')
							this.confirmLoading = false
							return
						}
						
						// 如果有上传的文件信息，添加到提交数据中
						if (this.uploadedFileInfo) {
							this.form.imageUrl = this.uploadedFileInfo.url
							this.form.fileID = this.uploadedFileInfo.fileID
						}
						
						if (this.form.id) {
							await updateCarousel(this.form.id, this.form)
							this.$message.success('更新成功')
						} else {
							await createCarousel(this.form)
							this.$message.success('创建成功')
						}
						this.visible = false
						this.fetchCarousels()
					} catch (error) {
						notifyError(this, error, '', '操作失败')
					} finally {
						this.confirmLoading = false
					}
				}
			})
		},
		handleCancel() {
			// 取消：本次新传、没保存的图片不留下（已保存的原图不动，仍然可用）
			this.discardSessionFile()
			this.visible = false
			this.$refs.form.resetFields()
			this.fileList = []
			this.uploadFile = null
			this.uploadedFileInfo = null
		},
		async handleDelete(id) {
			try {
				await deleteCarousel(id)
				this.$message.success('删除成功')
				this.fetchCarousels()
			} catch (error) {
				notifyError(this, error, '删除失败')
			}
		},
		async beforeUpload(file) {
			// 检查文件类型
			const isImage = file.type.startsWith('image/')
			if (!isImage) {
				this.$message.error('只能上传图片文件!')
				return false
			}
			
			// 检查文件大小
			const isLt2M = file.size / 1024 / 1024 < 2
			if (!isLt2M) {
				this.$message.error('图片必须小于2MB!')
				return false
			}

			// 只清理"本次新传、还没保存"的上一张图；已保存的旧图不能在这里删——
			// 用户随时可能点取消，由服务端在保存成功后再删
			await this.discardSessionFile()
			
			// 清除之前的文件信息
			this.uploadFile = file
			this.uploadedFileInfo = null
			
			// 更新文件列表状态为上传中
			this.fileList = [{
				uid: file.uid || '-1',
				name: file.name,
				status: 'uploading',
				percent: 50,
			}]
			
			// 立即上传文件
			this.uploadImageFile(file)
			return false
		},
		async uploadImageFile(file) {
			this.uploading = true
			this.uploadError = null
			
			try {
				// 更新文件状态为上传中
				this.fileList = [{
					uid: file.uid || '-1',
					name: file.name,
					status: 'uploading',
					percent: 30,
				}]
				
				// 上传文件
				const result = await uploadFile(file)
				
				// 保存上传结果
				this.uploadedFileInfo = {
					fileID: result.fileID || '',
					url: result.url,
					filename: file.name
				}
				
				// 更新文件状态为已完成
				this.fileList = [{
					uid: file.uid || '-1',
					name: file.name,
					status: 'done',
					url: result.url,
					thumbUrl: result.url
				}]
				
				// 更新表单数据
				this.form.imageUrl = result.url
				this.form.fileID = result.fileID
				
				this.$message.success('图片上传成功')
			} catch (error) {
				
				// 更新文件状态为错误
				this.fileList = [{
					uid: file.uid || '-1',
					name: file.name,
					status: 'error',
				}]
				
				// 设置错误信息
				if (error.message.includes('413')) {
					this.uploadError = '文件太大，超出服务器允许的大小限制。请尝试上传更小的文件（小于2MB）。'
				} else {
					this.uploadError = '文件上传失败: ' + (error.message || '未知错误') + '。请点击重试。'
				}
				
				if (!error.notified) this.$message.error(this.uploadError)
			} finally {
				this.uploading = false
			}
		},
		// 清理"本次新传、还没保存"的图片（当前文件 ID 和已保存的不同）。已保存的图片绝不在这里删。
		// 删除失败只会留下一个孤儿文件，不影响操作
		async discardSessionFile() {
			const info = this.uploadedFileInfo
			if (info && info.fileID && info.fileID !== this.originalFileID) {
				try {
					await deletePdf(info.fileID)
				} catch (error) {
					// 忽略
				}
			}
		},
		async handleRemove() {
			await this.discardSessionFile()
			
			this.uploadFile = null
			this.fileList = []
			this.uploadedFileInfo = null
			this.form.imageUrl = ''
			this.form.fileID = ''
			return true
		},
		retryUpload() {
			if (this.uploadFile) {
				this.uploadImageFile(this.uploadFile)
			}
		},
		toDisplayUrl,
		handleChangeImage() {
			// 创建一个隐藏的文件输入框
			const input = document.createElement('input')
			input.type = 'file'
			input.accept = 'image/*'
			input.onchange = (e) => {
				const file = e.target.files[0]
				if (file) {
					this.beforeUpload(file)
				}
			}
			input.click()
		}
	},
	created() {
		this.fetchCarousels()
	}
}
</script>

<style scoped>
.mb-24 {
	margin-bottom: 24px;
}
.ant-upload-text {
	margin-top: 8px;
	color: #666;
}
</style> 