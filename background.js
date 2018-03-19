// listen for the onInstalled event
chrome.runtime.onInstalled.addListener(function(details) {
    if (details.OnInstalledReason != 'chrome_update') {
        // delete the stored searchengines settings to force loading the default settings
        // currently not required because no changes to these default settings have been done
        // chrome.storage.sync.remove('searchengines.searchengines');

        // open the options page to have the default settings saved
        chrome.runtime.openOptionsPage();
    }
});

// modify the promise prototype to add function "any"
// from https://stackoverflow.com/questions/39940152/get-first-fulfilled-promise
Promise.prototype.invert = function() {
    return new Promise((res, rej) => this.then(rej, res));
};
Promise.any = function(ps) {
    return Promise.all(ps.map((p) => p.invert())).invert();
};

// define global nzbDonkey variable
var nzbDonkey = {};

nzbDonkey.scriptID = (~~(Math.random() * 1e9)).toString(36);

// define global nzbDonkey variable for the nzbDonkey context menu ID
nzbDonkey.contextMenuID = "NZBDonkey";

// define global nzbDonkey variable for the nzbDoneky settings
nzbDonkey.settings = {};

// define global nzbDonkey variable for the nzbDoneky functions
nzbDonkey.execute = {};
nzbDonkey.testconnection = {};

// define global nzbDonkey variable for the storage -> fall back to storage.local if storage.sync is not available
if (isset(() => chrome.storage.sync)) {
    nzbDonkey.storage = chrome.storage.sync;
    console.log("NZBDonkey - INFO: storage set to storage.sync");
}
else {
    nzbDonkey.storage = chrome.storage.local;
    console.log("NZBDonkey - INFO: storage set to storage.local");
}

// define all nzbDonkey functions

// function to initialize the script and the event listeners
nzbDonkey.initializeScript = function() {

    return new Promise(function(resolve, reject) {
        
        // remove all context menus
        nzbDonkey.logging("removing all context menus");
        chrome.contextMenus.removeAll();

        // setting the context menu for the 'Get NZB file' action
        nzbDonkey.logging("setting the context menu for the 'Get NZB file' action");  
        chrome.contextMenus.create({
            title: "Get NZB file",
            contexts: ["link", "selection"],
            id: nzbDonkey.contextMenuID + "_GetFile"
        });

/*
        // setting the context menu for the 'Check NZB file' option
        nzbDonkey.logging("setting the context menu for the 'Check NZB file' option");  
        chrome.contextMenus.create({
            title: "Check NZB file",
            type: "checkbox",
            checked: nzbDonkey.settings.general.checkNZBfiles,
            contexts: ["all"],
            id: nzbDonkey.contextMenuID + "_CheckFile"
        });
*/
        
        // setting the event listener for context menu clicks
        if (chrome.contextMenus.onClicked.hasListener(nzbDonkey.contextMenuEventListener)) {
            nzbDonkey.logging("removing old event listener for the context menu clicks");
            chrome.contextMenus.onClicked.removeListener(nzbDonkey.contextMenuEventListener);
        }
        nzbDonkey.logging("setting event listener for the context menu clicks");
        chrome.contextMenus.onClicked.addListener(nzbDonkey.contextMenuEventListener);

        // setting the event listener for messages from the content or options script
        if (chrome.runtime.onMessage.hasListener(nzbDonkey.messageEventListener)) {
            nzbDonkey.logging("removing old event listener for the messages from content or options script");
            chrome.runtime.onMessage.removeListener(nzbDonkey.messageEventListener);
        }
        nzbDonkey.logging("setting event listener for the messages from content or options script");
        chrome.runtime.onMessage.addListener(nzbDonkey.messageEventListener);
        
        // setting the event listener for settings changes
        if (chrome.storage.onChanged.hasListener(nzbDonkey.reinitializeScript)) {
            nzbDonkey.logging("removing old event listener for changes to the settings");
            chrome.storage.onChanged.removeListener(nzbDonkey.reinitializeScript);
        }
        nzbDonkey.logging("setting event listener for changes to the settings");
        chrome.storage.onChanged.addListener(nzbDonkey.reinitializeScript);

        // removing old event listener for the onHeadersReceived event
        if (chrome.webRequest.onHeadersReceived.hasListener(nzbDonkey.onHeadersReceivedEventListener)) {
            nzbDonkey.logging("removing old event listener for the onHeadersReceived event");
            chrome.webRequest.onHeadersReceived.removeListener(nzbDonkey.onHeadersReceivedEventListener);
        }
        // removing old event listener for the onBeforeRequest event
        if (chrome.webRequest.onBeforeRequest.hasListener(nzbDonkey.onBeforeRequestEventListener)) {
            nzbDonkey.logging("removing old event listener for the onBeforeRequest event");
            chrome.webRequest.onBeforeRequest.removeListener(nzbDonkey.onBeforeRequestEventListener);
        }
        // removing old event listener for the onBeforeSendHeaders event
        if (chrome.webRequest.onBeforeSendHeaders.hasListener(nzbDonkey.onBeforeSendHeadersEventListener)) {
            nzbDonkey.logging("removing old event listener for the onBeforeSendHeaders event");
            chrome.webRequest.onBeforeSendHeaders.removeListener(nzbDonkey.onBeforeSendHeadersEventListener);
        }
        // if enabled in the settings, set up the nzb download interception
        if (nzbDonkey.settings.interception.interceptNzbDownloads) {
            nzbDonkey.setupNzbDownloadInterception().then(function() {
                resolve();
            }).catch(function(e) {
                throw new Error(e);
            });
        }
        else {
            resolve();
        }
    
    });

}

// function to reinitialize the script upon settings changes
nzbDonkey.reinitializeScript = function(changes, area) {
    nzbDonkey.logging("reinitializing the script");
    nzbDonkey.loadSettings().then(function() {
        nzbDonkey.initializeScript().then(function() {
            nzbDonkey.logging("the script was reinitialized successfully");
        }).catch(function(e){
            nzbDonkey.logging("the script failed to reinitialize", true);
            nzbDonkey.logging(e, true);
            nzbDonkey.notification("The script failed to reinitialize!\n" + e.toString() + "\nPlease restart the Browser.", "error");
        });
    }).catch(function(e) {
        nzbDonkey.settingsError();
    });

}

// function to set the event listener for clicks on the context menu
nzbDonkey.contextMenuEventListener = function(info, tab) {

    // if the context menu was clicked on a selection
    if (isset(() => info.selectionText)) {
        nzbDonkey.logging("NZBDonkey was started with a right click on a selection");
        nzbDonkey.logging("analyzing selection");
        chrome.tabs.sendMessage(tab.id, {
            nzbDonkeyAnalyzeSelection: true
        }, function(nzb) {
            if (!isset(() => nzb.cancle)) {
                nzbDonkey.logging("analysis of selection finished");
                nzbDonkey.processAnalysedSelection(nzb).then(function(response) {
                    nzbDonkey.doTheDonkey(response);
                }).catch(function(e) {
                    nzbDonkey.notification(e.toString(), "error");
                    nzbDonkey.logging(e, true);
                });
            } else {
                nzbDonkey.logging("analyzing of selection was canceled");
            }
        });
    }
    // if the context menu was clicked on a link
    else if (isset(() => info.linkUrl)) {
        nzbDonkey.logging("NZBDonkey was started with a right click on a link");
        nzbDonkey.processLink(info.linkUrl).then(function(response) {
            nzbDonkey.doTheDonkey(response);
        }).catch(function(e) {
            nzbDonkey.notification(e.toString(), "error");
            nzbDonkey.logging(e, true);
        });
    }
    else {
        nzbDonkey.logging("NZBDonkey was started with a right click but neither on a link nor on a selection", true);
        nzbDonkey.notification("NZBDonkey was started with a right click but neither on a link nor on a selection", "error");
    }

}

