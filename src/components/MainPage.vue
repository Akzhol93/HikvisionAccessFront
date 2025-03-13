<template>
  <div class="main-layout">
    <!-- Сайдбар -->

    <aside class="sidebar">
      <h2 class="sidebar-title">Разделы</h2>
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
          :class="{ active: activeTab === 'reportDetail' }"
          @click="activeTab = 'reportDetail'"
        >
          <i class="icon-report"></i>
          Детальный отчет
        </li>

        <li
          :class="{ active: activeTab === 'reportBI' }"
          @click="activeTab = 'reportBI'"
        >
          <i class="icon-report"></i>
          BI отчет
        </li>

        <li
          :class="{ active: activeTab === 'orginfo' }"
          @click="activeTab = 'orginfo'"
        >
          <i class="icon-org"></i>
          Организация / Профиль
        </li>
      </ul>
      <button @click="logout" class="logout-btn">
        Выйти
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
      activeTab: 'devices'
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


</style>
