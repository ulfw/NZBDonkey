// Fall back to storage.local if storage.sync is not available
if (chrome.storage.sync) {
    var storage = chrome.storage.sync;
} else {
    var storage = chrome.storage.local;
}

$(document).ready(function() {

    $("[id^=menu_]").each(function(index) {
        $(this).css("display", "none");
    });

    NZBDonkeyOptions();

    var manifest = chrome.runtime.getManifest();
    var NZBDonkeyVersion = document.getElementById("NZBDonkeyVersion");
    var NZBDonkeyVersionContent = document.createTextNode(manifest.version);
    NZBDonkeyVersion.appendChild(NZBDonkeyVersionContent);

    $("[id^=TestButton]").click(function() {
        let button = $(this);
        button.prop("disabled", true);
        button.html("Testing connection...")
        chrome.runtime.sendMessage({
            nzbDonkeyTestConnection: true
        }, function(response) {
            if (response.success) {
                $("#TestSuccessBody").html(response.response.replace(/\n/gi, "<br />"));
                $("#TestSuccess").modal("show");
            } else {
                $("#TestWarningBody").html(response.response.replace(/\n/gi, "<br />"));
                $("#TestWarning").modal("show");
            }
            button.html("Test Connection");
            button.prop("disabled", false);
        });
    });

    $("a.nav-link").click(function() {

        switch ($(this).attr("href")) {
            case "#reset":
                $("#ResetWarning").modal("show");
                $("#ResetWarningConfirmed").click(function() {
                    $(this).off();
                    $("#ResetWarning").modal("hide");
                    storage.clear();
                    window.location.reload();
                });
                break;
            case "#advanced":
                $("#AdvancedWarning").modal("show");
                let tab = $(this);
                $("#AdvancedWarningConfirmed").click(function() {
                    $(this).off();
                    $("#AdvancedWarning").modal("hide");
                    switchTabs(tab);
                });
                break;
            default:
                switchTabs($(this));
        }

    });


    $("#generalContent").on("change", "input[type=radio][name^=execType_]", function() {
        $("[id^=menu_]").each(function(index) {
            $(this).css("display", "none");
        });
        $("#menu_" + this.value).css("display", "block");
    });

    function switchTabs(tab) {
        // Get all elements with class="tabcontent" and hide them
        $(".tabcontent").each(function(index) {
            $(this).css("display", "none");
        });
        // Get all elements with class="tablinks" and remove the class "active"
        $(".nav-link").each(function(index) {
            $(this).removeClass("active");
        });
        // Show the selected tab, and add an "active" class to the link that opened the tab
        tab.addClass("active");
        $(tab.attr("href")).css("display", "block");
    }

});