// function to set the event listener for messages from the content or options script
nzbDonkey.messageEventListener = function(request, sender, sendResponse) {

    if (isset(() => request.nzbDonkeyCatchLinks)) {
        nzbDonkey.logging("content script has asked whether to catch left clicks on NZBlnk links");
        nzbDonkey.logging("catch left clicks on NZBlnk links is set to" + ": " + nzbDonkey.settings.general.catchLinks);
        sendResponse({
            nzbDonkeyCatchLinks: nzbDonkey.settings.general.catchLinks
        });
    } else if (isset(() => request.nzbDonkeyTestConnection)) {
        nzbDonkey.logging("options script has asked to test the connection to the current execType");
        nzbDonkey.testconnection[nzbDonkey.settings.general.execType]().then(function(response) {
            sendResponse({
                "success": true,
                "response": response
            });
        }).catch(function(e) {
            sendResponse({
                "success": false,
                "response": e.toString()
            });
        });
    } else if (isset(() => request.nzbDonkeyNZBLinkURL)) {
        nzbDonkey.logging("NZBDonkey was started with a left click on an actual NZBlnk link");
        nzbDonkey.processLink(request.nzbDonkeyNZBLinkURL).then(function(response) {
            nzbDonkey.doTheDonkey(response);
        }).catch(function(e) {
            nzbDonkey.notification(e.toString(), "error");
            nzbDonkey.logging(e, true);
        });
    }

    return true;

}

// function to load the settings
nzbDonkey.loadSettings = function() {

    console.info("NZBDonkey - INFO: trying to load the settings");

    return new Promise(function(resolve, reject) {

        nzbDonkey.storage.get(null, function(obj) {
            for (key in obj) {
                keys = key.split(".");
                if (keys[0] == 'searchengines') {
                    nzbDonkey.settings[keys[1]] = obj[key];
                } else {
                    if (!isset(() => nzbDonkey.settings[keys[0]])) {
                        nzbDonkey.settings[keys[0]] = {};
                    }
                    nzbDonkey.settings[keys[0]][keys[1]] = obj[key];
                }
            }
            nzbDonkey.logging("settings successfully loaded");
            resolve();
        });

    });
}

// function to show a notification and log it to the console if loading of the settings failed 
nzbDonkey.settingsError = function() {

    console.error("NZBDonkey - Error: could not load settings");
    console.error("NZBDonkey - " + e.toString());

    chrome.notifications.create("NZBDonkey_notification", {
        type: 'basic',
        iconUrl: "icons/NZBDonkey_error_128.png",
        title: 'NZBDonkey',
        message: "Error: could not load settings"
    });

}

// function to set up interception of nzb file downloads
nzbDonkey.setupNzbDownloadInterception = function() {

    return new Promise(function(resolve, reject) {
        
        // declare global nzbDonkey variable to store the requests information
        nzbDonkey.ownRequestIDs = [];
        nzbDonkey.allRequestIDs = [];
        
        // generate the array of domains to  be intercepted
        var Domains = [];
        if (isset(() => nzbDonkey.settings.interception.domains) && nzbDonkey.settings.interception.domains.length > 0) {
            for (var i = 0; i < nzbDonkey.settings.interception.domains.length; i++) {
                if (nzbDonkey.settings.interception.domains[i].active) {
                    Domains.push("*://*." + nzbDonkey.settings.interception.domains[i].domain + "/*");
                }
            }
        }

        // generate the special domains object
        nzbDonkey.specialDomains = {};
        if (isset(() => nzbDonkey.settings.interception.specialDomains) && nzbDonkey.settings.interception.specialDomains.length > 0) {
            for (var i = 0; i < nzbDonkey.settings.interception.specialDomains.length; i++) {
                nzbDonkey.specialDomains[nzbDonkey.settings.interception.specialDomains[i].domain] = nzbDonkey.settings.interception.specialDomains[i].treatment;
            }
        }

        // setting the event listener to intercept nzb file downloads
        nzbDonkey.logging("setting event listener for the onHeadersReceived event");
        chrome.webRequest.onHeadersReceived.addListener(nzbDonkey.onHeadersReceivedEventListener, {urls: Domains}, ['responseHeaders','blocking']);

        // setting the event listener for all requests to get the request url and form data to be used upon interception
        nzbDonkey.logging("setting event listener for the onBeforeRequest event");
        chrome.webRequest.onBeforeRequest.addListener(nzbDonkey.onBeforeRequestEventListener, {urls: Domains}, ['requestBody']);

        // setting the event listener for the X-NZBDonkey requests to get those request IDs to exclude them from being intercepted
        nzbDonkey.logging("setting event listener for the onBeforeSendHeaders event");
        chrome.webRequest.onBeforeSendHeaders.addListener(nzbDonkey.onBeforeSendHeadersEventListener, {urls: Domains}, ['requestHeaders']);
        
        resolve();
        
    });

}

// function to handle the onHeadersReceived event
nzbDonkey.onHeadersReceivedEventListener = function(details){
    // first check if it is not one of our own requests
    if (!nzbDonkey.ownRequestIDs.includes(details.requestId)) {
        // get the headers
        var headers = details.responseHeaders;
        // loop through the headers 
        for (header of headers) {
            // check for header "Content-Disposition"
            if (/^content-disposition$/i.test(header.name)) {
                // check if header "Content-Disposition" contains a filename ending with .nzb
                if (/filename\s*=\s*"?((.*)\.nzb)"?/i.test(header.value)) {
                    // if yes, we have a hit and will intercept this download
                    var nzb = {};
                    // get the filename as title
                    nzb.title = header.value.match(/filename\s*=\s*"?((.*)\.nzb)"?/i)[2];
                    nzbDonkey.logging("found a nzb filename in the intercepted response header: " + nzb.title);
                    // chekc if the filename contains the password in {{}}
                    if (/^(.*){{(.*?)}}/m.test(nzb.title)) {
                        // if yes, set the password
                        nzb.password = nzb.title.match(/^(.*){{(.*?)}}/m)[2];
                        // and the title without the password
                        nzb.title = nzb.title.match(/^(.*){{(.*?)}}/m)[1];
                    }
                    else {
                        // if not set the password to empty anyway to avoid undefined errors
                        nzb.password = "";
                    }
                    // get the request url for this nzb file
                    nzb.url = nzbDonkey.allRequestIDs[details.requestId].url;
                    // check if there is some formData for this request
                    if (isset(() => nzbDonkey.allRequestIDs[details.requestId].formData) && typeof nzbDonkey.allRequestIDs[details.requestId].formData == "object"){
                        nzbDonkey.logging("found post form data for intercepted nzb file request");
                        // check if the domain needs special handling for the form data
                        var url = analyzeURL(nzb.url);
                        if (isset(() => nzbDonkey.specialDomains[url.basedomain])) {
                            switch(nzbDonkey.specialDomains[url.basedomain]) {
                                case "sendFormDataAsString": 
                                    nzbDonkey.logging(url.basedomain + ": " + "this domain requires special handling sendFormDataAsString");
                                    var formData = "";
                                    for (let key in nzbDonkey.allRequestIDs[details.requestId].formData) {
                                        if (isset(() => nzbDonkey.allRequestIDs[details.requestId].formData[key][0])) {
                                            formData += key + "=" + nzbDonkey.allRequestIDs[details.requestId].formData[key][0] + "&";
                                        }
                                    }
                                    nzb.formData = formData.replace(/\&$/i, "");
                                    break;
                            }
                        }
                        // if no special handling is needed, just generate the form data
                        else {
                            nzb.formData = generateFormData(nzbDonkey.allRequestIDs[details.requestId].formData);
                        }
                    }
                    // calling the function to take over the nzb file download
                    nzbDonkey.interceptNzbDownload(nzb);

                    // aborting original request
                    return{redirectUrl:"javascript:"};
                }
            }
        }
    }
}

