var manifest = chrome.runtime.getManifest();
var NZBDonkeyVersion = document.getElementById("NZBDonkeyVersion");
var content = document.createTextNode(manifest.version);
NZBDonkeyVersion.appendChild(content);

$("a.nav-link").click( function() {
    if ($( this ).attr("href") == "#reset") {
        if (confirm("Reset all settings to default?")) {
            chrome.storage.sync.clear();
            window.location.reload();
        }
		return;
	} else if ($( this ).attr("href") == "#advanced") {
        if (!confirm("CAUTION: These settings are for advanced users only!\nAre you sure you want to proceed to the advanced settings?")) {
			return;
		}
    } 
	
        // Get all elements with class="tabcontent" and hide them
        $(".tabcontent").each(function(index) {
            $( this ).css("display","none");
        });
        // Get all elements with class="tablinks" and remove the class "active"
        $(".nav-link").each(function(index) {
            $( this ).removeClass( "active" );
        });
        // Show the selected tab, and add an "active" class to the link that opened the tab
        $( this ).addClass( "active" );
        $( $( this ).attr("href") ).css("display","block");
    
});

$(document).ready(function() {
    $("[id^=menu_]").each(function(index) {
        $( this ).css("display","none");
    });
    $('input[type=radio][id$=_radio]:checked').each(function(index) {
        $("#menu_" + this.value).css("display","block");
    });
    $('input[type=radio][id$=_radio]').change(function() {
        $("[id^=menu_]").each(function(index) {
            $( this ).css("display","none");
        });
        $("#menu_" + this.value).css("display","block");
    });
});

nzbDonkeyOptions.opts.saveDefaults = true;

nzbDonkeyOptions.addTab('general', [
    { type: 'h3', desc: 'Action for NZB files' },
	{
        name: 'execType',
		type: 'radio',
		options: [
			{ desc : 'Download', value : 'download' },
			{ desc : 'Send to NZBGet', value : 'nzbget' },
			{ desc : 'Send to Sabnzbd', value : 'sabnzbd' },
//			{ desc : 'Send to Synology DwonloadStation', value : 'synology' }
		],
		default: 'download'
	},
	{ type: 'plaintext', text: 'Choose what NZBDonkey shall do with the NZB file if found. You will need to the set the further settings in the corresponding tab.' },
	
	{ type: 'h3', desc: 'How to handle spaces/periods in the title/filename' },
	{
		name: 'processTitel',
		type: 'radio',
		options: [
			{ desc : 'Leave the as they are', value : false },
			{ desc : 'Convert all spaces to periods', value : 'periods' },
			{ desc : 'Convert all periods to spaces', value : 'spaces' }
		],
		default: false
	},
	{ type: 'plaintext', text: 'Choose what NZBDonkey shall do with periods and spaces in the NZB title/filename.' },
	{ type: 'h3', desc: 'Catch left mouse clicks on NZB links' },
	{
		name: 'catchLinks',
		type: 'checkbox',
		desc: 'Catch NZB links',
		default: false
	},
	{ type: 'plaintext', text: 'If activated, NZBDonkey will catch and handle left mouse clicks on a NZBLink.' },
	{ type: 'h3', desc: 'Debug Mode' },
	{
		name: 'debug',
		type: 'checkbox',
		desc: 'Activate debug mode',
		default: false
	},
	{ type: 'plaintext', text: 'If activated, NZBDonkey will issue debug information in the console.' }
]);

nzbDonkeyOptions.addTab('category', [
	{ type: 'h3', desc: 'Use categories' },
	{
		name: 'categories',
		type: 'radio',
		options: [
			{ desc : 'Do not unse categories', value : false },
			{ desc : 'Use default category', value : 'default' },
			{ desc : 'Use automatic categories', value : 'automatic' }
		],
		default: false
	},
	{ type: 'plaintext', text: 'Choose whether NZBDonkey should use category information.' },
	{ type: 'h3', desc: 'Default category' },
	{
		name: 'defaultCategory', 
		type: 'text',
		default: ''
	},
	{ type: 'plaintext', text: 'Enter the name of the default category.\nIf "use default category" is choosen, NZBDonkey will always use this category.' },
	{ type: 'h3', desc: 'Automatic categories' },
	{
		name: 'automaticCategories', 
		type: 'list', 
		head: true,
		sortable: true,
		desc: '',
		fields: [
			{ type: 'text', name: 'name', desc: 'Category name' },
			{ type: 'text', name: 'pattern', desc: 'Regex expression' }
		],
		default: [
			{
				name: 'TV-Series',
				pattern: '[e|s]\\d+'
			},
			{
				name: 'Movies',
				pattern: '(x264|xvid|bluray|720p|1080p|untouched)'
			} 
		]
	},
	{ type: 'plaintext', text: 'Enter the name of the category and the corresponding regex expression for automatic categories.\n' },
    { type: 'plaintext', text: 'If "use automatic categories" is choosen, NZBDonkey will test the NZB title/filename for the regex expressions and if matched set the category to the corresponding category name.\n' },
	{ type: 'plaintext', text: 'The regex expressions will be tested in descending order and first match will be used as category. The search is case insensitive.\n' },
	{ type: 'plaintext', text: 'If no automatic category matches, the default category will be used if set.' }
]);