function NZBDonkeyOptions() {

    nzbDonkeyOptions.opts.saveDefaults = true;

    nzbDonkeyOptions.addTab('general', [{
        type: 'h3',
        desc: 'Action for NZB files'
    }, {
        name: 'execType',
        type: 'radio',
        options: [{
            desc: 'Download',
            value: 'download'
        }, {
            desc: 'Send to NZBGet',
            value: 'nzbget'
        }, {
            desc: 'Send to SABnzbd',
            value: 'sabnzbd'
        }, {
            desc: 'Send to Synology DownloadStation',
            value: 'synology'
        }],
        default: 'download'
    }, {
        type: 'plaintext',
        text: 'Choose what NZBDonkey shall do with the NZB file if found. You will need to the set the further settings in the corresponding tab.'
    }, {
        type: 'h3',
        desc: 'How to handle spaces/periods in the title/filename'
    }, {
        name: 'processTitel',
        type: 'radio',
        options: [{
            desc: 'Leave them as they are',
            value: false
        }, {
            desc: 'Convert all spaces to periods',
            value: 'periods'
        }, {
            desc: 'Convert all periods to spaces',
            value: 'spaces'
        }],
        default: false
    }, {
        type: 'plaintext',
        text: 'Choose what NZBDonkey shall do with periods and spaces in the NZB title/filename.'
    }, {
        type: 'h3',
        desc: 'Catch left mouse clicks on NZBlnk links'
    }, {
        name: 'catchLinks',
        type: 'checkbox',
        desc: 'Catch NZBlnk links',
        default: true
    }, {
        type: 'plaintext',
        text: 'If activated, NZBDonkey will catch and handle left mouse clicks on a NZBlnk link.'
    }, {
        type: 'h3',
        desc: 'Check NZB files for completness'
    }, {
        name: 'checkNZBfiles',
        type: 'checkbox',
        desc: 'Activate check for completeness',
        default: true
    }, {
        type: 'plaintext',
        text: 'If activated, NZB files will be checked for completeness and only be download if they seem to be complete.'
    }, {
        type: 'h3',
        desc: 'Threshold for allowed missing files'
    }, {
        type: 'select',
        name: 'fileThreshold',
        options: [{
            desc: '0',
            value: 0
        }, {
            desc: '1',
            value: 1
        }, {
            desc: '2',
            value: 2
        }, {
            desc: '3',
            value: 3
        }, {
            desc: '4',
            value: 4
        }, {
            desc: '5',
            value: 5
        }],
        default: 2
    }, {
        type: 'plaintext',
        text: 'If check for completeness is activated, NZB files with missing files above this threshold will be rejected.'
    }, {
        type: 'h3',
        desc: 'Threshold for allowed missing segments'
    }, {
        type: 'select',
        name: 'segmentThreshold',
        options: [{
            desc: '0 %',
            value: 0
        }, {
            desc: '1 %',
            value: 0.01
        }, {
            desc: '2 %',
            value: 0.02
        }, {
            desc: '3 %',
            value: 0.03
        }, {
            desc: '4 %',
            value: 0.04
        }, {
            desc: '5 %',
            value: 0.05
        }],
        default: 0.02
    }, {
        type: 'plaintext',
        text: 'If check for completeness is activated, NZB files with missing segments above this threshold will be rejected.'
    }, {
        type: 'h3',
        desc: 'Show notifications'
    }, {
        name: 'showNotifications',
        type: 'checkbox',
        desc: 'Show notifications',
        default: true
    }, {
        type: 'plaintext',
        text: 'Deactivate if you do not want to be notified with notifications e.g. upon start of the program or success of the script. Error notifications will always be shown.'
    }, {
        type: 'h3',
        desc: 'Debug Mode'
    }, {
        name: 'debug',
        type: 'checkbox',
        desc: 'Activate debug mode',
        default: true
    }, {
        type: 'plaintext',
        text: 'If activated, NZBDonkey will issue debug information in the console.'
    }]);

    nzbDonkeyOptions.addTab('category', [{
        type: 'h3',
        desc: 'Use categories'
    }, {
        name: 'categories',
        type: 'radio',
        options: [{
            desc: 'Do not use categories',
            value: false
        }, {
            desc: 'Use default category',
            value: 'default'
        }, {
            desc: 'Use automatic categories',
            value: 'automatic'
        }],
        default: false
    }, {
        type: 'plaintext',
        text: 'Choose whether NZBDonkey should use category information.'
    }, {
        type: 'h3',
        desc: 'Default category'
    }, {
        name: 'defaultCategory',
        type: 'text',
        default: ''
    }, {
        type: 'plaintext',
        text: 'Enter the name of the default category.\nIf "use default category" is choosen, NZBDonkey will always use this category.'
    }, {
        type: 'h3',
        desc: 'Automatic categories'
    }, {
        name: 'automaticCategories',
        type: 'list',
        head: true,
        sortable: true,
        desc: '',
        fields: [{
            type: 'text',
            name: 'name',
            desc: 'Category name'
        }, {
            type: 'text',
            name: 'pattern',
            desc: 'Regex expression'
        }],
        default: [{
            name: 'TV-Series',
            pattern: '[e|s]\\d+'
        }, {
            name: 'Movies',
            pattern: '(x264|xvid|bluray|720p|1080p|untouched)'
        }]
    }, {
        type: 'plaintext',
        text: 'Enter the name of the category and the corresponding regex expression for automatic categories.\n'
    }, {
        type: 'plaintext',
        text: 'If "use automatic categories" is choosen, NZBDonkey will test the NZB title/filename for the regex expressions and if matched set the category to the corresponding category name.\n'
    }, {
        type: 'plaintext',
        text: 'The regex expressions will be tested in descending order and first match will be used as category. The search is case insensitive.\n'
    }, {
        type: 'plaintext',
        text: 'If no automatic category matches, the default category will be used if set.'
    }]);

    nzbDonkeyOptions.addTab('download', [{
        type: 'h3',
        desc: 'Default download subfolder'
    }, {
        name: 'defaultPath',
        type: 'text',
        default: ''
    }, {
        type: 'plaintext',
        text: 'Enter the name of a subfolder within your browsers default download folder where you would like to save the NZB files.\n'
    }, {
        type: 'plaintext',
        text: 'The subfolder will be created if it does not yet exist.\n'
    }, {
        type: 'plaintext',
        text: 'Leave empty if you would like to save the NZB files directly in your browsers default download folder.\n'
    }, {
        type: 'plaintext',
        text: 'CAUTION: Do not use an absolute path! Only enter a relative path within your browsers default download folder! Do not add leading or trailing backslashes.\n'
    }, {
        type: 'h3',
        desc: 'Use category subfolders'
    }, {
        name: 'categoryFolder',
        type: 'checkbox',
        desc: 'Use category subfolders',
        default: false
    }, {
        type: 'plaintext',
        text: 'If activated and "use default category" or "use automatic categories" is set, NZBDonkey will save the NZB file in a category subfolder within your default download subfolder.'
    }, {
        type: 'plaintext',
        text: 'The category subfolder will be created if it does not yet exist.\n'
    }, {
        type: 'h3',
        desc: 'Use save as dialog'
    }, {
        name: 'saveAs',
        type: 'checkbox',
        desc: 'use Save as dialog',
        default: true
    }, {
        type: 'plaintext',
        text: 'If checked NZBDonkey will prompt you with a "Save As" dialog in order for you to choose the folder where you would like to save the NZB file.\n'
    }, {
        type: 'plaintext',
        text: 'Leave it unchecked if you silently want to download the NZB files in the default folder.'
    }, {
        type: 'plaintext',
        text: 'CAUTION: due to a bug in Chrome, silent download will only work if Chrome setting "Ask where to save each file before downloading" is disabled.'
    }, ]);

    nzbDonkeyOptions.addTab('nzbget', [{
        type: 'h3',
        desc: 'Host name'
    }, {
        name: 'host',
        type: 'text',
        default: 'localhost'
    }, {
        type: 'plaintext',
        text: 'Enter the host name or IP address of your NZBGet server.'
    }, {
        type: 'h3',
        desc: 'Port'
    }, {
        name: 'port',
        type: 'text',
        default: '6789'
    }, {
        type: 'plaintext',
        text: 'Enter the port number to be used to connect to your NZBGet server. Usually this is 6789 for http and 6791 for https connections.'
    }, {
        type: 'h3',
        desc: 'Connection scheme'
    }, {
        name: 'scheme',
        type: 'radio',
        options: [{
            desc: 'connect via secure https',
            value: 'https'
        }, {
            desc: 'connect via normal http',
            value: 'http'
        }, ],
        default: 'http'
    }, {
        type: 'plaintext',
        text: 'Choose whether to connect to your server via normal http or secure https connections.'
    }, {
        type: 'h3',
        desc: 'NZBGet username'
    }, {
        name: 'username',
        type: 'text',
        default: ''
    }, {
        type: 'plaintext',
        text: 'Enter the username to access the NZBGet server.\n'
    }, {
        type: 'plaintext',
        text: 'You can use either the ControlUser, the RestrictedUser or the AddUser as set on the security settings page of your NZBGet server.\n'
    }, {
        type: 'plaintext',
        text: 'It is however recommended to set a username and password for the AddUser on the security settings page of your NZBGet server and to use this user.'
    }, {
        type: 'h3',
        desc: 'NZBGet password'
    }, {
        name: 'password',
        type: 'password',
        default: ''
    }, {
        type: 'plaintext',
        text: 'Enter the password for above user to access the NZBGet server.'
    }, {
        type: 'h3',
        desc: 'Add to NZBGet in pause mode'
    }, {
        name: 'addPaused',
        type: 'checkbox',
        desc: 'add as paused',
        default: false
    }, {
        type: 'plaintext',
        text: 'If checked, the NZB file will be added to NZBGet in pause mode.\nYou will have to unpause it manually in the NZBGet web gui to start the download.'
    }, ]);

    nzbDonkeyOptions.addTab('sabnzbd', [{
        type: 'h3',
        desc: 'Host name'
    }, {
        name: 'host',
        type: 'text',
        default: 'localhost'
    }, {
        type: 'plaintext',
        text: 'Enter the host name or IP address of your SABnzbd server.'
    }, {
        type: 'h3',
        desc: 'Port'
    }, {
        name: 'port',
        type: 'text',
        default: '8080'
    }, {
        type: 'plaintext',
        text: 'Enter the port number to be used to connect to your SABnzbd server. Usually this is 8080 for http connections.'
    }, {
        type: 'h3',
        desc: 'Connection scheme'
    }, {
        name: 'scheme',
        type: 'radio',
        options: [{
            desc: 'connect via secure https',
            value: 'https'
        }, {
            desc: 'connect via normal http',
            value: 'http'
        }, ],
        default: 'http'
    }, {
        type: 'plaintext',
        text: 'Choose whether to connect to your server via normal http or secure https connections.\n'
    }, {
        type: 'plaintext',
        text: 'To connect via https, SABnzbd needs to be configured for https connections and the port above to be set accordingly.'
    }, {
        type: 'h3',
        desc: 'API key'
    }, {
        name: 'apiKey',
        type: 'text',
        default: ''
    }, {
        type: 'plaintext',
        text: 'Enter either the SABnzbd ApiKey or the SABnzbd NZBKey. Get it from the general settings page of your SABnzbd server.\n'
    }, {
        type: 'plaintext',
        text: 'It is recommended to use the NZBKey.'
    }, {
        type: 'h3',
        desc: 'Add to SABnzbd in pause mode'
    }, {
        name: 'addPaused',
        type: 'checkbox',
        desc: 'add as paused',
        default: false
    }, {
        type: 'plaintext',
        text: 'If checked, the NZB file will be added to SABnzbd in pause mode.\nYou will have to unpause it manually in the SABnzbd web gui to start the download.'
    }]);

    nzbDonkeyOptions.addTab('synology', [{
        type: 'h3',
        desc: 'Host name'
    }, {
        name: 'host',
        type: 'text',
        default: 'localhost'
    }, {
        type: 'plaintext',
        text: 'Enter the host name or IP address of your Synology Diskstation.'
    }, {
        type: 'h3',
        desc: 'Port'
    }, {
        name: 'port',
        type: 'text',
        default: '5000'
    }, {
        type: 'plaintext',
        text: 'Enter the port number to be used to connect to your Synology Diskstation. Usually this is 5000 for http and 5001 for https connections.'
    }, {
        type: 'h3',
        desc: 'Connection scheme'
    }, {
        name: 'scheme',
        type: 'radio',
        options: [{
            desc: 'connect via secure https',
            value: 'https'
        }, {
            desc: 'connect via normal http',
            value: 'http'
        }, ],
        default: 'http'
    }, {
        type: 'plaintext',
        text: 'Choose whether to connect to your Synology Diskstation via normal http or secure https connections.'
    }, {
        type: 'h3',
        desc: 'Username'
    }, {
        name: 'username',
        type: 'text',
        default: ''
    }, {
        type: 'plaintext',
        text: 'Enter the username to access the Synology Diskstation.\n'
    }, {
        type: 'plaintext',
        text: 'This user needs to have sufficient rights to use the DownloadStation.\n'
    }, {
        type: 'h3',
        desc: 'Password'
    }, {
        name: 'password',
        type: 'password',
        default: ''
    }, {
        type: 'plaintext',
        text: 'Enter the password for above user to access the Synology Diskstation.'
    }, ]);

    nzbDonkeyOptions.addTab('searchengines', [{
        type: 'h3',
        desc: 'Search Engines'
    }, {
        name: 'searchengines',
        type: 'list',
        head: true,
        desc: 'DO NOT TOUCH THESE SETTINGS UNLESS YOU KNOW WHAT YOU DO!',
        fields: [{
            type: 'checkbox',
            name: 'active',
            desc: 'Active'
        }, {
            type: 'text',
            name: 'name',
            desc: 'Search Engine Name'
        }, {
            type: 'text',
            name: 'searchURL',
            desc: 'Search URL'
        }, {
            type: 'text',
            name: 'searchPattern',
            desc: 'Regex expression'
        }, {
            type: 'select',
            name: 'searchGroup',
            options: [{
                desc: '1',
                value: 1
            }, {
                desc: '2',
                value: 2
            }, {
                desc: '3',
                value: 3
            }, {
                desc: '4',
                value: 4
            }, {
                desc: '5',
                value: 5
            }, ],
            desc: 'Group no.'
        }, {
            type: 'text',
            name: 'downloadURL',
            desc: 'Download URL'
        }, ],
        default: [{
            "active": true,
            "downloadURL": "https://newzleech.com/?m=gen&dl=1&post=%s",
            "name": "Newzleecher",
            "searchPattern": "name=\"binary\\[\\]\" value=\"(.*?)\"",
            "searchGroup": 1,
            "searchURL": "https://newzleech.com/?m=search&q=%s"
        }, {
            "active": true,
            "downloadURL": "https://nzbindex.com/download/%s/",
            "name": "NZBIndex",
            "searchPattern": "label for=\"box(\\d{8,})\".*?class=\"highlight\"",
            "searchGroup": 1,
            "searchURL": "https://nzbindex.com/search/?sort=agedesc&hidespam=1&q=%s"
        }, {
            "active": true,
            "downloadURL": "https://binsearch.info/?action=nzb&%s=1",
            "name": "BinSearch",
            "searchPattern": "name=\"(\\d{9,})\"",
            "searchGroup": 1,
            "searchURL": "https://binsearch.info/?max=100&adv_age=1100&q=%s"
        }, {
            "active": true,
            "downloadURL": "https://binsearch.info/?action=nzb&%s=1&server=2",
            "name": "BinSearch (other groups)",
            "searchPattern": "name=\"(\\d{9,})\"",
            "searchGroup": 1,
            "searchURL": "https://binsearch.info/?max=100&adv_age=1100&server=2&q=%s"
        }, {
            "active": true,
            "downloadURL": "http://nzbking.com/nzb:%s",
            "name": "NZBKing",
            "searchPattern": "href=\"\\/details:(.*?)\\/\"",
            "searchGroup": 1,
            "searchURL": "http://nzbking.com/search/?q=%s"
        }],
    }]);

    nzbDonkeyOptions.addTab('interception', [{
        type: 'h3',
        desc: 'Intercept NZB downloads'
    }, {
        name: 'interceptNzbDownloads',
        type: 'checkbox',
        desc: 'Intercept NZB file downloads',
        default: true
    }, {
        type: 'plaintext',
        text: 'If checked, NZBDonkey will intercept NZB file downloads and handle them according to the settings.'
    }, {
        type: 'h3',
        desc: 'Domains'
    }, {
        name: 'domains',
        type: 'list',
        head: true,
        desc: 'Domains where NZBDonkey shall intercept NZB file downloads.',
        head: true,
        fields: [{
            type: 'checkbox',
            name: 'active',
            desc: 'Active'
        }, {
            type: 'text',
            name: 'domain',
            desc: 'Domain'
        }],
        default: [{
            "active": true,
            "domain": "newzleech.com"
        }, {
            "active": true,
            "domain": "nzbindex.com"
        }, {
            "active": true,
            "domain": "binsearch.info"
        }, {
            "active": true,
            "domain": "nzbking.com"
        }],
    }, {
        type: 'h3',
        desc: 'Domains who need special treatment'
    }, {
        name: 'specialDomains',
        desc: 'Some domains may need some special treatment for the NZB file download interception to work.\nAdd them to below list and choose the special treatment to be used.',
        type: 'list',
        head: true,
        fields: [{
            type: 'text',
            name: 'domain',
            desc: 'Domain'
        }, {
            type: 'select',
            name: 'treatment',
            options: [{
                desc: '',
                value: ''
            }, {
                desc: 'Send Form Data as String',
                value: 'sendFormDataAsString'
            }],
            desc: 'Special treatment'
        }],
        default: [{
            "domain": "binsearch.info",
            "treatment": "sendFormDataAsString"
        }]
    }]);
}