// function to handle the onBeforeRequest event
nzbDonkey.onBeforeRequestEventListener = function(details) {
    nzbDonkey.allRequestIDs[details.requestId] = {};
    // get the url of this request
    nzbDonkey.allRequestIDs[details.requestId].url = details.url;
    // check if there is a request body
    if (typeof details.requestBody == "object") {
        // check if the request body contains form data
        if (typeof details.requestBody.formData == "object") {
            // get the form data of this request
            nzbDonkey.allRequestIDs[details.requestId].formData = details.requestBody.formData;
        }
    }
    return;
}

// function to handle the onBeforeSendHeaders event
nzbDonkey.onBeforeSendHeadersEventListener = function(details) {
    // get the headers of this request
    var headers = details.requestHeaders;
    // loop through the headers
    for (header of headers) {
        // if header name is X-NZBDonkey
        if (/^x-nzbdonkey$/i.test(header.name)) {
            // add request ID to the own requests ids 
            nzbDonkey.ownRequestIDs.push(details.requestId);
        }
    }
    return;
}

// main backbone function of the script for nzb file search
// to be called as soon as we have all information to start searching for the nzb files
nzbDonkey.doTheDonkey = function(nzb) {
    nzbDonkey.notification("Starting to search for" + " " + nzb.title, "info");
    nzbDonkey.searchNZB(nzb).then(function(response) {
        return nzbDonkey.processTitle(response);
    }).then(function(response) {
        return nzbDonkey.categorize(response);
    }).then(function(response) {
        return nzbDonkey.processNZBfile(response);
    }).then(function(response) {
        return nzbDonkey.execute[nzbDonkey.settings.general.execType](response);
    }).then(function(response) {
        nzbDonkey.notification(response, "success");
    }).catch(function(e) {
        nzbDonkey.notification(e.toString(), "error");
        nzbDonkey.logging(e, true);
    });    
}

// main backbone function of the script for the nzb file download interception
// to be called as soon as we have all information to take over the nzb file download
nzbDonkey.interceptNzbDownload = function(nzb) {
    nzbDonkey.notification("Intercepting download of" + " " + nzb.title + ".nzb", "info");
    var options = {
                    "url": nzb.url,
                    "responseType": "text",
                    "timeout": 120000,
                    "data": nzb.formData
                };
    nzbDonkey.xhr(options).then(function(response) {
        return Promise.all([nzbDonkey.checkNZBfile(response, false), response]);
    }).then(function(response) {
        nzb.file = response[1];
        return nzbDonkey.processTitle(nzb);
    }).then(function(response) {
        return nzbDonkey.categorize(response);
    }).then(function(response) {
        return nzbDonkey.processNZBfile(response);
    }).then(function(response) {
        return nzbDonkey.execute[nzbDonkey.settings.general.execType](response);
    }).then(function(response) {
        nzbDonkey.notification(response, "success");
    }).catch(function(e) {
        nzbDonkey.notification(e.toString(), "error");
        console.error(e);
    });    
}

// function to analyze the parameters passed from the content script
nzbDonkey.processAnalysedSelection = function(nzb) {

    nzbDonkey.logging("processing parameters passed from the content script");

    return new Promise(function(resolve, reject) {

        if (isset(() => nzb.header) && nzb.header != "") {
            nzbDonkey.logging("found header tag" + ": " + nzb.header);
            if (isset(() => nzb.title) && nzb.title != "") {
                nzbDonkey.logging("found title tag" + ": " + nzb.title);
            } else {
                nzbDonkey.logging("no title tag found");
                nzb.title = nzb.header;
                nzbDonkey.logging("setting header as title tag");
            }
            if (isset(() => nzb.password) && nzb.password != "") {
                nzbDonkey.logging("found password tag" + ": " + nzb.password);
            } else {
                nzbDonkey.logging("no password tag found");
            }
            resolve(nzb);
        } else {
            nzbDonkey.logging("no header tag found", true);
            reject(new Error("no header tag found"));
        }

    });

}

// function to process the clicked link
nzbDonkey.processLink = function(nzblnk) {

    nzbDonkey.logging("processing clicked link" + ": " + nzblnk);

    return new Promise(function(resolve, reject) {

        var url = analyzeURL(nzblnk);
        if (isset(() => url.scheme) && url.scheme == "nzblnk") {
            if (isset(() => url.parameters)) {
                var nzb = {};
                if (isset(() => url.parameters.h) && url.parameters.h !="") {
                    nzb.header = url.parameters.h;
                    nzbDonkey.logging("found header parameter" + ": " + nzb.header);
                    if (isset(() => url.parameters.t) && url.parameters.t !="") {
                        nzb.title = url.parameters.t;
                        nzbDonkey.logging("found title parameter" + ": " + nzb.title);
                    } else {
                        nzbDonkey.logging("no title parameter found");
                        nzb.title = nzb.header;
                        nzbDonkey.logging("setting header as title parameter");
                    }
                    if (isset(() => url.parameters.p) && url.parameters.p !="") {
                        nzb.password = url.parameters.p;
                        nzbDonkey.logging("found password parameter" + ": " + nzb.password);
                    } else {
                        nzb.password = ""; // define nzb.password even if empty to avoid "undefined" errors
                        nzbDonkey.logging("no password parameter found");
                    }
                    resolve(nzb);
                } else {
                    nzbDonkey.logging("invalid NZBlnk: no header parameter found", true);
                    reject(new Error("invalid NZBlnk: no header parameter found"));
                }
            } else {
                nzbDonkey.logging("invalid NZBlnk: no parameters found", true);
                reject(new Error("invalid NZBlnk: no parameters found"));
            }
        } else {
            nzbDonkey.logging("this is not a NZBlnk link", true);
            reject(new Error("this is not a NZBlnk link"));
        }

    });

}

