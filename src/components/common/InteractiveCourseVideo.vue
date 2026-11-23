<template>
  <section class="interactive-course-video">
    <div ref="stage" class="interactive-stage">
      <video ref="video" :src="src" playsinline preload="metadata" @error="$emit('error', $event)" @loadedmetadata="metadata" @timeupdate="updateTime" @play="playing = true" @pause="playing = false" @ended="playing = false" />
      <div v-if="frameUrl" class="human-region" :class="{ visible: inQA || activation }">
        <iframe ref="frame" :src="frameUrl" title="课程数字人问答" allow="autoplay; microphone; fullscreen" />
      </div>
    </div>
    <div class="player-actions">
      <button type="button" @click="togglePlayback">{{ playing ? '暂停' : '播放' }}</button>
      <input type="range" aria-label="视频进度" min="0" :max="duration || 1" step="0.1" :value="time" @input="seek" />
      <span>{{ format(time) }} / {{ format(duration) }}</span>
      <label><input v-model="muted" type="checkbox" @change="video.muted = muted" />静音</label>
      <button type="button" @click="fullscreen">全屏</button>
    </div>
    <div v-if="allowed" class="connection-info" role="status">
      <span class="connection-dot" :class="{ connected }" aria-hidden="true"></span>
      <span>{{ connected ? '已连接' : connectionTimedOut ? '连接失败' : '连接中' }}</span>
      <span class="mic-state">{{ micOn ? '语音已开启' : micHint }}</span>
    </div>
    <p v-if="connectionTimedOut" class="connection-warning" role="alert">连接失败，请在校园网环境下使用。</p>
    <p v-if="!allowed">请先登录后使用数字人交互。</p>
    <p v-if="inQA && dialogueState === 'listening'" class="speak-indicator" role="status"><span aria-hidden="true">●</span> 你请说</p>
    <p v-if="visibleError" role="alert">{{ visibleError }}</p>
    <p v-else-if="/失败|错误|断开|权限|请点击|不支持|HTTPS|麦克风/.test(status)" role="status">{{ status }}</p>
    <p v-if="answer" class="answer">数字人：{{ answer }}</p>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useUserStore } from '@/store'
