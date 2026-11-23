import {API} from './site-config.js';
import {diag} from './diagnostics.js';
import {currentSessionKey, openSession} from './session.js';

export class MuseumChat {
  constructor(human) {
    this.human = human;
    this.controller = null;
    this.requestId = null;
    this.lastRequestId = null;
  }

  async ask(text, onChunk, providedRequestId = null) {
    if (this.controller) throw new Error('上一轮问答尚未结束');
    if (!this.human.sessionid) await this.human.connect();
    if (!currentSessionKey()) await openSession();
    const controller = new AbortController();
    this.controller = controller;
    const requestId = providedRequestId || globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    this.requestId = requestId;
    this.lastRequestId = requestId;
    diag.info('问答', '请求开始', {request: requestId.slice(0, 8), questionLength: text.length});
    try {
      const answer = await this._request(text, onChunk, controller, true, requestId);
      diag.info('问答', '回答结束', {answerLength: answer.length});
      return answer;
    } catch (error) {
      if (error.name === 'AbortError') diag.info('问答', '请求取消');
      else diag.error('问答', '请求失败', error);
      throw error;
    } finally {
      if (this.controller === controller) {
        this.controller = null;
        this.requestId = null;
      }
    }
  }

  async _request(text, onChunk, controller, mayRecover, requestId) {
    const startedAt = performance.now();
    const short = requestId.slice(0, 8);
    const secs = ms => `${((performance.now() - ms) / 1000).toFixed(2)}s`;
    const response = await fetch(API.chat, {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      signal: controller.signal,
      body: JSON.stringify({
        sessionid: this.human.sessionid,
        session_key: currentSessionKey(),
        user_text: text,
        request_id: requestId,
      }),
    });
    diag.info('问答', '/chat 响应', {http: response.status, request: short, 建连耗时: secs(startedAt)});
    if (response.status === 405) {
      throw new Error('服务器尚未加载新 /chat 路由，请同步 app.py 和 museum_gateway.py 后重启容器');
    }
    if (response.status === 410 && mayRecover) {
      const error = await response.json().catch(() => ({}));
      const detail = String(error.detail || '');
      // 410 有两个来源，两者都需要"换一套再重试一次"：
      //   1) Health1.1 业务会话过期（detail='会话已过期'）→ 换 session_key 即可
      //   2) LiveTalking 网关发现 WebRTC 会话已关闭（detail 含"连接"）→ 还要重连数字人
      // 原实现只精确匹配第 1 种的文案，第 2 种会直接抛错、界面卡死不再恢复。
      diag.warn('问答', '会话或数字人连接已失效，重建后重试', {detail});
      if (detail.includes('连接')) {
        try {
          await this.human.connect();
        } catch (reconnectError) {
          diag.error('问答', '重连数字人失败', reconnectError);
        }
      }
      await openSession(true);
      return this._request(text, onChunk, controller, false, requestId);
    }
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `问答请求失败：${response.status}`);
    }
    if (!response.body) throw new Error('浏览器无法读取流式回答');
    diag.info('问答', '开始接收流式回答', {request: short});
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let answer = '';
    let firstChunkAt = null;
    let chunkCount = 0;
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      if (firstChunkAt === null) {
        // 这一行是判断"有没有真流式"的关键：
        //   首字耗时 ≈ 总耗时，且分片数=1  → 内容是一次性涌出来的，不是流式
        //   首字小、分片多                → 真的在流式，慢是别的原因
        // 分片数还能暴露服务端与浏览器之间的缓冲：服务端日志说分片=40、
        // 这里显示分片=1，就说明中间有东西把流攒住了。
        firstChunkAt = performance.now();
        diag.info('问答', '首字到达', {首字耗时: secs(startedAt), 首片字节: value.length});
      }
      chunkCount++;
      const chunk = decoder.decode(value, {stream: true});
      answer += chunk;
      onChunk(answer);
    }
    answer += decoder.decode();
    onChunk(answer);
    diag.info('问答', '回答接收完毕', {
      总耗时: secs(startedAt), 分片数: chunkCount, 字符数: answer.length,
      流式: chunkCount > 1 ? '是' : '否（一次性返回）',
    });
    if (response.headers.get('X-Museum-Session-Reset') === '1') await openSession(true);
    if (!answer.trim()) {
      diag.error('问答', '流式回答为空', {request: requestId.slice(0, 8)});
      throw new Error('问答服务没有返回内容，请查看服务端该请求的日志');
    }
    return answer;
  }

  async interrupt({force = false} = {}) {
    if (!this.controller && !force) return;
    const requestId = this.requestId || this.lastRequestId;
    diag.info('问答', '打断请求', {
      force, active: Boolean(this.controller), request: requestId?.slice(0, 8) || null,
    });
    this.controller?.abort();
    this.controller = null;
    this.requestId = null;
    if (!this.human.sessionid) return;
    const response = await fetch(API.chatInterrupt, {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        sessionid: this.human.sessionid,
        session_key: currentSessionKey(),
        request_id: requestId || '',
      }),
    });
    diag.info('问答', '/chat/interrupt 响应', {
      http: response.status, request: requestId?.slice(0, 8) || null,
    });
    if (response.status === 404 || response.status === 405) {
      throw new Error('服务器尚未加载 /chat/interrupt，请同步 app.py 和 museum_gateway.py 后重启容器');
    }
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `打断问答失败：${response.status}`);
    }
  }
}
