<template>
	<div>
		<a-card :bordered="false">
			<a-form class="co-form" layout="vertical" :form="form" @submit="handleSubmit">
				<a-form-item label="公司Logo">
					<a-upload
						name="file"
						:fileList="logoFileList"
						:beforeUpload="beforeUpload"
						:remove="handleRemoveLogo"
						listType="picture-card"
						:showUploadList="false"
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
						<img :src="toDisplayUrl(logoFileList[0].url)" alt="公司Logo" title="点击更换Logo"
							:style="{ maxWidth: '200px', maxHeight: '200px', cursor: logoUploading ? 'not-allowed' : 'pointer' }"
							@click="!logoUploading && handleChangeLogo()" />
						<div style="margin-top: 4px; color: rgba(0, 0, 0, 0.45); font-size: 12px;">点击图片可更换Logo</div>
					</div>
					<a-modal :visible="previewVisible" :footer="null" @cancel="handleCancel">
						<img alt="example" style="width: 100%" :src="toDisplayUrl(previewImage)" />
					</a-modal>
				</a-form-item>
				<a-row :gutter="32">
					<a-col :xs="24" :md="12">
						<a-form-item label="公司名称">
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
						<a-form-item label="公司介绍">
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
						<a-form-item label="公司地址">
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
					</a-col>
					<a-col :xs="24" :md="12">
						<a-form-item label="英文名称">
							<a-input
								v-decorator="[
									'nameEn',
									{
										rules: [{ max: 100, message: '最多 100 个字符' }]
									}
								]"
								placeholder="可选；没有填写时英文界面显示公司名称"
							/>
						</a-form-item>
						<a-form-item label="英文介绍">
							<a-textarea
								v-decorator="[
									'descriptionEn',
									{
										rules: [{ max: 20000, message: '最多 20000 个字符' }]
									}
								]"
								:rows="4"
								placeholder="可选；没有填写时英文界面显示公司介绍"
							/>
						</a-form-item>
						<a-form-item label="英文地址">
							<a-input
								v-decorator="[
									'addressEn',
									{
										rules: [{ max: 200, message: '最多 200 个字符' }]
									}
								]"
								placeholder="可选；没有填写时英文界面显示公司地址"
							/>
						</a-form-item>
					</a-col>
				</a-row>
				<a-form-item label="联系方式">
					<a-select
						v-decorator="[
							'contacts',
							{
								rules: [{ required: true, message: '请添加至少一个联系方式!' }]
							}
						]"
						mode="tags"
						placeholder="输入后按回车添加"
					/>
					<div style="color: #999; font-size: 12px; line-height: 1.5; margin-top: 5px;">
						输入后按回车添加，可以添加多个联系方式
					</div>
				</a-form-item>
				<a-form-item label="电子邮箱">
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
				<a-form-item label="公司网站">
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
				<!-- <a-form-item label="安全手册">
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
				<a-form-item>
					<a-button type="primary" html-type="submit" :loading="loading">
						保存
					</a-button>
				</a-form-item>
			</a-form>
		</a-card>
	</div>
</template>

