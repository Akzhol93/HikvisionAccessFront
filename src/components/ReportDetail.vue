<template>
  <div class="report-bi">
    <h1 class="title">Детальный отчёт о посещении столовых</h1>

    <!-- Форма фильтров -->
    <form @submit.prevent="fetchEvents" class="filters-form">
      <fieldset>
        <legend>Фильтры</legend>

        <div class="form-container">
          <!-- Организация -->
          <div class="form-group">
            <label for="orgSelect">Организация:</label>
            <select id="orgSelect" v-model="filters.organization">
              <option value="">Все</option>
              <option
                v-for="org in organizations"
                :value="org.id"
                :key="org.id"
              >
                {{ org.name }}
              </option>
            </select>
          </div>

          <!-- Дата с -->
          <div class="form-group">
            <label for="dateFrom">Дата (с):</label>
            <input
              type="datetime-local"
              id="dateFrom"
              v-model="filters.date_from"
            />
          </div>

          <!-- Дата по -->
          <div class="form-group">
            <label for="dateTo">Дата (по):</label>
            <input
              type="datetime-local"
              id="dateTo"
              v-model="filters.date_to"
            />
          </div>

          <!-- Устройство -->
          <div class="form-group">
            <label for="device">ID устройства:</label>
            <input
              type="number"
              id="device"
              v-model.number="filters.device"
              placeholder="Введите ID устройства"
            />
          </div>

          <!-- ФИО -->
          <div class="form-group">
            <label for="name">ФИО:</label>
            <input
              type="text"
              id="name"
              v-model.trim="filters.name"
              placeholder="Частичное совпадение"
            />
          </div>

          <!-- ИИН -->
          <div class="form-group">
            <label for="personID">ИИН:</label>
            <input
              type="text"
              id="personID"
              v-model.trim="filters.employeeNoString"
              placeholder="Частичное совпадение"
            />
          </div>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn-primary">Показать</button>
          <button type="button" @click="resetFilters" class="btn-secondary">
            Сбросить
          </button>
        </div>
      </fieldset>
    </form>

    <!-- Статусы загрузки / ошибки -->
    <div v-if="loading">Загрузка...</div>
    <div v-if="error" class="error">Ошибка: {{ error }}</div>

    <!-- Таблица результатов -->
    <table v-if="events.length" class="excel-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Организация</th>
          <th>Время</th>
          <th>Устройство</th>
          <th>ФИО</th>
          <th>ИИН</th>
          <th style="text-align: center;">
            <button @click="downloadAsExcel" class="excel-download-btn">
              <img src="@/assets/download2.png" alt="Excel" width="20" />
            </button>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(event, index) in events" :key="event.id">
          <td>{{ index + 1 }}</td>
          <td>{{ event.organization_name }}</td>
          <td>{{ event.dateTime }}</td>
          <td>{{ event.device }}</td>
          <td>{{ event.name }}</td>
          <td>{{ event.employeeNoString }}</td>
          <td></td>
        </tr>
      </tbody>
    </table>

    <!-- Если данных нет -->
    <p v-else-if="!loading && !error">Нет данных для отображения.</p>
  </div>
</template>

<script>
import axios from 'axios'
import api from '@/api' // Если это ваш уже настроенный axios-инстанс
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

