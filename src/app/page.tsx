// #include <ESP8266WiFi.h>
// #include <ESP8266WebServer.h>
// #include <ESP8266HTTPClient.h>
// #include <WiFiClientSecure.h> // For HTTPS
// #include <ArduinoJson.h>      // For JSON parsing
// #include <EEPROM.h>           // For ESP8266 internal EEPROM
// #include <Wire.h>             // For I2C (RTC, AT24C32)
// #include <RTClib.h>           // For DS1307 RTC
// #include <NTPClient.h>        // For Network Time Protocol
// #include <WiFiUdp.h>          // For NTP
// #include <math.h>             // For isnan()
// #include <ESP8266httpUpdate.h> // For handling the firmware download for OTA
// #include <DNSServer.h>
// #include <WiFiManager.h>      // For simplified WiFi setup

// // Compatibility for older ESP8266 core versions that may not have this defined.
// #ifndef UPDATE_SIZE_UNKNOWN
// #define UPDATE_SIZE_UNKNOWN 0xFFFFFFFF
// #endif

// // --- Pin Definitions ---
// const int TRIGGER_PIN = D1;     // Must be grounded to enable operation
// const int RELAY_PIN = D7;       // Activates RO system
// const int LITER_PIN = D1;       // Flow sensor input (internal pullup)
// const int BUZZER_PIN = D6;      // Buzzer pin
// const int RTC_SDA_PIN = D4;
// const int RTC_SCL_PIN = D3;

// // --- API & NETWORK CONFIGURATION ---
// const String RECHARGE_URL_BASE = "https://fwtq5pp3tbhmasdvxphfzeyzuq0ukowc.lambda-url.eu-north-1.on.aws/";
// const String SAVE_DATA_URL = "https://kpcb7jefuvxx7swlzn2lm24k5a0uxjfn.lambda-url.eu-north-1.on.aws/";
// const char* SECRET_KEY = "G7K3Z9P2LQ"; // IMPORTANT: This must match the SECRET_KEY in your Lambda environment variables.

// // Web server
// ESP8266WebServer server(80);
// bool isAdminLoggedIn = false;
// const char* adminPassword = "Birendra555@";

// // --- HTML for Web Updater Page ---
// const char* update_page_html = R"rawliteral(
// <!DOCTYPE html><html><head><title>ESP8266 Firmware Update</title>
// <meta name='viewport' content='width=device-width, initial-scale=1'>
// <style>body{font-family: Arial, sans-serif; margin: 20px; background-color: #f4f4f4; color: #333;} .container{background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1);} h1{color:#007bff;} form{margin-top:20px;} input[type='file']{display:block; margin-bottom:10px;} input[type='submit']{background-color:#007bff; color:white; border:none; padding:10px 15px; cursor:pointer; border-radius:4px;} input[type='submit']:hover{background-color:#0056b3;} .footer{margin-top:20px;} </style>
// </head><body><div class="container">
// <h1>Firmware Update</h1>
// <form method='POST' action='/doUpdate' enctype='multipart/form-data'>
//   <p>Select a .bin file to upload and update the firmware.</p>
//   <input type='file' name='update' accept='.bin' required>
//   <input type='submit' value='Update Firmware'>
// </form>
// <div class="footer"><a href='/'>Back to Status Page</a></div>
// </div></body></html>)rawliteral";

// const char* success_page_html = R"rawliteral(
// <!DOCTYPE html><html><head><title>Update Success</title><meta http-equiv='refresh' content='5;url=/' /><style>body{font-family: Arial, sans-serif; margin: 40px; background-color: #f4f4f4; text-align: center;} .container{background-color: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); display: inline-block;} h1{color:#28a745;} p{color:#333;}</style></head><body><div class='container'><h1>Update Successful!</h1><p>The device is now restarting with the new firmware.</p><p>You will be redirected automatically in 5 seconds.</p></div></body></html>)rawliteral";

// const char* fail_page_html = R"rawliteral(
// <!DOCTYPE html><html><head><title>Update Failed</title><style>body{font-family: Arial, sans-serif; margin: 40px; background-color: #f4f4f4; text-align: center;} .container{background-color: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); display: inline-block;} h1{color:#dc3545;} p{color:#333;} a{color:#007bff; text-decoration: none;}</style></head><body><div class='container'><h1>Update Failed!</h1><p>An error occurred. Please check the Serial Monitor for details.</p><p><a href='/update'>Try Again</a> or <a href='/'>Back to Status</a></p></div></body></html>)rawliteral";

// const char* setid_success_page_html = R"rawliteral(
// <!DOCTYPE html><html><head><title>Success</title><meta http-equiv='refresh' content='5;url=/' /><style>body{font-family: Arial, sans-serif; margin: 40px; background-color: #f4f4f4; text-align: center;} .container{background-color: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); display: inline-block;} h1{color:#28a745;} p{color:#333;}</style></head><body><div class='container'><h1>Action Successful!</h1><p>The new settings have been applied.</p><p>You will be redirected automatically in 5 seconds.</p></div></body></html>)rawliteral";

// const char* setid_fail_page_html = R"rawliteral(
// <!DOCTYPE html><html><head><title>Action Failed</title><style>body{font-family: Arial, sans-serif; margin: 40px; background-color: #f4f4f4; text-align: center;} .container{background-color: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); display: inline-block;} h1{color:#dc3545;} p{color:#333;} a{color:#007bff; text-decoration: none;}</style></head><body><div class='container'><h1>Action Failed!</h1><p>An error occurred. Please check the Serial Monitor for details.</p><p><a href='/'>Back to Status</a></p></div></body></html>)rawliteral";


// // RTC
// RTC_DS1307 rtc;

// // --- Liter Counting Logic (State Machine) ---
// enum LiterCountPhase {
//   LC_IDLE,
//   LC_TIMING_LOW,
//   LC_WAITING_FOR_HIGH,
//   LC_TIMING_HIGH
// };
// LiterCountPhase currentLiterPhase = LC_IDLE;
// unsigned long literPinLowStartTime = 0;
// unsigned long literPinHighStartTime = 0;
// const unsigned long LITER_HOLD_DURATION_MS = 3000; // 3 seconds

// // --- ESP EEPROM Configuration Data ---
// struct DeviceConfig {
//   char customerId[11];
//   char planEndDate[11];
//   float maxHours;
//   float maxLiters;
//   char wifi_ssid[33];
//   char wifi_pass[65];
//   uint32_t lastSyncUnixtime;
//   bool inErrorState;
//   bool initialConfigDone; // Flag to check if initial setup is done
// };
// DeviceConfig currentConfig;
// const int ESP_EEPROM_CONFIG_ADDR = 0;
// const int ESP_EEPROM_SIZE = sizeof(DeviceConfig) + 10;

// // --- AT24C32 External EEPROM Usage Data (Slot-based) ---
// struct UsageSlot {
//   float totalHours;
//   float totalLiters;
// };
// const int AT24C32_I2C_ADDR = 0x50;
// const int NUM_SLOTS = 10;
// const int SLOT_SIZE = sizeof(UsageSlot);
// int currentAt24c32SlotIndex = 0;

// // Global usage variables
// float currentTotalHours = 0.0;
// float currentTotalLiters = 0.0;