nzbDonkeyOptions.addTab('download', [
	{ type: 'h3', desc: 'Default download subfolder' },
	{
		name: 'defaultPath', 
		type: 'text',
		default: ''
	},
	{ type: 'plaintext', text: 'Enter the name of a subfolder within your browsers default download folder where you would like to save the NZB files.\n' },
	{ type: 'plaintext', text: 'Leave empty if you would like to save the NZB files directly in your browsers default download folder.\n' },
	{ type: 'h3', desc: 'Use category subfolders' },
	{
		name: 'categoryFolder',
		type: 'checkbox',
		desc: 'Use category subfolders',
		default: false
	},
	{ type: 'plaintext', text: 'If activated and "use default category" or "use automatic categories" is set, NZBDonkey will save the NZB file in a category subfolder within your default download subfolder.' },
	{ type: 'h3', desc: 'Use save as dialog' },
	{
		name: 'saveAs',
		type: 'checkbox',
		desc: 'use Save as dialog',
		default: true
	},
	{ type: 'plaintext', text: 'If checked NZBDonkey will prompt you with a "Save As" dialog in order for you to choose the folder where you would like to save the NZB file.\n' },
    { type: 'plaintext', text: 'Leave it unchecked if you silently want to download the NZB files in the default folder.' },
    { type: 'plaintext', text: 'CAUTION: due to a bug in Chrome, silent download will only work if Chrome setting "Ask where to save each file before downloading" is disabled.' },
]);
	
nzbDonkeyOptions.addTab('nzbget', [
	{ type: 'h3', desc: 'Host name' },
	{
		name: 'host', 
		type: 'text',
		default: 'localhost'
	},
	{ type: 'plaintext', text: 'Enter the host name or IP address of your NZBGet server.' },
	{ type: 'h3', desc: 'Port' },
	{
		name: 'port', 
		type: 'text',
		default: '6789'
	},
	{ type: 'plaintext', text: 'Enter the port number to be used to connect to your NZBGet server. Usually this is 6789 for http and 6791 for https connections.' },
	{ type: 'h3', desc: 'Connection scheme' },
	{
		name: 'scheme',
		type: 'radio',
		options: [
			{ desc : 'connect via secure https', value : 'https' },
			{ desc : 'connect via normal http', value : 'http' },
		],
		default: 'http'
	},
	{ type: 'plaintext', text: 'Choose whether to connect to your server via normal http or secure https connection.' },
	{ type: 'h3', desc: 'NZBGet username' },
	{
		name: 'username', 
		type: 'text',
		default: ''
	},
	{ type: 'plaintext', text: 'Enter the username to access the NZBGet server.\n' },
    { type: 'plaintext', text: 'You can use either the ControlUser, the RestricetUser or the AddUser as set on the security settings page of your NZBGet server.\n' },
    { type: 'plaintext', text: 'It is however recommended to set a username and password for the AddUser on the security settings page of your NZBGet server and to use this user.' },
	{ type: 'h3', desc: 'NZBGet password' },
	{
		name: 'password', 
		type: 'text',
		default: ''
	},
	{ type: 'plaintext', text: 'Enter the password for above user to access the NZBGet server.' },
	{ type: 'h3', desc: 'Add to NZBGet in pause mode' },
	{
		name: 'addPaused',
		type: 'checkbox',
		desc: 'add as paused',
		default: false
	},
	{ type: 'plaintext', text: 'If checked, the NZB file will be added to NZBGet in pause mode.\nYou will have to unpause it manualy in the NZBGet web gui to start the download.' },
]);

