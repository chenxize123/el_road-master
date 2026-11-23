import {diag} from './diagnostics.js';
import {API} from './site-config.js';

export class SpokenSubtitles {
  constructor(onSentence) {
    this.onSentence = onSentence;
    this.source = null;
    this.sessionid = null;
    this.turnId = null;
    this.currentText = '';
    this.isSpeaking = false;
  }

  connect(sessionid) {
    if (this.source && this.sessionid === sessionid) return;
    this.disconnect();
    if (sessionid == null) return;
    this.sessionid = sessionid;
    this.source = new EventSource(`${API.readEvents}?sessionid=${encodeURIComponent(sessionid)}`);
    this.source.onopen = () => diag.info('字幕', '播报事件已连接');
    this.source.onerror = () => diag.warn('字幕', '播报事件断开，浏览器将自动重连');
    this.source.onmessage = event => {
      let data;
      try { data = JSON.parse(event.data); } catch { return; }
      if (data.read_kind !== 'museum' || !this.turnId ||
          !String(data.read_id || '').startsWith(`museum_${this.turnId}_`)) return;
      if (data.status === 'start') {
        const text = String(data.subtitle_text || data.text || '').trim();
        if (text && (text !== this.currentText || !this.isSpeaking)) {
          this.currentText = text;
          this.isSpeaking = true;
          this.onSentence(text, true);
          diag.info('字幕', '开始播报当前句', {characters: text.length});
        }
      } else if (data.status === 'end' || data.status === 'interrupted') {
        if (this.isSpeaking) {
          this.isSpeaking = false;
          this.onSentence(this.currentText, false);
        }
      }
    };
  }

  setTurn(turnId) {
    this.turnId = turnId || null;
    this.currentText = '';
    this.isSpeaking = false;
  }

  disconnect() {
    this.source?.close();
    this.source = null;
    this.sessionid = null;
    this.setTurn(null);
  }
}