const props = defineProps({ src: { type: String, required: true } })
defineEmits(['error'])
const store = useUserStore()
const allowed = computed(() => store.isAuthenticated && !!store.token)
const video = ref(null), frame = ref(null), stage = ref(null)
const connected = ref(false), micOn = ref(false)
const micHint = ref('正在初始化语音')
const visibleError = ref('')
const connectionTimedOut = ref(false)
let connectionTimer = null
function clearConnectionTimer() { clearTimeout(connectionTimer); connectionTimer = null }
function startConnectionTimer() {
  clearConnectionTimer(); connectionTimedOut.value = false
  connectionTimer = setTimeout(() => { connectionTimer = null; if (!connected.value) connectionTimedOut.value = true }, 20000)
}
const frameUrl = ref(''), playing = ref(false), inQA = ref(false), activation = ref(false)
const ready = ref(false), duration = ref(0), time = ref(0), muted = ref(false)
const dialogueState = ref('idle')
const answer = ref('')
const status = ref('正在自动连接语音；说“你等一下”提问，说“你继续”恢复。')
let resumeTimer = null
function isResumeCommand(text) {
  const compact = String(text || '').replace(/[\s，。！？、；：,.!?;:"“”‘’]/g, '').replace(/^(?:(?:老师|好的|那么|现在|可以|嗯|好|那|请))+/, '').replace(/[吧啊呀哦呢]+$/, '')
  return /^(?:你|您)?(?:请)?(?:继续(?:讲课|上课|播放(?:课程|视频)?|讲|说)?|接着(?:讲|说|播放)?|恢复(?:播放|课程|讲课)|返回课程|回到课程|退出(?:问答|对话)|结束(?:问答|对话)|不用回答了|我明白了|没有问题了)$/.test(compact)
}
function handleTranscript(d) {
  console.log('[ASR]', d.final ? '最终结果' : '实时结果', d.text || '')
  clearTimeout(resumeTimer)
  if (!inQA.value || !isResumeCommand(d.text)) return
  if (d.final) resume(); else if (/^(?:你|您)继续[。！!]?$/u.test(String(d.text || '').trim())) resumeTimer = setTimeout(() => { if (inQA.value) resume() }, 500)
}
const origin = location.origin
function post(data) { if (frame.value?.contentWindow) frame.value.contentWindow.postMessage(data, origin) }
function initialize() {
  if (!allowed.value) return false
  if (!frameUrl.value) {
    const api = new URL(import.meta.env.VITE_DIGITAL_HUMAN_API_BASE || 'http://222.30.145.22:8010', origin).href.replace(/\/$/, '')
    const params = new URLSearchParams({ server: api, parentOrigin: origin, mic: '1', embedded: '1', fit: 'cover', v: 'course-voice-1' })
    frameUrl.value = `${import.meta.env.BASE_URL}digital-human/video.html?${params}`
    status.value = '正在连接数字人，请允许麦克风。'
    startConnectionTimer()
  }
  return true
}
function enter(notify = true) {
  if (!initialize()) return
  inQA.value = true; dialogueState.value = 'listening'; activation.value = false; video.value?.pause()
  if (notify && ready.value) { post({ dh: 'enter' }); post({ dh: 'unmute' }) }
}
async function resume(notify = true) {
  if (!inQA.value) return
  clearTimeout(resumeTimer)
  console.log('[DH resume] 恢复课程', { notify, paused: video.value?.paused })
  dialogueState.value = 'idle'; answer.value = ''; inQA.value = false; activation.value = false
  if (notify) post({ dh: 'exit' })
  try { await video.value?.play(); console.log('[DH resume] 播放结果', { paused: video.value?.paused }) } catch (error) { console.error('[DH resume] 播放失败', error); status.value = '请点击播放继续课程。' }
}
function receive(event) {
  if (!allowed.value || event.origin !== origin || event.source !== frame.value?.contentWindow) return
  const d = event.data
  if (!d || typeof d !== 'object') return
  if (d.dh === 'mic' && !d.on) { micOn.value = false; micHint.value = d.message || '语音未开启'; if (d.error) visibleError.value = d.message; return }
  if (d.dh === 'ready') {
    ready.value = true
    status.value = '数字人已连接。'
  } else if (d.dh === 'trigger') {
    if (d.kind === 'pause') enter(false)
    if (d.kind === 'resume') resume(false)
  } else if (d.dh === 'activation') activation.value = true
  else if (d.dh === 'mic' && d.on) { micOn.value = true; micHint.value = '语音已开启'; visibleError.value = ''; activation.value = false; status.value = '正在听：说“你等一下”进入问答。' }
  else if (d.dh === 'transcript') handleTranscript(d)
  else if (d.dh === 'answer' && inQA.value) answer.value = d.text || ''
  else if (d.dh === 'error' || d.dh === 'status') {
    status.value = d.message || ''
    if (d.dh === 'error') visibleError.value = d.message || '数字人服务异常'
    if (d.message === '数字人媒体已连接') { connected.value = true; connectionTimedOut.value = false; clearConnectionTimer() }
    if (/^数字人.*(?:断开|连接失败)/.test(d.message || '')) {
      if (connected.value) startConnectionTimer()
      connected.value = false
    }
  }
  else if (d.dh === 'state') dialogueState.value = d.state
}
function reset() {
  visibleError.value = ''; micHint.value = '正在初始化语音'
  clearTimeout(resumeTimer)
  clearConnectionTimer(); connectionTimedOut.value = false
  post({ dh: 'exit' }); connected.value = false; micOn.value = false; frameUrl.value = ''; ready.value = false; inQA.value = false
  activation.value = false; dialogueState.value = 'idle'; answer.value = ''
  video.value?.pause(); playing.value = false; time.value = 0; duration.value = 0
}
function metadata() { duration.value = Number.isFinite(video.value.duration) ? video.value.duration : 0; stage.value.style.aspectRatio = `${video.value.videoWidth || 16}/${video.value.videoHeight || 9}` }
function updateTime() { time.value = video.value?.currentTime || 0 }
function seek(e) { if (video.value) video.value.currentTime = Number(e.target.value) }
async function togglePlayback() { if (inQA.value) return; if (playing.value) video.value?.pause(); else { try { await video.value?.play() } catch { status.value = '视频播放失败，请重试。' } } }
function format(t) { return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}` }
async function fullscreen() { try { if (document.fullscreenElement) await document.exitFullscreen(); else await stage.value.requestFullscreen() } catch { status.value = '当前浏览器不支持全屏。' } }
watch(() => props.src, () => { reset(); initialize() })
watch(allowed, value => { if (!value) reset(); else initialize() })
onMounted(() => { window.addEventListener('message', receive); initialize() })
onBeforeUnmount(() => { window.removeEventListener('message', receive); reset() })
defineExpose({ pause: () => video.value?.pause() })
</script>

<style scoped>
.interactive-course-video{width:100%;color:inherit}.interactive-stage{position:relative;width:100%;aspect-ratio:16/9;background:#000;overflow:hidden}.interactive-stage>video{display:block;width:100%;height:100%;object-fit:contain}.human-region{position:absolute;inset:0 auto 0 0;width:30%;visibility:hidden;background:#000}.human-region.visible{visibility:visible}.human-region iframe{display:block;width:100%;height:100%;border:0}.player-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 0}.player-actions>input[type=range]{flex:1;min-width:100px}button{cursor:pointer;padding:6px 10px}button:disabled{cursor:default;opacity:.5}p{margin:6px 0;font-size:13px;overflow-wrap:anywhere}.answer{white-space:pre-wrap}.interactive-stage:fullscreen{aspect-ratio:auto}

.interactive-course-video{color:#e6edf7;background:#111b2c;border-radius:10px;overflow:hidden;padding-bottom:12px;box-sizing:border-box}.player-actions{padding:10px 14px}.player-actions{background:#0b1220}.interactive-course-video button{font:inherit;font-size:13px;border:1px solid #465a77;border-radius:6px;background:#243c60;color:#f2f6ff;padding:7px 12px}.interactive-course-video input:not([type=range]):not([type=checkbox]){font:inherit;border:1px solid #465a77;border-radius:6px;padding:7px;background:#18263c;color:#f2f6ff}.interactive-course-video p{padding:0 14px;color:#c6d5eb}.answer{max-height:160px;overflow:auto}.player-actions span{font-size:12px;white-space:nowrap}
.connection-info{display:flex;align-items:center;gap:8px;padding:12px 14px;color:#c6d5eb;font-size:13px}.connection-dot{width:9px;height:9px;border-radius:50%;background:#eab308;flex-shrink:0}.connection-dot.connected{background:#22c55e;box-shadow:0 0 0 3px #22c55e20}.mic-state{margin-left:8px;color:#a6b7ce}
.speak-indicator{display:flex;align-items:center;gap:8px;font-weight:600}.speak-indicator span{color:#22c55e}
.interactive-course-video .connection-warning{color:#fbbf24}
</style>
