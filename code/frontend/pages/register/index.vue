<template>
  <div class="bg-gray-50 min-h-screen flex items-center justify-center p-4 font-['Kanit']">
    <main class="w-full max-w-md p-6 bg-white rounded-lg shadow-lg sm:p-8">
      <h1 class="mb-8 text-3xl font-bold text-center text-blue-600">สมัครสมาชิก</h1>

      <!-- Stepper Indicator -->
      <div class="relative mb-10">
        <div class="absolute left-0 right-0 top-5 h-0.5 bg-gray-200"></div>
        <div class="absolute left-0 top-5 h-0.5 bg-blue-600 transition-all duration-500"
          :style="{ width: stepProgress }"></div>
        <div class="relative flex items-center justify-between">
          <div v-for="step in totalSteps" :key="step" class="z-10 flex flex-col items-center w-1/3">
            <div :class="getStepClass(step)">
              <span>{{ step }}</span>
            </div>
            <span :class="getLabelClass(step)">{{ getStepLabel(step) }}</span>
          </div>
        </div>
      </div>

      <!-- Registration Form -->
      <form @submit.prevent="handleRegister" novalidate>
        <!-- Step 1: Account Info -->
        <div v-if="currentStep === 1">
          <h2 class="mb-4 text-xl font-semibold text-gray-800">ข้อมูลบัญชีผู้ใช้</h2>
          <div class="mb-4">
            <label for="username" class="block mb-1 text-sm font-medium text-gray-700">ชื่อผู้ใช้ <span
                class="text-red-500">*</span></label>
            <input type="text" id="username" v-model="formData.username" placeholder="example123"
              class="w-full px-4 py-2 transition border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              :class="{ 'border-red-500 ring-1 ring-red-500': errors.username }">
            <p v-if="errors.username" class="mt-1 text-xs text-red-600">{{ errors.username }}</p>
            <p v-else class="mt-1 text-xs text-gray-500">ความยาว 4–20 ตัวอักษร ภาษาอังกฤษ ตัวเลข หรือขีดล่าง (_)
              เท่านั้น</p>
          </div>
          <div class="mb-4">
            <label for="email" class="block mb-1 text-sm font-medium text-gray-700">อีเมล <span
                class="text-red-500">*</span></label>
            <input type="email" id="email" v-model="formData.email" placeholder="example@example.com"
              class="w-full px-4 py-2 transition border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              :class="{ 'border-red-500 ring-1 ring-red-500': errors.email }">
            <p v-if="errors.email" class="mt-1 text-xs text-red-600">{{ errors.email }}</p>
          </div>
          <div class="mb-4">
            <label for="password" class="block mb-1 text-sm font-medium text-gray-700">รหัสผ่าน <span
                class="text-red-500">*</span></label>
            <input type="password" id="password" v-model="formData.password" placeholder="อย่างน้อย 8 ตัวอักษร"
              class="w-full px-4 py-2 transition border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              :class="{ 'border-red-500 ring-1 ring-red-500': errors.password }">
            <p v-if="errors.password" class="mt-1 text-xs text-red-600">{{ errors.password }}</p>
            <p v-else class="mt-1 text-xs text-gray-500">ต้องประกอบด้วย A–Z, a–z และตัวเลข 0–9</p>
          </div>
          <div class="mb-6">
            <label for="confirmPassword" class="block mb-1 text-sm font-medium text-gray-700">ยืนยันรหัสผ่าน <span
                class="text-red-500">*</span></label>
            <input type="password" id="confirmPassword" v-model="formData.confirmPassword"
              placeholder="กรอกรหัสผ่านอีกครั้ง"
              class="w-full px-4 py-2 transition border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              :class="{ 'border-red-500 ring-1 ring-red-500': errors.confirmPassword }">
            <p v-if="errors.confirmPassword" class="mt-1 text-xs text-red-600">{{ errors.confirmPassword }}</p>
          </div>
          <button type="button" @click="nextStep"
            class="w-full py-3 font-medium text-white transition bg-blue-600 rounded-md hover:bg-blue-700">ถัดไป</button>
        </div>

        <!-- Step 2: Personal Info -->
        <div v-if="currentStep === 2">
          <h2 class="mb-4 text-xl font-semibold text-gray-800">ข้อมูลส่วนตัว</h2>
          <div class="mb-4">
            <label for="firstName" class="block mb-1 text-sm font-medium text-gray-700">ชื่อจริง <span
                class="text-red-500">*</span></label>
            <input type="text" id="firstName" v-model="formData.firstName" placeholder="กรอกชื่อจริง"
              class="w-full px-4 py-2 transition border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              :class="{ 'border-red-500 ring-1 ring-red-500': errors.firstName }">
            <p v-if="errors.firstName" class="mt-1 text-xs text-red-600">{{ errors.firstName }}</p>
          </div>
          <div class="mb-4">
            <label for="lastName" class="block mb-1 text-sm font-medium text-gray-700">นามสกุล <span
                class="text-red-500">*</span></label>
            <input type="text" id="lastName" v-model="formData.lastName" placeholder="กรอกนามสกุล"
              class="w-full px-4 py-2 transition border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              :class="{ 'border-red-500 ring-1 ring-red-500': errors.lastName }">
            <p v-if="errors.lastName" class="mt-1 text-xs text-red-600">{{ errors.lastName }}</p>
          </div>
          <div class="mb-4">
            <label for="phoneNumber" class="block mb-1 text-sm font-medium text-gray-700">เบอร์โทรศัพท์ <span
                class="text-red-500">*</span></label>
            <input type="tel" id="phoneNumber" v-model="formData.phoneNumber" placeholder="เช่น 0891234567"
              class="w-full px-4 py-2 transition border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              :class="{ 'border-red-500 ring-1 ring-red-500': errors.phoneNumber }">
            <p v-if="errors.phoneNumber" class="mt-1 text-xs text-red-600">{{ errors.phoneNumber }}</p>
          </div>
          <div class="mb-6">
            <label class="block mb-2 text-sm font-medium text-gray-700">เพศ <span class="text-red-500">*</span></label>
            <div class="flex gap-6">
              <label class="flex items-center"><input type="radio" name="gender" value="male" v-model="formData.gender"
                  class="mr-2 text-blue-600 focus:ring-blue-500"> ชาย</label>
              <label class="flex items-center"><input type="radio" name="gender" value="female"
                  v-model="formData.gender" class="mr-2 text-blue-600 focus:ring-blue-500"> หญิง</label>
            </div>
            <p v-if="errors.gender" class="mt-1 text-xs text-red-600">{{ errors.gender }}</p>
          </div>
          <div class="flex gap-4">
            <button type="button" @click="prevStep"
              class="w-full py-3 font-medium text-white transition bg-gray-600 rounded-md hover:bg-gray-700">ย้อนกลับ</button>
            <button type="submit"
              class="w-full py-3 font-medium text-white transition bg-blue-600 rounded-md hover:bg-blue-700">สมัครสมาชิก</button>
          </div>
        </div>

      </form>

      <p class="mt-8 text-sm text-center text-gray-600">
        มีบัญชีแล้ว? <NuxtLink to="/login" class="font-medium text-blue-600 hover:underline">เข้าสู่ระบบ</NuxtLink>
      </p>
    </main>
  </div>
