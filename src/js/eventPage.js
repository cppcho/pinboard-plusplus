import * as Constants from './constants';
import Api from './api';
import Utils from './utils';

// Cached storage data and network requests
// options: refresh when options updated
// tags, bookmarks: clear when there is new bookmark / updated bookmark, deleted bookmarks
// null = not set
const cachedData = {
  options: null,
  tab: null,
  tags: null,
  bookmarks: {},  // key: url, value: bookmark data
};

// helper functions

/**
 * Get options from storage
 *
 * @return {promise}
 */
function getOptions() {
  if (cachedData.options !== null) {
    return Promise.resolve(cachedData.options);
  }

  return new Promise((resolve) => {
    chrome.storage.sync.get(Constants.OPTIONS_DEFAULT, (options) => {
      cachedData.options = options;
      resolve(options);
    });
  });
}

/**
 * Get bookmark info from url
 *
 * @param {string} url
 * @return {promise} null or pinboard bookmark info object
 */
function getBookmark(url) {
  if (!Utils.isBookmarkable(url)) {
    return Promise.resolve(null);
  }

  if ({}.hasOwnProperty.call(cachedData.bookmarks, url)) {
    return Promise.resolve(cachedData.bookmarks[url]);
  }

  return getOptions()
    .then((options) => {
      if (options[Constants.OPTIONS_AUTH_TOKEN_IS_VALID]) {
        return Api.getBookmark(options[Constants.OPTIONS_AUTH_TOKEN], url);
      }
      return {};
    })
    .then((json) => {
      let bookmark = null;
      if (json.posts && json.posts.length > 0) {
        bookmark = json.posts[0];
      }
      cachedData.bookmarks[url] = bookmark;
      return bookmark;
    });
}

/**
 * Get all tags
 *
 * @return {promise} array of tags
 */
function getTags() {
  if (cachedData.tags !== null) {
    return Promise.resolve(cachedData.tags);
  }

  return getOptions()
    .then((options) => {
      if (options[Constants.OPTIONS_AUTH_TOKEN_IS_VALID]) {
        return Api.getTags(options[Constants.OPTIONS_AUTH_TOKEN]);
      }
      return {};
    })
    .then((json) => {
      try {
        cachedData.tags = Object.keys(json);
        return cachedData.tags;
      } catch (e) {
        return Promise.reject(e);
      }
    });
}

/**
 * Check if url is bookmarked on Pinboard
 *
 * @param {string} url
 * @return {promise} true or false
 */
function isBookmarked(url) {
  return getBookmark(url).then(bookmark => bookmark !== null);
}

/**
 * Set the browser action icon for tabId to 'bookmarked' or not
 *
 * @param {boolean} bookmarked
 * @param {integer} tabId
 */
function setIconBookmarked(bookmarked, tabId) {
  console.log('setIconBookmarked bookmarked: %s tabId: %d', bookmarked, tabId);

  if (bookmarked) {
    chrome.browserAction.setIcon({
      path: {
        19: 'img/ba-bookmarked-19.png',
        38: 'img/ba-bookmarked-38.png',
      },
      tabId,
    });
  } else {
    chrome.browserAction.setIcon({
      path: {
        19: 'img/ba-19.png',
        38: 'img/ba-38.png',
      },
      tabId,
    });
  }
}

/**
 * Async. Update the browser action icon and its popup for current tab
 *
 * @param {object} if currentTab is undefined, use the last active tab in current window
 */
function updateIconAndPopupForTab(currentTab) {
  console.log('updateIconAndPopupForTab currentTab: %o', currentTab);

  // 1. If currentTab exists, use currentTab
  // 2. Else if currentTab is undefined, use cached tab
  // 3. If cached tab does not exist, get the current active tab

  const getTab = new Promise((resolve) => {
    if (typeof currentTab !== 'undefined') {
      cachedData.tab = currentTab;
      resolve(currentTab);
    } else if (cachedData.tab !== null) {
      resolve(cachedData.tab);
    } else {
      chrome.tabs.query({ active: true, currentWindow: true }, (ts) => {
        console.log('chrome.tabs.query tabs:', ts);

        const t = ts[0];
        if (t) {
          cachedData.tab = t;
          resolve(t);
        } else {
          resolve(null);
        }
      });
    }
  });

  getTab
    .then((tab) => {
      console.log('updateIconAndPopupForTab getTab: %o', tab);

      if (!tab || !tab.id || tab.id === chrome.tabs.TAB_ID_NONE || !tab.url) {
        console.error('updateIconAndPopupForTab empty tab');
        return;
      }

      const tabId = tab.id;
      const tabUrl = tab.url;

      getOptions()
        .then((options) => {
          if (options[Constants.OPTIONS_AUTH_TOKEN].length === 0) {
            setIconBookmarked(false, tabId);
            chrome.browserAction.setPopup({ popup: 'html/popup-empty-auth.html', tabId });
          } else if (!options[Constants.OPTIONS_AUTH_TOKEN_IS_VALID]) {
            setIconBookmarked(false, tabId);
            chrome.browserAction.setPopup({ popup: 'html/popup-invalid-auth.html', tabId });
          } else if (!Utils.isBookmarkable(tabUrl)) {
            setIconBookmarked(false, tabId);
            chrome.browserAction.setPopup({ popup: 'html/popup-invalid-url.html', tabId });
          } else {
            chrome.browserAction.setPopup({ popup: 'html/popup.html', tabId });
            isBookmarked(tabUrl)
              .then((bookmarked) => {
                setIconBookmarked(bookmarked, tabId);
              });
          }
        });
    });
}

