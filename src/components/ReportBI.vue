<template>
    <div class="report-bi">
      <h2>BI отчёт по событиям</h2>
      
      <!-- Форма фильтров -->
      <form @submit.prevent="fetchEvents">
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
          <label for="device">Device ID:</label>
          <input 
            type="number" 
            id="device" 
            v-model="filters.device" 
            placeholder="Введите ID устройства"
          />
        </div>
        <div>
          <label for="eventType">eventType:</label>
          <input 
            type="text" 
            id="eventType" 
            v-model="filters.eventType" 
            placeholder="Например: access"
          />
        </div>
        <div>
          <label for="name">Person Name:</label>
          <input 
            type="text" 
            id="name" 
            v-model="filters.name" 
            placeholder="Частичное совпадение"
          />
        </div>
        <div>
          <label for="personID">Person ID (employeeNoString):</label>
          <input 
            type="text" 
            id="personID" 
            v-model="filters.employeeNoString" 
          />
        </div>
        
        <button type="submit">Показать</button>
      </form>
  
      <!-- Показать статус загрузки / ошибку -->
      <div v-if="loading">Загрузка...</div>
      <div v-if="error" class="error">Ошибка: {{ error }}</div>
  
      <!-- Таблица с результатами -->
      <table v-if="events.length">
        <thead>
          <tr>
            <th>ID</th>
            <th>dateTime</th>
            <th>device</th>
            <th>eventType</th>
            <th>name</th>
            <th>employeeNoString</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="event in events" :key="event.id">
            <td>{{ event.id }}</td>
            <td>{{ event.dateTime }}</td>
            <td>{{ event.device }}</td>
            <td>{{ event.eventType }}</td>
            <td>{{ event.name }}</td>
            <td>{{ event.employeeNoString }}</td>
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
  // Подключим chart.js (или можно любой другой график)
  import { Chart, BarElement, CategoryScale, LinearScale } from 'chart.js'
  Chart.register(BarElement, CategoryScale, LinearScale)
  
  export default {
    name: 'ReportBI',
    data() {
      return {
        filters: {
          date_from: '',
          date_to: '',
          device: '',
          eventType: '',
          name: '',
          employeeNoString: ''
        },
        events: [],
        loading: false,
        error: null,
        chart: null // будем хранить инстанс Chart
      }
    },
    computed: {
      chartData() {
        // Если нет events, вернём null
        if (!this.events.length) return null
  
        // Подсчитаем, сколько событий на каждый eventType
        const counts = {}
        for (const e of this.events) {
          const etype = e.eventType || 'Unknown'
          counts[etype] = (counts[etype] || 0) + 1
        }
        // Преобразуем в массив для графика
        const labels = Object.keys(counts)
        const data = Object.values(counts)
        return { labels, data }
      }
    },
    methods: {
      fetchEvents() {
        this.loading = true
        this.error = null
        this.events = []
  
        // Формируем query params
        const params = {}
        if (this.filters.date_from) params.date_from = this.toISO(this.filters.date_from)
        if (this.filters.date_to) params.date_to = this.toISO(this.filters.date_to)
        if (this.filters.device) params.device = this.filters.device
        if (this.filters.eventType) params.eventType = this.filters.eventType
        if (this.filters.name) params.name = this.filters.name
        if (this.filters.employeeNoString) params.employeeNoString = this.filters.employeeNoString
  
        api.get('/api/access-events/', { params })
          .then(response => {
            this.events = response.data
            // Обновим/пересоздадим график
            this.renderChart()
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
        // Допустим, просто вернём без изменений (зависит от бэка)
        return datetimeLocal
      },
      renderChart() {
        // Если уже существует старый график - уничтожим
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
            datasets: [{
              label: 'Кол-во событий по eventType',
              data: this.chartData.data,
              backgroundColor: 'rgba(75, 192, 192, 0.6)',
            }]
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
      }
    }
  }
  </script>
  
  <style scoped>
  .report-bi form {
    margin-bottom: 1rem;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  
  .report-bi form div {
    display: flex;
    flex-direction: column;
  }
  
  .error {
    color: red;
  }
  
  table {
    border-collapse: collapse;
    margin-top: 16px;
  }
  th, td {
    border: 1px solid #ccc;
    padding: 6px 8px;
  }
  .chart-section {
    margin-top: 20px;
    width: 400px; /* Можно подогнать ширину под себя */
  }
  </style>
  