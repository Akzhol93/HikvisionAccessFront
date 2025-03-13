<template>
  <div class="report-bi">
    <h1 class="title">BI отчёт о посещении столовых</h1>

    <!-- Форма фильтров -->
    <form @submit.prevent="fetchEvents" class="filters-form">
      <fieldset>
        <legend>Фильтры</legend>
        <div class="form-container">

          <div class="form-group">
            <label for="orgSelect">Организация:</label>
            <select id="orgSelect" v-model="filters.organization">
              <option value="">Все</option>
              <option v-for="org in organizations" :value="org.id" :key="org.id">
                {{ org.name }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="dateFrom">Дата (с):</label>
            <input 
              type="datetime-local" 
              id="dateFrom" 
              v-model="filters.date_from" 
            />
          </div>

          <div class="form-group">
            <label for="dateTo">Дата (по):</label>
            <input 
              type="datetime-local" 
              id="dateTo" 
              v-model="filters.date_to" 
            />
          </div>

          <div class="form-group">
            <label for="device">ID устройства:</label>
            <input 
              type="number" 
              id="device" 
              v-model="filters.device" 
              placeholder="Введите ID устройства"
            />
          </div>

          <div class="form-group">
            <label for="name">ФИО:</label>
            <input 
              type="text" 
              id="name" 
              v-model="filters.name" 
              placeholder="Частичное совпадение"
            />
          </div>

          <div class="form-group">
            <label for="personID">ИИН:</label>
            <input 
              type="text" 
              id="personID" 
              v-model="filters.employeeNoString" 
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

    <!-- Блок с чекбоксами для выбора полей группировки -->
    <div 
      class="grouping-options" 
      v-if="!loading && !error && events.length"
    >
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
          <!-- В отдельной ячейке в заголовке можно добавить кнопку выгрузки: -->
          <th style="text-align: center;">
            <!-- Кнопка выгрузки в Excel (иконку замените на свою при желании) -->
            <button @click="downloadAsExcel" class="excel-download-btn">
              <img src="@/assets/download2.png" alt="Excel" width="20" />
            </button>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, index) in groupedEvents" :key="index">
          <td>{{ index + 1 }}</td>
          <td v-for="field in selectedGroupingFields" :key="field.key">
            {{ item[field.key] }}
          </td>
          <td>{{ item.count }}</td>
          <!-- Пустая ячейка, чтобы "совпадал" индекс столбцов с заголовком -->
          <td></td>
        </tr>
      </tbody>
    </table>

    <p v-else-if="!loading && !error">Нет данных для отображения.</p>

    <!-- Улучшенный блок с диаграммами -->
    <div class="chart-section" v-if="events.length">
      <h2 class="chart-title">Графическая аналитика посещаемости</h2>

      <div class="charts-container">
        <!-- Линейная диаграмма -->
        <div class="chart-card">
          <h3 class="chart-subtitle">Динамика посещений</h3>
          <apexchart
            type="line"
            height="350"
            width="100%"
            :options="chartOptionsLine"
            :series="chartSeriesLine"
          ></apexchart>
        </div>

        <!-- Круговая диаграмма -->
        <div class="chart-card">
          <h3 class="chart-subtitle">Распределение посещений</h3>
          <apexchart
            type="pie"
            height="350"
            width="100%"
            :options="chartOptionsPie"
            :series="chartSeriesPie"
          ></apexchart>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import axios from 'axios'
import api from '@/api'

