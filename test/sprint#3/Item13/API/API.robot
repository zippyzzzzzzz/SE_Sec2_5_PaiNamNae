*** Settings ***
Library           RequestsLibrary
Library           Collections
Library           OperatingSystem

*** Variables ***
${API_BASE}                 https://cp353004-team2-5.onrender.com/api
${API_LOGIN}                ${API_BASE}/auth/login
${API_VEHICLES}             ${API_BASE}/vehicles
${API_ROUTES}               ${API_BASE}/routes
${API_BOOKINGS}             ${API_BASE}/bookings
${API_REPORTS}              ${API_BASE}/reports
${CATEGORY}                 INAPPROPRIATE_BEHAVIOR
${REPORT_TOPIC}             Driver behavior after trip
${REPORT_DESC}              Passenger reports unsafe driving and rude language.
${CONTACT_FIRST}            Test
${CONTACT_LAST}             Passenger
${CONTACT_PHONE}            0800000002
${CONTACT_EMAIL}            passenger@example.com
${DRIVER_USER}              driver
${DRIVER_PASS}              Admin1234!
${PASSENGER_USER}           passenger
${PASSENGER_PASS}           Admin1234!
${REPORT_IMAGE_1}           ${CURDIR}/ImageForTest/image1.png
${REPORT_IMAGE_2}           ${CURDIR}/ImageForTest/image2.png
${REPORT_VIDEO}             ${CURDIR}/VideoForTest/Video1.mp4
${PICKUP_LAT}               13.7563
${PICKUP_LNG}               100.5018
${DROPOFF_LAT}              13.7460
${DROPOFF_LNG}              100.5231
${PRICE_PER_SEAT}           150
${SEATS}                    1

*** Test Cases ***
Passenger_Reports_Driver_After_Completed_Trip
    ${driver_token}    ${driver_id}=    API Login And Get Token And ID    ${DRIVER_USER}    ${DRIVER_PASS}
    ${pass_token}      ${passenger_id}=    API Login And Get Token And ID    ${PASSENGER_USER}    ${PASSENGER_PASS}

    ${route_id}=    Create Route Ready For Booking    ${driver_token}
    ${booking_id}=    Create Booking For Route    ${route_id}    ${pass_token}

    Confirm Booking As Driver    ${booking_id}    ${driver_token}
    Finish Trip As Driver        ${booking_id}    ${driver_token}
    Finish Trip As Passenger     ${booking_id}    ${pass_token}

    Verify Can Report Booking    ${booking_id}    ${pass_token}
    ${report_id}=    Create Report With Media    ${booking_id}    ${pass_token}
    Validate Report Retrieved    ${report_id}    ${pass_token}

*** Keywords ***
API Login And Get Token And ID
    [Arguments]    ${user_input}    ${password}
    ${is_email}=    Evaluate    "@" in "${user_input}"
    ${body}=    Run Keyword If    ${is_email}    Create Dictionary    email=${user_input}    password=${password}
    ...    ELSE    Create Dictionary    username=${user_input}    password=${password}
    ${resp}=    POST    url=${API_LOGIN}    json=${body}    expected_status=any
    Should Be Equal As Integers    ${resp.status_code}    200
    ${json}=    Set Variable    ${resp.json()}
    ${token}=   Get From Dictionary    ${json['data']}    token
    ${u_id}=    Get From Dictionary    ${json['data']['user']}    id
    RETURN    ${token}    ${u_id}

Create Route Ready For Booking
    [Arguments]    ${driver_token}
    ${vehicle_id}=    Get Driver Default Vehicle Id    ${driver_token}
    ${depart}=    Evaluate    (__import__('datetime').datetime.utcnow().__add__(__import__('datetime').timedelta(minutes=5))).isoformat() + "Z"
    
    ${start_loc}=    Evaluate    {"lat": float(${PICKUP_LAT}), "lng": float(${PICKUP_LNG}), "address": "Pickup Point"}
    ${end_loc}=      Evaluate    {"lat": float(${DROPOFF_LAT}), "lng": float(${DROPOFF_LNG}), "address": "Dropoff Point"}
    
    ${seats_int}=    Convert To Integer    ${SEATS}
    ${price_int}=    Convert To Integer    ${PRICE_PER_SEAT}
    
    ${payload}=    Create Dictionary    vehicleId=${vehicle_id}    startLocation=${start_loc}    endLocation=${end_loc}    departureTime=${depart}    availableSeats=${seats_int}    pricePerSeat=${price_int}    routeSummary=Test route for reporting flow
    ${headers}=    Create Dictionary    Authorization=Bearer ${driver_token}
    
    ${resp}=    POST    url=${API_ROUTES}    headers=${headers}    json=${payload}    expected_status=any
    Run Keyword If    ${resp.status_code} != 201    Log To Console    \n[DEBUG ERROR] POST /routes:\n${resp.text}\n
    Should Be Equal As Integers    ${resp.status_code}    201
    
    ${json}=    Set Variable    ${resp.json()}
    ${route_id}=    Get From Dictionary    ${json['data']}    id
    RETURN    ${route_id}

