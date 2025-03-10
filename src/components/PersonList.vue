<template>
  <div>
    <h1 class="title">Список персон</h1>

    <div class="filter">
      <div class="org-selector">
        <v-select
          v-model="selectedOrganizations"
          :options="organizations"
          label="name"
          multiple
          :searchable="true"
          :closeOnSelect="false"
          placeholder="Выберите организацию"
        />
      </div>

      <div class="device-selector">
        <v-select
          v-model="selectedDevices"
          :options="filteredDevices"
          label="name"
          multiple
          :closeOnSelect="false"
          placeholder="Выберите устроиство"
          :loading="isLoading"
          :disabled="selectedOrganizations.length === 0"
          v-tooltip="'Сначала выберите организацию'"
        />
      </div>

      <div class="iinSearch">
        <label for="iinSearch">Поиск по ИИН:</label>
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



    <!-- (Кнопка Добавить) -->
    <button @click="showAddModal = true" class="add-person-btn">
      + Добавить
    </button>

    <!-- (4) Состояния загрузки/ошибки/нет данных/таблица -->
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
      <!-- (2) Таблица с персонами -->
      <table class="excel-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Организация</th>
            <th>Устройство</th>
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
          <!-- Используем paginatedPersons вместо filteredPersons -->
          <tr v-for="(person, index) in paginatedPersons" :key="index">
            <td>{{ indexOnPage(index) }}</td>
            <td>{{ getOrganizationName(person.organization_id) }}</td>
            <td>{{ person.device_name }}</td>
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

            <!-- Основные поля персоны -->
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
              <!-- Кнопка "Редактировать" -->
              <button class="edit-btn" @click="openEditModal(person)">
                <img src="@/assets/edit.png" alt="Edit" width="20" />
              </button>

              <!-- Кнопка "Удалить" -->
              <button class="delete-btn" @click="deletePerson(person)">
                <img src="@/assets/delete.png" alt="Delete" width="20" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Пагинатор -->
      <div class="paginator">
        <button @click="prevPage" :disabled="currentPage === 1">Предыдущая</button>
        <span>Страница {{ currentPage }} из {{ totalPages }}</span>
        <button
          @click="nextPage"
          :disabled="currentPage === totalPages"
        >
          Следующая
        </button>

        <label for="pageSize">Кол-во записей на странице:</label>
        <select v-model="pageSize" id="pageSize">
          <option :value="20">20</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
          <option :value="500">500</option>
        </select>
      </div>
    </div>

    <!-- (3) Модальное окно для добавления НОВОЙ персоны -->
    <AddPersonModal
      v-if="showAddModal"
      @close="showAddModal = false"
      @personCreated="handlePersonCreated"
    />

    <!-- (4) Модальное окно / форма для редактирования персоны -->
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
import vSelect from 'vue-select'
import 'vue-select/dist/vue-select.css'

import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'


