<template>
  <div class="main-layout">
    <!-- Сайдбар -->

    <aside class="sidebar">
      <h2 class="sidebar-title">📁 Разделы</h2>
      <ul class="sidebar-nav">
        <li 
          v-for="(item, index) in menuItems" 
          :key="index" 
          :class="{ active: activeTab === item.tab }"
          @click="activeTab = item.tab"
        >
          <i :class="item.icon"></i>
          {{ item.label }}
        </li>
      </ul>
      <button @click="logout" class="logout-btn">
        <i class="fas fa-sign-out-alt"></i> Выйти
      </button>
    </aside>


    <!-- Основная область контента -->
    <main class="content-area">
      <transition name="fade" mode="out-in">
        <section v-if="activeTab === 'devices'">
          <DeviceList />
        </section>

        <section v-else-if="activeTab === 'persons'">
          <PersonList />
        </section>

        <section v-else-if="activeTab === 'reportDetail'">
          <ReportDetail />
        </section>

        <section v-else-if="activeTab === 'reportBI'">
          <ReportBI />
        </section>

        <section v-else-if="activeTab === 'orginfo'">
          <OrgProfile />
        </section>
      </transition>

    </main>
  </div>
</template>

<script>
import DeviceList from '@/components/DeviceList.vue'
import ReportDetail from '@/components/ReportDetail.vue';
import ReportBI from '@/components/ReportBI.vue';
import PersonList from '@/components/PersonList.vue';
import OrgProfile from '@/components/OrgProfile.vue';

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
    DeviceList,ReportDetail,ReportBI, PersonList,OrgProfile
  },
  data() {
    return {
      activeTab: 'devices',
      menuItems: [
        { label: 'Список устройств', tab: 'devices', icon: 'fas fa-laptop' },
        { label: 'Список персон', tab: 'persons', icon: 'fas fa-users' },
        { label: 'Детальный отчет', tab: 'reportDetail', icon: 'fas fa-chart-line' },
        { label: 'BI отчет', tab: 'reportBI', icon: 'fas fa-database' },
        { label: 'Организация / Профиль', tab: 'orginfo', icon: 'fas fa-building' }
      ]
    }
  }
}
</script>

<style scoped>
/* Пример базовой сетки */
.main-layout {
  display: flex;
  min-height: 100vh; 
}

.sidebar {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  width: 240px;
  background-color: #294358;
  color: #fff;
  padding: 20px;
  display: flex;
  flex-direction: column;
  box-shadow: 4px 0 10px rgba(0, 0, 0, 0.2);
}

.sidebar-nav {
  flex-grow: 1; /* Чтобы навигация занимала доступное пространство */
  list-style: none;
  padding: 0;
}

.sidebar-title {
  text-align: center;
  font-size: 1.5rem;
  margin-bottom: 3rem;
}


.sidebar-nav li {
  cursor: pointer;
  padding: 10px 8px;
  margin-bottom: 6px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.sidebar-nav li:hover {
  background-color: #bcbfca;
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


.content-area {
  flex: 1;  /* Отодвигаем основную часть, чтобы не наезжала на фиксированный сайдбар */
  margin-left: 270px;
  padding: 20px;
  background-color: #f9f9f9;
}

.logout-btn {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 80%; /* Чтобы кнопка не была слишком узкой */
  background: #e74c3c;
  color: #fff;
  border: none;
  padding: 10px 12px;
  border-radius: 4px;
  cursor: pointer;
  text-align: center;
}



.logout-btn:hover {
  background: #c0392b;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.4s, transform 0.3s ease-in-out;
}

.fade-enter, .fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}





.sidebar-title {
  text-align: center;
  font-size: 1.6rem;
  margin-bottom: 2rem;
  font-weight: 600;
}

.sidebar-nav {
  flex-grow: 1;
  padding: 0;
  list-style: none;
}

.sidebar-nav li {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 12px 10px;
  margin-bottom: 8px;
  border-radius: 6px;
  transition: all 0.3s ease-in-out;
  font-size: 1.1rem;
}



.sidebar-nav i {
  margin-right: 12px;
  font-size: 1.2rem;
}

.logout-btn {
  width: 80%;
  background: #e74c3c;
  color: #fff;
  border: none;
  padding: 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1.1rem;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logout-btn i {
  margin-right: 8px;
}

.logout-btn:hover {
  background: #c0392b;
}

</style>
