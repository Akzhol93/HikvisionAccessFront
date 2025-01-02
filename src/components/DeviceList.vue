<template>
  <div class="device-list">
    <h1>Список устройств</h1>

    <!-- Если идёт загрузка - показываем спиннер -->
    <div v-if="loading" class="loading">Загрузка...</div>

    <!-- Если ошибки -->
    <div v-if="error" class="error">
      Произошла ошибка: {{ error }}
    </div>

    <!-- Таблица устройств -->
    <table v-if="devices.length && !loading && !error">
      <thead>
        <tr>
          <th>ID</th>
          <th>Название</th>
          <th>IP</th>
          <th>Порт</th>
          <th>Статус</th>
          <th>Действия</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="device in devices" :key="device.id">
          <td>{{ device.id }}</td>
          <td>{{ device.name }}</td>
          <td>{{ device.ip_address }}</td>
          <td>{{ device.port_no }}</td>
          <td>{{ device.status || 'Offline' }}</td>
          <td>
            <!-- Пример: редактировать schedule -->
            <button @click="editSchedule(device)">Schedule</button>
            <!-- Пример: редактировать weekplan -->
            <button @click="editWeekPlan(device)">WeekPlan</button>
            <!-- Добавить другие действия -->
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Если список пуст, но нет загрузки/ошибки -->
    <p v-else-if="!loading && !error">
      Нет доступных устройств.
    </p>
  </div>
</template>

<script>
import api from '@/api'

export default {
  name: 'DeviceList',
  data() {
    return {
      devices: [],
      loading: false,
      error: null
    }
  },
  mounted() {
    this.fetchDevices()
  },
  methods: {
    fetchDevices() {
      this.loading = true
      this.error = null
      api.get('/api/devices/')
        .then((response) => {
          this.devices = response.data
          // Если бекенд не возвращает device.status, можно сделать отдельные запросы /ping:
          /*
          this.devices.forEach((dev) => {
             dev.status = 'Offline'
             // Или отправить запрос /api/devices/{dev.id}/ping — при успехе -> 'Online'
          })
          */
        })
        .catch((err) => {
          this.error = err.response?.data?.detail || err.message
        })
        .finally(() => {
          this.loading = false
        })
    },
    editSchedule(device) {
      // TODO: открыть модалку или перейти на отдельный роут
      alert(`Открыть редактирование schedule для устройства ID=${device.id}`)
    },
    editWeekPlan(device) {
      // TODO: аналогично
      alert(`Открыть редактирование weekplan для устройства ID=${device.id}`)
    }
  }
}
</script>

<style scoped>
.device-list {
  background-color: #fff;
  padding: 16px;
  border-radius: 8px;
}

.loading {
  font-weight: bold;
  margin-bottom: 10px;
}

.error {
  color: red;
  margin-bottom: 10px;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 16px;
}
thead {
  background-color: #f3f3f3;
}
th, td {
  padding: 8px;
  border: 1px solid #ccc;
  text-align: left;
}
th {
  font-weight: bold;
}
button {
  margin-right: 8px;
}
</style>