// // Timing for periodic saves
// unsigned long lastAT24C32SaveTime = 0;
// const long at24c32SaveInterval = 5 * 60 * 1000; // 5 minutes in ms

// // Relay state
// bool triggerPinActive = false;
// bool relayIsOn = false;
// unsigned long relayTurnOnUnixtime = 0;
// unsigned long relayLastTurnedOnMillis = 0;
// const unsigned long MIN_RELAY_ON_DURATION_MS = 2000;

// // NTP Client
// WiFiUDP ntpUDP;
// NTPClient timeClient(ntpUDP, "pool.ntp.org", 19800, 3600000);

// WiFiClientSecure clientSecure;

// // --- Sync & Mode Globals ---
// bool isInTestMode = false;
// const long PERIODIC_SYNC_INTERVAL_SECONDS = 1 * 24 * 3600;
// unsigned long lastSuccessfulNtpSyncUnixtime = 0;
// bool isSyncingNow = false;
// bool syncOnFirstConnect = false;

// // Sync status tracking for web display
// String lastSuccessfulSyncTimestamp = "Never";
// String lastSyncError = "None";
// String lastEspEepromConfigUpdateTime = "Never";
// String lastAt24c32UsageSaveTime = "Never";

// // --- Buzzer Alert Globals ---
// unsigned long lastBuzzerAlertSequenceStartTime = 0;
// const long EXPIRING_ALERT_INTERVAL_MS = 5 * 60 * 1000;
// const int BEEPS_FOR_EXPIRING = 3;

// enum BuzzerState { BZ_IDLE, BZ_BEEPING_ON, BZ_BEEPING_OFF };
// BuzzerState currentBuzzerState = BZ_IDLE;
// int beepCountRemaining = 0;
// unsigned long lastBeepStateChangeTime = 0;
// unsigned long beepOnDuration = 50;
// unsigned long beepOffDuration = 200;

// bool isConfigMode = false;

// // --- Function Prototypes ---
// void handleWiFiConnection();
// bool callRechargeFunction(String customerIdToRecharge);
// bool callSaveDataFunction(String customerIdForData, float hours, float liters);
// void readConfigFromESPEEPROM();
// void writeConfigToESPEEPROM();
// void readUsageFromAT24C32();
// void writeUsageToAT24C32(float hours, float liters);
// UsageSlot readSlotFromAT24C32(int slotIndex);
// void writeSlotToAT24C32(int slotIndex, UsageSlot data);
// void updateSystemStateAndRelay();
// String getFormattedDateTime(DateTime dt);
// String getFormattedDate(DateTime dt);
// int calculateRemainingDays(DateTime now, DateTime planEndDateObjWithTime);
// void handleRoot();
// void handleLogin();
// void handleLogout();
// void handleSetCustomerId();
// void handleNotFound();
// void syncNTPTime();
// void clearAT24C32Slots();
// void handleManualSync();
// void handleScanWiFi();
// void processLiterCounting();
// void playBeepSequence(int numBeeps);
// void manageActiveBeepSequence();
// void handleBuzzerAlerts();
// void performSync();
// bool isPlanExpired();
// void startConfigurationMode();
// void handleConfig();

// void setup() {
//   Serial.begin(9600);
//   delay(100);
//   Serial.println("\n--- DropPurity Device Booting (v3.3 - App Setup Enabled) ---");

//   pinMode(RELAY_PIN, OUTPUT);
//   digitalWrite(RELAY_PIN, LOW);
//   pinMode(TRIGGER_PIN, INPUT_PULLUP);
//   pinMode(LITER_PIN, INPUT_PULLUP);
//   pinMode(BUZZER_PIN, OUTPUT);
//   digitalWrite(BUZZER_PIN, LOW);

//   Wire.begin(RTC_SDA_PIN, RTC_SCL_PIN);
//   Wire.setClock(100000L);

//   EEPROM.begin(ESP_EEPROM_SIZE);
//   readConfigFromESPEEPROM();

//   if (!rtc.begin()) {
//     Serial.println("Couldn't find RTC! Check wiring.");
//   } else if (!rtc.isrunning()) {
//     Serial.println("RTC is NOT running!");
//   }

//   readUsageFromAT24C32();
//   clientSecure.setInsecure();
//   randomSeed(micros());

//   if (!currentConfig.initialConfigDone) {
//     startConfigurationMode();
//   } else {
//     WiFiManager wifiManager;
//     // wifiManager.setDebugOutput(true);
//     if (!wifiManager.autoConnect("AquaTrack-Setup")) {
//       Serial.println("failed to connect and hit timeout");
//       delay(3000);
//       ESP.restart(); //reset and try again
//     }

//     // If we get here, we are connected to WiFi
//     Serial.println("WiFi connected...yeey :)");
//     handleWiFiConnection();
//   }

//   server.on("/", HTTP_GET, handleRoot);
//   server.on("/login", HTTP_POST, handleLogin);
//   server.on("/logout", HTTP_GET, handleLogout);
//   server.on("/setid", HTTP_POST, handleSetCustomerId);
//   server.on("/manualsync", HTTP_POST, handleManualSync);
//   server.on("/scanwifi", HTTP_GET, handleScanWiFi);
//   server.on("/scanwifi", HTTP_POST, handleScanWiFi);
//   server.on("/config", HTTP_POST, handleConfig);

//   server.on("/update", HTTP_GET, []() {
//     if (!isAdminLoggedIn) { server.send(401, "text/plain", "Unauthorized"); return; }
//     server.send_P(200, "text/html", update_page_html);
//   });

//   server.on("/doUpdate", HTTP_POST, []() {
//     server.send(200, "text/html", Update.hasError() ? fail_page_html : success_page_html);
//     if (!Update.hasError()) {
//         delay(1000);
//         ESP.restart();
//     }
//   }, []() {
//     HTTPUpload& upload = server.upload();
//     if (upload.status == UPLOAD_FILE_START) {
//         Serial.setDebugOutput(true);
//         Serial.printf("Update: %s\n", upload.filename.c_str());
//         if (!Update.begin(UPDATE_SIZE_UNKNOWN)) {
//             Update.printError(Serial);
//         }
//     } else if (upload.status == UPLOAD_FILE_WRITE) {
//         if (Update.write(upload.buf, upload.currentSize) != upload.currentSize) {
//             Update.printError(Serial);
//         }
//     } else if (upload.status == UPLOAD_FILE_END) {
//         if (Update.end(true)) {
//             Serial.printf("Update Success: %u\nRebooting...\n", upload.totalSize);
//         } else {
//             Update.printError(Serial);
//         }
//         Serial.setDebugOutput(false);
//     }
//   });

//   server.onNotFound(handleNotFound);
//   server.begin();
//   Serial.println("HTTP server started.");

//   if (WiFi.status() == WL_CONNECTED) {
//       Serial.println("Setup complete. Checking initial plan status for boot sync.");
//       if ((isPlanExpired() || currentConfig.inErrorState) && !isInTestMode) {
//           if (currentConfig.inErrorState) {
//               Serial.println("Device is in an error state. Flagging for sync on first connect.");
//           } else {
//               Serial.println("Plan is already expired. Flagging for sync on first connect.");
//           }
//           syncOnFirstConnect = true;
//       } else {
//           Serial.println("Plan is active or in Test Mode. Normal periodic sync schedule will apply.");
//       }
//   }

