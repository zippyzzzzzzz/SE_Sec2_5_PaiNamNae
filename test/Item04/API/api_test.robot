*** Settings ***
Library           RequestsLibrary
Library           Collections

Suite Setup       Create API Session

*** Variables ***
${BASE_URL}       http://localhost:3000
${API_PREFIX}     /api
${PASSWORD}       Test1234!

*** Keywords ***

Create API Session
    Create Session    api    ${BASE_URL}

Register User
    [Arguments]    ${email}
    ${body}=    Create Dictionary
    ...    email=${email}
    ...    password=${PASSWORD}
    ...    firstName=Test
    ...    lastName=User
    ...    phoneNumber=0999999999
    ${resp}=    POST On Session
    ...    api
    ...    ${API_PREFIX}/register
    ...    json=${body}
    Should Be True    ${resp.status_code} in [200,201]
    RETURN    ${resp}

Login User
    [Arguments]    ${email}
    ${body}=    Create Dictionary
    ...    identifier=${email}
    ...    password=${PASSWORD}
    ${resp}=    POST On Session
    ...    api
    ...    ${API_PREFIX}/login
    ...    json=${body}
    Should Be Equal As Integers    ${resp.status_code}    200
    RETURN    ${resp.json()['token']}

Get Verification
    [Arguments]    ${token}
    ${headers}=    Create Dictionary
    ...    Authorization=Bearer ${token}
    ${resp}=    GET On Session
    ...    api
    ...    ${API_PREFIX}/profile/verification
    ...    headers=${headers}
    Should Be Equal As Integers    ${resp.status_code}    200
    RETURN    ${resp.json()}

Create Unique Email
    ${rand}=    Generate Random String    6    [LOWER]
    RETURN    test_${rand}@mail.com


*** Test Cases ***

TC1 High Confidence - Should Be Approved
    ${email}=    Create Unique Email
    Register User    ${email}
    ${token}=    Login User    ${email}
    ${data}=     Get Verification    ${token}
    Log To Console    ${data}
    Should Be Equal    ${data['verificationStatus']}    APPROVED


TC2 Medium Confidence - Should Be Pending
    ${email}=    Create Unique Email
    Register User    ${email}
    ${token}=    Login User    ${email}
    ${data}=     Get Verification    ${token}
    Should Be Equal    ${data['verificationStatus']}    PENDING


TC3 Low Confidence - Should Be Rejected
    ${email}=    Create Unique Email
    Register User    ${email}
    ${token}=    Login User    ${email}
    ${data}=     Get Verification    ${token}
    Should Be Equal    ${data['verificationStatus']}    REJECTED


TC4 Login With Wrong Password - Should Fail
    ${email}=    Create Unique Email
    Register User    ${email}

    ${body}=    Create Dictionary
    ...    identifier=${email}
    ...    password=WrongPassword

    ${resp}=    POST On Session
    ...    api
    ...    ${API_PREFIX}/login
    ...    json=${body}

    Should Be True    ${resp.status_code} in [400,401]