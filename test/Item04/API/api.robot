*** Settings ***
Library           RequestsLibrary
Library           Collections
Library           String
Library           OperatingSystem
Library           DatabaseLibrary

Suite Setup       Setup Suite
Test Teardown     Cleanup Test User
Suite Teardown    Disconnect From Database


*** Variables ***
${BASE_URL}       https://cp353004-team2-5.onrender.com
${API_PREFIX}     /api/users
${PASSWORD}       Test1234!

${ID_OK}          ../UAT/register-verification/images/TC1/id.png
${SELFIE_OK}      ../UAT/register-verification/images/TC1/selfie.png
${SELFIE_FAIL}    ../UAT/register-verification/images/TC4/selfie.png

${TIMEOUT}        40s
${POLL_INTERVAL}  2s

${CURRENT_EMAIL}  ${EMPTY}

${DB_NAME}        painamnae
${DB_USER}        painamnae_user
${DB_PASSWORD}    Pr6fiVGTVGaAZrZsErYEfcvKmOb3efhW
${DB_HOST}        dpg-d668h26r433s73dd1h0g-a.singapore-postgres.render.com
${DB_PORT}        5432


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


Cleanup Test User
    Run Keyword And Ignore Error    Execute Sql String    ROLLBACK;

    Run Keyword If    '${CURRENT_EMAIL}' != '' and '${CURRENT_EMAIL}' != '${None}'
    ...    Execute Sql String
    ...    DELETE FROM "User" WHERE "email"='${CURRENT_EMAIL}';

    Run Keyword And Ignore Error    Execute Sql String    COMMIT;

    Set Suite Variable    ${CURRENT_EMAIL}    ${EMPTY}


Create Unique Email
    ${rand}=    Generate Random String    6    [LOWER]
    RETURN    test_${rand}@mail.com


Create Unique Username
    ${rand}=    Generate Random String    6    [LOWER]
    RETURN    user_${rand}


Create Unique National ID
    ${rand}=    Generate Random String    13    [NUMBERS]
    RETURN    ${rand}


Create Unique Phone Number
    ${rand}=    Generate Random String    8    [NUMBERS]
    RETURN    09${rand}


Register User
    [Arguments]    ${email}    ${nationalId}    ${expiry}    ${idPhotoPath}    ${selfiePath}

    Set Suite Variable    ${CURRENT_EMAIL}    ${email}

    ${username}=    Create Unique Username
    ${phone}=       Create Unique Phone Number

    ${body}=    Create Dictionary
    ...    email=${email}
    ...    username=${username}
    ...    password=${PASSWORD}
    ...    firstName=Test
    ...    lastName=User
    ...    phoneNumber=${phone}
    ...    gender=male
    ...    nationalIdNumber=${nationalId}
    ...    nationalIdExpiryDate=${expiry}

    ${files}=    Create Dictionary

    ${id_file}=    Get Binary File    ${idPhotoPath}
    ${id_tuple}=   Create List    id.png    ${id_file}    image/png
    Set To Dictionary    ${files}    nationalIdPhotoUrl=${id_tuple}

    ${selfie_file}=    Get Binary File    ${selfiePath}
    ${selfie_tuple}=   Create List    selfie.png    ${selfie_file}    image/png
    Set To Dictionary    ${files}    selfiePhotoUrl=${selfie_tuple}

    ${resp}=    POST On Session
    ...    api
    ...    ${API_PREFIX}
    ...    data=${body}
    ...    files=${files}
    ...    expected_status=any

    Should Be True    ${resp.status_code} in [200,201]

    RETURN    ${resp}


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

    Should Be Equal As Integers    ${resp.status_code}    200

    ${json}=    Set Variable    ${resp.json()}
    ${token}=   Set Variable    ${json['data']['token']}

    RETURN    ${token}


Get Verification
    [Arguments]    ${token}

    ${headers}=    Create Dictionary
    ...    Authorization=Bearer ${token}

    ${resp}=    GET On Session
    ...    api
    ...    /api/users/me
    ...    headers=${headers}
    ...    expected_status=any

    Should Be Equal As Integers    ${resp.status_code}    200

    ${json}=    Set Variable    ${resp.json()}
    RETURN    ${json['data']}


Verification Should Be
    [Arguments]    ${token}    ${expected}

    ${data}=    Get Verification    ${token}
    Should Be Equal    ${data['verificationStatus']}    ${expected}


Wait Until Verification Status Is
    [Arguments]    ${token}    ${expected}

    Wait Until Keyword Succeeds
    ...    ${TIMEOUT}
    ...    ${POLL_INTERVAL}
    ...    Verification Should Be
    ...    ${token}
    ...    ${expected}


*** Test Cases ***

TC1 OCR+Face OK = VERIFIED
    ${email}=    Create Unique Email
    Register User
    ...    ${email}
    ...    3411700830334
    ...    2025-03-21T00:00:00.000Z
    ...    ${ID_OK}
    ...    ${SELFIE_OK}

    ${token}=    Login User    ${email}
    Wait Until Verification Status Is    ${token}    VERIFIED


TC2 OCR mismatch = AUTO_REJECTED
    ${email}=    Create Unique Email
    ${nid}=      Create Unique National ID

    Register User
    ...    ${email}
    ...    ${nid}
    ...    2025-12-31T00:00:00.000Z
    ...    ${ID_OK}
    ...    ${SELFIE_OK}

    ${token}=    Login User    ${email}
    Wait Until Verification Status Is    ${token}    AUTO_REJECTED


TC3 Face mismatch = AUTO_REJECTED
    ${email}=    Create Unique Email
    ${nid}=      Create Unique National ID

    Register User
    ...    ${email}
    ...    ${nid}
    ...    2025-12-31T00:00:00.000Z
    ...    ${ID_OK}
    ...    ${SELFIE_FAIL}

    ${token}=    Login User    ${email}
    Wait Until Verification Status Is    ${token}    AUTO_REJECTED


TC4 Missing photos = 400
    ${email}=    Create Unique Email
    ${username}=    Create Unique Username
    ${nid}=         Create Unique National ID
    ${phone}=       Create Unique Phone Number

    ${body}=    Create Dictionary
    ...    email=${email}
    ...    username=${username}
    ...    password=${PASSWORD}
    ...    firstName=Test
    ...    lastName=User
    ...    phoneNumber=${phone}
    ...    gender=male
    ...    nationalIdNumber=${nid}
    ...    nationalIdExpiryDate=2025-12-31T00:00:00.000Z

    ${resp}=    POST On Session
    ...    api
    ...    ${API_PREFIX}
    ...    json=${body}
    ...    expected_status=400

    Should Be Equal As Integers    ${resp.status_code}    400


TC5 Login wrong password = fail
    ${email}=    Create Unique Email
    ${nid}=      Create Unique National ID

    Register User
    ...    ${email}
    ...    ${nid}
    ...    2025-12-31T00:00:00.000Z
    ...    ${ID_OK}
    ...    ${SELFIE_OK}

    ${body}=    Create Dictionary
    ...    identifier=${email}
    ...    password=WrongPassword

    ${resp}=    POST On Session
    ...    api
    ...    /api/auth/login
    ...    json=${body}
    ...    expected_status=any

    Should Be True    ${resp.status_code} in [400,401]