//   Serial.println("Entering main loop.");
// }

// void startConfigurationMode() {
//   isConfigMode = true;
//   const char* apSsid = "AquaTrack-Setup";
//   WiFi.softAP(apSsid);
//   Serial.print("Entered Configuration Mode. AP created with SSID: ");
//   Serial.println(apSsid);
//   Serial.print("IP Address: ");
//   Serial.println(WiFi.softAPIP());
// }

// void handleConfig() {
//   if (!isConfigMode) {
//     server.send(403, "text/plain", "Not in config mode");
//     return;
//   }

//   if (!server.hasArg("plain")) {
//     server.send(400, "text/plain", "Body not provided");
//     return;
//   }

//   String body = server.arg("plain");
//   DynamicJsonDocument doc(1024);
//   DeserializationError error = deserializeJson(doc, body);

//   if (error) {
//     server.send(400, "text/plain", "JSON Parse Error");
//     return;
//   }

//   const char* ssid = doc["ssid"];
//   const char* password = doc["password"];
//   const char* customerId = doc["customerId"];

//   if (!ssid || !password || !customerId) {
//     server.send(400, "text/plain", "Missing fields in JSON");
//     return;
//   }

//   strlcpy(currentConfig.wifi_ssid, ssid, sizeof(currentConfig.wifi_ssid));
//   strlcpy(currentConfig.wifi_pass, password, sizeof(currentConfig.wifi_pass));
//   strlcpy(currentConfig.customerId, customerId, sizeof(currentConfig.customerId));
//   currentConfig.initialConfigDone = true;

//   writeConfigToESPEEPROM();

//   server.send(200, "application/json", "{\"status\":\"success\", \"message\":\"Configuration saved. Device will restart.\"}");

//   delay(1000);
//   ESP.restart();
// }


// void loop() {
//   if (isConfigMode) {
//     server.handleClient();
//     return;
//   }

//   handleWiFiConnection();
//   server.handleClient();
//   processLiterCounting();
//   handleBuzzerAlerts();

//   triggerPinActive = (digitalRead(TRIGGER_PIN) == LOW);
//   updateSystemStateAndRelay();

//   if (!isInTestMode && !isSyncingNow && rtc.isrunning()) {
//     if (WiFi.status() == WL_CONNECTED) {
//       if (!currentConfig.inErrorState) {
//         if (currentConfig.lastSyncUnixtime == 0 || (rtc.now().unixtime() > (currentConfig.lastSyncUnixtime + PERIODIC_SYNC_INTERVAL_SECONDS))) {
//           Serial.println("Periodic sync interval reached. Triggering sync.");
//           performSync();
//         }
//       }
//     }
//   }

//   if (relayIsOn && (millis() - lastAT24C32SaveTime > at24c32SaveInterval)) {
//     float hoursToSave = currentTotalHours;
//     if (rtc.isrunning() && relayTurnOnUnixtime > 0) {
//       unsigned long currentLoopUnixtime = rtc.now().unixtime();
//       if (currentLoopUnixtime >= relayTurnOnUnixtime) {
//         unsigned long currentOngoingDurationSeconds = currentLoopUnixtime - relayTurnOnUnixtime;
//         hoursToSave += (float)(currentOngoingDurationSeconds) / 3600.0;
//       }
//     }
//     writeUsageToAT24C32(hoursToSave, currentTotalLiters);
//     lastAT24C32SaveTime = millis();
//   }
//   delay(10);
// }

// void handleWiFiConnection() {
//   if (WiFi.status() == WL_CONNECTED) {
//     if (!timeClient.isTimeSet()) {
//       Serial.println("\nWiFi Connected. IP: " + WiFi.localIP().toString());
//       syncNTPTime();

//       if (syncOnFirstConnect) {
//         Serial.println("WiFi connected, performing initial sync for expired plan or error state.");
//         performSync();
//         syncOnFirstConnect = false;
//       }
//     }
//     return;
//   }
// }

// void performSync() {
//   if (isSyncingNow) {
//     Serial.println("Sync already in progress, skipping request.");
//     return;
//   }
//   isSyncingNow = true;
//   Serial.println("\n--- Initiating Sync Process ---");

//   if (WiFi.status() != WL_CONNECTED) {
//     Serial.println("\nSync Failed: WiFi is not connected.");
//     lastSyncError = "Sync Failed: WiFi Not Connected";
//     isSyncingNow = false;
//     return;
//   }

//   syncNTPTime();

//   if (strlen(currentConfig.customerId) == 0 || strcmp(currentConfig.customerId, "test12345") == 0) {
//     Serial.println("Sync skipped: Customer ID not set or in test mode.");
//     isSyncingNow = false;
//     return;
//   }

//   float hoursToReport = currentTotalHours;
//   if (relayIsOn && rtc.isrunning() && relayTurnOnUnixtime > 0) {
//     unsigned long currentApiCallUnixtime = rtc.now().unixtime();
//     if (currentApiCallUnixtime >= relayTurnOnUnixtime) {
//       hoursToReport += (float)(currentApiCallUnixtime - relayTurnOnUnixtime) / 3600.0;
//     }
//   }

//   bool saveDataSuccess = callSaveDataFunction(currentConfig.customerId, hoursToReport, currentTotalLiters);
//   bool rechargeSuccess = callRechargeFunction(currentConfig.customerId);

//   if (saveDataSuccess && rechargeSuccess) {
//     currentConfig.lastSyncUnixtime = rtc.now().unixtime();
//     writeConfigToESPEEPROM();
//     Serial.println("Sync successful. Updated sync timestamp.");
//   } else {
//     Serial.println("Sync failed. Sync timestamp not updated. Will retry on next interval if not in an error state.");
//   }

//   Serial.println("--- Sync Process Finished. ---");
//   isSyncingNow = false;
// }

// void processLiterCounting() {
//   bool pinIsLow = (digitalRead(LITER_PIN) == LOW);

//   switch (currentLiterPhase) {
//     case LC_IDLE:
//       if (pinIsLow) {
//         literPinLowStartTime = millis();
//         currentLiterPhase = LC_TIMING_LOW;
//       }
//       break;

//     case LC_TIMING_LOW:
//       if (pinIsLow) {
//         if (millis() - literPinLowStartTime >= LITER_HOLD_DURATION_MS) {
//           currentLiterPhase = LC_WAITING_FOR_HIGH;
//         }
//       } else {
//         currentLiterPhase = LC_IDLE;
//       }
//       break;

//     case LC_WAITING_FOR_HIGH:
//       if (!pinIsLow) {
//         literPinHighStartTime = millis();
//         currentLiterPhase = LC_TIMING_HIGH;
//       }
//       break;

//     case LC_TIMING_HIGH:
//       if (!pinIsLow) {
//         if (millis() - literPinHighStartTime >= LITER_HOLD_DURATION_MS) {
//           Serial.println("Liter Pin: HIGH for >= 3s after valid LOW. COUNTING 200ml.");
//           currentTotalLiters += 0.2;
//           Serial.print("New Total Liters: "); Serial.println(currentTotalLiters, 2);
//           currentLiterPhase = LC_IDLE;
//         }
//       } else {
//         currentLiterPhase = LC_IDLE;
//       }
//       break;
//   }
// }

