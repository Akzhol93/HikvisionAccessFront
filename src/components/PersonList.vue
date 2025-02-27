<template>
  <div>
    <h1 class="title">Список персон</h1>

    <div class="org-selector">
      <label>Выберите организацию:</label>
      <v-select v-model="selectedOrganizations" :options="organizations" label="name" multiple :closeOnSelect="false" />
    </div>

    <div class="device-selector">
      <label>Выберите устройство:</label>
      <v-select v-model="selectedDevices" :options="filteredDevices" label="name" multiple :closeOnSelect="false" />
    </div>


    <!-- Кнопка обновления списка персон -->
    <button @click="fetchPersons"  v-if="selectedDevices.length > 0" class="refresh-btn">
      <img src="@/assets/update.png" alt="Обновить" class="icon" />
      Обновить таблицу
    </button>

    <div class="iinSearch"  v-if="selectedDevices.length > 0">
      <label for="iinSearch">Поиск по ИИН:</label>
      <input
        id="iinSearch"
        v-model="searchIin"
        type="text"
        placeholder="Введите ИИН для поиска"
      />
    </div>

    

    <!-- (Кнопка Добавить) -->
    <button @click="showAddModal = true" class="add-person-btn">
      + Добавить
    </button>


    <!-- (2) Таблица с персонами -->
    <table v-if="persons.length > 0" class="excel-table">
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
              <!-- Можно иконкой/картинкой, например: -->
              <img src="@/assets/download2.png" alt="Excel" width="20" />
              <!-- <i class="fas fa-file-excel"></i> -->
             
            </button>
          </th>
        </tr>
      </thead>
      <tbody>

        <!-- <tr v-for="(person, index) in persons" :key="index"> -->
        <tr v-for="(person, index) in filteredPersons" :key="index">
          <td>{{ index + 1 }}</td>
          <td>{{ getOrganizationName(person.organization_id) }}</td>
          <td>{{ person.device_name }}</td>
          <!-- Фото -->
          <td>
            <!-- Если уже загружено фото (faceImageData) – показываем миниатюру -->
            <img
              v-if="person.faceImageData"
              :src="person.faceImageData"
              alt="Фото"
              width="50"
            />
            <!-- Иначе кнопка "Показать фото" -->
            <button v-else @click="loadPhoto(person)">Показать фото</button>
          </td>

          <!-- Основные поля персоны -->
          <td>{{ person.employeeNo }}</td>
          <td>{{ person.name }}</td>
          <td>{{ person.userType }}</td>
          <td>   
            <span v-if="person.RightPlan && person.RightPlan.length > 0">
              [
                {{ person.RightPlan.map(item => item.planTemplateNo).join(', ') }}
              ]
            </span>
            <span v-else>
              Нет планов
            </span> 
          </td>

          <!-- "Три точки" + выпадающее меню -->
          <td class="actions-td">
            <div class="actions-wrapper">
              <button class="dots-btn" @click.stop="toggleActions(index)">⋮</button>
              <div
                class="dropdown-content"
                v-if="expandedRow === index"
              >
                <button @click="openEditModal(person)">Редактировать</button>
                <button @click="deletePerson(person)">Удалить</button>
              </div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-else>
      <p>Нет персон (или не выбрано устройство).</p>
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
import 'vue-select/dist/vue-select.css' // чтобы были стили

import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'



