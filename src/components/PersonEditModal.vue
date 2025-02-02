<template>
  <div class="modal-backdrop">
    <div class="modal-content">
      <h3>Редактировать персону</h3>
      <form @submit.prevent="onSave">
        <div>
          <label>employeeNo:</label>
          <input v-model="localPerson.employeeNo" disabled />
        </div>

        <div>
          <label>name:</label>
          <input v-model="localPerson.name" required />
        </div>

        <div>
          <label>userType:</label>
          <select v-model="localPerson.userType">
            <option value="normal">normal</option>
            <option value="visitor">visitor</option>
            <option value="blackList">blackList</option>
            <option value="maintenance">maintenance</option>
          </select>
        </div>

        <div>
          <label>Valid с:</label>
          <input
            type="datetime-local"
            v-model="localPerson.Valid.beginTime"
            step="1"
          />
        </div>

        <div>
          <label>Valid по:</label>
          <input
            type="datetime-local"
            v-model="localPerson.Valid.endTime"
            step="1"
          />
        </div>

        <div>
          <label>Новое фото (face):</label>
          <input type="file" accept="image/*" @change="onFileChange" />
        </div>
        <div v-if="hasFaceFile">
          <p>Загружен файл: {{ faceFileName }}</p>
          <button type="button" @click="removeFaceFile">Удалить выбранный файл</button>
        </div>

        <div v-if="canDeleteFace">
          <button type="button" @click="onDeleteFace">Удалить лицо с устройства</button>
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
  name: 'PersonEditModal',
  props: {
    deviceId: {
      type: Number,
      required: true
    },
    person: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      localPerson: JSON.parse(JSON.stringify(this.person)),
      faceFile: null
    }
  },
  computed: {
    canDeleteFace() {
      return !!this.localPerson.employeeNo
    },
    hasFaceFile() {
      return !!this.faceFile
    },
    faceFileName() {
      return this.faceFile ? this.faceFile.name : ''
    }
  },
  methods: {
    onFileChange(e) {
      const files = e.target.files
      if (files && files.length > 0) {
        this.faceFile = files[0]
      } else {
        this.faceFile = null
      }
    },
    removeFaceFile() {
      this.faceFile = null
    },
    async onSave() {
      const employeeNo = this.localPerson.employeeNo
      try {
        // 1) Обновим Person
        await axios.put(
          `/api/devices/${this.deviceId}/persons/${employeeNo}/`,
          this.localPerson
        )
        console.log('Персона обновлена')

        // 2) Если загружен файл с лицом — зальём/обновим
        if (this.faceFile) {
          const formData = new FormData()
          formData.append('face_lib_type', 'blackFD')
          formData.append('fdid', '1')
          formData.append('image', this.faceFile)

          // PUT (edit_face):
          const faceUrl = `/api/devices/${this.deviceId}/persons/${employeeNo}/face/${employeeNo}/`

          await axios.put(faceUrl, formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          })
          console.log('Лицо обновлено/добавлено')
        }
        this.$emit('saved')
      } catch (error) {
        console.error('Ошибка при сохранении:', error)
        if (error.response && error.response.data) {
          alert('Ошибка: ' + JSON.stringify(error.response.data))
        } else {
          alert('Неизвестная ошибка')
        }
      }
    },
    async onDeleteFace() {
      if (!confirm('Точно удалить лицо у пользователя?')) {
        return
      }
      const employeeNo = this.localPerson.employeeNo
      try {
        await axios.delete(
          `/api/devices/${this.deviceId}/persons/${employeeNo}/face/${employeeNo}/`
        )
        alert('Лицо успешно удалено')
      } catch (error) {
        console.error('Ошибка при удалении лица:', error)
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
    width: 400px;
    max-width: 90%;
    border-radius: 6px;
    position: relative;
  }
  
  .modal-buttons {
    margin-top: 1rem;
    display: flex;
    gap: 1rem;
  }
</style>
  