// void playBeepSequence(int numBeeps) {
//   if (currentBuzzerState != BZ_IDLE) return;
//   beepCountRemaining = numBeeps;
//   currentBuzzerState = BZ_BEEPING_ON;
//   digitalWrite(BUZZER_PIN, HIGH);
//   lastBeepStateChangeTime = millis();
// }

// void manageActiveBeepSequence() {
//   if (beepCountRemaining == -1 && digitalRead(TRIGGER_PIN) == HIGH) {
//     currentBuzzerState = BZ_IDLE;
//     digitalWrite(BUZZER_PIN, LOW);
//     beepCountRemaining = 0;
//     return;
//   }
//   if (currentBuzzerState == BZ_IDLE) return;
//   if (currentBuzzerState == BZ_BEEPING_ON) {
//     if (millis() - lastBeepStateChangeTime >= beepOnDuration) {
//       digitalWrite(BUZZER_PIN, LOW);
//       currentBuzzerState = BZ_BEEPING_OFF;
//       lastBeepStateChangeTime = millis();
//       if (beepCountRemaining > 0) beepCountRemaining--;
//       if (beepCountRemaining == 0) currentBuzzerState = BZ_IDLE;
//     }
//   } else if (currentBuzzerState == BZ_BEEPING_OFF) {
//     if (millis() - lastBeepStateChangeTime >= beepOffDuration) {
//       if (beepCountRemaining != 0) {
//         currentBuzzerState = BZ_BEEPING_ON;
//         digitalWrite(BUZZER_PIN, HIGH);
//         lastBeepStateChangeTime = millis();
//       } else {
//         currentBuzzerState = BZ_IDLE;
//       }
//     }
//   }
// }

// void handleBuzzerAlerts() {
//   manageActiveBeepSequence();
//   if (currentBuzzerState != BZ_IDLE || !triggerPinActive || !rtc.isrunning()) return;

//   if (isPlanExpired()) {
//     beepOnDuration = 50; beepOffDuration = 150;
//     playBeepSequence(-1);
//   } else {
//     int daysLeft = 999;
//     int eYear = 0, eMonth = 0, eDay = 0;
//     if (sscanf(currentConfig.planEndDate, "%d-%d-%d", &eYear, &eMonth, &eDay) == 3) {
//       DateTime planEndDateObj(eYear, eMonth, eDay, 23, 59, 59);
//       daysLeft = calculateRemainingDays(rtc.now(), planEndDateObj);
//     }
//     if (daysLeft >= 1 && daysLeft <= 3) {
//       if (millis() - lastBuzzerAlertSequenceStartTime >= EXPIRING_ALERT_INTERVAL_MS) {
//         beepOnDuration = 150; beepOffDuration = 200;
//         playBeepSequence(BEEPS_FOR_EXPIRING);
//         lastBuzzerAlertSequenceStartTime = millis();
//       }
//     }
//   }
// }

// void syncNTPTime() {
//   if (WiFi.status() != WL_CONNECTED) {
//     Serial.println("NTP Sync: WiFi not connected."); return;
//   }
//   timeClient.begin();
//   if (timeClient.forceUpdate()) {
//     unsigned long epochTime = timeClient.getEpochTime();
//     lastSuccessfulNtpSyncUnixtime = epochTime;
//     if (!rtc.isrunning() || abs((long)epochTime - (long)rtc.now().unixtime()) > 5) {
//       rtc.adjust(DateTime(epochTime));
//       Serial.println("RTC time calibrated with NTP.");
//     }
//   } else {
//     Serial.println("Failed to update time from NTP server.");
//   }
// }

// bool callRechargeFunction(String customerIdToRecharge) {
//   HTTPClient http;
//   String url = RECHARGE_URL_BASE + "?customerId=" + customerIdToRecharge;
//   Serial.println("\n--- Calling Recharge Function (Get Limits) ---");
//   Serial.print("Requesting URL: "); Serial.println(url);

//   if (!http.begin(clientSecure, url)) {
//     Serial.println("HTTPClient.begin() failed for Recharge.");
//     lastSyncError = "Recharge: HTTPClient.begin() failed.";
//     return false;
//   }

//   http.addHeader("Authorization", "Bearer " + String(SECRET_KEY));
//   int httpCode = http.GET();
//   String payload = http.getString();
//   http.end();
//   Serial.print("HTTP Response Code: "); Serial.println(httpCode);
//   Serial.println("Response Payload: " + payload);

//   if (httpCode != HTTP_CODE_OK) {
//     if (httpCode == HTTP_CODE_NOT_FOUND) {
//         lastSyncError = "Recharge failed: Customer ID not found.";
//         currentConfig.inErrorState = true;
//         writeConfigToESPEEPROM(); // Persist the error state
//     } else {
//         lastSyncError = "Recharge API failed: HTTP " + String(httpCode);
//     }
//     Serial.println(lastSyncError);
//     return false;
//   }

//   if (currentConfig.inErrorState) {
//     Serial.println("Successful API response. Clearing device error state.");
//     currentConfig.inErrorState = false;
//   }

//   DynamicJsonDocument doc(512);
//   DeserializationError error = deserializeJson(doc, payload);
//   if (error) {
//     Serial.print(F("deserializeJson() failed: ")); Serial.println(error.f_str());
//     lastSyncError = "Recharge: JSON Parse Error";
//     return false;
//   }

//   float newMaxHours = doc["maxHours"] | 0.0f;
//   float newMaxLiters = doc["maxTotalLiters"] | 0.0f;
//   String planEndDateStr = doc["planEndDate"] | "0000-00-00";
//   char newPlanEndDate[11];
//   strlcpy(newPlanEndDate, planEndDateStr.substring(0, 10).c_str(), sizeof(newPlanEndDate));

//   bool configUpdated = false;
//   if (fabs(newMaxHours - currentConfig.maxHours) > 0.01 ||
//       fabs(newMaxLiters - currentConfig.maxLiters) > 0.01 ||
//       strcmp(newPlanEndDate, currentConfig.planEndDate) != 0 ||
//       currentConfig.inErrorState) {
//     configUpdated = true;
//   }

//   if (strcmp(newPlanEndDate, currentConfig.planEndDate) != 0 && strcmp(newPlanEndDate, "0000-00-00") != 0) {
//     Serial.println("New plan date detected. Resetting usage counters.");
//     currentTotalHours = 0.0f;
//     currentTotalLiters = 0.0f;
//     clearAT24C32Slots();
//   }

//   if (configUpdated) {
//     Serial.println("Server data differs, error state was active, or plan was reset. Applying updates.");
//     currentConfig.maxHours = newMaxHours;
//     currentConfig.maxLiters = newMaxLiters;
//     strlcpy(currentConfig.planEndDate, newPlanEndDate, sizeof(currentConfig.planEndDate));
//     currentConfig.inErrorState = false;
//     writeConfigToESPEEPROM();
//   } else {
//     Serial.println("Plan limits from server match local config. No update needed.");
//   }

//   lastSuccessfulSyncTimestamp = getFormattedDateTime(rtc.now());
//   lastSyncError = "None";
//   return true;
// }

// bool callSaveDataFunction(String customerIdForData, float hours, float liters) {
//   HTTPClient http;
//   Serial.println("\n--- Calling SaveData Function (Report Usage) ---");

