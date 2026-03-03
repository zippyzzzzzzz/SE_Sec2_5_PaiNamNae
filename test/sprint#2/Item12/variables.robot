*** Variables ***
${DELAY}                0.1s
${URL_BASE}             http://localhost:3001
${URL_LOGIN}            ${URL_BASE}/login
${URL_MY_ROUTE}         ${URL_BASE}/myRoute
${URL_NOTI}             ${URL_BASE}/notifications

# API Config
${API_BASE}             http://localhost:3000/api
${API_LOGIN}            ${API_BASE}/auth/login
${API_SEND_NOTI}        ${API_BASE}/notifications/admin

# User Credentials
${DRIVER_USER}          driver
${DRIVER_PASS}          Admin1234!
${PASS_USER}            passenger@gmail.com
${PASS_PASS}            Admin1234!
${ADMIN_USER}           admin@gmail.com
${ADMIN_PASS}           Admin1234!
${TARGET_EMAIL}         passenger@gmail.com
${NOTI_TIME_COND}       น้อยกว่า 1 นาทีที่ผ่านมา

# Message Data
${MSG_TC1_DRIVER}       แจ้งเตือนปกติต้องการการตอบกลับ
${MSG_TC1_PASS}         รับทราบข้อความและตอบกลับสำเร็จ
${MSG_TC3_DRIVER}       แจ้งเตือนปกติต้องการทดสอบตอบกลับไม่สำเร็จ

# Locators
${INPUT_USERNAME}       id=identifier
${INPUT_PASSWORD}       id=password
${BTN_LOGIN}            xpath=//button[contains(text(),'เข้าสู่ระบบ') or contains(text(),'Login')]
${TAB_CONFIRMED}        xpath=//*[contains(text(), 'ยืนยันแล้ว')]
${BTN_NUDGE}            xpath=//*[contains(text(), '${TARGET_EMAIL}')]/ancestor::div[contains(@class, 'bg-white') or contains(@class, 'rounded')][1]//button[contains(text(), 'สะกิดผู้โดยสาร')]
${INPUT_MSG_DRIVER}     xpath=//*[@placeholder='พิมพ์ข้อความของคุณ']
${INPUT_MSG_REPLY}      xpath=//*[@placeholder='พิมพ์ข้อความของคุณที่นี่' or @placeholder='พิมพ์ข้อความของคุณ']
${BTN_SEND_MSG}         xpath=//button[contains(text(), 'ส่งข้อความ')]