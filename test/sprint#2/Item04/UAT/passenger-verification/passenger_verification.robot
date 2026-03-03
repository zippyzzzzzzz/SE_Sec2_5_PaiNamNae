*** Settings ***
Library           RequestsLibrary
Library           Collections
Library           String
Library           OperatingSystem
Library           DatabaseLibrary

Suite Setup       Setup Suite
Test Teardown     Cleanup Test User
Suite Teardown    Disconnect From Database
Test Template     Execute Passenger Verification Case


*** Variables ***
${BASE_URL}                  https://cp353004-team2-5.onrender.com

${DB_NAME}        painamnae
${DB_USER}        painamnae_user
${DB_PASSWORD}    Pr6fiVGTVGaAZrZsErYEfcvKmOb3efhW
${DB_HOST}        dpg-d668h26r433s73dd1h0g-a.singapore-postgres.render.com
${DB_PORT}        5432

${USER_API_PREFIX}           /api/users
${PASSWORD}                  Test1234!
${TIMEOUT}                   60s
${POLL_INTERVAL}             3s
${CURRENT_EMAIL}  ${EMPTY}

${MATCH_NATIONAL_ID}         3411700830334
${MATCH_EXPIRY_DATE}         2025-03-21T00:00:00.000Z
${INVALID_EXPIRY_DATE}       2025-12-31T00:00:00.000Z

${TC1_CARD}                  ${CURDIR}/images/TC-1/TC-1_card.jpg
${TC1_SELFIE}                ${CURDIR}/images/TC-1/TC-1_selfie.jpg
${TC3_SELFIE}                ${CURDIR}/images/TC-3/TC-3_selfie.jpg


*** Test Cases ***
TC1 Face Match + Card Valid + OCR Match -> PASS
    PASS    MATCH    VALID    MATCH

TC2 Face Match + Card Invalid + OCR Match -> FAIL
    FAIL    MATCH    INVALID    MATCH

TC3 Face Mismatch + Card Valid + OCR Match -> FAIL
    FAIL    MISMATCH    VALID    MATCH

TC4 Face Match + Card Valid + OCR Mismatch -> FAIL
    FAIL    MATCH    VALID    MISMATCH

TC5 Face Match + Card Invalid + OCR Mismatch -> FAIL
    FAIL    MATCH    INVALID    MISMATCH

TC6 Face Mismatch + Card Valid + OCR Mismatch -> FAIL
    FAIL    MISMATCH    VALID    MISMATCH


*** Keywords ***

Setup Suite
    Create Session    api    ${BASE_URL}    verify=True

    Connect To Database
    ...    psycopg2
    ...    database=${DB_NAME}
    ...    user=${DB_USER}
    ...    password=${DB_PASSWORD}
    ...    host=${DB_HOST}
    ...    port=${DB_PORT}

Create Unique Email
    ${rand}=    Generate Random String    8    [LOWER]
    RETURN    passenger_${rand}@mail.com

Create Unique Username
    ${rand}=    Generate Random String    8    [LOWER]
    RETURN    passenger_${rand}

Create Unique Phone Number
    ${rand}=    Generate Random String    8    [NUMBERS]
    RETURN    09${rand}

Create Unique National ID
    ${nid}=    Generate Random String    13    [NUMBERS]
    IF    '${nid}' == '${MATCH_NATIONAL_ID}'
        ${nid}=    Generate Random String    13    [NUMBERS]
    END
    RETURN    ${nid}

