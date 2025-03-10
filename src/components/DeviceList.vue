<template>
  <div class="device-list">
    <h1 class="title">Устройства контроля доступа</h1>

    <button class="refresh-btn" @click="fetchDevices">
      <img src="@/assets/update.png" alt="Обновить" class="icon" /> Обновить список
    </button>

    <!-- 1) Если идёт загрузка -->
    <div v-if="loading" class="loading">Загрузка...</div>

    <!-- 2) Если ошибка -->
    <div v-else-if="error" class="error">
      Произошла ошибка: {{ error }}
    </div>

    <!-- 3) Иначе, когда loading=false и error=null -->
    <div v-else>
      <!-- Если есть устройства -->
      <div v-if="devices.length">
        <div v-for="device in devices" :key="device.id" class="device-card">
          <div class="device-header" @click="device.showSchedules = !device.showSchedules">
            
            <div class="device-icon-wrapper">
              <img src="@/assets/hikvision.png" alt="Device Icon" class="device-icon" />
              <div class="device-status" :class="device.is_online ? 'status-online' : 'status-offline'">
                <i :class="device.is_online ? 'fas fa-check-circle' : 'fas fa-times-circle'"></i>
                {{ device.is_online ? 'Online' : 'Offline' }}
              </div>
            </div>

            <h3 class="device-name">{{ device.name }}</h3>
            <h5 class="organization-name">{{ getOrganizationName(device.organization) }}</h5>
            
            <i :class="device.showSchedules ? 'fas fa-chevron-up' : 'fas fa-chevron-down'" class="expand-arrow"></i>
          </div>

          <transition name="fade">
            <div v-if="device.showSchedules" class="schedules-container">
              <div v-for="scheduleId in [1, 2, 3]" :key="scheduleId" class="schedule-template">
                <h3>Расписание №{{ scheduleId }}</h3>

                <div v-if="device.schedules && device.schedules[scheduleId]">
                  <div class="enable-toggle">
                    <label class="switch">
                      <input type="checkbox" :checked="device.schedules[scheduleId].enable"
                            @change="toggleScheduleEnable(device, scheduleId, $event.target.checked)" />
                      <span class="slider round"></span>
                    </label>
                    <span>{{ device.schedules[scheduleId].enable ? 'Включено' : 'Выключено' }}</span>
                  </div>
                  
                  <div class="weekplan-days" v-if="device.schedules[scheduleId].weekPlan">
                    <div v-for="(wpDay, idx) in device.schedules[scheduleId].weekPlan" :key="idx" class="weekplan-day">
                      <strong>{{ getRusDayName(wpDay.week) }}:</strong>
                      <span v-if="wpDay.enable">{{ wpDay.TimeSegment.beginTime }} - {{ wpDay.TimeSegment.endTime }}</span>
                      <span v-else>Выключено</span>
                    </div>
                  </div>

                  <button class="edit-btn" @click="editSchedule(device, scheduleId)">
                    <i class="fas fa-edit"></i> Изменить
                  </button>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </div>

      <!-- Иначе, если устройств нет, но нет загрузки/ошибки -->
      <p v-else>
        Нет доступных устройств.
      </p>
    </div>

    <!-- Модалка (ScheduleEditModal) -->
    <ScheduleEditModal
      v-if="isScheduleModalOpen"
      :device="selectedDevice"
      :scheduleId="selectedScheduleId"
      @close="isScheduleModalOpen = false"
      @saved="onWeekPlanSaved"
    />
  </div>
</template>

<script>
import api from '@/api'
import ScheduleEditModal from '@/components/ScheduleEditModal.vue' // <-- Импортируем модалку
import axios from 'axios'

