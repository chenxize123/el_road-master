// Reuses the ICE settings from the deployed LiveTalking client.
export const RTC_CONFIG = {
        sdpSemantics: 'unified-plan',
        iceTransportPolicy: 'relay',
        iceServers: [
            { urls: ['stun:123.183.159.140:3478'] },
            {
                urls: 'turn:123.183.159.140:3478?transport=udp',
                username: 'hsapturn',
                credential: 'HsapTurn@2026'
            },
            {
                urls: 'turn:123.183.159.140:3478?transport=tcp',
                username: 'hsapturn',
                credential: 'HsapTurn@2026'
            }
        ]
    };

// video.html 在加载模块前配置服务地址。museum.html 默认仍使用同源接口。
const apiBase = String(globalThis.MUSEUM_API_BASE || '').replace(/\/+$/, '');
const endpoints = {
  offer: '/offer',
  open: '/session/open',
  reset: '/session/reset',
  chat: '/chat',
  interrupt: '/human_read_event',
  chatInterrupt: '/chat/interrupt',
  aliyunToken: '/getALiYunToken',
  readEvents: '/read_events',
  setAudioType: '/set_audiotype',
};

export const API = Object.freeze(Object.fromEntries(
  Object.entries(endpoints).map(([name, path]) => [name, apiBase + path]),
));
