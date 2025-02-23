<template>
  <div class="modal-backdrop">
    <div class="modal-content">
      <h2>Добавить новую персону</h2>
      <form @submit.prevent="onSubmit">

        <!-- Если пользователь из parent org -->
        <div v-if="userIsParent">
          <div class="form-row">
            <label>Организация:</label>
            <select
              v-model="selectedOrgId"
              @change="fetchDevicesForOrg"
            >
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
        </div>

        <!-- Если пользователь из child org -->
        <div v-else>
          <div class="form-row">
            <label>Организация:</label>
            <!-- Можно сделать input disabled, 
                 или select с 1 опцией в disabled состоянии -->
            <input
              type="text"
              :value="childOrgName"
              readonly
            />
          </div>
        </div>

        <!-- Список устройств (общий для обоих случаев) -->
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
      userIsParent: false,     // Определим после запроса user_info
      childOrgName: '',        // Название организации, если пользователь из дочерней

      organizations: [],       // Дочерние организации для parent
      selectedOrgId: '',       // Выбранная организация (только если userIsParent)

      devices: [],             // Устройства для выбранной/текущей организации
      selectedDeviceId: '',

      form: {
        employeeNo: '',
        name: '',
        userType: 'normal',
        Valid: {
          enable: true,
          beginTime: '2025-01-01T00:00',
          endTime: '2035-01-01T00:00'
        }
      },
      faceFile: null,
      trashIconUrl: 'https://cdn-icons-png.flaticon.com/512/3096/3096673.png',
    }
  },
  async mounted() {
    // 1) Узнаём данные текущего пользователя
    const userInfo = await this.getCurrentUserInfo()
    if (!userInfo || !userInfo.organization) {
      // Если не нашли userInfo / organization
      console.error('Не удалось получить данные пользователя или организации')
      return
    }

    // 2) Проверяем, главная ли организация => userIsParent
    this.userIsParent = !!userInfo.organization.is_main

    // 3) Если parent org:
    //    - Загружаем список ТОЛЬКО дочерних организаций
    //      (например /api/organizations/?parent_id=xxx)
    if (this.userIsParent) {
      await this.fetchChildOrganizations(userInfo.organization.id)
    } 
    else {
      // Если child org:
      // - Запоминаем название
      // - Выставляем selectedOrgId = id этой организации
      // - Подгружаем устройства
      this.childOrgName = userInfo.organization.name
      this.selectedOrgId = userInfo.organization.id
      await this.fetchDevicesForOrg()
    }
  },
  methods: {
    /**
     * Запрашиваем текущего пользователя:
     * должен вернуться JSON вида { id, username, organization: {...} }
     * где organization.is_main = true/false
     */
    async getCurrentUserInfo() {
      try {
        const resp = await axios.get('/api/user_info/')
        return resp.data
      } catch (error) {
        console.error('Ошибка getCurrentUserInfo():', error)
        return null
      }
    },

    /**
     * Запрашиваем дочерние организации для parent org
     * (Например /api/organizations/?parent_id=XX)
     */
    async fetchChildOrganizations(parentId) {
      try {
        const resp = await axios.get('/api/organizations/', {
          params: { parent_id: parentId }
        })
        this.organizations = resp.data
      } catch (error) {
        console.error('Ошибка при загрузке дочерних организаций:', error)
      }
    },

    /**
     * Загружаем устройства, принадлежащие организации selectedOrgId
     */
    async fetchDevicesForOrg() {
      if (!this.selectedOrgId) {
        this.devices = []
        this.selectedDeviceId = ''
        return
      }
      try {
        const resp = await axios.get('/api/devices/', {
          params: { organization_id: this.selectedOrgId }
        })
        this.devices = resp.data
        // Если есть хотя бы одно устройство, выберем первое
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
       // 1) Если нужно, добавить секунды:
      if (this.form.Valid.beginTime.length === 16) {
        this.form.Valid.beginTime += ':00'
      }
      if (this.form.Valid.endTime.length === 16) {
        this.form.Valid.endTime += ':00'
      }
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

        // (2) Если есть фото => делаем PUT
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
