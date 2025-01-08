<template>
    <div class="modal-backdrop">
      <div class="modal-content">
        <h3>Редактировать персону</h3>
        <form @submit.prevent="onSave">
          <!-- employeeNo менять обычно нельзя, поэтому disabled -->
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
  
          <!-- (добавим поле для замены / добавления лица) -->
          <div>
            <label>Новое фото (face):</label>
            <input type="file" accept="image/*" @change="onFileChange" />
          </div>
          <div v-if="hasFaceFile">
            <p>Загружен файл: {{ faceFileName }}</p>
            <button type="button" @click="removeFaceFile">Удалить выбранный файл</button>
          </div>
  
          <!-- (добавим кнопку "Удалить лицо") -->
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
      // Для отображения кнопки «Удалить лицо» (или любую вашу логику)
      canDeleteFace() {
        // Логика: если у пользователя уже есть лицо, мы можем его удалить
        // Для упрощения предположим, что "employeeNo" != null -> можно удалять
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
      // При выборе файла
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
        // 1) Сохраняем данные персоны (PUT)
        const employeeNo = this.localPerson.employeeNo
        try {
          // Приводим даты к нужному формату (при необходимости)
          // Например, уберем секунды, если нужно
          // (но если уже v-model="2025-01-01T00:00" - все ок)
          // Если на бэкенде нужно "YYYY-MM-DDTHH:mm:ss", можно дописать ":00"
  
          await axios.put(
            `/api/devices/${this.deviceId}/persons/${employeeNo}/`,
            this.localPerson
          )
          console.log('Персона обновлена')
  
          // 2) Если загружен файл с лицом => вызываем edit_face (или add_face), 
          //    в зависимости от вашей логики
          if (this.faceFile) {
            // Читаем файл как двоичные данные
            const formData = new FormData()
            formData.append('face_lib_type', 'blackFD')  // пример
            formData.append('fdid', '1')                 // пример
            // employeeNo = FPID
            formData.append('image', this.faceFile)
  
            // В бэкенде у вас метод update() -> service.edit_face(...)
            // Но удобнее сделать отдельный эндпоинт: 
            //   PUT /devices/{deviceId}/persons/{employeeNo}/face
            //   (или reuse existing /face/{employeeNo}).
            // Предположим, что у вас update() в FaceViewSet используется:
            const faceUrl = `/api/devices/${this.deviceId}/persons/${employeeNo}/face/${employeeNo}/`
  
            await axios.put(faceUrl, formData, {
              headers: {
                'Content-Type': 'multipart/form-data'
              }
            })
            console.log('Лицо обновлено/добавлено')
          }
  
          // Сообщаем родителю, что всё ок
          this.$emit('saved')
        } catch (error) {
          console.error('Ошибка при сохранении:', error)
        }
      },
      async onDeleteFace() {
        if (!confirm('Точно удалить лицо у пользователя?')) {
          return
        }
        const employeeNo = this.localPerson.employeeNo
        try {
          // Удаляем лицо
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
  