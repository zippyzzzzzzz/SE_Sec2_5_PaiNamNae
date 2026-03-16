<template>
    <transition name="modal-fade">
        <div v-if="show" class="modal-overlay" @click.self="handleCancel">
            <div class="modal-content max-w-2xl w-full">
                <div class="p-6">
                    <div class="flex items-center justify-between mb-6">
                        <h3 class="text-xl font-bold text-gray-900">แจ้งเรื่องร้องเรียน / รายงานปัญหา</h3>
                        <button @click="handleCancel" class="text-gray-400 hover:text-gray-600">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>

                    <div v-if="trip" class="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-100">
                        <div class="flex items-center text-blue-800 font-medium mb-1">
                            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            รายละเอียดทริป
                        </div>
                        <p class="text-sm text-blue-700">
                            {{ trip.route?.startLocation?.name || 'ไม่ทราบต้นทาง' }} ➔ {{ trip.route?.endLocation?.name || 'ไม่ทราบปลายทาง' }} | 
                            วันที่: {{ formatDate(trip.route?.departureTime) }} | 
                            คนขับ: {{ trip.route?.driver?.firstName || 'ไม่ทราบชื่อ' }} {{ trip.route?.driver?.lastName || '' }}
                        </p>
                    </div>

                    <form @submit.prevent="handleSubmit" class="space-y-6">
                        <!-- 1. Category -->
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">1. หัวข้อเรื่องที่ต้องการแจ้ง *</label>
                            <select v-model="form.category" required class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition duration-200">
                                <option value="" disabled>เลือกหัวข้อปัญหา</option>
                                <option value="DRIVER_BEHAVIOR">พฤติกรรมที่ไม่เหมาะสมของคนขับ (คุกคาม, ไม่สุภาพ, ขับรถอันตราย)</option>
                                <option value="LOST_ITEM">ลืมทรัพย์สิน (Lost Item)</option>
                                <option value="CLEANLINESS">ปัญหาความสะอาด / กลิ่น / การแต่งกาย</option>
                                <option value="AGREEMENT_VIOLATION">การละเมิดข้อตกลง (มาสาย, ชาร์จเพิ่ม, ข้อมูลไม่ตรงระบบ)</option>
                                <option value="OTHERS">ปัญหาอื่นๆ</option>
                            </select>
                        </div>

                        <!-- 2. Description -->
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">2. รายละเอียดเหตุการณ์ *</label>
                            <textarea 
                                v-model="form.description" 
                                required 
                                rows="4" 
                                class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition duration-200"
                                placeholder="กรุณาอธิบายสิ่งที่เกิดขึ้น... (ห้ามใช้อีโมจิ)"
                                @input="validateDescription"
                            ></textarea>
                            <p v-if="errors.description" class="mt-1 text-sm text-red-600">{{ errors.description }}</p>
                        </div>

                        <!-- 3. Evidence -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-2">3.1 รูปภาพประกอบ (สูงสุด 3 รูป)</label>
                                <div class="flex items-center space-x-2">
                                    <label class="cursor-pointer bg-white border border-gray-300 rounded-md py-2 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
                                        <span>+ อัปโหลดรูปภาพ</span>
                                        <input type="file" multiple accept="image/*" class="hidden" @change="handlePhotoUpload">
                                    </label>
                                    <span class="text-xs text-gray-500">{{ form.photos.length }}/3 รูป</span>
                                </div>
                                <div class="flex flex-wrap mt-2 gap-2">
                                    <div v-for="(photo, index) in photoPreviews" :key="index" class="relative w-16 h-16">
                                        <img :src="photo" class="w-full h-full object-cover rounded-md border shadow-sm">
                                        <button @click.prevent="removePhoto(index)" class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-sm hover:bg-red-600">
                                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"></path></svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-2">3.2 วิดีโอประกอบ (สูงสุด 1 คลิป)</label>
                                <div class="flex items-center space-x-2">
                                    <label class="cursor-pointer bg-white border border-gray-300 rounded-md py-2 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
                                        <span>+ อัปโหลดวิดีโอ</span>
                                        <input type="file" accept="video/mp4" class="hidden" @change="handleVideoUpload">
                                    </label>
                                    <span class="text-xs text-gray-500" :class="form.video ? 'text-green-600' : ''">{{ form.video ? '1/1 คลิป' : '0/1 คลิป' }}</span>
                                </div>
                                <div v-if="videoPreview" class="mt-2 text-xs text-gray-600 flex items-center bg-gray-50 p-2 rounded border">
                                    <svg class="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                                    <span class="truncate max-w-[150px]">{{ form.video.name }}</span>
                                    <button @click.prevent="removeVideo" class="ml-auto text-red-500 hover:text-red-700 font-medium">ลบ</button>
                                </div>
                            </div>
                        </div>

                        <!-- 4. Contact -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-2">4.1 ชื่อผู้แจ้ง *</label>
                                <input 
                                    v-model="form.contactName" 
                                    required 
                                    type="text" 
                                    class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition duration-200"
                                    @input="validateField('contactName')"
                                >
                                <p v-if="errors.contactName" class="mt-1 text-sm text-red-600">{{ errors.contactName }}</p>
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-2">4.2 เบอร์โทรติดต่อกลับ *</label>
                                <input 
                                    v-model="form.contactPhone" 
                                    required 
                                    type="tel" 
                                    class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition duration-200"
                                    @input="validateField('contactPhone')"
                                >
                                <p v-if="errors.contactPhone" class="mt-1 text-sm text-red-600">{{ errors.contactPhone }}</p>
                            </div>
                        </div>

                        <div class="pt-4 border-t flex justify-end space-x-3">
                            <button @click.prevent="handleCancel" type="button" class="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition duration-200">
                                ยกเลิก
                            </button>
                            <button 
                                type="submit" 
                                :disabled="isSubmitting || !!errors.description || !!errors.contactName || !!errors.contactPhone"
                                class="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition duration-200"
                            >
                                <svg v-if="isSubmitting" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                {{ isSubmitting ? 'กำลังส่งข้อมูล...' : 'ส่งเรื่องร้องเรียน' }}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </transition>
