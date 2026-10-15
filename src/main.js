import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import Antd from 'ant-design-vue'
import pinia from './store'
import 'ant-design-vue/dist/reset.css'
import './styles/global.css'

const app = createApp(App)

app.use(router)
app.use(Antd)
app.use(pinia)

// 全局挂载Pinia Store
app.config.globalProperties.$pinia = pinia

app.mount('#app')