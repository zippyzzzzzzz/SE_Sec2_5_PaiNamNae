<template>
  <div class="bg-gray-50 min-h-screen">
    <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="max-w-3xl mx-auto">
        <h1 class="text-3xl font-bold text-gray-800 mb-6">การแจ้งเตือน</h1>

        <div class="bg-white shadow-md rounded-lg overflow-hidden">
          <div class="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
            <button
              v-for="tab in tabs"
              :key="tab.value"
              @click="activeTab = tab.value"
              class="px-3 py-1.5 text-sm rounded-full border transition"
              :class="activeTab === tab.value ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-600 border-gray-200 hover:border-blue-300'"
            >
              {{ tab.label }}
            </button>
          </div>
          <div v-if="pending" class="p-6 text-center text-gray-500">
            <p>กำลังโหลดการแจ้งเตือน...</p>
          </div>
          <div v-else-if="error" class="p-6 text-center text-red-600">
            <p>ขออภัย, เกิดข้อผิดพลาดในการโหลดข้อมูล</p>
            <p class="text-sm text-gray-500 mt-2">
              กรุณาลองเข้าสู่ระบบใหม่อีกครั้ง หรือตรวจสอบการเชื่อมต่อ
            </p>
          </div>
          <div
            v-else-if="!notifications || notifications.length === 0"
            class="p-6 text-center text-gray-500"
          >
            <p>ยังไม่มีการแจ้งเตือนในขณะนี้</p>
          </div>
          <ul v-else class="divide-y divide-gray-100">
            <li
              v-for="notification in notifications"
              :key="notification.id"
              class="group relative p-5 transition-all duration-200 hover:bg-white hover:shadow-sm"
              :class="{ 'bg-blue-50/30': !notification.readAt }"
            >
              <div class="flex items-start space-x-4">
                <div class="flex-shrink-0 mt-1">
                  <div
                    class="p-2.5 rounded-xl bg-white border border-gray-100 shadow-sm"
                  >
                    <svg
                      class="h-5 w-5 text-blue-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                      />
                    </svg>
                  </div>
                </div>

                <div class="flex-grow min-w-0">
                  <div class="flex justify-between items-start">
                    <div class="pr-4">
                      <h3 class="text-sm font-bold text-gray-900 truncate">
                        {{ notification.title }}
                      </h3>
                      <p class="text-sm text-gray-600 mt-1 leading-relaxed">
                        {{ notification.body }}
                      </p>
                      <div class="flex items-center mt-2 space-x-2">
                        <span
                          class="text-xs text-gray-400"
                          >{{ formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: th }) }}</span
                        >
                        <span
                          v-if="!notification.readAt"
                          class="px-1.5 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-600 rounded uppercase tracking-wider"
                          >New</span
                        >
                      </div>
                    </div>

                    <div class="flex items-center space-x-1">
                      <button
                        v-if="isMessageNotification(notification) && notification.metadata?.bookingId"
                        @click.stop="openReplyModal(notification)"
                        class="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded-full hover:bg-blue-100"
                      >
                        ตอบกลับ
                      </button>
                      <button
                        v-if="!notification.readAt"
                        @click="markAsRead(notification.id)"
                        class="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
                        title="อ่านแล้ว"
                      >
                        <svg
                          class="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          stroke-width="2.5"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </button>

                      <button
                        @click="removeNotification(notification.id)"
                        class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="ลบการแจ้งเตือน"
                      >
                        <svg
                          class="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          </ul>
        </div>

                <div v-if="showReplyModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div class="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            <div class="flex items-start justify-between gap-3 px-6 py-5 border-b border-gray-100">
              <div>
                <p class="text-xs font-semibold tracking-wide text-blue-600 uppercase">ตอบกลับทันที</p>
                <h3 class="text-lg font-semibold text-gray-900">ส่งแจ้งเตือน / ข้อความกลับ</h3>
                <p class="mt-1 text-sm text-gray-500">เลือกข้อความด่วนหรือพิมพ์ข้อความเองได้ทันที</p>
              </div>
              <button
                @click="closeReplyModal"
                class="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="ปิดหน้าต่างตอบกลับ"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div class="px-6 py-5 space-y-5">
              <div class="space-y-2">
                <label class="text-sm font-medium text-gray-800">ข้อความที่จะส่ง</label>
                <div class="relative">
                  <textarea
                    ref="replyTextareaRef"
                    v-model="replyText"
                    :maxlength="maxReplyLength"
                    class="w-full border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 p-3 text-sm bg-gray-50/50 hover:bg-white transition"
                    rows="4"
                    placeholder="พิมพ์ข้อความของคุณที่นี่"
                  ></textarea>
                  <div class="absolute bottom-2 right-3 text-xs text-gray-400">
                    {{ replyText.length }} / {{ maxReplyLength }}
                  </div>
                </div>
              </div>

              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium text-gray-800">ข้อความด่วน</span>
                  <span class="text-xs text-gray-400">แตะเพื่อเติมอัตโนมัติ</span>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="msg in quickReplies"
                    :key="msg"
                    @click="applyQuickReply(msg)"
                    class="px-3 py-2 text-sm rounded-full border border-gray-200 bg-gray-50 hover:border-blue-400 hover:bg-blue-50 text-gray-700 transition"
                  >
                    {{ msg }}
                  </button>
                </div>
              </div>
            </div>

            <div class="flex justify-end gap-2 px-6 pb-5">
              <button @click="closeReplyModal" class="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">ยกเลิก</button>
              <button
                @click="sendReply"
                :disabled="!canSendReply"
                class="px-4 py-2 text-sm text-white rounded-lg shadow-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
                :class="canSendReply ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400'"
              >
                ส่งข้อความ
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, nextTick } from "vue"; // รวม imports ไว้ที่เดียวกัน
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import { useAuth } from '~/composables/useAuth';

