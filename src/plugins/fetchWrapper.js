const fetchWrapper = {
  init(message, router) {
    this.message = message;
    this.router = router;
  },

  // 格式化ISO时间字符串为北京时间
  formatISODate(dateStr) {
    if (!dateStr) return dateStr;
    try {
      // 解析UTC时间
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return dateStr;
      }
      
      // 获取UTC时间的年月日时分秒
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      
      // 获取UTC时间，并加上8小时得到北京时间
      let hours = date.getUTCHours() + 8;
      // 处理跨天的情况
      if (hours >= 24) {
        hours -= 24;
      }
      const hoursStr = String(hours).padStart(2, '0');
      
      const minutes = String(date.getUTCMinutes()).padStart(2, '0');
      const seconds = String(date.getUTCSeconds()).padStart(2, '0');
      
      // 格式化为 YYYY-MM-DD HH:mm:ss
      return `${year}-${month}-${day} ${hoursStr}:${minutes}:${seconds}`;
    } catch (error) {
      console.error('时间格式化错误:', error);
      return dateStr;
    }
  },

  // 递归处理对象中的时间字段
  processDateFields(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    
    // 处理数组
    if (Array.isArray(obj)) {
      return obj.map(item => this.processDateFields(item));
    }
    
    // 处理对象
    const result = { ...obj };
    for (const key in result) {
      const value = result[key];
      
      // 如果是对象或数组，递归处理
      if (value && typeof value === 'object') {
        result[key] = this.processDateFields(value);
      } 
      // 处理日期字段
      else if (typeof value === 'string' && 
              (key.toLowerCase().includes('time') || 
               key.toLowerCase().includes('date') || 
               key.toLowerCase().includes('at'))) {
        // 检查是否是ISO格式的日期字符串
        if (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/) || 
            value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)) {
          result[key] = this.formatISODate(value);
        }
      }
    }
    
    return result;
  },

  async request(url, method, data = null, options = {}) {
    const defaultOptions = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000
    };

    const token = localStorage.getItem('token');
    if (token) {
      defaultOptions.headers['Authorization'] = `Bearer ${token}`;
    }
    
    console.log('请求数据:', data);
    
    if (data instanceof FormData) {
      console.log("处理FormData数据");
      // 处理FormData，删除Content-Type让浏览器自动处理
      delete defaultOptions.headers['Content-Type'];
      defaultOptions.body = data;
    } else if (data && options.headers && options.headers['Content-Type'] === undefined) {
      console.log("处理自定义数据，不设置Content-Type");
      // 如果明确指定不设置Content-Type，直接使用数据
      defaultOptions.body = data;
    } else if (data) {
      console.log("处理JSON数据");
      // 默认JSON序列化
      defaultOptions.body = JSON.stringify(data);
    }

    const finalOptions = { ...defaultOptions, ...options };
    console.log('最终请求选项:', finalOptions);

    try {
      const response = await fetch(url, finalOptions);

      // 401：token 失效或未提供，统一清除登录态并跳转登录页
      if (response.status === 401) {
        if (this.message) {
          this.message.error('登录已过期，请重新登录');
        }
        localStorage.clear();
        sessionStorage.clear();
        if (this.router) {
          this.router.push('/login');
        }
        const authError = new Error('登录已过期');
        authError.isAuth = true;
        throw authError;
      }

      const res = await response.json();
      console.log('原始响应数据:', res);
      
      // 处理微信云接口返回的情况
      if (res.errcode === 0) {
        // 处理微信云接口返回的数据中的时间字段
        const processedRes = this.processDateFields(res);
        console.log('处理后的响应数据:', processedRes);
        return processedRes;  // 微信云接口直接返回完整响应
      }
      // 处理我们自己的接口返回的情况
      if (res.code === 0) {
        // 处理我们自己的接口返回的数据中的时间字段
        const processedRes = this.processDateFields(res);
        console.log('处理后的响应数据:', processedRes);
        return options.returnFullResponse ? processedRes : processedRes.data;  // 根据选项决定返回完整响应还是只返回data
      }
      throw new Error(res.errmsg || res.message || '请求失败');
    } catch (error) {
      console.error('请求错误:', error);

      // 401 已在 try 块内统一处理（弹消息+清登录态+跳登录），这里直接抛出避免重复弹错
      if (error.isAuth) {
        throw error;
      }

      if (error.message.includes('413')) {
        if (this.message) {
          this.message.error('文件太大，超出服务器允许的大小限制。请尝试上传更小的文件（小于5MB）。');
        }
      } else if (this.message) {
        this.message.error(error.message);
      }
      throw error;
    }
  },

  async get(url, options = {}) {
    return this.request(url, 'GET', null, options);
  },

  async post(url, data, options = {}) {
    return this.request(url, 'POST', data, options);
  },

  async put(url, data, options = {}) {
    return this.request(url, 'PUT', data, options);
  },

  async delete(url, options = {}) {
    return this.request(url, 'DELETE', null, options);
  },
};

export default fetchWrapper;
