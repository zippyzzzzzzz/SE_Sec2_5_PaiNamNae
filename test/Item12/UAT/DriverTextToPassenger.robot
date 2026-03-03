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

    ### ---------- PASSENGER LOGIN ----------
    Open Browser    ${URL}    chrome
    Maximize Browser Window
    Set Selenium Speed    0.5s

    Input Text    id=username    ${PASSENGER_USER}
    Input Text    id=password    ${PASSENGER_PASS}
    Click Button    id=login

    ${PASSENGER}=    Get Browser Id