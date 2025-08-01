import fetchWrapper from '@/plugins/fetchWrapper'; // 确保路径正确

// 定义 API 基础 URL
export const API_BASE_URL = ''; // 替换为实际的API地址

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
        console.log('准备上传到COS, 授权数据:', authData);
        console.log('文件信息:', {
            name: file.name,
            size: file.size,
            type: file.type
        });

        const formData = new FormData();
        formData.append('key', authData.key);
        formData.append('Signature', authData.authorization);
        formData.append('x-cos-security-token', authData.token);
        formData.append('x-cos-meta-fileid', authData.cos_file_id);
        formData.append('file', file);

        console.log('开始上传到COS, URL:', authData.url);
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
        console.error('上传到COS错误:', error);
        throw error;
    }
}

// 文件上传接口
export const uploadFile = async (file) => {
    try {
        console.log('开始上传文件:', file.name);
        
        // 1. 获取上传授权
        const authData = await getUploadAuth({ path: file.name });

        // 2. 上传到腾讯云COS
        const result = await uploadToCos(file, authData);

        return result;
    } catch (error) {
        console.error('文件上传错误:', error);
        throw new Error(`文件上传失败: ${error.message}`);
    }
}

// PDF文件上传接口
export const uploadPdf = async (file) => {
    try {
        return await uploadFile(file);
    } catch (error) {
        console.error('PDF上传错误:', error);
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
    console.log('删除PDF文件, fileID:', fileID);
    const res = await fetchWrapper.post(`${API_BASE_URL}/api/files/delete`, {
      fileid_list: [fileID]
    });
    console.log('删除PDF文件成功');
    return res;
  } catch (error) {
    console.error('删除PDF文件错误:', error);
    throw error;
  }
};

// 获取PDF下载链接
export const getPdfDownloadUrl = async (fileID) => {
  try {
    console.log('获取PDF下载链接, fileID:', fileID);
    const res = await fetchWrapper.post(`${API_BASE_URL}/api/files/download`, {
      file_list: [{
        fileid: fileID,
        max_age: 7200
      }]
    });
    console.log('获取下载链接成功:', res);
    return res;
  } catch (error) {
    console.error('获取PDF下载链接错误:', error);
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