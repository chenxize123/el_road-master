import {API} from './site-config.js';
import {diag} from './diagnostics.js';

function newId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID().replace(/-/g, '');
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map(value => value.toString(16).padStart(2, '0')).join('');
  return hex;
}

function pcm16(samples, sourceRate) {
  const ratio = sourceRate / 16000;
  const length = Math.max(1, Math.round(samples.length / ratio));
  const output = new Int16Array(length);
  for (let i = 0; i < length; i++) {
    const position = i * ratio;
    const before = Math.floor(position);
    const after = Math.min(before + 1, samples.length - 1);
    const value = samples[before] * (1 - (position - before)) + samples[after] * (position - before);
    const clamped = Math.max(-1, Math.min(1, value));
    output[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }
  return output.buffer;
}

export class MuseumASR {
  constructor(onPartial, onSentence, onStatus, onCommand = null) {
    this.onCommand = onCommand;
    this.onPartial = onPartial;
    this.onSentence = onSentence;
    this.onStatus = onStatus;
    this.recording = false;
    this.starting = null;
    this.stopping = false;
    this.socket = null;
    this.stream = null;
    this.audioContext = null;
    this.processor = null;
    this.source = null;
    this.taskId = null;
    this.appKey = null;
    this.transcriptionStarted = false;
    this.finalParts = [];
    this.interim = '';
    this.sentenceTimer = null;
    this.serverEvents = 0;
    this.resultEvents = 0;
    this.sentenceBegins = 0;
    this.lastInterimLogged = '';
  }

  async start() {
    if (this.recording) return;
    if (this.starting) return this.starting;
    this.starting = this._start();
    try { await this.starting; }
    finally { this.starting = null; }
  }

  async _start() {
    this.stopping = false;
    this.finalParts = [];
    this.interim = '';
    this.taskId = newId();
    this.appKey = null;
    this.transcriptionStarted = false;
    this.serverEvents = 0;
    this.resultEvents = 0;
    this.sentenceBegins = 0;
    this.lastInterimLogged = '';
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {channelCount: {ideal: 1}, echoCancellation: true, noiseSuppression: true, autoGainControl: true},
      });
      if (this.stopping) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      this.stream = stream;
      diag.info('ASR', '请求阿里云 Token');
      const response = await fetch(API.aliyunToken, {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: '{}',
      });
      diag.info('ASR', 'Token 接口响应', {http: response.status});
      const auth = await response.json();
      if (!response.ok || auth.code !== 0) throw new Error(auth.msg || '语音识别 Token 获取失败');
      if (this.stopping) return;
      this.appKey = auth.appKey;
      const inputTrack = this.stream.getAudioTracks()[0];
      console.log('[ASR input] 麦克风', { label: inputTrack.label, settings: inputTrack.getSettings() });
      inputTrack.onmute = () => console.warn('[ASR input] 麦克风暂时无数据');
      inputTrack.onunmute = () => console.log('[ASR input] 麦克风数据恢复');
      diag.info('ASR', '麦克风已打开', {tracks: this.stream.getAudioTracks().length});
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      try {
        this.audioContext = new AudioContextClass({sampleRate: 16000});
      } catch (error) {
        diag.warn('ASR', '浏览器未接受 16 kHz 音频上下文，改用实际采样率重采样', {name: error.name});
        this.audioContext = new AudioContextClass();
      }
      diag.info('ASR', '音频上下文已创建', {sampleRate: this.audioContext.sampleRate});
      const socket = new WebSocket(`wss://nls-gateway-cn-shanghai.aliyuncs.com/ws/v1?token=${encodeURIComponent(auth.token)}`);
      this.socket = socket;
      // Aliyun accepts audio only after TranscriptionStarted.
      await new Promise((resolve, reject) => {
        let started = false;
        const timeout = setTimeout(() => reject(new Error('语音识别启动超时')), 10000);
        const succeed = () => { started = true; this.transcriptionStarted = true; clearTimeout(timeout); diag.info('ASR', 'TranscriptionStarted'); resolve(); };
        const fail = error => { clearTimeout(timeout); diag.error('ASR', '启动失败', error); reject(error); };
        socket.onopen = () => {
          diag.info('ASR', 'WebSocket 已连接，发送 StartTranscription');
          socket.send(JSON.stringify({
          header: {appkey: auth.appKey, namespace: 'SpeechTranscriber',
                   name: 'StartTranscription', task_id: this.taskId, message_id: newId()},
          payload: {format: 'pcm', sample_rate: 16000, enable_intermediate_result: true,
                    enable_punctuation_prediction: true, enable_inverse_text_normalization: true},
          }));
        };
        socket.onerror = () => {
          if (!started) fail(new Error('语音识别 WebSocket 连接失败'));
          else console.warn('语音识别 WebSocket 错误');
        };
        socket.onmessage = event => {
          let message;
          try { message = JSON.parse(event.data); } catch { return; }
          this.serverEvents++;
          if (!started && message.header?.name === 'TranscriptionStarted') {
            diag.info('ASR', '服务端确认启动', {status: message.header?.status, task: message.header?.task_id});
            succeed();
          } else if (!started && message.header?.name === 'TaskFailed') {
            fail(new Error(this._failureText(message)));
          } else {
            this._onMessage(event);
          }
        };
        socket.onclose = event => {
          if (this.socket !== socket) return;
          const unexpected = !this.stopping;
          const detail = `语音识别连接已断开（WebSocket ${event.code}${event.reason ? `：${event.reason}` : ''}）`;
          diag.warn('ASR', 'WebSocket 关闭', {code: event.code, reason: event.reason || '', started});
          if (!started) fail(new Error(detail));
          if (unexpected && this.finalParts.length) this._commit();
          this._stopAudio();
          this.socket = null;
          if (unexpected && started) this.onStatus(detail);
        };
      });
      await this.audioContext.resume();
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.processor = this.audioContext.createScriptProcessor(2048, 1, 1);
      let audioPackets = 0, levelAt = performance.now(), energy = 0, count = 0, peak = 0;
      this.processor.onaudioprocess = event => {
        if (this.recording && socket.readyState === WebSocket.OPEN) {
          const samples = event.inputBuffer.getChannelData(0);
          for (const value of samples) { energy += value * value; peak = Math.max(peak, Math.abs(value)); }
          count += samples.length;
          if (performance.now() - levelAt >= 2000) {
            const rms = Math.sqrt(energy / Math.max(1, count));
            console.log('[ASR input] 音量', {
              rmsDb: Math.round(20 * Math.log10(Math.max(rms, 1e-7))),
              peakDb: Math.round(20 * Math.log10(Math.max(peak, 1e-7))),
              bufferedBytes: socket.bufferedAmount,
              context: this.audioContext.state,
            });
            energy = 0; count = 0; peak = 0; levelAt = performance.now();
          }
          socket.send(pcm16(samples, this.audioContext.sampleRate));
          audioPackets++;
          // 只在第一包打一条，确认麦克风确实在发送音频。
          // 原来每 40 包（约 5 秒）打一次带音量峰值的日志，会持续刷屏、
          // 且对排查没有帮助 —— 真正有价值的是下面的「实时转写」。
          if (audioPackets === 1) {
            diag.info('ASR', '麦克风已开始发送音频', {
              sampleRate: this.audioContext.sampleRate,
            });
          }
        }
      };
      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      this.recording = true;
      diag.info('ASR', '正在监听');
      this.onStatus('正在听');
    } catch (error) {
      diag.error('ASR', '连接或录音失败', error);
      this.stop();
      if (error?.name === 'NotFoundError' || error?.name === 'DevicesNotFoundError') {
        throw new Error('当前浏览器未检测到麦克风，请检查本机音频输入设备或远程桌面麦克风重定向');
      }
      if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
        throw new Error('浏览器未获麦克风权限，请在当前网页的站点设置中允许麦克风');
      }
      if (error?.name === 'NotReadableError') {
        throw new Error('麦克风已被其它程序占用，或系统无法读取该设备');
      }
      throw error;
    }
  }

  _failureText(message) {
    const status = message.header?.status;
    const detail = message.header?.status_text || message.payload?.status_text || '服务端未提供原因';
    return `语音识别失败（${status ?? '未知错误码'}）：${detail}`;
  }

  _onMessage(event) {
    let message;
    try { message = JSON.parse(event.data); } catch { return; }
    const name = message.header?.name;
    const result = String(message.payload?.result || '').trim();
    if (name === 'SentenceBegin') {
      clearTimeout(this.sentenceTimer);
      this.sentenceBegins++;
      diag.info('ASR', '服务端检测到语句开始', {index: message.payload?.index, status: message.header?.status});
    } else if (name === 'TranscriptionResultChanged' && result) {
      this.resultEvents++;
      // 把实时转写内容直接打到控制台：
      // 这是判断"是否真的识别出了文字"的唯一依据，也是打断触发的依据。
      // 只在文字发生变化时打印，避免同一句反复刷屏。
      if (result !== this.lastInterimLogged) {
        this.lastInterimLogged = result;
        diag.info('ASR', '实时转写', {text: result});
      }
      clearTimeout(this.sentenceTimer);
      this.interim = result;
      this.onPartial([...this.finalParts, result].join(''));
    } else if (name === 'SentenceEnd' && result) {
      diag.info('ASR', '识别到完整句', {characters: result.length});
      // Dispatch standalone commands before combining this sentence with a question.
      if (this.onCommand?.(result)) {
        clearTimeout(this.sentenceTimer);
        this.finalParts = [];
        this.interim = '';
        this.lastInterimLogged = '';
        return;
      }
      this.finalParts.push(result);
      this.interim = '';
      this.lastInterimLogged = '';
      this.onPartial(this.finalParts.join(''));
      clearTimeout(this.sentenceTimer);
      this.sentenceTimer = setTimeout(() => this._commit(), 1000);
    } else if (name === 'TranscriptionCompleted') {
      this._commit();
    } else if (name === 'TaskFailed') {
      const detail = this._failureText(message);
      diag.error('ASR', 'TaskFailed', {status: message.header?.status, detail, task: message.header?.task_id});
      this.onStatus(detail);
      this.stop();
    }
  }

  _commit() {
    clearTimeout(this.sentenceTimer);
    const text = this.finalParts.join('').trim();
    this.finalParts = [];
    this.interim = '';
    if (text) this.onSentence(text);
  }

  _stopAudio() {
    this.recording = false;
    this.processor?.disconnect();
    this.source?.disconnect();
    this.stream?.getTracks().forEach(track => track.stop());
    this.audioContext?.close().catch(() => {});
    this.processor = null;
    this.source = null;
    this.stream = null;
    this.audioContext = null;
  }

  stop() {
    this.stopping = true;
    clearTimeout(this.sentenceTimer);
    this.finalParts = [];
    this.interim = '';
    this._stopAudio();
    if (this.transcriptionStarted && this.socket?.readyState === WebSocket.OPEN) {
      diag.info('ASR', '发送 StopTranscription');
      this.socket.send(JSON.stringify({
        header: {appkey: this.appKey, namespace: 'SpeechTranscriber', name: 'StopTranscription',
                 task_id: this.taskId, message_id: newId()},
      }));
    }
    this.transcriptionStarted = false;
    this.socket?.close();
    this.socket = null;
  }
}
