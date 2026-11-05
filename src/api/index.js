import fetchWrapper from '@/plugins/fetchWrapper'; // 确保路径正确
import { isMainUser } from '@/utils/auth';

// 接口地址前缀，由 .env / .env.development / .env.production 里的 VUE_APP_API_BASE_URL 决定（留空表示同源）
export const API_BASE_URL = process.env.VUE_APP_API_BASE_URL;

// 产品分类接口
export const getCategories = async (query = {}) => {
  const queryParams = new URLSearchParams(query).toString();
  const url = `${API_BASE_URL}/api/categories${queryParams ? `?${queryParams}` : ''}`;
  return fetchWrapper.get(url);
};

export const getCategoryById = async (id) => {
  return fetchWrapper.get(`${API_BASE_URL}/api/categories/${id}`);
};

export const createCategory = async (data) => {
  return fetchWrapper.post(`${API_BASE_URL}/api/categories`, data);
};

export const updateCategory = async (id, data) => {
  return fetchWrapper.put(`${API_BASE_URL}/api/categories/${id}`, data);
};

export const deleteCategory = async (id) => {
  return fetchWrapper.delete(`${API_BASE_URL}/api/categories/${id}`);
};

// 产品目录接口
export const getCatalogs = async (query = {}) => {
  const queryParams = new URLSearchParams(query).toString();
  const url = `${API_BASE_URL}/api/catalogs${queryParams ? `?${queryParams}` : ''}`;
  return fetchWrapper.get(url);
};

export const getCatalogById = async (id) => {
  return fetchWrapper.get(`${API_BASE_URL}/api/catalogs/${id}`);
};

export const createCatalog = async (data) => {
  return fetchWrapper.post(`${API_BASE_URL}/api/catalogs`, data);
};

export const updateCatalog = async (id, data) => {
  return fetchWrapper.put(`${API_BASE_URL}/api/catalogs/${id}`, data);
};

export const deleteCatalog = async (id) => {
  return fetchWrapper.delete(`${API_BASE_URL}/api/catalogs/${id}`);
};

// 产品详情接口
export const getProducts = async (query = {}) => {
  const queryParams = new URLSearchParams(query).toString();
  const url = `${API_BASE_URL}/api/products${queryParams ? `?${queryParams}` : ''}`;
  return fetchWrapper.get(url);
};

export const getProductById = async (id) => {
  return fetchWrapper.get(`${API_BASE_URL}/api/products/${id}`);
};

export const createProduct = async (data) => {
  return fetchWrapper.post(`${API_BASE_URL}/api/products`, data);
};

export const updateProduct = async (id, data) => {
  return fetchWrapper.put(`${API_BASE_URL}/api/products/${id}`, data);
};

export const deleteProduct = async (id) => {
  return fetchWrapper.delete(`${API_BASE_URL}/api/products/${id}`);
};

// 获取上传授权
export const getUploadAuth = async (data) => {
    return fetchWrapper.post(`${API_BASE_URL}/api/chunk-uploads/auth`, data);
}

// 上传文件到腾讯云COS
export const uploadToCos = async (file, authData) => {
    const formData = new FormData();
    formData.append('key', authData.key);
    formData.append('Signature', authData.authorization);
    formData.append('x-cos-security-token', authData.token);
    formData.append('x-cos-meta-fileid', authData.cos_file_id);
    formData.append('file', file);

    const res = await fetch(authData.url, {
        method: 'POST',
        body: formData
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`上传失败: ${res.status} ${res.statusText} - ${errorText}`);
    }

    const result = {
        fileID: authData.file_id,
        url: authData.download_url || authData.url, // 优先使用下载URL
        filename: file.name
    };
    return result;
}