// function to search and download the nzb file
nzbDonkey.searchNZB = function(nzb) {

    nzbDonkey.logging("starting to search for the nzb file on the search engines");

    // prepare the promises for all search engines
    var getNZB = []; // the promise array
    for (let i = 0; i < nzbDonkey.settings.searchengines.length; i++) {
        if (nzbDonkey.settings.searchengines[i].active) { // only use "active" search engines
            getNZB[i] = new Promise(function(resolve, reject) {

                // first search for the nzb header
                let nzbSearchURL = nzbDonkey.settings.searchengines[i].searchURL.replace(/%s/, encodeURI(nzb.header));
                nzbDonkey.logging(nzbDonkey.settings.searchengines[i].name + ": " + "the search url is" + ": " + nzbSearchURL);
                nzbDonkey.logging(nzbDonkey.settings.searchengines[i].name + ": " + "searching for the nzb file");
                let options = {
                    "url": nzbSearchURL,
                    "responseType": "text",
                    "timeout": 30000
                };
                nzbDonkey.xhr(options).then(function(response) {
                    // if we have a response, check if we have a result
                    let re = new RegExp(nzbDonkey.settings.searchengines[i].searchPattern, "i");
                    nzbDonkey.logging(nzbDonkey.settings.searchengines[i].name + ": " + "the search engine returned a results page");
                    nzbDonkey.logging(nzbDonkey.settings.searchengines[i].name + ": " + "search pattern is set to: " + nzbDonkey.settings.searchengines[i].searchPattern);
                    nzbDonkey.logging(nzbDonkey.settings.searchengines[i].name + ": " + "searching for a result in the results page");
                    if (re.test(response)) {
                        // if we have a result, generate the url for the nzb file
                        nzbDonkey.logging(nzbDonkey.settings.searchengines[i].name + ": " + "nzb file found");
                        let nzbDownloadURL = nzbDonkey.settings.searchengines[i].downloadURL.replace(/%s/, response.match(re)[nzbDonkey.settings.searchengines[i].searchGroup]);
                        nzbDonkey.logging(nzbDonkey.settings.searchengines[i].name + ": " + "the nzb file download url is" + ": " + nzbDownloadURL);
                        nzbDonkey.logging(nzbDonkey.settings.searchengines[i].name + ": " + "trying to download the nzb file");
                        // and download the nzb file
                        let options = {
                            "url": nzbDownloadURL,
                            "responseType": "text",
                            "timeout": 180000
                        };
                        nzbDonkey.xhr(options).then(function(response) {
                            // if we have a response, check if it is a nzb file and if it is complete
                            nzbDonkey.logging(nzbDonkey.settings.searchengines[i].name + ": " + "checking if nzb file is valid and complete");
                            nzbDonkey.checkNZBfile(response).then(function(result) {
                                nzbDonkey.logging(nzbDonkey.settings.searchengines[i].name + ": " + "the nzb file seems to be complete");
                                nzbDonkey.logging(nzbDonkey.settings.searchengines[i].name + ": " + "files: [" + result.totalFiles + "/" + result.expectedFiles + "] / segments: (" + result.totalSegments + "/" + result.expectedSegments + ")" );
                                resolve(response);
                            }).catch(function(e){
                                nzbDonkey.logging(nzbDonkey.settings.searchengines[i].name + ": " + e.toString(), true);
                                reject(e);
                            });
                        }).catch(function(e) {
                            // if the download failed, reject
                            nzbDonkey.logging(nzbDonkey.settings.searchengines[i].name + ": " + "an error occurred while trying to download the nzb file", true);
                            nzbDonkey.logging(e.toString(), true);
                            reject(new Error(nzbDonkey.settings.searchengines[i].name + ": " + "an error occurred while trying to download the nzb file"));
                        });
                    } else {
                        // if we have no result, reject
                        nzbDonkey.logging(nzbDonkey.settings.searchengines[i].name + ": " + "no nzb file found", true);
                        reject(new Error(nzbDonkey.settings.searchengines[i].name + ": " + "no nzb file found"));
                    }
                }).catch(function(e) {
                    // if we have no response, reject
                    nzbDonkey.logging(nzbDonkey.settings.searchengines[i].name + ": " + "an error occurred while searching for the nzb file", true);
                    nzbDonkey.logging(e.toString(), true);
                    reject(new Error(nzbDonkey.settings.searchengines[i].name + ": " + "an error occurred while searching for the nzb file"));
                });

            });
        }
    }

    // return a promise
    return new Promise(function(resolve, reject) {

        // lets "race" the promises and get the result from the first resolved promise
        Promise.any(getNZB).then(function(response) {
            // resolve with the nzbFile
            nzb.file = response;
            resolve(nzb);
        }).catch(function(e) {
            // if we have no results, reject
            nzbDonkey.logging("no search engine returned any usable result", true);
            reject(new Error("no search engine returned any usable result"));
        });

    });

}

// function to test the connection to NZBGet
nzbDonkey.testconnection.nzbget = function() {

    nzbDonkey.logging("testing connection to to NZBGet");

    return new Promise(function(resolve, reject) {

        chrome.cookies.getAll({
            domain: nzbDonkey.settings.nzbget.host
        }, function(cookies) {
            // first remove all cookies set by NZBGet to get a real test if connection is possible
            for (var i = 0; i < cookies.length; i++) {
                chrome.cookies.remove({
                    url: nzbDonkey.settings.nzbget.scheme + "://" + nzbDonkey.settings.nzbget.host + cookies[i].path,
                    name: cookies[i].name
                });
            }

            var options = {
                "scheme": nzbDonkey.settings.nzbget.scheme,
                "host": nzbDonkey.settings.nzbget.host,
                "port": nzbDonkey.settings.nzbget.port,
                "username": nzbDonkey.settings.nzbget.username,
                "password": nzbDonkey.settings.nzbget.password,
                "basepath": "jsonrpc/",
                "responseType": "text",
                "timeout": 5000
            };

            options.data = JSON.stringify({
                "version": "1.1",
                "id": 1,
                "method": "version"
            });

            nzbDonkey.xhr(options).then(function(result) {
                var response = JSON.parse(result);
                if (isset(() => response.result)) {
                    nzbDonkey.logging("NZBGet responded with a success code");
                    resolve("Successfully connected to NZBGet!");
                } else {
                    throw Error("NZBGet responded with an error code");
                }
            }).catch(function(e) {
                nzbDonkey.logging("an error occurred while connection to NZBGet", true);
                nzbDonkey.logging(e.toString(), true);
                reject(new Error("An error occurred while connection to NZBGet" + "\n" + e.toString()));
            });
        });

    });

}