// Listeners

// Reload options cache when storage changed
chrome.storage.onChanged.addListener((changes) => {
  console.log('chrome.storage.onChanged changes: %o', changes);

  if (cachedData.options !== null) {
    const changeKeys = Object.keys(changes);

    if (changeKeys.length > 0) {
      let updated = false;

      changeKeys.forEach((key) => {
        if ({}.hasOwnProperty.call(Constants.OPTIONS_DEFAULT, key)) {
          cachedData.options[key] = changes[key].newValue;
          updated = true;
        }
      });

      if (updated) {
        // clear all tags and bookmarks caches as the user may change
        // to another pinboard account
        cachedData.tags = null;
        cachedData.bookmarks = {};

        // ..and also update the current browser action
        updateIconAndPopupForTab();
      }
    }
  }
});

// Update browser action icon when tab is activated
chrome.tabs.onActivated.addListener((activeInfo) => {
  console.log('chrome.tabs.onActivated activeInfo: %o', activeInfo);

  chrome.tabs.get(activeInfo.tabId, (tab) => {
    updateIconAndPopupForTab(tab);
  });
});

// Update browser action icon when url changed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  console.log('chrome.tabs.onUpdated tabId: %d changeInfo: %o tab: %o', tabId, changeInfo, tab);

  if (changeInfo.status === 'complete' && tab.active) {
    updateIconAndPopupForTab(tab);
  }
});

// Update browser action icon when window focus changed
chrome.windows.onFocusChanged.addListener((windowId) => {
  console.log('chrome.windows.onFocusChanged windowId: %d', windowId);

  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // All chrome windows have lost focus
    return;
  }

  // Get the active tab of the new focus window and update its icon
  chrome.windows.get(windowId, { populate: true }, (window) => {
    if (window && window.tabs && Array.isArray(window.tabs)) {
      window.tabs.forEach((tab) => {
        if (tab.active) {
          updateIconAndPopupForTab(tab);
        }
      });
    }
  });
});

// handle message from content scripts / popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('chrome.runtime.onMessage message: %o sender: %o', message, sender);

  let async = false;

  if (message) {
    switch (message.type) {
      case Constants.ACTION_GET_BOOKMARK_FROM_URL: {
        async = true;

        const result = {
          bookmark: null,
          options: null,
          error: false,
        };

        getOptions()
          .then((options) => {
            result.options = options;

            return getBookmark(message.url);
          })
          .then((bookmark) => {
            result.bookmark = bookmark;
          })
          .catch(() => {
            result.error = true;
          })
          .then(() => {
            sendResponse(result);
          });
        break;
      }
      case Constants.ACTION_GET_POPUP_INFO: {
        async = true;

        const result = {
          error: false,   // error mesage, false for no error
          bookmark: null, // null for no bookmark, otherwise array from pinboard
          tags: [],       // tags for autocomplete, must be array
        };

        getTags()
          .then((tags) => {
            result.tags = tags;
            return getBookmark(message.url);
          })
          .then((bookmark) => {
            result.bookmark = bookmark;
          })
          .catch(() => {
            result.error = true;
          })
          .then(() => {
            sendResponse(result);
          });
        break;
      }
      case Constants.ACTION_ADD_BOOKMARK:
      case Constants.ACTION_DELETE_BOOKMARK: {
        async = true;

        const result = {
          error: false,    // error message, false for no error
        };

        getOptions()
          .then((options) => {
            // Add bookmark
            if (message.type === Constants.ACTION_ADD_BOOKMARK) {
              const data = {
                url: message.url,
                description: message.title,
                extended: message.description,
                tags: message.tags,
                shared: message.private ? 'no' : 'yes',
                toread: message.readLater ? 'yes' : 'no',
              };
              return Api.addBookmark(options[Constants.OPTIONS_AUTH_TOKEN], data);
            }

            // Or delete bookmark
            return Api.deleteBookmark(options[Constants.OPTIONS_AUTH_TOKEN], message.url);
          })
          .then((json) => {
            if (json.result_code !== 'done') {
              throw new Error(json.result_code);
            }
          })
          .catch(() => {
            result.error = true;
          })
          .then(() => {
            cachedData.tags = null;
            cachedData.bookmarks = {};

            updateIconAndPopupForTab();

            sendResponse(result);
          });
        break;
      }
      default:
        console.error('chrome.runtime.onMessage unexpected message.type %s', message.type);
        break;
    }
  }

  // return true to indicate you wish to send a response asynchronously
  return async;
});

// Update browser action icon and popup html once this background script runtime
// to prevent some cases that the browser action is not updated
updateIconAndPopupForTab();
