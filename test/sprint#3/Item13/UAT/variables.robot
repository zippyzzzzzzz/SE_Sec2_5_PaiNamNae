*** Variables ***
# ── Browser ───────────────────────────────────────────────────────
${DELAY}                    0.1s

# ── Application URLs ──────────────────────────────────────────────
${URL_BASE}                 http://localhost:3001
${URL_LOGIN}                ${URL_BASE}/login
${URL_MY_TRIP}              ${URL_BASE}/myTrip
${URL_TRACKING}             ${URL_BASE}/reports/tracking

# ── Credentials ───────────────────────────────────────────────────
${PASS_USER}                passenger
${PASS_PASS}                Admin1234!

# ── Login Locators ────────────────────────────────────────────────
${INPUT_USERNAME}           id=identifier
${INPUT_PASSWORD}           id=password
${BTN_LOGIN}                xpath=//button[contains(text(),'เข้าสู่ระบบ') or contains(text(),'Login')]

# ── My Trip Locators ──────────────────────────────────────────────
${TAB_TRIP_DONE}            xpath=//button[contains(@class,'tab-button') and contains(text(),'จบทริปแล้ว')]
${BTN_REPORT_PROBLEM}       css:button.bg-orange-600

# ── Report Problem Form Locators ──────────────────────────────────
${SELECT_CATEGORY}          css:select.border-gray-300.rounded-lg
${INPUT_SUBJECT}            css:input[placeholder='โปรดระบุเรื่องของรายงาน']
${TEXTAREA_DETAIL}          css:textarea[placeholder='โปรดอธิบายรายละเอียดของปัญหา']
${INPUT_FILE}               css:input[type='file']
${INPUT_FIRSTNAME}          xpath=//label[@id='Name']/following-sibling::div/input
${INPUT_LASTNAME}           xpath=//label[@id='last_name']/following-sibling::div/input
${INPUT_PHONE}              css:input[type='tel']
${INPUT_EMAIL}              css:input[type='email']
${BTN_SUBMIT}               css:button.bg-blue-600
${ALERT_ERROR}              css:div.bg-red-50.border-red-200

# ── Test Data – Form ──────────────────────────────────────────────
${CATEGORY_VALUE}           LOST_ITEM
${VALID_SUBJECT}            ทดสอบการรายงานปัญหา
${VALID_DETAIL}             รายละเอียดของปัญหาสำหรับการทดสอบ Robot Framework Sprint 3
${VALID_FIRSTNAME}          ทดสอบ
${VALID_LASTNAME}           นามสกุล
${VALID_PHONE}              0812345678
${VALID_EMAIL}              test@example.com

# ── Evidence Files ────────────────────────────────────────────────
# วางไฟล์ทดสอบไว้ใน test_files/ ข้างๆ ไฟล์ .robot
${FILE_PNG}                 ${CURDIR}/test_files/evidence.png
${FILE_JPG}                 ${CURDIR}/test_files/evidence.jpg
${FILE_JPEG}                ${CURDIR}/test_files/evidence.jpeg
${FILE_MP4}                 ${CURDIR}/test_files/evidence.mp4
# ไฟล์เกินขนาด: รูปภาพ > 10MB, วิดีโอ > 30MB
${FILE_IMG_OVERSIZE}        ${CURDIR}/test_files/oversize_image.png
${FILE_VID_OVERSIZE}        ${CURDIR}/test_files/oversize_video.mp4
# ไฟล์สำหรับทดสอบจำนวนเกิน (อัปโหลดรวม 4 ไฟล์ เกิน max 3 ไฟล์)
${FILE_EXTRA}               ${CURDIR}/test_files/evidence_extra.png

# ── Test Data – Emoji (inject ผ่าน JS เพื่อหลีกเลี่ยง ChromeDriver BMP limitation) ──
${EMOJI_SUBJECT}            \U0001F525ทดสอบหัวข้อ\U0001F600
${EMOJI_DETAIL}             \U0001F4CBรายละเอียดปัญหา\U00002757\U00002757
${EMOJI_PHONE}              \U0001F4DE0812345678
${EMOJI_EMAIL}              test\U0001F600@example.com
