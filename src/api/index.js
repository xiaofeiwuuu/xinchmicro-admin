import fetchWrapper from '@/plugins/fetchWrapper'; // 确保路径正确

// 定义 API 基础 URL
// export const API_BASE_URL = 'https://emenu.scszyy.cn/api';
export const API_BASE_URL = 'http://192.168.1.36:8082/api';

// 登录
export const Login = async (data) => {
  try {
    const res = await fetchWrapper.post(`${API_BASE_URL}/back/login`, data);
    return res;
  } catch (error) {
    throw error; // 重新抛出错误以便调用者处理
  }
};

// 门店列表
export const getStoreList = async (query) => {
  try {
    const queryParams = new URLSearchParams(query).toString();
    const url = `${API_BASE_URL}/store/list?${queryParams}`;
    const res = await fetchWrapper.get(url);
    return res;
  } catch (error) {
    throw error; // 重新抛出错误以便调用者处理
  }
};

// 添加门店
export const addStore = async (data) => {
  try {
    const res = await fetchWrapper.post(`${API_BASE_URL}/store/add`, data);
    return res;
  } catch (error) {
    throw error; // 重新抛出错误以便调用者处理
  }
};

// 删除门店
export const deleteStore = async (data) => {
  try {
    const res = await fetchWrapper.post(`${API_BASE_URL}/store/del`, data);
    return res;
  } catch (error) {
    throw error; // 重新抛出错误以便调用者处理
  }
};

// 更新门店
export const updateStore = async (data) => {
  try {
    const res = await fetchWrapper.post(`${API_BASE_URL}/store/edit`, data);
    return res;
  } catch (error) {
    throw error; // 重新抛出错误以便调用者处理
  }
};

// 添加用户
export const addUser = async (data) => {
  try {
    const res = await fetchWrapper.post(`${API_BASE_URL}/user/add`, data);
    return res;
  } catch (error) {
    throw error; // 重新抛出错误以便调用者处理
  }
};

// 删除用户
export const deleteUser = async (data) => {
  try {
    const res = await fetchWrapper.post(`${API_BASE_URL}/user/del`, data);
    return res;
  } catch (error) {
    throw error; // 重新抛出错误以便调用者处理
  }
};

// 更新用户
export const updateUser = async (data) => {
  try {
    const res = await fetchWrapper.post(`${API_BASE_URL}/user/edit`, data);
    return res;
  } catch (error) {
    throw error; // 重新抛出错误以便调用者处理
  }
};

// 查询所有用户
export const getUsersList = async (query) => {
  try {
    const queryParams = new URLSearchParams(query).toString();
    const url = `${API_BASE_URL}/user/list?${queryParams}`;
    const res = await fetchWrapper.get(url);
    return res;
  } catch (error) {
    throw error; // 重新抛出错误以便调用者处理
  }
};

// 新增图片
export const addImage = async (data) => {
  try {
    const res = await fetchWrapper.post(`${API_BASE_URL}/image/add`, data);
    return res;
  } catch (error) {
    throw error; // 重新抛出错误以便调用者处理
  }
};

// 删除图片
export const deleteImage = async (data) => {
  try {
    const res = await fetchWrapper.post(`${API_BASE_URL}/image/del`, data);
    return res;
  } catch (error) {
    throw error; // 重新抛出错误以便调用者处理
  }
};

// 更新图片
export const updateImage = async (data) => {
  try {
    const res = await fetchWrapper.post(`${API_BASE_URL}/image/edit`, data);
    return res;
  } catch (error) {
    throw error; // 重新抛出错误以便调用者处理
  }
};

// 获取图片列表
export const getImageList = async (query) => {
  try {
    const queryParams = new URLSearchParams(query).toString();
    const url = `${API_BASE_URL}/image/list?${queryParams}`;
    const res = await fetchWrapper.get(url);
    return res;
  } catch (error) {
    throw error; // 重新抛出错误以便调用者处理
  }
};

// 设置图片热区信息
export const setImageHotArea = async (data) => {
  try {
    const res = await fetchWrapper.post(`${API_BASE_URL}/image/set/hot/area`, data);
    return res;
  } catch (error) {
    throw error; // 重新抛出错误以便调用者处理
  }
};

// 设置图片页面顺序
export const setImagePageOrder = async (data) => {
  try {
    const res = await fetchWrapper.post(`${API_BASE_URL}/image/set/page/order`, data);
    return res;
  } catch (error) {
    throw error; // 重新抛出错误以便调用者处理
  }
};

// 生成二维码
export const setQrCode = async (data) => {
  try {
    const res = await fetchWrapper.post(`${API_BASE_URL}/store/set/qrcode`, data);
    return res;
  } catch (error) {
    throw error; // 重新抛出错误以便调用者处理
  }
};

// 批量删除图片
export const deleteImageAll = async (data) => {
  try {
    const res = await fetchWrapper.post(`${API_BASE_URL}/image/del/all`, data);
    return res;
  } catch (error) {
    throw error; // 重新抛出错误以便调用者处理
  }
};

// 获取用户信息
export const getUserInfo = async () => {
  try {
    const res = await fetchWrapper.get(`${API_BASE_URL}/user/info`);
    return res;
  } catch (error) {
    throw error; // 重新抛出错误以便调用者处理
  }
};

// 操作日志
export const getLogsList = async (query) => {
  try {
    const queryParams = new URLSearchParams(query).toString();
    const url = `${API_BASE_URL}/logs/list?${queryParams}`;
    const res = await fetchWrapper.get(url);
    return res;
  } catch (error) {
    throw error; // 重新抛出错误以便调用者处理
  }
};
// 其他 API 函数可以继续添加
