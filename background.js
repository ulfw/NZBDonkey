// listen for the on Installed event
chrome.runtime.onInstalled.addListener(function(details) {
    if (details.OnInstalledReason != 'chrome_update') {
        // delete the stored searchengines settings to force loading the default settings
        chrome.storage.sync.remove('searchengines.searchengines');
        // open the options page to have the default settings saved
        chrome.runtime.openOptionsPage();
    }
});

// Set up context menu on script start
chrome.contextMenus.create({
    title: "Get NZB file",
    contexts: ["link", "selection"],
    id: "NZBDonkey"
});

// Add listener for clicks on the context menu
chrome.contextMenus.onClicked.addListener(function(info, tab) {

    // first we load the settings
    nzbDonkey.loadSettings().then(function() {
        // if the context menu was clicked on a selection
        if (info.selectionText) {
            nzbDonkey.logging("NZBDonkey was started with a right click on a selection");
            nzbDonkey.logging("analyzing selection");
            chrome.tabs.sendMessage(tab.id, {
                nzbDonkeyAnalyzeSelection: true
            }, function(nzb) {
                if (!nzb.cancle) {
                    nzbDonkey.logging("analysis of selection finished");
                    nzbDonkey.processAnalysedSelection(nzb).then(function(response) {
                        nzbDonkey.doTheDonkey(response);
                    }).catch(function(e) {
                        nzbDonkey.notification(e.toString(), "error");
                        console.error(e);
                    });
                } else {
                    nzbDonkey.logging("analyzing of selection was canceled");
                }
            });
        }
        // if the context menu was clicked on a link
        else if (info.linkUrl) {
            nzbDonkey.logging("NZBDonkey was started with a right click on a link");
            nzbDonkey.processLink(info.linkUrl).then(function(response) {
                nzbDonkey.doTheDonkey(response);
            }).catch(function(e) {
                nzbDonkey.notification(e.toString(), "error");
                console.error(e);
            });
        }
        else {
            nzbDonkey.logging("NZBDonkey was started with a right click but neither on a link nor on a selection", true);
            nzbDonkey.notification("NZBDonkey was started with a right click but neither on a link nor on a selection", "error");
        }
    }).catch(function(e) {
        nzbDonkey.settingsError();
    });

});

// Add listener for messages from the content or options script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {

    // first we load the settings
    nzbDonkey.loadSettings().then(function() {
        if (request.nzbDonkeyCatchLinks) {
            nzbDonkey.logging("content script has asked whether to catch left clicks on NZBlnk links");
            nzbDonkey.logging("catch left clicks on NZBlnk links is set to" + ": " + nzbDonkeySettings.general.catchLinks);
            sendResponse({
                nzbDonkeyCatchLinks: nzbDonkeySettings.general.catchLinks
            });
        } else if (request.nzbDonkeyTestConnection) {
            nzbDonkey.logging("options script has asked to test the connection to the current execType");
            nzbDonkey.testconnection[nzbDonkeySettings.general.execType]().then(function(response) {
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
        } else if (request.nzbDonkeyNZBLinkURL) {
            nzbDonkey.logging("NZBDonkey was started with a left click on an actual NZBlnk link");
            nzbDonkey.processLink(request.nzbDonkeyNZBLinkURL).then(function(response) {
                nzbDonkey.doTheDonkey(response);
            }).catch(function(e) {
                nzbDonkey.notification(e.toString(), "error");
                console.error(e);
            });
        }
    }).catch(function(e) {
        nzbDonkey.settingsError();
    });

    return true;

});

// settings will be stored in a global variable
var nzbDonkeySettings = {};

// declare all nzbDoneky functions
var nzbDonkey = {};
nzbDonkey.execute = {};
nzbDonkey.testconnection = {};

