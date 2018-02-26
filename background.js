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
            if (keys[0] == 'searchengines') {
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

            nzbDonkeyNotification("ERROR" + ": " + "the NZB link is missing a header tag" + "\n", true);

            // Logging routine
            nzbLogging("END OF SCRIPT");

        }
    } else {

        // Logging routine
        nzbLogging("ERROR" + ": " + "this is not a NZB link");

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
	if (nzbDonkeySettings.general.showNotifications || isError) {
        nzbLogging("INFO" + ": " + "sending desktop notification");
		chrome.notifications.create("nzbDonkeyNotification", {
            type: 'basic',
            iconUrl: "icons/NZBDonkey_128.png",
            title: 'NZBDonkey',
            message: message
        });
    }
}

   

function searchNZB(nzbHeader, nzbTitle, nzbPassword) {

    var request = [];
    var re = []
    var nzbURL = "";
    var counter = nzbDonkeySettings.searchengines.length;

    // starting a http request for all search engines
    for (var i = 0; i < nzbDonkeySettings.searchengines.length; i++) {
        if (nzbDonkeySettings.searchengines[i].active) { // but only for "active" search engines
            (function(i) {
                request[i] = new XMLHttpRequest();
                request[i].addEventListener('load', function(event) {

                    nzbLogging("INFO" + ": " + nzbDonkeySettings.searchengines[i].name + ": " + "http response code is" + " " + request[i].status);

                    if (request[i].status >= 200 && request[i].status < 300) {
                        re[i] = new RegExp(nzbDonkeySettings.searchengines[i].searchPattern, "i");
                        nzbLogging("INFO" + ": " + nzbDonkeySettings.searchengines[i].name + " search pattern: " + nzbDonkeySettings.searchengines[i].searchPattern);
                        if (re[i].test(request[i].responseText)) {
                            // the first hit will be the winner
                            if (nzbURL == "") {

                                nzbLogging("INFO" + ": " + nzbDonkeySettings.searchengines[i].name + ": " + "NZB file found");

                                nzbURL = nzbDonkeySettings.searchengines[i].downloadURL.replace(/%s/, request[i].responseText.match(re[i])[nzbDonkeySettings.searchengines[i].searchGroup]);

                                nzbLogging("INFO" + ": " + "NZB URL is" + ": " + nzbURL);

                                nzbUrlProcess(nzbURL, nzbTitle, nzbPassword);
                                counter -= 1;
                            } else {

                                nzbLogging("INFO" + ": " + nzbDonkeySettings.searchengines[i].name + ": " + "NZB file found but someone was faster");

                            }

                        } else {

                            nzbLogging("ERROR" + ": " + nzbDonkeySettings.searchengines[i].name + ": " + "Nothing found");
                            counter -= 1;
                            catchError();

                        }
                    } else {

                        nzbLogging("ERROR" + ": " + nzbDonkeySettings.searchengines[i].name + ": " + "Error accessing the server");
                        counter -= 1;
                        catchError();

                    }
                });
                request[i].addEventListener('error', function(event) {
                    nzbLogging("ERROR" + ": " + nzbDonkeySettings.searchengines[i].name + ": " + "http response code is" + " " + request[i].status);
                    nzbLogging("ERROR" + ": " + nzbDonkeySettings.searchengines[i].name + ": " + "the server is not responding");
                    counter -= 1;
                    catchError();

                });
                request[i].open("GET", nzbDonkeySettings.searchengines[i].searchURL.replace(/%s/, encodeURI(nzbHeader)), true);
                request[i].timeout = 20000;
                request[i].send();

                nzbLogging("INFO" + ": " + "Requesting URL" + ": " + nzbDonkeySettings.searchengines[i].searchURL.replace(/%s/, encodeURI(nzbHeader)));

            })(i);
        }
    }
    function catchError() {
        if (counter == 0 && nzbURL == "") {

            nzbLogging("ERROR" + ": " + "No NZB file found on any NZB search engine");

            nzbDonkeyNotification("ERROR" + ": " + "No NZB file found on any NZB search engine", true);

        }
    }
}

