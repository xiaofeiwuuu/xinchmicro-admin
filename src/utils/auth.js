// 登录态集中管理：令牌与用户信息只在这里读写，页面和请求层不要再直接操作 localStorage。
const TOKEN_KEY = 'token';
const USER_KEY = 'userInfo';
// 本应用写入过的全部键。退出/过期时只删这几个，不能 clear() 整个存储（同源下可能还有别的数据）
const OWN_KEYS = [TOKEN_KEY, USER_KEY, 'username'];

const safe = (fn, fallback) => { try { return fn(); } catch (e) { return fallback; } };

export function getToken() {
  return safe(() => localStorage.getItem(TOKEN_KEY), null);
}

export function getUserInfo() {
  return safe(() => JSON.parse(localStorage.getItem(USER_KEY) || '{}'), {}) || {};
}

export function saveAuth(token, userInfo) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(userInfo));
}

export function clearAuth() {
  safe(() => OWN_KEYS.forEach(k => localStorage.removeItem(k)));
  safe(() => OWN_KEYS.forEach(k => sessionStorage.removeItem(k)));
}

// 读取 JWT 的过期时间（毫秒时间戳）；不是合法 JWT 或没有 exp 返回 null
export function getTokenExpiry(token) {
  return safe(() => {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(atob(payload).split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''));
    const exp = JSON.parse(json).exp;
    return typeof exp === 'number' ? exp * 1000 : null;
  }, null);
}

// 令牌是否可用：存在、格式正确、没有过期。
// 这只是前端的快速判断（避免带着过期令牌先进页面再被踢出），真正的校验仍在服务端。
export function isLoggedIn(now = Date.now()) {
  const token = getToken();
  if (!token) return false;
  const exp = getTokenExpiry(token);
  return exp === null ? false : exp > now;
}

export function isMainUser() {
  return getUserInfo().userType === 'main';
}

// ---- 功能权限（服务端是 utils/permissions.js 的功能目录；这里只用来显示菜单和拦路由，真正的权限在服务端校验）----
// 登录时和页面打开时（刷新）存进用户信息。主账号是 '*'；子账号是功能 key 数组；取不到时按「没有任何权限」处理，宁可少显示
export function getPermissions() {
  const info = getUserInfo();
  if (info.userType === 'main') return '*';
  return Array.isArray(info.permissions) ? info.permissions : [];
}

export function can(key) {
  const p = getPermissions();
  return p === '*' || p.includes(key);
}

// 用 /users/me 的结果更新本地保存的用户信息（令牌不变）
export function updateUserInfo(patch) {
  safe(() => localStorage.setItem(USER_KEY, JSON.stringify({ ...getUserInfo(), ...patch })));
}