</template>

<script setup>
import { ref, reactive, watch } from 'vue';
import { useToast } from '@/composables/useToast';

const props = defineProps({
    show: Boolean,
    trip: Object,
    user: Object
});

const emit = defineEmits(['close', 'submitted']);
const toast = useToast();
const isSubmitting = ref(false);

const form = reactive({
    category: '',
    description: '',
    photos: [],
    video: null,
    contactName: '',
    contactPhone: ''
});

const photoPreviews = ref([]);
const videoPreview = ref(false);
const errors = reactive({
    description: '',
    contactName: '',
    contactPhone: ''
});

// Initialize form when showing
watch(() => props.show, (newVal) => {
    if (newVal) {
        if (props.user) {
            form.contactName = `${props.user.firstName || ''} ${props.user.lastName || ''}`.trim();
            form.contactPhone = props.user.phoneNumber || '';
        }
        resetForm();
    }
});

const resetForm = () => {
    form.category = '';
    form.description = '';
    form.photos = [];
    form.video = null;
    photoPreviews.value = [];
    videoPreview.value = false;
    errors.description = '';
    errors.contactName = '';
    errors.contactPhone = '';
};

const validateDescription = () => {
    const emojiRegex = /[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/u;
    if (emojiRegex.test(form.description)) {
        errors.description = '🚫 ห้ามใช้อีโมจิในรายละเอียดเหตุการณ์';
    } else {
        errors.description = '';
    }
};

const validateField = (fieldName) => {
    const emojiRegex = /[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/u;
    const value = form[fieldName];
    const label = fieldName === 'contactName' ? 'ชื่อผู้แจ้ง' : 'เบอร์โทร';
    
    if (emojiRegex.test(value)) {
        errors[fieldName] = `🚫 ${label}ห้ามใส่อีโมจิ`;
    } else {
        errors[fieldName] = '';
    }
};

const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    if (form.photos.length + files.length > 3) {
        toast.warning('ข้อจำกัด', 'อัปโหลดรูปภาพได้สูงสุด 3 รูป');
        return;
    }

    files.forEach(file => {
        if (!file.type.startsWith('image/')) {
            toast.error('ไฟล์ไม่ถูกต้อง', `ไฟล์ ${file.name} ไม่ใช่รูปภาพ`);
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            toast.error('ไฟล์ใหญ่เกินไป', `รูปภาพ ${file.name} มีขนาดเกิน 10MB`);
            return;
        }
        form.photos.push(file);
        const reader = new FileReader();
        reader.onload = (e) => photoPreviews.value.push(e.target.result);
        reader.readAsDataURL(file);
    });
};

const removePhoto = (index) => {
    form.photos.splice(index, 1);
    photoPreviews.value.splice(index, 1);
};

const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'video/mp4') {
        toast.error('ไฟล์ไม่ถูกต้อง', 'กรุณาอัปโหลดไฟล์วิดีโอเป็น .mp4 เท่านั้น');
        return;
    }

    if (file.size > 30 * 1024 * 1024) {
        toast.error('ไฟล์ใหญ่เกินไป', 'วิดีโอต้องมีขนาดไม่เกิน 30MB');
        return;
    }

    form.video = file;
    videoPreview.value = true;
};

