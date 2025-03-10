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

    <!-- Таблица с результатами -->
    <table v-if="events.length" class="excel-table">
      <thead>
        <tr>
          <!-- Первая колонка - номер -->
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
          <!-- Пустая ячейка под последнюю "эксельную" колонку -->
          <td></td>
        </tr>
      </tbody>
    </table>

    <p v-else-if="!loading && !error">Нет данных для отображения.</p>
  </div>
</template>

<script>
import api from '@/api'
import axios from 'axios'

// <-- добавлено для экспорта в Excel
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
      error: null
    }
  },
  mounted() {
    this.loadOrganizations()
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
      this.loading = true;
      this.error = null;
      this.events = [];

      const params = {}
      if (this.filters.date_from) params.date_from = this.toISO(this.filters.date_from)
      if (this.filters.date_to) params.date_to = this.toISO(this.filters.date_to)
      if (this.filters.device) params.device = this.filters.device
      if (this.filters.eventType) params.eventType = this.filters.eventType
      if (this.filters.name) params.name = this.filters.name
      if (this.filters.employeeNoString) params.employeeNoString = this.filters.employeeNoString
      if (this.filters.organization) params.organization = this.filters.organization

      api
        .get('/api/access-events/', { params })
        .then(response => {
          this.events = response.data
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
      // Вернём без изменений (или адаптируйте под ваш формат, если нужно)
      return datetimeLocal
    },

    // Метод для выгрузки в Excel
    async downloadAsExcel() {
      try {
        const workbook = new ExcelJS.Workbook()
        const worksheet = workbook.addWorksheet('Events')

        // Заголовок
        worksheet.addRow([
          '#',
          'Organization',
          'dateTime',
          'device',
          'eventType',
          'name',
          'employeeNoString'
        ])

        // Данные
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

        // Сохраняем
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

/* Кнопка Excel */
.excel-download-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
}

/* Стили таблицы "как в PersonList.vue" */
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

/* Стили формы */
.report-bi form {
  margin-top: 4rem;
  margin-bottom: 4rem;
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
</style>