export default {
  name: 'ReportDetail',

  data() {
    return {
      filters: {
        date_from: '',
        date_to: '',
        device: '',
        name: '',
        employeeNoString: '',
        organization: ''
      },
      events: [],
      organizations: [],
      loading: false,
      error: null
    }
  },

  mounted() {
    this.setDefaultDates()
    this.loadOrganizations()
  },

  methods: {
    // Устанавливаем даты по умолчанию: с начала месяца по текущее время
    setDefaultDates() {
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth()
      // Первое число текущего месяца
      const firstDayOfMonth = new Date(year, month, 1, 0, 0)
      // Форматируем под datetime-local
      this.filters.date_from = this.formatToDateTimeLocal(firstDayOfMonth)
      this.filters.date_to = this.formatToDateTimeLocal(now)
    },

    // Форматирует Date -> YYYY-MM-DDTHH:mm
    formatToDateTimeLocal(date) {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day}T${hours}:${minutes}`
    },

    // Сброс фильтров к изначальному состоянию
    resetFilters() {
      this.filters = {
        date_from: '',
        date_to: '',
        device: '',
        name: '',
        employeeNoString: '',
        organization: ''
      }
      this.setDefaultDates()
    },

    // Загружаем организации в зависимости от прав пользователя
    async loadOrganizations() {
      try {
        const { data: user } = await axios.get('/api/user_info/')
        if (!user?.organization) {
          console.warn('У пользователя не указана организация')
          this.organizations = []
          return
        }
        const userOrgId = user.organization.id
        const isMain = user.organization.is_main

        if (isMain) {
          const { data: orgs } = await axios.get(
            `/api/organizations/?parent_id=${userOrgId}`
          )
          this.organizations = orgs || []
        } else {
          this.organizations = [user.organization]
        }
      } catch (error) {
        console.error('Ошибка при загрузке организаций:', error)
        this.organizations = []
      }
    },

    // Получение событий с сервера
    async fetchEvents() {
      this.loading = true
      this.error = null
      this.events = []

      try {
        const params = {
          // Если значение не пустое, отправляем в запрос
          ...(this.filters.date_from && { date_from: this.filters.date_from }),
          ...(this.filters.date_to && { date_to: this.filters.date_to }),
          ...(this.filters.device && { device: this.filters.device }),
          ...(this.filters.name && { name: this.filters.name }),
          ...(this.filters.employeeNoString && {
            employeeNoString: this.filters.employeeNoString
          }),
          ...(this.filters.organization && {
            organization: this.filters.organization
          })
        }

        const { data } = await api.get('/api/access-events/', { params })
        this.events = data
      } catch (err) {
        this.error = err.response?.data?.detail || err.message
      } finally {
        this.loading = false
      }
    },

    // Экспорт данных в Excel
    async downloadAsExcel() {
      try {
        const workbook = new ExcelJS.Workbook()
        const worksheet = workbook.addWorksheet('Events')

        // Заголовки
        worksheet.addRow([
          '#',
          'Организация',
          'Время',
          'Устройство',
          'ФИО',
          'ИИН'
        ])

        // Данные
        this.events.forEach((ev, index) => {
          worksheet.addRow([
            index + 1,
            ev.organization_name,
            ev.dateTime,
            ev.device,
            ev.name,
            ev.employeeNoString
          ])
        })

        // Генерируем файл и сохраняем
        const buffer = await workbook.xlsx.writeBuffer()
        saveAs(new Blob([buffer]), 'events.xlsx')
      } catch (error) {
        console.error('Ошибка при экспорте в Excel:', error)
      }
    }
  }
}
</script>

<style scoped>
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

/* Кнопка Excel */
.excel-download-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
}

/* Таблица */
.excel-table {
  border-collapse: collapse;
  width: 100%;
  font-family: Arial, sans-serif;
}

.excel-table th,
.excel-table td {
  border: 1px solid #d0d0d0;
  padding: 8px;
  text-align: left;
}

.excel-table thead {
  background-color: #f0f0f0;
}

.excel-table tr:nth-child(even) td {
  background-color: #fafafa;
}

.excel-table tr:hover td {
  background-color: #e8f0fe;
}

/* Форма */
.report-bi form {
  margin-top: 4rem;
  margin-bottom: 4rem;
  display: block;
  width: 100%;
}

.filters-form {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin: 0 auto;
  max-width: 1000px;
  box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
}

fieldset {
  border: none;
  padding: 0;
  margin: 0;
}

legend {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 15px;
  color: #2c3e50;
}

.error {
  color: red;
}

/* Сетка для полей (2 строки по 3 поля) */
.form-container {
  display: grid;
  grid-template-columns: 1fr;
  gap: 15px;
}

@media (min-width: 1000px) {
  .form-container {
    grid-template-columns: repeat(3, 1fr);
  }
}

.form-group {
  display: flex;
  flex-direction: column;
}

label {
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 5px;
  color: #333;
}

input,
select {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
}

.form-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
}

.btn-primary {
  background: #42b983;
  color: white;
  padding: 8px 16px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.btn-secondary {
  background: #ccc;
  color: black;
  padding: 8px 16px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.btn-primary:hover {
  background: #369d75;
}

.btn-secondary:hover {
  background: #bbb;
}
</style>
