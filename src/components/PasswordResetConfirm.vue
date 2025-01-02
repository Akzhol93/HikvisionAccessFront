<template>
  <div class="reset-confirm-container">
    <div class="reset-confirm-box">
      <h2>Сброс пароля</h2>

      <!-- Если нет uid или token в query-параметрах, показываем ошибку -->
      <p v-if="!uid || !token" class="error-msg">
        Неверная или неполная ссылка. Проверьте URL.
      </p>

      <!-- Если uid/token есть, но пароль ещё не сброшен => показываем форму -->
      <form v-else-if="!passwordUpdated" @submit.prevent="submitNewPassword">
        <div class="form-group">
          <label for="newPassword">Новый пароль</label>
          <input
            type="password"
            id="newPassword"
            v-model="newPassword"
            required
          />
        </div>

        <div class="form-group">
          <label for="confirmPassword">Подтвердите пароль</label>
          <input
            type="password"
            id="confirmPassword"
            v-model="confirmPassword"
            required
          />
        </div>

        <button type="submit" class="btn-submit">
          Изменить пароль
        </button>
      </form>

      <!-- Если пароль успешно сброшен => скрываем форму, показываем благодарность -->
      <div v-else>
        <p class="info-msg">
          Ваш пароль успешно обновлён!
          <br />
          <br />
          <router-link to="/login">Перейти на страницу входа</router-link>
        </p>
      </div>

      <!-- Общие сообщения (info / error) -->
      <div v-if="infoMessage" class="info-msg">{{ infoMessage }}</div>
      <div v-if="errorMessage" class="error-msg">{{ errorMessage }}</div>
    </div>
  </div>
</template>

<script>
import api from '@/api'

export default {
  name: 'PasswordResetConfirm',
  data() {
    return {
      newPassword: '',
      confirmPassword: '',
      passwordUpdated: false, // Флаг, показывающий, сброшен ли уже пароль
      infoMessage: '',
      errorMessage: ''
    }
  },
  computed: {
    // Читаем uid/token из query-параметров URL (например: ?uid=xxx&token=yyy)
    uid() {
      return this.$route.query.uid
    },
    token() {
      return this.$route.query.token
    }
  },
  methods: {
    async submitNewPassword() {
      // Проверяем совпадение паролей
      if (this.newPassword !== this.confirmPassword) {
        this.errorMessage = 'Пароли не совпадают.'
        return
      }

      try {
        this.errorMessage = ''
        this.infoMessage = ''

        const resp = await api.post('/api/users/password_reset_confirm/', {
          uid: this.uid,
          token: this.token,
          new_password: this.newPassword
        })

        // Если всё ок — меняем флаг, скрываем форму
        this.infoMessage = resp.data.detail || 'Пароль успешно изменён.'
        this.passwordUpdated = true

        // Дополнительно очистим поля
        this.newPassword = ''
        this.confirmPassword = ''
      } catch (error) {
        console.error(error)
        if (error.response && error.response.data && error.response.data.detail) {
          this.errorMessage = error.response.data.detail
        } else {
          this.errorMessage = 'Ошибка при сбросе пароля.'
        }
      }
    }
  }
}
</script>

<style scoped>
.reset-confirm-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
  padding: 20px;
  background: #f0f2f5;
  box-sizing: border-box;
}

.reset-confirm-box {
  background: #fff;
  width: 100%;
  max-width: 400px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  padding: 20px 25px;
  box-sizing: border-box;
}

.reset-confirm-box h2 {
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
