*** Settings ***
Library     SeleniumLibrary
Library     RequestsLibrary
Library     Collections
Resource    variables.robot

*** Keywords ***
Login As User
    [Arguments]    ${alias_name}    ${user}    ${pass}
    Open Fast Browser And Allow Noti    ${alias_name}
    Fast Login    ${user}    ${pass}

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
    Set Selenium Speed    ${DELAY}
    Set Selenium Timeout  15s

Fast Login
    [Arguments]    ${user}    ${pass}
    Wait Until Element Is Visible    ${INPUT_USERNAME}    30s
    Input Text      ${INPUT_USERNAME}    ${user}
    Input Text      ${INPUT_PASSWORD}    ${pass}
    Click Element   ${BTN_LOGIN}
    Wait Until Element Is Not Visible    ${BTN_LOGIN}    15s

API Login And Get Token And ID
    [Arguments]    ${user_input}    ${password}
    ${is_email}=    Evaluate    "@" in "${user_input}"
    ${body}=    Run Keyword If    ${is_email}    
    ...    Create Dictionary    email=${user_input}    password=${password}
    ...    ELSE    
    ...    Create Dictionary    username=${user_input}    password=${password}
    ${response}=    POST    url=${API_LOGIN}    json=${body}    expected_status=any
    ${json}=    Set Variable    ${response.json()}
    ${token}=   Get From Dictionary    ${json['data']}    token
    ${u_id}=    Get From Dictionary    ${json['data']['user']}    id
    RETURN      ${token}    ${u_id}

Wait And Verify Notification In UI
    [Arguments]    ${expected_text}
    Go To    ${URL_NOTI}
    Reload Page
    Wait Until Page Contains    ${expected_text}    20s
    Wait Until Page Contains    ${NOTI_TIME_COND}    10s
    Log To Console    \n✅ ตรวจพบข้อความใน UI: ${expected_text}