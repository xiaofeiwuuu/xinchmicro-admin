const fetchWrapper = {
  init(message, router) {
    this.message = message;
    this.router = router;
  },

  async request(url, method, data = null, options = {}) {
    const defaultOptions = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const token = localStorage.getItem('token');
    if (token) {
      defaultOptions.headers['Authorization'] = JSON.parse(token);
    }

    if (data) {
      defaultOptions.body = JSON.stringify(data);
    }

    const finalOptions = { ...defaultOptions, ...options };

    try {
      const response = await fetch(url, finalOptions);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const res = await response.json();
      if (res.status === 200) {
        return res.data;
      } else {
        throw new Error(res.message);
      }
    } catch (error) {
      if (error.message.includes('401')) {
        this.message.error('登录已过期，请重新登录。');
        setTimeout(() => {
          localStorage.removeItem('token');
          this.router.push('/sign-in');
        }, 1000);
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

  async delete(url, options = {}) {
    return this.request(url, 'DELETE', null, options);
  },
};

export default fetchWrapper;
