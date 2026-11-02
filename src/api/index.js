import fetchWrapper from '@/plugins/fetchWrapper'; // 确保路径正确

// 接口地址前缀，由 .env / .env.development / .env.production 里的 VUE_APP_API_BASE_URL 决定（留空表示同源）
export const API_BASE_URL = process.env.VUE_APP_API_BASE_URL;

// 产品分类接口
export const getCategories = async (query = {}) => {
  try {
    const queryParams = new URLSearchParams(query).toString();
    const url = `${API_BASE_URL}/api/categories${queryParams ? `?${queryParams}` : ''}`;
    const res = await fetchWrapper.get(url);
    return res;
  } catch (error) {
    throw error;
  }
};

export const getCategoryById = async (id) => {
  try {
    const res = await fetchWrapper.get(`${API_BASE_URL}/api/categories/${id}`);
    return res;
  } catch (error) {
    throw error;
  }
};

export const createCategory = async (data) => {
  try {
    const res = await fetchWrapper.post(`${API_BASE_URL}/api/categories`, data);
    return res;
  } catch (error) {
    throw error;
  }
};

export const updateCategory = async (id, data) => {
  try {
    const res = await fetchWrapper.put(`${API_BASE_URL}/api/categories/${id}`, data);
    return res;
  } catch (error) {
    throw error;
  }
};

export const deleteCategory = async (id) => {
  try {
    const res = await fetchWrapper.delete(`${API_BASE_URL}/api/categories/${id}`);
    return res;
  } catch (error) {
    throw error;
  }
};

// 产品目录接口
export const getCatalogs = async (query = {}) => {
  try {
    const queryParams = new URLSearchParams(query).toString();
    const url = `${API_BASE_URL}/api/catalogs${queryParams ? `?${queryParams}` : ''}`;
    const res = await fetchWrapper.get(url);
    return res;
  } catch (error) {
    throw error;
  }
};

export const getCatalogById = async (id) => {
  try {
    const res = await fetchWrapper.get(`${API_BASE_URL}/api/catalogs/${id}`);
    return res;
  } catch (error) {
    throw error;
  }
};

export const createCatalog = async (data) => {
  try {
    const res = await fetchWrapper.post(`${API_BASE_URL}/api/catalogs`, data);
    return res;
  } catch (error) {
    throw error;
  }
};

export const updateCatalog = async (id, data) => {
  try {
    const res = await fetchWrapper.put(`${API_BASE_URL}/api/catalogs/${id}`, data);
    return res;
  } catch (error) {
    throw error;
  }
};

export const deleteCatalog = async (id) => {
  try {
    const res = await fetchWrapper.delete(`${API_BASE_URL}/api/catalogs/${id}`);
    return res;
  } catch (error) {
    throw error;
  }
};

// 产品详情接口
export const getProducts = async (query = {}) => {
  try {
    const queryParams = new URLSearchParams(query).toString();
    const url = `${API_BASE_URL}/api/products${queryParams ? `?${queryParams}` : ''}`;
    const res = await fetchWrapper.get(url);
    return res;
  } catch (error) {
    throw error;
  }
};

export const getProductById = async (id) => {
  try {
    const res = await fetchWrapper.get(`${API_BASE_URL}/api/products/${id}`);
    return res;
  } catch (error) {
    throw error;
  }
};

export const createProduct = async (data) => {
  try {
    const res = await fetchWrapper.post(`${API_BASE_URL}/api/products`, data);
    return res;
  } catch (error) {
    throw error;
  }
};

export const updateProduct = async (id, data) => {
  try {
    const res = await fetchWrapper.put(`${API_BASE_URL}/api/products/${id}`, data);
    return res;
  } catch (error) {
    throw error;
  }
};

export const deleteProduct = async (id) => {
  try {
    const res = await fetchWrapper.delete(`${API_BASE_URL}/api/products/${id}`);
    return res;
  } catch (error) {
    throw error;
  }
};

// 获取上传授权
export const getUploadAuth = async (data) => {
    try {
        const res = await fetchWrapper.post(`${API_BASE_URL}/api/chunk-uploads/auth`, data);
        return res;
    } catch (error) {
        throw error;
    }
}

