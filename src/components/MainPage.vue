<template>
  <div class="main-layout">
    <!-- Сайдбар -->

    <aside class="sidebar">
      <h2 class="sidebar-title">Панель</h2>
      <ul class="sidebar-nav">
        <li 
          :class="{ active: activeTab === 'devices' }" 
          @click="activeTab = 'devices'"
        >
          <i class="icon-devices"></i>
          Список устройств
        </li>
        <li
          :class="{ active: activeTab === 'persons' }"
          @click="activeTab = 'persons'"
        >
          <i class="icon-persons"></i>
          Список персон
        </li>
        <li
          :class="{ active: activeTab === 'report' }"
          @click="activeTab = 'report'"
        >
          <i class="icon-report"></i>
          BI отчёт
        </li>
        <li
          :class="{ active: activeTab === 'orginfo' }"
          @click="activeTab = 'orginfo'"
        >
          <i class="icon-org"></i>
          Организация / Профиль
        </li>
      </ul>
    </aside>
    <button @click="logout" class="logout-btn">
      Выйти
    </button>

    <!-- Основная область контента -->
    <main class="content-area">
      <section v-if="activeTab === 'devices'">
        <DeviceList />
      </section>

      <section v-else-if="activeTab === 'persons'">
        <h1>Список персон</h1>
        <p>Здесь будет функционал управления персонами (students).</p>
        <!-- TODO: компонент PersonList.vue -->
      </section>

      <section v-else-if="activeTab === 'report'">
        <h1>BI Отчёт</h1>
        <ReportBI />
      </section>

      <section v-else-if="activeTab === 'orginfo'">
        <h1>Организация / Профиль</h1>
        <p>Здесь будут данные организации (readonly) и профиль пользователя (с возможностью редактировать).</p>
        <!-- TODO: компонент OrgAndUserInfo.vue -->
      </section>
    </main>
  </div>
</template>

<script>
import DeviceList from '@/components/DeviceList.vue'
import ReportBI from './ReportBI.vue';

export default {
  name: 'MainPage',
  methods: {
    logout() {
      // Удаляем токены из localStorage
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      // Можно вызывать logout-эндпоинт на бэке, если нужно
      // axios.post('/api/logout/').catch(() => {})
      // Переходим на страницу логина
      this.$router.push({ name: 'LoginPage' })
    }
  },
  components: {
    DeviceList,ReportBI
  },
  data() {
    return {
      activeTab: 'devices'
    }
  }
}
</script>

<style scoped>
/* Пример базовой сетки */
.main-layout {
  display: flex;
  min-height: 100vh; /* чтобы тянулось на всю высоту экрана */
}

/* Сайдбар */
.sidebar {
  width: 240px;
  background-color: #333;
  color: #fff;
  padding: 20px;
}

.sidebar-title {
  font-size: 1.2rem;
  margin-bottom: 20px;
}

.sidebar-nav {
  list-style: none;
  padding: 0;
}

.sidebar-nav li {
  cursor: pointer;
  padding: 10px 8px;
  margin-bottom: 6px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.sidebar-nav li:hover {
  background-color: #444;
}

.sidebar-nav li.active {
  background-color: #007bff;
  color: #fff;
}

.icon-devices::before {
  content: "📟 ";
}
.icon-persons::before {
  content: "👥 ";
}
.icon-report::before {
  content: "📊 ";
}
.icon-org::before {
  content: "🏛 ";
}

/* Основная область */
.content-area {
  flex: 1;
  padding: 20px;
  background-color: #f9f9f9;
}

.logout-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  background: #e74c3c;
  color: #fff;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
}
.logout-btn:hover {
  background: #c0392b;
}
</style>