<script>
import { notifyError } from '@/utils/notify';
import { toDisplayUrl } from '@/utils/cloudUrl';
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
			// 已保存在服务端的文件 ID：和当前文件不同，说明当前文件是本次新传、还没保存的
			originalLogoFileID: '',
			originalPdfFileID: '',
			// 用户移除了已保存的文件：点保存时通知服务端清空（并由服务端删除旧文件）
			logoRemoved: false,
			pdfRemoved: false
		}
	},
	methods: {
		toDisplayUrl,
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
						} else if (this.logoRemoved) {
							values.logoUrl = ''
							values.logoFileID = ''
						}
						if (this.uploadedPdfInfo) {
							values.safetyManualUrl = this.uploadedPdfInfo.url
							values.safetyManualFileID = this.uploadedPdfInfo.fileID
						} else if (this.pdfRemoved) {
							values.safetyManualUrl = ''
							values.safetyManualFileID = ''
						}
						await updateCompanyInfo(values)
						// 保存成功：当前文件成为"已保存"的文件，旧文件由服务端清理
						this.originalLogoFileID = this.uploadedLogoInfo ? this.uploadedLogoInfo.fileID : ''
						this.originalPdfFileID = this.uploadedPdfInfo ? this.uploadedPdfInfo.fileID : ''
						this.logoRemoved = false
						this.pdfRemoved = false
						this.$message.success('公司信息更新成功')
					} catch (error) {
						notifyError(this, error, '公司信息更新失败')
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
					this.originalLogoFileID = data.logoFileID
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
					this.originalPdfFileID = data.safetyManualFileID
				}
				// 只设置表单里注册过的字段；把整条记录塞进去会让 id、createdAt、logoUrl 等每个多余的键各报一次警告
				const FORM_FIELDS = ['name', 'nameEn', 'description', 'descriptionEn', 'contacts', 'email', 'website', 'address', 'addressEn']
				this.form.setFieldsValue(FORM_FIELDS.reduce((o, k) => (k in data ? { ...o, [k]: data[k] } : o), {}))
				
				// 设置预览图片
				if (data.logoUrl) {
					this.previewImage = data.logoUrl
				}
			} catch (error) {
				notifyError(this, error, '获取公司信息失败')
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

			// 只清理"本次新传、还没保存"的上一个文件；已保存的旧文件不能在这里删——
			// 用户随时可能不保存，由服务端在保存成功后再删
			await this.discardSessionFile('logo')
			
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
				
				if (!error.notified) this.$message.error(this.logoUploadError)
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

			// 只清理"本次新传、还没保存"的上一个文件（原因同上）
			await this.discardSessionFile('pdf')
			
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
				
				if (!error.notified) this.$message.error(this.pdfUploadError)
			} finally {
				this.pdfUploading = false
			}
		},
		// 清理"本次新传、还没保存"的文件（当前文件的 ID 和已保存的不同）。已保存的文件绝不在这里删。
		// 删除失败只会留下一个孤儿文件，不影响操作
		async discardSessionFile(kind) {
			const info = kind === 'logo' ? this.uploadedLogoInfo : this.uploadedPdfInfo
			const original = kind === 'logo' ? this.originalLogoFileID : this.originalPdfFileID
			if (info && info.fileID && info.fileID !== original) {
				try {
					await deletePdf(info.fileID)
				} catch (error) {
					// 忽略
				}
			}
		},
		async handleRemoveLogo() {
			await this.discardSessionFile('logo')
			this.logoFile = null
			this.logoFileList = []
			this.uploadedLogoInfo = null
			// 已保存过的 Logo：点保存后才真正清空（并由服务端删除文件），不保存则什么都不会变
			if (this.originalLogoFileID) {
				this.logoRemoved = true
				this.$message.info('已移除，点击保存后生效')
			}
			return true
		},
		async handleRemovePdf() {
			await this.discardSessionFile('pdf')
			this.pdfFile = null
			this.pdfFileList = []
			this.uploadedPdfInfo = null
			if (this.originalPdfFileID) {
				this.pdfRemoved = true
				this.$message.info('已移除，点击保存后生效')
			}
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
				
				this.$message.destroy()
				
				if (res && res.file_list && res.file_list.length > 0 && res.file_list[0].download_url) {
					// 打开新窗口下载文件
					window.open(res.file_list[0].download_url, '_blank')
					this.$message.success('下载链接已打开')
				} else {
					this.$message.error('获取下载链接失败')
				}
			} catch (error) {
				this.$message.destroy()
				notifyError(this, error, '下载PDF失败')
			} finally {
				this.downloadLoading = false
			}
		},
	},
	created() {
		this.fetchCompanyInfo()
	},
	beforeDestroy() {
		// 离开页面时没保存的新文件不留下孤儿（尽力而为，浏览器直接关闭时做不到）
		this.discardSessionFile('logo')
		this.discardSessionFile('pdf')
	}
}
</script>

<style scoped>
/* 整个表单的宽度（整行的 50%），不撑满；窄屏时占满 */
.co-form {
	max-width: 50%;
}
@media (max-width: 992px) {
	.co-form { max-width: 100%; }
}
.ant-upload-text {
	margin-top: 8px;
	color: #666;
}
</style> 