export default {
  name: 'DeviceList',
  components: { ScheduleEditModal },
  data() {
    return {
      organizations: [],
      devices: [],
      loading: false,
      error: null,

      // Для модалки редактирования
      isScheduleModalOpen: false,
      selectedDevice: null,
      selectedScheduleId: null
    }
  },
  mounted() {
    this.fetchOrganizations().then(() => {
      this.fetchDevices()
    })
  },
  methods: {
    getRusDayName(engDay) {
      const dayMap = {
        Monday: 'Понедельник',
        Tuesday: 'Вторник',
        Wednesday: 'Среда',
        Thursday: 'Четверг',
        Friday: 'Пятница',
        Saturday: 'Суббота',
        Sunday: 'Воскресенье'
      }
      // если в dayMap нет соответствия, вернём исходный engDay
      return dayMap[engDay] || engDay
    },

    async fetchOrganizations() {
      try {
        const userResponse = await axios.get('/api/user_info/')
        const user = userResponse.data
        if (!user.organization) {
          console.warn('У пользователя не указана организация')
          this.organizations = []
          return
        }

        const userOrgId = user.organization.id
        const isMain = user.organization.is_main

        if (isMain) {
          // Если это главная организация, получаем список дочерних
          const orgsResponse = await axios.get(`/api/organizations/?parent_id=${userOrgId}`)
          this.organizations = orgsResponse.data || []
        } else {
          // Иначе пользователь в дочерней
          this.organizations = [user.organization]
        }
      } catch (error) {
        console.error('Ошибка при загрузке организаций:', error)
        this.organizations = []
      }
    },
    getOrganizationName(orgId) {
      if (!orgId) return '' // Если orgId не задан
      const foundOrg = this.organizations.find(o => o.id === orgId)
      return foundOrg ? foundOrg.name : `Орг. #${orgId}` // Если не нашли, хотя бы вернём ID
    },
    fetchDevices() {
      this.loading = true
      this.error = null
      api.get('/api/devices/')
        .then((response) => {

          this.devices = response.data || []

          // Для визуального управления dropdown'ом - добавим showSchedules=false
          this.devices.forEach((dev) => {
            dev.schedules = {}
            dev.showSchedules = false
          })

          // Загрузим данные schedule/weekPlan
          this.loadSchedulesForAllDevices()
        })
        .catch((err) => {
          this.error = err.response?.data?.detail || err.message
        })
        .finally(() => {
          this.loading = false
        })
    },
    loadSchedulesForAllDevices() {
      this.devices.forEach((device) => {
        [1, 2, 3].forEach((scheduleId) => {
          this.fetchSchedule(device, scheduleId)
        })
      })
    },
    fetchSchedule(device, scheduleId) {
      api
        .get(`/api/devices/${device.id}/schedule/${scheduleId}/`)
        .then((resp) => {
          const schedData = resp.data.UserRightPlanTemplate || {}
          device.schedules[scheduleId] = {
            enable: schedData.enable,
            templateName: schedData.templateName,
            weekPlanNo: schedData.weekPlanNo,
            holidayGroupNo: schedData.holidayGroupNo,
            weekPlan: []
          }
          if (schedData.weekPlanNo) {
            this.fetchWeekPlan(device, scheduleId, schedData.weekPlanNo)
          }
        })
        .catch((err) => {
          console.error(err)
          device.schedules[scheduleId] = {
            enable: false, templateName: '', weekPlanNo: null, holidayGroupNo: '',
            weekPlan: []
          }
        })
    },
    fetchWeekPlan(device, scheduleId, weekPlanNo) {
      api
        .get(`/api/devices/${device.id}/weekplan/${weekPlanNo}/`)
        .then((resp) => {
          const weekPlanData = resp.data.UserRightWeekPlanCfg
          if (!weekPlanData) return
          const filteredDays = (weekPlanData.WeekPlanCfg || []).filter(i => i.id === 1)
          device.schedules[scheduleId].weekPlan = filteredDays
        })
        .catch((err) => {
          console.error(err)
          device.schedules[scheduleId].weekPlan = []
        })
    },

    toggleScheduleEnable(device, scheduleId, newValue) {
      // 1. Обновим локально
      device.schedules[scheduleId].enable = newValue

      // 2. Сформируем payload для PUT
      const { enable, templateName, weekPlanNo, holidayGroupNo } = device.schedules[scheduleId]
      const payload = {
        UserRightPlanTemplate: {
          enable,          
          templateName,
          weekPlanNo,      
          holidayGroupNo   
        }
      }

      // 3. Отправляем PUT на /api/devices/{device.id}/schedule/{scheduleId}/
      api.put(`/api/devices/${device.id}/schedule/${scheduleId}/`, payload)
        .then((resp) => {
          console.log('Schedule updated successfully', resp.data)
        })
        .catch((err) => {
          console.error('Error updating schedule', err)
          // Откатим локальное значение, если нужно
          device.schedules[scheduleId].enable = !newValue
        })
    },

    // Открываем модалку для редактирования weekPlan
    editSchedule(device, scheduleId) {
      this.selectedDevice = device
      this.selectedScheduleId = scheduleId
      this.isScheduleModalOpen = true
    },

    // Когда в модалке нажали "Сохранить"
    onWeekPlanSaved({ deviceId, scheduleId, updatedWeekPlan }) {
      const dev = this.devices.find(d => d.id === deviceId)
      if (dev && dev.schedules[scheduleId]) {
        dev.schedules[scheduleId].weekPlan = updatedWeekPlan
      }
    }
  }
}
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




