// listen for the on Installed event
chrome.runtime.onInstalled.addListener(function(details) {
    // open the options page to have the default settings saved
    chrome.runtime.openOptionsPage();
});

// Set up context menu on script start
chrome.contextMenus.create({
    title: "Get NZB file",
    contexts: ["link"],
    id: "NZBDonkey_openLink"
});
chrome.contextMenus.create({
    title: "Get NZB file",
    contexts: ["selection"],
    id: "NZBDonkey_analyseSelection"
});

// settings will be stored in a global variable
var nzbDonkeySettings = {};

// load the settings
loadSettings();

function loadSettings() {
    chrome.storage.sync.get(null, function(obj) {
        for (key in obj) {
            keys = key.split(".");
            if (keys[0] == 'search_engines') {
                nzbDonkeySettings[keys[1]] = obj[key];
            } else {
                if (typeof nzbDonkeySettings[keys[0]] === 'undefined') {
                    nzbDonkeySettings[keys[0]] = {};
                }
                nzbDonkeySettings[keys[0]][keys[1]] = obj[key];
            }
        }
    });    
}

// add listener to update the settings if changed
chrome.storage.onChanged.addListener(function() {
    loadSettings();
});

// Add listener for clicks on the context menu
chrome.contextMenus.onClicked.addListener(function(info, tab) {

    if (tab) {
        // if the context menu was clicked on a link
        if (info.menuItemId == "NZBDonkey_openLink") {

            // Logging routine
            nzbLogging("INFO" + ": " + "NZBDonkey was started with a click on a link");

            // run the processLink function
            processLink(info.linkUrl);
        }

        // if the context menu was clicked on a selection
        if (info.menuItemId == "NZBDonkey_analyseSelection") {

            // Logging routine
            nzbLogging("INFO" + ": " + "NZBDonkey was started with a click on a selection");
            nzbLogging("INFO" + ": " + "analyzing selection");

            chrome.tabs.sendMessage(tab.id, {nzbDonkeyAnalyzeSelection: true}, function(selection) {
                if (typeof selection !== 'undefined') {
                    if (typeof selection.nzbHeader !== 'undefined') {
                        nzbLogging("INFO" + ": " + "analyzing of selection completed");
                        processAnalysedSelection(selection)
                    }
                    else {
                        nzbLogging("INFO" + ": " + "analyzing of selection was canceled");
                    }
                }
                else {
                    nzbLogging("INFO" + ": " + "analyzing of selection was canceled");
                }
            });
            
        }

    }

});

// Add listener for messages from the content script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.nzbDonkeyCatchLinks) {
        nzbLogging("INFO" + ": " + "Content script has asked whether to catch left clicks on NZBLinks");
        if (nzbDonkeySettings.general.catchLinks) {
            sendResponse({nzbDonkeyCatchLinks: true});
        } else {
            sendResponse({nzbDonkeyCatchLinks: false});
        }
    }
    else if (request.nzbDonkeyNZBLinkURL) {
        // Logging routine
        nzbLogging("INFO" + ": " + "NZBDonkey was started with a click on a actual NZBLink");
        processLink(request.nzbDonkeyNZBLinkURL)
    }

});

function processAnalysedSelection(selection) {
    if (selection.nzbHeader != "") {
        // Logging routine
        nzbLogging("INFO" + ": " + "header is set to:" + selection.nzbHeader);
        nzbLogging("INFO" + ": " + "title is set to:" + selection.nzbTitle);
        nzbLogging("INFO" + ": " + "password is set to:" + selection.nzbPassword);
        if (selection.nzbTitle == "") {
            selection.nzbTitle = selection.nzbHeader;
            nzbLogging("INFO" + ": " + "empty title - setting header as title");
        }
        searchNZB(selection.nzbHeader, selection.nzbTitle, selection.nzbPassword);
    } else {
        // Logging routine
        nzbLogging("INFO" + ": " + "no header information found");
        nzbLogging("INFO" + ": " + "sending desktop notification");

        nzbDonkeyNotification("ERROR" + ": " + "no header information found" + "\n", true);

        // Logging routine
        nzbLogging("END OF SCRIPT");

    }    
}



