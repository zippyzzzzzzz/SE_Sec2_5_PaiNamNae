// useReport.js - Composable for report management
import { ref, computed } from 'vue'
import { useAuth } from './useAuth'

export const useReport = () => {
  const { token } = useAuth()
  const config = useRuntimeConfig()
  
  // Get API base URL from config (already has /api/ included)
  const apiBase = config.public.apiBase || 'http://localhost:3000/api/'

  // State
  const reports = ref([])
  const currentReport = ref(null)
  const isLoading = ref(false)
  const error = ref(null)
  const reportCategories = ref([])
  const reportStatuses = ref([])

  // Computed
  const hasError = computed(() => error.value !== null)

  // Helper function to make API calls
  const apiCall = async (endpoint, options = {}) => {
    try {
      const url = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint
      return await $fetch(url, {
        baseURL: apiBase,
        headers: {
          Authorization: `Bearer ${token.value}`,
          ...options.headers
        },
        ...options
      })
    } catch (err) {
      error.value = err.data?.message || err.message || 'API Error'
      throw err
    }
  }

  // Fetch report categories
  const fetchCategories = async () => {
    try {
      const response = await apiCall('reports/categories')
      if (response.data) {
        reportCategories.value = response.data
      }
    } catch (err) {
      console.error('Error fetching categories:', err)
    }
  }

  // Fetch report statuses
  const fetchStatuses = async () => {
    try {
      const response = await apiCall('reports/statuses')
      if (response.data) {
        reportStatuses.value = response.data
      }
    } catch (err) {
      console.error('Error fetching statuses:', err)
    }
  }

  // Check if can report
  const checkCanReport = async (bookingId) => {
    try {
      isLoading.value = true
      error.value = null

      const response = await apiCall(`reports/check-can-report/${bookingId}`)
      return response.data
    } catch (err) {
      error.value = err.message
      return { canReport: false, reason: err.message }
    } finally {
      isLoading.value = false
    }
  }

  // Create report with file uploads
  const createReport = async (formData) => {
    try {
      isLoading.value = true
      error.value = null

      // formData is already prepared from the page component
      // Just send it directly to the API
      const response = await apiCall('reports', {
        method: 'POST',
        body: formData
      })

      return response.data
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Get user's reports
  const getMyReports = async (filterOptions = {}) => {
    try {
      isLoading.value = true
      error.value = null

      const params = new URLSearchParams()
      if (filterOptions.page) params.append('page', filterOptions.page)
      if (filterOptions.limit) params.append('limit', filterOptions.limit)
      if (filterOptions.status) params.append('status', filterOptions.status)
      if (filterOptions.category) params.append('category', filterOptions.category)

      const response = await apiCall(`reports?${params}`)
      reports.value = response.data
      return response
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Get single report
  const getReportById = async (reportId) => {
    try {
      isLoading.value = true
      error.value = null

      const response = await apiCall(`reports/${reportId}`)
      currentReport.value = response.data
      return response.data
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Get reports for a booking
  const getBookingReports = async (bookingId) => {
    try {
      isLoading.value = true
      error.value = null

      const response = await apiCall(`reports/booking/${bookingId}`)
      return response.data
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Clear error
  const clearError = () => {
    error.value = null
  }

  return {
    reports,
    currentReport,
    isLoading,
    error,
    hasError,
    reportCategories,
    reportStatuses,
    fetchCategories,
    fetchStatuses,
    checkCanReport,
    createReport,
    getMyReports,
    getReportById,
    getBookingReports,
    clearError
  }
}
