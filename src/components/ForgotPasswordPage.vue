<template>
  <div class="password-reset-container">
    <div class="password-reset-box">
      <h2>Восстановление пароля</h2>

      <!-- 1) Форма: показывается, только если successSent = false -->
      <form v-if="!successSent" @submit.prevent="submitEmail">
        <div class="form-group">
          <label for="email">Введите ваш Email</label>
          <input 
            type="email" 
            id="email" 
            v-model="email" 
            required
          />
        </div>

        <button type="submit" class="btn-submit">
          Отправить письмо для сброса пароля
        </button>
      </form>

      <!-- 2) Если письмо отправлено (successSent = true), показываем другое содержимое -->
      <div v-else>
        <p class="info-msg">
          {{ infoMessage }}
        </p>
      </div>

      <!-- Ссылка на страницу логина (в любом случае, пусть остаётся) -->
      <p class="login-link">
        Вспомнили пароль?
        <router-link to="/login">Вернуться к странице входа</router-link>
      </p>

      <!-- Вывод ошибок (если есть) -->
      <div v-if="errorMessage" class="error-msg">
        {{ errorMessage }}
      </div>
    </div>
  </div>
</template>

<script>
import api from '@/api'

export default {
  name: 'ForgotPasswordPage',
  data() {
    return {
      email: '',
      infoMessage: '',
      errorMessage: '',
      successSent: false // флаг, что письмо успешно отправлено
    }
  },
  methods: {
    async submitEmail() {
      try {
        this.infoMessage = ''
        this.errorMessage = ''

        const resp = await api.post('/api/users/password_reset/', {
          email: this.email
        })

        // Успех -> отображаем сообщение и ставим флаг
        this.infoMessage = resp.data.detail || 'Если пользователь с указанной почтой существует, письмо отправлено.'
        this.successSent = true

        // Можно очистить форму
        this.email = ''

      } catch (error) {
        console.error(error)
        if (error.response && error.response.data && error.response.data.detail) {
          this.errorMessage = error.response.data.detail
        } else {
          this.errorMessage = 'Ошибка при отправке запроса'
        }
      }
    }
  }
}
</script>

<style scoped>
.password-reset-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
  padding: 20px;
  background: #f0f2f5;
  box-sizing: border-box;
}

.password-reset-box {
  background: #fff;
  width: 100%;
  max-width: 400px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  padding: 20px 25px;
  box-sizing: border-box;
}

.password-reset-box h2 {
  margin-bottom: 20px;
  font-weight: 600;
  text-align: center;
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

/* Ссылка на логин */
.login-link {
  margin-top: 15px;
  text-align: center;
  font-size: 14px;
}
.login-link a {
  color: #367bf5;
  text-decoration: none;
}

.info-msg {
  margin-top: 15px;
  color: green;
  text-align: center;
}
.error-msg {
  margin-top: 15px;
  color: red;
  text-align: center;
}
</style>