// function to push the nzb file to NZBGet
nzbDonkey.execute.nzbget = function(nzb) {

    nzbDonkey.logging("pushing the nzb file to NZBGet");

    return new Promise(function(resolve, reject) {

        var options = {
            "scheme": nzbDonkey.settings.nzbget.scheme,
            "host": nzbDonkey.settings.nzbget.host,
            "port": nzbDonkey.settings.nzbget.port,
            "username": nzbDonkey.settings.nzbget.username,
            "password": nzbDonkey.settings.nzbget.password,
            "basepath": "jsonrpc/",
            "responseType": "text",
            "timeout": 120000
        };
        var params = [
            nzb.title, // Filename
            b64EncodeUnicode(nzb.file), // Content (NZB File)
            nzb.category, // Category
            0, // Priority
            false, // AddToTop
            nzbDonkey.settings.nzbget.addPaused, // AddPaused
            "", // DupeKey
            0, // DupeScore
            "Force", // DupeMode
            [{
                    "*unpack:password": nzb.password
                } // Post processing parameter: Password
            ]
        ];
        options.data = JSON.stringify({
            "version": "1.1",
            "id": 1,
            "method": "append",
            "params": params
        });
        nzbDonkey.xhr(options).then(function(result) {
            var response = JSON.parse(result);
            if (isset(() => response.result) && response.result > 0) {
                nzbDonkey.logging("NZBGet responded with a success code");
                nzbDonkey.logging("the nzb file was successfully pushed to NZBGet");
                resolve(nzb.title + " successfully pushed to NZBGet");
            } else {
                throw Error("NZBGet responded with an error code");
            }
        }).catch(function(e) {
            nzbDonkey.logging("an error occurred while pushing the nzb file to NZBGet", true);
            nzbDonkey.logging(e.toString(), true);
            reject(new Error("an error occurred while pushing the nzb file to NZBGet"));
        });

    });

}

// function to test the connection to SABnzbd
nzbDonkey.testconnection.sabnzbd = function(nzb) {

    nzbDonkey.logging("testing connection to SABnzbd");

    return new Promise(function(resolve, reject) {

        var options = {
            "scheme": nzbDonkey.settings.sabnzbd.scheme,
            "host": nzbDonkey.settings.sabnzbd.host,
            "port": nzbDonkey.settings.sabnzbd.port,
            "basepath": "sabnzbd/",
            "path": "api",
            "responseType": "text",
            "timeout": 5000
        };
        var formData = new FormData();
        formData.append("mode", "addurl");
        formData.append("output", "json");
        formData.append("apikey", nzbDonkey.settings.sabnzbd.apiKey);
        formData.append("name", "");
        options.data = formData;
        nzbDonkey.xhr(options).then(function(result) {
            var response = JSON.parse(result);
            if (isset(() => response.status)) {
                nzbDonkey.logging("SABnzbd responded with a success code");
                resolve("Successfully connected to SABnzbd!");
            } else {
                throw Error(response.error);
            }
        }).catch(function(e) {
            nzbDonkey.logging("an error occurred while connection to SABnzbd", true);
            nzbDonkey.logging(e.toString(), true);
            reject(new Error("An error occurred while connection to SABnzbd" + "\n" + e.toString()));
        });

    });

}

// function to push the nzb file to SABnzbd
nzbDonkey.execute.sabnzbd = function(nzb) {

    nzbDonkey.logging("pushing the nzb file to SABnzbd");

    return new Promise(function(resolve, reject) {

        var options = {
            "scheme": nzbDonkey.settings.sabnzbd.scheme,
            "host": nzbDonkey.settings.sabnzbd.host,
            "port": nzbDonkey.settings.sabnzbd.port,
            "basepath": "sabnzbd/",
            "path": "api",
            "responseType": "text",
            "timeout": 120000
        };
        var content = new Blob([nzb.file], {
            type: "text/xml"
        });
        var filename = nzb.title;
        if (isset(() => nzb.password) && nzb.password != "") {
            filename += "{{" + nzb.password + "}}";
        }
        var addPaused = (nzbDonkey.settings.sabnzbd.addPaused) ? -2 : -100;
        var formData = new FormData();
        formData.append("mode", "addfile");
        formData.append("output", "json");
        formData.append("apikey", nzbDonkey.settings.sabnzbd.apiKey);
        formData.append("nzbname", filename);
        formData.append("cat", nzb.category);
        formData.append("priority", addPaused);
        formData.append("name", content, filename);
        options.data = formData;
        nzbDonkey.xhr(options).then(function(result) {
            var response = JSON.parse(result);
            if (isset(() => response.status)) {
                nzbDonkey.logging("SABnzbd responded with a success code");
                nzbDonkey.logging("the nzb file was successfully pushed to SABnzbd");
                resolve(nzb.title + " successfully pushed to SABnzbd");
            } else {
                throw Error("SABnzbd responded with an error code");
            }
        }).catch(function(e) {
            nzbDonkey.logging("an error occurred while pushing the nzb file to SABnzbd", true);
            nzbDonkey.logging(e.toString(), true);
            reject(new Error("an error occurred while pushing the nzb file to SABnzbd"));
        });

    });

}

// function to test the connection to Synology DownloadStation
nzbDonkey.testconnection.synology = function(nzb) {

    nzbDonkey.logging("testing connection to Synology DownloadStation");

    return new Promise(function(resolve, reject) {

        var options = {
            "scheme": nzbDonkey.settings.synology.scheme,
            "host": nzbDonkey.settings.synology.host,
            "port": nzbDonkey.settings.synology.port,
            "basepath": "webapi/",
            "path": "query.cgi",
            "parameters": {
                "api": "SYNO.API.Info",
                "version": 1,
                "method": "query",
                "query": "SYNO.API.Auth,SYNO.DownloadStation2.Task"
            },
            "responseType": "text",
            "timeout": 5000
        };
        var SynoData = {};
        nzbDonkey.xhr(options).then(function(result) {
            SynoData = JSON.parse(result);
            if (isset(() => SynoData.success)) {
                options.path = SynoData.data['SYNO.API.Auth'].path;
                options.parameters = {
                    "api": "SYNO.API.Auth",
                    "version": SynoData.data['SYNO.API.Auth'].maxVersion,
                    "method": "login",
                    "account": nzbDonkey.settings.synology.username,
                    "passwd": nzbDonkey.settings.synology.password,
                    "session": (~~(Math.random() * 1e9)).toString(36),
                    "format": "cookie"
                };
                return nzbDonkey.xhr(options);
            } else {
                throw Error("Synology DownloadStation responded with error code " + SynoData.error.code);
            }
        }).then(function(result) {
            var SynoAuthData = JSON.parse(result);
            if (isset(() => SynoAuthData.success)) {
                nzbDonkey.logging("Synology DownloadStation responded with a success code");
                resolve("Successfully connected to Synology DownloadStation!");
            } else {
                throw Error("Synology DownloadStation responded with error code " + SynoAuthData.error.code);
            }
        }).catch(function(e) {
            nzbDonkey.logging("an error occurred while connection to Synology DownloadStation", true);
            nzbDonkey.logging(e.toString(), true);
            reject(new Error("An error occurred while connection to Synology DownloadStation" + "\n" + e.toString()));
        });

    });

}

