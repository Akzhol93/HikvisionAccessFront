// src/api.js
import axios from 'axios'
import router from './router' // чтобы уметь делать router.push()

// Создаём отдельный инстанс axios (чтобы не влиять на глобальный axios)
const api = axios.create()

/**
 * Сеттер для заголовка Authorization: Bearer <token>.
 * Если token не задан, удаляет заголовок.
 */
export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  } else {
    delete api.defaults.headers.common['Authorization']
  }
}

/**
 * Утилиты для чтения/записи токенов из localStorage (или sessionStorage),
 * можно усложнить под "remember me".
 */
function getAccessToken() {
  return localStorage.getItem('accessToken')
}
function getRefreshToken() {
  return localStorage.getItem('refreshToken')
}
function saveTokens(access, refresh) {
  localStorage.setItem('accessToken', access)
  localStorage.setItem('refreshToken', refresh)
}
function clearTokens() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  setAuthToken(null)
}

/**
 * Интерцептор, который ловит все ответы с кодом 401,
 * и пытается «авторизоваться» заново через /api/token/refresh/.
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      const refresh = getRefreshToken()
      if (!refresh) {
        // Нет refresh-токена. Нужно логаутить и на /login
        clearTokens()
        router.push('/login')
        return Promise.reject(error)
      }
      try {
        // Пробуем рефрешить
        const { data } = await api.post('/api/token/refresh/', { refresh })
        const newAccess = data.access
        if (!newAccess) {
          throw new Error('Refresh: сервер не вернул новый access')
        }
        // Успешно получили новый access-токен -> сохраняем, ставим в заголовок, повторяем запрос
        saveTokens(newAccess, refresh) // refresh обычно остаётся тот же, если бэкенд так настроен
        setAuthToken(newAccess)

        // Повторяем оригинальный запрос с новым токеном
        error.config.headers['Authorization'] = `Bearer ${newAccess}`
        return api.request(error.config)
      } catch (refreshErr) {
        // Если refresh тоже истёк или невалиден
        clearTokens()
        router.push('/login')
        return Promise.reject(refreshErr)
      }
    }
    return Promise.reject(error)
  }
)

/**
 * Вспомогательная функция инициализации — 
 * если при загрузке страницы есть accessToken, ставим его в заголовок.
 */
export function initApiWithToken() {
  const access = getAccessToken()
  if (access) {
    setAuthToken(access)
  }
}

/**
 * Логика логина: отправить /api/login/, 
 * сохранить токены, настроить заголовок, вернуть ответ.
 */
export async function loginUser(username, password) {
  // POST /api/login/
  const response = await api.post('/api/login/', { username, password })
  const { refresh, access } = response.data
  if (!access || !refresh) {
    throw new Error('Сервер не вернул access/refresh токены')
  }
  saveTokens(access, refresh)
  setAuthToken(access)
  return response
}

/**
 * Логика логаута: очистить токены.
 */
export function logoutUser() {
  clearTokens()
  router.push('/login')
}

/**
 * Экспортируем сам инстанс.
 */
export default api
