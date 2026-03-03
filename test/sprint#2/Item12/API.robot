*** Settings ***
Resource         keywords.robot
Test Teardown    Close All Browsers

*** Test Cases ***
TC1_Hybrid_Flow_Success
    Login As User    PassengerBrowser    ${PASS_USER}    ${PASS_PASS}
    Login As User    DriverBrowser    ${DRIVER_USER}    ${DRIVER_PASS}
    
    ${p_token}    ${passenger_db_id}=    API Login And Get Token And ID    ${PASS_USER}    ${PASS_PASS}
    ${admin_token}    ${admin_id}=    API Login And Get Token And ID    ${ADMIN_USER}    ${ADMIN_PASS}
    
    ${headers}=    Create Dictionary    Authorization=Bearer ${admin_token}
    ${noti_data}=  Create Dictionary    userId=${passenger_db_id}    title=System Nudge    body=${MSG_TC1_DRIVER}
    ${resp}=    POST    url=${API_SEND_NOTI}    json=${noti_data}    headers=${headers}    expected_status=any
    Should Be Equal As Integers    ${resp.status_code}    201

    Switch Browser    PassengerBrowser

    Wait And Verify Notification In UI    ${MSG_TC1_DRIVER}
    
    ${reply_btn}=    Set Variable    xpath=//div[contains(., '${MSG_TC1_DRIVER}')]//button[contains(text(), 'ตอบกลับ')]
    Wait Until Element Is Visible    ${reply_btn}    15s
    Click Element    ${reply_btn}
    Input Text       ${INPUT_MSG_REPLY}    ${MSG_TC1_PASS}
    Click Element    ${BTN_SEND_MSG}

    Switch Browser    DriverBrowser

    Wait And Verify Notification In UI    ${MSG_TC1_PASS}