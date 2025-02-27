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

    <!-- Блок с чекбоксами для выбора полей группировки -->
    <div class="grouping-options">
      <span>Группировать по:</span>
      <label
        v-for="field in groupingFields"
        :key="field.key"
        style="margin-left: 10px;"
      >
        <input type="checkbox" v-model="field.selected" />
        {{ field.label }}
      </label>
    </div>

    <!-- Показать статус загрузки / ошибку -->
    <div v-if="loading">Загрузка...</div>
    <div v-if="error" class="error">Ошибка: {{ error }}</div>

    <!-- Таблица с группировкой -->
    <table v-if="groupedEvents.length" class="excel-table">
      <thead>
        <tr>
          <th>#</th>
          <!-- Генерируем столбцы только для выбранных полей -->
          <th v-for="field in selectedGroupingFields" :key="field.key">
            {{ field.label }}
          </th>
          <th>Кол-во</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, index) in groupedEvents" :key="index">
          <td>{{ index + 1 }}</td>
          <td v-for="field in selectedGroupingFields" :key="field.key">
            {{ item[field.key] }}
          </td>
          <td>{{ item.count }}</td>
        </tr>
      </tbody>
    </table>

    <p v-else-if="!loading && !error">Нет данных для отображения.</p>

    <!-- Блок с диаграммами (ApexCharts) -->
    <div class="chart-section" v-if="events.length">
      <!-- 1) Столбчатая диаграмма по eventType -->
      <h3>Распределение событий по типам (Bar)</h3>
      <apexchart
        type="bar"
        height="350"
        :options="chartOptionsBar"
        :series="chartSeriesBar"
      ></apexchart>

      <!-- 2) Круговая диаграмма по организациям -->
      <h3>Распределение событий по организациям (Pie)</h3>
      <apexchart
        type="pie"
        height="350"
        :options="chartOptionsPie"
        :series="chartSeriesPie"
      ></apexchart>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import api from '@/api'

// Если нужно поддерживать Chart.js - не забудьте убрать или оставить
// import { Chart, BarElement, CategoryScale, LinearScale, BarController } from 'chart.js'
// Chart.register(BarElement, CategoryScale, LinearScale, BarController)

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

      // Группировка по полям
      groupingFields: [
        { key: 'organization_name', label: 'Организация', selected: true },
        { key: 'dateTime',          label: 'Дата',         selected: true },
        { key: 'device',            label: 'Устройство',   selected: true },
        { key: 'name',              label: 'ФИО',          selected: true },
        { key: 'employeeNoString',  label: 'ИИН',          selected: true },
      ],

      // Настройки для диаграмм (Bar и Pie)
      chartOptionsBar: {
        chart: {
          id: 'chart-bar',
          toolbar: {
            show: true
          }
        },
        xaxis: {
          categories: [],
          labels: {
            rotate: 0
          }
        },
        plotOptions: {
          bar: {
            horizontal: false,
          }
        },
        dataLabels: {
          enabled: true
        },
        title: {
          text: 'События по типам',
          align: 'left'
        }
      },
      chartSeriesBar: [],

      chartOptionsPie: {
        chart: {
          id: 'chart-pie'
        },
        labels: [],
        responsive: [{
          breakpoint: 480,
          options: {
            legend: {
              position: 'bottom'
            }
          }
        }],
        title: {
          text: 'События по организациям',
          align: 'left'
        }
      },
      chartSeriesPie: []
    }
  },
  mounted() {
    this.loadOrganizations()
  },
  computed: {
    // Вычисляемая сводная таблица
    groupedEvents() {
      if (!this.events || !this.events.length) return []

      const selectedCols = this.groupingFields
        .filter(field => field.selected)
        .map(field => field.key)

      if (!selectedCols.length) {
        return [{
          count: this.events.length
        }]
      }

      const map = {}

      for (const ev of this.events) {
        // Формируем ключ для группировки
        const keyValues = selectedCols.map(col => ev[col] || '')
        const groupKey = keyValues.join('||') // разделитель

        if (!map[groupKey]) {
          const groupObj = { count: 0 }
          selectedCols.forEach(col => {
            groupObj[col] = ev[col]
          })
          map[groupKey] = groupObj
        }
        map[groupKey].count++
      }

      return Object.values(map)
    },
    selectedGroupingFields() {
      return this.groupingFields.filter(field => field.selected);
    },
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
          // Преобразуем поле dateTime у каждого события
          response.data.forEach(event => {
            if (event.dateTime) {
              // например, в формат YYYY-MM-DD
              event.dateTime = event.dateTime.split('T')[0]
            }
          })

          this.events = response.data
          // Обновляем данные для диаграмм
          this.updateChartData()
        })
        .catch(err => {
          this.error = err.response?.data?.detail || err.message
        })
        .finally(() => {
          this.loading = false
        })
    },

    toISO(datetimeLocal) {
      // Можно подправить логику, если нужно точное преобразование
      return datetimeLocal
    },

    // Собираем данные и записываем в chartSeriesBar, chartSeriesPie
    updateChartData() {
      if (!this.events || !this.events.length) {
        this.chartSeriesBar = []
        this.chartSeriesPie = []
        return
      }

      // 1) Бар-диаграмма: группировка по eventType
      const countsByEventType = {}
      for (const ev of this.events) {
        const etype = ev.eventType || 'Unknown'
        countsByEventType[etype] = (countsByEventType[etype] || 0) + 1
      }
      const barLabels = Object.keys(countsByEventType)
      const barValues = Object.values(countsByEventType)

      // Обновляем опции
      this.chartOptionsBar.xaxis.categories = barLabels
      this.chartSeriesBar = [
        {
          name: 'Кол-во событий',
          data: barValues
        }
      ]

      // 2) Pie-диаграмма: группировка по organization_name
      const countsByOrg = {}
      for (const ev of this.events) {
        const orgName = ev.organization_name || 'Без организации'
        countsByOrg[orgName] = (countsByOrg[orgName] || 0) + 1
      }

      const pieLabels = Object.keys(countsByOrg)
      const pieValues = Object.values(countsByOrg)

      this.chartOptionsPie.labels = pieLabels
      this.chartSeriesPie = pieValues
    }
  }
}
</script>

<style scoped>
.title {
  color: #294358;
  margin-top: 2rem;
  margin-bottom: 4rem;
  text-align: center;
}

/* Форма */
.report-bi form {
  margin-top: 4rem;
  margin-bottom: 2rem;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.report-bi form div {
  display: flex;
  flex-direction: column;
}

/* Чекбоксы группировки */
.grouping-options {
  margin-bottom: 2rem;
}

/* Таблица "excel-table" */
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

/* Диаграмма */
.chart-section {
  margin-top: 20px;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
}

.error {
  color: red;
}
</style>

<!-- ц -->