//   if (!http.begin(clientSecure, SAVE_DATA_URL)) {
//     Serial.println("HTTPClient.begin() failed for SaveData.");
//     lastSyncError = "SaveData: HTTPClient.begin() failed.";
//     return false;
//   }

//   http.addHeader("Content-Type", "application/json");
//   http.addHeader("Authorization", "Bearer " + String(SECRET_KEY));

//   DynamicJsonDocument doc(256);
//   doc["customerId"] = customerIdForData;
//   doc["totalHours"] = hours;
//   doc["totalLiters"] = liters;
//   if (rtc.isrunning()) doc["deviceTimestamp"] = rtc.now().timestamp(DateTime::TIMESTAMP_FULL);
//   String requestBody;
//   serializeJson(doc, requestBody);
//   Serial.print("Request Body: "); Serial.println(requestBody);

//   int httpCode = http.POST(requestBody);
//   String payload = http.getString();
//   http.end();
//   Serial.print("HTTP Response Code: "); Serial.println(httpCode);
//   Serial.println("Response Payload: " + payload);

//   if (httpCode == 200 || httpCode == 201) {
//     Serial.println("SaveData successful.");
//     return true;
//   } else {
//     lastSyncError = "SaveData API non-success: HTTP " + String(httpCode);
//     Serial.println(lastSyncError);
//     return false;
//   }
// }

// void readConfigFromESPEEPROM() {
//   Serial.println("Reading config from ESP EEPROM...");
//   EEPROM.get(ESP_EEPROM_CONFIG_ADDR, currentConfig);

//   currentConfig.customerId[sizeof(currentConfig.customerId) - 1] = '\0';
//   currentConfig.planEndDate[sizeof(currentConfig.planEndDate) - 1] = '\0';
//   currentConfig.wifi_ssid[sizeof(currentConfig.wifi_ssid) - 1] = '\0';
//   currentConfig.wifi_pass[sizeof(currentConfig.wifi_pass) - 1] = '\0';

//   bool isUninitialized = (currentConfig.customerId[0] == (char)0xFF || currentConfig.customerId[0] == '\0' || !currentConfig.initialConfigDone);
//   if (isUninitialized) {
//     Serial.println("ESP EEPROM seems uninitialized or setup not completed. Setting to Test Mode defaults.");
//     strlcpy(currentConfig.customerId, "test12345", sizeof(currentConfig.customerId));
//     strlcpy(currentConfig.planEndDate, "2099-12-31", sizeof(currentConfig.planEndDate));
//     currentConfig.maxHours = 10.0f; currentConfig.maxLiters = 100.0f;
//     strlcpy(currentConfig.wifi_ssid, "", sizeof(currentConfig.wifi_ssid));
//     strlcpy(currentConfig.wifi_pass, "", sizeof(currentConfig.wifi_pass));
//     currentConfig.lastSyncUnixtime = 0; currentConfig.inErrorState = false;
//     currentConfig.initialConfigDone = false;
//     writeConfigToESPEEPROM();
//   }
//   if (currentConfig.lastSyncUnixtime > 0) lastSuccessfulSyncTimestamp = getFormattedDateTime(DateTime(currentConfig.lastSyncUnixtime));
//   isInTestMode = (strcmp(currentConfig.customerId, "test12345") == 0);
//   Serial.println(isInTestMode ? "DEVICE IS IN OFFLINE TEST MODE." : "DEVICE IS IN NORMAL MODE.");
//   Serial.print("Loaded Customer ID: ["); Serial.print(currentConfig.customerId); Serial.println("]");
//   Serial.print("Loaded Error State: "); Serial.println(currentConfig.inErrorState ? "TRUE" : "FALSE");
// }

// void writeConfigToESPEEPROM() {
//   Serial.println("Writing config to ESP EEPROM...");
//   EEPROM.put(ESP_EEPROM_CONFIG_ADDR, currentConfig);
//   if (EEPROM.commit()) {
//     Serial.println("ESP EEPROM successfully committed.");
//     if (rtc.isrunning()) {
//       lastEspEepromConfigUpdateTime = getFormattedDateTime(rtc.now());
//     }
//   } else {
//     Serial.println("ERROR! ESP EEPROM commit failed.");
//     lastEspEepromConfigUpdateTime = "Commit Failed";
//   }
// }

// UsageSlot readSlotFromAT24C32(int slotIndex) {
//   UsageSlot slotData = {0.0f, 0.0f}; int address = slotIndex * SLOT_SIZE; byte buffer[SLOT_SIZE];
//   Wire.beginTransmission(AT24C32_I2C_ADDR); Wire.write((byte)(address >> 8)); Wire.write((byte)(address & 0xFF));
//   if (Wire.endTransmission() != 0) return slotData;
//   if (Wire.requestFrom(AT24C32_I2C_ADDR, SLOT_SIZE) == SLOT_SIZE) {
//     for (int i = 0; i < SLOT_SIZE; i++) buffer[i] = Wire.read();
//     memcpy(&slotData, buffer, SLOT_SIZE);
//   }
//   return slotData;
// }

// void writeSlotToAT24C32(int slotIndex, UsageSlot slotData) {
//   int address = slotIndex * SLOT_SIZE; byte buffer[SLOT_SIZE];
//   memcpy(buffer, &slotData, SLOT_SIZE);
//   Wire.beginTransmission(AT24C32_I2C_ADDR); Wire.write((byte)(address >> 8)); Wire.write((byte)(address & 0xFF));
//   Wire.write(buffer, SLOT_SIZE);
//   if (Wire.endTransmission() == 0) {
//     delay(5);
//     if (rtc.isrunning()) {
//       lastAt24c32UsageSaveTime = getFormattedDateTime(rtc.now());
//     } else {
//       lastAt24c32UsageSaveTime = "RTC not set";
//     }
//   } else {
//     lastAt24c32UsageSaveTime = "Write Failed";
//   }
// }

// void readUsageFromAT24C32() {
//   Serial.println("Reading usage from AT24C32 EEPROM...");
//   float highestHours = -1.0f; int latestSlot = -1;
//   for (int i = 0; i < NUM_SLOTS; i++) {
//     UsageSlot tempSlot = readSlotFromAT24C32(i);
//     if (!isnan(tempSlot.totalHours) && tempSlot.totalHours >= highestHours) {
//       highestHours = tempSlot.totalHours; latestSlot = i;
//     }
//   }
//   if (latestSlot != -1) {
//     UsageSlot latestUsage = readSlotFromAT24C32(latestSlot);
//     currentTotalHours = latestUsage.totalHours; currentTotalLiters = latestUsage.totalLiters;
//     currentAt24c32SlotIndex = (latestSlot + 1) % NUM_SLOTS;
//     Serial.print("Loaded usage from AT24C32 slot "); Serial.print(latestSlot); Serial.print(" -> Hours: "); Serial.print(currentTotalHours); Serial.print(", Liters: "); Serial.println(currentTotalLiters);
//   } else {
//     Serial.println("No valid usage data found. Initializing usage to 0.");
//     currentTotalHours = 0.0; currentTotalLiters = 0.0; currentAt24c32SlotIndex = 0;
//   }
// }

// void writeUsageToAT24C32(float hours, float liters) {
//   UsageSlot currentUsageData = {hours, liters};
//   writeSlotToAT24C32(currentAt24c32SlotIndex, currentUsageData);
//   currentAt24c32SlotIndex = (currentAt24c32SlotIndex + 1) % NUM_SLOTS;
// }

