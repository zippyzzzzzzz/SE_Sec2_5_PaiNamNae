<template>
    <div>
        <AdminHeader />
        <AdminSidebar />

        <!-- Main Content -->
        <main id="main-content" class="main-content mt-16 ml-0 lg:ml-[280px] p-6">
            <!-- Back -->
            <div class="mb-8">
                <NuxtLink to="/admin/user-verifications"
                    class="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                    <i class="fa-solid fa-arrow-left"></i>
                    <span>ย้อนกลับ</span>
                </NuxtLink>
            </div>

            <div class="mx-auto max-w-8xl">
                <!-- Title -->
                <div class="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
                    <div class="flex items-center gap-3">
                        <h1 class="text-2xl font-semibold text-gray-800">รายละเอียดการยืนยันตัวตนผู้ใช้</h1>
                        <span class="text-sm text-gray-500">ดูข้อมูลและเปลี่ยนสถานะได้จากหน้านี้</span>
                    </div>
                </div>

                <!-- Status & actions -->
                <div class="mb-6 bg-white border border-gray-300 rounded-lg shadow-sm">
                    <div class="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-6">
                        <div class="text-sm text-gray-700">สถานะปัจจุบัน:</div>
                        <span class="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full" :class="{
                            'bg-gray-100 text-gray-700': user?.isVerified === false,
                            'bg-green-100 text-green-700': user?.isVerified === true
                        }">
                            <i class="fa-solid fa-circle mr-1 text-[8px]" :class="user?.isVerified ? 'text-green-700' : 'text-gray-700'"></i>
                            {{ user?.isVerified ? 'VERIFIED' : 'UNVERIFIED' }}
                        </span>

                        <div class="flex gap-2 ml-auto">
                            <button class="px-3 py-2 border rounded-md hover:bg-gray-50 disabled:opacity-50"
                                :disabled="isPatchingStatus || !user" @click="patchStatus(false)">
                                <i v-if="isPatchingStatus && targetStatus === false"
                                    class="mr-1 fa-solid fa-spinner fa-spin"></i>
                                reject
                            </button>
                            <button
                                class="px-3 py-2 text-green-700 border border-green-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                                :disabled="isPatchingStatus || !user" @click="patchStatus(true)">
                                <i v-if="isPatchingStatus && targetStatus === true"
                                    class="mr-1 fa-solid fa-spinner fa-spin"></i>
                                approve
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Card -->
                <div class="bg-white border border-gray-300 rounded-lg shadow-sm">
                    <!-- Loading / Error -->
                    <div v-if="isLoading" class="p-8 text-center text-gray-500">กำลังโหลดข้อมูล...</div>
                    <div v-else-if="loadError" class="p-8 text-center text-red-600">{{ loadError }}</div>

                    <!-- Content -->
                    <div v-else-if="user" class="grid grid-cols-1 gap-6 p-4 sm:p-6 text-[15px]">
                        <div class="w-full max-w-[80rem] mx-auto space-y-6">
                            <!-- Basic info -->
                            <section>
                                <h3 class="mb-3 text-sm font-semibold text-gray-700">ข้อมูลผู้ใช้</h3>
                                <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                    <InfoBox label="ชื่อ-นามสกุล">
                                        {{ (user.firstName || '-') + ' ' + (user.lastName || '') }}
                                    </InfoBox>
                                    <InfoBox label="อีเมล">
                                        {{ user.email || '-' }}
                                    </InfoBox>
                                    <InfoBox label="ชื่อผู้ใช้ (username)">
                                        {{ user.username || '-' }}
                                    </InfoBox>
                                    <InfoBox label="เบอร์โทรศัพท์">
                                        {{ user.phoneNumber || '-' }}
                                    </InfoBox>
                                </div>
                            </section>

                            <!-- National ID -->
                            <section>
                                <h3 class="mb-3 text-sm font-semibold text-gray-700">บัตรประชาชน</h3>
                                <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                    <InfoBox label="เลขบัตรประชาชน">
                                        {{ user.nationalIdNumber || '-' }}
                                    </InfoBox>
                                    <InfoBox label="วันหมดอายุ">
                                        {{ formatDate(user.nationalIdExpiryDate) }}
                                    </InfoBox>
                                </div>
                            </section>

                            <!-- Photos -->
                            <section>
                                <h3 class="mb-3 text-sm font-semibold text-gray-700">รูปถ่ายประกอบ</h3>
                                <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                    <!-- National ID photo -->
                                    <div>
                                        <label class="block mb-1 text-xs font-medium text-gray-600">รูปบัตรประชาชน</label>
                                        <div v-if="user.nationalIdPhotoUrl" class="photo-box">
                                            <a :href="user.nationalIdPhotoUrl" target="_blank" class="block w-full h-full">
                                                <img :src="user.nationalIdPhotoUrl" alt="id card"
                                                    class="object-contain w-full h-full" />
                                            </a>
                                        </div>
                                        <div v-else class="photo-box empty">ไม่มีรูป</div>
                                    </div>

                                    <!-- Selfie -->
                                    <div>
                                        <label class="block mb-1 text-xs font-medium text-gray-600">รูปถ่ายใบหน้า (Selfie)</label>
                                        <div v-if="user.selfiePhotoUrl" class="photo-box">
                                            <a :href="user.selfiePhotoUrl" target="_blank" class="block w-full h-full">
                                                <img :src="user.selfiePhotoUrl" alt="selfie"
                                                    class="object-contain w-full h-full" />
                                            </a>
                                        </div>
                                        <div v-else class="photo-box empty">ไม่มีรูป</div>
                                    </div>
                                </div>
                            </section>

                            <!-- System -->
                            <section>
                                <h3 class="mb-3 text-sm font-semibold text-gray-700">ระบบ</h3>
                                <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                    <InfoBox label="สร้างเมื่อ">
                                        {{ formatDate(user.createdAt, true) }}
                                    </InfoBox>
                                    <InfoBox label="อัปเดตล่าสุด">
                                        {{ formatDate(user.updatedAt, true) }}
                                    </InfoBox>
                                </div>
                            </section>
                        </div>
                    </div>

                    <!-- No data -->
                    <div v-else class="p-8 text-center text-gray-500">ไม่พบข้อมูล</div>
                </div>
            </div>
        </main>

        <!-- Mobile Overlay -->
        <div id="overlay" class="fixed inset-0 z-40 hidden bg-black bg-opacity-50 lg:hidden"
            @click="closeMobileSidebar"></div>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRuntimeConfig, useCookie } from '#app'
