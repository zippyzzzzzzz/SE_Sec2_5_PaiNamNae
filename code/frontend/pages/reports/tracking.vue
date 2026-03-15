<template>
  <div class="min-h-screen bg-gray-50 py-8 px-4">
    <div class="max-w-6xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">ติดตามสถานะรายงาน</h1>
        <p class="mt-2 text-gray-600">ดูข้อมูลและสถานะการแก้ไขของรายงานทั้งหมด</p>
      </div>

      <!-- Filters -->
      <div class="bg-white rounded-lg shadow-md p-6 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Status Filter -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">สถานะ</label>
            <select 
              v-model="filterStatus"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">ทั้งหมด</option>
              <option v-for="status in reportStatuses" :key="status.value" :value="status.value">
                {{ status.label }}
              </option>
            </select>
          </div>

          <!-- Category Filter -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">หมวดหมู่</label>
            <select 
              v-model="filterCategory"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">ทั้งหมด</option>
              <option v-for="cat in reportCategories" :key="cat.value" :value="cat.value">
                {{ cat.label }}
              </option>
            </select>
          </div>

          <!-- Search -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">ค้นหา</label>
            <input 
              v-model="searchQuery"
              type="text"
              placeholder="ค้นหาหัวข้อ..."
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <p class="text-2xl font-bold text-blue-600">{{ stats.total }}</p>
          <p class="text-sm text-gray-600 mt-1">รายงานทั้งหมด</p>
        </div>
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <p class="text-2xl font-bold text-yellow-600">{{ stats.pending }}</p>
          <p class="text-sm text-gray-600 mt-1">รอดำเนินการ</p>
        </div>
        <div class="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
          <p class="text-2xl font-bold text-purple-600">{{ stats.inProgress }}</p>
          <p class="text-sm text-gray-600 mt-1">กำลังดำเนินการ</p>
        </div>
        <div class="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <p class="text-2xl font-bold text-green-600">{{ stats.resolved }}</p>
          <p class="text-sm text-gray-600 mt-1">แก้ไขแล้ว</p>
        </div>
      </div>

      <!-- Reports List -->
      <div class="space-y-4">
        <div v-if="isLoading" class="text-center py-12">
          <Icon name="mdi:loading" class="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
          <p class="text-gray-600">กำลังโหลดรายงาน...</p>
        </div>

        <div v-else-if="filteredReports.length === 0" class="bg-white rounded-lg shadow-md p-12 text-center">
          <Icon name="mdi:inbox-outline" class="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p class="text-gray-600">ไม่พบรายงาน</p>
        </div>

        <div v-else v-for="report in filteredReports" :key="report.id" class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
          <div class="p-6">
            <!-- Report Header -->
            <div class="flex items-start justify-between mb-4">
              <div class="flex-1">
                <h3 class="text-lg font-semibold text-gray-900">{{ report.reportTopic }}</h3>
                <div class="flex items-center gap-3 mt-2">
                  <span :class="['px-3 py-1 rounded-full text-xs font-semibold', getCategoryBadgeClass(report.category)]">
                    {{ getCategoryLabel(report.category) }}
                  </span>
                  <span :class="['px-3 py-1 rounded-full text-xs font-semibold', getStatusBadgeClass(report.reportStatus)]">
                    {{ getStatusLabel(report.reportStatus) }}
                  </span>
                </div>
              </div>
              <div class="text-right">
                <p class="text-xs text-gray-500">{{ formatDate(report.createdAt) }}</p>
              </div>
            </div>

            <!-- Trip Info -->
            <div class="bg-gray-50 rounded-lg p-4 mb-4">
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p class="text-gray-600">เส้นทาง</p>
                  <p class="font-medium text-gray-900">{{ report.booking.route.startLocation.address?.split(',')[0] }} → {{ report.booking.route.endLocation.address?.split(',')[0] }}</p>
                </div>
                <div>
                  <p class="text-gray-600">วันที่เดินทาง</p>
                  <p class="font-medium text-gray-900">{{ formatDate(report.booking.route.departureTime) }}</p>
                </div>
                <div>
                  <p class="text-gray-600">คนขับ</p>
                  <p class="font-medium text-gray-900">{{ report.booking.route.driver?.firstName }} {{ report.booking.route.driver?.lastName }}</p>
                </div>
                <div>
                  <p class="text-gray-600">ทะเบียนรถ</p>
                  <p class="font-medium text-gray-900">ทศทท. 5678</p>
                </div>
              </div>
            </div>

            <!-- Status Timeline -->
            <div class="mb-4">
              <p class="text-sm font-semibold text-gray-700 mb-3">ขั้นตอนการดำเนินการ</p>
              <div class="flex items-center justify-between text-xs">
                <div class="flex flex-col items-center">
                  <div :class="['w-8 h-8 rounded-full flex items-center justify-center font-bold text-white', getStatusIcon(report.reportStatus) === 1 ? 'bg-blue-600' : 'bg-gray-300']">
                    ✓
                  </div>
                  <p class="mt-1">ได้รับรายงาน</p>
                </div>
                <div :class="['flex-1 h-1 mx-2', isStatusCompleted(report.reportStatus, 'PENDING') ? 'bg-blue-600' : 'bg-gray-300']"></div>
                
                <div class="flex flex-col items-center">
                  <div :class="['w-8 h-8 rounded-full flex items-center justify-center font-bold text-white', isStatusCompleted(report.reportStatus, 'UNDER_REVIEW') ? 'bg-blue-600' : 'bg-gray-300']">
                    {{ isStatusCompleted(report.reportStatus, 'UNDER_REVIEW') ? '✓' : '2' }}
                  </div>
                  <p class="mt-1">ตรวจสอบ</p>
                </div>
                <div :class="['flex-1 h-1 mx-2', isStatusCompleted(report.reportStatus, 'CONTACTING_DRIVER') ? 'bg-blue-600' : 'bg-gray-300']"></div>
                
                <div class="flex flex-col items-center">
                  <div :class="['w-8 h-8 rounded-full flex items-center justify-center font-bold text-white', isStatusCompleted(report.reportStatus, 'CONTACTING_DRIVER') ? 'bg-blue-600' : 'bg-gray-300']">
                    {{ isStatusCompleted(report.reportStatus, 'CONTACTING_DRIVER') ? '✓' : '3' }}
                  </div>
                  <p class="mt-1">ติดต่อคนขับ</p>
                </div>
                <div :class="['flex-1 h-1 mx-2', isStatusCompleted(report.reportStatus, 'RESOLVED') ? 'bg-blue-600' : 'bg-gray-300']"></div>
                
                <div class="flex flex-col items-center">
                  <div :class="['w-8 h-8 rounded-full flex items-center justify-center font-bold text-white', isStatusCompleted(report.reportStatus, 'RESOLVED') ? 'bg-blue-600' : 'bg-gray-300']">
                    {{ isStatusCompleted(report.reportStatus, 'RESOLVED') ? '✓' : '4' }}
                  </div>
                  <p class="mt-1">แก้ไข</p>
                </div>
              </div>
            </div>

            <!-- Report Content (Collapsible) -->
            <div v-if="expandedReportId === report.id" class="border-t pt-4 mt-4">
              <p class="text-sm text-gray-600 mb-2"><strong>รายละเอียด:</strong></p>
              <p class="text-gray-700 text-sm mb-4">{{ report.reportDescription }}</p>

              <!-- Evidence -->
              <div v-if="report.reportImages || report.reportVideo" class="mb-4">
                <p class="text-sm font-semibold text-gray-700 mb-2">หลักฐาน</p>
                <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <img v-for="(img, idx) in (report.reportImages || [])" :key="`img-${idx}`" :src="img" :alt="`Evidence ${idx}`" class="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-80" />
                </div>
                <div v-if="report.reportVideo" class="mt-3">
                  <video :src="report.reportVideo" controls class="w-full h-32 rounded-lg bg-gray-900" />
                </div>
              </div>

              <!-- Contact Info -->
              <div class="bg-gray-50 rounded-lg p-3 text-sm">
                <p class="font-semibold text-gray-700 mb-2">ข้อมูลติดต่อ</p>
                <p>{{ report.contactFirstName }} {{ report.contactLastName }}</p>
                <p>{{ report.contactPhoneNumber }}</p>
                <p>{{ report.contactEmail }}</p>
              </div>
            </div>

            <!-- Expand Button -->
            <button 
              @click="toggleExpanded(report.id)"
              class="text-blue-600 hover:text-blue-700 text-sm font-medium mt-4"
            >
              {{ expandedReportId === report.id ? 'ซ่อน' : 'แสดง' }} รายละเอียด
            </button>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex justify-center gap-2 mt-8">
        <button 
          @click="currentPage = Math.max(1, currentPage - 1)"
          :disabled="currentPage === 1"
          class="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
        >
          ก่อนหน้า
        </button>
        <div class="flex items-center gap-2">
          <span class="text-gray-600">หน้า {{ currentPage }} / {{ totalPages }}</span>
        </div>
        <button 
          @click="currentPage = Math.min(totalPages, currentPage + 1)"
          :disabled="currentPage === totalPages"
          class="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
        >
          ถัดไป
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useReport } from '~/composables/useReport'

