<template>
  <div class="container">
    <h1 class="title">Информация об организации</h1>

    <!-- Загрузка -->
    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
      <p class="loading-text">Загрузка...</p>
    </div>

    <!-- Ошибка -->
    <div v-else-if="error" class="error-text">
      ❌ Произошла ошибка: {{ error }}
    </div>

    <!-- Данные пользователя -->
    <div v-else class="content">
      <div class="card">
        <h2>👤 Данные пользователя</h2>
        <p><strong>Логин:</strong> {{ user?.username }}</p>
        <p><strong>ФИО:</strong> {{ user?.FIO }}</p>
        <p><strong>Телефон:</strong> {{ user?.phone }}</p>
      </div>

      <div class="card">
        <h3>🏢 Организация</h3>
        <p><strong>Название:</strong> {{ organization?.name }}</p>
        <p><strong>BIN:</strong> {{ organization?.bin }}</p>
        <p><strong>Главная организация?</strong> 
          <span :class="{ 'highlight-yes': organization?.is_main, 'highlight-no': !organization?.is_main }">
            {{ organization?.is_main ? 'Да' : 'Нет' }}
          </span>
        </p>
      </div>

      <!-- Дочерние организации -->
      <template v-if="organization?.is_main">
        <div class="card">
          <h3>🔗 Дочерние организации</h3>
          <ul class="org-list">
            <li class="org-item" v-for="child in children" :key="child.id">
              <span class="org-icon">🏭</span>
              <strong>{{ child.name }}</strong> (BIN: {{ child.bin }})
            </li>
          </ul>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

// Состояния
const loading = ref(false)
const error = ref(null)
const user = ref(null)
const organization = ref(null)
const children = ref([])

// Функция получения информации
const fetchUserInfo = async () => {
  loading.value = true
  try {
    const response = await axios.get('/api/user_info/')
    user.value = response.data
    organization.value = user.value.organization

    if (organization.value?.is_main) {
      await fetchChildren(organization.value.id)
    }
  } catch (err) {
    console.error(err)
    error.value = 'Не удалось получить данные пользователя.'
  } finally {
    loading.value = false
  }
}

// Запрос дочерних организаций
const fetchChildren = async (parentId) => {
  try {
    const response = await axios.get(`/api/organizations?parent_id=${parentId}`)
    children.value = response.data
  } catch (err) {
    console.error(err)
    error.value = 'Не удалось получить список дочерних организаций.'
  }
}

onMounted(() => {
  fetchUserInfo()
})
</script>

<style scoped>
/* 🏠 Общий контейнер */
.container {
  max-width: 700px;
  margin: 40px auto;
  padding: 24px;
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
  font-family: 'Segoe UI', Roboto, sans-serif;
}

/* 🏷 Заголовок */
.title {
  font-size: 26px;
  font-weight: bold;
  color: #2c3e50;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 16px 0;
  position: relative;
}
.title::after {
  content: "";
  display: block;
  width: 100px;
  height: 4px;
  background: linear-gradient(to right, #42b983, #2c3e50);
  margin: 8px auto;
  border-radius: 2px;
}

/* 📦 Карточки */
.card {
  background: #f9f9f9;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
  margin-bottom: 16px;
  transition: all 0.3s;
}
.card:hover {
  transform: translateY(-3px);
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
}

/* 🕓 Загрузка */
.loading-container {
  text-align: center;
}
.spinner {
  width: 30px;
  height: 30px;
  border: 4px solid rgba(0, 0, 0, 0.2);
  border-left-color: #42b983;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 10px auto;
}
@keyframes spin {
  100% { transform: rotate(360deg); }
}
.loading-text {
  font-style: italic;
  color: #555;
}

/* ❌ Ошибка */
.error-text {
  color: #d32f2f;
  font-weight: bold;
  text-align: center;
}

/* ✅ Выделение главной организации */
.highlight-yes {
  color: #27ae60;
  font-weight: bold;
}
.highlight-no {
  color: #c0392b;
  font-weight: bold;
}

/* 📋 Список организаций */
.org-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.org-item {
  display: flex;
  align-items: center;
  padding: 8px;
  background: #ffffff;
  margin-bottom: 8px;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  transition: 0.3s;
}
.org-item:hover {
  background: #f1f1f1;
}
.org-icon {
  margin-right: 8px;
}

/* 📱 Мобильная адаптация */
@media (max-width: 768px) {
  .container {
    padding: 16px;
  }
  .title {
    font-size: 22px;
  }
}
</style>
