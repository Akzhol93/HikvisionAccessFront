<template>
  <div class="login-container">
    <div class="login-box">
      <h2>
        Salem <span class="wave-emoji">👋</span>
      </h2>

      <form @submit.prevent="onSubmit">
        <div class="form-group">
          <label for="username">Логин</label>
          <input
            type="text"
            id="username"
            v-model="username"
            placeholder="Введите логин"
            required
          />
        </div>

        <div class="form-group">
          <label for="password">Пароль</label>
          <input
            type="password"
            id="password"
            v-model="password"
            placeholder="Введите пароль"
            required
          />
        </div>

        <div class="form-remember">
          <label class="remember-me">
            <input 
              type="checkbox" 
              v-model="rememberMe" 
            />
            Запомнить меня
          </label>
        </div>

        <button type="submit" class="btn-submit">
          Войти
        </button>

        <p class="register-text">
          Нет аккаунта?
          <router-link to="/register">Регистрация</router-link>
        </p>
        <p class="register-text">
          <router-link to="/forgot-password">Забыли пароль?</router-link>
        </p>
      </form>

      <div v-if="errorMessage" class="error-msg">
        {{ errorMessage }}
      </div>
    </div>
  </div>
</template>

<script>
import { loginUser } from '@/api'

export default {
  name: 'LoginPage',
  data() {
    return {
      username: '',
      password: '',
      rememberMe: false,
      errorMessage: ''
    }
  },
  methods: {
    async onSubmit() {
      try {
        this.errorMessage = ''
        // Вызываем loginUser
        await loginUser(this.username, this.password)

        // Если нужно «Запомнить меня» (хранить в localStorage),
        // а не «Запомнить меня» (sessionStorage), можно сделать так:
        // Но для упрощения в api.js мы просто используем localStorage.
        // Если хотите реализовать dynamic: нужно переписать логику 
        // в api.js (или здесь) для sessionStorage. 

        // Успешный логин -> переход на главную
        this.$router.push('/main')
      } catch (error) {
        console.error(error)
        // Если ошибка 400 -> "Неверный логин или пароль"
        if (error.response && error.response.status === 400) {
          if (typeof error.response.data === 'object') {
            this.errorMessage = JSON.stringify(error.response.data)
          } else if (typeof error.response.data === 'string') {
            this.errorMessage = error.response.data
          } else {
            this.errorMessage = 'Неверный логин или пароль'
          }
        } else {
          this.errorMessage = 'Ошибка сети или сервера'
        }
      }
    }
  }
}
</script>

<style scoped>
/* Стили те же, что и у вас */
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: #f0f2f5;
  padding: 20px;
  box-sizing: border-box;
}

.login-box {
  background: #fff;
  width: 100%;
  max-width: 400px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 30px 25px;
  box-sizing: border-box;
}

.login-box h2 {
  margin-bottom: 20px;
  font-weight: 600;
  text-align: center;
  font-size: 24px;
}

.wave-emoji {
  display: inline-block;
  animation: wave 1.5s infinite;
  transform-origin: 70% 70%;
}
@keyframes wave {
  0% { transform: rotate(0deg); }
  10% { transform: rotate(14deg); }
  20% { transform: rotate(-8deg); }
  30% { transform: rotate(14deg); }
  40% { transform: rotate(-4deg); }
  50% { transform: rotate(10deg); }
  60% { transform: rotate(0deg); }
  100% { transform: rotate(0deg); }
}

.form-group {
  margin-bottom: 15px;
}
.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 500;
}
.form-group input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-remember {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.remember-me {
  font-size: 14px;
  display: flex;
  align-items: center;
}
.remember-me input {
  margin-right: 6px;
}

.btn-submit {
  width: 100%;
  background: #367bf5;
  color: #fff;
  padding: 10px 0;
  border: none;
  font-size: 16px;
  border-radius: 4px;
  cursor: pointer;
}
.btn-submit:hover {
  background: #2563c8;
}

.register-text {
  margin-top: 15px;
  text-align: center;
  font-size: 14px;
}
.register-text a {
  color: #367bf5;
  text-decoration: none;
}

.error-msg {
  margin-top: 10px;
  color: red;
  text-align: center;
}
</style>