// 上传文件到腾讯云COS
export const uploadToCos = async (file, authData) => {
    try {

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
    } catch (error) {
        throw error;
    }
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
        const authData = await getUploadAuth({ path: file.name });

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
    try {
        return await uploadFile(file);
    } catch (error) {
        throw error;
    }
}

// 微信小程序相关接口
export const getWxOpenId = async () => {
  try {
    const res = await fetchWrapper.get(`${API_BASE_URL}/api/wx_openid`);
    return res;
  } catch (error) {
    throw error;
  }
};

export const getWxConfig = async () => {
  try {
    const res = await fetchWrapper.get(`${API_BASE_URL}/api/wx_config`);
    return res;
  } catch (error) {
    throw error;
  }
};

// 删除PDF文件
export const deletePdf = async (fileID) => {
  try {
    const res = await fetchWrapper.post(`${API_BASE_URL}/api/files/delete`, {
      fileid_list: [fileID]
    });
    return res;
  } catch (error) {
    throw error;
  }
};

// 获取PDF下载链接
export const getPdfDownloadUrl = async (fileID) => {
  try {
    const res = await fetchWrapper.post(`${API_BASE_URL}/api/files/download`, {
      file_list: [{
        fileid: fileID,
        max_age: 7200
      }]
    });
    return res;
  } catch (error) {
    throw error;
  }
};

// 用户相关接口
export const login = async (data) => {
    try {
        const res = await fetchWrapper.post(`${API_BASE_URL}/api/users/login`, data, {
            returnFullResponse: true  // 添加一个选项来获取完整响应
        });
        return res;
    } catch (error) {
        throw error;
    }
}

export const changePassword = async (data) => {
    try {
        const res = await fetchWrapper.post(`${API_BASE_URL}/api/users/change-password`, data, {
            returnFullResponse: true
        });
        return res;
    } catch (error) {
        throw error;
    }
}

export const createMainUser = async (data) => {
    try {
        const res = await fetchWrapper.post(`${API_BASE_URL}/api/users/main`, data, {
            returnFullResponse: true
        });
        return res;
    } catch (error) {
        throw error;
    }
}

export const createSubUser = async (data) => {
    try {
        const res = await fetchWrapper.post(`${API_BASE_URL}/api/users/sub`, data, {
            returnFullResponse: true
        });
        return res;
    } catch (error) {
        throw error;
    }
}

export const getUsers = async (query = {}) => {
    try {
        const queryParams = new URLSearchParams(query).toString();
        const url = `${API_BASE_URL}/api/users${queryParams ? `?${queryParams}` : ''}`;
        const res = await fetchWrapper.get(url, {
            returnFullResponse: true
        });
        return res;
    } catch (error) {
        throw error;
    }
}

export const getUserById = async (id) => {
    try {
        const res = await fetchWrapper.get(`${API_BASE_URL}/api/users/${id}`, {
            returnFullResponse: true
        });
        return res;
    } catch (error) {
        throw error;
    }
}

export const updateUser = async (id, data) => {
    try {
        const res = await fetchWrapper.put(`${API_BASE_URL}/api/users/${id}`, data, {
            returnFullResponse: true
        });
        return res;
    } catch (error) {
        throw error;
    }
}

export const deleteUser = async (id) => {
    try {
        const res = await fetchWrapper.delete(`${API_BASE_URL}/api/users/${id}`, {
            returnFullResponse: true
        });
        return res;
    } catch (error) {
        throw error;
    }
}

export const resetUserPassword = async (id, data) => {
    try {
        const res = await fetchWrapper.post(`${API_BASE_URL}/api/users/${id}/reset-password`, data, {
            returnFullResponse: true
        });
        return res;
    } catch (error) {
        throw error;
    }
}

// 公司信息相关接口
export const getCompanyInfo = async () => {
    try {
        const res = await fetchWrapper.get(`${API_BASE_URL}/api/company`, {
            returnFullResponse: true
        });
        return res;
    } catch (error) {
        throw error;
    }
}

export const updateCompanyInfo = async (data) => {
    try {
        const res = await fetchWrapper.put(`${API_BASE_URL}/api/company`, data, {
            returnFullResponse: true
        });
        return res;
    } catch (error) {
        throw error;
    }
}