function nzbUrlProcess(nzbURL, nzbTitle, nzbPassword) {

    nzbLogging("INFO" + ": " + "processing the NZB URL");

    var category = "";
    switch (nzbDonkeySettings.category.categories) {
        case "automatic":
            category = categorize(nzbTitle);
            break;

        case "default":
            category = nzbDonkeySettings.category.defaultCategory;
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

    downloadNZBfile(nzbURL, nzbTitle, nzbPassword, category);
    
}

function downloadNZBfile(nzbURL, nzbTitle, nzbPassword, category) {

    var request = new XMLHttpRequest();
    request.addEventListener('load', function(event) {

        nzbLogging("INFO" + ": " + "NZB file download" + ": " + "http response code is" + " " + request.status);

        if (request.status >= 200 && request.status < 300) {
            var nzbFile = request.responseText;
            if (nzbFile.match(/<nzb.*>/i)) {
                nzbLogging("INFO" + ": " + "the downloaded file is a valid NZB file");
                processNZBfile(nzbFile, nzbTitle, nzbPassword, category);
            } else {
                nzbLogging("ERROR" + ": " + "the downloaded file is not a valid NZB file");
                nzbDonkeyNotification("ERROR" + ": " + "the downloaded file is not a valid NZB file", true);    
            }
            
        } else {
            nzbLogging("ERROR" + ": " + "an error occurred while downloading the NZB file");
            nzbDonkeyNotification("ERROR" + ": " + "an error occurred while downloading the NZB file", true);
        }
    });
    request.addEventListener('error', function(event) {
        nzbLogging("ERROR" + ": " + "NZB file download" + ": " + "http response code is" + " " + request.status);
        nzbLogging("ERROR" + ": " + "NZB file download" + ": " + "The site is not responding");
        nzbDonkeyNotification("ERROR" + ": " + "an error occurred while downloading the NZB file. The site is not responding.", true);
    });
    request.open("GET", nzbURL, true);
    request.timeout = 120000;
    request.send();

    nzbLogging("INFO" + ": " + "downloading NZB file from url: " + nzbURL);    
    
}

function processNZBfile(nzbFile, nzbTitle, nzbPassword, category) {

    var nzbMetadata = '';
    
    if (!nzbTitle.match(/[&"\'<>]/)) {
        nzbMetadata += '\t<meta type="title">' + nzbTitle + '</meta>\n';
        nzbLogging("INFO" + ": " + "NZB file meta data: title tag set to " + nzbTitle);
    } else {
        nzbLogging("INFO" + ": " + "NZB file meta data: could not set title tag due to invalid characters");
    }
    if (nzbPassword != '' && !nzbPassword.match(/[&"\'<>]/)) {
        nzbMetadata += '\t<meta type="password">' + nzbPassword + '</meta>\n';
        nzbLogging("INFO" + ": " + "NZB file meta data: password tag set to " + nzbPassword);
    } else {
        nzbLogging("INFO" + ": " + "NZB file meta data: could not set password tag due to invalid characters");
    }    
    if (category != '' && !category.match(/[&"\'<>]/)) {
        nzbMetadata += '\t<meta type="category">' + category + '</meta>\n';
        nzbLogging("INFO" + ": " + "NZB file meta data: category tag set to " + category);
    } else {
        nzbLogging("INFO" + ": " + "NZB file meta data: could not set category tag due to invalid characters");
    }
    
    if (nzbFile.match(/<head>/i)) {
        nzbFile = nzbFile.replace(/<head>/i, '<head>\n' + nzbMetadata );
    } else {
        nzbFile = nzbFile.replace(/(<nzb.*>)/i, '$1\n<head>\n' + nzbMetadata + '</head>' );
    }

    switch (nzbDonkeySettings.general.execType) {
        case "download":
            downloadNZB(nzbFile, nzbTitle, nzbPassword, category);
            break;

        case "nzbget":
            pushNZBtoNZBGET(nzbFile, nzbTitle, nzbPassword, category);
            break;

        case "sabnzbd":
            pushNZBtoSABnzbd(nzbFile, nzbTitle, nzbPassword, category);
            break;
			
		case "synology":
			pushNZBtoSynology(nzbFile, nzbTitle, nzbPassword, category);
			break;
    }

}

function pushNZBtoNZBGET(nzbFile, nzbTitle, nzbPassword, category) {

    var scheme = nzbDonkeySettings.nzbget.scheme;
    var host = nzbDonkeySettings.nzbget.host.match(/^(?:https{0,1}:\d?\/\/)?([^\/:]+)/i)[1]
    var port = nzbDonkeySettings.nzbget.port.match(/[^\d]*(\d*)[^\d]*/)[1];
    var username = nzbDonkeySettings.nzbget.username;
    var password = nzbDonkeySettings.nzbget.password;
    var basepath = "jsonrpc";

    var url = scheme + "://" + host + ":" + port + "/" + basepath + "/";

    nzbLogging("INFO" + ": " + "NZBGet URL is set to" + ": " + url);

    var filename = nzbTitle;

    nzbLogging("INFO" + ": " + "filename is set to" + ": " + filename);

    var params = [
        filename, // Filename
        btoa(nzbFile), // Content (NZB File)
        category, // Category
        0, // Priority
        false, // AddToTop
        nzbDonkeySettings.nzbget.addPaused, // AddPaused
        "", // DupeKey
        0, // DupeScore
        "Force", // DupeMode
        [
         { "*unpack:password" : nzbPassword } // Post processing parameter: Password
        ]
    ];
    
    var data = JSON.stringify({ 
        "version" : "1.1",
        "id" : 1,
        "method" : "append", 
        "params" : params
    });

    var request = new XMLHttpRequest();
    request.addEventListener('load', function(event) {

        nzbLogging("INFO" + ": " + nzbDonkeySettings.general.execType + ": " + "http response code is" + " " + request.status);

        if (request.status >= 200 && request.status < 300) {
            var response = JSON.parse(request.responseText);
            if (response.result > 0) {
                nzbLogging("INFO" + ": " + nzbDonkeySettings.general.execType + " " + "returned a success code");
                nzbDonkeyNotification("The NZB file was successfully pushed to" + " " + nzbDonkeySettings.general.execType, false);
            } else {
                nzbLogging("INFO" + ": " + nzbDonkeySettings.general.execType + " " + "returned an error code");
                nzbDonkeyNotification("ERROR" + ": " + "an error occurred while pushing the NZB file to" + " " + nzbDonkeySettings.general.execType, true);
            }
        } else {
            nzbLogging("ERROR" + ": " + nzbDonkeySettings.general.execType + ": " + "Error accessing the server");
            nzbDonkeyNotification("ERROR" + ": " + "an error occurred while pushing the NZB file to" + " " + nzbDonkeySettings.general.execType, true);
        }
    });
    request.addEventListener('error', function(event) {
        nzbLogging("ERROR" + ": " + nzbDonkeySettings.general.execType + ": " + "http response code is" + " " + request.status);
        nzbLogging("ERROR" + ": " + nzbDonkeySettings.general.execType + ": " + "Not responding");
        nzbDonkeyNotification("ERROR" + ": " + nzbDonkeySettings.general.execType + ": " + "The server is not responding", true);
    });
    request.open("POST", url, true);
    request.setRequestHeader("Authorization", "Basic " + btoa(username + ":" + password));
    request.timeout = 120000;
    request.send(data);

    nzbLogging("INFO" + ": " + "pushing to NZBGet");

}

function pushNZBtoSABnzbd(nzbFile, nzbTitle, nzbPassword, category) {

    var scheme = nzbDonkeySettings.sabnzbd.scheme;
    var host = nzbDonkeySettings.sabnzbd.host.match(/^(?:https{0,1}:\d?\/\/)?([^\/:]+)/i)[1]
    var port = nzbDonkeySettings.sabnzbd.port.match(/[^\d]*(\d*)[^\d]*/)[1];
    var apiKey = nzbDonkeySettings.sabnzbd.apiKey;
    var basepath = "sabnzbd";
    var filename = nzbTitle;
    if (nzbPassword != "") {
        filename += "{{" + nzbPassword + "}}";
    }
    nzbLogging("INFO" + ": " + "filename is set to" + ": " + filename);

    var addPaused = (nzbDonkeySettings.sabnzbd.addPaused) ? -2 : -100;
    
    var content = new Blob([nzbFile], { type: "text/xml" } );
    var formData = new FormData();
    
    formData.append("mode", "addfile");
    formData.append("output", "json");
    formData.append("apikey", apiKey);
    formData.append("nzbname", filename);
    formData.append("cat", category);
    formData.append("priority", addPaused);
    formData.append("name", content);
    
    var url = scheme + "://" + host + ":" + port + "/" + basepath + "/api";

    var request = new XMLHttpRequest();
    request.addEventListener('load', function(event) {

        nzbLogging("INFO" + ": " + nzbDonkeySettings.general.execType + ": " + "http response code is" + " " + request.status);
        if (request.status >= 200 && request.status < 300) {
            var response = JSON.parse(request.responseText);
            if (response.status) {
                nzbLogging("INFO" + ": " + nzbDonkeySettings.general.execType + " " + "returned a success code");
                nzbDonkeyNotification("The NZB file was successfully pushed to" + " " + nzbDonkeySettings.general.execType, false);
            } else {
                nzbLogging("INFO" + ": " + nzbDonkeySettings.general.execType + " " + "returned an error code");
                nzbDonkeyNotification("ERROR" + ": " + "an error occurred while pushing the NZB file to" + " " + nzbDonkeySettings.general.execType, true);
            }
        } else {
            nzbLogging("ERROR" + ": " + nzbDonkeySettings.general.execType + ": " + "error accessing the server with error code " + request.status);
            nzbDonkeyNotification("ERROR" + ": " + "an error occurred while pushing the NZB file to" + " " + nzbDonkeySettings.general.execType, true);
        }
    });
    request.addEventListener('error', function(event) {
        nzbLogging("ERROR" + ": " + nzbDonkeySettings.general.execType + ": " + "http response code is" + " " + request.status);
        nzbLogging("ERROR" + ": " + nzbDonkeySettings.general.execType + ": " + "Not responding");
        nzbDonkeyNotification("ERROR" + ": " + nzbDonkeySettings.general.execType + ": " + "The server is not responding", true);
    });
    request.open("POST", url, true);
    request.timeout = 120000;
    request.send(formData);

    nzbLogging("INFO" + ": " + "pushing to SABnzbd");
   
}

function pushNZBtoSynology(nzbFile, nzbTitle, nzbPassword, category) {

	nzbLogging("INFO" + ": " + "pushing to Synology DownloadStation");

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

	xhr(options).then(function(result) {

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
			return xhr(options);
		} else {
			throw Error("Synology Diskstation responded with error code " + SynoData.error.code)
		}

	}).then(function(result) {

		var SynoAuthData = JSON.parse(result);
		if (SynoAuthData.success) {
			options.path = SynoData.data['SYNO.DownloadStation2.Task'].path;
			delete options.parameters;
			var content = new Blob([nzbFile], { type: "text/xml" });
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
			formData.append("extract_password", '"' + nzbPassword + '"');
			formData.append("_sid", SynoAuthData.data.sid);
			formData.append("torrent", content, nzbTitle + ".nzb");
			options.data = formData;
			options.timeout = 120000;
			return xhr(options);
		} else {
			throw Error("Synology Diskstation responded with error code " + SynoAuthData.error.code)
		}

	}).then(function(result) {

		var SynoResponseData = JSON.parse(result);
		if (SynoResponseData.success) {
            nzbLogging("INFO" + ": " + nzbDonkeySettings.general.execType + " " + "returned a success code");
            nzbDonkeyNotification("The NZB file was successfully pushed to" + " " + nzbDonkeySettings.general.execType, false);
		} else {
			throw Error("Synology Diskstation responded with error code " + SynoResponseData.error.code)
		}	

	}).catch(function(e) {
        nzbLogging("ERROR" + ": " + "an error occurred while pushing the NZB file to" + " " + nzbDonkeySettings.general.execType);
		console.log(e);
        nzbDonkeyNotification("ERROR" + ": " + "an error occurred while pushing the NZB file to" + " " + nzbDonkeySettings.general.execType, true);	
	});

}

function categorize(nzbTitle) {

    var category = "";
    for (var i = 0; i < nzbDonkeySettings.category.automaticCategories.length; i++) {
        var re = new RegExp(nzbDonkeySettings.category.automaticCategories[i].pattern, "i");
        nzbLogging("INFO" + ": " + "testing for category " + nzbDonkeySettings.category.automaticCategories[i].name);
        if (re.test(nzbTitle)) {
            category = nzbDonkeySettings.category.automaticCategories[i].name;
            break;
        }
    }
    if (category == "") {
        category = nzbDonkeySettings.category.defaultCategory;
        nzbLogging("INFO" + ": " + "no match found, setting category to default category: " + nzbDonkeySettings.category.defaultCategory);
    }
    return category;

}

function downloadNZB(nzbFile, nzbTitle, nzbPassword, category) {

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
            var passwordWarning = "CAUTION: The Password did contain invalid characters and was not included in the filename";          
        }
    }
    filename += ".nzb";

    nzbLogging("INFO" + ": " + "filename is set to" + ": " + filename);
	
    var blob = new Blob([nzbFile], {type: "text/xml;charset=utf-8"})

    chrome.downloads.download({
        url: URL.createObjectURL(blob),
        filename: filename,
        saveAs: nzbDonkeySettings.download.saveAs,
        conflictAction: "uniquify"
    });
    chrome.downloads.onCreated.addListener(function(item) {
        nzbLogging("INFO" + ": " + "starting download");
        var notificationString = "Starting download of file" + ":\n" + filename;
        if (passwordWarning) {
            notificationString += notificationString + '\n' + passwordWarning;
        }
        nzbDonkeyNotification(notificationString, false);
        
    });
 }
 
 
function xhr(options) {
/*
	options = {
		"url":  url,
		"scheme": scheme,
		"host": host,
		"port": port,
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
	
	xhr(options).then(function(result) {
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
			url +=	":" + options.port.match(/[^\d]*(\d*)[^\d]*/)[1];
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
					resolve(request.responseText);
				} else {
					var errorMsg = "The server responded with error code " + request.status;
					if (request.statusText) {
						errorMsg += " (" + request.statusText + ")";
					}
					reject(new Error(errorMsg));
				}
			}
		};
		request.onerror = function() {
			reject(new Error("Network error"));
		};
		request.open(method, url, true);
		request.timeout = options.timeout;
		request.send(options.data);
	});
}