// 1) Импортируем модули для Excel
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
        { key: 'organization_name', label: 'Организация',  selected: true },
        { key: 'month',             label: 'Месяц',        selected: true },
        { key: 'dateTime',          label: 'Дата',         selected: false },
        { key: 'device',            label: 'Устройство',   selected: false },
        { key: 'name',              label: 'ФИО',          selected: false },
        { key: 'employeeNoString',  label: 'ИИН',          selected: false },
      ],

      // Настройки для линейной диаграммы
      chartOptionsLine: {
        chart: {
          id: 'chart-line',
          toolbar: { show: true }
        },
        xaxis: {
          categories: [], // будет заполняться
          labels: { rotate: 0 }
        },
        yaxis: {
          title: { text: 'Количество' }
        },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth' },
        title: {
          text: 'Посещаемость по организациям во времени',
          align: 'left'
        }
      },
      chartSeriesLine: [],

      // Настройки для диаграммы Pie
      chartOptionsPie: {
        chart: { id: 'chart-pie' },
        labels: [],
        responsive: [{
          breakpoint: 480,
          options: {
            legend: { position: 'bottom' }
          }
        }],
        title: {
          text: 'Количество по организациям',
          align: 'left'
        }
      },
      chartSeriesPie: []
    }
  },
  mounted() {
    this.setDefaultDates()
    this.loadOrganizations()
  },
  computed: {
    // Сформированная "сводная" (grouped) таблица по выбранным полям
    groupedEvents() {
      if (!this.events || !this.events.length) return []
      const selectedCols = this.groupingFields
        .filter(field => field.selected)
        .map(field => field.key)

      if (!selectedCols.length) {
        return [{ count: this.events.length }]
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
      return this.groupingFields.filter(field => field.selected)
    }
  },
  methods: {
    setDefaultDates() {
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth()

      // создаём дату "первое число текущего месяца" на 00:00
      const firstDayOfMonth = new Date(year, month, 1, 0, 0)

      // преобразуем в формат YYYY-MM-DDTHH:mm
      this.filters.date_from = this.formatToDateTimeLocal(firstDayOfMonth)
      this.filters.date_to = this.formatToDateTimeLocal(now)
    },

    formatToDateTimeLocal(date) {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day}T${hours}:${minutes}`
    },
    resetFilters() {
      this.filters = {
        date_from: '',
        date_to: '',
        device: '',
        name: '',
        employeeNoString: '',
        organization: ''
      };
      this.setDefaultDates();
    },
    async loadOrganizations() {
      try {
        const userResponse = await axios.get('/api/user_info/');
        const user = userResponse.data;
        if (!user.organization) {
          console.warn('У пользователя не указана организация');
          this.organizations = [];
          return;
        }
        const userOrgId = user.organization.id;
        const isMain = user.organization.is_main;

        if (isMain) {
          const orgsResponse = await axios.get(`/api/organizations/?parent_id=${userOrgId}`);
          this.organizations = orgsResponse.data || [];
        } else {
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
      const months = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
      ]
      if (this.filters.date_from)        params.date_from        = this.toISO(this.filters.date_from)
      if (this.filters.date_to)          params.date_to          = this.toISO(this.filters.date_to)
      if (this.filters.device)           params.device           = this.filters.device
      if (this.filters.eventType)        params.eventType        = this.filters.eventType
      if (this.filters.name)             params.name             = this.filters.name
      if (this.filters.employeeNoString) params.employeeNoString = this.filters.employeeNoString
      if (this.filters.organization)     params.organization     = this.filters.organization

      api.get('/api/access-events/', { params })
        .then(response => {
          // Преобразуем дату (оставляем только год-месяц-день)
          response.data.forEach(event => {
            if (event.dateTime) {
              event.dateTime = event.dateTime.split('T')[0]

              const d = new Date(event.dateTime)
              event.month = `${d.getFullYear()} ${months[d.getMonth()]} `
            }
          })
          this.events = response.data
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
      // При необходимости подправьте под свой формат
      return datetimeLocal
    },

    isSameMonth(dateFrom, dateTo) {
      return (
        dateFrom.getFullYear() === dateTo.getFullYear() &&
        dateFrom.getMonth() === dateTo.getMonth()
      );
    },

    updateChartData() {
      if (!this.events || !this.events.length) {
        this.chartSeriesLine = []
        this.chartOptionsLine.xaxis.categories = []
        this.chartSeriesPie = []
        this.chartOptionsPie.labels = []
        return
      }

      const dateFrom = this.filters.date_from ? new Date(this.filters.date_from) : null
      const dateTo   = this.filters.date_to   ? new Date(this.filters.date_to)   : null

      let groupByDay = true
      if (dateFrom && dateTo && !this.isSameMonth(dateFrom, dateTo)) {
        groupByDay = false
      }

      const orgDateCountMap = {}

      this.events.forEach(ev => {
        const orgName = ev.organization_name || 'Без организации'
        let key
        if (groupByDay) {
          key = ev.dateTime.substring(0, 10) // YYYY-MM-DD
        } else {
          key = ev.dateTime.substring(0, 7)  // YYYY-MM
        }

        if (!orgDateCountMap[orgName]) {
          orgDateCountMap[orgName] = {}
        }
        orgDateCountMap[orgName][key] = (orgDateCountMap[orgName][key] || 0) + 1
      })

      // Собираем все даты (или месяцы) и сортируем
      const allDatesSet = new Set()
      for (const orgName in orgDateCountMap) {
        Object.keys(orgDateCountMap[orgName]).forEach(dateOrMonth => {
          allDatesSet.add(dateOrMonth)
        })
      }
      const allDatesSorted = Array.from(allDatesSet).sort()

      const series = []
      for (const orgName in orgDateCountMap) {
        const data = allDatesSorted.map(dateOrMonth => {
          return orgDateCountMap[orgName][dateOrMonth] || 0
        })
        series.push({
          name: orgName,
          data
        })
      }

      this.chartOptionsLine.xaxis.categories = allDatesSorted
      this.chartSeriesLine = series

      // Обновляем Pie Chart
      const countsByOrg = {}
      for (const ev of this.events) {
        const orgName = ev.organization_name || 'Без организации'
        countsByOrg[orgName] = (countsByOrg[orgName] || 0) + 1
      }
      const pieLabels = Object.keys(countsByOrg)
      const pieValues = Object.values(countsByOrg)

      this.chartOptionsPie.labels = pieLabels
      this.chartSeriesPie = pieValues
    },

    // 2) Метод для выгрузки именно "сгруппированной" таблицы groupedEvents в Excel
    async downloadAsExcel() {
      try {
        const workbook = new ExcelJS.Workbook()
        const worksheet = workbook.addWorksheet('GroupedEvents')

        // Формируем структуру колонок для Excel на основе выбранных полей
        // + отдельная колонка count
        const columns = [
          { header: '#', key: 'index', width: 5 }
        ]

        // Для каждой выбранной группировки добавим колонку
        this.selectedGroupingFields.forEach(field => {
          columns.push({
            header: field.label,
            key: field.key,
            width: 20
          })
        })

        // В конце добавим колонку для "Кол-во"
        columns.push({ header: 'Кол-во', key: 'count', width: 10 })

        worksheet.columns = columns

        // Заполняем строки
        this.groupedEvents.forEach((item, index) => {
          // Формируем объект в формате { index: 1, organization_name: '', dateTime: '', ... , count: N }
          const rowData = { index: index + 1 }
          // Подставляем значения по ключам
          this.selectedGroupingFields.forEach(field => {
            rowData[field.key] = item[field.key]
          })
          rowData.count = item.count

          worksheet.addRow(rowData)
        })

        // Сохраняем полученный Excel-файл
        const buffer = await workbook.xlsx.writeBuffer()
        saveAs(new Blob([buffer]), 'grouped_events.xlsx')
      } catch (error) {
        console.error('Ошибка при экспорте в Excel:', error)
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


.grouping-options {
  margin-top: 5rem;
  margin-bottom: 2rem;
}

.excel-table {
  border-collapse: collapse;
  width: 100%;
  font-family: Arial, sans-serif;
  margin-bottom: 10rem;
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


.chart-section {
  background: #ffffff;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  margin: 50px auto;
  max-width: 1200px;
}

.line-chart-block {
  margin-bottom: 5rem; 
}

.error {
  color: red;
}

/* Пример стиля для кнопки Excel */
.excel-download-btn {
  background: none;
  border: 1px solid #ccc;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}
.excel-download-btn:hover {
  background: #f0f0f0;
}


/* Форма */
.report-bi form {
  margin-top: 4rem;
  margin-bottom: 4rem;
  /* убираем лишний flex-стиль, заменяем на display: block
     поскольку выравнивать будем через max-width */
  display: block; 
  width: 100%;
}

.filters-form {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin: 0 auto;
  /* КЛЮЧ: ограничиваем макс. ширину и центрируем */
  max-width: 1000px; /* подберите нужное значение */
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

/* 
  Сетка для 2 строк по 3 поля на широком экране:
  По умолчанию (меньше 1000px) — одна колонка, 
  при ширине > 1000px — 3 колонки
*/
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

input, select {
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







.chart-title {
  font-size: 22px;
  font-weight: bold;
  text-align: center;
  color: #2c3e50;
  margin-bottom: 20px;
}

.charts-container {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}

/* Для широких экранов делаем 2 диаграммы в ряд */
@media (min-width: 900px) {
  .charts-container {
    grid-template-columns: repeat(2, 1fr);
  }
}

.chart-card {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.chart-subtitle {
  font-size: 18px;
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 10px;
}

</style>
