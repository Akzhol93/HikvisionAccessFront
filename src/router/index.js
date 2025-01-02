import { createRouter, createWebHistory } from 'vue-router'
import LoginPage from '@/components/LoginPage.vue'
import RegisterPage from '@/components/RegisterPage.vue'
import MainPage from '@/components/MainPage.vue'
import ForgotPasswordPage from '@/components/ForgotPasswordPage.vue'
import PasswordResetConfirm from '@/components/PasswordResetConfirm.vue'
import DeviceList from '@/components/DeviceList.vue'
import ReportBI from '@/components/ReportBI.vue'

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'LoginPage',
    component: LoginPage
  },
  {
    path: '/register',
    name: 'RegisterPage',
    component: RegisterPage
  },
  {
    path: '/forgot-password',
    name: 'ForgotPasswordPage',
    component: ForgotPasswordPage
  },
  {
    path: '/password-reset-confirm',
    name: 'PasswordResetConfirm',
    component: PasswordResetConfirm
  },
  {
    path: '/main',
    name: 'MainPage',
    component: MainPage,
    // Добавляем флажок, что маршрут требует авторизации
    meta: { requiresAuth: true } 
  },
  {
    path: '/device-list',
    name: 'DeviceList',
    component: DeviceList,
    // Добавляем флажок, что маршрут требует авторизации
    meta: { requiresAuth: true } 
  },
  {
    path: '/access-events',
    name: 'ReportBI',
    component: ReportBI,
    // Добавляем флажок, что маршрут требует авторизации
    meta: { requiresAuth: true } 
  },

]

const router = createRouter({
  history: createWebHistory(),
  routes
})

/**
 * Глобальный перехват (guard):
 * - Проверяем, требует ли роут авторизации (requiresAuth).
 * - Если да, проверяем наличие токена (или другой признак авторизации).
 */
router.beforeEach((to, from, next) => {
  // 1) Если маршрут НЕ требует авторизации — пропускаем
  if (!to.meta.requiresAuth) {
    return next()
  }
  // 2) Если маршрут требует авторизации, проверяем, есть ли у нас токен:
  const token = localStorage.getItem('accessToken')
  if (!token) {
    // Токена нет — перенаправляем на логин
    return next({ name: 'LoginPage' })
  } 
  // 3) Иначе пропускаем
  next()
})

export default router
