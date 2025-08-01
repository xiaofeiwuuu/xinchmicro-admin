<template>
	<div>
		<a-card :bordered="false">
			<a-form :form="form" @submit="handleSubmit">
				<a-form-item label="公司名称" :labelCol="{ span: 4 }" :wrapperCol="{ span: 14 }">
					<a-input
						v-decorator="[
							'name',
							{
								rules: [{ required: true, message: '请输入公司名称!' }]
							}
						]"
						placeholder="请输入公司名称"
					/>
				</a-form-item>
				<a-form-item label="公司介绍" :labelCol="{ span: 4 }" :wrapperCol="{ span: 14 }">
					<a-textarea
						v-decorator="[
							'description',
							{
								rules: [{ required: true, message: '请输入公司介绍!' }]
							}
						]"
						:rows="4"
						placeholder="请输入公司介绍"
					/>
				</a-form-item>
				<a-form-item label="联系方式" :labelCol="{ span: 4 }" :wrapperCol="{ span: 14 }">
					<a-select
						v-decorator="[
							'contacts',
							{
								rules: [{ required: true, message: '请添加至少一个联系方式!' }]
							}
						]"
						mode="tags"
						placeholder="请输入联系方式"
					/>
				</a-form-item>
				<a-form-item label="电子邮箱" :labelCol="{ span: 4 }" :wrapperCol="{ span: 14 }">
					<a-input
						v-decorator="[
							'email',
							{
								rules: [
									{ required: true, message: '请输入电子邮箱!' },
									{ type: 'email', message: '请输入正确的邮箱格式!' }
								]
							}
						]"
						placeholder="请输入电子邮箱"
					/>
				</a-form-item>
				<a-form-item label="公司网站" :labelCol="{ span: 4 }" :wrapperCol="{ span: 14 }">
					<a-input
						v-decorator="[
							'website',
							{
								rules: [
									{ required: true, message: '请输入公司网站!' },
									{ type: 'url', message: '请输入正确的网址格式!' }
								]
							}
						]"
						placeholder="请输入公司网站"
					/>
				</a-form-item>
				<a-form-item label="公司地址" :labelCol="{ span: 4 }" :wrapperCol="{ span: 14 }">
					<a-input
						v-decorator="[
							'address',
							{
								rules: [{ required: true, message: '请输入公司地址!' }]
							}
						]"
						placeholder="请输入公司地址"
					/>
				</a-form-item>
				<a-form-item label="公司Logo" :labelCol="{ span: 4 }" :wrapperCol="{ span: 14 }">
					<a-upload
						v-decorator="[
							'logo',
							{
								valuePropName: 'fileList',
								getValueFromEvent: normFile
							}
						]"
						name="file"
						:fileList="logoFileList"
						:beforeUpload="beforeUpload"
						:remove="handleRemoveLogo"
						listType="picture-card"
						:showUploadList="{ showPreviewIcon: true, showRemoveIcon: true }"
						:disabled="logoUploading"
						@preview="handlePreview"
					>
						<div v-if="!logoFileList.length">
							<a-icon :type="logoUploading ? 'loading' : 'plus'" />
							<div class="ant-upload-text">{{ logoUploading ? '上传中...' : '上传' }}</div>
						</div>
					</a-upload>
					<div v-if="logoUploadError" style="margin-top: 8px;">
						<a-alert type="error" :message="logoUploadError" banner />
						<a-button type="link" @click="retryLogoUpload" style="padding-left: 0;">
							<a-icon type="reload" /> 重试上传
						</a-button>
					</div>
					<div v-if="logoFileList.length && logoFileList[0].url" style="margin-top: 8px;">
						<img :src="logoFileList[0].url" alt="公司Logo" style="max-width: 200px; max-height: 200px;" />
						<div style="margin-top: 8px;">
							<a-button type="primary" @click="handleDownloadLogo" :loading="logoDownloadLoading">
								<a-icon type="eye" /> 查看
							</a-button>
							<a-button type="primary" style="margin-left: 8px;" @click="handleChangeLogo">
								<a-icon type="edit" /> 修改Logo
							</a-button>
						</div>
					</div>
					<a-modal :visible="previewVisible" :footer="null" @cancel="handleCancel">
						<img alt="example" style="width: 100%" :src="previewImage" />
					</a-modal>
				</a-form-item>
				<!-- <a-form-item label="安全手册" :labelCol="{ span: 4 }" :wrapperCol="{ span: 14 }">
					<a-upload
						v-decorator="[
							'safetyManual',
							{
								valuePropName: 'fileList',
								getValueFromEvent: normFile
							}
						]"
						name="file"
						:fileList="pdfFileList"
						:beforeUpload="beforeUploadPDF"
						:remove="handleRemovePdf"
						:disabled="pdfUploading"
					>
						<a-button :disabled="pdfUploading">
							<a-icon :type="pdfUploading ? 'loading' : 'upload'" /> {{ pdfUploading ? '上传中...' : '上传PDF文件' }}
						</a-button>
					</a-upload>
					<div v-if="pdfUploadError" style="margin-top: 8px;">
						<a-alert type="error" :message="pdfUploadError" banner />
						<a-button type="link" @click="retryPdfUpload" style="padding-left: 0;">
							<a-icon type="reload" /> 重试上传
						</a-button>
					</div>
					<div v-if="pdfFileList.length && pdfFileList[0].url" style="margin-top: 8px;">
						<a-button type="primary" @click="handleDownloadPdf" :loading="downloadLoading">
							<a-icon type="download" /> 下载PDF
						</a-button>
						<a-button type="primary" style="margin-left: 8px;" @click="handleChangePdf">
							<a-icon type="edit" /> 修改PDF
						</a-button>
					</div>
					<div style="color: #999; font-size: 12px; margin-top: 5px;">
						提示：仅支持PDF格式，文件大小不能超过20MB。
					</div>
				</a-form-item> -->
				<a-form-item :wrapperCol="{ span: 14, offset: 4 }">
					<a-button type="primary" html-type="submit" :loading="loading">
						保存
					</a-button>
				</a-form-item>
			</a-form>
		</a-card>
	</div>
