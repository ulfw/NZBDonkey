/* global chrome */

var manifest = chrome.runtime.getManifest();

chrome.options.opts.saveDefaults = true;

chrome.options.opts.about  = '<h2>' + manifest.name + ' <small>v' + manifest.version + '</small></h2>';
chrome.options.opts.about += '<h3>' + manifest.description + '</h3><br />';

chrome.options.opts.about += `
<p>
Copyright 2018 by Tensai<br />
<br />
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"),
to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense,
and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:<br />
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.<br />
<br />
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.<br />
<br />
<br />
Homepage: <a href="https://tensai75.github.io/NZBDonkey">https://tensai75.github.io/NZBDonkey</a>
<br />
GitHub page: <a href="https://github.com/Tensai75/NZBDonkey">https://github.com/Tensai75/NZBDonkey</a>
<br />
<br />
Please open a GitHub issue for support questions.
<br />
<br />
<br />
<br />
<br />
<br />
<br />
<br />
<br />
<br />
<br />
<br />
</p>
`;

chrome.options.addTab('General', [
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
	{ type: 'html', html: 'Choose what NZBDonkey shall do with the NZB file if found. You will need to the set the further settings in the corresponding tab.' },
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
	{ type: 'html', html: 'Choose what NZBDonkey shall do with periods and spaces in the NZB title/filename.' },
	{ type: 'h3', desc: 'Catch left mouse clicks on NZB links' },
	{
		name: 'catchLinks',
		type: 'checkbox',
		desc: 'Catch NZB links',
		default: false
	},
	{ type: 'html', html: 'If activated, NZBDonkey will catch and handle left mouse clicks on a NZBLink.' },
	{ type: 'h3', desc: 'Debug Mode' },
	{
		name: 'debug',
		type: 'checkbox',
		desc: 'Activate debug mode',
		default: false
	},
	{ type: 'html', html: 'If activated, NZBDonkey will issue debug information in the console.' }
]);

chrome.options.addTab('Categories', [
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
	{ type: 'html', html: 'Choose whether NZBDonkey should use category information.' },
	{ type: 'h3', desc: 'Default category' },
	{
		name: 'defaultCategory', 
		type: 'text',
		default: ''
	},
	{ type: 'html', html: 'Enter the name of the default category.<br />If "use default category" is choosen, NZBDonkey will always use this category.' },
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
	{ type: 'html', html: 'Enter the name of the category and the corresponding regex expression for automatic categories.<br />' },
    { type: 'html', html: 'If "use automatic categories" is choosen, NZBDonkey will test the NZB title/filename for the regex expressions and if matched set the category to the corresponding category name.<br />' },
	{ type: 'html', html: 'The regex expressions will be tested in descending order and first match will be used as category. The search is case insensitive.<br />' },
	{ type: 'html', html: 'If no automatic category matches, the default category will be used if set.' }
]);

chrome.options.addTab('Download', [
	{ type: 'h3', desc: 'Default download subfolder' },
	{
		name: 'defaultPath', 
		type: 'text',
		default: ''
	},
	{ type: 'html', html: 'Enter the name of a subfolder within your browsers default download folder where you would like to save the NZB files.<br />' },
	{ type: 'html', html: 'Leave empty if you would like to save the NZB files directly in your browsers default download folder.<br />' },
	{ type: 'h3', desc: 'Use category subfolders' },
	{
		name: 'categoryFolder',
		type: 'checkbox',
		desc: 'Use category subfolders',
		default: false
	},
	{ type: 'html', html: 'If activated and "use default category" or "use automatic categories" is set, NZBDonkey will save the NZB file in a category subfolder within your default download subfolder.' },
	{ type: 'h3', desc: 'Use save as dialog' },
	{
		name: 'saveAs',
		type: 'checkbox',
		desc: 'use Save as dialog',
		default: true
	},
	{ type: 'html', html: 'If checked NZBDonkey will prompt you with a "Save As" dialog in order for you to choose the folder where you would like to save the NZB file.<br />' },
    { type: 'html', html: 'Leave it unchecked if you silently want to download the NZB files in the default folder.' },
]);
	
