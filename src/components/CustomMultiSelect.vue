<template>
  <div class="custom-multiselect">
    <!-- Шапка с «n of m selected» -->
    <div
      class="custom-multiselect__label"
      :class="{ disabled: disabled }"
      @click.stop="toggleDropdown"
    >
      <span v-if="!selectedItems.length">Выбрать</span>
      <span v-else>{{ selectedItems.length }} of {{ options.length }} selected</span>
      <span class="arrow" :class="{ open: isOpen }"></span>
    </div>

    <!-- Выпадающее меню с чекбоксами -->
    <transition name="fade">
      <div
        v-if="isOpen"
        class="custom-multiselect__dropdown"
        :style="dropdownStyle"
        @click.stop
      >
        <div
          class="custom-multiselect__option"
          v-for="(option, index) in options"
          :key="optionKey(option, index)"
          @click="toggleOption(option)"
        >
          <!-- Сам чекбокс -->
          <input
            type="checkbox"
            :checked="isSelected(option)"
            class="option-checkbox"
          />
          <!-- Текст рядом -->
          <span class="option-label">{{ getOptionLabel(option) }}</span>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
export default {
  name: 'CustomMultiSelect',
  props: {
    // Массив всех доступных опций
    options: {
      type: Array,
      default: () => []
    },
    // Массив выбранных опций (для v-model)
    modelValue: {
      type: Array,
      default: () => []
    },
    // Какое поле объекта использовать для отображения названия
    labelProp: {
      type: String,
      default: 'name'
    },
    // Какое поле объекта использовать как ключ (id)
    optionKeyProp: {
      type: String,
      default: 'id'
    },
    // Возможность заблокировать селект
    disabled: {
      type: Boolean,
      default: false
    },
    // Порог, после которого появится скролл (можно захардкодить 15)
    scrollThreshold: {
      type: Number,
      default: 15
    },
    // Максимальная высота (px), когда включается скролл
    maxHeight: {
      type: Number,
      default: 200
    }
  },
  data() {
    return {
      isOpen: false
    }
  },
  computed: {
    selectedItems() {
      return this.modelValue
    },
    // Стиль для дропдауна (чтобы показывать скролл, если опций много)
    dropdownStyle() {
      if (this.options.length > this.scrollThreshold) {
        return {
          maxHeight: this.maxHeight + 'px',
          overflowY: 'auto'
        }
      }
      return {}
    }
  },
  mounted() {
    // Вешаем глобальный обработчик клика, чтобы отслеживать клик вне компонента
    document.addEventListener('click', this.handleClickOutside)
  },
  beforeUnmount() {
    document.removeEventListener('click', this.handleClickOutside)
  },
  methods: {
    toggleDropdown() {
      if (this.disabled) return
      this.isOpen = !this.isOpen
    },
    handleClickOutside(evt) {
      // Если кликнули вне текущего компонента
      if (!this.$el.contains(evt.target)) {
        this.isOpen = false
      }
    },
    isSelected(option) {
      const key = option[this.optionKeyProp]
      return this.selectedItems.some(
        (item) => item[this.optionKeyProp] === key
      )
    },
    toggleOption(option) {
      const key = option[this.optionKeyProp]
      const alreadySelectedIndex = this.selectedItems.findIndex(
        (item) => item[this.optionKeyProp] === key
      )

      let newValue
      if (alreadySelectedIndex >= 0) {
        // удаляем
        newValue = [
          ...this.selectedItems.slice(0, alreadySelectedIndex),
          ...this.selectedItems.slice(alreadySelectedIndex + 1)
        ]
      } else {
        // добавляем
        newValue = [...this.selectedItems, option]
      }
      this.$emit('update:modelValue', newValue)
    },
    getOptionLabel(option) {
      if (typeof this.labelProp === 'function') {
        return this.labelProp(option)
      }
      return option[this.labelProp]
    },
    optionKey(option, index) {
      return option[this.optionKeyProp] || index
    }
  }
}
</script>

<style scoped>
.custom-multiselect {
  position: relative;
  display: inline-block;
  width: 100%; 
  font-family: sans-serif;
  cursor: pointer;
}

/* Шапка (label) */
.custom-multiselect__label {
  background: #f9f9f9;
  border: 1px solid #ccc;
  padding: 6px 10px;
  border-radius: 4px;
  user-select: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}

/* В состоянии disabled отключаем курсор и цвет */
.custom-multiselect__label.disabled {
  background: #eee;
  color: #999;
  cursor: not-allowed;
}

.custom-multiselect__label:hover {
  background: #eaeaea;
}

/* Внешний блок выпадающего меню */
.custom-multiselect__dropdown {
  position: absolute;
  z-index: 999;
  background: #fff;
  border: 1px solid #ccc;
  width: 100%;
  margin-top: 4px;
  border-radius: 4px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
}

/* Каждая опция */
.custom-multiselect__option {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  cursor: pointer;
}
.custom-multiselect__option:hover {
  background-color: #f5f5f5;
}

.option-checkbox {
  margin-right: 8px;
  pointer-events: none; /* чтобы клик обрабатывал родитель (div) */
}

/* Текст рядом с чекбоксом */
.option-label {
  pointer-events: none; /* тоже чтобы не перехватывать */
}

/* Анимация появления */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter, .fade-leave-to {
  opacity: 0;
}

/* Стрелочка */
.arrow {
  display: inline-block;
  margin-left: 8px;
  width: 0; 
  height: 0; 
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 5px solid #888;
  transition: transform 0.2s;
}
.arrow.open {
  transform: rotate(180deg);
}
</style>