const removeVideo = () => {
    form.video = null;
    videoPreview.value = false;
};

const handleCancel = () => {
    if (isSubmitting.value) return;
    emit('close');
};

const handleSubmit = async () => {
    validateDescription();
    if (errors.description) {
        toast.error('ข้อมูลไม่ถูกต้อง', 'กรุณาลบอีโมจิออกจากรายละเอียดเหตุการณ์');
        return;
    }

    if (!form.category) {
        toast.error('ข้อมูลไม่ครบถ้วน', 'กรุณาเลือกหัวข้อปัญหา');
        return;
    }

    isSubmitting.value = true;
    try {
        const formData = new FormData();
        formData.append('bookingId', props.trip.id);
        formData.append('category', form.category);
        formData.append('description', form.description);
        formData.append('contactName', form.contactName);
        formData.append('contactPhone', form.contactPhone);
        
        form.photos.forEach(photo => formData.append('photos', photo));
        if (form.video) formData.append('video', form.video);

        const { $api } = useNuxtApp();
        const response = await $api.post('/complaints', formData);

        // response is already extracted by the api plugin
        toast.success('สำเร็จ', 'ส่งเรื่องร้องเรียนเรียบร้อยแล้ว แอดมินจะติดต่อกลับโดยเร็วที่สุด');
        emit('submitted');
        emit('close');
    } catch (error) {
        console.error('Error submitting complaint:', error);
        toast.error('เกิดข้อผิดพลาด', error.data?.message || 'ไม่สามารถส่งเรื่องร้องเรียนได้');
    } finally {
        isSubmitting.value = false;
    }
};

const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};
</script>

<style scoped>
.modal-overlay {
    position: fixed;
    z-index: 1000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    backdrop-filter: blur(2px);
}

.modal-content {
    background-color: white;
    border-radius: 1rem;
    box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
    max-height: 90vh;
    overflow-y: auto;
}

/* Transitions */
.modal-fade-enter-active,
.modal-fade-leave-active {
    transition: opacity 0.3s ease;
}

.modal-fade-enter-active .modal-content,
.modal-fade-leave-active .modal-content {
    transition: all 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
    opacity: 0;
}

.modal-fade-enter-from .modal-content,
.modal-fade-leave-to .modal-content {
    transform: scale(0.95) translateY(1rem);
}
</style>
