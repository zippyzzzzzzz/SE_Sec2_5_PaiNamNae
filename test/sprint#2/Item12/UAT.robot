*** Settings ***
Resource         keywords.robot
Test Teardown    Close All Browsers

*** Test Cases ***
TC1_UI_Send_Success_And_Reply_Success
    Login As User    PassengerBrowser    ${PASS_USER}    ${PASS_PASS}
    Login As User    DriverBrowser    ${DRIVER_USER}    ${DRIVER_PASS}
    
    Go To    ${URL_MY_ROUTE}
    Wait Until Element Is Visible    ${TAB_CONFIRMED}    15s
    Click Element    ${TAB_CONFIRMED}
    Wait Until Element Is Visible    ${BTN_NUDGE}    15s
    Click Element    ${BTN_NUDGE}
    Input Text    ${INPUT_MSG_DRIVER}    ${MSG_TC1_DRIVER}
    Click Element    ${BTN_SEND_MSG}
    
    Switch Browser    PassengerBrowser
    Wait And Verify Notification In UI    ${MSG_TC1_DRIVER}

    ${reply_btn}=    Set Variable    xpath=//div[contains(., '${MSG_TC1_DRIVER}')]//button[contains(text(), 'ตอบกลับ')]
    Wait Until Element Is Visible    ${reply_btn}    15s
    Click Element    ${reply_btn}
    Input Text    ${INPUT_MSG_REPLY}    ${MSG_TC1_PASS}
    Click Element    ${BTN_SEND_MSG}
    
    Switch Browser    DriverBrowser
    Wait And Verify Notification In UI    ${MSG_TC1_PASS}

TC2_UI_Reply_Failed_Empty
    Login As User    PassengerBrowser    ${PASS_USER}    ${PASS_PASS}
    Login As User    DriverBrowser    ${DRIVER_USER}    ${DRIVER_PASS}
    
    Go To    ${URL_MY_ROUTE}
    Wait Until Element Is Visible    ${TAB_CONFIRMED}    15s
    Click Element    ${TAB_CONFIRMED}
    Wait Until Element Is Visible    ${BTN_NUDGE}    15s
    Click Element    ${BTN_NUDGE}
    Input Text    ${INPUT_MSG_DRIVER}    ${MSG_TC3_DRIVER}
    Click Element    ${BTN_SEND_MSG}
    
    Switch Browser    PassengerBrowser
    Wait And Verify Notification In UI    ${MSG_TC3_DRIVER}
    
    Go To    ${URL_NOTI}
    ${reply_btn}=    Set Variable    xpath=//div[contains(., '${MSG_TC3_DRIVER}')]//button[contains(text(), 'ตอบกลับ')]
    Wait Until Element Is Visible    ${reply_btn}    15s
    Click Element    ${reply_btn}
    Input Text    ${INPUT_MSG_REPLY}    ${EMPTY}
    Element Should Be Disabled    ${BTN_SEND_MSG}

TC3_UI_Send_Failed_Empty_Message
    Login As User    DriverBrowser    ${DRIVER_USER}    ${DRIVER_PASS}
    Go To    ${URL_MY_ROUTE}
    Wait Until Element Is Visible    ${TAB_CONFIRMED}    15s
    Click Element    ${TAB_CONFIRMED}
    Wait Until Element Is Visible    ${BTN_NUDGE}    15s
    Click Element    ${BTN_NUDGE}
    Input Text    ${INPUT_MSG_DRIVER}    ${EMPTY}
    Element Should Be Disabled    ${BTN_SEND_MSG}