import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import {test} from 'node:test'
const html=readFileSync(new URL('../public/digital-human/video.html',import.meta.url),'utf8')
const parser=html.slice(html.indexOf('function command('),html.indexOf('async function askQuestion'))
test('resume recognizes punctuation, polite forms and ASR accumulated activation',()=>{
 const c={};vm.createContext(c);vm.runInContext(parser+';globalThis.parse=command',c)
 for(const text of ['你继续','你继续。','你继续吧','请你继续','你继续讲课','你等一下。你继续。'])assert.equal(c.parse(text)?.kind,'resume',text)
 for(const text of ['继续教育是什么','你继续解释这个问题'])assert.equal(c.parse(text),null,text)
})
test('recognized resume message hides overlay and invokes course play',async()=>{
 const src=readFileSync(new URL('../src/components/common/InteractiveCourseVideo.vue',import.meta.url),'utf8')
 let code=src.match(/<script setup>([\s\S]*?)<\/script>/)[1].replace(/^import .*$/gm,'').replaceAll('import.meta.env.VITE_DIGITAL_HUMAN_API_BASE','undefined').replaceAll('import.meta.env.BASE_URL',"'/'")
 let plays=0;const contentWindow={postMessage(){}}
 const c={location:{origin:'http://localhost'},URL,URLSearchParams,setTimeout:()=>1,clearTimeout(){},ref:value=>({value}),computed:fn=>({get value(){return fn()}}),defineProps:()=>({src:'course.mp4'}),defineEmits(){},defineExpose(){},useUserStore:()=>({isAuthenticated:true,token:'test'}),watch(){},onMounted(){},onBeforeUnmount(){},window:{}}
 vm.createContext(c);vm.runInContext(code+';globalThis.api={enter,receive,frame,video,inQA}',c)
 c.api.video.value={pause(){},async play(){plays++}};c.api.frame.value={contentWindow};c.api.enter()
 c.api.receive({origin:'http://localhost',source:contentWindow,data:{dh:'trigger',kind:'resume'}})
 await Promise.resolve();assert.equal(plays,1);assert.equal(c.api.inQA.value,false)
})

test('expanded activation and exit phrases retain ordinary questions',()=>{
 const c={};vm.createContext(c);vm.runInContext(parser+';globalThis.parse=command',c)
 for(const text of ['恢复播放','返回课程','退出问答','结束对话','我明白了','不用回答了','没有问题了'])assert.equal(c.parse(text)?.kind,'resume',text)
 for(const text of ['打断一下','我有个问题','我想提问','进入问答','暂停播放'])assert.equal(c.parse(text)?.kind,'pause',text)
 assert.equal(c.parse('我有个问题，什么是电感？')?.rest,'什么是电感')
 for(const text of ['停止条件是什么','退出问答是什么意思','我明白了这个公式但是还有问题'])assert.equal(c.parse(text),null,text)
})
