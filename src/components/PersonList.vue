<template>
  <div>
    <h2>Список персон</h2>

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
          <th>employeeNo</th>
          <th>name</th>
          <th>userType</th>
          <th></th> <!-- Под экшен-меню (три точки) -->
        </tr>
      </thead>
      <tbody>
        <tr v-for="(person, index) in persons" :key="index">
          <!-- Фото (лицо) -->
          <td>
            <!-- Если уже загружена faceImageData – показываем миниатюру -->
            <img
              v-if="person.faceImageData"
              :src="person.faceImageData"
              alt="Face"
              width="50"
            />
            <!-- Иначе кнопка "Показать лицо" -->
            <button v-else @click="loadFace(person)">Показать лицо</button>
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

    <!-- (3) Форма для создания новой персоны -->
    <div class="new-person-form">
      <h3>Добавить новую персону</h3>
      <form @submit.prevent="createPerson">
        <div>
          <label>employeeNo:</label>
          <input v-model="newPerson.employeeNo" required />
        </div>
        <div>
          <label>name:</label>
          <input v-model="newPerson.name" required />
        </div>
        <div>
          <label>userType:</label>
          <select v-model="newPerson.userType">
            <option value="normal">normal</option>
            <option value="visitor">visitor</option>
            <option value="blackList">blackList</option>
            <option value="maintenance">maintenance</option>
          </select>
        </div>
        <!-- Поле Valid (при необходимости) -->
        <div>
          <label>Valid с:</label>
          <input
            type="datetime-local"
            v-model="newPerson.Valid.beginTime"
            step="1"
          />
        </div>
        <div>
          <label>Valid по:</label>
          <input
            type="datetime-local"
            v-model="newPerson.Valid.endTime"
            step="1"
          />
        </div>

        <button type="submit">Создать</button>
      </form>
    </div>

    <!-- (4) Модальное окно / форма для редактирования персоны (отдельный компонент) -->
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

export default {
  name: 'PersonList',
  components: { PersonEditModal },
  data() {
    return {
      // Доступные устройства
      devices: [],
      // ID выбранного устройства
      selectedDevice: null,

      // Список персон (с выбранного устройства)
      persons: [],

      // Новая персона для создания
      newPerson: {
        employeeNo: '',
        name: '',
        userType: 'normal',
        Valid: {
          beginTime: '2025-01-01T00:00',
          endTime: '2035-01-01T00:00'
        }
      },

      // Персона, которую передаем в модалку для редактирования
      editedPerson: null,
      editModalVisible: false,

      // Какой индекс строки «раскрыт» для кнопок «Редактировать/Удалить»
      expandedRow: null
    }
  },
  mounted() {
    // При монтировании сразу получаем устройства
    this.fetchDevices()
  },
  methods: {
    // (A) Получить список устройств
    async fetchDevices() {
      try {
        const response = await axios.get('/api/devices/')
        this.devices = response.data
        // Если нужно, можно автоматически выбрать первое устройство
        if (this.devices.length > 0) {
          this.selectedDevice = this.devices[0].id
          this.fetchPersons()
        }
      } catch (error) {
        console.error('Ошибка при загрузке устройств:', error)
      }
    },

    // (B) Получить список персон для выбранного устройства
    async fetchPersons() {
      if (!this.selectedDevice) return
      this.expandedRow = null  // свернуть меню «три точки»
      try {
        const response = await axios.get(
          `/api/devices/${this.selectedDevice}/persons/`
        )
        // Предполагается, что вернется массив персон.
        // Сразу добавим поле faceImageData = null, чтобы потом хранить фото
        this.persons = response.data.map(p => ({
          ...p,
          faceImageData: null
        }))
      } catch (error) {
        console.error('Ошибка при загрузке персон:', error)
      }
    },

    // (C) Создать новую персону
    async createPerson() {
      if (!this.selectedDevice) return
      try {
        await axios.post(
          `/api/devices/${this.selectedDevice}/persons/`,
          this.newPerson
        )
        // Обновляем список
        await this.fetchPersons()
        // Сбрасываем форму
        this.resetNewPersonForm()
      } catch (error) {
        console.error('Ошибка при создании персоны:', error)
      }
    },

    // Сброс формы создания
    resetNewPersonForm() {
      this.newPerson.employeeNo = ''
      this.newPerson.name = ''
      this.newPerson.userType = 'normal'
      this.newPerson.Valid.beginTime = '2025-01-01T00:00'
      this.newPerson.Valid.endTime = '2035-01-01T00:00'
    },

    // (D) Открыть модалку редактирования
    openEditModal(person) {
      this.expandedRow = null // Скрыть меню
      // Клонируем данные персоны
      this.editedPerson = JSON.parse(JSON.stringify(person))
      this.editModalVisible = true
    },

    // (E) Обработать сохранение из модалки
    handlePersonSaved() {
      // Закрываем модалку
      this.editModalVisible = false
      // Обновляем список (чтобы отобразить новые данные)
      this.fetchPersons()
    },

    // (G) Удалить персону
    async deletePerson(employeeNo) {
      if (!this.selectedDevice) return
      this.expandedRow = null
      try {
        await axios.delete(
          `/api/devices/${this.selectedDevice}/persons/${employeeNo}/`
        )
        this.fetchPersons()
      } catch (error) {
        console.error('Ошибка при удалении персоны:', error)
      }
    },

    // (H) Загрузить лицо (изображение) для конкретной персоны
    async loadFace(person) {
      if (!this.selectedDevice || !person.employeeNo) return
      try {
        // Сначала получаем JSON от /face/{employeeNo} — там есть "faceURL".
        const responseFace = await axios.get(
          `/api/devices/${this.selectedDevice}/persons/${person.employeeNo}/face/${person.employeeNo}`,
          {
            params: {
              face_lib_type: 'blackFD',
              fdid: '1'
            }
          }
        )

        const faceData = responseFace.data
        if (faceData.numOfMatches > 0 && faceData.MatchList && faceData.MatchList.length > 0) {
          const match = faceData.MatchList[0]
          if (match.faceURL) {
            // (1) Запрашиваем через action "fetch_image", который сделает
            // HTTP Digest авторизацию и вернёт base64
            const proxyResp = await axios.get(
              `/api/devices/${this.selectedDevice}/persons/${person.employeeNo}/face/${person.employeeNo}/fetch_image`,
              {
                params: {
                  face_url: match.faceURL
                }
              }
            )

            if (proxyResp.data.image_data) {
              person.faceImageData = 'data:image/jpeg;base64,' + proxyResp.data.image_data
            } else {
              console.warn('Не удалось получить image_data:', proxyResp.data.error)
            }
          } else {
            console.warn('В объекте match нет поля faceURL')
          }
        } else {
          console.warn('Не найдено совпадений или пустой MatchList')
        }
      } catch (error) {
        console.error('Ошибка при загрузке лица:', error)
      }
    },

    // Показать/спрятать меню "три точки" (expandedRow)
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
  position: relative; /* чтобы позиционировать dropdown */
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

.new-person-form,
.edit-modal {
  margin-top: 2rem;
  padding: 1rem;
  background: #f7f7f7;
  border-radius: 4px;
}

.edit-modal {
  border: 2px solid #888;
}

.refresh-btn {
  margin-left: 12px;
  padding: 0.5rem 1rem;
  cursor: pointer;
}
</style>