const { $api } = useNuxtApp();
const { user } = useAuth();
//New from Weerawong
const tabs = [
  { label: 'ทั้งหมด', value: 'all' },
  { label: 'ข้อความ', value: 'message' },
];
const activeTab = ref('all');
const showReplyModal = ref(false);
const replyText = ref('');
const replyTarget = ref(null);
const replyTextareaRef = ref(null);
const maxReplyLength = 300;
const quickReplies = [
  'กำลังเดินทางไปถึงภายใน 5 นาที',
  'ขออภัยที่ล่าช้า',
  'ถึงจุดนัดหมายแล้ว',
  'ขอเวลาสักครู่'
];

useHead({
  title: "การแจ้งเตือน - ไปนำแหน่",
});

// 2. เรียกใช้งานใน useAsyncData โดยไม่ต้องประกาศ $api ซ้ำ
const { data: notifications, pending, error, refresh } = await useAsyncData(
  'notifications',
  async () => {
    try {
      const response = await $api('/notifications', {
        method: 'GET'
      });

      const list = response?.data || response || [];

      if (!Array.isArray(list)) return [];

      return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (err) {
      console.error("Fetch error:", err);
      throw err;
    }
  },
  { watch: [user] }
);

const displayNotifications = computed(() => {
  if (!notifications.value) return [];
  if (activeTab.value === 'message') {
    return notifications.value.filter(isMessageNotification);
  }
  return notifications.value;
});

const getNotificationMessage = (notification) => {
  const senderName = notification.sender?.firstName || 'ใครบางคน';
  switch (notification.type) {
    case "REQUESTED":
      return `คุณมีคำขอจองใหม่จากคุณ ${senderName}`;
    case "ACCEPTED":
      return `คนขับยอมรับคำขอจองของคุณแล้ว`;
    case "REJECTED":
      return `คนขับปฏิเสธคำขอจองของคุณ`;
    case "CANCELLED":
    case "PASSENGER_CANCELLED":
      return `ผู้โดยสารได้ยกเลิกการจอง`;
    case "DRIVER_CANCELLED":
      return `คนขับได้ยกเลิกการเดินทาง`;
    case "TRIP_STARTED":
      return `การเดินทางของคุณได้เริ่มต้นขึ้นแล้ว`;
    case "TRIP_COMPLETED":
      return `การเดินทางของคุณเสร็จสิ้นแล้ว`;
    default:
      return "คุณมีการแจ้งเตือนใหม่";
  }
};

const markAsRead = async (id) => {
  try {
    await $api(`/notifications/${id}/read`, {
      method: 'PATCH'
    });
    const notification = notifications.value.find((n) => n.id === id);
    if (notification) {
      notification.readAt = new Date().toISOString();
    }
  } catch (err) {
    console.error("Error marking as read:", err);
  }
};

const removeNotification = async (id) => {
  if (!confirm('คุณต้องการลบการแจ้งเตือนนี้ใช่หรือไม่?')) return;

  try {
    await $api(`/notifications/${id}`, {
      method: 'DELETE'
    });

    notifications.value = notifications.value.filter((n) => n.id !== id);
  } catch (err) {
    console.error("Error deleting notification:", err);
    alert('ไม่สามารถลบแจ้งเตือนได้ในขณะนี้');
  }
};

const isMessageNotification = (n) => n?.metadata?.category === 'MESSAGE';

const openReplyModal = (notification) => {
  replyTarget.value = notification;
  replyText.value = '';
  showReplyModal.value = true;
  nextTick(() => replyTextareaRef.value?.focus());
};

const closeReplyModal = () => {
  showReplyModal.value = false;
  replyTarget.value = null;
  replyText.value = '';
};

const applyQuickReply = (text) => {
  replyText.value = text;
  nextTick(() => replyTextareaRef.value?.focus());
};

const canSendReply = computed(() => replyText.value.trim().length > 0);

const sendReply = async () => {
  if (!replyTarget.value?.metadata?.bookingId || !replyText.value.trim()) return;
  try {
    await $api(`/notifications/bookings/${replyTarget.value.metadata.bookingId}/messages`, {
      method: 'POST',
      body: { content: replyText.value.trim() },
    });
    closeReplyModal();
    alert('ส่งข้อความแล้ว');
  } catch (err) {
    console.error('Send reply failed', err);
    alert(err?.data?.message || 'ส่งข้อความไม่สำเร็จ');
  }
};

watch(replyText, (val) => {
  if (val.length > maxReplyLength) {
    replyText.value = val.slice(0, maxReplyLength);
  }
});

</script>

<style scoped>
</style>