(function() {
    // Expose this library.
    nzbDonkeyOptions = {};
    nzbDonkeyOptions.base = {};
    nzbDonkeyOptions.opts = {
        // If not given, title of the page will be set to the extension's name.
        // Set to `false` if you want to hide the title.
        title: null,

        // Set this if you want to customize the about tab's contents,
        // otherwise it will be set to the extension's description.
        // Set to `false` if you don't want an About page.
        about: null,

        // True if you want settings to be saved as they are changed.
        autoSave: true,

        // True if you want default values to be saved when user visits
        // the options page. Useful if you want to only specify default values
        // in one place, without having to check if an option is set.
        // Note that it requires the options page to be visited once.
        saveDefaults: true,
    };

    var lastHash = null;
    var hashPath = window.location.hash.split('.');
    var hashOption = hashPath.length > 1;
    var hashPosition = 1;

    var urlParams = {};
    window.location.search.substring(1).split('&').forEach(function(param) {
        urlParams[param] = true;
    });

    var changedValues = {};
    var $saveContainer = document.querySelector('.save-container');
    var $saveButton = $saveContainer.querySelector('button');
    $saveButton.addEventListener('click', function() {
        storage.set(changedValues);
        $saveButton.setAttribute('disabled', true);
    });
    var showSavedAlert = flashClass($saveContainer, 'show', 2000);
    var flashSavedAlert = flashClass($saveContainer, 'flash', 150);

    // Add the extension's title to the top of the page.
    var setupRan = false;

    function setup() {
        if (setupRan) {
            return;
        }
        var manifest = chrome.runtime.getManifest();

        if (nzbDonkeyOptions.opts.autoSave) {
            $saveButton.style.display = 'none';
        } else {
            $saveContainer.querySelector('.auto').style.display = 'none';
            $saveContainer.classList.add('show');
        }

        setupRan = true;
    }

    /**
     * @param {String} name
     * @param {String!} desc Will be placed at the top of the page of the tab
     * @param {Array.<Object>} options
     */
    nzbDonkeyOptions.addTab = function(name, desc, options) {
        setup();
        if (!options) {
            options = desc;
            desc = null;
        }
        var keyName = name.toLowerCase().replace(' ', '_');
        var $tabview = h('div', {
            id: keyName
        });
        var $tabcontent = h('div.content');
        if (desc) {
            $tabcontent.append(h('p.tab-desc', desc));
        }

        var keys = [];
        (function getOptionKeys(options) {
            options.forEach(function(option) {
                if (option.name) {
                    keys.push(getKeyPath(keyName, option));
                } else if (option.type === 'column' || option.type === 'row') {
                    getOptionKeys(option.options);
                }
            });
        })(options);

        storage.get(keys, function(items) {
            addTabOptions($tabcontent, keyName, items, options);
        });
        $tabview.append($tabcontent);
        document.querySelector('#' + keyName + 'Content').append($tabview);
    };


    /**
     * @param {String} desc
     * @param {Array.<Object>} options
     */
    nzbDonkeyOptions.set = function(desc, options) {
        urlParams.hideSidebar = true;
        urlParams.hideTabTitle = true;
        nzbDonkeyOptions.addTab('', desc, options);
    };

    function getKeyPath(parentKey, option) {
        return (parentKey || '') +
            (parentKey && option.name ? '.' : '') + (option.name || '');
    }

    function addTabOptions($parent, keyName, values, options) {
        options.forEach(function(option) {
            var key = getKeyPath(keyName, option);
            var value = values[key];
            var latestValue = value;

            // Clone value so that it can be compared to new value.
            var cloneValue = function() {
                value = util.deepClone(latestValue);
            };
            $saveButton.addEventListener('click', cloneValue);

            // Use requestAnimationFrame whenever possible,
            // so that it doensn't seep into load time.
            requestAnimationFrame(cloneValue);

            var save = function(newValue) {
                if (typeof value === 'undefined' && nzbDonkeyOptions.opts.saveDefaults) {
                    storage.set({
                        [key]: newValue
                    });
                } else {
                    latestValue = newValue;
                    requestAnimationFrame(function() {
                        var isEqual = util.deepEqual(value, newValue);
                        if (nzbDonkeyOptions.opts.autoSave) {
                            if (!isEqual) {
                                storage.set({
                                    [key]: newValue
                                });
                                showSavedAlert();
                                flashSavedAlert();
                                cloneValue();
                            }
                        } else if (isEqual) {
                            delete changedValues[key];
                            if (!Object.keys(changedValues).length) {
                                $saveButton.setAttribute('disabled', true);
                            } else {
                                flashSavedAlert();
                            }
                        } else {
                            changedValues[key] = newValue;
                            $saveButton.removeAttribute('disabled');
                            flashSavedAlert();
                        }
                    });
                }
            };
            var $container = addOption(key, values, value, save, option, top);
            if ($container) {
                $parent.append($container);
            }
        });
    }

    function addH3(option) {
        return !hashOption && h('h4', option.desc);
    }

    function addText(option) {
        return !hashOption && h('p', option.text);
    }

    function addOption(key, values, value, save, option, top) {
        if (hashOption) {
            if (hashPosition < hashPath.length &&
                option.name && option.name !== hashPath[hashPosition]) {
                return;
            }
            hashPosition++;
        }

        if (value === undefined && option.default != null) {
            value = option.default;
            if (nzbDonkeyOptions.opts.saveDefaults) {
                save(value);
            }
        }

        var $option, r;
        switch (option.type) {
            case 'checkbox':
                $option = nzbDonkeyOptions.base.checkbox(value, save, option, key);
                break;
            case 'object':
                $option = nzbDonkeyOptions.base.object(value, save, option, key);
                break;
            case 'list':
                $option = nzbDonkeyOptions.base.list(value, save, option, key);
                break;
            case 'column':
                $option = nzbDonkeyOptions.base.column(values, save, option, key, top);
                break;
            case 'row':
                $option = nzbDonkeyOptions.base.row(values, save, option, key, top);
                break;
            case 'h3':
                $option = addH3(option);
                break;
            case 'plaintext':
                $option = addText(option);
                break;
            default:
                if (!option.type) {
                    $option = nzbDonkeyOptions.base.checkbox(value, save, option, key);
                } else if (nzbDonkeyOptions.fields[option.type]) {
                    $option = nzbDonkeyOptions.addLabelNField(value, save, option);
                } else if ((r = /(\w+)-list/.exec(option.type))) {
                    $option = nzbDonkeyOptions.base
                        .singleFieldList(value, save, option, r[1]);
                } else if ((r = /checkbox-(\w+)/.exec(option.type))) {
                    $option = nzbDonkeyOptions.base
                        .checkboxNField(value, save, option, r[1]);
                } else {
                    throw Error('Could not find option type: ' + option.type);
                }
        }

        if (hashOption) {
            hashPosition--;
        }
        if (option.preview) {
            var $label = $option.querySelector('label');
            $label.append(h('span.preview-container', h('span.preview')),
                h('img.preview-image', {
                    src: 'previews/' + key + '.' + option.preview
                }));
        }

        return $option;
    }

    nzbDonkeyOptions.base.checkbox = function(value, save, option, key) {
        var $label = h('label');
        var $container = h('.checkbox', $label);
        var $subContainer, $triangle;
        var options = option.options;
        var hasOptions = !!options;

        var checked = value;
        if (hasOptions) {
            if (value == null || typeof value !== 'object') {
                value = {};
            }
            checked = value.enabled;
        }

        var $checkbox = nzbDonkeyOptions.fields.checkbox(checked, function(checked) {
            if (hasOptions) {
                value.enabled = checked;
            } else {
                value = checked;
            }
            save(value);
        }, option);
        $label.append($checkbox);

        if (hasOptions) {
            $subContainer = addOptions(value, save, option, key);
            $container.append($subContainer);
            if (!checked) {
                $subContainer.style.display = 'none';
            }

            var toggleContainer = function(checked) {
                if (checked) {
                    $triangle.textContent = '▼';
                    slideYShow($subContainer);
                } else {
                    $triangle.textContent = '▶';
                    slideYHide($subContainer);
                }
            };

            $triangle = $label.appendChild(h('span.triangle', checked ? '▼' : '▶'));
            $triangle.addEventListener('click', function(e) {
                e.preventDefault();
                checked = !checked;
                toggleContainer(checked);
            });

            $checkbox.addEventListener('change', function() {
                checked = $checkbox.checked;
                toggleContainer(checked);
            });
        }

        $label.append(h('span', option.desc));
        return $container;
    };

    nzbDonkeyOptions.base.checkboxNField = function(value, save, option, type) {
        if (value == null || typeof value !== 'object') {
            value = {};
        }
        var mustSave = false;
        if (value.enabled === undefined && option.defaultEnabled !== undefined) {
            value.enabled = option.defaultEnabled;
            mustSave = true;
        }
        if (value.value === undefined && option.defaultValue !== undefined) {
            value.value = option.defaultValue;
            mustSave = true;
        }
        if (mustSave && nzbDonkeyOptions.opts.saveDefaults) {
            save(value);
        }

        if (!nzbDonkeyOptions.fields[type]) {
            throw Error('Could not find option type: ' + type);
        }
        var $container = h('.suboption');
        var $box = $container.appendChild(h('span'));

        $box
            .append(nzbDonkeyOptions.fields.checkbox(value.enabled, function(checked) {
                value.enabled = checked;
                save(value);
            }, option));

        $container.append(nzbDonkeyOptions.addField(value.value, function(newValue) {
            value.value = newValue;
            save(value);
        }, option, type));

        if (option.desc) {
            $container.append(h('label', option.desc));
        }
        return $container;
    };

    nzbDonkeyOptions.base.object = function(value, save, option, key) {
        var $container = h('.object');
        if (option.desc) {
            $container.append(h('label', option.desc));
        }
        $container.append(addOptions(value, save, option, key));
        return $container;
    };

    function addOptions(value, save, option, key) {
        if (value == null || typeof value !== 'object') {
            value = {};
        }
        var $container = h('.suboptions');
        option.options.forEach(function(option) {
            var optionKey = getKeyPath(key, option);
            var $option = addOption(optionKey, value, value[option.name],
                function(newValue) {
                    if (option.name) {
                        value[option.name] = newValue;
                    }
                    save(value);
                }, option);
            if ($option) {
                $container.append($option);
            }
        });
        return $container;
    }

    nzbDonkeyOptions.addLabelNField = function(value, save, option) {
        var $container = h('.suboption');
        var $field = nzbDonkeyOptions.addField(value, save, option);
        if (option.desc) {
            $container.append(h('label', option.desc));
        }
        $container.append(h('.field-container', $field));
        $container.classList.add(option.singleline ? 'singleline' : 'multiline');
        return $container;
    };

    nzbDonkeyOptions.base.list = function(list, save, options, key) {
        var $container = h('.suboption.list');
        var $wrapper, shown = true;

        if (options.desc) {
            var $label = $container.appendChild(h('label', options.desc));
            if (options.collapsible) {
                shown = false;
                var $triangle = h('span.triangle', {
                    onclick: function() {
                        shown = !shown;
                        if (shown) {
                            $triangle.textContent = '▼';
                            slideYShow($wrapper);
                        } else {
                            $triangle.textContent = '▶';
                            slideYHide($wrapper);
                        }
                    },
                }, '▶');
                $label.prepend($triangle);
            }
        }

        list = list || [];
        var $table = $container.appendChild(h('table'));
        if (options.desc && options.collapsible) {
            $wrapper = $container.appendChild(h('', {
                style: 'display: none'
            }, $table));
        }
        var $tbody = $table.appendChild(h('tbody'));
        var rows;
        var heads = {};

        if (options.head) {
            var $thead = h('tr');
            var prevfield;
            options.fields.forEach(function(field) {
                if (!field.bindTo || !prevfield.bindTo) {
                    var $container = heads[field.name] = h('div', field.desc);
                    $thead.append(h('th', $container));
                } else {
                    heads[field.name] = heads[prevfield.name];
                }
                prevfield = field;
            });
            $table.prepend(h('thead', $thead));
        }

        // Check if each column should be shown.
        function checkColumns(init) {
            options.fields.forEach(function(field) {
                if (!field.bindTo) {
                    return;
                }
                var show = rows.some(function(row) {
                    return row.shown[field.name];
                });
                var $head = heads[field.name];
                var isVisible = !!$head.offsetParent;
                if (show && !isVisible) {
                    setTimeout(slideXShow.bind(null, $head), init ? 0 : 500);
                } else if (!show && isVisible) {
                    if (init) {
                        $head.style.display = 'none';
                    } else {
                        slideXHide($head);
                    }
                }
            });
        }

        function saveFields() {
            var newValues = rows.map(function(getValue) {
                return getValue();
            });
            save(newValues.filter(function(rowValue) {
                if (rowValue == null || rowValue === '') {
                    return false;
                } else if (options.filter && !options.filter(rowValue)) {
                    return false;
                } else if (typeof rowValue === 'object') {
                    for (var i = 0, len = options.fields.length; i < len; i++) {
                        var field = options.fields[i];
                        if (field.required && !rowValue[field.name]) {
                            return false;
                        }
                    }
                    return Object.keys(rowValue).some(function(key) {
                        return rowValue[key] != null;
                    });
                }
                return true;
            }));
            requestAnimationFrame(function() {
                rows.forEach(function(row) {
                    row.update(newValues);
                });
                if (options.head) {
                    checkColumns(false);
                }
            });
        }

        var fieldsMap = {};
        options.fields.forEach(function(field) {
            fieldsMap[field.name] = field;
        });

        function addNewRow(animate) {
            var row;

            function remove() {
                rows.splice(rows.indexOf(row), 1);
                saveFields();
            }
            row = addListRow($tbody, null, options.fields, fieldsMap, saveFields,
                remove, false, options.sortable, animate, key);
            rows.push(row);
            requestAnimationFrame(function() {
                var rowValues = rows.map(function(getValue) {
                    return getValue();
                });
                rows.forEach(function(row) {
                    row.update(rowValues);
                });
            });
        }

        rows = list.map(function(rowData, i) {
            var row;

            function remove() {
                rows.splice(rows.indexOf(row), 1);
                saveFields();
            }
            var fields = i === 0 && options.first ? options.first : options.fields;
            row = addListRow($tbody, rowData, fields, fieldsMap, saveFields,
                remove, i === 0 && options.first,
                options.sortable, false, key);
            return row;
        });

        if (options.first && !rows.length) {
            var row = addListRow($tbody, null, options.first, fieldsMap, saveFields,
                function() {}, true, options.sortable, false, key);
            rows.push(row);
            saveFields();
        }

        // Always start with one new row.
        addNewRow();

        // Check if columns with the `bindTo` should be displayed.
        if (options.head) {
            requestAnimationFrame(checkColumns.bind(null, true));
        }

        // When user edits the last row, add another.
        function onChange(e) {
            if ($tbody.lastChild.contains(e.target)) {
                addNewRow(true);
            }
        }

        $tbody.addEventListener('input', onChange);
        $tbody.addEventListener('change', onChange);

        if (options.sortable) {
            dragula([$tbody], {
                moves: (el, source, handle) => {
                    return (!options.first || el != el.parentNode.children[0]) &&
                        handle.classList.contains('sort') &&
                        handle.closest('tbody') == $tbody;
                },
                accepts: (el, target, source, sibling) => {
                    return !sibling.classList.contains('gu-mirror');
                },
                direction: 'vertical',
                mirrorContainer: $tbody,

            }).on('cloned', ($mirror, $original) => {
                // Set the mirror's td's to a fixed width since taking a row
                // out of a table removes its alignments from the
                // table's columns.
                var $mirrorTDs = $mirror.querySelectorAll(':scope > td');
                $original.querySelectorAll(':scope > td').forEach(function($td, i) {
                    $mirrorTDs[i].style.width = $td.offsetWidth + 'px';
                });

                // Copy the value of the mirror's form elements.
                // Since `node.cloneNode()` does not do so for some of them.
                var selection = 'select, input[type=radio]';
                var $mirrorFields = $mirror.querySelectorAll(selection);
                $original.querySelectorAll(selection).forEach(function($field, i) {
                    var $node = $mirrorFields[i];
                    $node.value = $field.value;
                    if ($node.checked) {
                        // Change the name of the radio field so that checking the
                        // original element again won't uncheck the mirrored element.
                        $node.setAttribute('name', $node.getAttribute('name') + '_');
                        $field.checked = true;
                    }
                });

            }).on('dragend', () => {
                rows.forEach(function(a) {
                    var $child = a.$tr;
                    a.index = 0;
                    while (($child = $child.previousSibling) != null) {
                        a.index++;
                    }
                });
                rows.sort(function(a, b) {
                    return a.index - b.index;
                });
                saveFields();
            });
        }

        return $container;
    };

    function addListRow($table, values, fields, fieldsMap, save, remove,
        unremovable, sort, animate, key) {
        var $tr = h('tr');
        if (unremovable) {
            $tr.classList.add('unremovable');
        }
        if (animate) {
            $tr.style.display = 'none';
            setTimeout(showTR.bind(null, $tr), 100);
        }

        var getValue = function() {
            return values;
        };
        getValue.$tr = $tr;

        // Keep track which fields in this row are being shown.
        getValue.shown = {};

        var $prevtd, prevfield;
        var fieldUpdates = fields.map(function(field) {
            function saveField(newValue) {
                var name = field.name;
                if (fields.length === 1) {
                    values = newValue;
                } else if (name) {
                    values[name] = newValue;
                }
                fieldUpdates.forEach(function(up) {
                    up.checkBind(name, newValue);
                });
                save();
            }

            var $field;
            var update = {};
            update.checkBind = function(name, newValue) {
                var bindTo = field.bindTo;
                if (bindTo && bindTo.field === name) {
                    var isVisible = !!$field.offsetParent;
                    var equals = bindToEquals(bindTo.value, newValue);
                    if (equals && !isVisible) {
                        slideXShow($field);
                        getValue.shown[field.name] = true;
                    } else if (!equals && isVisible) {
                        slideXHide($field);
                        getValue.shown[field.name] = false;
                    }
                }
            };

            update.hide = function() {
                if (field.bindTo) {
                    slideXHide($field);
                }
            };

            update.checkSelect = function(newValues) {
                if (field.type === 'select') {
                    field.options
                        .filter(function(f) {
                            return f.unique;
                        })
                        .forEach(function(option) {
                            var display = newValues.some(function(rowValue) {
                                return rowValue !== values &&
                                    rowValue[field.name] === option.value;
                            }) ? 'none' : '';
                            $field
                                .querySelector('option[value="' + option.value + '"]')
                                .style.display = display;
                        });
                }
            };

            var bindTo = field.bindTo;
            var $td = bindTo && prevfield && prevfield.bindTo ?
                $prevtd : h('td');
            if (bindTo) {
                $td.classList.add('bind-to');
            }
            $prevtd = $td;
            prevfield = field;
            var $fieldContainer = $tr.appendChild($td);
            var fieldValue;
            if (!values && (fields.length > 1 ||
                    field.type === 'column' || field.type === 'row')) {
                values = {};
            }

            if (fields.length === 1) {
                fieldValue = values = values !== undefined ? values : field.default;
            } else {
                fieldValue = values[field.name] =
                    values[field.name] !== undefined ? values[field.name] : field.default;
            }

            if (nzbDonkeyOptions.fields[field.type]) {
                $field = nzbDonkeyOptions.addField(fieldValue, saveField, field);
            } else if (field.type === 'column') {
                $field = nzbDonkeyOptions.base.column(values, save, field, key);
            } else if (field.type === 'row') {
                $field = nzbDonkeyOptions.base.row(values, save, field, key);
            } else {
                throw Error('Could not find option type: ' + field.type);
            }
            $fieldContainer.append($field);

            requestAnimationFrame(function() {
                if (!bindTo) {
                    return;
                }
                if (
                    (values[bindTo.field] &&
                        !bindToEquals(bindTo.value, values[bindTo.field])) ||
                    (!values[bindTo.field] &&
                        !bindToEquals(bindTo.value,
                            fieldsMap[bindTo.field].options[0].value))
                ) {
                    $field.style.display = 'none';
                    getValue.shown[field.name] = false;
                } else {
                    if (animate) {
                        setTimeout(() => {
                            slideXShow($field);
                        }, 500);
                    } else {
                        $field.style.display = '';
                        $field.style.maxWidth = '100%;';
                    }
                    getValue.shown[field.name] = true;
                }
            });

            return update;
        });

        $tr.append(h('td', h('a.delete', {
            onclick: function() {
                fieldUpdates.forEach(function(update) {
                    update.hide();
                });
                setTimeout(function() {
                    hideTR($tr, function() {
                        $tr.remove();
                    });
                }, 250);
                remove();
            },
        }, 'delete')));

        if (!unremovable && sort) {
            $tr.append(h('td', h('a.sort', 'sort')));
        }
        $table.append($tr);

        getValue.update = function(newValues) {
            fieldUpdates.forEach(function(update) {
                update.checkSelect(newValues);
            });
        };

        return getValue;
    }

    function bindToEquals(bindToValue, fieldValue) {
        return Array.isArray(bindToValue) ?
            bindToValue.indexOf(fieldValue) > -1 : bindToValue === fieldValue;
    }

    nzbDonkeyOptions.base.singleFieldList = function(value, save, options, type) {
        options.fields = [{
            type: type,
            name: options.name
        }];
        return nzbDonkeyOptions.base.list(value, save, options);
    };

    nzbDonkeyOptions.base.column = function(values, save, option, key, top) {
        delete option.name;
        var $container;
        if (top) {
            $container = h('div.column');
            addTabOptions($container, key, values, option.options);
        } else {
            $container = addOptions(values, save, option, key);
            $container.classList.add('column');
        }
        return $container;
    };

    nzbDonkeyOptions.base.row = function(values, save, option, key, top) {
        var $container = nzbDonkeyOptions.base.column(values, save, option, key, top);
        $container.classList.add('row');
        return $container;
    };

    nzbDonkeyOptions.addField = function(value, save, option, type) {
        var fn = nzbDonkeyOptions.fields[type || option.type];
        if (!fn) {
            return;
        }
        var lastTimeStamp;
        var $field = fn(value, function(newValue, e) {
            if (e) {
                if (e.timeStamp < lastTimeStamp) {
                    return;
                }
                lastTimeStamp = e.timeStamp;
            }
            if (option.validate && !option.validate(newValue)) {
                $field.classList.add('invalid');
            } else {
                $field.classList.remove('invalid');
                save(newValue, e);
            }
        }, option);
        if (option.desc) {
            $field.setAttribute('data-title', option.desc);
        }
        if (option.disabled) {
            $field.querySelectorAll('input, select, textarea').forEach(function($f) {
                $f.setAttribute('disabled', true);
            });
        }
        return $field;
    };
})();


