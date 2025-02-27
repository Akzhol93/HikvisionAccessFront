<template>
  <div class="report-bi">
    <h1 class="title">Отчёт о посещении столовых</h1>

    <!-- Форма фильтров -->
    <form @submit.prevent="fetchEvents">
      <div>
        <label for="orgSelect">Организация:</label>
        <select id="orgSelect" v-model="filters.organization">
          <option value="">Все</option>
          <option v-for="org in organizations" :value="org.id" :key="org.id">
            {{ org.name }}
          </option>
        </select>
      </div>

      <div>
        <label for="dateFrom">Дата (с):</label>
        <input 
          type="datetime-local" 
          id="dateFrom" 
          v-model="filters.date_from" 
        />
      </div>

      <div>
        <label for="dateTo">Дата (по):</label>
        <input 
          type="datetime-local" 
          id="dateTo" 
          v-model="filters.date_to" 
        />
      </div>

      <div>
        <label for="device">ID устройства:</label>
        <input 
          type="number" 
          id="device" 
          v-model="filters.device" 
          placeholder="Введите ID устройства"
        />
      </div>

      <!-- <div>
        <label for="eventType">Событие:</label>
        <input 
          type="text" 
          id="eventType" 
          v-model="filters.eventType" 
          placeholder="Например: access"
        />
      </div> -->
      <div>
        <label for="name">ФИО:</label>
        <input 
          type="text" 
          id="name" 
          v-model="filters.name" 
          placeholder="Частичное совпадение"
        />
      </div>
      <div>
        <label for="personID">ИИН:</label>
        <input 
          type="text" 
          id="personID" 
          v-model="filters.employeeNoString" 
          placeholder="Частичное совпадение"
        />
      </div>
      <button type="submit">Показать</button>
    </form>

    <!-- Показать статус загрузки / ошибку -->
    <div v-if="loading">Загрузка...</div>
    <div v-if="error" class="error">Ошибка: {{ error }}</div>

    <!-- Таблица с результатами (стиль как в PersonList.vue) -->
    <table v-if="events.length" class="excel-table"> <!-- <-- изменено -->
      <thead>
        <tr>
          <!-- Как в PersonList: первая колонка - номер -->
          <th>#</th>
          <th>Организация</th>
          <th>Время</th>
          <th>Устроиство</th>
          <!-- <th>Событие</th> -->
          <th>ФИО</th>
          <th>ИИН</th>
          <!-- Кнопка выгрузки в Excel -->
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
          <!-- <td>{{ event.eventType }}</td> -->
          <td>{{ event.name }}</td>
          <td>{{ event.employeeNoString }}</td>
          <!-- пустая ячейка под последнюю "эксельную" колонку -->
          <td></td>
        </tr>
      </tbody>
    </table>
    <p v-else-if="!loading && !error">Нет данных для отображения.</p>

    <!-- Простейшая диаграмма по eventType (client-side) -->
    <div class="chart-section" v-if="chartData">
      <h3>Количество событий по eventType</h3>
      <canvas id="eventsChart"></canvas>
    </div>
  </div>
</template>

<script>
import api from '@/api'
// chart.js
import { Chart, BarElement, CategoryScale, LinearScale, BarController } from 'chart.js'
Chart.register(BarElement, CategoryScale, LinearScale, BarController)

// <-- добавлено для экспорта в Excel
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import axios from 'axios'

