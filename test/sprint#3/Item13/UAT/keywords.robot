*** Settings ***
Library     SeleniumLibrary
Resource    variables.robot

*** Keywords ***
# ─────────────────────────────────────────────────────────────────
# Browser & Login
# ─────────────────────────────────────────────────────────────────

Open Fast Browser And Allow Noti
    [Arguments]    ${alias_name}
    ${options}=    Evaluate    selenium.webdriver.ChromeOptions()    modules=selenium.webdriver

    # 1. Auto-Allow Notification
    ${prefs}=    Create Dictionary    profile.default_content_setting_values.notifications=${1}
    Call Method    ${options}    add_experimental_option    prefs    ${prefs}

    # 2. Auto-Accept Alert
    Call Method    ${options}    set_capability    unhandledPromptBehavior    accept

    Open Browser    ${URL_LOGIN}    chrome    alias=${alias_name}    options=${options}
    Maximize Browser Window

    # 3. Kill Alert JS
    Execute Javascript    window.alert = function() { return true; }; window.confirm = function() { return true; };
    Set Selenium Speed      ${DELAY}
    Set Selenium Timeout    15s

Fast Login
    [Arguments]    ${user}    ${pass}
    Wait Until Element Is Visible    ${INPUT_USERNAME}    30s
    Input Text      ${INPUT_USERNAME}    ${user}
    Input Text      ${INPUT_PASSWORD}    ${pass}
    Click Element   ${BTN_LOGIN}
    Wait Until Element Is Not Visible    ${BTN_LOGIN}    15s

Login As Passenger
    Open Fast Browser And Allow Noti    PassengerBrowser
    Fast Login    ${PASS_USER}    ${PASS_PASS}

# ─────────────────────────────────────────────────────────────────
# Navigation
# ─────────────────────────────────────────────────────────────────

Navigate To My Trip Page
    Go To    ${URL_MY_TRIP}
    Wait Until Element Is Visible    ${TAB_TRIP_DONE}    15s
    Click Element    ${TAB_TRIP_DONE}
    Wait Until Element Is Visible    ${BTN_REPORT_PROBLEM}    15s

# ─────────────────────────────────────────────────────────────────
# Report Problem Form
# ─────────────────────────────────────────────────────────────────

Open Report Form
    Click Element    ${BTN_REPORT_PROBLEM}
    Wait Until Element Is Visible    ${SELECT_CATEGORY}    15s

Select Category
    [Arguments]    ${value}
    Select From List By Value    ${SELECT_CATEGORY}    ${value}

Fill Subject
    [Arguments]    ${text}
    Input Text    ${INPUT_SUBJECT}    ${text}

Fill Detail
    [Arguments]    ${text}
    Input Text    ${TEXTAREA_DETAIL}    ${text}

Upload Single File
    [Arguments]    ${filepath}
    Choose File    ${INPUT_FILE}    ${filepath}

Upload Image Evidence
    [Arguments]    ${png}    ${jpg}    ${jpeg}
    # อัพโหลดทีละไฟล์ รวม 3 ไฟล์ (PNG, JPG, JPEG)
    Choose File    ${INPUT_FILE}    ${png}
    Choose File    ${INPUT_FILE}    ${jpg}
    Choose File    ${INPUT_FILE}    ${jpeg}

Upload Overcount Evidence
    [Arguments]    ${f1}    ${f2}    ${f3}    ${f4}
    # อัพโหลด 4 ไฟล์ เกินจำนวนสูงสุดที่ระบบรองรับ (max 3 ไฟล์)
    Choose File    ${INPUT_FILE}    ${f1}
    Choose File    ${INPUT_FILE}    ${f2}
    Choose File    ${INPUT_FILE}    ${f3}
    Choose File    ${INPUT_FILE}    ${f4}

Fill First Name
    [Arguments]    ${text}
    Clear Element Text    ${INPUT_FIRSTNAME}
    Input Text    ${INPUT_FIRSTNAME}    ${text}

Fill Last Name
    [Arguments]    ${text}
    Clear Element Text    ${INPUT_LASTNAME}
    Input Text    ${INPUT_LASTNAME}    ${text}

Fill Phone
    [Arguments]    ${text}
    Clear Element Text    ${INPUT_PHONE}
    Input Text    ${INPUT_PHONE}    ${text}

Fill Email
    [Arguments]    ${text}
    Clear Element Text    ${INPUT_EMAIL}
    Input Text    ${INPUT_EMAIL}    ${text}

Fill With JS
    [Arguments]    ${locator}    ${text}
    # ใช้ JS inject เพื่อหลีกเลี่ยง ChromeDriver BMP limitation (emoji)
    ${element}=    Get WebElement    ${locator}
    Execute Javascript    arguments[0].value = arguments[1]; arguments[0].dispatchEvent(new Event('input', {bubbles: true}));    ARGUMENTS    ${element}    ${text}

Clear First Name
    Clear Element Text    ${INPUT_FIRSTNAME}

Clear Last Name
    Clear Element Text    ${INPUT_LASTNAME}

Clear Phone
    Clear Element Text    ${INPUT_PHONE}

# ─────────────────────────────────────────────────────────────────
# Assertions
# ─────────────────────────────────────────────────────────────────

Submit Report
    Click Element    ${BTN_SUBMIT}
    Wait Until Location Contains    /reports/tracking    15s

Page Should Be On Tracking Page
    Location Should Contain    ${URL_TRACKING}

Location Should Not Contain
    [Arguments]    ${value}
    ${location}=    Get Location
    Should Not Contain    ${location}    ${value}

Submit Button Should Be Disabled
    Element Should Be Disabled    ${BTN_SUBMIT}

Submit And Expect Error Alert
    # คลิก submit แล้วรอ error alert (ไม่ redirect) — สำรองไว้ใช้หากมี case เพิ่มในอนาคต
    Click Element    ${BTN_SUBMIT}
    Wait Until Element Is Visible    ${ALERT_ERROR}    10s
    Location Should Not Contain    /reports/tracking

Expect Error Alert
    # alert ต้องแสดงขึ้นทันทีโดยไม่ต้องกด submit (เช่น oversize, overcount)
    Wait Until Element Is Visible    ${ALERT_ERROR}    10s
