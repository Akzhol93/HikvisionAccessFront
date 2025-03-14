<template>
  <div class="device-list">
    <h1 class="title">Устройства контроля доступа</h1>

    <div class="refresh-btn-wrapper">
      <button
        class="refresh-btn"
        :class="{ 'refreshing': isRefreshing }"
        @click="onRefreshClick"
      >
        <img src="@/assets/update.png" alt="Обновить" class="icon" /> Обновить
      </button>
    </div>

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
              <img
                src="@/assets/hikvision.png"
                alt="Device Icon"
                class="device-icon"
              />
              <div
                class="device-status"
                :class="device.is_online ? 'status-online' : 'status-offline'"
              >
                <i :class="device.is_online ? 'fas fa-check-circle' : 'fas fa-times-circle'"></i>
                {{ device.is_online ? 'Online' : 'Offline' }}
              </div>
            </div>

            <h3 class="device-name">{{ device.name }}</h3>
            <h5 class="organization-name">{{ getOrganizationName(device.organization) }}</h5>

            <i
              :class="device.showSchedules ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"
              class="expand-arrow"
            ></i>
          </div>

          <transition name="fade">
            <div v-if="device.showSchedules" class="schedules-container">
              <div
                v-for="scheduleId in [1, 2, 3]"
                :key="scheduleId"
                class="schedule-template"
              >
                <h3>Расписание №{{ scheduleId }}</h3>

                <div v-if="device.schedules && device.schedules[scheduleId]">
                  <div class="enable-toggle">
                    <label class="switch">
                      <input
                        type="checkbox"
                        :checked="device.schedules[scheduleId].enable"
                        @change="toggleScheduleEnable(device, scheduleId, $event.target.checked)"
                      />
                      <span class="slider round"></span>
                    </label>
                    <span>
                      {{ device.schedules[scheduleId].enable ? 'Включено' : 'Выключено' }}
                    </span>
                  </div>

                  <div
                    class="weekplan-days"
                    v-if="device.schedules[scheduleId].weekPlan"
                  >
                    <div
                      v-for="(wpDay, idx) in device.schedules[scheduleId].weekPlan"
                      :key="idx"
                      class="weekplan-day"
                    >
                      <strong>{{ getRusDayName(wpDay.week) }}:</strong>
                      <span v-if="wpDay.enable"
                        >{{ wpDay.TimeSegment.beginTime }} - {{ wpDay.TimeSegment.endTime }}</span
                      >
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
      <p v-else>Нет доступных устройств.</p>
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
import axios from 'axios'
import api from '@/api'
import ScheduleEditModal from '@/components/ScheduleEditModal.vue'

