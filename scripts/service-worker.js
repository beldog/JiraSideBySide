/**
 * Author: hector.lopez@neurored.com
 * Date: 2024-01-20
 */

//Constants
const ORIGIN = 'https://support.hlag.com';
const DEBUG = false;

// Allows users to open the side panel by clicking on the action toolbar icon
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));


async function sendMessage(tabId, info, tab){
  if (!tab.url) return;
  const url = new URL(tab.url);

  await chrome.sidePanel.setOptions({
    tabId,
    path: 'sidepanel.html',
    enabled: true
  });

  if(url.href.match(/ITOPTI-[0-9]+/) != null){
    if(DEBUG) console.log("Issue found sending message", url);
    chrome.runtime.sendMessage({
      url: url,
      debug: DEBUG
    });
  }
  else{
    if(DEBUG)console.log("Url not matching ITOPTI pattern. Nothing to do.");
  }
}

chrome.tabs.onActivated.addListener(async (info) => {
  try{
    if(DEBUG) console.log("Tab activated", info);

    chrome.tabs.get(info.tabId, function(tab) {
      if(tab.url != null){
        const url = new URL(tab.url);

        if (url.origin === ORIGIN) {
          //chrome.sidePanel.open({ windowId: tab.windowId });
          if(DEBUG) console.log("tab info:", tab);
          sendMessage(info.tabId, info, tab);
        }
      }
    });
  }
  catch(err){console.log("URL not valid", tab.url)}
});

chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  try{
    const url = new URL(tab.url);

    if (url.origin === ORIGIN) {
      //chrome.sidePanel.open({ windowId: tab.windowId });
      if(info.status === "complete"){ //check if all frames/resources have been loaded
        sendMessage(tabId, info, tab);
      }
    }
  }
  catch(err){console.log("URL not valid", tab.url)}
});
