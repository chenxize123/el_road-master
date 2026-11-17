import {API, RTC_CONFIG} from './site-config.js';
import {diag} from './diagnostics.js';

export class DigitalHuman {
  constructor(video, audio, onState) {
    this.video = video;
    this.audio = audio;
    this.onState = onState;
    this.pc = null;
    this.sessionid = null;
  }

  connect() {
    if (this.connecting) return this.connecting;
    const task = this._connect();
    this.connecting = task;
    task.then(() => { if (this.connecting === task) this.connecting = null; },
              () => { if (this.connecting === task) this.connecting = null; });
    return task;
  }

  async _connect() {
    this.disconnect();
    this.onState('正在连接数字人…');
    diag.info('WebRTC', '开始连接');
    const pc = new RTCPeerConnection(RTC_CONFIG);
    this.pc = pc;
    const checkCurrent = () => {
      if (this.pc !== pc || pc.signalingState === 'closed') {
        throw new DOMException('连接已取消', 'AbortError');
      }
    };
    pc.addTransceiver('video', {direction: 'recvonly'});
    pc.addTransceiver('audio', {direction: 'recvonly'});
    pc.ontrack = event => {
      diag.info('WebRTC', '收到媒体轨道', {kind: event.track.kind});
      const element = event.track.kind === 'video' ? this.video : this.audio;
      element.srcObject = event.streams[0];
      element.play().catch(() => this.onState('请点击页面以允许音视频播放'));
    };
    pc.oniceconnectionstatechange = () => diag.info('WebRTC', 'ICE 状态', {state: pc.iceConnectionState});
    pc.onconnectionstatechange = () => {
      diag.info('WebRTC', '连接状态', {state: pc.connectionState});
      if (pc !== this.pc) return;

      if (pc.connectionState === 'connected') {
        this.onState('数字人媒体已连接');
        if (this.graceTimer) { clearTimeout(this.graceTimer); this.graceTimer = null; }
        return;
      }
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.sessionid = null;
        this.onState('数字人连接已断开，请重新连接');
        return;
      }
      // disconnected：网络抖动的常见状态，ICE 多数会自己恢复。
      // 给一段观察期，仍然没连上才按断开上报，避免无谓地重建整个会话
      // （重建会换 sessionid，还会让数字人重新加载形象）。
      if (pc.connectionState === 'disconnected') {
        if (this.graceTimer) return;
        diag.warn('WebRTC', '连接进入 disconnected，观察 5 秒看是否自愈');
        this.graceTimer = setTimeout(() => {
          this.graceTimer = null;
          if (pc === this.pc && pc.connectionState !== 'connected') {
            diag.warn('WebRTC', '5 秒内未自愈，按断开处理', {state: pc.connectionState});
            this.sessionid = null;
            this.onState('数字人连接已断开，请重新连接');
          } else {
            diag.info('WebRTC', 'disconnected 已自愈');
          }
        }, 5000);
      }
    };
    try {
      const offer = await pc.createOffer();
      checkCurrent();
      await pc.setLocalDescription(offer);
      await Promise.race([
        new Promise(resolve => {
          if (pc.iceGatheringState === 'complete') return resolve();
          pc.addEventListener('icegatheringstatechange', () => {
            if (pc.iceGatheringState === 'complete') resolve();
          });
        }),
        new Promise(resolve => setTimeout(resolve, 2000)),
      ]);
      checkCurrent();
      const response = await fetch(API.offer, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({sdp: pc.localDescription.sdp, type: pc.localDescription.type}),
      });
      diag.info('WebRTC', '/offer 响应', {http: response.status});
      if (!response.ok) throw new Error(`数字人连接失败：${response.status}`);
      const answer = await response.json();
      checkCurrent();
      await pc.setRemoteDescription({sdp: answer.sdp, type: answer.type});
      checkCurrent();
      this.sessionid = answer.sessionid;
      this.onState('数字人已连接');
      diag.info('WebRTC', '远端描述已设置');
      return this.sessionid;
    } catch (error) {
      if (error.name !== 'AbortError') diag.error('WebRTC', '连接失败', error);
      if (this.pc === pc) this.disconnect();
      throw error;
    }
  }

  /**
   * 切换动作状态（对应服务端 --customvideo_config 里定义的 audiotype）。
   * 2 = 待机自定义帧；TTS 音频一入队就自动走主形象，所以设一次即可，不用来回切。
   */
  async setAudioType(audiotype, reinit = true) {
    if (!this.sessionid) return;
    const response = await fetch(API.setAudioType, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({sessionid: this.sessionid, audiotype, reinit}),
    });
    if (!response.ok) throw new Error(`设置待机动作失败：${response.status}`);
    diag.info('WebRTC', '动作状态已切换', {audiotype});
  }

  disconnect() {
    if (this.graceTimer) { clearTimeout(this.graceTimer); this.graceTimer = null; }
    const previous = this.pc;
    this.pc = null;
    this.connecting = null;
    if (previous) {
      previous.onconnectionstatechange = null;
      previous.oniceconnectionstatechange = null;
      previous.ontrack = null;
      previous.close();
    }
    this.sessionid = null;
    this.video.srcObject = null;
    this.audio.srcObject = null;
  }
}