Get Driver Default Vehicle Id
    [Arguments]    ${driver_token}
    ${headers}=    Create Dictionary    Authorization=Bearer ${driver_token}
    ${resp}=    GET    url=${API_VEHICLES}    headers=${headers}
    Should Be Equal As Integers    ${resp.status_code}    200
    ${vehicles}=    Set Variable    ${resp.json()['data']}
    Should Not Be Empty    ${vehicles}
    ${first}=    Get From List    ${vehicles}    0
    ${vehicle_id}=    Get From Dictionary    ${first}    id
    RETURN    ${vehicle_id}

Create Booking For Route
    [Arguments]    ${route_id}    ${passenger_token}
    ${pickup}=    Evaluate    {"lat": float(${PICKUP_LAT}), "lng": float(${PICKUP_LNG}), "address": "Pickup Point"}
    ${dropoff}=   Evaluate    {"lat": float(${DROPOFF_LAT}), "lng": float(${DROPOFF_LNG}), "address": "Dropoff Point"}
    
    ${seats_int}=    Convert To Integer    ${SEATS}
    
    ${payload}=   Create Dictionary    routeId=${route_id}    numberOfSeats=${seats_int}    pickupLocation=${pickup}    dropoffLocation=${dropoff}
    ${headers}=   Create Dictionary    Authorization=Bearer ${passenger_token}
    
    ${resp}=      POST    url=${API_BOOKINGS}    headers=${headers}    json=${payload}    expected_status=any
    Run Keyword If    ${resp.status_code} != 201    Log To Console    \n[DEBUG ERROR] POST /bookings:\n${resp.text}\n
    Should Be Equal As Integers    ${resp.status_code}    201
    
    ${json}=      Set Variable    ${resp.json()}
    ${booking_id}=    Get From Dictionary    ${json['data']}    id
    RETURN    ${booking_id}

Confirm Booking As Driver
    [Arguments]    ${booking_id}    ${driver_token}
    ${payload}=    Create Dictionary    status=CONFIRMED
    ${headers}=    Create Dictionary    Authorization=Bearer ${driver_token}
    ${resp}=      PATCH    url=${API_BOOKINGS}/${booking_id}/status    headers=${headers}    json=${payload}
    Should Be Equal As Integers    ${resp.status_code}    200

Finish Trip As Driver
    [Arguments]    ${booking_id}    ${driver_token}
    ${headers}=    Create Dictionary    Authorization=Bearer ${driver_token}
    ${resp}=      PATCH    url=${API_BOOKINGS}/${booking_id}/finish    headers=${headers}
    Should Be Equal As Integers    ${resp.status_code}    200

Finish Trip As Passenger
    [Arguments]    ${booking_id}    ${passenger_token}
    ${headers}=    Create Dictionary    Authorization=Bearer ${passenger_token}
    ${resp}=      PATCH    url=${API_BOOKINGS}/${booking_id}/finish    headers=${headers}
    Should Be Equal As Integers    ${resp.status_code}    200

Verify Can Report Booking
    [Arguments]    ${booking_id}    ${passenger_token}
    ${headers}=    Create Dictionary    Authorization=Bearer ${passenger_token}
    ${resp}=      GET    url=${API_REPORTS}/check-can-report/${booking_id}    headers=${headers}
    Should Be Equal As Integers    ${resp.status_code}    200
    ${json}=      Set Variable    ${resp.json()['data']}
    ${can_report}=    Get From Dictionary    ${json}    canReport
    Should Be True    ${can_report}

Create Report With Media
    [Arguments]    ${booking_id}    ${passenger_token}
    ${headers}=    Create Dictionary    Authorization=Bearer ${passenger_token}
    ${form}=    Create Dictionary    bookingId=${booking_id}    category=${CATEGORY}    reportTopic=${REPORT_TOPIC}    reportDescription=${REPORT_DESC}    contactFirstName=${CONTACT_FIRST}    contactLastName=${CONTACT_LAST}    contactPhoneNumber=${CONTACT_PHONE}    contactEmail=${CONTACT_EMAIL}
    
    ${file_data}=    Get Binary File    ${REPORT_VIDEO}
    
    ${file_tuple}=   Evaluate    ('video1.mp4', $file_data, 'video/mp4')
    
    ${files}=    Create Dictionary    media=${file_tuple}

    ${resp}=    POST    url=${API_REPORTS}    headers=${headers}    data=${form}    files=${files}    expected_status=any
    
    Run Keyword If    ${resp.status_code} != 201    Log To Console    \n[DEBUG ERROR] POST /reports:\n${resp.text}\n
    Should Be Equal As Integers    ${resp.status_code}    201
    
    ${json}=    Set Variable    ${resp.json()}
    ${report_id}=    Get From Dictionary    ${json['data']}    id
    RETURN    ${report_id}

Validate Report Retrieved
    [Arguments]    ${report_id}    ${passenger_token}
    ${headers}=    Create Dictionary    Authorization=Bearer ${passenger_token}
    ${resp}=    GET    url=${API_REPORTS}/${report_id}    headers=${headers}
    Should Be Equal As Integers    ${resp.status_code}    200
    ${json}=    Set Variable    ${resp.json()['data']}
    Should Be Equal    ${report_id}    ${json['id']}
    Should Be Equal    ${CATEGORY}    ${json['category']}