// function to process the clicked link
function processLink(url) {

    // Logging routine
    nzbLogging("INFO" + ": " + "processing clicked link: " + url);

    var link = decodeURIComponent(url);
    if (link.match(/^nzblnk:/i)) {
        var nzbTitle = "";
        var nzbHeader = "";
        var nzbPassword = "";
        if (link.match(/[?&;][h]=(.*?)(?=(?:[?&;][thgp]=|$))/i)) {
            nzbHeader = link.match(/[?&;][h]=(.*?)(?=(?:[?&;][thgp]=|$))/i)[1];

            // Logging routine
            nzbLogging("INFO" + ": " + "Found header tag: " + nzbHeader);

        } else {

            // Logging routine
            nzbLogging("ERROR" + ": " + "No header tag found");

        }
        if (link.match(/[?&;][t]=(.*?)(?=(?:[?&;][thgp]=|$))/i)) {
            nzbTitle = link.match(/[?&;][t]=(.*?)(?=(?:[?&;][thgp]=|$))/i)[1];

            if (nzbTitle != "") {
                
                // Logging routine
                nzbLogging("INFO" + ": " + "Found title tag: " + nzbTitle);
                
            } else {
                
                // Logging routine
                nzbLogging("ERROR" + ": " + "Title tag was empty");
                
                nzbTitle = nzbHeader;

                // Logging routine
                nzbLogging("INFO" + ": " + "Setting header as title tag");
                
            }

        } else {

            // Logging routine
            nzbLogging("ERROR" + ": " + "No title tag found");

            if (nzbHeader != "") {
                nzbTitle = nzbHeader;

                // Logging routine
                nzbLogging("INFO" + ": " + "Setting header as title tag");

            }

        }

        if (link.match(/[?&;][p]=(.*?)(?=(?:[?&;][thgp]=|$))/i)) {
            nzbPassword = link.match(/[?&;][p]=(.*?)(?=(?:[?&;][thgp]=|$))/i)[1];

            // Logging routine
            nzbLogging("INFO" + ": " + "Found password tag: " + nzbPassword);

        } else {

            // Logging routine
            nzbLogging("INFO" + ": " + "No password tag found");

        }
        if (nzbHeader != "") {

            searchNZB(nzbHeader, nzbTitle, nzbPassword);

        } else {

            // Logging routine
            nzbLogging("ERROR" + ": " + "the NZB link is missing a header tag");

            // Logging routine
            nzbLogging("INFO" + ": " + "sending desktop notification");

            nzbDonkeyNotification("ERROR" + ": " + "the NZB link is missing a header tag" + "\n", true);

            // Logging routine
            nzbLogging("END OF SCRIPT");

        }
    } else {

        // Logging routine
        nzbLogging("ERROR" + ": " + "this is not a NZB link");

        // Logging routine
        nzbLogging("INFO" + ": " + "sending desktop notification");

        nzbDonkeyNotification("ERROR" + ": " + "this is not a NZB link" + "\n", true);

        // Logging routine
        nzbLogging("END OF SCRIPT");

    }
}

// Logging routine
function nzbLogging(loggingText) {
    if (nzbDonkeySettings.general.debug) {
        console.log("NZBDonkey - " + loggingText);
    }
}

// Notification routine
function nzbDonkeyNotification(message, isError) {
    chrome.notifications.create("nzbDonkeyNotification", {
        type: 'basic',
        iconUrl: "icons/NZBDonkey_128.png",
        title: 'NZBDonkey',
        message: message
    });
}

   