// 带进度监控的上传到 COS
export const uploadToCosWithProgress = (file, authData, onProgress) => {
    const formData = new FormData();
    formData.append('key', authData.key);
    formData.append('Signature', authData.authorization);
    formData.append('x-cos-security-token', authData.token);
    formData.append('x-cos-meta-fileid', authData.cos_file_id);
    formData.append('file', file);

    const xhr = new XMLHttpRequest();

    const promise = new Promise((resolve, reject) => {
        // 监听上传进度
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable && onProgress) {
                const percentComplete = Math.floor((e.loaded / e.total) * 100);
                const uploadedMB = (e.loaded / (1024 * 1024)).toFixed(2);
                const totalMB = (e.total / (1024 * 1024)).toFixed(2);

                onProgress({
                    percent: percentComplete,
                    loaded: e.loaded,
                    total: e.total,
                    uploadedMB,
                    totalMB
                });
            }
        });

        // 监听上传完成
        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve({
                    fileID: authData.file_id,
                    url: authData.download_url || authData.url,
                    filename: file.name
                });
            } else {
                reject(new Error(`上传失败: ${xhr.status} ${xhr.statusText}`));
            }
        });

        // 监听上传错误
        xhr.addEventListener('error', () => {
            reject(new Error('上传失败，请检查网络连接'));
        });

        // 监听取消
        xhr.addEventListener('abort', () => {
            reject(new Error('上传已取消'));
        });

        // 发送请求
        xhr.open('POST', authData.url);
        xhr.send(formData);
    });

    // 将 xhr 对象附加到 Promise 上，以便外部可以取消
    promise._xhr = xhr;

    return promise;
}

// 文件上传接口
export const uploadFile = async (file) => {
    try {
        
        // 1. 获取上传授权
        const authData = await getUploadAuth({ path: file.name, size: file.size });

        // 2. 上传到腾讯云COS
        const result = await uploadToCos(file, authData);

        return result;
    } catch (error) {
        const wrapped = new Error(`文件上传失败: ${error.message}`);
        // 保留"请求层已经提示过"的标记，页面就不会再弹一条重复的提示
        wrapped.notified = error.notified;
        throw wrapped;
    }
}

// PDF文件上传接口
export const uploadPdf = async (file) => {
    return await uploadFile(file);
}

// 微信小程序相关接口
export const getWxOpenId = async () => {
  return fetchWrapper.get(`${API_BASE_URL}/api/wx_openid`);
};

export const getWxConfig = async () => {
  return fetchWrapper.get(`${API_BASE_URL}/api/wx_config`);
};

// 删除云存储文件。服务端只允许主账号调用（/api/files/delete 按文件 ID 直接删，不检查是否在用）。
// 这里的调用都是"取消/重选/移除后顺手清理刚上传、还没保存的文件"，子账号没有权限就直接跳过，
// 不发请求、不弹错误；没清理掉的文件会留在「文件管理」里，由主账号在那里删除。
export const deletePdf = async (fileID) => {
  if (!isMainUser()) return null;
  return fetchWrapper.post(`${API_BASE_URL}/api/files/delete`, {
    fileid_list: [fileID]
  });
};

// 文件管理（文件登记表，仅主账号）
// 列表：{ list, total, summary }，每个文件带 inUse / usedBy / deletable
export const getUploadedFiles = async (query = {}) => {
  const queryParams = new URLSearchParams(query).toString();
  return fetchWrapper.get(`${API_BASE_URL}/api/uploaded-files${queryParams ? `?${queryParams}` : ''}`, {
    returnFullResponse: true
  });
};

// 导入历史文件：[{ fileID, name, size(字节), time }]，只新增
export const importUploadedFiles = async (files) => {
  return fetchWrapper.post(`${API_BASE_URL}/api/uploaded-files/import`, { files }, { returnFullResponse: true });
};

// 删除文件（云存储删除成功后才移除记录；使用中、上传不足 24 小时的会被服务端拒绝）
export const deleteUploadedFiles = async (ids) => {
  return fetchWrapper.post(`${API_BASE_URL}/api/uploaded-files/delete`, { ids }, { returnFullResponse: true });
};

// 获取PDF下载链接
export const getPdfDownloadUrl = async (fileID) => {
  return fetchWrapper.post(`${API_BASE_URL}/api/files/download`, {
    file_list: [{
      fileid: fileID,
      max_age: 7200
    }]
  });
};

// 用户相关接口
export const login = async (data) => {
    return fetchWrapper.post(`${API_BASE_URL}/api/users/login`, data, {
        returnFullResponse: true  // 添加一个选项来获取完整响应
    });
}