export default {
  name: 'PersonList',
  components: { PersonEditModal, AddPersonModal, vSelect },
  data() {
    return {
      devices: [],
      selectedDevices: [],
      persons: [],
      editedPerson: null,
      editModalVisible: false,

      showAddModal: false,

      organizations: [],
      selectedOrganizations: [],
      searchIin: '',

      // (4) Доп. состояния
      isLoading: false,
      isError: false,
      errorMessage: '',

      // (6) Для дебаунса
      selectionChangeTimeout: null,

      // (8) Пагинация (front-end)
      currentPage: 1,
      pageSize: 20, // например, по 10 на страницу

    }
  },
  computed: {
    // Фильтрация устройств по выбранным организациям
    filteredDevices() {
      if (!this.selectedOrganizations.length) {
        return []
      }
      const selectedOrgIds = this.selectedOrganizations.map(org => org.id)
      return this.devices.filter(device =>
        selectedOrgIds.includes(device.organization)
      )
    },
    // Фильтр персон по searchIin
    filteredPersons() {
      if (!this.searchIin) {
        return this.persons
      }
      const searchValue = this.searchIin.toLowerCase()
      return this.persons.filter((p) => {
        if (!p.employeeNo) return false
        return p.employeeNo.toLowerCase().includes(searchValue)
      })
    },
    // (8) Получаем только нужный кусок (для текущей страницы)
    paginatedPersons() {
      const start = (this.currentPage - 1) * this.pageSize
      const end = start + this.pageSize
      return this.filteredPersons.slice(start, end)
    },
    // Для удобства — всего страниц
    totalPages() {
      return Math.ceil(this.filteredPersons.length / this.pageSize) || 1
    }
  },
  mounted() {
    this.fetchDevices()
    this.fetchOrganizations()
  },
  methods: {
    // Утилита, чтобы нумерация в таблице не сбивалась при пагинации
    indexOnPage(localIndex) {
      return (this.currentPage - 1) * this.pageSize + (localIndex + 1)
    },

    // Пагинация (front-end)
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

    getOrganizationName(orgId) {
      const org = this.organizations.find(o => o.id === orgId)
      return org ? org.name : 'N/A'
    },

    // (4) Добавим загрузку/ошибку
    async fetchDevices() {
      this.isLoading = true
      this.isError = false
      this.errorMessage = ''
      try {
        const response = await axios.get('/api/devices/')
        this.devices = response.data
        // По желанию, сразу подгружаем персоны
        this.fetchPersons()
      } catch (error) {
        this.isError = true
        this.errorMessage = 'Ошибка при загрузке устройств: ' + error
      } finally {
        this.isLoading = false
      }
    },

    // (4) Аналогично
    async fetchOrganizations() {
      this.isLoading = true
      this.isError = false
      this.errorMessage = ''
      try {
        const userResponse = await axios.get('/api/user_info/')
        const user = userResponse.data
        if (!user.organization) {
          console.warn('У пользователя не указана организация')
          this.organizations = []
          this.selectedOrganizations = []
          return
        }
        const userOrgId = user.organization.id
        const isMain = user.organization.is_main

        if (isMain) {
          const orgsResponse = await axios.get(`/api/organizations/?parent_id=${userOrgId}`);
          this.organizations = orgsResponse.data || [];
          // По умолчанию выбираем все
          this.selectedOrganizations = [];
        } else {
          // 3) Иначе пользователь в дочерней -> единственная организация
          this.organizations = [user.organization];
          // По умолчанию сразу выбираем её же
          this.selectedOrganizations = [user.organization];
        }

      } catch (error) {
        this.isError = true
        this.errorMessage = 'Ошибка при загрузке организаций: ' + error
      } finally {
        this.isLoading = false
      }
    },
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

        // Сконкатенируем результаты, добавим поля для удобства
        const allPersons = responses.flatMap((res, idx) => {
          const device = this.selectedDevices[idx]
          return res.data.map(person => ({
            ...person,
            device_id: device.id,
            device_name: device.name,
            organization_id: device.organization,
            faceImageData: null, // по умолчанию пусто
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


    // (A) после добавления новой персоны
    handlePersonCreated() {
      this.showAddModal = false
      this.fetchPersons()
    },

    openEditModal(person) {
      const copy = JSON.parse(JSON.stringify(person))
      copy.hasFaceOnDevice = person.hasFaceOnDevice
      this.editedPerson = copy
      this.editModalVisible = true
    },
    handlePersonSaved() {
      this.editModalVisible = false
      this.fetchPersons()
    },

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
              const fullBase64 = 'data:image/jpeg;base64,' + proxyResp.data.image_data
              person.faceImageData = fullBase64
              person.hasFaceOnDevice = true
            }
          }
        }
      } catch (error) {
        console.error('Ошибка при загрузке фото:', error)
      }
    },


    // (6) Следим за изменением выбора организаций/устройств с дебаунсом
    handleSelectionChange() {
      if (this.selectionChangeTimeout) {
        clearTimeout(this.selectionChangeTimeout)
      }
      this.selectionChangeTimeout = setTimeout(() => {
        // Сбросим текущую страницу при смене фильтров, если нужно
        this.currentPage = 1
        // Удалим из selectedDevices те, которых нет во `filteredDevices`
        const filtered = this.filteredDevices.map(d => d.id)
        this.selectedDevices = this.selectedDevices.filter(device =>
          filtered.includes(device.id)
        )
        // Загружаем персоны
        this.fetchPersons()
      }, 500)
    },

    // (8) Экспорт Excel (без изменений, кроме того, что используем this.filteredPersons)
    async downloadAsExcel() {
      try {
        const workbook = new ExcelJS.Workbook()
        const worksheet = workbook.addWorksheet('Persons')

        worksheet.addRow([
          'Organization',
          'Device',
          'IIN',
          'Name',
          'Тип пользователя',
          'График',
          'Photo'
        ])

        this.filteredPersons.forEach((person, index) => {
          let plansText = 'Нет планов'
          if (person.RightPlan && person.RightPlan.length > 0) {
            const planNumbers = person.RightPlan
              .map(item => item.planTemplateNo)
              .join(', ')
            plansText = `[${planNumbers}]`
          }

          worksheet.addRow([
            this.getOrganizationName(person.organization_id),
            person.device_name,
            person.employeeNo,
            person.name,
            person.userType,
            plansText,
            '' // для картинки
          ])

          if (person.faceImageData) {
            const base64Clean = person.faceImageData.split(',')[1]
            const imageId = workbook.addImage({
              base64: base64Clean,
              extension: 'jpeg'
            })
            const rowNumber = index + 2
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
  },
  watch: {
    selectedOrganizations() {
      // (1) у нас уже есть computed filteredDevices,
      //     так что vue-select получит новое содержимое
      // (2) удалим из selectedDevices все устройства, которые не вошли в filteredDevices
      const filtered = this.filteredDevices.map(d => d.id) // массив ID из отфильтрованных
      // или, если храните объекты, вам нужно сравнивать device.id
      this.selectedDevices = this.selectedDevices.filter(
        device => filtered.includes(device.id)
      )

      // (3) после обновления выбранных устройств
      //     можем снова запросить список персон
      this.fetchPersons()
    },
    selectedDevices() {
      this.fetchPersons()
    }
  }
}
</script>

<style scoped>
.org-selector,  .device-selector{
  margin-top: 2rem;
}

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
.iinSearch {
  margin-top: 1rem;
  margin-bottom: 1rem;
}

.add-person-btn {
  margin-top: 1rem;
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

.person-table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
}
.person-table th,
.person-table td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}
.actions-td {
  position: relative;
}

.edit-btn, .delete-btn {
  background: none;
  border: none;
  cursor: pointer;
  margin-right: 0.5rem; /* Если нужно отступ между иконками */
}

.edit-btn {
  /* какие-то стили для иконки редактирования */
}

.delete-btn {
  /* какие-то стили для иконки удаления */
}


.refresh-btn {
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
.paginator {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-top: 1rem;
}
.warning-text {
  color: red;
  font-size: 0.85rem;
}

.org-selector, .device-selector {
  margin-top: 1.5rem;
}



/* Медиа-запрос для мобильных устройств */
@media (max-width: 768px) {
  .excel-table th,
  .excel-table td {
    padding: 6px;
    font-size: 14px;
  }

  .paginator {
    flex-direction: column;
    gap: 0.5rem;
  }

}


</style>