</template>

<script setup>
import { ref, reactive, computed, nextTick } from 'vue';
import { useToast } from '~/composables/useToast';
import { useRouter, useRuntimeConfig } from '#app';

const { toast } = useToast();
const router = useRouter();
const currentStep = ref(1);
const totalSteps = 2;

const formData = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  firstName: '',
  lastName: '',
  phoneNumber: '',
  gender: '',
});

const errors = reactive({});
const isLoading = ref(false);

useHead({
  link: [
    { rel: 'stylesheet', href: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Kanit:wght@400;500;600;700&display=swap' },
  ],
});

const stepProgress = computed(() => {
  if (totalSteps <= 1) return '0%';
  return `${((currentStep.value - 1) / (totalSteps - 1)) * 100}%`;
});

const getStepLabel = (step) => {
  return ['บัญชีผู้ใช้', 'ข้อมูลส่วนตัว'][step - 1];
};

const clearErrors = () => {
  Object.keys(errors).forEach(key => delete errors[key]);
};

const getStepClass = (step) => {
  if (step < currentStep.value) {
    return 'w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 text-white font-semibold';
  }
  if (step === currentStep.value) {
    return 'w-10 h-10 flex items-center justify-center rounded-full border-2 border-blue-600 text-blue-600 font-semibold bg-white';
  }
  return 'w-10 h-10 flex items-center justify-center rounded-full bg-gray-200 text-gray-500 font-semibold';
};

const getLabelClass = (step) => {
  if (step === currentStep.value) {
    return 'mt-2 text-sm font-medium text-blue-600';
  }
  return 'mt-2 text-sm text-gray-500';
};

const validationFunctions = [
  () => {
    clearErrors();
    if (!formData.username || formData.username.length < 4)
      errors.username = 'ชื่อผู้ใช้ต้องมีอย่างน้อย 4 ตัวอักษร';
    if (!/^\S+@\S+\.\S+$/.test(formData.email))
      errors.email = 'รูปแบบอีเมลไม่ถูกต้อง';
    if (!formData.password || formData.password.length < 8)
      errors.password = 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร';
    if (formData.password !== formData.confirmPassword || !formData.confirmPassword)
      errors.confirmPassword = 'รหัสผ่านไม่ตรงกัน';
    return Object.keys(errors).length === 0;
  },
  () => {
    clearErrors();
    if (!formData.firstName.trim())
      errors.firstName = 'กรุณากรอกชื่อจริง';
    if (!formData.lastName.trim())
      errors.lastName = 'กรุณากรอกนามสกุล';
    if (!/^\d{9,10}$/.test(formData.phoneNumber))
      errors.phoneNumber = 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง';
    if (!formData.gender)
      errors.gender = 'กรุณาเลือกเพศ';
    return Object.keys(errors).length === 0;
  }
];

const nextStep = () => {
  if (validationFunctions[currentStep.value - 1]()) {
    currentStep.value++;
  }
};

const prevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--;
    clearErrors();
  }
};

const apiBase = useRuntimeConfig().public.apiBase || 'http://localhost:3000/api';

async function postJson(url, data) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(data)
  });

  const body = await res.json();

  if (!res.ok) {
    const err = new Error(body?.message || 'Request failed');
    err.status = res.status;
    throw err;
  }

  return body;
}

const handleRegister = async () => {
  if (!validationFunctions[currentStep.value - 1]()) return;

  isLoading.value = true;
  await nextTick();

  try {
    await postJson(`${apiBase}/users`, {
      ...formData,
      role: 'PASSENGER'
    });

    router.push('/register/success');
  } catch (err) {
    const msg = err?.message || 'สมัครสมาชิกไม่สำเร็จ';
    if (err.status === 409) {
      toast.error('ข้อมูลซ้ำ', msg);
    } else {
      toast.error('เกิดข้อผิดพลาด', msg);
    }
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
/* Scoped styles for the parent component can remain here if any */
</style>