function searchNZB(nzbHeader, nzbTitle, nzbPassword) {

    var request = [];
    var re = []
    var nzbURL = "";
    var counter = nzbDonkeySettings.searchEngines.length;

    // starting a http request for all search engines
    for (var i = 0; i < nzbDonkeySettings.searchEngines.length; i++) {
        if (nzbDonkeySettings.searchEngines[i].active) { // but only for "active" search engines
            (function(i) {
                request[i] = new XMLHttpRequest();
                request[i].addEventListener('load', function(event) {

                    nzbLogging("INFO" + ": " + nzbDonkeySettings.searchEngines[i].name + ": " + "http response code is" + " " + request[i].status);

                    if (request[i].status >= 200 && request[i].status < 300) {
                        re[i] = new RegExp(nzbDonkeySettings.searchEngines[i].searchPattern, "i");
                        nzbLogging("INFO" + ": " + nzbDonkeySettings.searchEngines[i].name + " search pattern: " + nzbDonkeySettings.searchEngines[i].searchPattern);
                        if (re[i].test(request[i].responseText)) {
                            // the first hit will be the winner
                            if (nzbURL == "") {

                                nzbLogging("INFO" + ": " + nzbDonkeySettings.searchEngines[i].name + ": " + "NZB file found");

                                nzbURL = nzbDonkeySettings.searchEngines[i].downloadURL.replace(/%s/, request[i].responseText.match(re[i])[nzbDonkeySettings.searchEngines[i].searchGroup]);

                                nzbLogging("INFO" + ": " + "NZB URL is" + ": " + nzbURL);

                                nzbUrlProcess(nzbURL, nzbTitle, nzbPassword);
                                counter -= 1;
                            } else {

                                nzbLogging("INFO" + ": " + nzbDonkeySettings.searchEngines[i].name + ": " + "NZB file found but someone was faster");

                            }

                        } else {

                            nzbLogging("ERROR" + ": " + nzbDonkeySettings.searchEngines[i].name + ": " + "Nothing found");
                            counter -= 1;
                            catchError();

                        }
                    } else {

                        nzbLogging("ERROR" + ": " + nzbDonkeySettings.searchEngines[i].name + ": " + "Error accessing the server");
                        counter -= 1;
                        catchError();

                    }
                });
                request[i].addEventListener('error', function(event) {
                    nzbLogging("ERROR" + ": " + nzbDonkeySettings.searchEngines[i].name + ": " + "http response code is" + " " + request[i].status);
                    nzbLogging("ERROR" + ": " + nzbDonkeySettings.searchEngines[i].name + ": " + "the server is not responding");
                    counter -= 1;
                    catchError();

                });
                request[i].open("GET", nzbDonkeySettings.searchEngines[i].searchURL.replace(/%s/, encodeURI(nzbHeader)), true);
                request[i].timeout = 10000;
                request[i].send();

                nzbLogging("INFO" + ": " + "Requesting URL" + ": " + nzbDonkeySettings.searchEngines[i].searchURL.replace(/%s/, encodeURI(nzbHeader)));

            })(i);
        }
    }
    function catchError() {
        if (counter == 0 && nzbURL == "") {

            nzbLogging("ERROR" + ": " + "No NZB file found on any NZB search engine");

            nzbLogging("INFO" + ": " + "sending desktop notification");

            nzbDonkeyNotification("ERROR" + ": " + "No NZB file found on any NZB search engine", true);

        }
    }
}

