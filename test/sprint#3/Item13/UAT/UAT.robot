*** Settings ***
Resource          keywords.robot
Test Setup        Login As Passenger
Test Teardown     Close All Browsers

*** Test Cases ***
# =================================================================
# SUCCESS SCENARIOS
# =================================================================

UATSprint3-Report-001_ReportProblem_Success_ImageEvidence
    [Documentation]    ทดสอบรายงานปัญหาสำเร็จ – อัพโหลดหลักฐานรูปภาพ (PNG, JPG, JPEG)
    [Tags]    sprint3    success    image
    Navigate To My Trip Page
    Open Report Form
    Select Category       ${CATEGORY_VALUE}
    Fill Subject          ${VALID_SUBJECT}
    Fill Detail           ${VALID_DETAIL}
    Upload Image Evidence    ${FILE_PNG}    ${FILE_JPG}    ${FILE_JPEG}
    Fill First Name       ${VALID_FIRSTNAME}
    Fill Last Name        ${VALID_LASTNAME}
    Fill Phone            ${VALID_PHONE}
    Fill Email            ${VALID_EMAIL}
    Submit Report
    Page Should Be On Tracking Page

UATSprint3-Report-002_ReportProblem_Success_VideoEvidence
    [Documentation]    ทดสอบรายงานปัญหาสำเร็จ – อัพโหลดหลักฐานวิดีโอ (MP4)
    [Tags]    sprint3    success    video
    Navigate To My Trip Page
    Open Report Form
    Select Category       ${CATEGORY_VALUE}
    Fill Subject          ${VALID_SUBJECT}
    Fill Detail           ${VALID_DETAIL}
    Upload Single File    ${FILE_MP4}
    Fill First Name       ${VALID_FIRSTNAME}
    Fill Last Name        ${VALID_LASTNAME}
    Fill Phone            ${VALID_PHONE}
    Fill Email            ${VALID_EMAIL}
    Submit Report
    Page Should Be On Tracking Page

# =================================================================
# INVALID INPUT SCENARIOS
# =================================================================

UATSprint3-Report-003_Invalid_NoCategory
    [Documentation]    ทดสอบ Invalid Input – ไม่เลือกหมวดหมู่ → ปุ่มส่งรายงานต้อง Disabled
    [Tags]    sprint3    invalid    validation
    Navigate To My Trip Page
    Open Report Form
    # [ข้าม] ไม่เลือกหมวดหมู่
    Fill Subject          ${VALID_SUBJECT}
    Fill Detail           ${VALID_DETAIL}
    Upload Single File    ${FILE_PNG}
    Fill First Name       ${VALID_FIRSTNAME}
    Fill Last Name        ${VALID_LASTNAME}
    Fill Phone            ${VALID_PHONE}
    Submit Button Should Be Disabled

UATSprint3-Report-004_Invalid_NoSubject
    [Documentation]    ทดสอบ Invalid Input – ไม่กรอกหัวข้อ → ปุ่มส่งรายงานต้อง Disabled
    [Tags]    sprint3    invalid    validation
    Navigate To My Trip Page
    Open Report Form
    Select Category       ${CATEGORY_VALUE}
    # [ข้าม] ไม่กรอกหัวข้อ
    Fill Detail           ${VALID_DETAIL}
    Upload Single File    ${FILE_PNG}
    Fill First Name       ${VALID_FIRSTNAME}
    Fill Last Name        ${VALID_LASTNAME}
    Fill Phone            ${VALID_PHONE}
    Submit Button Should Be Disabled

UATSprint3-Report-005_Invalid_NoDetail
    [Documentation]    ทดสอบ Invalid Input – ไม่กรอกรายละเอียด → ปุ่มส่งรายงานต้อง Disabled
    [Tags]    sprint3    invalid    validation
    Navigate To My Trip Page
    Open Report Form
    Select Category       ${CATEGORY_VALUE}
    Fill Subject          ${VALID_SUBJECT}
    # [ข้าม] ไม่กรอกรายละเอียด
    Upload Single File    ${FILE_PNG}
    Fill First Name       ${VALID_FIRSTNAME}
    Fill Last Name        ${VALID_LASTNAME}
    Fill Phone            ${VALID_PHONE}
    Submit Button Should Be Disabled

UATSprint3-Report-006_Invalid_NoPhone
    [Documentation]    ทดสอบ Invalid Input – ไม่กรอกเบอร์โทรศัพท์ → ปุ่มส่งรายงานต้อง Disabled
    [Tags]    sprint3    invalid    validation
    Navigate To My Trip Page
    Open Report Form
    Select Category       ${CATEGORY_VALUE}
    Fill Subject          ${VALID_SUBJECT}
    Fill Detail           ${VALID_DETAIL}
    Upload Single File    ${FILE_PNG}
    Fill First Name       ${VALID_FIRSTNAME}
    Fill Last Name        ${VALID_LASTNAME}
    # [ล้างค่า pre-filled] ไม่กรอกเบอร์โทรศัพท์
    Clear Phone
    Submit Button Should Be Disabled

# ── Emoji Input (inject ผ่าน JS เพื่อหลีกเลี่ยง ChromeDriver BMP limitation) ──────