// bool isPlanExpired() {
//   if (currentConfig.maxHours <= 0.0) return true;
//   if (currentConfig.maxLiters <= 0.0) return true;

//   if (rtc.isrunning()) {
//     int year, month, day;
//     if (sscanf(currentConfig.planEndDate, "%d-%d-%d", &year, &month, &day) == 3) {
//       DateTime planEndDateObj(year, month, day, 23, 59, 59);
//       if (rtc.now().unixtime() > planEndDateObj.unixtime()) {
//         return true;
//       }
//     }
//   }

//   float effectiveCurrentHours = currentTotalHours;
//   if (relayIsOn && rtc.isrunning() && relayTurnOnUnixtime > 0) {
//     unsigned long tempCurrentUnixtime = rtc.now().unixtime();
//     if (tempCurrentUnixtime >= relayTurnOnUnixtime) {
//       effectiveCurrentHours += (float)(tempCurrentUnixtime - relayTurnOnUnixtime) / 3600.0;
//     }
//   }

//   if (effectiveCurrentHours >= currentConfig.maxHours) return true;
//   if (currentTotalLiters >= currentConfig.maxLiters) return true;

//   return false;
// }

// void updateSystemStateAndRelay() {
//   bool operationAllowed = !currentConfig.inErrorState && triggerPinActive && !isPlanExpired();
//   bool shouldBeOn = operationAllowed;

//   if (shouldBeOn && !relayIsOn) {
//       digitalWrite(RELAY_PIN, HIGH);
//       relayIsOn = true;
//       relayLastTurnedOnMillis = millis();
//       if (rtc.isrunning()) relayTurnOnUnixtime = rtc.now().unixtime();
//       else relayTurnOnUnixtime = 0;
//       Serial.println(rtc.isrunning() ? "Relay turned ON." : "Relay ON, RTC not running.");
//   }
//   else if (!shouldBeOn && relayIsOn) {
//       if (millis() - relayLastTurnedOnMillis >= MIN_RELAY_ON_DURATION_MS) {
//           digitalWrite(RELAY_PIN, LOW);
//           relayIsOn = false;

//           if (rtc.isrunning() && relayTurnOnUnixtime > 0) {
//             unsigned long unixtimeAtOff = rtc.now().unixtime();
//             if (unixtimeAtOff >= relayTurnOnUnixtime) {
//               unsigned long durationSeconds = unixtimeAtOff - relayTurnOnUnixtime;
//               currentTotalHours += (float)durationSeconds / 3600.0;
//               Serial.print("Relay OFF. New Total Hours: "); Serial.println(currentTotalHours);
//               writeUsageToAT24C32(currentTotalHours, currentTotalLiters);
//             } else {
//                  Serial.println("Relay OFF. RTC time error detected, usage not saved.");
//             }
//           } else {
//             Serial.println("Relay OFF. Hours not updated (RTC error or not running). Final usage not saved.");
//           }
//           relayTurnOnUnixtime = 0;
//       }
//   }
// }

// String getFormattedDateTime(DateTime dt) {
//   if (!dt.isValid()) return "Invalid DateTime";
//   char buf[25];
//   sprintf(buf, "%04d-%02d-%02d %02d:%02d:%02d", dt.year(), dt.month(), dt.day(), dt.hour(), dt.minute(), dt.second());
//   return String(buf);
// }
// String getFormattedDate(DateTime dt) {
//   if (!dt.isValid()) return "Invalid Date";
//   char buf[11];
//   sprintf(buf, "%04d-%02d-%02d", dt.year(), dt.month(), dt.day());
//   return String(buf);
// }

// int calculateRemainingDays(DateTime now, DateTime planEndDateObjWithTime) {
//   if (now.unixtime() > planEndDateObjWithTime.unixtime()) {
//     TimeSpan diff = now - planEndDateObjWithTime;
//     return -diff.days();
//   }
//   DateTime todayAtStart = DateTime(now.year(), now.month(), now.day());
//   DateTime expiryDayAtStart = DateTime(planEndDateObjWithTime.year(), planEndDateObjWithTime.month(), planEndDateObjWithTime.day());
//   TimeSpan ts = expiryDayAtStart - todayAtStart;
//   return ts.days() + 1;
// }

// void handleRoot() {
//   server.setContentLength(CONTENT_LENGTH_UNKNOWN);
//   server.send(200, "text/html", "");
//   String header = "<!DOCTYPE html><html><head><title>DropPurity Status</title><meta name='viewport' content='width=device-width, initial-scale=1'><style>body{font-family: Arial, sans-serif; margin: 20px; background-color: #f4f4f4; color: #333;} .container{background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1);} h1{color:#007bff; text-align: center;} table{width:100%; border-collapse:collapse; margin-top: 20px;} td,th{padding:10px; border:1px solid #ddd; text-align:left;} .status-ok{color:green; font-weight:bold;} .status-limit{color:red; font-weight:bold;} .status-warning{color:orange; font-weight:bold;} a{text-decoration:none; color:#007bff;} form{margin-top:15px;} input[type='password'], input[type='text'], input[type='submit'], button{padding:8px; margin-right:5px; border:1px solid #ccc; border-radius:4px;} input[type='submit'], button{background-color:#007bff; color:white; border:none; cursor:pointer;} input[type='submit']:hover, button:hover{background-color:#0056b3;}</style></head><body><div class='container'><h1>DropPurity Device Status</h1><table>";
//   server.sendContent(header);
//   String modeText, modeClass;
//   if (currentConfig.inErrorState) { modeText = "ERROR (Customer Not Found)"; modeClass = "status-limit"; }
//   else if (isInTestMode) { modeText = "TEST MODE"; modeClass = "status-warning"; }
//   else { modeText = "NORMAL MODE"; modeClass = "status-ok"; }
//   server.sendContent("<tr><td>Device Mode:</td><td class='" + modeClass + "'>" + modeText + "</td></tr>");
//   DateTime now = rtc.now();
//   server.sendContent("<tr><td>Device Time (RTC):</td><td>" + (rtc.isrunning() ? getFormattedDateTime(now) : String("<span class='status-limit'>RTC NOT SET/RUNNING</span>")) + "</td></tr>");
//   server.sendContent("<tr><td>Customer ID:</td><td>" + String(currentConfig.customerId) + "</td></tr>");
//   float displayHours = currentTotalHours;
//   if (relayIsOn && rtc.isrunning() && relayTurnOnUnixtime > 0) {
//     unsigned long currentUnixtime = now.unixtime();
//     if (currentUnixtime >= relayTurnOnUnixtime) displayHours += (float)(currentUnixtime - relayTurnOnUnixtime) / 3600.0;
//   }
//   char displayHoursStr[15], maxHoursStr[15];
//   dtostrf(displayHours, 4, 2, displayHoursStr); dtostrf(currentConfig.maxHours, 4, 2, maxHoursStr);
//   server.sendContent("<tr><td>Total Hours Used:</td><td>" + String(displayHoursStr) + " / " + String(maxHoursStr) + " hrs</td></tr>");
//   char currentLitersStr[15], maxLitersStr[15];
//   dtostrf(currentTotalLiters, 4, 2, currentLitersStr); dtostrf(currentConfig.maxLiters, 4, 2, maxLitersStr);
//   server.sendContent("<tr><td>Total Liters Used:</td><td>" + String(currentLitersStr) + " / " + String(maxLitersStr) + " L</td></tr>");
//   server.sendContent("<tr><td>Plan End Date:</td><td>" + String(currentConfig.planEndDate) + "</td></tr>");
//   int daysLeft = 999;
//   if (rtc.isrunning()) { int eYear=0, eMonth=0, eDay=0; if(sscanf(currentConfig.planEndDate, "%d-%d-%d", &eYear, &eMonth, &eDay) == 3) { DateTime planEndDateObj(eYear, eMonth, eDay, 23, 59, 59); daysLeft = calculateRemainingDays(now, planEndDateObj); } }
//   String remainingDaysDisplay = daysLeft < 0 ? "0 (Expired)" : String(daysLeft);
//   String remainingDaysClass = daysLeft < 0 ? "status-limit" : (daysLeft <= 3 ? "status-warning" : "status-ok");
//   server.sendContent("<tr><td>Remaining Plan Days:</td><td class='" + remainingDaysClass + "'>" + remainingDaysDisplay + "</td></tr>");
//   server.sendContent("<tr><td>TRIGGER_PIN (D1):</td><td class='" + String(triggerPinActive ? "status-ok" : "status-limit") + "'>" + String(triggerPinActive ? "LOW (Enabled)" : "HIGH (Disabled)") + "</td></tr>");
//   server.sendContent("<tr><td>Relay Status:</td><td class='" + String(relayIsOn ? "status-ok" : "status-limit") + "'>" + String(relayIsOn ? "ON" : "OFF") + "</td></tr>");
//   String wifiStatusText = WiFi.status() == WL_CONNECTED ? "<span class='status-ok'>Connected</span> (" + WiFi.localIP().toString() + ")" : "<span class='status-warning'>Connecting...</span>";
//   server.sendContent("<tr><td>WiFi Status:</td><td>" + wifiStatusText + "</td></tr>");

