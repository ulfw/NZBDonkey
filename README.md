# NZBDonkey

### The ultimate NZB file downloader extension for Chrome and Firefox

## Download
Download for Chrome: [Chrome Webstore](https://chrome.google.com/webstore/detail/nzbdonkey/edkhpdceeinkcacjdgebjehipmnbomce)

Download for Firefox: [Firefox Add-on](https://addons.mozilla.org/de/firefox/addon/nzbdonkey/)

## Description
Add-on to automatically download NZB files or send them to NZBGet, SABnzbd or Synology DownloadStation.

Right click on a NZBlnk link and choose "Get NZB file". If no NZBlnk link is provided, select title, header and password, then right click on the selected text and choose "Get NZB file".

Set the corresponding settings in the settings page in order to send the NZB file directly to NZBGet, SABnzbd or Synology DownloadStation.
The setting options are mostly self explanatory.

Currently in beta testing.
A more detailed description will be added soon.

## Change log
### v0.1.7
* Added support for Synology DownloadStation. CAUTION: Due to a bug in the Synology API the submitted unpack password is not recognized! See also corresponding note in the NZBMonkey documentation: (http://nzblnk.tech/nzb-monkey/#synologydls-section)
* Updated Settings Page to show only the relevant tab according to the choosen action for the NZB file.
* Renamed "Search Engines" tab to "Advanced" and added a warning alert.
* Added an option to deactivate success notifications
* Switched all search and download URLs to https where possible. Stored Search Engines settings will be overwritten upon update.
* Changed default for "Catch left mouse clicks on NZBlnk links" to true
* Small improvements to the selection analyzing routine
* Some additional bugfixes

### v0.1.6
* NZB file are now downloaded and pushed to the download programs instead of only pushing the download URL
* Meta data for title, category and password is added to the NZB file before saving it or pushing it to the download programs
* Added an option to reset the settings to the default settings
* Added an option to push the NZB file to SABnzbd as paused
* Changed communication with NZBGet from XML-RPC to JSON-RPC for better handling 

### v0.1.5
* Bugfix: wrongly named settings variable for category

### v0.1.4
* Quick bugfix of an error introduced with v0.1.3

### v0.1.3
* had to rename a variable to prevent Mozilla reviewers from kicking the add-on out of the store

### v0.1.2
* Settings page redesigned
* NZBGet: password is now passed as a parameter and not as part of the NZB filename
* Bugfix: improved the capturing of left mouse clicks on NZBlnk links
