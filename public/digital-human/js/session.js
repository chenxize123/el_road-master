import {API} from './site-config.js';
import {diag} from './diagnostics.js';

// 通用问答启用独立会话，刷新时不续用旧展厅对话。
const STORAGE_KEY = 'digital_human_general_session_key_v1';
let sessionKey = sessionStorage.getItem(STORAGE_KEY) || '';
let pendingOpen = null;

export function currentSessionKey() {
  return sessionKey;
}

export async function openSession(forceNew = false) {
  if (pendingOpen) {
    const result = await pendingOpen;
    if (!forceNew) return result;
  }
  const task = (async () => {
    const previous = forceNew ? '' : sessionKey;
    diag.info('会话', '创建或恢复请求', {hasStoredKey: Boolean(previous)});
    const response = await fetch(API.open, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({session_key: previous || null}),
    });
    diag.info('会话', '创建或恢复响应', {http: response.status});
    if (!response.ok) throw new Error(`会话服务错误：${response.status}`);
    const result = await response.json();
    sessionKey = result.session_key;
    sessionStorage.setItem(STORAGE_KEY, sessionKey);
    diag.info('会话', '已就绪');
    return result;
  })();
  pendingOpen = task;
  try { return await task; }
  catch (error) { diag.error('会话', '创建或恢复失败', error); throw error; }
  finally { if (pendingOpen === task) pendingOpen = null; }
}

export async function resetSession() {
  if (pendingOpen) await pendingOpen;
  if (sessionKey) {
    diag.info('会话', '重置请求');
    const response = await fetch(API.reset, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({session_key: sessionKey}),
    });
    diag.info('会话', '重置响应', {http: response.status});
    if (!response.ok) throw new Error(`重置会话失败：${response.status}`);
  }
  sessionKey = '';
  sessionStorage.removeItem(STORAGE_KEY);
  return openSession(true);
}