import AdminHeader from '~/components/admin/AdminHeader.vue'
import AdminSidebar from '~/components/admin/AdminSidebar.vue'
import { useToast } from '~/composables/useToast'
import dayjs from 'dayjs'
import 'dayjs/locale/th'
dayjs.locale('th')

// reusable InfoBox, matching driver-verifications implementation
import { defineComponent, h } from 'vue'
const InfoBox = defineComponent({
    name: 'InfoBox',
    props: { label: { type: String, required: true } },
    setup(props, { slots }) {
        return () =>
            h('div', {}, [
                h('div', { class: 'text-xs text-gray-500 mb-1' }, props.label),
                h('div', { class: 'text-sm text-gray-700' }, slots.default ? slots.default() : '')
            ])
    }
})

definePageMeta({ middleware: ['admin-auth'] })

useHead({
    title: 'ดูรายละเอียดการยืนยันตัวตนผู้ใช้ • Admin',
    link: [{ rel: 'stylesheet', href: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css' }]
})

const route = useRoute()
const { toast } = useToast()

const user = ref(null)
const isLoading = ref(false)
const loadError = ref('')
const isPatchingStatus = ref(false)
const targetStatus = ref(null)

function formatDate(iso, withTime = false) {
    if (!iso) return '-'
    return withTime ? dayjs(iso).format('D MMMM YYYY HH:mm') : dayjs(iso).format('D MMMM YYYY')
}

async function fetchUser() {
    isLoading.value = true
    loadError.value = ''
    try {
        const config = useRuntimeConfig()
        const token = useCookie('token').value || (process.client ? localStorage.getItem('token') : '')
        const res = await $fetch(`/users/admin/${route.params.id}`, {
            baseURL: config.public.apiBase,
            headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        })
        user.value = res?.data || null
    } catch (err) {
        console.error(err)
        loadError.value = err?.data?.message || 'ไม่สามารถโหลดข้อมูลได้'
        toast.error('เกิดข้อผิดพลาด', loadError.value)
        user.value = null
    } finally {
        isLoading.value = false
    }
}

async function patchStatus(ver) {
    if (!user.value) return
    isPatchingStatus.value = true
    targetStatus.value = ver
    try {
        const config = useRuntimeConfig()
        const token = useCookie('token').value || (process.client ? localStorage.getItem('token') : '')
        const res = await fetch(`${config.public.apiBase}/users/admin/${user.value.id}/status`, {
            method: 'PATCH',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ isVerified: ver }),
            credentials: 'include',
        })
        const body = await res.json()
        if (!res.ok) throw new Error(body?.message || `Status ${res.status}`)
        toast.success('อัปเดตสถานะแล้ว', ver ? 'ยืนยันแล้ว' : 'ปฏิเสธแล้ว')
        // reload user to refresh flag
        await fetchUser()
    } catch (err) {
        console.error(err)
        toast.error('อัปเดตสถานะไม่สำเร็จ', err?.message || '')
    } finally {
        isPatchingStatus.value = false
        targetStatus.value = null
    }
}

function closeMobileSidebar() {
    const sidebar = document.getElementById('sidebar')
    const overlay = document.getElementById('overlay')
    if (!sidebar || !overlay) return
    sidebar.classList.remove('mobile-open')
    overlay.classList.add('hidden')
}

onMounted(() => {
    fetchUser()
})

onUnmounted(() => {
})
</script>

<style>
.photo-box {
    width: 100%;
    padding-top: 56.25%; /* 16:9 aspect */
    position: relative;
    background: #f9fafb;
    border: 1px solid #d1d5db;
    border-radius: 4px;
}
.photo-box img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
}
.photo-box.empty {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #9ca3af;
    font-size: 0.875rem;
}

/* reuse sidebar styles */
.sidebar {
    transition: width 0.3s ease;
}

.sidebar.collapsed {
    width: 80px;
}

.sidebar:not(.collapsed) {
    width: 280px;
}
</style>