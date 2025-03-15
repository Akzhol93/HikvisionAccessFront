<template>
  <div class="modal-backdrop">
    <div class="modal-content">
      <h3>Редактировать пользователя</h3>
      <form @submit.prevent="onSave">

        <div class="form-row">
          <label>Класс:</label>
          <input v-model="localPerson.belongGroup" />
        </div>

        <!-- ИИН -->
        <div class="form-row">
          <label>ИИН:</label>
          <input v-model="localPerson.employeeNo" disabled />
        </div>

        <!-- Имя -->
        <div class="form-row">
          <label>Имя:</label>
          <input v-model="localPerson.name" required />
        </div>

        <!-- Тип пользователя -->
        <div class="form-row">
          <label>Тип пользователя:</label>
          <select v-model="localPerson.userType">
            <option value="normal">normal</option>
            <option value="visitor">visitor</option>
            <option value="blackList">blackList</option>
            <option value="maintenance">maintenance</option>
          </select>
        </div>

        <!-- Доступ с -->
        <div class="form-row">
          <label>Доступ с:</label>
          <input
            type="datetime-local"
            v-model="localPerson.Valid.beginTime"
            step="1"
          />
        </div>

        <!-- Доступ по -->
        <div class="form-row">
          <label>Доступ по:</label>
          <input
            type="datetime-local"
            v-model="localPerson.Valid.endTime"
            step="1"
          />
        </div>

        <!-- (1) Новое фото -->
        <div class="form-row">
          <label>Новое фото:</label>
          <div class="file-input-wrapper">
            <!-- ref="fileInput" нужно, чтобы сбрасывать value при removeNewFile() -->
            <input
              ref="fileInput"
              type="file"
              accept="image/*"
              @change="onFileChange"
            />
            <!-- (2) Если файл выбран, показываем название и иконку "мусорка" -->
            <div
              v-if="faceFile"
              class="selected-file-info"
            >
              <!-- <span class="file-name">{{ faceFile.name }}</span> -->
              <img
                class="trash-icon"
                :src="trashIconUrl"
                alt="Удалить"
                @click="removeNewFile"
              />
            </div>
          </div>
        </div>

        <!-- (3) «Удалить фото» (чекбокс), если есть старое фото на устройстве -->
        <div class="checkbox-row" v-if="hasFaceOnDevice">
          <label>
            <input type="checkbox" v-model="deletePhoto" />
            Удалить старое фото
          </label>
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
      faceFile: null,          // загруженный пользователем файл
      deletePhoto: false,      // чекбокс "Удалить фото"
      trashIconUrl: require('@/assets/trash.png')
      // Либо вы можете скачать этот PNG/SVG и указать локальный путь:
      // trashIconUrl: require('@/assets/icons/trash.png') 
      // или что-то подобное
    }
  },
  computed: {
    // true, если у пользователя уже есть фото на устройстве
    hasFaceOnDevice() {
      return !!this.localPerson.hasFaceOnDevice
    }
  },
  mounted() {
    // При открытии модалки сразу проверим, есть ли фото на устройстве
    this.checkIfFaceExists()
  },
  methods: {
    // Запрос, чтобы понять, есть ли уже фото (numOfMatches>0 => значит есть)
    async checkIfFaceExists() {
      try {
        const url = `/api/devices/${this.deviceId}/persons/${this.localPerson.employeeNo}/face/${this.localPerson.employeeNo}`
        const resp = await axios.get(url, { params: { face_lib_type: 'blackFD', fdid: '1' }})
        if (resp.data.numOfMatches && resp.data.numOfMatches > 0) {
          this.localPerson.hasFaceOnDevice = true
        } else {
          this.localPerson.hasFaceOnDevice = false
        }
      } catch (err) {
        console.error('Ошибка проверки лица:', err)
        // Если ошибка, условно считаем, что нет фото
        this.localPerson.hasFaceOnDevice = false
      }
    },

    // (A) Выбор нового файла => сохраняем в this.faceFile 
    // и сбрасываем "удалить фото"
    onFileChange(e) {
      const files = e.target.files
      if (files && files.length > 0) {
        this.faceFile = files[0]
        this.deletePhoto = false
      } else {
        this.faceFile = null
      }
    },

    // (B) Удалить (сбросить) выбранный новый файл
    removeNewFile() {
      this.faceFile = null
      if (this.$refs.fileInput) {
        // Сброс value у <input type="file">
        this.$refs.fileInput.value = ''
      }
    },

    // (C) Кнопка "Сохранить" => PUT person, затем PUT/DELETE фото
    async onSave() {
      const employeeNo = this.localPerson.employeeNo
      try {
        // (1) Сначала обновляем поля пользователя
        await axios.put(
          `/api/devices/${this.deviceId}/persons/${employeeNo}/`,
          this.localPerson
        )

        // (2) Затем обновляем/удаляем фото
        if (this.faceFile) {
          // PUT с новым файлом
          const formData = new FormData()
          formData.append('face_lib_type', 'blackFD')
          formData.append('fdid', '1')
          formData.append('image', this.faceFile)
          
          await axios.put(
            `/api/devices/${this.deviceId}/persons/${employeeNo}/face/${employeeNo}/`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
          )
        } else if (this.deletePhoto && this.hasFaceOnDevice) {
          // DELETE старого фото
          await axios.delete(
            `/api/devices/${this.deviceId}/persons/${employeeNo}/face/${employeeNo}/`
          )
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

/* Поля в ряд: label слева, input справа */
.form-row {
  margin-bottom: 0.6rem;
  display: flex;
  align-items: center;
}

.form-row label {
  width: 110px;   /* Подберите ширину на свой вкус */
  margin-right: 8px;
  font-weight: 500;
  margin-bottom: 0;
}

/* Обертка, чтобы filename и trash-icon были на одной линии */
.file-input-wrapper {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

/* В этом блоке показываем file.name и иконку "мусорка" */
.selected-file-info {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background-color: #f0f0f0;
  padding: 2px 8px;
  border-radius: 4px;
}

/* Стиль названия файла */
.file-name {
  font-size: 0.9rem;
  color: #333;
}

/* Кнопка(иконка) "мусорка" */
.trash-icon {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.checkbox-row {
  margin-bottom: 0.6rem;
  display: flex;
  align-items: center;
}

.modal-buttons {
  margin-top: 1rem;
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}
</style>