export default {
  name: 'PersonList',
  components: { PersonEditModal, AddPersonModal,vSelect },
  data() {
    return {
      devices: [],
      selectedDevices: [],
      persons: [],
      editedPerson: null,
      editModalVisible: false,
      expandedRow: null,

      showAddModal: false,  // управляет показом AddPersonModal

      organizations: [],
      selectedOrganizations: [],
      searchIin: '',
    }
  },
  computed: {
    filteredDevices() {
      // Если вообще не выбраны никакие организации, можно вернуть пустой массив
      // или, например, вернуть все devices (зависит от логики).
      if (!this.selectedOrganizations.length) {
        return []
      }

      // Собираем ID всех выбранных организаций
      const selectedOrgIds = this.selectedOrganizations.map(org => org.id)

      // Фильтруем устройства: оставляем только те, у которых organizationId ∈ selectedOrgIds
      return this.devices.filter(device =>
        selectedOrgIds.includes(device.organization)
      )
    },
    filteredPersons() {
      // Если ничего не введено — возвращаем исходный массив
      if (!this.searchIin) {
        return this.persons
      }

      const searchValue = this.searchIin.toLowerCase()

      // Фильтруем по полю employeeNo (ИИН),
      // предполагая, что оно может быть строкой.
      return this.persons.filter((p) => {
        if (!p.employeeNo) return false
        // Приведём тоже к lowercase (если там строка)
        return p.employeeNo.toLowerCase().includes(searchValue)
      })
    }
  },

  mounted() {
    this.fetchDevices()
    this.fetchOrganizations()
  },
  methods: {
    async downloadAsExcel() {
      try {
        const workbook = new ExcelJS.Workbook()
        const worksheet = workbook.addWorksheet('Persons')

        // 1) Заголовок (первая строка)
        worksheet.addRow([
          'Organization',
          'Device',
          'IIN',
          'Name',
          'Тип пользователя', // Добавили
          'График',          // Добавили
          'Photo'            // Столбец, где картинка
        ])

        // 2) Заполняем данными
        this.filteredPersons.forEach((person, index) => {
          // Для «Графика» сформируем текст: либо [1,2,...], либо «Нет планов»
          let plansText = 'Нет планов'
          if (person.RightPlan && person.RightPlan.length > 0) {
            // Пример: [1, 2, 5]
            const planNumbers = person.RightPlan.map(item => item.planTemplateNo).join(', ')
            plansText = `[${planNumbers}]`
          }

          // Добавляем «обычные» данные в виде массива (кроме картинки):
          worksheet.addRow([
            this.getOrganizationName(person.organization_id), // Organization
            person.device_name,                               // Device
            person.employeeNo,                                // IIN
            person.name,                                      // Name
            person.userType,                                  // Тип пользователя
            plansText,                                        // График
            '' // Пустая ячейка под картинку
          ])

          // Если есть Base64-фото, вставляем картинку
          if (person.faceImageData) {
            const base64Clean = person.faceImageData.split(',')[1] // убираем "data:image/jpeg;base64,"

            const imageId = workbook.addImage({
              base64: base64Clean,
              extension: 'jpeg' // или 'png', если у вас PNG
            })

            // Номер строки (начиная со 2, т.к. 1-я занята заголовком)
            const rowNumber = index + 2

            // Номер колонки для фото (7-я колонка в нашем списке)
            const colNumber = 7

            // Вставляем картинку (координаты 0-based для tl)
            worksheet.addImage(imageId, {
              tl: { col: colNumber - 1, row: rowNumber - 1 },
              ext: { width: 60, height: 60 } // можно регулировать
            })
          }
        })

        // 3) Сохраняем Workbook
        const buffer = await workbook.xlsx.writeBuffer()
        saveAs(new Blob([buffer]), 'persons.xlsx')
      } catch (error) {
        console.error('Ошибка при экспорте в Excel:', error)
      }
    },
    async fetchOrganizations() {
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
          // По умолчанию выбираем все
          this.selectedOrganizations = [];
        } else {
          // 3) Иначе пользователь в дочерней -> единственная организация
          this.organizations = [user.organization];
          // По умолчанию сразу выбираем её же
          this.selectedOrganizations = [user.organization];
        }
      } catch (error) {
        console.error('Ошибка при загрузке организаций:', error);
        this.organizations = [];
        this.selectedOrganizations = [];
      }
    },
    getOrganizationName(orgId) {
      // Ищем в массиве organizations (либо в другом массиве, где у вас есть инфа)
      const org = this.organizations.find(o => o.id === orgId)
      return org ? org.name : 'N/A'
    },

  
    async fetchDevices() {
      try {
        const response = await axios.get('/api/devices/')
        this.devices = response.data
        
        // Если хотим сразу при загрузке выбрать первое устройство в качестве дефолта:
        // if (this.devices.length > 0) {
        //   // Например, сохраним целиком объект первого устройства в массив:
        //   this.selectedDevices = [ this.devices[0] ]
        //   // Или, если вы храните только IDs, то: this.selectedDevices = [ this.devices[0].id ]
        // }

        // Если нужно сразу подгрузить персоны — вызываем fetchPersons()
        this.fetchPersons()

      } catch (error) {
        console.error('Ошибка при загрузке устройств:', error)
      }
    },
    async fetchPersons() {
      // Если не выбрано ни одного устройства, очищаем список
      if (!this.selectedDevices.length) {
        this.persons = []
        return
      }

      this.expandedRow = null
      try {
        // Выполняем параллельные GET-запросы на /api/devices/{deviceId}/persons/
        const responses = await Promise.all(
          this.selectedDevices.map(device =>
            axios.get(`/api/devices/${device.id}/persons/`)
          )
        )

        // // Объединяем (конкатенируем) все полученные списки персон
        // const allPersons = responses.flatMap(res => res.data)
        // // Добавляем поля faceImageData и hasFaceOnDevice, как раньше
        // this.persons = allPersons.map(p => ({
        //   ...p,
        //   faceImageData: p.faceImageData || null,
        //   hasFaceOnDevice: !!p.faceImageData
        // }))

        const allPersons = responses.flatMap((res, index) => {
          const device = this.selectedDevices[index]
          return res.data.map(person => ({
            ...person,
            device_id: device.id,
            device_name: device.name, 
            organization_id: device.organization,
            faceImageData: person.faceImageData || null,
            hasFaceOnDevice: !!person.faceImageData
          }))
        })

        this.persons = allPersons

        console.log('persons:', this.persons)


      } catch (error) {
        console.error('Ошибка при загрузке персон:', error)
      }
    },


    // (A) Обработчик когда новая персона создана в AddPersonModal
    handlePersonCreated() {
      this.showAddModal = false
      // Обновим список персон, если нужно
      this.fetchPersons()
    },

    openEditModal(person) {
      this.expandedRow = null
      // Копия данных + флаг наличия фото
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
      this.expandedRow = null
      try {
        await axios.delete(`/api/devices/${person.device_id}/persons/${person.employeeNo}/`)
        this.fetchPersons()
      } catch (error) { console.error('Ошибка при удалении персоны:', error)}
    },

    async loadPhoto(person) {
      if (!person.device_id || !person.employeeNo) return
      try {
        const responseFace = await axios.get(
          `/api/devices/${person.device_id}/persons/${person.employeeNo}/face/${person.employeeNo}`,
          { params: { face_lib_type: 'blackFD', fdid: '1' } }
        )
        const faceData = responseFace.data
        if (faceData.numOfMatches > 0 && faceData.MatchList && faceData.MatchList.length > 0) {
          const match = faceData.MatchList[0]
          if (match.faceURL) {
            const proxyResp = await axios.get(
              `/api/devices/${person.device_id}/persons/${person.employeeNo}/face/${person.employeeNo}/fetch_image`,
              { params: { face_url: match.faceURL } }
            )
            if (proxyResp.data.image_data) {
              person.faceImageData = 'data:image/jpeg;base64,' + proxyResp.data.image_data
              person.hasFaceOnDevice = true
            }
          }
        }
      } catch (error) {
        console.error('Ошибка при загрузке фото:', error)
      }
    },
    toggleActions(rowIndex) {
      this.expandedRow = this.expandedRow === rowIndex ? null : rowIndex
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
.org-selector {
  margin-top: 4rem;
  margin-bottom: 1rem;
}

.device-selector {
  margin-bottom: 2rem;
}
.title {
  color: #294358;;
  margin-top: 2rem;
  margin-bottom: 4rem;
  text-align: center;
}

.iinSearch {
  margin-top: 1rem;
  margin-bottom: 1rem;
}
/* Можно стилизовать кнопку Добавить */
.add-person-btn {
  margin-top: 1rem;
  margin-bottom: 1rem;
  padding: 0.4rem 0.8rem;
  cursor: pointer;
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

.actions-wrapper {
  display: inline-block;
  position: relative;
}

.dots-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 4px;
}

.dropdown-content {
  position: absolute;
  top: 2em;
  right: 0;
  background: #fff;
  border: 1px solid #ccc;
  min-width: 120px;
  z-index: 999;
  display: flex;
  flex-direction: column;
}

.dropdown-content button {
  background: none;
  border: none;
  padding: 6px 12px;
  text-align: left;
  cursor: pointer;
}

.dropdown-content button:hover {
  background: #f0f0f0;
}

.refresh-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem; /* Расстояние между иконкой и текстом */
  cursor: pointer;
  
  float: right;
  margin-left: 10px; /* Чтобы чуть отодвинуть кнопку от возможных элементов слева */

}

.refresh-btn .icon {
  width: 20px;
  height: 20px;
}

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


</style>