//   String savedSSID = strlen(currentConfig.wifi_ssid) > 0 ? String(currentConfig.wifi_ssid) : "Not Set";
//   String savedPass = strlen(currentConfig.wifi_pass) > 0 ? "********" : "Not Set";
//   server.sendContent("<tr><td>Saved WiFi SSID:</td><td>" + savedSSID + "</td></tr>");
//   server.sendContent("<tr><td>Saved WiFi Pass:</td><td>" + savedPass + "</td></tr>");

//   server.sendContent("<tr><td>Last Successful Sync:</td><td>" + lastSuccessfulSyncTimestamp + "</td></tr>");

//   String nextSyncDateStr = "N/A (Test Mode)";
//   if (!isInTestMode && rtc.isrunning()) {
//     if (currentConfig.lastSyncUnixtime > 0) {
//       unsigned long nextSyncUnixtime = currentConfig.lastSyncUnixtime + PERIODIC_SYNC_INTERVAL_SECONDS;
//       nextSyncDateStr = getFormattedDateTime(DateTime(nextSyncUnixtime));
//     } else {
//       nextSyncDateStr = "After first successful sync";
//     }
//   } else if (!rtc.isrunning()) {
//     nextSyncDateStr = "N/A (RTC not set)";
//   }
//   server.sendContent("<tr><td>Next Scheduled Sync:</td><td>" + nextSyncDateStr + "</td></tr>");

//   server.sendContent("<tr><td>Last Sync Error:</td><td>" + lastSyncError + "</td></tr>");
//   server.sendContent("<tr><td>Last NTP Sync:</td><td>" + (lastSuccessfulNtpSyncUnixtime > 0 ? getFormattedDateTime(DateTime(lastSuccessfulNtpSyncUnixtime)) : "Never") + "</td></tr>");
//   server.sendContent("<tr><td>Last ESP Config Save:</td><td>" + lastEspEepromConfigUpdateTime + "</td></tr>");
//   server.sendContent("<tr><td>Last Usage Data Save (AT24C32):</td><td>" + lastAt24c32UsageSaveTime + "</td></tr>");
//   server.sendContent("</table>");

//   String adminSection = "";
//   if (isAdminLoggedIn) {
//     adminSection += "<p><b>Admin Logged In.</b> <a href='/logout'>Logout</a></p>";
//     adminSection += "<h3>Set Customer ID</h3><form method='POST' action='/setid'><label for='customerIdInput'>New Customer ID:</label><input type='text' id='customerIdInput' name='id' required placeholder='e.g., JH09d01301' style='width: 200px;'><button type='submit'>Set ID</button></form>";
//     adminSection += "<form action='/manualsync' method='POST' style='margin-top: 10px;'><button type='submit'>Sync with Server Now</button></form>";
//     adminSection += "<h3>Configure WiFi</h3><p><a href='/scanwifi'>Scan for WiFi Networks & Connect</a></p>";
//     adminSection += "<h3>Firmware Update</h3><p><a href='/update'>Upload New Firmware</a></p>";
//   } else {
//     adminSection += "<h2>Admin Login</h2>";
//     if (server.hasArg("login_error")) adminSection += "<p style='color:red; font-weight:bold;'>Incorrect password. Please try again.</p>";
//     adminSection += "<form action='/login' method='POST'><label for='password'>Password:</label><input type='password' id='password' name='password' required><input type='submit' value='Login'></form>";
//   }
//   server.sendContent(adminSection);
//   server.sendContent("</div></body></html>");
//   server.sendContent("");
// }


// void handleScanWiFi() {
//   if (!isAdminLoggedIn) { server.send(401, "text/plain", "Unauthorized"); return; }

//   if (server.method() == HTTP_POST) {
//       if (server.hasArg("ssid")) {
//           strlcpy(currentConfig.wifi_ssid, server.arg("ssid").c_str(), sizeof(currentConfig.wifi_ssid));
//           strlcpy(currentConfig.wifi_pass, server.arg("pass").c_str(), sizeof(currentConfig.wifi_pass));
//           writeConfigToESPEEPROM();
//           server.send(200, "text/html", "<h1>WiFi Saved.</h1><p>You may need to manually reconnect the device to the new network if it doesn't connect automatically.</p><p><a href='/'>Back to Status</a></p><meta http-equiv='refresh' content='4;url=/' />");
//           return;
//       }
//   }