Register Passenger User

    [Arguments]    ${email}    ${nationalId}    ${expiryDate}    ${cardPath}    ${selfiePath}
    
    Set Suite Variable    ${CURRENT_EMAIL}    ${email}
    
    ${username}=    Create Unique Username
    ${phone}=       Create Unique Phone Number

    ${body}=    Create Dictionary
    ...    email=${email}
    ...    username=${username}
    ...    password=${PASSWORD}
    ...    firstName=Robot
    ...    lastName=Passenger
    ...    phoneNumber=${phone}
    ...    gender=male
    ...    nationalIdNumber=${nationalId}
    ...    nationalIdExpiryDate=${expiryDate}

    ${files}=          Create Dictionary
    ${id_file}=        Get Binary File    ${cardPath}
    ${selfie_file}=    Get Binary File    ${selfiePath}

    ${id_tuple}=       Create List    id.jpg    ${id_file}    image/jpeg
    ${selfie_tuple}=   Create List    selfie.jpg    ${selfie_file}    image/jpeg
    Set To Dictionary    ${files}    nationalIdPhotoUrl=${id_tuple}
    Set To Dictionary    ${files}    selfiePhotoUrl=${selfie_tuple}

    ${resp}=    POST On Session
    ...    api
    ...    ${USER_API_PREFIX}
    ...    data=${body}
    ...    files=${files}
    ...    expected_status=any

    Log To Console    Register status: ${resp.status_code}
    RETURN    ${resp.status_code}

Login User
    [Arguments]    ${email}
    ${body}=    Create Dictionary
    ...    email=${email}
    ...    password=${PASSWORD}

    ${resp}=    POST On Session
    ...    api
    ...    /api/auth/login
    ...    json=${body}
    ...    expected_status=any

    Log To Console    Login status: ${resp.status_code}
    Should Be Equal As Integers    ${resp.status_code}    200

    ${json}=    Set Variable    ${resp.json()}
    RETURN    ${json['data']['token']}

Get Passenger Verification Status
    [Arguments]    ${token}
    ${headers}=    Create Dictionary
    ...    Authorization=Bearer ${token}

    ${resp}=    GET On Session
    ...    api
    ...    ${USER_API_PREFIX}/me
    ...    headers=${headers}
    ...    expected_status=any

    Should Be Equal As Integers    ${resp.status_code}    200
    ${json}=    Set Variable    ${resp.json()}
    RETURN    ${json['data']['verificationStatus']}

Verify Passenger Outcome
    [Arguments]    ${token}    ${expectedResult}
    ${status}=    Get Passenger Verification Status    ${token}
    Log To Console    Final passenger verification status: ${status}

    IF    '${expectedResult}' == 'PASS'
        Should Be Equal    ${status}    VERIFIED
    ELSE
        Should Not Be Equal    ${status}    VERIFIED
    END

Execute Passenger Verification Case
    [Arguments]    ${expectedResult}    ${faceMatch}    ${cardValidation}    ${ocrVsDb}
    ${email}=    Create Unique Email

    ${resolvedNid}=    Create Unique National ID
    IF    '${expectedResult}' == 'PASS' and '${ocrVsDb}' == 'MATCH'
        ${resolvedNid}=    Set Variable    ${MATCH_NATIONAL_ID}
    END

    ${resolvedExpiry}=    Set Variable    ${MATCH_EXPIRY_DATE}
    IF    '${cardValidation}' == 'INVALID'
        ${resolvedExpiry}=    Set Variable    ${INVALID_EXPIRY_DATE}
    END

    ${resolvedSelfie}=    Set Variable    ${TC1_SELFIE}
    IF    '${faceMatch}' == 'MISMATCH'
        ${resolvedSelfie}=    Set Variable    ${TC3_SELFIE}
    END

    ${registerStatus}=    Register Passenger User
    ...    ${email}
    ...    ${resolvedNid}
    ...    ${resolvedExpiry}
    ...    ${TC1_CARD}
    ...    ${resolvedSelfie}

    Should Be True    ${registerStatus} in [200,201]

    ${token}=    Login User    ${email}

    Wait Until Keyword Succeeds
    ...    ${TIMEOUT}
    ...    ${POLL_INTERVAL}
    ...    Verify Passenger Outcome
    ...    ${token}
    ...    ${expectedResult}


Cleanup Test User
    Run Keyword And Ignore Error    Execute Sql String    ROLLBACK;

    Run Keyword If    '${CURRENT_EMAIL}' != '' and '${CURRENT_EMAIL}' != '${None}'
    ...    Execute Sql String
    ...    DELETE FROM "User" WHERE "email"='${CURRENT_EMAIL}';

    Run Keyword And Ignore Error    Execute Sql String    COMMIT;

    Set Suite Variable    ${CURRENT_EMAIL}    ${EMPTY}