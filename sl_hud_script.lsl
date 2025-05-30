// Enhanced Second Life HUD Script for Data Bridge
// Place this script in a HUD prim and attach to your avatar

string gHttpInURL = "";
string gWebPageURL = "";
integer gListenHandle;
integer gChannel = 42; // Change this to a unique channel

// Statistics
integer gMessagesSent = 0;
integer gMessagesReceived = 0;
float gStartTime;

default
{
    state_entry()
    {
        gStartTime = llGetTime();
        
        // Request HTTP-in URL for receiving data from web page
        llRequestURL();
        
        // Listen for local chat commands
        gListenHandle = llListen(gChannel, "", llGetOwner(), "");
        
        // Set up the HUD
        setupHUD();
        
        llOwnerSay("SL Data Bridge HUD initialized. Requesting HTTP URL...");
    }
    
    http_request(key request_id, string method, string body)
    {
        if (method == URL_REQUEST_GRANTED)
        {
            gHttpInURL = body;
            llOwnerSay("HTTP-in URL granted: " + gHttpInURL);
            
            // Create the web page URL with the SL URL as parameter
            gWebPageURL = "https://websim.com/@api/second-life-data-bridge?slurl=" + 
                         llEscapeURL(gHttpInURL);
            
            // Set up media on the HUD face
            setupMedia();
        }
        else if (method == URL_REQUEST_DENIED)
        {
            llOwnerSay("HTTP-in URL request denied: " + body);
            llOwnerSay("Retrying in 10 seconds...");
            llSetTimerEvent(10.0);
        }
        else if (method == "GET" || method == "POST")
        {
            // Data received from web page
            handleWebData(request_id, body);
        }
    }
    
    setupHUD()
    {
        // Set HUD properties
        llSetText("SL Data Bridge\nInitializing...", <1,1,1>, 1.0);
        
        // Set HUD to always face user
        llSetStatus(STATUS_BLOCK_GRAB, TRUE);
        llSetStatus(STATUS_BLOCK_GRAB_OBJECT, TRUE);
    }
    
    setupMedia()
    {
        // Configure media on face 0
        list mediaParams = [
            PRIM_MEDIA_CURRENT_URL, gWebPageURL,
            PRIM_MEDIA_AUTO_PLAY, TRUE,
            PRIM_MEDIA_AUTO_LOOP, FALSE,
            PRIM_MEDIA_AUTO_ZOOM, TRUE,
            PRIM_MEDIA_AUTO_SCALE, TRUE,
            PRIM_MEDIA_WIDTH_PIXELS, 1024,
            PRIM_MEDIA_HEIGHT_PIXELS, 768,
            PRIM_MEDIA_FIRST_CLICK_INTERACT, TRUE,
            PRIM_MEDIA_CONTROLS, PRIM_MEDIA_CONTROLS_STANDARD
        ];
        
        llSetPrimMediaParams(0, mediaParams);
        
        // Update HUD text
        llSetText("SL Data Bridge\nReady", <0,1,0>, 1.0);
        
        llOwnerSay("Web interface loaded. You can now interact with the HUD.");
        llOwnerSay("Say '/" + (string)gChannel + " help' for commands.");
    }
    
    handleWebData(key request_id, string body)
    {
        gMessagesReceived++;
        
        // Parse JSON data from web page
        list parsed = llJson2List(body);
        string type = "";
        string content = "";
        
        // Simple JSON parsing (LSL doesn't have native JSON support)
        if (llGetListLength(parsed) >= 2)
        {
            type = llList2String(parsed, 1); // Assuming type is second element
            content = llList2String(parsed, 3); // Assuming content is fourth element
        }
        else
        {
            content = body; // Fallback to raw body
        }
        
        llOwnerSay("Web→SL: " + content);
        
        // Process different message types
        if (type == "command")
        {
            processCommand(content);
        }
        else if (type == "chat")
        {
            llSay(0, content);
        }
        else if (type == "coordinates")
        {
            processCoordinates(content);
        }
        
        // Send acknowledgment back to web page
        string response = llList2Json(JSON_OBJECT, [
            "status", "received",
            "timestamp", llGetTimestamp(),
            "messageCount", gMessagesReceived
        ]);
        
        llHTTPResponse(request_id, 200, response);
    }
    
    processCommand(string command)
    {
        if (command == "/status")
        {
            sendStatusToWeb();
        }
        else if (command == "/stats")
        {
            string stats = "Messages: " + (string)gMessagesReceived + 
                          " received, " + (string)gMessagesSent + " sent. " +
                          "Uptime: " + formatUptime();
            sendToWeb("stats", stats);
        }
        else
        {
            llOwnerSay("Unknown command: " + command);
        }
    }
    
    processCoordinates(string coords)
    {
        list coordList = llParseString2List(coords, [","], []);
        if (llGetListLength(coordList) >= 3)
        {
            vector targetPos = <llList2Float(coordList, 0),
                              llList2Float(coordList, 1),
                              llList2Float(coordList, 2)>;
            
            llOwnerSay("Teleporting to: " + (string)targetPos);
            // Note: Actual teleportation would require different approach
        }
    }
    
    sendToWeb(string type, string message)
    {
        // This would send data to the web page via JavaScript injection
        // In practice, you might use llSetPrimMediaParams with JavaScript
        gMessagesSent++;
        llOwnerSay("SL→Web: " + message);
    }
    
    sendStatusToWeb()
    {
        string status = "Avatar: " + llKey2Name(llGetOwner()) + 
                       ", Region: " + llGetRegionName() +
                       ", Position: " + (string)llGetPos();
        sendToWeb("status", status);
    }
    
    string formatUptime()
    {
        float uptime = llGetTime() - gStartTime;
        integer hours = (integer)(uptime / 3600);
        integer minutes = (integer)((uptime - hours * 3600) / 60);
        integer seconds = (integer)(uptime - hours * 3600 - minutes * 60);
        
        return (string)hours + "h " + (string)minutes + "m " + (string)seconds + "s";
    }
    
    listen(integer channel, string name, key id, string message)
    {
        if (channel == gChannel && id == llGetOwner())
        {
            if (message == "help")
            {
                llOwnerSay("Commands:");
                llOwnerSay("/" + (string)gChannel + " reset - Reset the bridge");
                llOwnerSay("/" + (string)gChannel + " stats - Show statistics");
                llOwnerSay("/" + (string)gChannel + " url - Show current URL");
            }
            else if (message == "reset")
            {
                llResetScript();
            }
            else if (message == "stats")
            {
                llOwnerSay("Statistics: " + (string)gMessagesReceived + 
                          " received, " + (string)gMessagesSent + " sent");
                llOwnerSay("Uptime: " + formatUptime());
            }
            else if (message == "url")
            {
                llOwnerSay("HTTP-in URL: " + gHttpInURL);
                llOwnerSay("Web page URL: " + gWebPageURL);
            }
            else
            {
                // Send chat message to web interface
                sendToWeb("chat", message);
            }
        }
    }
    
    timer()
    {
        // Retry URL request if it failed
        llSetTimerEvent(0.0);
        llRequestURL();
    }
    
    on_rez(integer start_param)
    {
        llResetScript();
    }
    
    changed(integer change)
    {
        if (change & CHANGED_OWNER)
        {
            llResetScript();
        }
    }
}