// function to push the nzb file to Synology DownloadStation
nzbDonkey.execute.synology = function(nzb) {

    nzbDonkey.logging("pushing the nzb file to Synology DownloadStation");

    return new Promise(function(resolve, reject) {

        var options = {
            "scheme": nzbDonkey.settings.synology.scheme,
            "host": nzbDonkey.settings.synology.host,
            "port": nzbDonkey.settings.synology.port,
            "basepath": "webapi/",
            "path": "query.cgi",
            "parameters": {
                "api": "SYNO.API.Info",
                "version": 1,
                "method": "query",
                "query": "SYNO.API.Auth,SYNO.DownloadStation2.Task"
            },
            "responseType": "text",
            "timeout": 20000
        };
        var SynoData = {};
        nzbDonkey.xhr(options).then(function(result) {
           SynoData = JSON.parse(result);
            if (isset(() => SynoData.success)) {
                options.path = SynoData.data['SYNO.API.Auth'].path;
                options.parameters = {
                    "api": "SYNO.API.Auth",
                    "version": SynoData.data['SYNO.API.Auth'].maxVersion,
                    "method": "login",
                    "account": nzbDonkey.settings.synology.username,
                    "passwd": nzbDonkey.settings.synology.password,
                    "session": (~~(Math.random() * 1e9)).toString(36),
                    "format": "cookie"
                };
                return nzbDonkey.xhr(options);
            } else {
                throw Error("Synology Diskstation responded with error code " + SynoData.error.code);
            }
        }).then(function(result) {
            var SynoAuthData = JSON.parse(result);
            if (isset(() => SynoAuthData.success)) {
                options.path = SynoData.data['SYNO.DownloadStation2.Task'].path;
                delete options.parameters;
                var content = new Blob([nzb.file], {
                    type: "text/xml"
                });
                var formData = new FormData();
                formData.append("api", "SYNO.DownloadStation2.Task");
                formData.append("method", "create");
                formData.append("version", SynoData.data['SYNO.DownloadStation2.Task'].maxVersion);
                formData.append("type", "\"file\"");
                formData.append("destination", "\"\"");
                formData.append("create_list", false);
                formData.append("mtime", Date.now());
                formData.append("size", content.size);
                formData.append("file", "[\"torrent\"]");
                formData.append("extract_password", '"' + nzb.password + '"');
                formData.append("_sid", SynoAuthData.data.sid);
                formData.append("torrent", content, nzb.title + ".nzb");
                options.data = formData;
                options.timeout = 120000;
                return nzbDonkey.xhr(options);
            } else {
                throw Error("Synology Diskstation responded with error code " + SynoAuthData.error.code);
            }
        }).then(function(result) {
            var SynoResponseData = JSON.parse(result);
            if (isset(() => SynoResponseData.success)) {
                nzbDonkey.logging("Synology Diskstation responded with a success code");
                nzbDonkey.logging("the nzb file was successfully pushed to Synology DownloadStation");
                resolve(nzb.title + " successfully pushed to Synology DownloadStation");
            } else {
                throw Error("Synology Diskstation responded with error code " + SynoResponseData.error.code);
            }
        }).catch(function(e) {
            nzbDonkey.logging("an error occurred while pushing the nzb file to Synology DownloadStation", true);
            nzbDonkey.logging(e.toString(), true);
            reject(new Error("an error occurred while pushing the nzb file to Synology DownloadStation"));
        });

    });

}

