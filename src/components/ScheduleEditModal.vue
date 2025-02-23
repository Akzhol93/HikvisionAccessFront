<template>
    <div class="modal-overlay">
      <div class="modal">
        <h2>Редактирование графика доступа</h2>
        <!-- 
           Например, device.schedules[scheduleId].weekPlan — массив из 7 элементов, 
           где каждый элемент: {week: "Monday", id:1, enable: true/false, TimeSegment: {...} }
        -->
        <div v-for="(item, index) in weekPlanLocal" :key="index" class="day-row">
          <label>
            <strong>{{ getRusDayName(item.week) }} </strong>
            <!-- enable toggle -->
            <input type="checkbox" v-model="item.enable" />
            <span v-if="item.enable">
              <!-- beginTime / endTime -->
              c:
              <input
                type="time"
                v-model="item.TimeSegment.beginTime"
                lang="en-GB"
              />
              до:
              <input
                type="time"
                v-model="item.TimeSegment.endTime"
                lang="en-GB"
              />
            </span>
          </label>
        </div>
  
        <div class="buttons">
          <button @click="onSave">Сохранить</button>
          <button @click="closeModal">Отмена</button>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  import api from '@/api'

  export default {
    name: 'ScheduleEditModal',
    props: {
      device: { type: Object, required: true },
      scheduleId: { type: Number, required: true }
    },
    data() {
      return {
        weekPlanLocal: []
      }
    },
    mounted() {
      // Скопируем данные weekPlan в локальный стейт
      // чтобы пользователь мог редактировать, а при отмене - не менялось в "родителе"
      const scheduleData = this.device.schedules[this.scheduleId]
      if (scheduleData && scheduleData.weekPlan) {
        // глубокую копию, чтобы не менять оригинал:
        this.weekPlanLocal = JSON.parse(JSON.stringify(scheduleData.weekPlan))
      }
      // Если нужно, можно также отдельный флаг enable на уровне "UserRightWeekPlanCfg" сохранить,
      // но в вашем случае, как видно, enable берётся из "id=1" объектов. 
      // Либо (что в доках) enable хранится отдельно, можно тоже вынести в data().
    },
    methods: {

      getRusDayName(engDay) {
        const dayMap = {
          Monday: 'Понедельник',
          Tuesday: 'Вторник',
          Wednesday: 'Среда',
          Thursday: 'Четверг',
          Friday: 'Пятница',
          Saturday: 'Суббота',
          Sunday: 'Воскресенье'
        }
        // если в dayMap нет соответствия, вернём исходный engDay
        return dayMap[engDay] || engDay
      },
      toHmsFormat(timeStr) {
          // Если уже есть секунды ("HH:MM:SS"), вернём как есть
          if (!timeStr) return "00:00:00"
          const parts = timeStr.split(":")
          if (parts.length === 2) {
          // Было "HH:MM" => добавим ":00"
          return timeStr + ":00"
          }
          // Иначе (если уже "HH:MM:SS") или что-то другое) не трогаем
          return timeStr
      },
      onSave() {
        // 1. Пройдёмся по каждому дню и «допишем» секунды, если нужно
        this.weekPlanLocal.forEach((item) => {
            item.TimeSegment.beginTime = this.toHmsFormat(item.TimeSegment.beginTime)
            item.TimeSegment.endTime   = this.toHmsFormat(item.TimeSegment.endTime)
        })
        // Нужно сделать PUT-запрос на /api/devices/{device.id}/weekplan/{weekPlanNo}
        // Поскольку вы уже знаете, какой weekPlanNo связан с scheduleId:
        const scheduleData = this.device.schedules[this.scheduleId]
        const weekPlanNo = scheduleData.weekPlanNo
  
        if (!weekPlanNo) {
          alert('weekPlanNo не найден!')
          return
        }
  
        // Формируем payload:
        // По спецификации:
        // {
        //   "UserRightWeekPlanCfg": {
        //     "enable": true,      // scheduleData.enable? - обычно enable на уровне weekPlan
        //     "WeekPlanCfg": [ ... our array ... ]
        //   }
        // }
        // NOTE: Возможно, вам нужно хранить это "enable" отдельно. 
        //       Выглядит, что scheduleData.enable - это флаг на уровне templates. 
        //       А для weekPlan — отдельное поле "enable"? 
        //       Ниже предположим, что "enable" совпадает.
        const payload = {
          UserRightWeekPlanCfg: {
            enable: true,  // или scheduleData.enable? 
            WeekPlanCfg: this.weekPlanLocal
          }
        }

        // Выполним запрос через fetch/axios:
        api.put(`/api/devices/${this.device.id}/weekplan/${weekPlanNo}/`, payload)
          .then((resp) => {
            // Успешно
            console.log('Week plan updated', resp.data)
            // Сообщим «родителю», что мы сохранили
            this.$emit('saved', {
              deviceId: this.device.id,
              scheduleId: this.scheduleId,
              updatedWeekPlan: JSON.parse(JSON.stringify(this.weekPlanLocal))
            })
            // Закрыть модалку
            this.closeModal()
          })
          .catch((err) => {
            console.error('Ошибка при обновлении WeekPlan', err)
            alert('Не удалось сохранить изменения')
          })
      },
      closeModal() {
        this.$emit('close')
      }
    }
  }
  </script>
  
  <style scoped>
  /* Примерная стилизация "модалки" */
  
  .modal-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.3);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 999;
  }
  .modal {
    background: #fff;
    padding: 20px;
    border-radius: 8px;
    width: 400px;
  }
  .day-row {
    margin-bottom: 8px;
  }
  .buttons {
    margin-top: 12px;
    text-align: right;
  }
  </style>
  