.loading {
  font-weight: bold;
  margin-bottom: 10px;
}

.error {
  color: red;
  margin-bottom: 10px;
}




.device-name {
  margin: 0;
  flex: 1; /* Чтобы заголовок занимал всё доступное пространство */
}


/* Обёртка для всех расписаний */
.schedules-container {
  margin-top: 12px;
  padding: 8px;
  border-top: 1px dashed #ccc;
}

/* Каждое расписание */
.schedule-template {
  background: #fafafa;
  border: 1px dotted #ccc;
  padding: 8px;
  margin-bottom: 8px;
  border-radius: 4px;
}
.schedule-template h3 {
  margin-top: 0;
}

/* Тумблер (on/off switch) */
.enable-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.switch {
  position: relative;
  display: inline-block;
  width: 38px;
  height: 22px;
}
.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}
.slider {
  position: absolute;
  cursor: pointer;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: #ccc;
  transition: .4s;
  border-radius: 20px;
}
.slider:before {
  position: absolute;
  content: "";
  height: 16px; width: 16px;
  left: 3px; bottom: 3px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}
input:checked + .slider {
  background-color: #42b983; /* зеленый при on */
}
input:focus + .slider {
  box-shadow: 0 0 1px #42b983;
}
input:checked + .slider:before {
  transform: translateX(16px);
}




/* Кнопка "Изменить" */
.edit-btn {
  margin-top: 8px;
  padding: 4px 8px;
}

/* Дни недели */
.weekplan-days {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}
.weekplan-day {
  background: #eee;
  padding: 4px 8px;
  border-radius: 4px;
}

/* Плавная анимация при появлении/исчезновении (transition "fade") */

.fade-enter-active {
  transition: max-height 0.4s ease-in-out, opacity 0.3s ease-in-out;
  max-height: 500px;
}

.fade-leave-active {
  transition: max-height 0.3s ease-in-out, opacity 0.2s ease-in-out;
  max-height: 0;
}

.fade-enter, .fade-leave-to {
  opacity: 0;
}




.device-list {
  padding: 16px;
  background-color: #f9f9f9;
}

/* Общие стили карточки */
.device-card {
  background: #ffffff;
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease-in-out;
}
.device-card:hover {
  transform: translateY(-3px);
  box-shadow: 0px 6px 10px rgba(0, 0, 0, 0.15);
}


.device-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

@media (max-width: 768px) {
  .device-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .device-name {
    font-size: 16px;
  }
}


.organization-name {
  /* Можно добавить text-overflow, если слишком длинное имя */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis; 
}


.device-icon {
  width: 80px;
  height: 40px;
  /* grid-column: 2; // не обязательно, если порядок совпадает */
}


.device-name {
  padding-left: 20px;
  margin: 0;
  grid-column: 2;
}

.expand-arrow {
  font-weight: bold;
  /* grid-column: 4; // не обязательно */
  text-align: center; /* или right/left, как удобно */
}
.device-icon-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center; /* Центровка */
}

.device-name {
  font-size: 18px;
  font-weight: bold;
  color: #294358;
}

.device-status {
  margin-top: 1rem;
  font-size: 14px;
  font-weight: bold;
  text-transform: uppercase;
}

.status-online {
  color: #28a745;
}

.status-offline {
  color: #dc3545;
}

.refresh-btn {
  background: #28a745;
  color: white;
  border: none;
  padding: 8px 16px;
  font-size: 16px;
  border-radius: 5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 0.3s ease;
  margin-bottom: 2rem;
}

.refresh-btn:hover {
  background: #369e6f;
}

.refresh-btn .icon {
  width: 20px;
  height: 20px;
}


</style>
