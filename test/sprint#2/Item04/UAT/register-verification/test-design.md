# UAT Register Verification - Test Design

## วัตถุประสงค์

ตรวจสอบว่าระบบลงทะเบียนแยกแยะตัวตนอัตโนมัติได้ถูกต้องหรือไม่ โดยใช้
- **OCR API** อ่านเลขบัตร/วันหมดอายุ
- **FACE++ API** ตรวจสอบหน้าบนบัตรและหน้าจากภาพถ่าย

ผลที่ได้ควรไปลงในฐานข้อมูลตามที่คาดและแสดงสถานะให้ผู้ใช้เห็นในหน้าโปรไฟล์

## แนวทางการทดสอบ

1. ใช้ Robot Framework + Selenium กรอกฟอร์มบนเว็บ
2. เชื่อมต่อฐานข้อมูล PostgreSQL ตรวจดูคอลัมน์ `verificationStatus`, `isVerified`, และข้อมูล OCR ที่เก็บไว้
3. แต่ละกรณีเรียกคีย์เวิร์ด `Register Flow` แล้วส่งค่าเข้าไป เช่น สถานะที่ต้องการ, เลขบัตร, รูปภาพ

## สรุปการตัดสินใจภายในระบบ

- **OCR** (`verifyIdCard`)
  * ถ้าอ่านไม่สำเร็จ = `AUTO_REJECTED`
  * ถ้าเลขบัตรและวันหมดอายุตรงเป๊ะ = `VERIFIED`
  * ถ้าใกล้เคียง (confidence ≥ 75%) = `BORDERLINE`
  * อื่นๆ `AUTO_REJECTED`

- **เทียบหน้า** (`compareFaces`)
  * ได้ค่าความมั่นใจ แล้วเทียบกับ treshold high,low (75/50)
  * แบ่งเป็น high, borderline, low

- **รวมผลจากทั้งสอง** (`autoVerifyUserWithOCR`)
  * OCR `AUTO_REJECTED` = สถานะสุดท้าย `AUTO_REJECTED`
  * OCR `BORDERLINE` หรือ หน้า borderline = สถานะ `PENDING`
  * OCR `VERIFIED` + หน้า high = `VERIFIED` (isVerified=true)
  * OCR `VERIFIED` + หน้า low = `AUTO_REJECTED`

## Environment ที่ต้องมี

- Web App รันที่ URL ในตัวแปร `${BASE_URL}`
- APIKEY OCR/FACE ใน .env

## How to test

1. Run `register_uat.robot` ใน `test/UAT/register-verification`
2. แต่ละกรณีจะ
   - สมัคร User ใหม่โดยอีเมล/ชื่อสุ่ม พร้อมอัปโหลดรูปบัตร/เซลฟี่
   - รอระบบทำงานแล้วเช็คค่าใน DB
   - เข้าหน้าโปรไฟล์เพื่อตรวจสถานะที่แสดงบนเว็บไซต์
   - ลบ User ทดสอบทิ้งหลังจบกรณี