const { getMyReports, reportCategories, reportStatuses, fetchCategories, fetchStatuses } = useReport()

const reports = ref([])
const isLoading = ref(false)
const filterStatus = ref('')
const filterCategory = ref('')
const searchQuery = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(5)
const expandedReportId = ref(null)

const reportCategoriesMap = {
  INAPPROPRIATE_BEHAVIOR: 'พฤติกรรมที่ไม่เหมาะสม',
  LOST_ITEM: 'ลืมของ',
  CLEANLINESS: 'ความสะอาด',
  OTHER: 'อื่นๆ',
  VIOLATED_AGREEMENT: 'ละเมิดข้อตกลง',
  DETAILS_MISMATCH: 'รายละเอียดไม่ตรงกับในระบบ'
}

const reportStatusesMap = {
  PENDING: 'รอดำเนินการ',
  UNDER_REVIEW: 'กำลังตรวจสอบ',
  CONTACTING_DRIVER: 'กำลังติดต่อคนขับ',
  RESOLVED: 'แก้ไขแล้ว',
  CLOSED: 'ปิด'
}

const statusColorMap = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  UNDER_REVIEW: 'bg-blue-100 text-blue-800',
  CONTACTING_DRIVER: 'bg-purple-100 text-purple-800',
  RESOLVED: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-800'
}

