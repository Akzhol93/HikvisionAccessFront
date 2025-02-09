<template>
  <div class="modal-backdrop">
    <div class="modal-content">
      <h2>Добавить новую персону</h2>
      <form @submit.prevent="onSubmit">

        <!-- Если userIsParent = true => выбрать организацию -->
        <div class="form-row" v-if="userIsParent">
          <label>Организация:</label>
          <select v-model="selectedOrgId" @change="fetchDevicesForOrg">
            <option disabled value="">-- выберите --</option>
            <option 
              v-for="org in organizations" 
              :key="org.id" 
              :value="org.id"
            >
              {{ org.name }}
            </option>
          </select>
        </div>

        <!-- Выбор устройства (список, получаем для выбранной организации) -->
        <div class="form-row">
          <label>Устройство:</label>
          <select v-model="selectedDeviceId">
            <option disabled value="">-- выберите --</option>
            <option 
              v-for="dev in devices" 
              :key="dev.id" 
              :value="dev.id"
            >
              {{ dev.name }}
            </option>
          </select>
        </div>

        <div class="form-row">
          <label>ИИН:</label>
          <input v-model="form.employeeNo" required />
        </div>

        <div class="form-row">
          <label>Имя:</label>
          <input v-model="form.name" required />
        </div>

        <div class="form-row">
          <label>Тип пользователя:</label>
          <select v-model="form.userType">
            <option value="normal">normal</option>
            <option value="visitor">visitor</option>
            <option value="blackList">blackList</option>
            <option value="maintenance">maintenance</option>
          </select>
        </div>

        <div class="form-row">
          <label>Доступ с:</label>
          <input 
            type="datetime-local" 
            v-model="form.Valid.beginTime" 
            step="1"
          />
        </div>

        <div class="form-row">
          <label>Доступ по:</label>
          <input 
            type="datetime-local" 
            v-model="form.Valid.endTime" 
            step="1"
          />
        </div>

        <!-- Фото лица -->
        <div class="form-row">
          <label>Фото лица:</label>
          <div class="file-input-wrapper">
            <input 
              ref="fileInput"
              type="file" 
              accept="image/*"
              @change="onFileChange" 
            />
            <!-- Если файл выбран, показываем имя и иконку для сброса -->
            <div 
              v-if="faceFile" 
              class="selected-file-info"
            >
              <span class="file-name">{{ faceFile.name }}</span>
              <img
                class="trash-icon"
                :src="trashIconUrl"
                alt="Удалить"
                @click="removeFile"
              />
            </div>
          </div>
        </div>

        <div class="modal-buttons">
          <button type="submit">Сохранить</button>
          <button type="button" @click="$emit('close')">Отмена</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import axios from 'axios'