export const changePassword = async (data) => {
    return fetchWrapper.post(`${API_BASE_URL}/api/users/change-password`, data, {
        returnFullResponse: true
    });
}

export const createMainUser = async (data) => {
    return fetchWrapper.post(`${API_BASE_URL}/api/users/main`, data, {
        returnFullResponse: true
    });
}

export const createSubUser = async (data) => {
    return fetchWrapper.post(`${API_BASE_URL}/api/users/sub`, data, {
        returnFullResponse: true
    });
}

export const getUsers = async (query = {}) => {
    const queryParams = new URLSearchParams(query).toString();
    const url = `${API_BASE_URL}/api/users${queryParams ? `?${queryParams}` : ''}`;
    return fetchWrapper.get(url, {
        returnFullResponse: true
    });
}

export const getUserById = async (id) => {
    return fetchWrapper.get(`${API_BASE_URL}/api/users/${id}`, {
        returnFullResponse: true
    });
}

export const updateUser = async (id, data) => {
    return fetchWrapper.put(`${API_BASE_URL}/api/users/${id}`, data, {
        returnFullResponse: true
    });
}

export const deleteUser = async (id) => {
    return fetchWrapper.delete(`${API_BASE_URL}/api/users/${id}`, {
        returnFullResponse: true
    });
}

export const resetUserPassword = async (id, data) => {
    return fetchWrapper.post(`${API_BASE_URL}/api/users/${id}/reset-password`, data, {
        returnFullResponse: true
    });
}

// 公司信息相关接口
export const getCompanyInfo = async () => {
    return fetchWrapper.get(`${API_BASE_URL}/api/company`, {
        returnFullResponse: true
    });
}

export const updateCompanyInfo = async (data) => {
    return fetchWrapper.put(`${API_BASE_URL}/api/company`, data, {
        returnFullResponse: true
    });
}

// 轮播图相关接口
export const getCarousels = async (query = {}) => {
    const queryParams = new URLSearchParams(query).toString();
    const url = `${API_BASE_URL}/api/carousels${queryParams ? `?${queryParams}` : ''}`;
    return fetchWrapper.get(url, {
        returnFullResponse: true
    });
}

export const createCarousel = async (data) => {
    return fetchWrapper.post(`${API_BASE_URL}/api/carousels`, data, {
        returnFullResponse: true
    });
}

export const updateCarousel = async (id, data) => {
    return fetchWrapper.put(`${API_BASE_URL}/api/carousels/${id}`, data, {
        returnFullResponse: true
    });
}

export const deleteCarousel = async (id) => {
    return fetchWrapper.delete(`${API_BASE_URL}/api/carousels/${id}`, {
        returnFullResponse: true
    });
}

export const updateCarouselOrder = async (data) => {
    return fetchWrapper.put(`${API_BASE_URL}/api/carousels/order/batch`, data, {
        returnFullResponse: true
    });
}

// 日志相关接口
export const getLogs = async (query = {}) => {
    const queryParams = new URLSearchParams(query).toString();
    const url = `${API_BASE_URL}/api/logs${queryParams ? `?${queryParams}` : ''}`;
    return fetchWrapper.get(url, {
        returnFullResponse: true
    });
}

export const getLogActions = async () => {
    return fetchWrapper.get(`${API_BASE_URL}/api/logs/actions`, {
        returnFullResponse: true
    });
}

// 预览：一个月前的日志有多少条（不删除）。返回 { count, before }
export const previewLogCleanup = async () => {
    return fetchWrapper.get(`${API_BASE_URL}/api/logs/cleanup-preview`, {
        returnFullResponse: true
    });
}

// 永久删除一个月前的全部日志（截止时间由服务端计算）。返回 { deleted, before }
export const cleanupLogs = async () => {
    return fetchWrapper.post(`${API_BASE_URL}/api/logs/cleanup`, {}, {
        returnFullResponse: true
    });
}

// 手册管理相关接口
export const getManuals = async (query = {}) => {
    const queryParams = new URLSearchParams(query).toString();
    const url = `${API_BASE_URL}/api/manuals${queryParams ? `?${queryParams}` : ''}`;
    return fetchWrapper.get(url, {
        returnFullResponse: true
    });
}