//   String html = R"rawliteral(
// <!DOCTYPE html><html><head><title>WiFi Scan</title>
// <meta name='viewport' content='width=device-width, initial-scale=1.0'>
// <style>
//   body{font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; color: #333;}
//   .container{background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); max-width: 800px; margin: auto;}
//   h1{color:#007bff; text-align: center;}
//   .btn{background-color:#007bff; color:white; border:none; padding:10px 15px; cursor:pointer; border-radius:4px; text-decoration: none; display: inline-block; margin: 5px 0;}
//   .btn:hover{background-color:#0056b3;}
//   .btn-secondary{background-color: #6c757d;}.btn-secondary:hover{background-color: #5a6268;}
//   .network-list{list-style: none; padding: 0;}
//   .network-item{padding: 15px; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 10px; cursor: pointer; transition: background-color 0.2s;}
//   .network-item:hover{background-color: #f0f0f0;}
//   .network-item.selected{background-color: #e0efff; border-color: #007bff;}
//   .form-group{margin-top: 15px;}
//   label{display:block; margin-bottom: 5px; font-weight: bold;}
//   input[type='password'],input[type='text']{width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;}
//   .hidden{display: none;}
// </style>
// <script>
//   function selectSsid(ssid) {
//     document.querySelectorAll('.network-item').forEach(item => item.classList.remove('selected'));
//     document.getElementById('ssid-' + ssid.replace(/[^a-zA-Z0-9]/g, ''))?.classList.add('selected');
//     document.getElementById('ssid_input').value = ssid;
//     document.getElementById('wifi_form').classList.remove('hidden');
//     document.getElementById('password_input').focus();
//   }
// </script>
// </head><body><div class="container">
// <h1>Available WiFi Networks</h1>
// <div style='text-align:center; margin-bottom: 20px;'>
//   <a href='/scanwifi' class='btn'>Refresh Scan</a>
//   <a href='/' class='btn btn-secondary'>Back to Status</a>
// </div>
// )rawliteral";

//   int n = WiFi.scanNetworks();
//   if (n == 0) {
//     html += "<p>No networks found. Try refreshing, or enter manually below.</p>";
//   } else {
//     html += "<ul class='network-list'>";
//     for (int i = 0; i < n; ++i) {
//       String ssid = WiFi.SSID(i);
//       String safeSsid = ssid;
//       safeSsid.replace("'", "&#39;");
//       safeSsid.replace("\"", "&quot;");

//       String safeId = ssid;
//       safeId.replace("'", ""); safeId.replace("\"", ""); safeId.replace(" ", "");

//       html += "<li class='network-item' id='ssid-" + safeId + "' onclick='selectSsid(\"" + safeSsid + "\")'>";
//       html += "<strong>" + ssid + "</strong><br>";
//       html += "<small>Signal: " + String(WiFi.RSSI(i)) + " dBm | " + (WiFi.encryptionType(i) == ENC_TYPE_NONE ? "Open" : "Encrypted") + "</small>";
//       html += "</li>";
//     }
//     html += "</ul>";
//   }

//   html += R"rawliteral(
// <form id='wifi_form' action='/scanwifi' method='POST'>
//   <div class='form-group'>
//     <label for='ssid_input'>Network Name (SSID)</label>
//     <input type='text' id='ssid_input' name='ssid' placeholder='Enter SSID manually or click a network above' style='background-color:#fff;'>
//   </div>
//   <div class='form-group'>
//     <label for='password_input'>Password</label>
//     <input type='password' id='password_input' name='pass' placeholder='Enter password if required'>
//   </div>
//   <div class='form-group'>
//     <button type='submit' class='btn'>Connect & Save</button>
//   </div>
// </form>
// </div></body></html>
// )rawliteral";
//   server.send(200, "text/html", html);
// }


// void handleLogin() {
//   if (server.hasArg("password") && server.arg("password") == adminPassword) {
//     isAdminLoggedIn = true;
//     server.sendHeader("Location", "/", true);
//     server.send(302, "text/plain", "");
//   } else {
//     server.sendHeader("Location", "/?login_error=1", true);
//     server.send(302, "text/plain", "");
//   }
// }

// void handleLogout() {
//   isAdminLoggedIn = false;
//   server.sendHeader("Location", "/", true);
//   server.send(302, "text/plain", "");
// }

// void handleSetCustomerId() {
//   if (!isAdminLoggedIn) { server.send(401, "text/plain", "Unauthorized"); return; }
//   if (server.hasArg("id")) {
//     String newCustomerId = server.arg("id");
//     if (newCustomerId.length() > 0 && newCustomerId.length() < sizeof(currentConfig.customerId)) {
//       if (newCustomerId.compareTo(currentConfig.customerId) != 0) {
//         Serial.println("New Customer ID detected. Resetting device usage and state.");
//         strlcpy(currentConfig.customerId, newCustomerId.c_str(), sizeof(currentConfig.customerId));
//         currentTotalHours = 0.0f;
//         currentTotalLiters = 0.0f;
//         clearAT24C32Slots();
//         currentConfig.inErrorState = false;
//         writeConfigToESPEEPROM();
//         performSync();
//         server.send(200, "text/html", setid_success_page_html);
//       } else {
//         Serial.println("Customer ID is the same. No action taken.");
//         server.sendHeader("Location", "/", true);
//         server.send(302, "text/plain", "");
//       }
//     } else {
//       server.send(200, "text/html", setid_fail_page_html);
//     }
//   } else {
//     server.send(200, "text/html", setid_fail_page_html);
//   }
// }

// void handleManualSync() {
//   if (!isAdminLoggedIn) { server.send(401, "text/plain", "Unauthorized"); return; }
//   if (isInTestMode) {
//     server.send(200, "text/html", "<h1>Action Blocked</h1><p>Cannot sync in Test Mode. Set a customer ID first.</p><p><a href='/'>Go back</a></p>");
//     return;
//   }
//   performSync();
//   server.sendHeader("Location", "/", true);
//   server.send(302, "text/plain", "");
// }

// void clearAT24C32Slots() {
//   Serial.println("Clearing all AT24C32 slots...");
//   UsageSlot emptySlot = {0.0f, 0.0f};
//   for (int i = 0; i < NUM_SLOTS; i++) {
//     writeSlotToAT24C32(i, emptySlot);
//   }
//   currentAt24c32SlotIndex = 0;
//   currentTotalHours = 0.0;
//   currentTotalLiters = 0.0;
// }

// void handleNotFound() {
//   server.send(404, "text/plain", "404: Not Found");
// }
"use client";

import type { FC } from 'react';
import { useState } from 'react';
import { useRoData } from '@/hooks/use-ro-data';
import { Header } from '@/components/layout/header';
import { BottomNav } from '@/components/layout/bottom-nav';
import { HomeTab } from '@/components/tabs/home-tab';
import { AnalyticsTab } from '@/components/tabs/analytics-tab';
import { SettingsTab } from '@/components/tabs/settings-tab';
import { ProfileTab } from '@/components/tabs/profile-tab';
import { Skeleton } from '@/components/ui/skeleton';

const AppSkeleton: FC = () => (
  <div className="p-4 space-y-4">
    <Skeleton className="h-20 w-full" />
    <Skeleton className="h-28 w-full" />
    <div className="grid grid-cols-2 gap-4">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
    <Skeleton className="h-40 w-full" />
    <Skeleton className="h-32 w-full" />
  </div>
);

export default function Home() {
  const [activeTab, setActiveTab] = useState('home');
  const roData = useRoData();

  const renderTab = () => {
    if (roData.isInitialLoading) {
      return <AppSkeleton />;
    }
    switch (activeTab) {
      case 'home':
        return <HomeTab {...roData} />;
      case 'analytics':
        return <AnalyticsTab {...roData} />;
      case 'settings':
        return <SettingsTab {...roData} />;
      case 'profile':
        return <ProfileTab {...roData} />;
      default:
        return <HomeTab {...roData} />;
    }
  };

  return (
    <div className="max-w-md mx-auto bg-background min-h-screen font-body">
      <Header notificationCount={roData.notifications.length} />
      <main className="pb-24">
        {renderTab()}
      </main>
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
