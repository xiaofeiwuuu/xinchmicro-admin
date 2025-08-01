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
					<img :src="text" style="max-width: 100px; max-height: 60px;" />
				</template>
				<template slot="status" slot-scope="text">
					<a-tag :color="text === 'active' ? 'green' : 'red'">
						{{ text === 'active' ? '启用' : '禁用' }}
					</a-tag>
				</template>
				<template slot="action" slot-scope="text, record">
					<a-space>
						<a-button type="link" size="small" @click="handleViewImage(record)" :loading="record.viewLoading">
							<a-icon type="eye" /> 查看
						</a-button>
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
						:fileList="fileList"
						:beforeUpload="beforeUpload"
						:remove="handleRemove"
						:disabled="uploading"
					>
						<div v-if="!fileList.length">
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
						<img :src="fileList[0].url" alt="轮播图" style="max-width: 200px; max-height: 200px;" />
						<div style="margin-top: 8px;">
							<a-button type="primary" @click="handleViewUploadedImage" :loading="viewUploadLoading">
								<a-icon type="eye" /> 查看
							</a-button>
							<a-button type="primary" style="margin-left: 8px;" @click="handleChangeImage">
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
					<a-switch
						v-model="form.status"
						checked-children="启用"
						un-checked-children="禁用"
						@change="val => form.status = val ? 'active' : 'inactive'"
					/>
				</a-form-model-item>
			</a-form-model>
		</a-modal>

		<a-modal :visible="previewVisible" :footer="null" @cancel="handlePreviewCancel">
			<img alt="preview" style="width: 100%" :src="previewImageUrl" />
		</a-modal>
	</div>
</template>

<script>
import { getCarousels, createCarousel, updateCarousel, deleteCarousel, updateCarouselOrder, uploadFile, deletePdf, getPdfDownloadUrl } from '@/api'

export default {
	data() {
		return {
			loading: false,
			carousels: [],
			visible: false,
			confirmLoading: false,
			previewVisible: false,
			previewImageUrl: '',
			viewLoading: false,
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
			viewUploadLoading: false
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
				this.$message.error('获取轮播图列表失败')
			} finally {
				this.loading = false
			}
		},
		showModal(record) {
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
						this.$message.error(error.message || '操作失败')
					} finally {
						this.confirmLoading = false
					}
				}
			})
		},
		handleCancel() {
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
				this.$message.error('删除失败')
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

			// 如果已有图片，先删除旧文件
			if (this.uploadedFileInfo && this.uploadedFileInfo.fileID) {
				try {
					await this.deletePdfFile(this.uploadedFileInfo.fileID)
				} catch (error) {
					console.error('删除旧图片文件失败:', error)
				}
			}
			
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
				console.log('图片上传结果:', result)
				
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
				console.error('图片上传错误:', error)
				
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
				
				this.$message.error(this.uploadError)
			} finally {
				this.uploading = false
			}
		},
		async deletePdfFile(fileID) {
			try {
				await deletePdf(fileID)
				return true
			} catch (error) {
				console.error('删除文件失败:', error)
				throw error
			}
		},
		async handleRemove() {
			if (this.uploadedFileInfo && this.uploadedFileInfo.fileID) {
				try {
					await this.deletePdfFile(this.uploadedFileInfo.fileID)
					this.$message.success('图片已删除')
				} catch (error) {
					this.$message.error('删除图片失败: ' + error.message)
					return false
				}
			}
			
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
		previewImage(url) {
			this.previewImageUrl = url
			this.previewVisible = true
		},
		handlePreviewCancel() {
			this.previewVisible = false
		},
		async handleViewImage(record) {
			if (!record || !record.fileID) {
				// 如果没有fileID，直接使用imageUrl预览
				this.previewImage(record.imageUrl)
				return
			}
			
			// 设置当前记录的加载状态
			this.$set(record, 'viewLoading', true)
			
			try {
				this.$message.loading('正在获取图片链接...', 0)
				const res = await getPdfDownloadUrl(record.fileID)
				console.log('图片链接:', res)
				
				this.$message.destroy()
				
				if (res && res.file_list && res.file_list.length > 0 && res.file_list[0].download_url) {
					// 使用下载链接预览图片
					this.previewImage(res.file_list[0].download_url)
				} else {
					// 如果获取失败，使用原始链接
					this.previewImage(record.imageUrl)
					this.$message.error('获取高清图片链接失败，使用原始图片')
				}
			} catch (error) {
				console.error('获取图片链接失败:', error)
				this.$message.destroy()
				this.$message.error('获取图片链接失败: ' + (error.message || '未知错误'))
				// 使用原始链接作为备选
				this.previewImage(record.imageUrl)
			} finally {
				this.$set(record, 'viewLoading', false)
			}
		},
		async handleViewUploadedImage() {
			if (!this.uploadedFileInfo || !this.uploadedFileInfo.fileID) {
				// 如果没有fileID，直接使用url预览
				this.previewImage(this.fileList[0].url)
				return
			}
			
			this.viewUploadLoading = true
			
			try {
				this.$message.loading('正在获取图片链接...', 0)
				const res = await getPdfDownloadUrl(this.uploadedFileInfo.fileID)
				console.log('图片链接:', res)
				
				this.$message.destroy()
				
				if (res && res.file_list && res.file_list.length > 0 && res.file_list[0].download_url) {
					// 使用下载链接预览图片
					this.previewImage(res.file_list[0].download_url)
				} else {
					// 如果获取失败，使用原始链接
					this.previewImage(this.fileList[0].url)
					this.$message.error('获取高清图片链接失败，使用原始图片')
				}
			} catch (error) {
				console.error('获取图片链接失败:', error)
				this.$message.destroy()
				this.$message.error('获取图片链接失败: ' + (error.message || '未知错误'))
				// 使用原始链接作为备选
				this.previewImage(this.fileList[0].url)
			} finally {
				this.viewUploadLoading = false
			}
		},
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