export const getManualById = async (id) => {
    return fetchWrapper.get(`${API_BASE_URL}/api/manuals/${id}`, {
        returnFullResponse: true
    });
}

export const createManual = async (data) => {
    return fetchWrapper.post(`${API_BASE_URL}/api/manuals`, data, {
        returnFullResponse: true
    });
}

export const updateManual = async (id, data) => {
    return fetchWrapper.put(`${API_BASE_URL}/api/manuals/${id}`, data, {
        returnFullResponse: true
    });
}

export const deleteManual = async (id) => {
    return fetchWrapper.delete(`${API_BASE_URL}/api/manuals/${id}`, {
        returnFullResponse: true
    });
}

// 批量关联产品的英文版（英文名、英文 PDF）。data: { dryRun, items: [{ name, catalogId?, nameEn?, fileIDEn?, pdfUrlEn? }] }
// dryRun 为 true 时只返回匹配报告，不写入。返回报告对象
export const bulkLinkEnglishProducts = async (data) => {
    return fetchWrapper.post(`${API_BASE_URL}/api/products/bulk-en`, data);
}

// 产品英文版覆盖情况：{ total, withZhFile, withEnFile, missingEnFile }
export const getEnglishStats = async () => {
    return fetchWrapper.get(`${API_BASE_URL}/api/products/en-stats`);
}

// 批量删除云存储文件（每次最多 50 个）。返回成功提交删除的数量；失败的批次会被忽略（只是清理，不影响主流程）
export const deletePdfs = async (fileIDs) => {
    if (!isMainUser()) return 0;
    const ids = [...new Set((fileIDs || []).filter(Boolean))];
    let submitted = 0;
    for (let i = 0; i < ids.length; i += 50) {
        const batch = ids.slice(i, i + 50);
        try {
            await fetchWrapper.post(`${API_BASE_URL}/api/files/delete`, { fileid_list: batch });
            submitted += batch.length;
        } catch (error) {
            // 只是清理云存储，某一批失败不影响主流程，继续处理下一批
        }
    }
    return submitted;
}

// ---------- 商城（客户、订单、设置、产品价格库存） ----------
const qs = (query = {}) => {
  const clean = Object.fromEntries(Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== ''));
  const text = new URLSearchParams(clean).toString();
  return text ? `?${text}` : '';
};

export const getShopCustomers = (query) => fetchWrapper.get(`${API_BASE_URL}/api/admin/customers${qs(query)}`);
export const getShopCustomer = (id) => fetchWrapper.get(`${API_BASE_URL}/api/admin/customers/${id}`);
export const setShopCustomerRemark = (id, remark) => fetchWrapper.put(`${API_BASE_URL}/api/admin/customers/${id}/remark`, { remark });
export const setShopCustomerStatus = (id, status) => fetchWrapper.put(`${API_BASE_URL}/api/admin/customers/${id}/status`, { status });

