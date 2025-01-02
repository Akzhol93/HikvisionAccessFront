// main.js
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import axios from 'axios'

// 1) Импортируем плагин
import VueTheMask from 'vue-the-mask'

// Импортируем наш api и метод initApiWithToken
import  { initApiWithToken } from './api'

const app = createApp(App)

// Инициализируем токен, если он есть в localStorage
initApiWithToken()

// 2) Применяем плагин
app.use(VueTheMask)

// 3) Подключаем остальные плагины/роутеры
app.use(router)

// Пример: подтянуть токен из localStorage:
const token = localStorage.getItem('accessToken')
if (token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
}

// 4) Монтируем приложение
app.mount('#app')
