*** Settings ***
Library           RequestsLibrary
Library           Collections
Library           String
Library           OperatingSystem

Suite Setup       Initialize Driver Verification Suite
Test Template     Execute Driver Verification Case


*** Variables ***
${BASE_URL}                  https://cp353004-team2-5.onrender.com
${USER_API_PREFIX}           /api/users
${DRIVER_API_PREFIX}         /api/driver-verifications
${PASSWORD}                  Test1234!
${TIMEOUT}                   45s
${POLL_INTERVAL}             3s

${REG_ID_CARD}               ${CURDIR}/../passenger-verification/images/TC-1/TC-1_card.jpg
${REG_SELFIE}                ${CURDIR}/../passenger-verification/images/TC-1/TC-1_selfie.jpg
${REGISTER_EXPIRY_DATE}      2031-08-11T00:00:00.000Z

${RANDOM_MATCH_TOKEN}        __RANDOM_MATCH_LICENSE__
${RANDOM_MISMATCH_TOKEN}     __RANDOM_MISMATCH_LICENSE__
${GOOD_LICENSE_EXPIRY_DATE}  2026-07-13T00:00:00.000Z
${BAD_LICENSE_EXPIRY_DATE}   2025-12-31T00:00:00.000Z

${TC1_CARD}                  ${CURDIR}/TC-1/TC-1_licensecard.jpg
${TC1_SELFIE}                ${CURDIR}/TC-1/TC-1_selfie.jpg
${TC2_CARD}                  ${CURDIR}/TC-2/TC-2_licensecard.jpg
${TC2_SELFIE}                ${CURDIR}/TC-2/TC-2_selfie.jpg
${TC3_CARD}                  ${CURDIR}/TC-3/TC-3_licensecard.jpg
${TC3_SELFIE}                ${CURDIR}/TC-3/TC-3_selfie.jpg
${TC4_CARD}                  ${CURDIR}/TC-4/TC-4_licensecard.JPG
${TC4_SELFIE}                ${CURDIR}/TC-4/TC-4_selfie.jpg
${TC5_CARD}                  ${CURDIR}/TC-5/IMG_0311.JPG
${TC5_SELFIE}                ${CURDIR}/TC-5/TC-5_selfie.jpg
${TC6_CARD}                  ${CURDIR}/TC-6/TC-6_licensecard.JPG
${TC6_SELFIE}                ${CURDIR}/TC-6/TC-6_selfie.jpg


*** Test Cases ***
TC1 Face Match + Card Valid + OCR Match -> PASS
    PASS    ${RANDOM_MATCH_TOKEN}      ${GOOD_LICENSE_EXPIRY_DATE}    ${TC1_CARD}    ${TC1_SELFIE}

TC2 Face Match + Card Invalid + OCR Match -> FAIL
    FAIL    ${RANDOM_MATCH_TOKEN}      ${GOOD_LICENSE_EXPIRY_DATE}    ${TC2_CARD}    ${TC2_SELFIE}

TC3 Face Mismatch + Card Valid + OCR Match -> FAIL
    FAIL    ${RANDOM_MATCH_TOKEN}      ${GOOD_LICENSE_EXPIRY_DATE}    ${TC3_CARD}    ${TC3_SELFIE}

TC4 Face Match + Card Valid + OCR Mismatch -> FAIL
    FAIL    ${RANDOM_MISMATCH_TOKEN}   ${BAD_LICENSE_EXPIRY_DATE}    ${TC4_CARD}    ${TC6_SELFIE}

TC5 Face Match + Card Invalid + OCR Mismatch -> FAIL
    FAIL    ${RANDOM_MISMATCH_TOKEN}   ${BAD_LICENSE_EXPIRY_DATE}    ${TC5_CARD}    ${TC5_SELFIE}

TC6 Face Mismatch + Card Valid + OCR Mismatch -> FAIL
    FAIL    ${RANDOM_MISMATCH_TOKEN}   ${BAD_LICENSE_EXPIRY_DATE}    ${TC6_CARD}    ${TC6_SELFIE}


*** Keywords ***
Create API Session
    Create Session    api    ${BASE_URL}

Initialize Driver Verification Suite
    Create API Session
    ${email}=    Create Unique Email
    Register Driver Candidate User    ${email}
    ${token}=    Login User    ${email}
    ${matchLicense}=       Create Unique License Number
    ${mismatchLicense}=    Create Unique License Number
    IF    '${matchLicense}' == '${mismatchLicense}'
        ${mismatchLicense}=    Create Unique License Number
    END
    Set Suite Variable    ${SUITE_DRIVER_EMAIL}    ${email}
    Set Suite Variable    ${SUITE_DRIVER_TOKEN}    ${token}
    Set Suite Variable    ${SUITE_MATCH_LICENSE_NUMBER}       ${matchLicense}
    Set Suite Variable    ${SUITE_MISMATCH_LICENSE_NUMBER}    ${mismatchLicense}

Create Unique Email
    ${rand}=    Generate Random String    8    [LOWER]
    RETURN    driver_${rand}@mail.com