export default {
  name: 'DeviceList',
  components: { ScheduleEditModal },
  data() {
    return {
      organizations: [],
      devices: [],
      loading: false,
      error: null,
      isRefreshing: false,

      // Для модалки редактирования
      isScheduleModalOpen: false,
      selectedDevice: null,
      selectedScheduleId: null
    }
  },
  async mounted() {
    try {
      await this.fetchOrganizations()
      await this.fetchDevices()
    } catch (err) {
      console.error('Ошибка в mounted:', err)
      this.error = err.message
    }
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
      return dayMap[engDay] || engDay
    },

    async fetchOrganizations() {
      try {
        const { data: user } = await axios.get('/api/user_info/')
        if (!user.organization) {
          console.warn('У пользователя не указана организация')
          this.organizations = []
          return
        }

        const userOrgId = user.organization.id
        const isMain = user.organization.is_main

        if (isMain) {
          // Главная организация => получаем всех дочерних
          const { data: orgs } = await axios.get(`/api/organizations/?parent_id=${userOrgId}`)
          this.organizations = orgs || []
        } else {
          // Дочерняя организация => используем только её
          this.organizations = [user.organization]
        }
      } catch (error) {
        console.error('Ошибка при загрузке организаций:', error)
        this.organizations = []
      }
    },

    getOrganizationName(orgId) {
      if (!orgId) return ''
      const foundOrg = this.organizations.find(o => o.id === orgId)
      return foundOrg ? foundOrg.name : `Орг. #${orgId}`
    },

    onRefreshClick() {
      this.error = null
      this.isRefreshing = true
      this.fetchDevices()
    },

    async fetchDevices() {
      this.loading = true
      this.error = null
      try {
        const { data } = await api.get('/api/devices/')
        this.devices = data || []

        // Подготовим поле schedules и showSchedules для каждой записи
        this.devices.forEach(dev => {
          dev.schedules = {}
          dev.showSchedules = false
        })

        // Сортируем по названию организации
        this.devices.sort((a, b) => {
          let nameA = (this.getOrganizationName(a.organization) || '').trim()
          let nameB = (this.getOrganizationName(b.organization) || '').trim()
          return nameA.localeCompare(nameB, 'ru', { sensitivity: 'base' })
        })

        await this.loadSchedulesForAllDevices()
      } catch (err) {
        this.error = err.response?.data?.detail || err.message
      } finally {
        this.loading = false
        this.isRefreshing = false
      }
    },

    async loadSchedulesForAllDevices() {
      // Для каждой device делаем сразу 3 запроса (schedule 1,2,3) через Promise.all
      // Чтобы не грузить данные последовательно.
      const scheduleIds = [1, 2, 3]
      const requests = this.devices.map(device => {
        return Promise.all(
          scheduleIds.map(id => this.fetchSchedule(device, id))
        )
      })
      try {
        await Promise.all(requests)
      } catch (err) {
        // Ловим общую ошибку, если где-то не подгрузились
        console.error('Ошибка при загрузке расписаний:', err)
      }
    },

    async fetchSchedule(device, scheduleId) {
      try {
        const { data } = await api.get(`/api/devices/${device.id}/schedule/${scheduleId}/`)
        const schedData = data.UserRightPlanTemplate || {}

        // Создаём запись под конкретный scheduleId
        device.schedules[scheduleId] = {
          enable: schedData.enable,
          templateName: schedData.templateName,
          weekPlanNo: schedData.weekPlanNo,
          holidayGroupNo: schedData.holidayGroupNo,
          weekPlan: []
        }

        if (schedData.weekPlanNo) {
          // Если есть weekPlanNo, грузим weekplan
          await this.fetchWeekPlan(device, scheduleId, schedData.weekPlanNo)
        }
      } catch (err) {
        // Если не загрузили, всё равно создадим заготовку
        console.error(`Ошибка при загрузке расписания ${scheduleId}:`, err)
        device.schedules[scheduleId] = {
          enable: false,
          templateName: '',
          weekPlanNo: null,
          holidayGroupNo: '',
          weekPlan: []
        }
      }
    },

    async fetchWeekPlan(device, scheduleId, weekPlanNo) {
      try {
        const { data } = await api.get(`/api/devices/${device.id}/weekplan/${weekPlanNo}/`)
        const weekPlanData = data.UserRightWeekPlanCfg
        if (weekPlanData && weekPlanData.WeekPlanCfg) {
          // Отфильтруем, если нужно, только элементы id===1
          const filteredDays = weekPlanData.WeekPlanCfg.filter(i => i.id === 1)
          device.schedules[scheduleId].weekPlan = filteredDays
        }
      } catch (err) {
        console.error('Ошибка при загрузке weekplan:', err)
        device.schedules[scheduleId].weekPlan = []
      }
    },

    async toggleScheduleEnable(device, scheduleId, newValue) {
      // Сохраняем старое значение, чтобы откатить, если запрос упадёт
      const oldValue = device.schedules[scheduleId].enable
      device.schedules[scheduleId].enable = newValue

      const { enable, templateName, weekPlanNo, holidayGroupNo } = device.schedules[scheduleId]
      const payload = {
        UserRightPlanTemplate: {
          enable,
          templateName,
          weekPlanNo,
          holidayGroupNo
        }
      }
      try {
        await api.put(`/api/devices/${device.id}/schedule/${scheduleId}/`, payload)
        console.log(`Schedule ${scheduleId} updated successfully`)
      } catch (err) {
        console.error(`Error updating schedule ${scheduleId}:`, err)
        device.schedules[scheduleId].enable = oldValue
      }
    },

    editSchedule(device, scheduleId) {
      this.selectedDevice = device
      this.selectedScheduleId = scheduleId
      this.isScheduleModalOpen = true
    },

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
/* Оставляем стили почти как есть */
.title {
  font-size: 28px;
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
  width: 80px;
  height: 4px;
  background: linear-gradient(to right, #42b983, #2c3e50);
  margin: 8px auto;
  border-radius: 2px;
}

@media (max-width: 768px) {
  .title {
    font-size: 22px;
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

.device-list {
  padding: 16px;
  background-color: #f9f9f9;
}

/* Карточки */
.device-card {
  background: #f8f9fa;
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
  cursor: pointer;
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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.device-icon {
  width: 80px;
  height: 40px;
}
.device-name {
  padding-left: 20px;
  margin: 0;
  font-size: 18px;
  font-weight: bold;
  color: #294358;
}
.expand-arrow {
  font-weight: bold;
  text-align: center;
}
.device-icon-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
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

/* Список расписаний */
.schedules-container {
  margin-top: 12px;
  padding: 8px;
  border-top: 1px dashed #ccc;
}
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

/* Тумблер */
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
  background-color: #42b983;
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

/* Кнопка "Обновить" */
.refresh-btn-wrapper {
  display: flex;
  justify-content: center;
  margin-bottom: 2rem;
}
.refresh-btn {
  background: #369d75;
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
.refresh-btn.refreshing .icon {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
