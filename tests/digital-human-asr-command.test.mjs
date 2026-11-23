import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {test} from 'node:test'
let source=readFileSync(new URL('../public/digital-human/js/asr.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'')
source='const diag={info(){},error(){}};'+source
const {MuseumASR}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))
test('resume sentence bypasses question accumulation and cancels pending commit',()=>{
 const submitted=[],commands=[]
 const asr=new MuseumASR(()=>{},t=>submitted.push(t),()=>{},t=>{if(t==='你继续。'){commands.push(t);return true}return false})
 asr.finalParts=['前面尚未提交的问题。'];asr.sentenceTimer=setTimeout(()=>asr._commit(),1000)
 asr._onMessage({data:JSON.stringify({header:{name:'SentenceEnd'},payload:{result:'你继续。'}})})
 asr._commit();assert.deepEqual(commands,['你继续。']);assert.deepEqual(submitted,[]);assert.deepEqual(asr.finalParts,[])
})

test('microphone permission is requested before contacting token service',async()=>{
 const calls=[];const originalNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator');const originalFetch=globalThis.fetch
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{async getUserMedia(){calls.push('permission');throw new DOMException('denied','NotAllowedError')}}}})
 globalThis.fetch=async()=>{calls.push('fetch');throw new Error('unexpected request')}
 try {const asr=new MuseumASR(()=>{},()=>{},()=>{});await assert.rejects(asr.start(),/麦克风权限/);assert.deepEqual(calls,['permission'])}
 finally {globalThis.fetch=originalFetch;if(originalNavigator)Object.defineProperty(globalThis,'navigator',originalNavigator);else delete globalThis.navigator}
})