// Define all available fields.
nzbDonkeyOptions.fields = {};

nzbDonkeyOptions.fields.checkbox = function(value, save) {
    var $checkbox = h('input[type=checkbox]');

    if (value != null) {
        $checkbox.checked = value;
    }

    $checkbox.addEventListener('change', function() {
        save($checkbox.checked);
    });

    return $checkbox;
};

nzbDonkeyOptions.fields.text = function(value, save) {
    var $textbox = h('input[type="text"]', {
        class: "form-control"
    });
    if (value !== undefined) {
        $textbox.value = value;
    }
    var debouncedInput = util.debounce(500, function(e) {
        if (e.target.validity.valid) {
            save($textbox.value, e);
        }
    });
    $textbox.addEventListener('input', debouncedInput);
    $textbox.addEventListener('change', debouncedInput);
    return $textbox;
};

nzbDonkeyOptions.fields.password = function(value, save) {
    var $passwordbox = h('input[type="password"]', {
        "class": "form-control"
    });
    if (value !== undefined) {
        $passwordbox.value = value;
    }
    var debouncedInput = util.debounce(500, function(e) {
        if (e.target.validity.valid) {
            save($passwordbox.value, e);
        }
    });
    $passwordbox.addEventListener('input', debouncedInput);
    $passwordbox.addEventListener('change', debouncedInput);
    return $passwordbox;
};