chrome.options.addTab('NZBget', [
	{ type: 'h3', desc: 'Host name' },
	{
		name: 'host', 
		type: 'text',
		default: 'localhost'
	},
	{ type: 'html', html: 'Enter the host name or IP address of your NZBGet server.' },
	{ type: 'h3', desc: 'Port' },
	{
		name: 'port', 
		type: 'text',
		default: '6789'
	},
	{ type: 'html', html: 'Enter the port number to be used to connect to your NZBGet server. Usually this is 6789 for http and 6791 for https connections.' },
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
	{ type: 'html', html: 'Choose whether to connect to your server via normal http or secure https connection.' },
	{ type: 'h3', desc: 'NZBGet username' },
	{
		name: 'username', 
		type: 'text',
		default: ''
	},
	{ type: 'html', html: 'Enter the username to access the NZBGet server.<br />' },
    { type: 'html', html: 'You can use either the ControlUser, the RestricetUser or the AddUser as set on the security settings page of your NZBGet server.<br />' },
    { type: 'html', html: 'It is however recommended to set a username and password for the AddUser on the security settings page of your NZBGet server and to use this user.' },
	{ type: 'h3', desc: 'NZBGet password' },
	{
		name: 'password', 
		type: 'text',
		default: ''
	},
	{ type: 'html', html: 'Enter the password for above user to access the NZBGet server.' },
	{ type: 'h3', desc: 'Add to NZBGet in pause mode' },
	{
		name: 'addPaused',
		type: 'checkbox',
		desc: 'add as paused',
		default: false
	},
	{ type: 'html', html: 'If checked, the NZB file will be added to NZBGet in pause mode.<br />You will have to unpause it manualy in the NZBGet web gui to start the download.' },
]);

chrome.options.addTab('SABnzbd', [
	{ type: 'h3', desc: 'Host name' },
	{
		name: 'host', 
		type: 'text',
		default: 'localhost'
	},
	{ type: 'html', html: 'Enter the host name or IP address of your SABnzbd server.' },
	{ type: 'h3', desc: 'Port' },
	{
		name: 'port', 
		type: 'text',
		default: '8080'
	},
	{ type: 'html', html: 'Enter the port number to be used to connect to your SABnzbd server. Usually this is 8080 for http connection.' },
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
	{ type: 'html', html: 'Choose whether to connect to your server via normal http or secure https connection.<br />' },
	{ type: 'html', html: 'To connect via https, SABnzbd needs to be configured for https connections and the port above to be set accordingly.' },
	{ type: 'h3', desc: 'API key' },
	{
		name: 'apiKey', 
		type: 'text',
		default: ''
	},
	{ type: 'html', html: 'Enter either the SABnzbd ApiKey or the SABnzbd NZBKey. Get it from the general settings page of your SABnzbd server.<br />' },
	{ type: 'html', html: 'It is recommended to use the NZBKey.' },
]);

chrome.options.addTab('Search Engines', [
	{
		name: 'searchEngines', 
		type: 'list', 
		head: true,
//		sortable: true,
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
				"downloadURL": "https://www.newzleech.com/?m=gen&dl=1&post=%s",
				"name": "Newzleecher",
				"searchPattern": "name=\"binary\\[\\]\" value=\"(.*?)\"",
				"searchGroup": 1,
				"searchURL": "https://www.newzleech.com/?m=search&q=%s"
			},
			{
				"active": true,
				"downloadURL": "http://nzbindex.com/download/%s/",
				"name": "NZBIndex",
				"searchPattern": "label for=\"box(\\d{8,})\".*?class=\"highlight\"",
				"searchGroup": 1,
				"searchURL": "https://nzbindex.com/search/?sort=agedesc&hidespam=1&q=%s"
			},
			{
				"active": true,
				"downloadURL": "http://www.binsearch.info/?action=nzb&%s=1",
				"name": "BinSearch",
				"searchPattern": "name=\"(\\d{9,})\"",
				"searchGroup": 1,
				"searchURL": "https://binsearch.info/?max=100&adv_age=1100&q=%s"
			},
			{
				"active": true,
				"downloadURL": "http://www.binsearch.info/?action=nzb&%s=1&server=2",
				"name": "BinSearch (other groups)",
				"searchPattern": "name=\"(\\d{9,})\"",
				"searchGroup": 1,
				"searchURL": "https://binsearch.info/?max=100&adv_age=1100&server=2&q=%s"
			},
			{
				"active": true,
				"downloadURL": "http://www.nzbking.com/nzb:%s",
				"name": "NZBKing",
				"searchPattern": "href=\"\\/details:(.*?)\\/\"",
				"searchGroup": 1,
				"searchURL": "http://www.nzbking.com/search/?q=%s"
			}
		],
	},
	{ type: 'html', html: '<strong>Active:</strong> check if you want to use this search engine<br />' },
	{ type: 'html', html: '<strong>Search Engine Name:</strong> name of the search engine<br />' },
	{ type: 'html', html: '<strong>Search URL:</strong> URL called for a NZB file search. Use "%s" for the search string.<br />' },
	{ type: 'html', html: '<strong>Regex expression:</strong> regex expression to be used to search in the search results page for the NZB file ID. The NZB file ID has to be in a capturing group ().<br />' },
	{ type: 'html', html: '<strong>Group no.:</strong> number of the capturing group in the regex expression that does contain the NZB file ID.<br />' },
	{ type: 'html', html: '<strong>Download URL:</strong> URL called to download the NZB file. Use "%s" for the NZB file ID.' },
	{ type: 'html', html: '<p><strong>CAUTION: these search engines settings will likely be overwritten on updates of this extension.</strong><br />Make sure to save your personal search engine settings.</p>' },
]);

