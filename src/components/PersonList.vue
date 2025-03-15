<template>
  <div>
    <h1 class="title">Список персон</h1>

    <!-- Фильтры -->
    <div class="filter">
      <div class="org-selector filter-item">
        <label>1. Выберите организацию:</label>
        <CustomMultiSelect
          v-model="selectedOrganizations"
          :options="organizations"
          label-prop="name"
          option-key-prop="id"
          @change="handleSelectionChange"
        />
      </div>

      <div class="device-selector filter-item">
        <label>2. Выберите устройства:</label>
        <CustomMultiSelect
          v-model="selectedDevices"
          :options="filteredDevices"
          label-prop="name"
          option-key-prop="id"
          :disabled="selectedOrganizations.length === 0"
          @update:modelValue="handleSelectionChange"
        />
      </div>

      <div class="iinSearch filter-item">
        <label for="iinSearch">3. Поиск по ИИН:</label>
        <input
          id="iinSearch"
          v-model="searchIin"
          type="text"
          placeholder="Введите ИИН для поиска"
          :disabled="selectedDevices.length === 0"
        />
      </div>
    </div>

    <!-- Кнопка обновления списка персон -->
    <button
      v-if="selectedDevices.length > 0"
      @click="fetchPersons"
      class="refresh-btn"
    >
      <img src="@/assets/update.png" alt="Обновить" class="icon" />
      Обновить таблицу
    </button>

    <!-- Кнопка Добавить -->
    <button @click="showAddModal = true" class="add-person-btn">
      + Добавить
    </button>

    <!-- Состояния: загрузка / ошибка / нет данных / таблица -->
    <div v-if="isLoading">
      <p>Загрузка...</p>
    </div>
    <div v-else-if="isError">
      <p>Произошла ошибка: {{ errorMessage }}</p>
    </div>
    <div v-else-if="persons.length === 0">
      <p>Нет персон (или не выбрано устройство).</p>
    </div>
    <div v-else>
      <!-- Таблица -->
      <table class="excel-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Организация</th>
            <th>Устройство</th>
            <th>Класс</th> 
            <th>Фото</th>
            <th>ИИН</th>
            <th>Имя</th>
            <th>Тип пользователя</th>
            <th>№ графика</th>
            <th style="text-align: center;">
              <button @click="downloadAsExcel" class="excel-download-btn">
                <img src="@/assets/download2.png" alt="Excel" width="20" />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(person, index) in paginatedPersons" :key="index">
            <td>{{ indexOnPage(index) }}</td>
            <td>{{ getOrganizationName(person.organization_id) }}</td>
            <td>{{ person.device_name }}</td>
            <td>{{ person.belongGroup }}</td>
            <!-- Фото -->
            <td>
              <img
                v-if="person.faceImageData"
                :src="person.faceImageData"
                alt="Фото"
                width="50"
              />
              <button v-else @click="loadPhoto(person)">Показать фото</button>
            </td>
            <td>{{ person.employeeNo }}</td>
            <td>{{ person.name }}</td>
            <td>{{ person.userType }}</td>
            <td>
              <span v-if="person.RightPlan && person.RightPlan.length > 0">
                [ {{ person.RightPlan.map(item => item.planTemplateNo).join(', ') }} ]
              </span>
              <span v-else>Нет планов</span>
            </td>
            <td class="actions-td">
              <button class="edit-btn" @click="openEditModal(person)">
                <img src="@/assets/edit.png" alt="Edit" width="20" />
              </button>
              <button class="delete-btn" @click="deletePerson(person)">
                <img src="@/assets/delete.png" alt="Delete" width="20" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Пагинация -->
      <div class="paginator">
        <div class="paginator-line">
          <label for="pageSize">Кол-во записей на странице:</label>
          <select v-model="pageSize" id="pageSize">
            <option :value="50">50</option>
            <option :value="100">100</option>
            <option :value="250">250</option>
            <option :value="500">500</option>
          </select>
        </div>

        <!-- Первая строка: кнопки и номер страницы -->
        <div class="paginator-line">
          <button @click="prevPage" :disabled="currentPage === 1">
            Предыдущая
          </button>
          <span>Страница {{ currentPage }} из {{ totalPages }}</span>
          <button @click="nextPage" :disabled="currentPage === totalPages">
            Следующая
          </button>
        </div>
      </div>
    </div>

    <!-- Модальное окно: Добавление -->
    <AddPersonModal
      v-if="showAddModal"
      @close="showAddModal = false"
      @personCreated="handlePersonCreated"
    />

    <!-- Модальное окно: Редактирование -->
    <PersonEditModal
      v-if="editModalVisible"
      :device-id="editedPerson?.device_id"
      :person="editedPerson"
      @close="editModalVisible = false"
      @saved="handlePersonSaved"
    />
  </div>