export default {
  name: 'AddPersonModal',
  data() {
    return {
      // Предположим, что API вернёт true/false (например, /api/user_info/)
      userIsParent: false,

      // Список организаций (если userIsParent=true)
      organizations: [],
      selectedOrgId: '',

      // Список устройств для выбранной организации
      devices: [],
      selectedDeviceId: '',

      form: {
        employeeNo: '',
        name: '',
        userType: 'normal',
        Valid: {
          beginTime: '2025-01-01T00:00',
          endTime: '2035-01-01T00:00'
        }
      },
      faceFile: null,

      // Иконка-мусорка
      trashIconUrl: 'https://cdn-icons-png.flaticon.com/512/3096/3096673.png',
    }
  },
  async mounted() {
    // (A) Выясняем, является ли пользователь "parent" или нет
    await this.checkUserIsParent()

    // (B) Если parent — грузим список организаций
    //     Иначе — сразу ставим selectedOrgId = org пользователя + fetchDevicesForOrg()
    if (this.userIsParent) {
      await this.fetchOrganizations()
    } else {
      // Если не parent, можно вызвать API "/api/user_info/", 
      // чтобы узнать organization.id пользователя
      const userInfo = await this.getCurrentUserInfo()
      if (userInfo && userInfo.organization) {
        this.selectedOrgId = userInfo.organization.id
      }
      // И сразу получаем устройства для этой org
      await this.fetchDevicesForOrg()
    }
  },
  methods: {
    async checkUserIsParent() {
      try {
        const resp = await axios.get('/api/user_info/')
        // Допустим, бэкенд возвращает { "is_parent": true, "organization": {...} }
        this.userIsParent = resp.data.is_parent || false
      } catch (error) {
        console.error('Ошибка проверки is_parent:', error)
        this.userIsParent = false
      }
    },

    async getCurrentUserInfo() {
      // Вы можете хранить это в Vuex или где-то ещё, но для примера — 
      // сделаем прямой запрос
      try {
        const resp = await axios.get('/api/user_info/')
        return resp.data
      } catch (error) {
        console.error(error)
        return null
      }
    },

    async fetchOrganizations() {
      // Допустим у вас есть эндпоинт /api/organizations/ 
      // который возвращает все организации
      try {
        const resp = await axios.get('/api/organizations/')
        this.organizations = resp.data
      } catch (error) {
        console.error('Ошибка при загрузке организаций:', error)
      }
    },

    async fetchDevicesForOrg() {
      if (!this.selectedOrgId) {
        this.devices = []
        this.selectedDeviceId = ''
        return
      }
      try {
        // Предположим, что у вас есть эндпоинт /api/devices/?organization_id=xxx
        // Или вы могли бы сделать отдельный эндпоинт. 
        // Либо просто получить все устройства /api/devices/
        // и отфильтровать на фронте, если в Device есть поле organization
        const resp = await axios.get('/api/devices/', {
          params: { organization_id: this.selectedOrgId }
        })
        this.devices = resp.data
        if (this.devices.length > 0) {
          this.selectedDeviceId = this.devices[0].id
        } else {
          this.selectedDeviceId = ''
        }
      } catch (error) {
        console.error('Ошибка при загрузке устройств:', error)
      }
    },

    onFileChange(e) {
      const files = e.target.files
      if (files && files.length) {
        this.faceFile = files[0]
      } else {
        this.faceFile = null
      }
    },

    removeFile() {
      this.faceFile = null
      if (this.$refs.fileInput) {
        this.$refs.fileInput.value = ''
      }
    },

    async onSubmit() {
      if (!this.selectedDeviceId) {
        alert('Выберите устройство!')
        return
      }

      // (1) POST на /api/devices/{selectedDeviceId}/persons/
      try {
        const createResp = await axios.post(
          `/api/devices/${this.selectedDeviceId}/persons/`,
          this.form
        )
        console.log('Person created:', createResp.data)

        // Успешно создана персона. Если есть фото => делаем PUT
        if (this.faceFile) {
          const employeeNo = this.form.employeeNo
          const formData = new FormData()
          formData.append('face_lib_type', 'blackFD')
          formData.append('fdid', '1')
          formData.append('image', this.faceFile)

          const faceResp = await axios.put(
            `/api/devices/${this.selectedDeviceId}/persons/${employeeNo}/face/${employeeNo}/`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
          )
          console.log('Face uploaded:', faceResp.data)
        }

        // Сообщаем родителю, что персона создана
        this.$emit('personCreated')
      } catch (error) {
        console.error('Ошибка при создании персоны:', error)
        if (error.response && error.response.data) {
          alert('Ошибка: ' + JSON.stringify(error.response.data))
        } else {
          alert('Неизвестная ошибка')
        }
      }
    }
  }
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0; 
  left: 0; 
  right: 0; 
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-content {
  background: #fff;
  padding: 1rem;
  width: 420px;
  max-width: 90%;
  border-radius: 6px;
  position: relative;
}

h2 {
  margin-top: 0;
}

/* Выравниваем label и input в одну строку */
.form-row {
  margin-bottom: 0.6rem;
  display: flex;
  align-items: center;
}

.form-row label {
  width: 120px;
  margin-right: 8px;
  font-weight: 500;
  margin-bottom: 0;
}

/* Если нужно, стилизуйте поле file и иконку */
.file-input-wrapper {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.selected-file-info {
  display: inline-flex;
  align-items: center;
  background-color: #f0f0f0;
  padding: 2px 8px;
  border-radius: 4px;
  gap: 6px;
}

.file-name {
  font-size: 0.9rem;
  color: #333;
}

.trash-icon {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.modal-buttons {
  margin-top: 1rem;
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}
</style>