// function to load the settings
nzbDonkey.loadSettings = function() {

    console.info("NZBDonkey - INFO: trying to load the settings");

    return new Promise(function(resolve, reject) {

        // Fall back to storage.local if storage.sync is not available
        if (chrome.storage.sync) {
            var storage = chrome.storage.sync;
        }
        else {
            var storage = chrome.storage.local;
        }
        storage.get(null, function(obj) {
            for (key in obj) {
                keys = key.split(".");
                if (keys[0] == 'searchengines') {
                    nzbDonkeySettings[keys[1]] = obj[key];
                } else {
                    if (typeof nzbDonkeySettings[keys[0]] === 'undefined') {
                        nzbDonkeySettings[keys[0]] = {};
                    }
                    nzbDonkeySettings[keys[0]][keys[1]] = obj[key];
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

// backbone function of the script
// to be called as soon as we have all information to start searching
nzbDonkey.doTheDonkey = function(nzb) {
    nzbDonkey.notification("Starting to search for" + " " + nzb.title, "info");
    nzbDonkey.searchNZB(nzb).then(function(response) {
        return nzbDonkey.processTitle(response);
    }).then(function(response) {
        return nzbDonkey.categorize(response);
    }).then(function(response) {
        return nzbDonkey.processNZBfile(response);
    }).then(function(response) {
        return nzbDonkey.execute[nzbDonkeySettings.general.execType](response);
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

        if (nzb.header) {
            nzbDonkey.logging("found header tag" + ": " + nzb.header);
            if (nzb.title) {
                nzbDonkey.logging("found title tag" + ": " + nzb.title);
            } else {
                nzbDonkey.logging("no title tag found");
                nzb.title = nzb.header;
                nzbDonkey.logging("setting header as title tag");
            }
            if (nzb.password) {
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
nzbDonkey.processLink = function(url) {

    nzbDonkey.logging("processing clicked link" + ": " + url);

    return new Promise(function(resolve, reject) {
 
        if (url.match(/^nzblnk:/i)) {
            var link = new URL(url);
            var nzb = {};
            if (link.searchParams.get("h")) {
                nzb.header = link.searchParams.get("h");
                nzbDonkey.logging("found header tag" + ": " + nzb.header);
                if (link.searchParams.get("t")) {
                    nzb.title = link.searchParams.get("t");
                    nzbDonkey.logging("found title tag" + ": " + nzb.title);
                } else {
                    nzbDonkey.logging("no title tag found");
                    nzb.title = nzb.header;
                    nzbDonkey.logging("setting header as title tag");
                }
                if (link.searchParams.get("p")) {
                    nzb.password = link.searchParams.get("p");
                    nzbDonkey.logging("found password tag" + ": " + nzb.password);
                } else {
                    nzbDonkey.logging("no password tag found");
                }
                resolve(nzb);
            } else {
                nzbDonkey.logging("no header tag found", true);
                reject(new Error("no header tag found"));
            }
        } else {
            nzbDonkey.logging("this is not a valid NZBlnk link", true);
            reject(new Error("this is not a valid NZBlnk link"));
        }

    });

}

// function to search and download the nzb file
nzbDonkey.searchNZB = function(nzb) {

    nzbDonkey.logging("starting to search for the nzb file on the search engines");

    // prepare the promises for all search engines
    var getNZB = []; // the promise array
    for (let i = 0; i < nzbDonkeySettings.searchengines.length; i++) {
        if (nzbDonkeySettings.searchengines[i].active) { // only use "active" search engines
            getNZB[i] = new Promise(function(resolve, reject) {

                // first search for the nzb header
                let nzbSearchURL = nzbDonkeySettings.searchengines[i].searchURL.replace(/%s/, encodeURI(nzb.header));
                nzbDonkey.logging(nzbDonkeySettings.searchengines[i].name + ": " + "the search url is" + ": " + nzbSearchURL);
                nzbDonkey.logging(nzbDonkeySettings.searchengines[i].name + ": " + "searching for the nzb file");
                let options = {
                    "url": nzbSearchURL,
                    "responseType": "text",
                    "timeout": 30000
                };
                nzbDonkey.xhr(options).then(function(response) {
                    // if we have a response, check if we have a result
                    let re = new RegExp(nzbDonkeySettings.searchengines[i].searchPattern, "i");
                    nzbDonkey.logging(nzbDonkeySettings.searchengines[i].name + ": " + "the search engine returned a results page");
                    nzbDonkey.logging(nzbDonkeySettings.searchengines[i].name + ": " + "search pattern is set to: " + nzbDonkeySettings.searchengines[i].searchPattern);
                    nzbDonkey.logging(nzbDonkeySettings.searchengines[i].name + ": " + "searching for a result in the results page");
                    if (re.test(response)) {
                        // if we have a result, generate the url for the nzb file
                        nzbDonkey.logging(nzbDonkeySettings.searchengines[i].name + ": " + "nzb file found");
                        let nzbDownloadURL = nzbDonkeySettings.searchengines[i].downloadURL.replace(/%s/, response.match(re)[nzbDonkeySettings.searchengines[i].searchGroup]);
                        nzbDonkey.logging(nzbDonkeySettings.searchengines[i].name + ": " + "the nzb file download url is" + ": " + nzbDownloadURL);
                        nzbDonkey.logging(nzbDonkeySettings.searchengines[i].name + ": " + "trying to download the nzb file");
                        // and download the nzb file
                        let options = {
                            "url": nzbDownloadURL,
                            "responseType": "text",
                            "timeout": 180000
                        };
                        nzbDonkey.xhr(options).then(function(response) {
                            // if we have a response, check if it is a nzb file and if it is complete
                            nzbDonkey.logging(nzbDonkeySettings.searchengines[i].name + ": " + "checking if nzb file is valid and complete");
                            nzbDonkey.checkNZBfile(response).then(function(result) {
                                nzbDonkey.logging(nzbDonkeySettings.searchengines[i].name + ": " + "the nzb file seems to be complete");
                                nzbDonkey.logging(nzbDonkeySettings.searchengines[i].name + ": " + "files: [" + result.totalFiles + "/" + result.expectedFiles + "] / segments: (" + result.totalSegments + "/" + result.expectedSegments + ")" );
                                resolve(response);
                            }).catch(function(e){
                                nzbDonkey.logging(nzbDonkeySettings.searchengines[i].name + ": " + e.toString(), true);
                                reject(e);
                            });
                        }).catch(function(e) {
                            // if the download failed, reject
                            nzbDonkey.logging(nzbDonkeySettings.searchengines[i].name + ": " + "an error occurred while trying to download the nzb file", true);
                            nzbDonkey.logging(e.toString(), true);
                            reject(new Error(nzbDonkeySettings.searchengines[i].name + ": " + "an error occurred while trying to download the nzb file"));
                        });
                    } else {
                        // if we have no result, reject
                        nzbDonkey.logging(nzbDonkeySettings.searchengines[i].name + ": " + "no nzb file found", true);
                        reject(new Error(nzbDonkeySettings.searchengines[i].name + ": " + "no nzb file found"));
                    }
                }).catch(function(e) {
                    // if we have no response, reject
                    nzbDonkey.logging(nzbDonkeySettings.searchengines[i].name + ": " + "an error occurred while searching for the nzb file", true);
                    nzbDonkey.logging(e.toString(), true);
                    reject(new Error(nzbDonkeySettings.searchengines[i].name + ": " + "an error occurred while searching for the nzb file"));
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
            domain: nzbDonkeySettings.nzbget.host
        }, function(cookies) {
            // first remove all cookies set by NZBGet to get a real test if connection is possible
            for (var i = 0; i < cookies.length; i++) {
                chrome.cookies.remove({
                    url: nzbDonkeySettings.nzbget.scheme + "://" + nzbDonkeySettings.nzbget.host + cookies[i].path,
                    name: cookies[i].name
                });
            }

            var options = {
                "scheme": nzbDonkeySettings.nzbget.scheme,
                "host": nzbDonkeySettings.nzbget.host,
                "port": nzbDonkeySettings.nzbget.port,
                "username": nzbDonkeySettings.nzbget.username,
                "password": nzbDonkeySettings.nzbget.password,
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
                if (response.result) {
                    nzbDonkey.logging("NZBGet responded with a success code");
                    resolve("Successfully connected to NZBGet!");
                } else {
                    throw Error("NZBGet responded with an error code");
                }
            }).catch(function(e) {
                nzbDonkey.logging("an error occurred while connection to NZBGet", true);
                nzbDonkey.logging(e.toString(), true);
                reject("An error occurred while connection to NZBGet" + "\n" + e.toString());
            });
        });

    });

}

// function to push the nzb file to NZBGet
nzbDonkey.execute.nzbget = function(nzb) {

    nzbDonkey.logging("pushing the nzb file to NZBGet");

    return new Promise(function(resolve, reject) {

        var options = {
            "scheme": nzbDonkeySettings.nzbget.scheme,
            "host": nzbDonkeySettings.nzbget.host,
            "port": nzbDonkeySettings.nzbget.port,
            "username": nzbDonkeySettings.nzbget.username,
            "password": nzbDonkeySettings.nzbget.password,
            "basepath": "jsonrpc/",
            "responseType": "text",
            "timeout": 120000
        };
        var params = [
            nzb.title, // Filename
            nzbDonkey.b64EncodeUnicode(nzb.file), // Content (NZB File)
            nzb.category, // Category
            0, // Priority
            false, // AddToTop
            nzbDonkeySettings.nzbget.addPaused, // AddPaused
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
            if (response.result > 0) {
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
            "scheme": nzbDonkeySettings.sabnzbd.scheme,
            "host": nzbDonkeySettings.sabnzbd.host,
            "port": nzbDonkeySettings.sabnzbd.port,
            "basepath": "sabnzbd/",
            "path": "api",
            "responseType": "text",
            "timeout": 5000
        };
        var formData = new FormData();
        formData.append("mode", "addurl");
        formData.append("output", "json");
        formData.append("apikey", nzbDonkeySettings.sabnzbd.apiKey);
        formData.append("name", "");
        options.data = formData;
        nzbDonkey.xhr(options).then(function(result) {
            var response = JSON.parse(result);
            if (response.status) {
                nzbDonkey.logging("SABnzbd responded with a success code");
                resolve("Successfully connected to SABnzbd!");
            } else {
                throw Error(response.error);
            }
        }).catch(function(e) {
            nzbDonkey.logging("an error occurred while connection to SABnzbd", true);
            nzbDonkey.logging(e.toString(), true);
            reject("An error occurred while connection to SABnzbd" + "\n" + e.toString());
        });

    });

}

// function to push the nzb file to SABnzbd
nzbDonkey.execute.sabnzbd = function(nzb) {

    nzbDonkey.logging("pushing the nzb file to SABnzbd");

    return new Promise(function(resolve, reject) {

        var options = {
            "scheme": nzbDonkeySettings.sabnzbd.scheme,
            "host": nzbDonkeySettings.sabnzbd.host,
            "port": nzbDonkeySettings.sabnzbd.port,
            "basepath": "sabnzbd/",
            "path": "api",
            "responseType": "text",
            "timeout": 120000
        };
        var content = new Blob([nzb.file], {
            type: "text/xml"
        });
        var filename = nzb.title;
        if (nzb.password != "") {
            filename += "{{" + nzb.password + "}}";
        }
        var addPaused = (nzbDonkeySettings.sabnzbd.addPaused) ? -2 : -100;
        var formData = new FormData();
        formData.append("mode", "addfile");
        formData.append("output", "json");
        formData.append("apikey", nzbDonkeySettings.sabnzbd.apiKey);
        formData.append("nzbname", filename);
        formData.append("cat", nzb.category);
        formData.append("priority", addPaused);
        formData.append("name", content, filename);
        options.data = formData;
        nzbDonkey.xhr(options).then(function(result) {
            var response = JSON.parse(result);
            if (response.status) {
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
            "scheme": nzbDonkeySettings.synology.scheme,
            "host": nzbDonkeySettings.synology.host,
            "port": nzbDonkeySettings.synology.port,
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
            if (SynoData.success) {
                options.path = SynoData.data['SYNO.API.Auth'].path;
                options.parameters = {
                    "api": "SYNO.API.Auth",
                    "version": SynoData.data['SYNO.API.Auth'].maxVersion,
                    "method": "login",
                    "account": nzbDonkeySettings.synology.username,
                    "passwd": nzbDonkeySettings.synology.password,
                    "session": (~~(Math.random() * 1e9)).toString(36),
                    "format": "cookie"
                };
                return nzbDonkey.xhr(options);
            } else {
                throw Error("Synology DownloadStation responded with error code " + SynoData.error.code);
            }
        }).then(function(result) {
            var SynoAuthData = JSON.parse(result);
            if (SynoAuthData.success) {
                nzbDonkey.logging("Synology DownloadStation responded with a success code");
                resolve("Successfully connected to Synology DownloadStation!");
            } else {
                throw Error("Synology DownloadStation responded with error code " + SynoAuthData.error.code);
            }
        }).catch(function(e) {
            nzbDonkey.logging("an error occurred while connection to Synology DownloadStation", true);
            nzbDonkey.logging(e.toString(), true);
            reject("An error occurred while connection to Synology DownloadStation" + "\n" + e.toString());
        });

    });

}

// function to push the nzb file to Synology DownloadStation
nzbDonkey.execute.synology = function(nzb) {

    nzbDonkey.logging("pushing the nzb file to Synology DownloadStation");

    return new Promise(function(resolve, reject) {

        var options = {
            "scheme": nzbDonkeySettings.synology.scheme,
            "host": nzbDonkeySettings.synology.host,
            "port": nzbDonkeySettings.synology.port,
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
            if (SynoData.success) {
                options.path = SynoData.data['SYNO.API.Auth'].path;
                options.parameters = {
                    "api": "SYNO.API.Auth",
                    "version": SynoData.data['SYNO.API.Auth'].maxVersion,
                    "method": "login",
                    "account": nzbDonkeySettings.synology.username,
                    "passwd": nzbDonkeySettings.synology.password,
                    "session": (~~(Math.random() * 1e9)).toString(36),
                    "format": "cookie"
                };
                return nzbDonkey.xhr(options);
            } else {
                throw Error("Synology Diskstation responded with error code " + SynoData.error.code);
            }
        }).then(function(result) {
            var SynoAuthData = JSON.parse(result);
            if (SynoAuthData.success) {
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
            if (SynoResponseData.success) {
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
        if (nzbDonkeySettings.download.defaultPath != "") {
            filename += nzbDonkeySettings.download.defaultPath.replace(/^[\/]*(.*)[\/]*$/, '$1') + "/";
        }
        if (nzb.category != "" && nzbDonkeySettings.download.categoryFolder) {
            // sanitize category
            var category = nzb.category.replace(/[/\\?%*:|"<>\r\n\t\0\v\f\u200B]/g, "");
            filename += category + "/";
        }
        filename += nzb.title;
        if (nzb.password != "") {
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
            saveAs: nzbDonkeySettings.download.saveAs,
            conflictAction: "uniquify"
        }, function(id) {
            if (typeof id == "undefined") {
                reject(new Error(chrome.runtime.lastError.message));
            }
            else {
                nzbDonkey.logging("starting the actual download");
                var notificationString = "Downloading nzb file" + ":\n" + filename;
                if (passwordWarning) {
                    notificationString += notificationString + '\n' + passwordWarning;
                }
                resolve(notificationString);
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
        switch (nzbDonkeySettings.general.processTitel) {
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
        switch (nzbDonkeySettings.category.categories) {
            case "automatic":
                nzbDonkey.logging("testing for automatic categories");
                for (var i = 0; i < nzbDonkeySettings.category.automaticCategories.length; i++) {
                    var re = new RegExp(nzbDonkeySettings.category.automaticCategories[i].pattern, "i");
                    nzbDonkey.logging("testing for category " + nzbDonkeySettings.category.automaticCategories[i].name);
                    if (re.test(nzb.title)) {
                        nzbDonkey.logging("match found while testing for category " + nzbDonkeySettings.category.automaticCategories[i].name);
                        nzb.category = nzbDonkeySettings.category.automaticCategories[i].name;
                        break;
                    }
                }
                if (nzb.category == "") {
                    nzbDonkey.logging("testing for automatic categories did not match");
                    nzbDonkey.logging("setting category to default category");
                    nzb.category = nzbDonkeySettings.category.defaultCategory;
                }
                break;

            case "default":
                nzbDonkey.logging("setting category to default category");
                nzb.category = nzbDonkeySettings.category.defaultCategory;
                break;
        }
        nzbDonkey.logging("category set to: " + nzb.category);
        resolve(nzb);

    });

}

// function to check the nzb file
nzbDonkey.checkNZBfile = function(nzb) {

    return new Promise(function(resolve, reject) {

        // convert the nzb file from XML into JSON for simpler handling
        // xmlToJSON from https://github.com/metatribal/xmlToJSON
        var nzbFile = xmlToJSON.parseString(nzb);

        // check if it is actually a nzb file
        if (typeof nzbFile.nzb == "object") {
            // if yes, check if it does contain files
            if (typeof nzbFile.nzb[0].file == "object") {

                // if set in the settings, check for completeness
                if (nzbDonkeySettings.general.checkNZBfiles) {
                    
                    // Threshold value for missing files or segments for rejection
                    var fileThreshold = nzbDonkeySettings.general.fileThreshold;
                    var segmentThreshold = nzbDonkeySettings.general.segmentThreshold;

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
                    for (file of nzbFile.nzb[0].file) {
                        // check if the file subject contains the expected amount of files
                        // if not, the expectedFiles counter will remain 0
                        if (typeof file._attr.subject._value != "undefined") {
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
                                        if (typeof segment._attr.number._value != "undefined") {
                                            if (Number(segment._attr.number._value) > expectedSegmentsPerFile) {
                                                expectedSegmentsPerFile = Number(segment._attr.number._value);
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // add the segments of this file to the total amount of segments
                        if (typeof file.segments[0].segment != "undefined") {
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
        if (typeof nzb.title !== 'undefined') {
            if (!nzb.title.match(/[&"\'<>]/)) {
                nzbMetadata += '\t<meta type="title">' + nzb.title + '</meta>\n';
                nzbDonkey.logging("nzb file meta data: title tag set to: " + nzb.title);
            } else {
                nzbDonkey.logging("nzb file meta data: could not set title tag due to invalid characters");
            }
        }
        if (typeof nzb.password !== 'undefined') {
            if (!nzb.password.match(/[&"\'<>]/)) {
                nzbMetadata += '\t<meta type="password">' + nzb.password + '</meta>\n';
                nzbDonkey.logging("nzb file meta data: password tag set to: " + nzb.password);
            } else {
                nzbDonkey.logging("nzb file meta data: could not set password tag due to invalid characters");
            }
        }
        if (typeof nzb.category !== 'undefined') {
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
    if (nzbDonkeySettings.general.debug) {
        if (isError) {
            console.error("NZBDonkey - ERROR: " + loggingText);
        } else {
            console.info("NZBDonkey - INFO: " + loggingText);
        }
    }
}

// function to show the desktop notification
nzbDonkey.notification = function(message, type = "info") {
    if (nzbDonkeySettings.general.showNotifications || type == "error") {
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
            request.setRequestHeader("Authorization", "Basic " + nzbDonkey.b64EncodeUnicode(options.username + ":" + options.password));
        }
        request.timeout = options.timeout;
        request.send(options.data);

    });

}

// function for correct btoa encoding for utf8 strings
// from https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/Base64_encoding_and_decoding 
nzbDonkey.b64EncodeUnicode = function(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
        return String.fromCharCode(parseInt(p1, 16));
    }));
}

// modifiy the promise prototype to add function "any"
// from https://stackoverflow.com/questions/39940152/get-first-fulfilled-promise
Promise.prototype.invert = function() {
    return new Promise((res, rej) => this.then(rej, res));
};
Promise.any = function(ps) {
    return Promise.all(ps.map((p) => p.invert())).invert();
};