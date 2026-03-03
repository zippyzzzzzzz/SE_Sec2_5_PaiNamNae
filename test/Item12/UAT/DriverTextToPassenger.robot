*** Settings ***
Library    SeleniumLibrary
Library    Collections

*** Variables ***
${BASE_URL}     https://csse0568.cpkku.com
${LOGIN_URL}    ${BASE_URL}/login
${BROWSER}      chrome

${SCREENSHOT_PATH}    C:/Users/User/Documents/GitHub/SE_Sec2_5_PaiNamNae/test/Item12/immge

${DRIVER_USER}        simon45
${DRIVER_PASS}        wirawong555!

${PASSENGER_USER}     Test123123
${PASSENGER_PASS}     wirawong555!


*** Test Cases ***
Driver Text To Passenger Flow

    ### ===== DRIVER LOGIN =====
    Open Website Allow Notification
    Maximize Browser Window
    Wait Until Element Is Visible    id=identifier
    Input Text    id=identifier    ${DRIVER_USER}
    Input Text    id=password    ${DRIVER_PASS}

    Wait Until Element Is Visible    id=login
    Click Button    id=login
    Sleep    10s
    Capture Page Screenshot    ${SCREENSHOT_PATH}/01_driver_login.png

    ### ===== CREATE TRIP =====
    Go To    ${BASE_URL}/createTrip

    Input Text    id=startPoint      ขอนแก่น ประเทศไทย
    Input Text    id=endPoint        กรุงเทพมหานคร
    Input Text    id=travelDate      12/12/2026
    Input Text    id=travelTime      12:00
    Input Text    id=seatCount       4
    Input Text    id=pricePerSeat    1000

    Capture Page Screenshot    ${SCREENSHOT_PATH}/02_fill_trip.png

    Click Button    css=button[type="submit"]
    Sleep    3s

    Capture Page Screenshot    ${SCREENSHOT_PATH}/03_trip_created.png

    ${DRIVER_WINDOW}=    Get Window Handles


    ### ===== PASSENGER LOGIN =====
    Open Browser    ${LOGIN_URL}    ${BROWSER}
    Maximize Browser Window

    Wait Until Element Is Visible    id=identifier
    Input Text    id=identifier    ${PASSENGER_USER}
    Input Text    id=password    ${PASSENGER_PASS}

    Wait Until Element Is Visible    id=login
    Click Button    id=login

    Sleep    3s
    Capture Page Screenshot    ${SCREENSHOT_PATH}/04_passenger_login.png


    ### ===== FIND TRIP =====
    Go To    ${BASE_URL}/findTrip

    Input Text    xpath=//input[@placeholder="จุดเริ่มต้น"]    ขอนแก่น
    Press Keys    xpath=//input[@placeholder="จุดเริ่มต้น"]    ENTER

    Sleep    3s
    Capture Page Screenshot    ${SCREENSHOT_PATH}/05_search_trip.png

    Click Element    xpath=(//div[contains(@class,"cursor")])[1]
    Sleep    2s

    Capture Page Screenshot    ${SCREENSHOT_PATH}/06_select_trip.png


    ### ===== BOOK SEAT =====
    Click Element    text=จองที่นั่ง
    Sleep    2s

    Select From List By Label    id=pickupPoint     มหาวิทยาลัยขอนแก่น
    Select From List By Label    id=dropoffPoint    สะพานพระราม 9

    Capture Page Screenshot    ${SCREENSHOT_PATH}/07_pick_drop.png

    Click Element    text=ยืนยันการจอง
    Sleep    3s

    Capture Page Screenshot    ${SCREENSHOT_PATH}/08_booking_success.png


    ### ===== BACK TO DRIVER =====
    Switch Window    ${DRIVER_WINDOW}[0]

    Go To    ${BASE_URL}/myRoute
    Sleep    3s

    Click Element    text=ยืนยัน
    Click Element    text=สะกิดผู้โดยสาร

    Input Text
    ...    xpath=//input[contains(@placeholder,"ข้อความ")]
    ...    สวัสดีครับ

    Capture Page Screenshot    ${SCREENSHOT_PATH}/09_before_send.png

    Click Element    text=ส่ง
    Sleep    5s

    Capture Page Screenshot    ${SCREENSHOT_PATH}/10_message_sent.png

    Close All Browsers


*** Keywords ***
Open Website Allow Notification
    ${options}=    Evaluate    sys.modules['selenium.webdriver'].ChromeOptions()    sys
    ${prefs}=    Create Dictionary
    ...    profile.default_content_setting_values.notifications=1
    Call Method    ${options}    add_experimental_option    prefs    ${prefs}
    Open Browser    ${LOGIN_URL}    chrome    options=${options}