Create Unique Username
    ${rand}=    Generate Random String    8    [LOWER]
    RETURN    driver_${rand}

Create Unique Phone Number
    ${rand}=    Generate Random String    8    [NUMBERS]
    RETURN    09${rand}

Create Unique National ID
    ${rand}=    Generate Random String    13    [NUMBERS]
    RETURN    ${rand}

Create Unique License Number
    ${rand}=    Generate Random String    8    [NUMBERS]
    RETURN    ${rand}

Register Driver Candidate User
    [Arguments]    ${email}
    ${username}=    Create Unique Username
    ${phone}=       Create Unique Phone Number
    ${nationalId}=  Create Unique National ID

    ${body}=    Create Dictionary
    ...    email=${email}
    ...    username=${username}
    ...    password=${PASSWORD}
    ...    firstName=Robot
    ...    lastName=Driver
    ...    phoneNumber=${phone}
    ...    gender=female
    ...    nationalIdNumber=${nationalId}
    ...    nationalIdExpiryDate=${REGISTER_EXPIRY_DATE}

    ${files}=          Create Dictionary
    ${id_file}=        Get Binary File    ${REG_ID_CARD}
    ${selfie_file}=    Get Binary File    ${REG_SELFIE}

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
    Should Be True    ${resp.status_code} in [200,201]

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

Submit Driver Verification
    [Arguments]    ${token}    ${licenseNumber}    ${licenseExpiryDate}    ${licenseCardPath}    ${selfiePath}
    ${headers}=    Create Dictionary
    ...    Authorization=Bearer ${token}

    ${body}=    Create Dictionary
    ...    licenseNumber=${licenseNumber}
    ...    firstNameOnLicense=Sasithon
    ...    lastNameOnLicense=Namjaingam
    ...    typeOnLicense=PRIVATE_CAR
    ...    licenseIssueDate=2021-06-13T00:00:00.000Z
    ...    licenseExpiryDate=${licenseExpiryDate}

    ${files}=          Create Dictionary
    ${license_file}=   Get Binary File    ${licenseCardPath}
    ${selfie_file}=    Get Binary File    ${selfiePath}

    ${license_tuple}=  Create List    license.jpg    ${license_file}    image/jpeg
    ${selfie_tuple}=   Create List    selfie.jpg    ${selfie_file}    image/jpeg
    Set To Dictionary    ${files}    licensePhotoUrl=${license_tuple}
    Set To Dictionary    ${files}    selfiePhotoUrl=${selfie_tuple}

    ${resp}=    POST On Session
    ...    api
    ...    ${DRIVER_API_PREFIX}
    ...    headers=${headers}
    ...    data=${body}
    ...    files=${files}
    ...    expected_status=any

    Log To Console    Driver verification submit status: ${resp.status_code}
    Should Be Equal As Integers    ${resp.status_code}    201

Get Driver Verification Status
    [Arguments]    ${token}
    ${headers}=    Create Dictionary
    ...    Authorization=Bearer ${token}

    ${resp}=    GET On Session
    ...    api
    ...    ${DRIVER_API_PREFIX}/me
    ...    headers=${headers}
    ...    expected_status=any

    Should Be Equal As Integers    ${resp.status_code}    200
    ${json}=    Set Variable    ${resp.json()}
    Dictionary Should Contain Key    ${json}    data
    Should Not Be Equal    ${json['data']}    ${None}
    RETURN    ${json['data']['status']}

Verify Driver Outcome
    [Arguments]    ${token}    ${expectedResult}
    ${status}=    Get Driver Verification Status    ${token}
    Log To Console    Final driver verification status: ${status}

    IF    '${expectedResult}' == 'PASS'
        Should Be Equal    ${status}    APPROVED
    ELSE
        Should Not Be Equal    ${status}    APPROVED
    END

Execute Driver Verification Case
    [Arguments]    ${expectedResult}    ${licenseNumber}    ${licenseExpiryDate}    ${licenseCardPath}    ${selfiePath}
    ${resolvedLicenseNumber}=    Set Variable    ${licenseNumber}
    IF    '${licenseNumber}' == '${RANDOM_MATCH_TOKEN}'
        ${resolvedLicenseNumber}=    Set Variable    ${SUITE_MATCH_LICENSE_NUMBER}
    ELSE IF    '${licenseNumber}' == '${RANDOM_MISMATCH_TOKEN}'
        ${resolvedLicenseNumber}=    Set Variable    ${SUITE_MISMATCH_LICENSE_NUMBER}
    END

    Submit Driver Verification    ${SUITE_DRIVER_TOKEN}    ${resolvedLicenseNumber}    ${licenseExpiryDate}    ${licenseCardPath}    ${selfiePath}

    Wait Until Keyword Succeeds
    ...    ${TIMEOUT}
    ...    ${POLL_INTERVAL}
    ...    Verify Driver Outcome
    ...    ${SUITE_DRIVER_TOKEN}
    ...    ${expectedResult}
