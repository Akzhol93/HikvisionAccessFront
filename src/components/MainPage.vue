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
        <component :is="currentTabComponent" />
      </transition>
    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

// Компоненты, соответствующие вкладкам
import DeviceList from '@/components/DeviceList.vue'
import PersonList from '@/components/PersonList.vue'
import ReportDetail from '@/components/ReportDetail.vue'
import ReportBI from '@/components/ReportBI.vue'
import OrgProfile from '@/components/OrgProfile.vue'

// Текущая активная вкладка
const activeTab = ref('devices')

// Список пунктов меню (иконка, метка, идентификатор)
const menuItems = [
  { label: 'Список устройств',   tab: 'devices',       icon: 'fas fa-laptop' },
  { label: 'Список персон',      tab: 'persons',       icon: 'fas fa-users' },
  { label: 'Детальный отчет',    tab: 'reportDetail',  icon: 'fas fa-database' },
  { label: 'BI отчет',           tab: 'reportBI',      icon: 'fas fa-chart-line' },
  { label: 'Организация / Профиль', tab: 'orginfo',    icon: 'fas fa-building' }
]

// Сопоставление вкладок и компонентов
const tabs = {
  devices: DeviceList,
  persons: PersonList,
  reportDetail: ReportDetail,
  reportBI: ReportBI,
  orginfo: OrgProfile
}

// Вычисляемый компонент для рендеринга
const currentTabComponent = computed(() => {
  return tabs[activeTab.value] || DeviceList
})

// Логика выхода из системы
const router = useRouter()
function logout() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  router.push({ name: 'LoginPage' })
}
</script>

<style scoped>
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

.sidebar-title {
  text-align: center;
  font-size: 1.6rem;
  margin-bottom: 2rem;
  font-weight: 600;
}

.sidebar-nav {
  flex-grow: 1;
  list-style: none;
  padding: 0;
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

.sidebar-nav li:hover {
  background-color: #bcbfca;
}

.sidebar-nav li.active {
  background-color: #007bff;
  color: #fff;
}

.sidebar-nav i {
  margin-right: 12px;
  font-size: 1.2rem;
}

.logout-btn {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
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

.content-area {
  flex: 1;
  margin-left: 270px;
  padding: 20px;
  background-color: #f9f9f9;
}

/* Анимация для смены вкладок */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s, transform 0.3s ease-in-out;
}
.fade-enter,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