nzbDonkeyOptions.addTab('sabnzbd', [
	{ type: 'h3', desc: 'Host name' },
	{
		name: 'host', 
		type: 'text',
		default: 'localhost'
	},
	{ type: 'plaintext', text: 'Enter the host name or IP address of your SABnzbd server.' },
	{ type: 'h3', desc: 'Port' },
	{
		name: 'port', 
		type: 'text',
		default: '8080'
	},
	{ type: 'plaintext', text: 'Enter the port number to be used to connect to your SABnzbd server. Usually this is 8080 for http connection.' },
	{ type: 'h3', desc: 'Connection scheme' },
	{
		name: 'scheme',
		type: 'radio',
		options: [
			{ desc : 'connect via secure https', value : 'https' },
			{ desc : 'connect via normal http', value : 'http' },
		],
		default: 'http'
	},
	{ type: 'plaintext', text: 'Choose whether to connect to your server via normal http or secure https connection.\n' },
	{ type: 'plaintext', text: 'To connect via https, SABnzbd needs to be configured for https connections and the port above to be set accordingly.' },
	{ type: 'h3', desc: 'API key' },
	{
		name: 'apiKey', 
		type: 'text',
		default: ''
	},
	{ type: 'plaintext', text: 'Enter either the SABnzbd ApiKey or the SABnzbd NZBKey. Get it from the general settings page of your SABnzbd server.\n' },
	{ type: 'plaintext', text: 'It is recommended to use the NZBKey.' },
	{ type: 'h3', desc: 'Add to SABnzbd in pause mode' },
	{
		name: 'addPaused',
		type: 'checkbox',
		desc: 'add as paused',
		default: false
	},
	{ type: 'plaintext', text: 'If checked, the NZB file will be added to SABnzbd in pause mode.\nYou will have to unpause it manualy in the SABnzbd web gui to start the download.' }
]);

nzbDonkeyOptions.addTab('searchengines', [
	{ type: 'h3', desc: 'Search Engines' },
	{
		name: 'searchengines', 
		type: 'list', 
		head: true,
		desc: 'DO NOT TOUCH THESE SETTINGS UNLESS YOU KNOW WHAT YOU DO!',
		fields: [
			{ type: 'checkbox', name: 'active', desc: 'Active' },
			{ type: 'text', name: 'name', desc: 'Search Engine Name' },
			{ type: 'text', name: 'searchURL', desc: 'Search URL' },
			{ type: 'text', name: 'searchPattern', desc: 'Regex expression' },
			{ type: 'select', name: 'searchGroup', options : [
				{ desc: '1', value: 1 },
				{ desc: '2', value: 2 },
				{ desc: '3', value: 3 },
				{ desc: '4', value: 4 },
				{ desc: '5', value: 5 },
			], desc: 'Group no.' },
			{ type: 'text', name: 'downloadURL', desc: 'Download URL' },
		],
		default: [
			{
				"active": true,
				"downloadURL": "https://newzleech.com/?m=gen&dl=1&post=%s",
				"name": "Newzleecher",
				"searchPattern": "name=\"binary\\[\\]\" value=\"(.*?)\"",
				"searchGroup": 1,
				"searchURL": "https://newzleech.com/?m=search&q=%s"
			},
			{
				"active": true,
				"downloadURL": "https://nzbindex.com/download/%s/",
				"name": "NZBIndex",
				"searchPattern": "label for=\"box(\\d{8,})\".*?class=\"highlight\"",
				"searchGroup": 1,
				"searchURL": "https://nzbindex.com/search/?sort=agedesc&hidespam=1&q=%s"
			},
			{
				"active": true,
				"downloadURL": "https://binsearch.info/?action=nzb&%s=1",
				"name": "BinSearch",
				"searchPattern": "name=\"(\\d{9,})\"",
				"searchGroup": 1,
				"searchURL": "https://binsearch.info/?max=100&adv_age=1100&q=%s"
			},
			{
				"active": true,
				"downloadURL": "https://binsearch.info/?action=nzb&%s=1&server=2",
				"name": "BinSearch (other groups)",
				"searchPattern": "name=\"(\\d{9,})\"",
				"searchGroup": 1,
				"searchURL": "https://binsearch.info/?max=100&adv_age=1100&server=2&q=%s"
			},
			{
				"active": true,
				"downloadURL": "http://nzbking.com/nzb:%s",
				"name": "NZBKing",
				"searchPattern": "href=\"\\/details:(.*?)\\/\"",
				"searchGroup": 1,
				"searchURL": "http://nzbking.com/search/?q=%s"
			}
		],
	}
]);

