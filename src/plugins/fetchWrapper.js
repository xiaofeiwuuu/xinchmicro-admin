// 单个请求的超时时间（毫秒），来自 .env 的 VUE_APP_REQUEST_TIMEOUT；
// 取不到有效数值时用 30 秒，避免超时时间变成 0 导致请求立刻被中止
import { getToken, clearAuth } from '@/utils/auth';

const DEFAULT_TIMEOUT = Number(process.env.VUE_APP_REQUEST_TIMEOUT) || 30000;

const pad2 = (n) => String(n).padStart(2, '0');

const fetchWrapper = {
  init(message, router) {
    this.message = message;
    this.router = router;
  },

  // 把服务端返回的 UTC 时间（ISO 格式）转成北京时间 "YYYY-MM-DD HH:mm:ss"。
  // 北京时间 = UTC + 8 小时：先整体平移时间戳，再取各个分量，日期、月份、年份的进位才会正确
  // （只给小时加 8 的话，北京时间 00:00-08:00 的记录会显示成前一天）
  formatISODate(dateStr) {
    if (!dateStr) return dateStr;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    const beijing = new Date(date.getTime() + 8 * 60 * 60 * 1000);
    return (
      `${beijing.getUTCFullYear()}-${pad2(beijing.getUTCMonth() + 1)}-${pad2(beijing.getUTCDate())} ` +
      `${pad2(beijing.getUTCHours())}:${pad2(beijing.getUTCMinutes())}:${pad2(beijing.getUTCSeconds())}`
    );
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
        // 只转换带时区标记（Z 或 +08:00 之类）的 ISO 时间；没有时区的字符串无法确定是哪个时区，原样保留
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/.test(value)) {
          result[key] = this.formatISODate(value);
        }
      }
    }

    return result;
  },

  // 弹出错误提示，并给错误打上 notified 标记：
  // 页面的 catch 里再提示前请用 utils/notify.js 的 notifyError，它会跳过已经提示过的错误，避免用户看到两条
  notify(error, text) {
    if (this.message) this.message.error(text || error.message);
    error.notified = true;
    return error;
  },

  async request(url, method, data = null, options = {}) {
    // timeout / returnFullResponse 是本封装自己的选项，不能传给 fetch
    const { timeout = DEFAULT_TIMEOUT, returnFullResponse, ...fetchOptions } = options;

    const defaultOptions = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const token = getToken();
    if (token) {
      defaultOptions.headers['Authorization'] = `Bearer ${token}`;
    }

    if (data instanceof FormData) {
      // 处理FormData，删除Content-Type让浏览器自动处理
      delete defaultOptions.headers['Content-Type'];
      defaultOptions.body = data;
    } else if (data && fetchOptions.headers && fetchOptions.headers['Content-Type'] === undefined) {
      // 如果明确指定不设置Content-Type，直接使用数据
      defaultOptions.body = data;
    } else if (data) {
      // 默认JSON序列化
      defaultOptions.body = JSON.stringify(data);
    }

    // fetch 本身不支持超时，用 AbortController 实现
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeout);

    try {
      let response;
      try {
        response = await fetch(url, { ...defaultOptions, ...fetchOptions, signal: controller.signal });
      } catch (error) {
        if (timedOut) throw new Error('请求超时，请检查网络后重试');
        // 断网、服务不可达时浏览器抛出的是英文的 "Failed to fetch"，换成中文提示
        if (error instanceof TypeError) throw new Error('网络连接失败，请检查网络后重试');
        throw error;
      }

      // 带着令牌的请求返回 401：令牌失效，统一清除登录态并跳转登录页。
      // 没带令牌（比如登录时密码错误）的 401 是普通业务错误，要显示服务端给的原因
      if (response.status === 401 && token) {
        clearAuth();
        if (this.router) {
          this.router.push('/login');
        }
        const authError = new Error('登录已过期');
        authError.isAuth = true;
        throw this.notify(authError, '登录已过期，请重新登录');
      }

      let res;
      try {
        res = await response.json();
      } catch (parseError) {
        throw new Error(`服务器返回了无法识别的内容（HTTP ${response.status}）`);
      }

      // 处理微信云接口返回的情况
      if (res.errcode === 0) {
        // 微信云接口直接返回完整响应
        return this.processDateFields(res);
      }
      // 处理我们自己的接口返回的情况
      if (res.code === 0) {
        const processedRes = this.processDateFields(res);
        // 根据选项决定返回完整响应还是只返回data
        return returnFullResponse ? processedRes : processedRes.data;
      }
      const failure = new Error(res.errmsg || res.message || '请求失败');
      if (Array.isArray(res.errors)) failure.errors = res.errors; // 批量接口指出的逐行错误
      if (res.errorCode) failure.errorCode = res.errorCode;
      throw failure;
    } catch (error) {
      // 401 已在上面统一提示过，直接抛出避免重复弹错
      if (error.notified) {
        throw error;
      }

      if (error.message.includes('413')) {
        throw this.notify(error, '文件太大，超出服务器允许的大小限制。请尝试上传更小的文件。');
      }
      throw this.notify(error);
    } finally {
      clearTimeout(timer);
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
