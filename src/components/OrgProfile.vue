<template>
  <h1 class="title">Организация</h1>
    <div class="container">


      <div v-if="loading" class="loading-text">Загрузка...</div>
      <div v-else-if="error" class="error-text">
        Произошла ошибка: {{ error }}
      </div>
      <div v-else>
        <h2>Данные пользователя</h2>
        <p><strong>Логин:</strong> {{ user?.username }}</p>
        <p><strong>ФИО:</strong> {{ user?.FIO }}</p>
        <p><strong>Телефон:</strong> {{ user?.phone }}</p>
  
        <hr class="divider" />
  
        <h3>Организация</h3>
        <p><strong>Название:</strong> {{ organization?.name }}</p>
        <p><strong>BIN:</strong> {{ organization?.bin }}</p>
        <p><strong>Главная организация?</strong> 
          <span>{{ organization?.is_main ? 'Да' : 'Нет' }}</span>
        </p>
  
        <template v-if="organization?.is_main">
          <hr class="divider" />
          <h3>Дочерние организации</h3>
          <ul class="org-list">
            <li class="org-item" v-for="child in children" :key="child.id">
              <strong>{{ child.name }}</strong> (BIN: {{ child.bin }})
            </li>
          </ul>
        </template>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue'
  import axios from 'axios'
  
  // Состояния компонента
  const loading = ref(false)
  const error = ref(null)
  const user = ref(null)
  const organization = ref(null)
  const children = ref([])
  
  // Запрашиваем основную информацию о пользователе
  const fetchUserInfo = async () => {
    loading.value = true
    try {
      const response = await axios.get('/api/user_info/')
      user.value = response.data
      organization.value = user.value.organization
  
      // Если организация главная — запрашиваем дочерние
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
  
  // Запрашиваем список дочерних организаций
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

.title {
  font-size: 28px; /* Крупный размер */
  font-weight: bold;
  color: #2c3e50; /* Темно-синий цвет */
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 16px 0;
  position: relative;
}

.title::after {
  content: "";
  display: block;
  width: 80px;
  height: 4px;
  background: linear-gradient(to right, #42b983, #2c3e50); /* Градиентная линия */
  margin: 8px auto;
  border-radius: 2px;
}

@media (max-width: 768px) {
  .title {
    font-size: 22px; /* Меньше на мобильных */
  }
}
  /* Контейнер для всего контента */
  .container {
    max-width: 600px;
    margin: 40px auto;
    padding: 24px;
    border-radius: 8px;
    background-color: #f9f9f9;
    box-shadow: 0 1px 4px rgba(0,0,0,0.08);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  
  /* Заголовки */
  h2, h3 {
    margin-bottom: 16px;
    font-weight: 600;
    line-height: 1.2;
  }
  
  /* Текст при загрузке и ошибках */
  .loading-text,
  .error-text {
    font-style: italic;
    margin: 8px 0;
  }
  
  /* Горизонтальная линия для разделения блоков */
  .divider {
    margin: 20px 0;
    border: none;
    border-top: 1px solid #ddd;
  }
  
  /* Список организаций */
  .org-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  
  .org-item {
    margin-bottom: 8px;
  }
  </style>
  <!-- df -->