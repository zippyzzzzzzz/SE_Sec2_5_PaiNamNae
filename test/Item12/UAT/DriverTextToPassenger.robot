*** Settings ***
Library    SeleniumLibrary
Library    RequestsLibrary
Library    Collections
Library    DateTime

*** Variables ***
${URL}     csse0568.cpkku.com
${BROWSER}    chrome
${DRIVER_USER}          simon45
${DRIVER_PASS}          wirawong555!
${PASSENGER_USER}       Test123123
${PASSENGER_PASS}       wirawong555!

### ---------- DRIVER LOGIN (NEW WINDOW) ----------
    Open Browser    ${URL}    chrome
    Maximize Browser Window

    Input Text    id=username    ${DRIVER_USER}
    Input Text    id=password    ${DRIVER_PASS}
    Click Button    id=login

    ${DRIVER}=    Get Browser Id

    # ================= CREATE TRIP =================
    Go To    ${URL}/createTrip

    Fill Text    id=startPoint      ขอนแก่น ประเทศไทย
    Fill Text    id=endPoint        กรุงเทพมหานคร
    Fill Text    id=travelDate      12/12/2026
    Fill Text    id=travelTime      12:00
    Fill Text    id=seatCount       4
    Fill Text    id=pricePerSeat    1000

    Take Screenshot    02_driver_fill_trip

    Click    css=button[type="submit"]
    Wait For Load State

    Take Screenshot    03_trip_created


    ### ---------- PASSENGER LOGIN ----------
    Open Browser    ${URL}    chrome
    Maximize Browser Window
    Set Selenium Speed    0.5s

    Input Text    id=username    ${PASSENGER_USER}
    Input Text    id=password    ${PASSENGER_PASS}
    Click Button    id=login

    ${PASSENGER}=    Get Browser Id

    # ================= FIND TRIP =================
    Go To    ${URL}/findTrip

    Fill Text    xpath=//input[@placeholder="จุดเริ่มต้น"]    ขอนแก่น
    Press Keys   xpath=//input[@placeholder="จุดเริ่มต้น"]    Enter

    Wait For Load State
    Take Screenshot    05_search_result

    # เลือก route อันแรก
    Click    xpath=(//div[contains(@class,"cursor")])[1]

    Take Screenshot    06_select_trip

    # ================= BOOK SEAT =================
    Click    text=จองที่นั่ง

    Select Options By    label    มหาวิทยาลัยขอนแก่น
    Select Options By    label    สะพานพระราม 9

    Take Screenshot    07_pick_drop

    Click    text=ยืนยันการจอง
    Wait For Load State

    Take Screenshot    08_booking_success


# ================= DRIVER SEND MESSAGE =================
    Switch Page    0

    Go To    ${URL}/myRoute

    Click    text=ยืนยัน
    Click    text=สะกิดผู้โดยสาร

    Fill Text
    ...    xpath=//input[contains(@placeholder,"ข้อความ")]
    ...    สวัสดีครับ

    Take Screenshot    09_before_send

    Click    text=ส่ง

    Sleep    5s
    Take Screenshot    10_message_sent

    Close Browser