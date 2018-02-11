// Ask the background script if we should catch left clicks on NZBLinks
chrome.runtime.sendMessage({nzbDonkeyCatchLinks: true}, function(response) {

    // if yes
    if (response.nzbDonkeyCatchLinks) {

        // add an event listener
        document.addEventListener('click', function(event) {
            event = event || window.event;
            var target = event.target || event.srcElement;

            while (target) {
                if (target instanceof HTMLAnchorElement) {
                    if (target.getAttribute('href').match(/^nzblnk/i)) {
                        event.preventDefault();
                        chrome.runtime.sendMessage({ nzbDonkeyNZBLinkURL: target.getAttribute('href') });
                    }
                    break;
                }
                target = target.parentNode;
            }
        }, true);
        
    }

});


chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {

    if (request.nzbDonkeyAnalyzeSelection) {

        // define the variables
        var NZBselection = "",
            NZBtitle = "",
            NZBheader = "",
            NZBpassword = "";

        // get html source from the selected text and replace input tags by their value
        // encapsulate the value with line breaks to make sure it is on a single line
        NZBselection = getSelectionHtml().replace(/<input.+?value\s*?=\s*?['"](.*?)['"].*?>/ig, "\n$1\n");

        // add some line breaks to some ending tags to avoid text rendered on different lines to be joined in one line
        NZBselection = NZBselection.replace(/(<\/div>|<\/span>|<\/p>|<\/td>|<\/li>)/ig, "$1\n");

        // remove all tags, blank lines and leading/trailing spaces
        NZBselection = jQuery(NZBselection).text().replace(/^\s*([\s|\S]*?)\s*?$/mg, "$1");

        // test if the selection contains a description for the header starting with some common words used for and ending with a colon
        if (/^.*((header|subje[ck]t|betreff).*:\s*)+(\S.*\S)[\n|\r]/im.test(NZBselection)) {
            // set the header to the text after the description
            // we search for any text until we find it and then get all of it until the next line break
            // like this we will find the header information either if placed on the same line or if placed on the next line
            // we also take care of if the description is used twice (e.g. before the hidden tag and in the hidden tag again)
            NZBheader = NZBselection.match(/^.*((header|subje[ck]t|betreff).*:\s*)+(\S.*\S)[\n|\r]/im)[3];
        }

        // test if the selection contains a NZB file name in the format of nzbfilename{{password}}
        // we first assume that the NZB file name is on its own line
        if (/^(.*){{(.*?)}}/m.test(NZBselection)) {
            // set the title and password according to the NZB filename
            NZBtitle = NZBselection.match(/^(.*){{(.*?)}}/m)[1]; 
            NZBpassword = NZBselection.match(/^(.*){{(.*?)}}/m)[2];
            // check if maybe there is nevertheless a leading description and remove it from the title
            // assuming that the leading description includes the word NZB and ends with a colon
            if (/.*nzb.*:\s*/i.test(NZBtitle)) {
                NZBtitle = NZBtitle.replace(/.*nzb.*:\s*/i, "");
            }
        }
        // if no NZB file name was found the title and password have to be set by another way
        else {
            // in this case simply set title to the first line of the selection
            NZBtitle = NZBselection.split("\n")[0];

            // test if the selection contains a description for the password starting with some common words used for and ending with a colon
            if (/^.*((passwor[td]|pw|pass).*:\s*)+(\S.*\S)[\n|\r]/im.test(NZBselection)) {
                // set the password to the text after the description
                // we search for any text until we find it and then get all of it until the next line break
                // like this we will find the password either if placed on the same line or if placed on the next line
                // we also take care of if the description is used twice (e.g. before the hidden tag and in the hidden tag again)
                NZBpassword = NZBselection.match(/^.*((passwor[td]|pw|pass).*:\s*)+(\S.*\S)[\n|\r]/im)[3];
            }
        }

        // start the overlay
        $.prompt({
            state0: {
                title: "NZBDonkey",
                html: '<label class="linker" for="NZBtitle">Title:</label><span class="linker"><input type="text" id="NZBtitle" name="ftitle" value="' + NZBtitle + '"/></span><br/>'
                    + '<label class="linker" for="NZBheader">Header:</label><span class="linker"><input type="text" id="NZBheader" name="fhead" value="' + NZBheader + '"/></span><br/>'
                    + '<label class="linker" for="NZBpassword">Password:</label><span class="linker"><input type="text" id="NZBpassword" name="fpass" value="' + NZBpassword + '"/></span><br/>'
                    + '<label class="linker" for="NZBselection">Selected text:</label><span class="linker"><textarea id="NZBselection" rows="7">' + NZBselection + '</textarea></span><br/>',
                buttons: {
                    "Get NZB file": "open",
                    "Cancel": "close"
                },
                focus: 0,
                close: function(e) {
                    sendResponse({
                        cancle: true
                    });                    
                },
                submit: function(e, v, m, f) {
                    if (v === "close") {
                        sendResponse({
                            cancle: true
                        });  
                        return true;
                    }
                    else if (v === "open") {
                        sendResponse({
                            nzbTitle : f.ftitle,
                            nzbHeader : f.fhead,
                            nzbPassword : f.fpass
                        });
                    }
                }
            }
        });

        // function to get the html from the selection
         function getSelectionHtml() {
            var html = "";
            if (typeof window.getSelection != "undefined") {
                var sel = window.getSelection();
                if (sel.rangeCount) {
                    var container = document.createElement("div");
                    for (var i = 0, len = sel.rangeCount; i < len; ++i) {
                        container.appendChild(sel.getRangeAt(i).cloneContents());
                    }
                    html = container.innerHTML;
                }
            }
            return "<div>" + html + "</div>"; // encapsulate with a div container otherwise jQuery.text() will remove plain text
        }

    }

    return true;
    
});