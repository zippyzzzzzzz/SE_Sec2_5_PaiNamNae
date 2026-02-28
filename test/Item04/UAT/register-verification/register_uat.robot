*** Settings ***
Library           SeleniumLibrary
Library           DatabaseLibrary
Library           String

Suite Setup       Setup Suite
Suite Teardown    Teardown Suite
Test Teardown     Cleanup Test User
Test Template     Register Flow


*** Variables ***
${BASE_URL}       https://cp353004-team2-5.onrender.com
${DB_NAME}        painamnaedb
${DB_USER}        postgres
${DB_PASSWORD}    1234
${DB_HOST}        localhost
${DB_PORT}        5432


*** Test Cases ***
TC1 High Confidence - Approve + Login
    VERIFIED     True    LOGIN_SUCCESS    3411700830334    21-03-2025T00:00:00.000Z    ${CURDIR}/images/TC1/id.png    ${CURDIR}/images/TC1/selfie.png

TC2 Medium Confidence - Pending
    PENDING     False   LOGIN_BLOCKED    3411700830334    21-03-2025T00:00:00.000Z    ${CURDIR}/images/TC2/id.jpg    ${CURDIR}/images/TC2/selfie.jpg

TC3 Low Confidence - Reject
    AUTO_REJECTED    False   LOGIN_BLOCKED    3411700830334    21-03-2025T00:00:00.000Z    ${CURDIR}/images/TC3/id.jpg    ${CURDIR}/images/TC3/selfie.jpg

TC4 OCR Fail - Reject
    AUTO_REJECTED    False   LOGIN_BLOCKED    4444444444444    21-03-2025T00:00:00.000Z    ${CURDIR}/images/TC4/id.png    ${CURDIR}/images/TC4/selfie.png

TC5 Face Fail - Reject
    AUTO_REJECTED    False   LOGIN_BLOCKED    3411700830334    21-03-2025T00:00:00.000Z    ${CURDIR}/images/TC5/id.png    ${CURDIR}/images/TC5/selfie.jpg


*** Keywords ***
Setup Suite
    Open Browser    ${BASE_URL}/register    chrome
    Maximize Browser Window
    Connect To Database
    ...    psycopg2
    ...    dbname=${DB_NAME}
    ...    user=${DB_USER}
    ...    password=${DB_PASSWORD}
    ...    host=${DB_HOST}
    ...    port=${DB_PORT}

    ${db}=    Query    SELECT current_database();
    Log To Console    Connected DB: ${db}

    ${ver}=    Query    SELECT version();
    Log To Console    DB Version: ${ver}

Teardown Suite
    Disconnect From Database
    Close Browser


Register Flow
    [Arguments]    ${expected_status}    ${expected_verified}    ${login_expect}
    ...    ${national_id}    ${expiry_date}    ${id_img}    ${selfie_img}

    ${R}=        Generate Random String    5    123456789
    ${EMAIL}=    Set Variable    test${R}@w.com
    ${USERNAME}=    Set Variable    Test${R}

    Set Test Variable    ${CURRENT_EMAIL}       ${EMAIL}    
    Set Test Variable    ${CURRENT_NATIONAL_ID}    ${national_id}
    Set Test Variable    ${CURRENT_PASSWORD}    ${USERNAME}

    Go To    ${BASE_URL}/register

    Sleep    3s

    Input Text    id=username    ${USERNAME}
    Input Text    id=email       ${EMAIL}
    Input Text    id=password    ${USERNAME}
    Input Text    id=confirmPassword    ${USERNAME}
    Click Button  xpath=//button[contains(.,'ถัดไป')]

    Input Text    id=firstName    ${USERNAME}
    Input Text    id=lastName     ${USERNAME}
    Input Text    id=phoneNumber  08123${R}
    Click Element    xpath=//input[@name='gender' and @value='male']
    Click Button  xpath=//button[contains(.,'ถัดไป')]

    Choose File   id=idCardFile     ${id_img}
    Input Text    id=idNumber        ${national_id}
    Input Text    id=expiryDate    ${expiry_date}
    Choose File   id=selfieFile          ${selfie_img}
    Wait Until Element Is Visible
    ...    xpath=//label[contains(.,'ข้าพเจ้ายินยอมรับ')]//input[@type='checkbox']
    ...    10s

    Click Element
    ...    xpath=//label[contains(.,'ข้าพเจ้ายินยอมรับ')]//input[@type='checkbox']
    Click Button  xpath=//button[@type='submit']

    Wait Until Keyword Succeeds    20s    2s
    ...    Verify DB Status    ${EMAIL}    ${expected_status}    ${expected_verified}

    Run Keyword If    '${login_expect}' == 'LOGIN_SUCCESS'    Test Login Success
    Run Keyword If    '${login_expect}' == 'LOGIN_BLOCKED'    Test Login Blocked


Verify DB Status
    [Arguments]    ${email}    ${status}    ${verified}

    Execute Sql String    ROLLBACK;

    ${res}=    Query    SELECT "verificationStatus","isVerified","ocrVerificationStatus","ocrData" FROM "User" WHERE "email"='${email}';

    Should Not Be Empty    ${res}
    Should Be Equal    ${res[0][0]}    ${status}

    ${expected_bool}=    Convert To Boolean    ${verified}
    Should Be Equal    ${res[0][1]}    ${expected_bool}

    # log OCR fields for debugging
    ${ocrStatus}=    Set Variable    ${res[0][2]}
    ${ocrData}=      Set Variable    ${res[0][3]}
    Log To Console    >>> OCR status from DB: ${ocrStatus}
    Log To Console    >>> OCR data from DB: ${ocrData}

Test Login Success
    Go To    ${BASE_URL}/login
    Wait Until Element Is Visible    id=identifier    10s
    Input Text    id=identifier    ${CURRENT_EMAIL}
    Input Text    id=password      ${CURRENT_PASSWORD}
    Click Button  xpath=//button[@type='submit']

    Sleep    2s

    Go To    ${BASE_URL}/profile/verification

    Wait Until Element Is Visible
    ...    xpath=//span[contains(@class,'bg-emerald') and contains(normalize-space(.),'ยืนยันแล้ว')]
    ...    20s


Test Login Blocked
    Go To    ${BASE_URL}/login
    Wait Until Element Is Visible    id=identifier    10s
    Input Text    id=identifier       ${CURRENT_EMAIL}
    Input Text    id=password    ${CURRENT_PASSWORD}
    Click Button  xpath=//button[@type='submit']

    Sleep    2s

    Go To    ${BASE_URL}/profile/verification

    Wait Until Element Is Visible
    ...    xpath=//span[contains(@class,'bg-amber') and contains(normalize-space(.),'ยังไม่ยืนยัน')]
    ...    20s

Cleanup Test User
    Run Keyword And Ignore Error    Execute Sql String    ROLLBACK;

    Run Keyword If    '${CURRENT_EMAIL}' != '' and '${CURRENT_EMAIL}' != '${None}'
    ...    Execute Sql String
    ...    DELETE FROM "User" WHERE "email"='${CURRENT_EMAIL}';

    Execute Sql String    COMMIT;