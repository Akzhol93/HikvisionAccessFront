<template>
    <div class="register-container">
      <div class="register-box">
  
        <!-- Блок с формой (только если showSuccessMessage = false) -->
        <div v-if="!showSuccessMessage">
          <h2>Регистрация</h2>
          <form @submit.prevent="onSubmit">
            <!-- Username -->
            <div class="form-group">
              <label for="username">Имя пользователя (логин)</label>
              <input
                type="text"
                id="username"
                v-model="formData.username"
                required
              />
            </div>
  
            <!-- Email -->
            <div class="form-group">
              <label for="email">Email</label>
              <input
                type="email"
                id="email"
                v-model="formData.email"
                required
              />
            </div>
  
            <!-- FIO -->
            <div class="form-group">
              <label for="FIO">ФИО</label>
              <input
                type="text"
                id="FIO"
                v-model="formData.FIO"
                required
              />
            </div>
  
            <!-- Phone + маска -->
            <div class="form-group">
              <label for="phone">Телефон</label>
              <input
                type="text"
                id="phone"
                v-model="formData.phone"
                v-mask="'+7 (###) ###-##-##'"
              />
            </div>
  
            <!-- Region -->
            <div class="form-group">
              <label for="region">Регион</label>
              <select
                id="region"
                v-model="selectedRegion"
                @change="onRegionChange"
              >
                <option value="" disabled>Выберите регион</option>
                <option
                  v-for="reg in regions"
                  :key="reg.id"
                  :value="reg.id"
                >
                  {{ reg.name }}
                </option>
              </select>
            </div>
  
            <!-- Organization -->
            <div class="form-group">
              <label for="organization">Организация</label>
              <select
                id="organization"
                v-model="selectedOrganization"
              >
                <option value="" disabled>Выберите организацию</option>
                <option
                  v-for="org in organizations"
                  :key="org.id"
                  :value="org.id"
                >
                  {{ org.name }}
                </option>
              </select>
            </div>
  
            <!-- Пароль -->
            <div class="form-group">
              <label for="password">Пароль</label>
              <input
                type="password"
                id="password"
                v-model="formData.password"
                required
              />
            </div>
  
            <!-- Подтверждение пароля -->
            <div class="form-group">
              <label for="password_confirm">Подтвердите пароль</label>
              <input
                type="password"
                id="password_confirm"
                v-model="formData.password_confirm"
                required
              />
            </div>
  
            <!-- Кнопка отправки -->
            <button type="submit" class="btn-submit" :disabled="isSubmitting">
              Зарегистрироваться
            </button>
  
            <!-- Ссылка на логин -->
            <p class="login-link">
              Уже есть аккаунт?
              <router-link to="/login">Войти</router-link>
            </p>
          </form>
        </div>
  
        <!-- Сообщение после успешной регистрации (showSuccessMessage = true) -->
        <div v-else>
          <h2>Спасибо!</h2>
          <p>
            Для завершения регистрации проверьте указанную при регистрации почту<br/>
            и перейдите по ссылке активации.
          </p>
          <router-link to="/login">Перейти на страницу входа</router-link>
        </div>
  
        <!-- Вывод ошибок (если есть) -->
        <div v-if="errorMessage" class="error-msg">
          {{ errorMessage }}
        </div>
  
      </div>
    </div>
  </template>
  
  <script>
  import api from '@/api'
  
  // Словарь для «перевода»/подмены стандартных сообщений DRF
  const translations = {
    'user with this username already exists.': 'Пользователь с таким именем уже существует',
    'A user with that username already exists.': 'Пользователь с таким именем уже существует',
    'user with this email address already exists.': 'Пользователь с таким Email уже существует',
    'Incorrect type. Expected pk value, received list.': 'Некорректный формат. Нужно передать одно число, а не список.',
    'This field may not be null.': 'Поле не может быть пустым.',
    'Пароли не совпадают.': 'Пароли не совпадают.',
    'Пароль должен быть от 6 до 50 символов.': 'Пароль должен быть от 6 до 50 символов.'
    // Дополняйте при необходимости
  }
  
  export default {
    name: 'RegisterPage',
    data() {
      return {
        isSubmitting: false,
        formData: {
          username: '',
          email: '',
          FIO: '',
          phone: '',
          password: '',
          password_confirm: ''
        },
        regions: [],
        selectedRegion: '',
        organizations: [],
        selectedOrganization: '',
        errorMessage: '',
        showSuccessMessage: false  // <-- флаг, чтобы переключаться на "спасибо"
      }
    },
    async created() {
      try {
        // Загрузим все регионы
        const resp = await api.get('/api/regions/')
        this.regions = resp.data
      } catch (err) {
        console.error('Ошибка при загрузке регионов', err)
      }
    },
    methods: {
      // Когда пользователь меняет регион - загружаем организации
      async onRegionChange() {
        if (!this.selectedRegion) {
          this.organizations = []
          return
        }
        try {
          const resp = await api.get(`/api/organizations/?region_id=${this.selectedRegion}`)
          this.organizations = resp.data
          this.selectedOrganization = ''
        } catch (err) {
          console.error('Ошибка при загрузке организаций', err)
          this.organizations = []
        }
      },
  
      // Отправка формы регистрации
      async onSubmit() {

        // Если уже отправляем запрос или уже показали "спасибо" — выходим
        if (this.isSubmitting || this.showSuccessMessage) {
          return
        }
        this.isSubmitting = true
        this.errorMessage = ''

        try {
          // this.errorMessage = ''
          // Готовим payload
          const payload = {
            ...this.formData,
            organization: this.selectedOrganization
          }
  
          // Отправляем POST /api/users/
          await api.post('/api/users/', payload)
          // Сервер (UserViewSet.create) теперь НЕ возвращает refresh/access,
          // только JSON вида { "detail": "User created..." }
  
          // При успехе -> показываем сообщение "Спасибо..."
          this.showSuccessMessage = true
  
        } catch (error) {
          console.error(error)
          if (error.response && error.response.status === 400) {
            if (typeof error.response.data === 'object') {
              // Пример: { username: ["A user with that username already exists."], password: [...] }
              let messages = []
              for (const field in error.response.data) {
                const fieldErrors = error.response.data[field]
                // Переводим каждую ошибку, если есть
                const translated = fieldErrors.map(msg => translations[msg] || msg)
                messages = messages.concat(translated)
              }
              this.errorMessage = messages.join(' | ')
            } else {
              this.errorMessage = error.response.data
            }
          } else {
            this.errorMessage = 'Ошибка сети или сервера'
          }
        } finally {
          this.isSubmitting = false
          }
      }
    }
  }
  </script>
  
  <style scoped>
  .register-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background: #f0f2f5;
    padding: 20px;
    box-sizing: border-box;
  }
  
  .register-box {
    background: #fff;
    width: 100%;
    max-width: 450px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    padding: 30px 25px;
    box-sizing: border-box;
  }
  
  .register-box h2 {
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
  
  .form-group input,
  .form-group select {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 14px;
    box-sizing: border-box;
  }
  
  .btn-submit {
    width: 100%;
    background: #28a745;
    color: #fff;
    padding: 10px 0;
    border: none;
    font-size: 16px;
    border-radius: 4px;
    cursor: pointer;
  }
  .btn-submit:hover {
    background: #218838;
  }
  
  .login-link {
    margin-top: 15px;
    text-align: center;
    font-size: 14px;
  }
  
  .login-link a {
    color: #367bf5;
    text-decoration: none;
  }
  
  .error-msg {
    margin-top: 10px;
    color: red;
    text-align: center;
  }
  
  /* Адаптивность */
  @media (max-width: 480px) {
    .register-box {
      padding: 20px 15px;
    }
    .register-box h2 {
      font-size: 20px;
    }
  }
  </style>
  