// function to download the nzb file to the local file system
nzbDonkey.execute.download = function(nzb) {

    nzbDonkey.logging("start preparing the nzb file download");

    return new Promise(function(resolve, reject) {

        var filename = ""
        if (nzbDonkey.settings.download.defaultPath != "") {
            filename += nzbDonkey.settings.download.defaultPath.replace(/^[\/]*(.*)[\/]*$/, '$1') + "/";
        }
        if (isset(() => nzb.category) && nzb.category != "" && nzbDonkey.settings.download.categoryFolder) {
            // sanitize category
            var category = nzb.category.replace(/[/\\?%*:|"<>\r\n\t\0\v\f\u200B]/g, "");
            filename += category + "/";
        }
        filename += nzb.title;
        if (isset(() => nzb.password) && nzb.password != "") {
            if (!/[\/\\%*:"?~<>*|]/.test(nzb.password)) {
                filename += "{{" + nzb.password + "}}";
            } else {
                nzbDonkey.logging("the Password does contain invalid characters and cannot be included in the filename");
                var passwordWarning = "CAUTION: The Password did contain invalid characters and was not included in the filename";
            }
        }
        filename += ".nzb";
        nzbDonkey.logging("filename is set to" + ": " + filename);
        var blob = new Blob([nzb.file], {
            type: "text/xml;charset=utf-8"
        })
        chrome.downloads.download({
            url: URL.createObjectURL(blob),
            filename: filename,
            saveAs: nzbDonkey.settings.download.saveAs,
            conflictAction: "uniquify"
        }, function(id) {
            if (typeof id == "undefined") {
                nzbDonkey.logging("failed to initiate the download");
                reject(new Error(chrome.runtime.lastError.message));
            }
            else {
                nzbDonkey.logging("initiated the download");
                nzbDonkey.notification("Starting to downloading nzb file" + ":\n" + filename);
            }
        });
        chrome.downloads.onChanged.addListener(function(details) {
            if (isset(() => details.state.current)) {
                if (details.state.current == "complete") {
                    nzbDonkey.logging("download completed");
                    var notificationString = "The nzb file was successfully downloaded to:" + " " + filename;
                    if (isset(() => passwordWarning)) {
                        notificationString += '\n' + passwordWarning;
                    }
                    resolve(notificationString);
                }
                else if (details.state.current == "interrupted") {
                    if (isset(() => details.error.current)) {
                        if (details.error.current.match(/^user/i)) {
                            nzbDonkey.logging("download canceled by the user");
                            reject(new Error("download of nzb file" + " " + filename + " " + "was canceled"));
                        }
                        else if (details.error.current.match(/^file/i)) {
                            nzbDonkey.logging("error while saving the nzb file to disk");
                            reject(new Error("error while saving the nzb file" + " " + filename + " " + "to disk"));
                        }
                        else {
                            nzbDonkey.logging("error while downloading the nzb file");
                            reject(new Error("error while downloading the nzb file" + " " + filename));
                        }
                        nzbDonkey.logging(details.error.current, true);
                    }
                }
            }
        });

    });

}

// function to process the nzb title
nzbDonkey.processTitle = function(nzb) {

    nzbDonkey.logging("processing the nzb title");

    return new Promise(function(resolve, reject) {

        // sanitize title
        nzb.title = nzb.title.replace(/[/\\?%*:|"<>\r\n\t\0\v\f\u200B]/g, "");

        // convert periods to spaces or vice versa
        switch (nzbDonkey.settings.general.processTitel) {
            case "periods":
                nzb.title = nzb.title.replace(/\s/g, ".");
                break;

            case "spaces":
                nzb.title = nzb.title.replace(/\./g, " ");
                break;

        }
        resolve(nzb);

    });

}

// function to set the category
nzbDonkey.categorize = function(nzb) {

    nzbDonkey.logging("setting the category");

    return new Promise(function(resolve, reject) {

        nzb.category = "";
        switch (nzbDonkey.settings.category.categories) {
            case "automatic":
                nzbDonkey.logging("testing for automatic categories");
                for (var i = 0; i < nzbDonkey.settings.category.automaticCategories.length; i++) {
                    var re = new RegExp(nzbDonkey.settings.category.automaticCategories[i].pattern, "i");
                    nzbDonkey.logging("testing for category " + nzbDonkey.settings.category.automaticCategories[i].name);
                    if (isset(() => nzb.title) && re.test(nzb.title)) {
                        nzbDonkey.logging("match found while testing for category " + nzbDonkey.settings.category.automaticCategories[i].name);
                        nzb.category = nzbDonkey.settings.category.automaticCategories[i].name;
                        break;
                    }
                }
                if (nzb.category == "") {
                    nzbDonkey.logging("testing for automatic categories did not match");
                    nzbDonkey.logging("setting category to default category");
                    nzb.category = nzbDonkey.settings.category.defaultCategory;
                }
                break;

            case "default":
                nzbDonkey.logging("setting category to default category");
                nzb.category = nzbDonkey.settings.category.defaultCategory;
                break;
        }
        nzbDonkey.logging("category set to: " + nzb.category);
        resolve(nzb);

    });

}

// function to check the nzb file
nzbDonkey.checkNZBfile = function(nzb, CompletenessCheck = true) {

    return new Promise(function(resolve, reject) {

        // convert the nzb file from XML into JSON for simpler handling
        // xmlToJSON from https://github.com/metatribal/xmlToJSON
        var nzbFile = xmlToJSON.parseString(nzb);

        // check if it is actually a nzb file
        if (isset(() => nzbFile.nzb) && typeof nzbFile.nzb == "object") {
            // if yes, check if it does contain files
            if (isset(() => nzbFile.nzb[0].file) && typeof nzbFile.nzb[0].file == "object") {

                // if set in the settings, check for completeness
                if (nzbDonkey.settings.general.checkNZBfiles && CompletenessCheck) {
                    
                    // Threshold value for missing files or segments for rejection
                    var fileThreshold = nzbDonkey.settings.general.fileThreshold;
                    var segmentThreshold = nzbDonkey.settings.general.segmentThreshold;

                    // RegExp for the expected amounts of files, expected amount of files is in capturing group 2
                    var reExpectedFiles = new RegExp('.*?[(\\[](\\d{1,4})\\/(\\d{1,4})[)\\]].*?\\((\\d{1,4})\\/(\\d{1,5})\\)', "i");

                    // RegExp for the expected segments per file, expected amount of segments is in capturing group 2
                    var reExpectedSegments = new RegExp('.*\\((\\d{1,4})\\/(\\d{1,5})\\)', "i");

                    var totalFiles = 0;
                    var expectedFiles = 0;

                    var totalSegments = 0;
                    var expectedSegments = 0;

                    // get the amount of files
                    totalFiles = nzbFile.nzb[0].file.length;

                    // loop through the files
                    for (let file of nzbFile.nzb[0].file) {
                        // check if the file subject contains the expected amount of files
                        // if not, the expectedFiles counter will remain 0
                        if (isset(() => file._attr.subject._value) && file._attr.subject._value != "") {
                            if (reExpectedFiles.test(file._attr.subject._value)) {
                                // check if the found expected amount of files is bigger than an already found one
                                // like this the highest number will be used e.g. in cases when an uploader subsequently has added more files
                                if (Number(file._attr.subject._value.match(reExpectedFiles)[2]) > expectedFiles) {
                                    // if yes, set expectedFiles to the found value
                                    expectedFiles = Number(file._attr.subject._value.match(reExpectedFiles)[2]);
                                }
                            }

                            var expectedSegmentsPerFile = 0; 

                            // check if the file subject contains the expected amount of segments for this file
                            if (reExpectedSegments.test(file._attr.subject._value)) {
                                // if yes, set the value
                                expectedSegmentsPerFile = Number(file._attr.subject._value.match(reExpectedSegments)[2]);
                            }
                            else {
                                // if not, we loop through the segments and get the highest number from the number attribute
                                // this is not very accurate but still in some cases might give an indication for missing segments
                                if (file.segments[0].segment == "object") {
                                    for (segment of file.segments[0].segment) {
                                        if (isset(() => segment._attr.number._value) && segment._attr.number._value != "") {
                                            if (Number(segment._attr.number._value) > expectedSegmentsPerFile) {
                                                expectedSegmentsPerFile = Number(segment._attr.number._value);
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // add the segments of this file to the total amount of segments
                        if (isset(() => file.segments[0].segment) && typeof file.segments[0].segment == "object") {
                            totalSegments += file.segments[0].segment.length;
                        }

                        // add the expected segments for this file to the total amount of expected segments
                        expectedSegments += expectedSegmentsPerFile;

                    }
                    // check if we have enough files and segments 
                    if ( (expectedFiles - totalFiles <=  fileThreshold) && (totalSegments >= expectedSegments * (1 - segmentThreshold)) ) {
                        // if yes, the nzb file is most probably complete -> resolve
                        var result = {
                            "expectedFiles": expectedFiles,
                            "totalFiles": totalFiles,
                            "expectedSegments": expectedSegments,
                            "totalSegments": totalSegments
                        };
                        resolve(result);
                    }
                    // if not, the nzb file is obviously incomplete -> reject
                    else {
                        if (expectedFiles - totalFiles > fileThreshold) {
                            var missingFiles = expectedFiles - totalFiles;
                            reject(new Error("the nzb file is incomplete with" + " " + missingFiles + " " + "missing files"));
                        }
                        else if (totalSegments < expectedSegments * (1 - segmentsThreshold)) {
                            var missingSegments = expectedSegments - totalSegments;
                            var missingSegmentsPercent = Math.round((missingSegments / expectedSegments * 100)*100)/100;
                            reject(new Error("the nzb file is incomplete with" + " " + missingSegments + " (" + missingSegmentsPercent + "%) " + "missing segments"));
                        }
                        reject(new Error("the nzb file is incomplete"));
                    }

                }
                else {
                    resolve(true);
                }

            }
            // if the nzb file does not contain any files, reject
            else {
                reject(new Error("the nzb file does not contain any files"));
            }
        }
        // if it is not a nzb file, reject
        else {
            reject(new Error("this is not a valid nzb file"));
        }

    });

}

// function to process the nzb file
nzbDonkey.processNZBfile = function(nzb) {

    nzbDonkey.logging("processing the nzb file");

    return new Promise(function(resolve, reject) {

        // add the meta data to the nzb file
        var nzbMetadata = '';
        if (isset(() => nzb.title) && nzb.title != "") {
            if (!nzb.title.match(/[&"\'<>]/)) {
                nzbMetadata += '\t<meta type="title">' + nzb.title + '</meta>\n';
                nzbDonkey.logging("nzb file meta data: title tag set to: " + nzb.title);
            } else {
                nzbDonkey.logging("nzb file meta data: could not set title tag due to invalid characters");
            }
        }
        if (isset(() => nzb.password) && nzb.password != "") {
            if (!nzb.password.match(/[&"\'<>]/)) {
                nzbMetadata += '\t<meta type="password">' + nzb.password + '</meta>\n';
                nzbDonkey.logging("nzb file meta data: password tag set to: " + nzb.password);
            } else {
                nzbDonkey.logging("nzb file meta data: could not set password tag due to invalid characters");
            }
        }
        if (isset(() => nzb.category) && nzb.category != "") {
            if (!nzb.category.match(/[&"\'<>]/)) {
                nzbMetadata += '\t<meta type="category">' + nzb.category + '</meta>\n';
                nzbDonkey.logging("nzb file meta data: category tag set to: " + nzb.category);
            } else {
                nzbDonkey.logging("nzb file meta data: could not set category tag due to invalid characters");
            }
        }
        nzbDonkey.logging("adding the meta data to the nzb file");
        if (nzb.file.match(/<head>/i)) {
            nzb.file = nzb.file.replace(/<head>/i, '<head>\n' + nzbMetadata);
        } else {
            nzb.file = nzb.file.replace(/(<nzb.*>)/i, '$1\n<head>\n' + nzbMetadata + '</head>');
        }
        resolve(nzb);

    });

}

// function for the console logging
nzbDonkey.logging = function(loggingText, isError = false) {
    if (nzbDonkey.settings.general.debug) {
        if (isError) {
            console.error("NZBDonkey - ERROR: " + loggingText);
        } else {
            console.info("NZBDonkey - INFO: " + loggingText);
        }
    }
}

// function to show the desktop notification
nzbDonkey.notification = function(message, type = "info") {
    if (nzbDonkey.settings.general.showNotifications || type == "error") {
        var iconURL = {
            "info": "icons/NZBDonkey_128.png",
            "error": "icons/NZBDonkey_error_128.png",
            "success": "icons/NZBDonkey_success_128.png"
        };
        nzbDonkey.logging("sending desktop notification");
        chrome.notifications.create("NZBDonkey_notification", {
            type: 'basic',
            iconUrl: iconURL[type],
            title: 'NZBDonkey',
            message: message
        });
    }
}

// function for the xmlHttpRequest
nzbDonkey.xhr = function(options) {

    /*
    	options = {
    		"url":  url,
    		"scheme": scheme,
    		"host": host,
    		"port": port,
    		"username": username,
    		"password": password,
    		"basepath": basepath,
    		"path": path,
    		"parameters": {
    			"parameter1": value1,
    			"parameter2": value2
    		},
    		"data": data,
    		"responseType": responseType,
    		"timeout": timeout
    	}
    	
    	nzbDonkey.xhr(options).then(function(result) {
    		console.log(result);
    	}).catch(function(error) {
    		console.log(error);
    	});
    */

    if (options.url) {
        var url = options.url;
    } else {
        var url = "";
        if (options.scheme) {
            url += options.scheme + "://";
        }
        if (options.host) {
            url += options.host.match(/^(?:https{0,1}:\d?\/\/)?([^\/:]+)/i)[1];
        }
        if (options.port) {
            url += ":" + options.port.match(/[^\d]*(\d*)[^\d]*/)[1];
        }
        if (url != "") {
            url += "/";
        }
        if (options.basepath) {
            url += options.basepath;
        }
        if (options.path) {
            url += options.path;
        }
        if (options.parameters) {
            var str = "";
            for (var key in options.parameters) {
                if (str != "") {
                    str += "&";
                }
                str += key + "=" + encodeURIComponent(options.parameters[key]);
            }
            url += "?" + str;
        }
    }
    var method = options.data ? "POST" : "GET";

    return new Promise(function(resolve, reject) {

        var request = new XMLHttpRequest();
        if (options.responseType) {
            request.responseType = options.responseType;
        }
        request.onreadystatechange = function() {
            if (request.readyState === XMLHttpRequest.DONE) {
                if (request.status === 200) {
                    resolve(request.response);
                } else {
                    var errorMsg = "the server responded with error code " + request.status;
                    if (request.statusText) {
                        errorMsg += " (" + request.statusText + ")";
                    }
                    reject(new Error(errorMsg));
                }
            }
        };
        request.onerror = function() {
            reject(new Error("unknown network error"));
        };
        request.ontimeout = function() {
            reject(new Error("connection timed out"));
        };
        request.open(method, url, true);
        if (options.username) {
            request.setRequestHeader("Authorization", "Basic " + b64EncodeUnicode(options.username + ":" + options.password));
        }
        request.timeout = options.timeout;
        request.setRequestHeader("X-NZBDonkey", true)
        request.send(options.data);

    });

}

// actual start of the script
// load the settings and initialize the script
nzbDonkey.loadSettings().then(function() {
    nzbDonkey.initializeScript().then(function() {
        nzbDonkey.logging("the script was initialized successfully");
    }).catch(function(e){
        nzbDonkey.logging("the script failed to initialize", true);
        nzbDonkey.logging(e, true);
        nzbDonkey.notification("The script failed to initialize!\n" + e.toString() + "\nPlease restart the Browser.", "error");
    });
}).catch(function(e) {
    nzbDonkey.settingsError();
});

/*------------------*/
// helper functions //
/*------------------*/

// function for correct btoa encoding for utf8 strings
// from https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/Base64_encoding_and_decoding 
function b64EncodeUnicode(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
        return String.fromCharCode(parseInt(p1, 16));
    }));
}

// function to analyze an URL
function analyzeURL(u) {
    var url = {};
    url.scheme = decodeURIComponent(u.match(/^(([^:/?#]+):)?(\/{0,2}(([^/?#:]*)(:(\d*))?))?([^?#]*)(\?([^#]*))?(#(.*))?/)[2]);
    url.domain = decodeURIComponent(u.match(/^(([^:/?#]+):)?(\/{0,2}(([^/?#:]*)(:(\d*))?))?([^?#]*)(\?([^#]*))?(#(.*))?/)[5]);
    url.port = decodeURIComponent(u.match(/^(([^:/?#]+):)?(\/{0,2}(([^/?#:]*)(:(\d*))?))?([^?#]*)(\?([^#]*))?(#(.*))?/)[7]);
    url.fullpath = decodeURIComponent(u.match(/^(([^:/?#]+):)?(\/{0,2}(([^/?#:]*)(:(\d*))?))?([^?#]*)(\?([^#]*))?(#(.*))?/)[8]);
    url.basedomain = url.domain.match(/[^.]*\.[^.]*$/);
    url.query = u.match(/^(([^:/?#]+):)?(\/{0,2}(([^/?#:]*)(:(\d*))?))?([^?#]*)(\?([^#]*))?(#(.*))?/)[10];
    if (typeof url.query != "undefined") {
        var parameter = [];
        parameter = url.query.match(/[^&;=]*=[^&;=]*/g);
        if (parameter.length > 0) {
            url.parameters = {};
            for (var i = 0; i < parameter.length; i++) {
                url.parameters[decodeURIComponent(parameter[i].match(/([^=]*)=/)[1])] = decodeURIComponent(parameter[i].match(/=([^=]*)/)[1]) ;
            }
        }
    }
    return url;
}

// function to generate the form Data
function generateFormData(data) {
    var formData = new FormData;
    if (typeof data == "object") {
        for (var key in data) {
            if (isset(() => data[key])) {
                if (typeof data[key] != "object") {
                    formData.append(key, data[key]);
                }
                else {
                    formData.append(key, data[key][0]);
                }
            }
        }
        return formData;
    }
    else {
        throw new Error("generateFormData: no object provided");
    }
}

// error proof function to check if nested objects are set without throwing an error if parent object is undefined
// from https://stackoverflow.com/questions/2281633/javascript-isset-equivalent/2281671
// call it: isset(() => variable.to.be.checked)
/**
 * Checks to see if a value is set.
 *
 * @param {Function} accessor Function that returns our value
 */
function isset (accessor) {
  try {
    // Note we're seeing if the returned value of our function is not
    // undefined
    return typeof accessor() !== 'undefined'
  } catch (e) {
    // And we're able to catch the Error it would normally throw for
    // referencing a property of undefined
    return false
  }
}