</template>

<script>
import axios from 'axios'
import PersonEditModal from './PersonEditModal.vue'
import AddPersonModal from './AddPersonModal.vue'
import 'vue-select/dist/vue-select.css'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import CustomMultiSelect from '@/components/CustomMultiSelect.vue'

export default {
  name: 'PersonList',
  components: {
    PersonEditModal,
    AddPersonModal,
    CustomMultiSelect
  },
  data() {
    return {
      /* Основные данные */
      organizations: [],
      devices: [],
      persons: [],

      /* Выбранные значения */
      selectedOrganizations: [],
      selectedDevices: [],

      /* Поиск по ИИН */
      searchIin: '',

      /* Состояния */
      isLoading: false,
      isError: false,
      errorMessage: '',

      /* Модальные окна */
      showAddModal: false,
      editedPerson: null,
      editModalVisible: false,

      /* Пагинация */
      currentPage: 1,
      pageSize: 50
    }
  },
  computed: {
    /* Фильтр устройств по выбранным организациям */
    filteredDevices() {
      if (!this.selectedOrganizations.length) return []
      const selectedOrgIds = this.selectedOrganizations.map(org => org.id)
      return this.devices.filter(device =>
        selectedOrgIds.includes(device.organization)
      )
    },
    /* Фильтр персон по поиску (ИИН) */
    filteredPersons() {
      if (!this.searchIin) return this.persons
      const searchValue = this.searchIin.toLowerCase()
      return this.persons.filter(p => {
        if (!p.employeeNo) return false
        return p.employeeNo.toLowerCase().includes(searchValue)
      })
    },
    /* Пагинированный список */
    paginatedPersons() {
      const start = (this.currentPage - 1) * this.pageSize
      const end = start + this.pageSize
      return this.filteredPersons.slice(start, end)
    },
    totalPages() {
      return Math.ceil(this.filteredPersons.length / this.pageSize) || 1
    }
  },
  mounted() {
    this.loadInitialData()
  },
  methods: {
    /* Загрузка орг и устройств параллельно */
    async loadInitialData() {
      this.isLoading = true
      this.isError = false
      this.errorMessage = ''
      try {
        const [userResp, devicesResp] = await Promise.all([
          axios.get('/api/user_info/'),
          axios.get('/api/devices/')
        ])
        const user = userResp.data
        this.devices = devicesResp.data

        // Определяем организации
        if (!user.organization) {
          console.warn('У пользователя не указана организация')
          this.organizations = []
          this.selectedOrganizations = []
        } else {
          const userOrgId = user.organization.id
          const isMain = user.organization.is_main

          if (isMain) {
            // Если главная — подгружаем все дочерние
            const orgsResponse = await axios.get(`/api/organizations/?parent_id=${userOrgId}`)
            this.organizations = orgsResponse.data || []
            // Выбор организаций по умолчанию (можно оставить пустой, если нужно выбор вручную)
            this.selectedOrganizations = []
          } else {
            // Иначе — организация только одна
            this.organizations = [user.organization]
            this.selectedOrganizations = [user.organization]
          }
        }
      } catch (error) {
        this.isError = true
        this.errorMessage = 'Ошибка при загрузке начальных данных: ' + error
      } finally {
        this.isLoading = false
      }
    },

    /* Общий метод — при смене организации/устройств (debounce можно добавить при необходимости) */
    handleSelectionChange() {
      // Сбрасываем страницу
      this.currentPage = 1
      // Синхронизируем выбранные устройства с отфильтрованными
      const allowedDeviceIds = this.filteredDevices.map(d => d.id)
      this.selectedDevices = this.selectedDevices.filter(
        dev => allowedDeviceIds.includes(dev.id)
      )
      // Если всё-таки что-то выбрано — загружаем персоны
      if (this.selectedDevices.length > 0) {
        this.fetchPersons()
      } else {
        // Если очистили, то и список персон тоже очистим
        this.persons = []
      }
    },

    /* Загрузка персон для всех выбранных устройств */
    async fetchPersons() {
      if (!this.selectedDevices.length) {
        this.persons = []
        return
      }
      this.isLoading = true
      this.isError = false
      this.errorMessage = ''

      try {
        const responses = await Promise.all(
          this.selectedDevices.map(device =>
            axios.get(`/api/devices/${device.id}/persons/`)
          )
        )
        console.log('person data:',responses)
        const allPersons = responses.flatMap((res, idx) => {
          const device = this.selectedDevices[idx]
          return res.data.map(person => ({
            ...person,
            device_id: device.id,
            device_name: device.name,
            organization_id: device.organization,
            faceImageData: null
          }))
        })
        this.persons = allPersons
      } catch (error) {
        this.isError = true
        this.errorMessage = 'Ошибка при загрузке персон: ' + error
      } finally {
        this.isLoading = false
      }
    },

    /* Получить наименование организации по ID */
    getOrganizationName(orgId) {
      const org = this.organizations.find(o => o.id === orgId)
      return org ? org.name : 'N/A'
    },

    /* Загрузка фото (по нажатию "Показать фото") */
    async loadPhoto(person) {
      if (!person.device_id || !person.employeeNo) return
      try {
        const responseFace = await axios.get(
          `/api/devices/${person.device_id}/persons/${person.employeeNo}/face/${person.employeeNo}`,
          { params: { face_lib_type: 'blackFD', fdid: '1' } }
        )
        const faceData = responseFace.data
        if (
          faceData.numOfMatches > 0 &&
          faceData.MatchList &&
          faceData.MatchList.length > 0
        ) {
          const match = faceData.MatchList[0]
          if (match.faceURL) {
            const proxyResp = await axios.get(
              `/api/devices/${person.device_id}/persons/${person.employeeNo}/face/${person.employeeNo}/fetch_image`,
              { params: { face_url: match.faceURL } }
            )
            if (proxyResp.data.image_data) {
              const base64 = 'data:image/jpeg;base64,' + proxyResp.data.image_data
              person.faceImageData = base64
              person.hasFaceOnDevice = true
            }
          }
        }
      } catch (error) {
        console.error('Ошибка при загрузке фото:', error)
      }
    },

    /* Пагинация */
    prevPage() {
      if (this.currentPage > 1) {
        this.currentPage--
      }
    },
    nextPage() {
      if (this.currentPage < this.totalPages) {
        this.currentPage++
      }
    },
    indexOnPage(localIndex) {
      return (this.currentPage - 1) * this.pageSize + (localIndex + 1)
    },

    /* Добавление персоны */
    handlePersonCreated() {
      this.showAddModal = false
      this.fetchPersons()
    },

    /* Редактирование */
    openEditModal(person) {
      // Делаем копию на всякий случай
      const copy = JSON.parse(JSON.stringify(person))
      copy.hasFaceOnDevice = person.hasFaceOnDevice
      this.editedPerson = copy
      this.editModalVisible = true
    },
    handlePersonSaved() {
      this.editModalVisible = false
      this.fetchPersons()
    },

    /* Удаление */
    async deletePerson(person) {
      if (!person.device_id) return
      try {
        await axios.delete(
          `/api/devices/${person.device_id}/persons/${person.employeeNo}/`
        )
        this.fetchPersons()
      } catch (error) {
        console.error('Ошибка при удалении персоны:', error)
      }
    },

    /* Экспорт в Excel */
    async downloadAsExcel() {
      try {
        const workbook = new ExcelJS.Workbook()
        const worksheet = workbook.addWorksheet('Persons')

        worksheet.addRow([
          'Organization',
          'Device',
          'Group',
          'IIN',
          'Name',
          'Тип пользователя',
          'График',
          'Photo'
        ])

        this.filteredPersons.forEach((person, index) => {
          let plansText = 'Нет планов'
          if (person.RightPlan && person.RightPlan.length > 0) {
            const planNumbers = person.RightPlan.map(item => item.planTemplateNo).join(', ')
            plansText = `[${planNumbers}]`
          }

          // Добавляем строку
          worksheet.addRow([
            this.getOrganizationName(person.organization_id),
            person.device_name,
            person.belongGroup || '', 
            person.employeeNo,
            person.name,
            person.userType,
            plansText,
            '' // под картинку
          ])

          // Если есть фото — добавляем
          if (person.faceImageData) {
            const base64Clean = person.faceImageData.split(',')[1]
            const imageId = workbook.addImage({
              base64: base64Clean,
              extension: 'jpeg'
            })
            const rowNumber = index + 2 // с учётом шапки
            const colNumber = 7
            worksheet.addImage(imageId, {
              tl: { col: colNumber - 1, row: rowNumber - 1 },
              ext: { width: 60, height: 60 }
            })
          }
        })

        const buffer = await workbook.xlsx.writeBuffer()
        saveAs(new Blob([buffer]), 'persons.xlsx')
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

/* Кнопка "Добавить" */
.add-person-btn {
  margin-top: 4rem;
  margin-bottom: 1rem;
  padding: 0.6rem 1rem;
  cursor: pointer;
  background-color: #007BFF;
  color: white;
  border: none;
  border-radius: 5px;
  transition: background 0.3s ease-in-out;
}
.add-person-btn:hover {
  background-color: #0056b3;
}

/* Кнопка "Обновить" */
.refresh-btn {
  margin-top: 4rem;
  margin-bottom: 1rem;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
  float: right;
  background: #28a745;
  color: white;
  padding: 0.6rem 1rem;
  border: none;
  border-radius: 5px;
  transition: background 0.3s ease-in-out;
}
.refresh-btn:hover {
  background: #218838;
}
.refresh-btn .icon {
  width: 20px;
  height: 20px;
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

/* Действия (Редактировать / Удалить) */
.actions-td {
  position: relative;
}
.edit-btn,
.delete-btn {
  background: none;
  border: none;
  cursor: pointer;
  margin: 0 0.3rem;
  padding: 0;
}
.delete-btn {
  float: right;
}

.paginator {

  display: flex;
  flex-direction: column;
  align-items: center; /* Горизонтальное выравнивание по центру */
  gap: 0.5rem;
  margin-top: 5rem;
}

.paginator-line {
  margin-top: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem; /* Расстояние между элементами в строке */
}

/* Фильтр */
.filter {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
}
.filter-item label {
  font-weight: bold;
  margin-bottom: 6px;
}
.filter-item {
  flex: 1;
  min-width: 200px;
  display: flex;
  flex-direction: column;
}
.filter-item input {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.3s ease;
}
.filter-item input:focus {
  border-color: #007BFF;
  outline: none;
  box-shadow: 0 0 4px rgba(0, 123, 255, 0.3);
}

/* Адаптивность */
@media (max-width: 768px) {
  .title {
    font-size: 22px;
  }
  .filter {
    flex-direction: column;
    gap: 12px;
    padding: 12px;
  }
  .paginator {
    flex-direction: column;
    gap: 0.5rem;
  }
  .excel-table th,
  .excel-table td {
    padding: 6px;
    font-size: 14px;
  }
}
</style>