nzbDonkeyOptions.fields.url = function(value, save, option) {
    var $field = nzbDonkeyOptions.fields.text(value, save, option);
    $field.setAttribute('type', 'url');
    return $field;
};

nzbDonkeyOptions.fields.select = function(value, save, option) {
    var valueMap = {};
    var $select = h('select', {
        onchange: function(e) {
            var val = $select.value;
            save(valueMap[val] !== undefined ? valueMap[val] : val, e);
        },
        class: "form-control"
    });
    var firstValue = null;
    option.options.forEach(function(option) {
        var value = typeof option === 'object' ? option.value : option;
        var desc = typeof option === 'object' ? option.desc : option;
        valueMap[value] = value;
        $select.append(h('option', {
            value
        }, desc));
        if (firstValue === null) {
            firstValue = value;
        }
    });
    $select.value = value || firstValue;
    return $select;
};

nzbDonkeyOptions.fields.radio = function(value, save, option) {
    var $container = h('.radio-options', {
        class: "form-control"
    });
    var name = option.name + "_" + (~~(Math.random() * 1e9)).toString(36);
    option.options.forEach(function(option) {
        var val = typeof option === 'object' ? option.value : option;
        var desc = typeof option === 'object' ? option.desc : option;
        var id = val + "_" + (~~(Math.random() * 1e9)).toString(36);
        var $row = $container.appendChild(h('.radio-option'));
        var $radio = $row.appendChild(h('input[type=radio]', {
            id,
            name,
            value: val,
            checked: value == val,
            onchange: function(e) {
                if ($radio.checked) {
                    save(val, e);
                }
            },
        }));
        if (desc) {
            $row.append(h('label', {
                for: id
            }, desc));
        }
        if (value == val) {
            $("#menu_" + value).css("display", "block");
        }
    });

    return $container;
};

nzbDonkeyOptions.fields.file = function(value, save) {
    return h('input[type=file]', {
        value,
        onchange: function(e) {
            save(e.target.files, e);
        },
        class: "form-control"
    });
};