// 统计数据（仅主账号）：range 为 today / 7d / 30d / 3m / 1y
// custom：{ from, to } 北京时间日期（YYYY-MM-DD，含首尾，最长一年），只在 range 为 'custom' 时用
export const getShopStats = (range, custom = {}) => fetchWrapper.get(`${API_BASE_URL}/api/admin/stats${qs({ range, ...(range === 'custom' ? custom : {}) })}`);
export const getShopOrders = (query) => fetchWrapper.get(`${API_BASE_URL}/api/admin/orders${qs(query)}`);
export const getShopOrder = (id) => fetchWrapper.get(`${API_BASE_URL}/api/admin/orders/${id}`);
export const shipShopOrder = (id, body) => fetchWrapper.post(`${API_BASE_URL}/api/admin/orders/${id}/ship`, body);
// 批量发货（导入快递单号）：items 是 [{ orderNo, expressCompany, expressNo }]；dryRun 只检查不发货。返回每一行的结果
export const bulkShipShopOrders = (items, dryRun) => fetchWrapper.post(`${API_BASE_URL}/api/admin/orders/bulk-ship`, { items, dryRun: !!dryRun });
export const cancelShopOrder = (id, reason) => fetchWrapper.post(`${API_BASE_URL}/api/admin/orders/${id}/cancel`, { reason });
export const markShopOrderRefunded = (id, note) => fetchWrapper.post(`${API_BASE_URL}/api/admin/orders/${id}/refunded`, { note });
// file：{ fileID, filename }（可选，开具时一起上传电子发票）
export const issueShopInvoice = (id, invoiceNo, file) => fetchWrapper.post(`${API_BASE_URL}/api/admin/orders/${id}/invoice/issue`, { invoiceNo, ...(file && file.fileID ? { fileID: file.fileID, fileName: file.filename } : {}) });
// 已开具的订单补传 / 替换发票文件
export const setShopInvoiceFile = (id, file) => fetchWrapper.post(`${API_BASE_URL}/api/admin/orders/${id}/invoice/file`, { fileID: file.fileID, fileName: file.filename });
// 售后：同意（仅退款要带 amount 元；退货退款/换货要带 note 退货地址）、拒绝、确认收到、退款失败重试。都返回处理后的订单详情
export const approveAfterSale = (id, body) => fetchWrapper.post(`${API_BASE_URL}/api/admin/after-sales/${id}/approve`, body);
export const rejectAfterSale = (id, reason) => fetchWrapper.post(`${API_BASE_URL}/api/admin/after-sales/${id}/reject`, { reason });
export const receivedAfterSale = (id, body) => fetchWrapper.post(`${API_BASE_URL}/api/admin/after-sales/${id}/received`, body);
export const retryAfterSaleRefund = (id, amount) => fetchWrapper.post(`${API_BASE_URL}/api/admin/after-sales/${id}/retry-refund`, { amount });
export const rejectShopInvoice = (id, reason) => fetchWrapper.post(`${API_BASE_URL}/api/admin/orders/${id}/invoice/reject`, { reason });

export const getShopSettings = () => fetchWrapper.get(`${API_BASE_URL}/api/admin/settings`);
export const updateShopSettings = (body) => fetchWrapper.put(`${API_BASE_URL}/api/admin/settings`, body);

export const getProductSales = (query) => fetchWrapper.get(`${API_BASE_URL}/api/admin/product-sales${qs(query)}`);
export const updateProductSale = (productId, body) => fetchWrapper.put(`${API_BASE_URL}/api/admin/product-sales/${productId}`, body);
// 批量保存：有不合法的行时服务端一行都不保存，错误里带 errors: [{ index, message }]
// 批量设置一批产品：范围是 { productIds } 或 { query: { categoryId, catalogId, keyword, filter } }，set 是要改的内容；dryRun 只预览
export const batchProductSales = (body) => fetchWrapper.post(`${API_BASE_URL}/api/admin/product-sales/batch`, body);
export const bulkProductSales = (items) => fetchWrapper.post(`${API_BASE_URL}/api/admin/product-sales/bulk`, { items });

// 公告
export const getAnnouncements = async (query = {}) =>
    fetchWrapper.get(`${API_BASE_URL}/api/announcements/manage?${new URLSearchParams(query)}`, { returnFullResponse: true });
export const createAnnouncement = async (data) =>
    fetchWrapper.post(`${API_BASE_URL}/api/announcements`, data, { returnFullResponse: true });
export const updateAnnouncement = async (id, data) =>
    fetchWrapper.put(`${API_BASE_URL}/api/announcements/${id}`, data, { returnFullResponse: true });
export const deleteAnnouncement = async (id) =>
    fetchWrapper.delete(`${API_BASE_URL}/api/announcements/${id}`, { returnFullResponse: true });

// 后台通知（右上角铃铛）。轮询用 silent：断网时不弹错误提示
export const getAdminNotifications = () => fetchWrapper.get(`${API_BASE_URL}/api/admin/notifications`, { silent: true, timeout: 10000 });
export const readAdminNotifications = (ids) => fetchWrapper.post(`${API_BASE_URL}/api/admin/notifications/read`, { ids });
export const readAllAdminNotifications = () => fetchWrapper.post(`${API_BASE_URL}/api/admin/notifications/read-all`, {});
