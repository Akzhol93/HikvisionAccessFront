<template>
  <div>
    <h2>Список персон</h2>

    <!-- (Кнопка Добавить) -->
    <button @click="showAddModal = true" class="add-person-btn">
      + Добавить
    </button>

    <!-- (1) Выбор устройства -->
    <div class="device-selector">
      <label>Выберите устройство:</label>
      <select v-model="selectedDevice" @change="fetchPersons">
        <option v-for="device in devices" :key="device.id" :value="device.id">
          {{ device.name }} (ID: {{ device.id }})
        </option>
      </select>
    </div>

    <!-- Кнопка обновления списка персон -->
    <button @click="fetchPersons" v-if="selectedDevice" class="refresh-btn">
      Обновить список персон
    </button>

    <!-- (2) Таблица с персонами -->
    <table v-if="persons.length > 0" class="person-table">
      <thead>
        <tr>
          <th>Фото</th>
          <th>ИИН</th>
          <th>Имя</th>
          <th>Тип пользователя</th>
          <th></th> <!-- Под экшен-меню (три точки) -->
        </tr>
      </thead>
      <tbody>
        <tr v-for="(person, index) in persons" :key="index">
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

          <!-- "Три точки" + выпадающее меню -->
          <td class="actions-td">
            <div class="actions-wrapper">
              <button class="dots-btn" @click.stop="toggleActions(index)">⋮</button>
              <div
                class="dropdown-content"
                v-if="expandedRow === index"
              >
                <button @click="openEditModal(person)">Редактировать</button>
                <button @click="deletePerson(person.employeeNo)">Удалить</button>
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
      :device-id="selectedDevice"
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

export default {
  name: 'PersonList',
  components: { PersonEditModal, AddPersonModal },
  data() {
    return {
      devices: [],
      selectedDevice: null,
      persons: [],
      editedPerson: null,
      editModalVisible: false,
      expandedRow: null,

      showAddModal: false,  // управляет показом AddPersonModal
    }
  },
  mounted() {
    this.fetchDevices()
  },
  methods: {
    async fetchDevices() {
      try {
        const response = await axios.get('/api/devices/')
        this.devices = response.data
        if (this.devices.length > 0) {
          this.selectedDevice = this.devices[0].id
          this.fetchPersons()
        }
      } catch (error) {
        console.error('Ошибка при загрузке устройств:', error)
      }
    },
    async fetchPersons() {
      if (!this.selectedDevice) return
      this.expandedRow = null
      try {
        const response = await axios.get(`/api/devices/${this.selectedDevice}/persons/`)
        // добавим поле "faceImageData" и "hasFaceOnDevice"
        this.persons = response.data.map(p => ({
          ...p,
          faceImageData: p.faceImageData || null,
          hasFaceOnDevice: !!p.faceImageData
        }))
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

    async deletePerson(employeeNo) {
      if (!this.selectedDevice) return
      this.expandedRow = null
      try {
        await axios.delete(`/api/devices/${this.selectedDevice}/persons/${employeeNo}/`)
        this.fetchPersons()
      } catch (error) {
        console.error('Ошибка при удалении персоны:', error)
      }
    },

    async loadPhoto(person) {
      if (!this.selectedDevice || !person.employeeNo) return
      try {
        const responseFace = await axios.get(
          `/api/devices/${this.selectedDevice}/persons/${person.employeeNo}/face/${person.employeeNo}`,
          { params: { face_lib_type: 'blackFD', fdid: '1' } }
        )
        const faceData = responseFace.data
        if (faceData.numOfMatches > 0 && faceData.MatchList && faceData.MatchList.length > 0) {
          const match = faceData.MatchList[0]
          if (match.faceURL) {
            const proxyResp = await axios.get(
              `/api/devices/${this.selectedDevice}/persons/${person.employeeNo}/face/${person.employeeNo}/fetch_image`,
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
  }
}
</script>

<style scoped>
.device-selector {
  margin-bottom: 1rem;
}

/* Можно стилизовать кнопку Добавить */
.add-person-btn {
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
</style>