</template>

<script>
import { getCompanyInfo, updateCompanyInfo, uploadFile, uploadPdf, deletePdf, getPdfDownloadUrl } from '@/api'

export default {
	data() {
		return {
			form: this.$form.createForm(this),
			loading: false,
			previewVisible: false,
			previewImage: '',
			logoFileList: [],
			pdfFileList: [],
			logoUploading: false,
			pdfUploading: false,
			downloadLoading: false,
			logoUploadError: null,
			pdfUploadError: null,
			logoFile: null,
			pdfFile: null,
			uploadedLogoInfo: null,
			uploadedPdfInfo: null,
			logoDownloadLoading: false
		}
	},
	methods: {
		async handleSubmit(e) {
			e.preventDefault()
			this.form.validateFields(async (err, values) => {
				if (!err) {
					try {
						this.loading = true
						// 处理文件上传的返回结果
						if (this.uploadedLogoInfo) {
							values.logoUrl = this.uploadedLogoInfo.url
							values.logoFileID = this.uploadedLogoInfo.fileID
						}
						if (this.uploadedPdfInfo) {
							values.safetyManualUrl = this.uploadedPdfInfo.url
							values.safetyManualFileID = this.uploadedPdfInfo.fileID
						}
						await updateCompanyInfo(values)
						this.$message.success('公司信息更新成功')
					} catch (error) {
						this.$message.error('公司信息更新失败')
					} finally {
						this.loading = false
					}
				}
			})
		},
		async fetchCompanyInfo() {
			try {
				const res = await getCompanyInfo()
				const data = res.data
				// 处理文件列表
				if (data.logoUrl && data.logoFileID) {
					this.logoFileList = [{
						uid: '-1',
						name: 'logo',
						status: 'done',
						url: data.logoUrl,
						fileID: data.logoFileID
					}]
					this.uploadedLogoInfo = {
						url: data.logoUrl,
						fileID: data.logoFileID,
						filename: 'logo'
					}
				}
				if (data.safetyManualUrl && data.safetyManualFileID) {
					this.pdfFileList = [{
						uid: '-1',
						name: 'safety-manual.pdf',
						status: 'done',
						url: data.safetyManualUrl,
						fileID: data.safetyManualFileID
					}]
					this.uploadedPdfInfo = {
						url: data.safetyManualUrl,
						fileID: data.safetyManualFileID,
						filename: 'safety-manual.pdf'
					}
				}
				this.form.setFieldsValue(data)
				
				// 设置预览图片
				if (data.logoUrl) {
					this.previewImage = data.logoUrl
				}
			} catch (error) {
				this.$message.error('获取公司信息失败')
			}
		},
		normFile(e) {
			if (Array.isArray(e)) {
				return e
			}
			return e && e.fileList
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

			// 如果已有Logo，先删除旧文件
			if (this.uploadedLogoInfo && this.uploadedLogoInfo.fileID) {
				try {
					await this.deletePdfFile(this.uploadedLogoInfo.fileID)
				} catch (error) {
					console.error('删除旧Logo文件失败:', error)
				}
			}
			
			// 清除之前的文件信息
			this.logoFile = file
			this.uploadedLogoInfo = null
			
			// 更新文件列表状态为上传中
			this.logoFileList = [{
				uid: file.uid || '-1',
				name: file.name,
				status: 'uploading',
				percent: 50,
			}]
			
			// 立即上传文件
			this.uploadLogoFile(file)
			return false
		},
		async uploadLogoFile(file) {
			this.logoUploading = true
			this.logoUploadError = null
			
			try {
				// 更新文件状态为上传中
				this.logoFileList = [{
					uid: file.uid || '-1',
					name: file.name,
					status: 'uploading',
					percent: 30,
				}]
				
				// 上传文件
				const result = await uploadFile(file)
				console.log('Logo上传结果:', result)
				
				// 保存上传结果
				this.uploadedLogoInfo = {
					fileID: result.fileID || '',
					url: result.url,
					filename: file.name
				}
				
				// 更新文件状态为已完成
				this.logoFileList = [{
					uid: file.uid || '-1',
					name: file.name,
					status: 'done',
					url: result.url,
					thumbUrl: result.url
				}]
				
				// 设置预览图片
				this.previewImage = result.url
				
				this.$message.success('Logo上传成功')
			} catch (error) {
				console.error('Logo上传错误:', error)
				
				// 更新文件状态为错误
				this.logoFileList = [{
					uid: file.uid || '-1',
					name: file.name,
					status: 'error',
				}]
				
				// 设置错误信息
				if (error.message.includes('413')) {
					this.logoUploadError = '文件太大，超出服务器允许的大小限制。请尝试上传更小的文件（小于2MB）。'
				} else {
					this.logoUploadError = '文件上传失败: ' + (error.message || '未知错误') + '。请点击重试。'
				}
				
				this.$message.error(this.logoUploadError)
			} finally {
				this.logoUploading = false
			}
		},
		async beforeUploadPDF(file) {
			// 检查文件类型
			const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
			if (!isPDF) {
				this.$message.error('只能上传PDF文件!')
				return false
			}
			
			// 检查文件大小
			const isLt20M = file.size / 1024 / 1024 < 20
			if (!isLt20M) {
				this.$message.error('文件必须小于20MB!')
				return false
			}

			// 如果已有PDF，先删除旧文件
			if (this.uploadedPdfInfo && this.uploadedPdfInfo.fileID) {
				try {
					await this.deletePdfFile(this.uploadedPdfInfo.fileID)
				} catch (error) {
					console.error('删除旧PDF文件失败:', error)
				}
			}
			
			// 清除之前的文件信息
			this.pdfFile = file
			this.uploadedPdfInfo = null
			
			// 更新文件列表状态为上传中
			this.pdfFileList = [{
				uid: file.uid || '-1',
				name: file.name,
				status: 'uploading',
				percent: 50,
			}]
			
			// 立即上传文件
			this.uploadPdfFile(file)
			return false
		},
		async uploadPdfFile(file) {
			this.pdfUploading = true
			this.pdfUploadError = null
			
			try {
				// 更新文件状态为上传中
				this.pdfFileList = [{
					uid: file.uid || '-1',
					name: file.name,
					status: 'uploading',
					percent: 30,
				}]
				
				// 上传文件
				const result = await uploadPdf(file)
				
				// 保存上传结果
				this.uploadedPdfInfo = {
					fileID: result.fileID || '',
					url: result.url,
					filename: file.name
				}
				
				// 更新文件状态为已完成
				this.pdfFileList = [{
					uid: file.uid || '-1',
					name: file.name,
					status: 'done',
					url: result.url
				}]
				
				this.$message.success('PDF文件上传成功')
			} catch (error) {
				console.error('PDF上传错误:', error)
				
				// 更新文件状态为错误
				this.pdfFileList = [{
					uid: file.uid || '-1',
					name: file.name,
					status: 'error',
				}]
				
				// 设置错误信息
				if (error.message.includes('413')) {
					this.pdfUploadError = '文件太大，超出服务器允许的大小限制。请尝试上传更小的文件（小于20MB）。'
				} else {
					this.pdfUploadError = '文件上传失败: ' + (error.message || '未知错误') + '。请点击重试。'
				}
				
				this.$message.error(this.pdfUploadError)
			} finally {
				this.pdfUploading = false
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
		async handleRemoveLogo() {
			if (this.uploadedLogoInfo && this.uploadedLogoInfo.fileID) {
				try {
					await this.deletePdfFile(this.uploadedLogoInfo.fileID)
					this.$message.success('Logo已删除')
				} catch (error) {
					this.$message.error('删除Logo失败: ' + error.message)
					return false
				}
			}
			
			this.logoFile = null
			this.logoFileList = []
			this.uploadedLogoInfo = null
			return true
		},
		async handleRemovePdf() {
			if (this.uploadedPdfInfo && this.uploadedPdfInfo.fileID) {
				try {
					await this.deletePdfFile(this.uploadedPdfInfo.fileID)
					this.$message.success('PDF文件已删除')
				} catch (error) {
					this.$message.error('删除PDF文件失败: ' + error.message)
					return false
				}
			}
			
			this.pdfFile = null
			this.pdfFileList = []
			this.uploadedPdfInfo = null
			return true
		},
		retryLogoUpload() {
			if (this.logoFile) {
				this.uploadLogoFile(this.logoFile)
			}
		},
		retryPdfUpload() {
			if (this.pdfFile) {
				this.uploadPdfFile(this.pdfFile)
			}
		},
		handlePreview(file) {
			console.log('预览文件:', file)
			this.previewImage = file.url || file.thumbUrl
			this.previewVisible = true
		},
		handleCancel() {
			this.previewVisible = false
		},
		// 修改Logo
		handleChangeLogo() {
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
		},
		
		// 修改PDF
		handleChangePdf() {
			// 创建一个隐藏的文件输入框
			const input = document.createElement('input')
			input.type = 'file'
			input.accept = '.pdf'
			input.onchange = (e) => {
				const file = e.target.files[0]
				if (file) {
					this.beforeUploadPDF(file)
				}
			}
			input.click()
		},
		
		// 下载PDF文件
		async handleDownloadPdf() {
			if (!this.uploadedPdfInfo || !this.uploadedPdfInfo.fileID) {
				this.$message.error('没有可下载的PDF文件')
				return
			}
			
			try {
				this.downloadLoading = true
				this.$message.loading('正在获取下载链接...', 0)
				const res = await getPdfDownloadUrl(this.uploadedPdfInfo.fileID)
				console.log('下载链接:', res)
				
				this.$message.destroy()
				
				if (res && res.file_list && res.file_list.length > 0 && res.file_list[0].download_url) {
					// 打开新窗口下载文件
					window.open(res.file_list[0].download_url, '_blank')
					this.$message.success('下载链接已打开')
				} else {
					this.$message.error('获取下载链接失败')
				}
			} catch (error) {
				console.error('下载失败:', error)
				this.$message.destroy()
				this.$message.error('下载PDF失败: ' + (error.message || '未知错误'))
			} finally {
				this.downloadLoading = false
			}
		},
		async handleDownloadLogo() {
			if (!this.uploadedLogoInfo || !this.uploadedLogoInfo.fileID) {
				// 如果没有fileID，直接使用url预览
				this.previewImage = this.logoFileList[0].url
				this.previewVisible = true
				return
			}
			
			try {
				this.logoDownloadLoading = true
				this.$message.loading('正在获取图片链接...', 0)
				const res = await getPdfDownloadUrl(this.uploadedLogoInfo.fileID)
				console.log('图片链接:', res)
				
				this.$message.destroy()
				
				if (res && res.file_list && res.file_list.length > 0 && res.file_list[0].download_url) {
					// 使用下载链接预览图片
					this.previewImage = res.file_list[0].download_url
					this.previewVisible = true
				} else {
					// 如果获取失败，使用原始链接
					this.previewImage = this.logoFileList[0].url
					this.previewVisible = true
					this.$message.error('获取高清图片链接失败，使用原始图片')
				}
			} catch (error) {
				console.error('获取图片链接失败:', error)
				this.$message.destroy()
				this.$message.error('获取图片链接失败: ' + (error.message || '未知错误'))
				// 使用原始链接作为备选
				this.previewImage = this.logoFileList[0].url
				this.previewVisible = true
			} finally {
				this.logoDownloadLoading = false
			}
		},
	},
	created() {
		this.fetchCompanyInfo()
	}
}
</script>

<style scoped>
.ant-upload-text {
	margin-top: 8px;
	color: #666;
}
</style> 