// 轮播图相关接口
export const getCarousels = async (query = {}) => {
    try {
        const queryParams = new URLSearchParams(query).toString();
        const url = `${API_BASE_URL}/api/carousels${queryParams ? `?${queryParams}` : ''}`;
        const res = await fetchWrapper.get(url, {
            returnFullResponse: true
        });
        return res;
    } catch (error) {
        throw error;
    }
}

export const createCarousel = async (data) => {
    try {
        const res = await fetchWrapper.post(`${API_BASE_URL}/api/carousels`, data, {
            returnFullResponse: true
        });
        return res;
    } catch (error) {
        throw error;
    }
}

export const updateCarousel = async (id, data) => {
    try {
        const res = await fetchWrapper.put(`${API_BASE_URL}/api/carousels/${id}`, data, {
            returnFullResponse: true
        });
        return res;
    } catch (error) {
        throw error;
    }
}

export const deleteCarousel = async (id) => {
    try {
        const res = await fetchWrapper.delete(`${API_BASE_URL}/api/carousels/${id}`, {
            returnFullResponse: true
        });
        return res;
    } catch (error) {
        throw error;
    }
}

export const updateCarouselOrder = async (data) => {
    try {
        const res = await fetchWrapper.put(`${API_BASE_URL}/api/carousels/order/batch`, data, {
            returnFullResponse: true
        });
        return res;
    } catch (error) {
        throw error;
    }
}

// 日志相关接口
export const getLogs = async (query = {}) => {
    try {
        const queryParams = new URLSearchParams(query).toString();
        const url = `${API_BASE_URL}/api/logs${queryParams ? `?${queryParams}` : ''}`;
        const res = await fetchWrapper.get(url, {
            returnFullResponse: true
        });
        return res;
    } catch (error) {
        throw error;
    }
}

export const getLogActions = async () => {
    try {
        const res = await fetchWrapper.get(`${API_BASE_URL}/api/logs/actions`, {
            returnFullResponse: true
        });
        return res;
    } catch (error) {
        throw error;
    }
}

// 手册管理相关接口
export const getManuals = async (query = {}) => {
    try {
        const queryParams = new URLSearchParams(query).toString();
        const url = `${API_BASE_URL}/api/manuals${queryParams ? `?${queryParams}` : ''}`;
        const res = await fetchWrapper.get(url, {
            returnFullResponse: true
        });
        return res;
    } catch (error) {
        throw error;
    }
}

export const getManualById = async (id) => {
    try {
        const res = await fetchWrapper.get(`${API_BASE_URL}/api/manuals/${id}`, {
            returnFullResponse: true
        });
        return res;
    } catch (error) {
        throw error;
    }
}

export const createManual = async (data) => {
    try {
        const res = await fetchWrapper.post(`${API_BASE_URL}/api/manuals`, data, {
            returnFullResponse: true
        });
        return res;
    } catch (error) {
        throw error;
    }
}

export const updateManual = async (id, data) => {
    try {
        const res = await fetchWrapper.put(`${API_BASE_URL}/api/manuals/${id}`, data, {
            returnFullResponse: true
        });
        return res;
    } catch (error) {
        throw error;
    }
}

export const deleteManual = async (id) => {
    try {
        const res = await fetchWrapper.delete(`${API_BASE_URL}/api/manuals/${id}`, {
            returnFullResponse: true
        });
        return res;
    } catch (error) {
        throw error;
    }
}

// 批量关联产品的英文版（英文名、英文 PDF）。data: { dryRun, items: [{ name, catalogId?, nameEn?, fileIDEn?, pdfUrlEn? }] }
// dryRun 为 true 时只返回匹配报告，不写入。返回报告对象
export const bulkLinkEnglishProducts = async (data) => {
    try {
        const res = await fetchWrapper.post(`${API_BASE_URL}/api/products/bulk-en`, data);
        return res;
    } catch (error) {
        throw error;
    }
}

// 产品英文版覆盖情况：{ total, withZhFile, withEnFile, missingEnFile }
export const getEnglishStats = async () => {
    try {
        const res = await fetchWrapper.get(`${API_BASE_URL}/api/products/en-stats`);
        return res;
    } catch (error) {
        throw error;
    }
}

// 批量删除云存储文件（每次最多 50 个）。返回成功提交删除的数量；失败的批次会被忽略（只是清理，不影响主流程）
export const deletePdfs = async (fileIDs) => {
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
