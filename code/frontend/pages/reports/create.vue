<template>
  <div class="min-h-screen bg-gray-50 py-8 px-4">
    <div class="max-w-2xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <NuxtLink to="/myTrip" class="flex items-center text-blue-600 hover:text-blue-700 mb-4">
          <Icon name="mdi:arrow-left" class="w-5 h-5" />
          <span class="ml-2">กลับ</span>
        </NuxtLink>
        <h1 class="text-3xl font-bold text-gray-900">รายงานปัญหา</h1>
        <p class="mt-2 text-gray-600">โปรดระบุรายละเอียดปัญหาที่คุณประสบพบ</p>
      </div>

      <!-- Eligibility Check -->
      <div v-if="loading" class="bg-white rounded-lg shadow-md p-6 text-center">
        <Icon name="mdi:loading" class="w-8 h-8 animate-spin mx-auto text-blue-500 mb-4" />
        <p class="text-gray-600">กำลังตรวจสอบสิทธิ์...</p>
      </div>

      <div v-else-if="eligibilityError" class="bg-red-50 border border-red-200 rounded-lg shadow-md p-6">
        <div class="flex items-start gap-4">
          <Icon name="mdi:alert-circle" class="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
          <div>
            <h3 class="font-semibold text-red-900 mb-2">ไม่สามารถส่งรายงานได้</h3>
            <p class="text-red-700 mb-4">{{ eligibilityError }}</p>
            <NuxtLink to="/myTrip" class="text-red-600 hover:text-red-700 font-medium">
              ← กลับไปหน้าการเดินทาง
            </NuxtLink>
          </div>
        </div>
      </div>

      <div v-else-if="isEligible" class="space-y-4">
        <!-- Trip Info Card -->
        <div class="bg-white border border-gray-200 rounded-lg p-4">
          <h3 class="font-semibold text-gray-900 mb-3">ข้อมูลการเดินทาง</h3>
          <div v-if="bookingData" class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p class="text-gray-500">เส้นทาง</p>
              <p class="text-gray-900 font-medium">{{ bookingData.route?.locationFrom?.name || bookingData.route?.locationFrom?.address }} → {{ bookingData.route?.locationTo?.name || bookingData.route?.locationTo?.address }}</p>
            </div>
            <div>
              <p class="text-gray-500">วันที่</p>
              <p class="text-gray-900">{{ new Date(bookingData.route?.updatedAt).toLocaleDateString('th-TH') }}</p>
            </div>
            <div>
              <p class="text-gray-500">คนขับ</p>
              <p class="text-gray-900">{{ bookingData.route?.driver?.firstName }} {{ bookingData.route?.driver?.lastName }}</p>
            </div>
            <div>
              <p class="text-gray-500">ยานพาหนะ</p>
              <p class="text-gray-900">{{ bookingData.route?.vehicle?.vehicleModel }}</p>
            </div>
          </div>
        </div>

        <!-- Report Form -->
        <div class="bg-white border border-gray-200 rounded-lg p-4 space-y-6">
          <!-- Category Section -->
          <div>
            <label class="block text-sm font-medium text-gray-900 mb-2">
              หมวดหมู่รายงาน <span class="text-red-500">*</span>
            </label>
            <select 
              v-model="selectedCategory"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- เลือกหมวดหมู่ --</option>
              <option value="INAPPROPRIATE_BEHAVIOR">พฤติกรรมที่ไม่เหมาะสม</option>
              <option value="LOST_ITEM">ของหายหลังเดินทาง</option>
              <option value="CLEANLINESS">ความสะอาดของรถ</option>
              <option value="OTHER">อื่น ๆ</option>
              <option value="VIOLATED_AGREEMENT">ละเมิดข้อตกลง</option>
              <option value="DETAILS_MISMATCH">รายละเอียดไม่ตรงกัน</option>
            </select>
          </div>

          <!-- Report Topic -->
          <div>
            <label class="block text-sm font-medium text-gray-900 mb-2" id="report_name">
              เรื่อง <span class="text-red-500">*</span>
            </label>
            <input 
              v-model="reportTopic"
              type="text"
              placeholder="โปรดระบุเรื่องของรายงาน"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <!-- Report Description -->
          <div>
            <label class="block text-sm font-medium text-gray-900 mb-2" id="report_dt">
              รายละเอียด <span class="text-red-500">*</span>
            </label>
            <textarea 
              v-model="reportDescription"
              rows="4"
              placeholder="โปรดอธิบายรายละเอียดของปัญหา"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
            ></textarea>
          </div>

          <!-- Evidence Section -->
          <div>
            <h3 class="block text-sm font-medium text-gray-900 mb-3">
              หลักฐาน (ไม่จำเป็นแต่แนะนำ)
            </h3>

            <!-- Media Upload -->
            <div class="mb-4">
              <label class="block text-sm text-gray-700 mb-2">
                ไฟล์มีเดีย: รูปภาพและวิดีโอ (สูงสุด 3 ไฟล์รวม)
              </label>
              <div 
                @drop="handleMediaDrop"
                @dragover.prevent="isDraggingMedia = true"
                @dragleave.prevent="isDraggingMedia = false"
                :class="['border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition', isDraggingMedia ? 'border-blue-500 bg-blue-50' : 'border-gray-300']"
              >
                <input 
                  ref="mediaInput"
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/jpg,video/mp4"
                  @change="handleMediaSelect"
                  class="hidden"
                />
                <div @click="$refs.mediaInput.click()" class="cursor-pointer">
                  <Icon name="mdi:image-video" class="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p class="text-gray-600">คลิกเพื่ออัพโหลดหรือลากไฟล์มาที่นี่</p>
                  <p class="text-xs text-gray-500 mt-1">รูปภาพ: PNG, JPG, JPEG (max 10MB) | วิดีโอ: MP4 (max 30MB)</p>
                </div>
              </div>

              <!-- Media Preview -->
              <div v-if="selectedMedia.length > 0" class="mt-4">
                <div class="flex items-center justify-between mb-3">
                  <h4 class="font-semibold text-gray-900">ไฟล์ที่เลือก ({{ selectedMedia.length }}/3)</h4>
                  <button 
                    type="button"
                    @click="selectedMedia = []"
                    class="text-sm text-red-600 hover:text-red-700"
                  >
                    ลบทั้งหมด
                  </button>
                </div>
                <div class="space-y-3">
                  <div v-for="(media, index) in selectedMedia" :key="index" class="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                    <!-- Thumbnail -->
                    <div class="relative w-16 h-16 flex-shrink-0">
                      <img 
                        v-if="media.type === 'image'"
                        :src="media.preview" 
                        :alt="`Media ${index}`"
                        class="w-full h-full object-cover rounded"
                      />
                      <div v-else class="w-full h-full bg-gray-900 rounded flex items-center justify-center">
                        <Icon name="mdi:play" class="w-6 h-6 text-white" />
                      </div>
                    </div>

                    <!-- Info -->
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-gray-900 truncate">{{ media.file.name }}</p>
                      <p class="text-xs text-gray-500">
                        {{ media.type === 'image' ? 'รูปภาพ' : 'วิดีโอ' }} • {{ (media.file.size / 1024 / 1024).toFixed(2) }} MB
                      </p>
                    </div>

                    <!-- Remove button -->
                    <button 
                      type="button"
                      @click="removeMedia(index)"
                      class="flex-shrink-0 px-3 py-1 ml-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition duration-150 ease-in-out"
                      title="ลบไฟล์นี้"
                    >
                      ลบ
                    </button>
                  </div>
                </div>

                <!-- Size warning -->
                <div class="mt-3 text-xs text-gray-500">
                  <p>รวมขนาด: {{ getTotalMediaSize() }} MB</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Alert Message -->
          <Transition
            name="fade-slide"
            @enter="onAlertEnter"
            @leave="onAlertLeave"
          >
            <div 
              v-if="showAlert && reportService.error" 
              class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm flex items-start gap-3"
              :style="{ opacity: alertOpacity }"
            >
              <Icon name="mdi:alert-circle" class="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div class="flex-1">
                {{ reportService.error }}
              </div>
              <button
                type="button"
                @click="dismissAlert"
                class="text-red-400 hover:text-red-600 flex-shrink-0"
              >
                <Icon name="mdi:close" class="w-5 h-5" />
              </button>
            </div>
          </Transition>

          <!-- Contact Info Section -->
          <div class="bg-gray-50 rounded-lg p-4">
            <h3 class="font-semibold text-gray-900 mb-3">ข้อมูลติดต่อ <span class="text-red-500">*</span></h3>
            
            <div class="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label class="block text-sm text-gray-700 mb-1" id="Name">ชื่อจริง <span class="text-red-500">*</span></label>
                <input 
                  v-model="contactFirstName"
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label class="block text-sm text-gray-700 mb-1" id="last_name">นามสกุล <span class="text-red-500">*</span></label>
                <input 
                  v-model="contactLastName"
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div class="mb-4">
              <label class="block text-sm text-gray-700 mb-1" id="num">เบอร์โทรศัพท์ <span class="text-red-500">*</span></label>
              <input 
                v-model="contactPhone"
                type="tel"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label class="block text-sm text-gray-700 mb-1" id="report_mail">อีเมล</label>
              <input 
                v-model="contactEmail"
                type="email"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <!-- Form Actions -->
          <div class="flex gap-4 pt-4 border-t">
            <button 
              type="button"
              @click="$router.back()"
              class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
            >
              ยกเลิก
            </button>
            <button 
              @click="submitReport"
              :disabled="loading || !isFormValid"
              class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <Icon v-if="loading" name="mdi:loading" class="w-5 h-5 animate-spin mr-2" />
              {{ loading ? 'กำลังส่ง...' : 'ส่งรายงาน' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useReport } from '@/composables/useReport'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const route = useRoute()
const { user } = useAuth()
const reportService = useReport()

// State
const bookingId = ref(route.query.bookingId)
const loading = ref(false)
const bookingData = ref(null)
const isEligible = ref(false)
const eligibilityError = ref('')

// Form Data
const selectedCategory = ref('')
const reportTopic = ref('')
const reportDescription = ref('')
const selectedMedia = ref([])
const contactFirstName = ref('')
const contactLastName = ref('')
const contactPhone = ref('')
const contactEmail = ref('')

// UI State
const isDraggingMedia = ref(false)
const showAlert = ref(false)
const alertOpacity = ref(1)
let alertTimeoutId = null
let alertDismissTimeoutId = null

// Refs
const mediaInput = ref(null)

// Fetch booking data and check eligibility
const fetchBookingData = async () => {
  try {
    loading.value = true
    if (!bookingId.value) {
      eligibilityError.value = 'ไม่พบข้อมูลการจองที่จะรายงาน'
      return
    }

    // Check if can report
    const canReportResult = await reportService.checkCanReport(bookingId.value)
    if (canReportResult.canReport) {
      isEligible.value = true
      bookingData.value = canReportResult.booking
      // Pre-fill contact info
      if (user.value) {
        const nameParts = (user.value.firstName || '') + ' ' + (user.value.lastName || '')
        const names = nameParts.trim().split(' ')
        contactFirstName.value = names[0] || ''
        contactLastName.value = names.slice(1).join(' ') || ''
        contactPhone.value = user.value.phoneNumber || ''
        contactEmail.value = user.value.email || ''
      }
    } else {
      eligibilityError.value = canReportResult.reason || 'ไม่สามารถรายงานการจองนี้ได้'
    }
  } catch (error) {
    console.error('Error fetching booking:', error)
    eligibilityError.value = error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล'
  } finally {
    loading.value = false
  }
}

// Media Handling
const handleMediaDrop = (e) => {
  isDraggingMedia.value = false
  const files = Array.from(e.dataTransfer.files)
  processMediaFiles(files)
}

const handleMediaSelect = (e) => {
  const files = Array.from(e.target.files)
  processMediaFiles(files)
}

const processMediaFiles = (files) => {
  // Filter for valid media files
  const validFiles = files.filter(file => {
    const mimeType = file.type.toLowerCase()
    return mimeType.startsWith('image/') || mimeType.startsWith('video/')
  })

  // Check total count (max 3 files)
  const totalFiles = selectedMedia.value.length + validFiles.length
  if (totalFiles > 3) {
    showErrorAlert(`ไม่สามารถเพิ่มไฟล์ได้ เพราะจะเกิน 3 ไฟล์ (ปัจจุบัน: ${selectedMedia.value.length}, เพิ่มเติม: ${validFiles.length})`)
    return
  }

  // Process each file
  validFiles.forEach(file => {
    const mimeType = file.type.toLowerCase()
    const isImage = mimeType.startsWith('image/')
    const isVideo = mimeType.startsWith('video/')

    // Validate file type and size
    if (isImage) {
      if (file.size > 10 * 1024 * 1024) {
        showErrorAlert(`ไฟล์รูปภาพ "${file.name}" เกิน 10 MB`)
        return
      }
    } else if (isVideo) {
      if (file.size > 30 * 1024 * 1024) {
        showErrorAlert(`ไฟล์วิดีโอ "${file.name}" เกิน 30 MB`)
        return
      }
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      selectedMedia.value.push({
        file,
        preview: e.target.result,
        type: isImage ? 'image' : 'video'
      })
    }
    reader.readAsDataURL(file)
  })
}

const removeMedia = (index) => {
  selectedMedia.value.splice(index, 1)
}

const getTotalMediaSize = () => {
  const totalBytes = selectedMedia.value.reduce((sum, media) => sum + media.file.size, 0)
  return (totalBytes / 1024 / 1024).toFixed(2)
}

// Alert Management
const showErrorAlert = (message) => {
  reportService.error = message
  showAlert.value = true
  alertOpacity.value = 1
  
  // Clear existing timeouts
  if (alertTimeoutId) clearTimeout(alertTimeoutId)
  if (alertDismissTimeoutId) clearTimeout(alertDismissTimeoutId)
  
  // Hide alert after 15 seconds
  alertTimeoutId = setTimeout(() => {
    alertOpacity.value = 0
    alertDismissTimeoutId = setTimeout(() => {
      showAlert.value = false
      reportService.error = ''
    }, 300) // Match transition duration
  }, 15000)
}

const dismissAlert = () => {
  if (alertDismissTimeoutId) clearTimeout(alertDismissTimeoutId)
  if (alertTimeoutId) clearTimeout(alertTimeoutId)
  alertOpacity.value = 0
  alertDismissTimeoutId = setTimeout(() => {
    showAlert.value = false
    reportService.error = ''
  }, 300)
}

const onAlertEnter = (el) => {
  el.style.transition = 'opacity 0.3s ease, transform 0.3s ease'
}

const onAlertLeave = (el) => {
  el.style.transition = 'opacity 0.3s ease, transform 0.3s ease'
}

// Form Validation
const isFormValid = computed(() => {
  return (
    selectedCategory.value &&
    reportTopic.value.trim() &&
    reportDescription.value.trim() &&
    contactFirstName.value.trim() &&
    contactLastName.value.trim() &&
    contactPhone.value.trim()
  )
})

// Submit Report
const submitReport = async () => {
  if (!isFormValid.value) {
    showErrorAlert('กรุณากรอกข้อมูลที่จำเป็นทั้งหมด')
    return
  }

  if (selectedMedia.value.length === 0) {
    showErrorAlert('กรุณาเพิ่มหลักฐานอย่างน้อย 1 ไฟล์ (รูปภาพหรือวิดีโอ)')
    return
  }

  try {
    loading.value = true
    dismissAlert()

    // Prepare form data
    const formData = new FormData()
    formData.append('bookingId', bookingId.value)
    formData.append('category', selectedCategory.value)
    formData.append('reportTopic', reportTopic.value)
    formData.append('reportDescription', reportDescription.value)
    formData.append('contactFirstName', contactFirstName.value)
    formData.append('contactLastName', contactLastName.value)
    formData.append('contactPhoneNumber', contactPhone.value)
    formData.append('contactEmail', contactEmail.value)

    // Add media files
    selectedMedia.value.forEach(media => {
      formData.append('media', media.file)
    })

    // Submit
    const result = await reportService.createReport(formData)
    
    // Success - redirect to tracking
    await router.push('/reports/tracking')
  } catch (error) {
    console.error('Error submitting report:', error)
    showErrorAlert(error.message || 'เกิดข้อผิดพลาดในการส่งรายงาน')
  } finally {
    loading.value = false
  }
}

// Cleanup on unmount
const onUnmounted = () => {
  if (alertTimeoutId) clearTimeout(alertTimeoutId)
  if (alertDismissTimeoutId) clearTimeout(alertDismissTimeoutId)
}

// Initialize on mount
onMounted(() => {
  fetchBookingData()
})

// Cleanup on unmount
onBeforeUnmount(() => {
  onUnmounted()
})
</script>

<style scoped>
/* Fade and slide transition for alerts */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