function nzbUrlProcess(nzbURL, nzbTitle, nzbPassword) {

    nzbLogging("INFO" + ": " + "processing the NZB URL");

    var category = "";
    switch (nzbDonkeySettings.categories.categories) {
        case "automatic":
            category = categorize(nzbTitle);
            break;

        case "default":
            category = nzbDonkeySettings.categories.defaultCategory;
            break;
    }

    nzbLogging("INFO" + ": " + "setting category to" + ": " + category);

    nzbLogging("INFO" + ": " + "execution type is set to" + ": " + nzbDonkeySettings.general.execType);

    // sanitize title
    nzbTitle = nzbTitle.replace(/[/\\?%*:|"<>]/g, "")

    switch (nzbDonkeySettings.general.processTitel) {
        case "periods":
            nzbTitle = nzbTitle.replace(/\s/g, ".");
            break;

        case "spaces":
            nzbTitle = nzbTitle.replace(/\./g, " ");
            break;

    }

    switch (nzbDonkeySettings.general.execType) {
        case "download":
            downloadNZB(nzbURL, nzbTitle, nzbPassword, category);
            break;

        case "nzbget":
            pushNZBtoNZBGET(nzbURL, nzbTitle, nzbPassword, category);
            break;

        case "sabnzbd":
            pushNZBtoSABnzbd(nzbURL, nzbTitle, nzbPassword, category);
            break;
    }

}

function pushNZBtoNZBGET(nzbURL, nzbTitle, nzbPassword, category) {

    var scheme = nzbDonkeySettings.nzbget.scheme;
    var host = nzbDonkeySettings.nzbget.host.match(/^(?:https{0,1}:\d?\/\/)?([^\/:]+)/i)[1]
    var port = nzbDonkeySettings.nzbget.port.match(/[^\d]*(\d*)[^\d]*/)[1];
    var username = nzbDonkeySettings.nzbget.username;
    var password = nzbDonkeySettings.nzbget.password;
    var basepath = "xmlrpc";

    var url = scheme + "://" + host + ":" + port + "/" + basepath + "/";

    nzbLogging("INFO" + ": " + "NZBGet URL is set to" + ": " + url);

    var addPaused = (nzbDonkeySettings.nzbget.addPaused) ? 1 : 0;

    var filename = nzbTitle;
    if (nzbPassword != "") {
        filename += "{{" + nzbPassword + "}}";
    }
    filename += ".nzb";

    nzbLogging("INFO" + ": " + "filename is set to" + ": " + filename);

    var data = '<?xml version="1.0"?><methodCall><methodName>append</methodName><params>' +
        '<param><value><string>' + filename + '.nzb</string></value></param>' + // Filename
        '<param><value><string>' + nzbURL + '</string></value></param>' + // Content (NZB File)
        '<param><value><string>' + category + '</string></value></param>' + // Category
        '<param><value><i4>0</i4></value></param>' + // Priority
        '<param><value><boolean>0</boolean></value></param>' + // AddToTop
        '<param><value><boolean>' + addPaused + '</boolean></value></param>' + // AddPaused
        '<param><value><string></string></value></param>' + // DupeKey
        '<param><value><i4>0</i4></value></param>' + // DupeScore
        '<param><value><string>ALL</string></value></param>' + // DupeMode
        '</params></methodCall>';

    var request = new XMLHttpRequest();
    request.addEventListener('load', function(event) {

        nzbLogging("INFO" + ": " + nzbDonkeySettings.general.execType + ": " + "http response code is" + " " + request.status);

        if (request.status >= 200 && request.status < 300) {
            var response = parseInt(request.responseText.match(/.*>(-{0,1}\d+)<.*/)[1]);
            if (response > 0) {
                nzbLogging("INFO" + ": " + nzbDonkeySettings.general.execType + " " + "returned a success code");
                nzbLogging("INFO" + ": " + "sending desktop notification");
                nzbDonkeyNotification("The NZB file was successfully pushed to" + " " + nzbDonkeySettings.general.execType, false);
            } else {
                nzbLogging("INFO" + ": " + nzbDonkeySettings.general.execType + " " + "returned an error code");
                nzbLogging("INFO" + ": " + "sending desktop notification");
                nzbDonkeyNotification("ERROR" + ": " + "an error occurred while pushing the NZB file to" + " " + nzbDonkeySettings.general.execType, true);
            }
        } else {
            nzbLogging("ERROR" + ": " + nzbDonkeySettings.general.execType + ": " + "Error accessing the server");
            nzbLogging("INFO" + ": " + "sending desktop notification");
            nzbDonkeyNotification("ERROR" + ": " + "an error occurred while pushing the NZB file to" + " " + nzbDonkeySettings.general.execType, true);
        }
    });
    request.addEventListener('error', function(event) {
        nzbLogging("ERROR" + ": " + nzbDonkeySettings.general.execType + ": " + "http response code is" + " " + request.status);
        nzbLogging("ERROR" + ": " + nzbDonkeySettings.general.execType + ": " + "Not responding");
        nzbLogging("INFO" + ": " + "sending desktop notification");
        nzbDonkeyNotification("ERROR" + ": " + nzbDonkeySettings.general.execType + ": " + "The server is not responding", true);
    });
    request.open("POST", url, true);
    request.setRequestHeader("Authorization", "Basic " + btoa(username + ":" + password));
    request.timeout = 10000;
    request.send(data);

    nzbLogging("INFO" + ": " + "pushing to NZBGet");

}

function pushNZBtoSABnzbd(nzbURL, nzbTitle, nzbPassword, category) {

    var scheme = nzbDonkeySettings.sabnzbd.scheme;
    var host = nzbDonkeySettings.sabnzbd.host.match(/^(?:https{0,1}:\d?\/\/)?([^\/:]+)/i)[1]
    var port = nzbDonkeySettings.sabnzbd.port.match(/[^\d]*(\d*)[^\d]*/)[1];
    var apiKey = nzbDonkeySettings.sabnzbd.apiKey;
    var basepath = "sabnzbd";
    var filename = nzbTitle;
    if (nzbPassword != "") {
        filename += "{{" + nzbPassword + "}}";
    }
    filename += ".nzb";
    nzbLogging("INFO" + ": " + "filename is set to" + ": " + filename);

    var url = scheme + "://" + host + ":" + port + "/" + basepath + "/api?mode=addurl&name=" + encodeURIComponent(nzbURL) + "&nzbname=" + encodeURIComponent(filename) + "&cat=" + encodeURIComponent(category) + "&output=json&apikey=" + encodeURIComponent(apiKey);

    nzbLogging("INFO" + ": " + "SABnzbd URL is set to" + ": " + url);

    var request = new XMLHttpRequest();
    request.addEventListener('load', function(event) {

        nzbLogging("INFO" + ": " + nzbDonkeySettings.general.execType + ": " + "http response code is" + " " + request.status);

        if (request.status >= 200 && request.status < 300) {
            var response = JSON.parse(request.responseText);
            if (response.status) {
                nzbLogging("INFO" + ": " + nzbDonkeySettings.general.execType + " " + "returned a success code");
                nzbLogging("INFO" + ": " + "sending desktop notification");
                nzbDonkeyNotification("The NZB file was successfully pushed to" + " " + nzbDonkeySettings.general.execType, false);
            } else {
                nzbLogging("INFO" + ": " + nzbDonkeySettings.general.execType + " " + "returned an error code");
                nzbLogging("INFO" + ": " + "sending desktop notification");
                nzbDonkeyNotification("ERROR" + ": " + "an error occurred while pushing the NZB file to" + " " + nzbDonkeySettings.general.execType, true);
            }
        } else {
            nzbLogging("ERROR" + ": " + nzbDonkeySettings.general.execType + ": " + "error accessing the server with error code " + request.status);
            nzbLogging("INFO" + ": " + "sending desktop notification");
            nzbDonkeyNotification("ERROR" + ": " + "an error occurred while pushing the NZB file to" + " " + nzbDonkeySettings.general.execType, true);
        }
    });
    request.addEventListener('error', function(event) {
        nzbLogging("ERROR" + ": " + nzbDonkeySettings.general.execType + ": " + "http response code is" + " " + request.status);
        nzbLogging("ERROR" + ": " + nzbDonkeySettings.general.execType + ": " + "Not responding");
        nzbLogging("INFO" + ": " + "sending desktop notification");
        nzbDonkeyNotification("ERROR" + ": " + nzbDonkeySettings.general.execType + ": " + "The server is not responding", true);
    });
    request.open("GET", url, true);
    request.timeout = 10000;
    request.send();

    nzbLogging("INFO" + ": " + "pushing to SABnzbd");
   
}


function categorize(nzbTitle) {

    var category = "";
    for (var i = 0; i < nzbDonkeySettings.categories.automaticCategories.length; i++) {
        var re = new RegExp(nzbDonkeySettings.categories.automaticCategories[i].pattern, "i");
        nzbLogging("INFO" + ": " + "testing for category " + nzbDonkeySettings.categories.automaticCategories[i].name);
        if (re.test(nzbTitle)) {
            category = nzbDonkeySettings.categories.automaticCategories[i].name;
            break;
        }
    }
    if (category == "") {
        category = nzbDonkeySettings.categories.defaultCategory;
        nzbLogging("INFO" + ": " + "no match found, setting category to default category: " + nzbDonkeySettings.categories.defaultCategory);
    }
    return category;

}

function downloadNZB(nzbURL, nzbTitle, nzbPassword, category) {

    var filename = ""
    if (nzbDonkeySettings.download.defaultPath != "") {
        filename += nzbDonkeySettings.download.defaultPath.replace(/^[\/]*(.*)[\/]*$/, '$1') + "/";
    }
    if (category != "" && nzbDonkeySettings.download.categoryFolder) {
        filename += category.match(/^[\/]*(.*)[\/]*$/)[1] + "/";
    }
    filename += nzbTitle;
    if (nzbPassword != "") {
        if (!/[\/\\%*:"?~<>*|]/.test(nzbPassword)) {
            filename += "{{" + nzbPassword + "}}";
        }
        else {
            nzbLogging("INFO" + ": " + "the Password does contain invalid characters and cannot be included in the filename");
            alert("CAUTION: The Password does contain invalid characters and cannot be included in the filename");          
        }
    }
    filename += ".nzb";

    nzbLogging("INFO" + ": " + "filename is set to" + ": " + filename);

    chrome.downloads.download({
        url: nzbURL,
        filename: filename,
        saveAs: nzbDonkeySettings.download.saveAs,
        conflictAction: "uniquify"
    });
    chrome.downloads.onCreated.addListener(function(item) {
        nzbLogging("INFO" + ": " + "starting download");
        nzbLogging("INFO" + ": " + "sending desktop notification");
        nzbDonkeyNotification("Starting download of file" + ":\n" + filename, false);
    });

}