export default {
  name: 'ReportDetail',
  data() {
    return {
      filters: {
        date_from: '',
        date_to: '',
        device: '',
        eventType: '',
        name: '',
        employeeNoString: '',
        organization: ''
      },
      events: [],
      organizations: [],
      loading: false,
      error: null,
      chart: null // будем хранить инстанс Chart
    }
  },
  mounted() {
    this.loadOrganizations()
  },
  computed: {
    chartData() {
      if (!this.events.length) return null
      const counts = {}
      for (const e of this.events) {
        const etype = e.eventType || 'Unknown'
        counts[etype] = (counts[etype] || 0) + 1
      }
      const labels = Object.keys(counts)
      const data = Object.values(counts)
      return { labels, data }
    }
  },
  methods: {
    async loadOrganizations() {
      try {
        // 1) Получаем информацию о текущем пользователе
        const userResponse = await axios.get('/api/user_info/');
        const user = userResponse.data;

        if (!user.organization) {
          console.warn('У пользователя не указана организация');
          this.organizations = [];
          this.selectedOrganizations = [];
          return;
        }
        const userOrgId = user.organization.id;
        const isMain = user.organization.is_main;

        // 2) Если это главная организация -> получить список дочерних
        if (isMain) {
          const orgsResponse = await axios.get(`/api/organizations/?parent_id=${userOrgId}`);
          this.organizations = orgsResponse.data || [];

        } else {
          // 3) Иначе пользователь в дочерней -> единственная организация
          this.organizations = [user.organization];
        }
      } catch (error) {
        console.error('Ошибка при загрузке организаций:', error);
        this.organizations = [];
        this.selectedOrganizations = [];
      }
    },
    fetchEvents() {
      this.loading = true
      this.error = null
      this.events = []

      const params = {}
      if (this.filters.date_from) params.date_from = this.toISO(this.filters.date_from)
      if (this.filters.date_to) params.date_to = this.toISO(this.filters.date_to)
      if (this.filters.device) params.device = this.filters.device
      if (this.filters.eventType) params.eventType = this.filters.eventType
      if (this.filters.name) params.name = this.filters.name
      if (this.filters.employeeNoString) params.employeeNoString = this.filters.employeeNoString
      if (this.filters.organization) params.organization = this.filters.organization

      api.get('/api/access-events/', { params })
        .then(response => {
          this.events = response.data
          // Обновим/пересоздадим график
          this.$nextTick(() => {
            this.renderChart()
          })
        })
        .catch(err => {
          this.error = err.response?.data?.detail || err.message
        })
        .finally(() => {
          this.loading = false
        })
    },
    toISO(datetimeLocal) {
      // datetimeLocal в формате "2025-01-01T14:00"
      // Вернём без изменений (либо доработайте под ваш формат, если нужно)
      return datetimeLocal
    },
    renderChart() {
      if (this.chart) {
        this.chart.destroy()
        this.chart = null
      }
      if (!this.chartData) return

      const ctx = document.getElementById('eventsChart')
      this.chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: this.chartData.labels,
          datasets: [
            {
              label: 'Кол-во событий по eventType',
              data: this.chartData.data,
              backgroundColor: 'rgba(75, 192, 192, 0.6)'
            }
          ]
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      })
    },

    // <-- добавлено: метод для выгрузки в Excel
    async downloadAsExcel() {
      try {
        const workbook = new ExcelJS.Workbook()
        const worksheet = workbook.addWorksheet('Events')

        // 1) Заголовок
        worksheet.addRow([
          '#',
          'Organization',
          'dateTime',
          'device',
          'eventType',
          'name',
          'employeeNoString'
        ])

        // 2) Данные
        this.events.forEach((ev, index) => {
          worksheet.addRow([
            index + 1,
            ev.organization_name,
            ev.dateTime,
            ev.device,
            ev.eventType,
            ev.name,
            ev.employeeNoString
          ])
        })

        // 3) Сохраняем
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
  color: #294358;;
  margin-top: 2rem;
  margin-bottom: 4rem;
  text-align: center;
}
/* Убираем старый стиль для таблицы, если был, 
   и переносим стили из PersonList.vue: */

/* Кнопка Excel (при желании можно оформить по-своему) */
.excel-download-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
}

/* Стили таблицы "как в PersonList.vue" */
.excel-table {
  border-collapse: collapse;  /* Убираем двойные границы */
  width: 100%;
  font-family: Arial, sans-serif; /* Или любая другая */
}

.excel-table th,
.excel-table td {
  border: 1px solid #d0d0d0; /* Серые границы, как в Excel */
  padding: 8px;
  text-align: left;
}

.excel-table thead {
  background-color: #f0f0f0; /* светло-серый фон для заголовков */
}

.excel-table tr:nth-child(even) td {
  background-color: #fafafa; /* полосатые строки */
}

.excel-table tr:hover td {
  background-color: #e8f0fe; /* подсветка при hover */
}

/* Можно оставить/адаптировать стили формы: */
.report-bi form {
  margin-top: 4rem;
  margin-bottom: 4rem;
  display: flex;
  flex-wrap: wrap; 
  /* flex-direction: row; */
  gap: 10px;
}
.report-bi form div {
  display: flex;
  flex-direction: column;
}

.error {
  color: red;
}

/* Диаграмма */
.chart-section {
  margin-top: 20px;
  width: 400px; 
}
</style>