UATSprint3-Report-007_Invalid_Emoji_Subject
    [Documentation]    ทดสอบ Invalid Input – กรอก Emoji ในช่องหัวข้อ → ปุ่มส่งรายงานต้อง Disabled
    [Tags]    sprint3    invalid    emoji
    Navigate To My Trip Page
    Open Report Form
    Select Category       ${CATEGORY_VALUE}
    Fill With JS          ${INPUT_SUBJECT}      ${EMOJI_SUBJECT}
    Fill Detail           ${VALID_DETAIL}
    Upload Single File    ${FILE_PNG}
    Fill First Name       ${VALID_FIRSTNAME}
    Fill Last Name        ${VALID_LASTNAME}
    Fill Phone            ${VALID_PHONE}
    Submit Button Should Be Disabled

UATSprint3-Report-008_Invalid_Emoji_Detail
    [Documentation]    ทดสอบ Invalid Input – กรอก Emoji ในช่องรายละเอียด → ปุ่มส่งรายงานต้อง Disabled
    [Tags]    sprint3    invalid    emoji
    Navigate To My Trip Page
    Open Report Form
    Select Category       ${CATEGORY_VALUE}
    Fill Subject          ${VALID_SUBJECT}
    Fill With JS          ${TEXTAREA_DETAIL}    ${EMOJI_DETAIL}
    Upload Single File    ${FILE_PNG}
    Fill First Name       ${VALID_FIRSTNAME}
    Fill Last Name        ${VALID_LASTNAME}
    Fill Phone            ${VALID_PHONE}
    Submit Button Should Be Disabled

UATSprint3-Report-009_Invalid_Emoji_Phone
    [Documentation]    ทดสอบ Invalid Input – กรอก Emoji ในช่องเบอร์โทรศัพท์ → ปุ่มส่งรายงานต้อง Disabled
    [Tags]    sprint3    invalid    emoji
    Navigate To My Trip Page
    Open Report Form
    Select Category       ${CATEGORY_VALUE}
    Fill Subject          ${VALID_SUBJECT}
    Fill Detail           ${VALID_DETAIL}
    Upload Single File    ${FILE_PNG}
    Fill First Name       ${VALID_FIRSTNAME}
    Fill Last Name        ${VALID_LASTNAME}
    Fill With JS          ${INPUT_PHONE}        ${EMOJI_PHONE}
    Submit Button Should Be Disabled

UATSprint3-Report-010_Invalid_Emoji_Email
    [Documentation]    ทดสอบ Invalid Input – กรอก Emoji ในช่อง Email → ปุ่มส่งรายงานต้อง Disabled
    [Tags]    sprint3    invalid    emoji
    Navigate To My Trip Page
    Open Report Form
    Select Category       ${CATEGORY_VALUE}
    Fill Subject          ${VALID_SUBJECT}
    Fill Detail           ${VALID_DETAIL}
    Upload Single File    ${FILE_PNG}
    Fill First Name       ${VALID_FIRSTNAME}
    Fill Last Name        ${VALID_LASTNAME}
    Fill Phone            ${VALID_PHONE}
    Fill With JS          ${INPUT_EMAIL}        ${EMOJI_EMAIL}
    Submit Button Should Be Disabled

# ── File Size ─────────────────────────────────────────────────────

UATSprint3-Report-011_Invalid_OversizeImage
    [Documentation]    ทดสอบ Invalid Input – อัพโหลดรูปภาพขนาดเกิน 10MB → ระบบแสดง error alert ทันทีโดยไม่ต้องกด submit
    [Tags]    sprint3    invalid    file_size
    Navigate To My Trip Page
    Open Report Form
    Upload Single File    ${FILE_IMG_OVERSIZE}
    Expect Error Alert

UATSprint3-Report-012_Invalid_OversizeVideo
    [Documentation]    ทดสอบ Invalid Input – อัพโหลดวิดีโอขนาดเกิน 30MB → ระบบแสดง error alert ทันทีโดยไม่ต้องกด submit
    [Tags]    sprint3    invalid    file_size
    Navigate To My Trip Page
    Open Report Form
    Upload Single File    ${FILE_VID_OVERSIZE}
    Expect Error Alert

# ── File Count ────────────────────────────────────────────────────

UATSprint3-Report-013_Invalid_OversizeFileCount
    [Documentation]    ทดสอบ Invalid Input – อัพโหลดไฟล์เกินจำนวน (4 ไฟล์ เกิน max 3) → ระบบแสดง error alert ทันทีเมื่อพยายามเพิ่มไฟล์ที่ 4
    [Tags]    sprint3    invalid    file_count
    Navigate To My Trip Page
    Open Report Form
    # อัพโหลด 3 ไฟล์แรก → สำเร็จ
    Choose File    ${INPUT_FILE}    ${FILE_PNG}
    Choose File    ${INPUT_FILE}    ${FILE_JPG}
    Choose File    ${INPUT_FILE}    ${FILE_JPEG}
    # อัพโหลดไฟล์ที่ 4 → ระบบต้องแสดง alert ทันที
    Choose File    ${INPUT_FILE}    ${FILE_EXTRA}
    Expect Error Alert