const filteredReports = computed(() => {
  return reports.value.filter(report => {
    const matchStatus = !filterStatus.value || report.reportStatus === filterStatus.value
    const matchCategory = !filterCategory.value || report.category === filterCategory.value
    const matchSearch = !searchQuery.value || report.reportTopic.toLowerCase().includes(searchQuery.value.toLowerCase())
    return matchStatus && matchCategory && matchSearch
  })
})

const paginatedReports = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredReports.value.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(filteredReports.value.length / itemsPerPage.value)
})

const stats = computed(() => {
  return {
    total: reports.value.length,
    pending: reports.value.filter(r => r.reportStatus === 'PENDING').length,
    inProgress: reports.value.filter(r => ['UNDER_REVIEW', 'CONTACTING_DRIVER'].includes(r.reportStatus)).length,
    resolved: reports.value.filter(r => ['RESOLVED', 'CLOSED'].includes(r.reportStatus)).length
  }
})

const getCategoryLabel = (category) => reportCategoriesMap[category] || category
const getStatusLabel = (status) => reportStatusesMap[status] || status
const getCategoryBadgeClass = (category) => {
  const colors = {
    INAPPROPRIATE_BEHAVIOR: 'bg-red-100 text-red-800',
    LOST_ITEM: 'bg-orange-100 text-orange-800',
    CLEANLINESS: 'bg-blue-100 text-blue-800',
    OTHER: 'bg-gray-100 text-gray-800',
    VIOLATED_AGREEMENT: 'bg-purple-100 text-purple-800',
    DETAILS_MISMATCH: 'bg-yellow-100 text-yellow-800'
  }
  return colors[category] || 'bg-gray-100 text-gray-800'
}

const getStatusBadgeClass = (status) => statusColorMap[status] || 'bg-gray-100 text-gray-800'

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const toggleExpanded = (reportId) => {
  expandedReportId.value = expandedReportId.value === reportId ? null : reportId
}

const isStatusCompleted = (currentStatus, targetStatus) => {
  const statusOrder = ['PENDING', 'UNDER_REVIEW', 'CONTACTING_DRIVER', 'RESOLVED', 'CLOSED']
  return statusOrder.indexOf(currentStatus) >= statusOrder.indexOf(targetStatus)
}

const getStatusIcon = (status) => {
  const statusOrder = ['PENDING', 'UNDER_REVIEW', 'CONTACTING_DRIVER', 'RESOLVED', 'CLOSED']
  return statusOrder.indexOf(status) + 1
}

const loadReports = async () => {
  try {
    isLoading.value = true
    const result = await getMyReports({ page: currentPage.value, limit: itemsPerPage.value })
    reports.value = result.data || []
  } catch (error) {
    console.error('Failed to load reports:', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  await fetchCategories()
  await fetchStatuses()
  await loadReports()
})
</script>
