import Api from './api';
import Utils from './utils';
import * as Constants from './constants';

// cached storage data and network requests
// options: refresh when options updated
// tab, tags, bookmarks: clear when there is new bookmark / updated bookmark, deleted bookmarks
// null = not set
const cachedData = {
  options: null,
  tab: null,
  tags: null,
  bookmarks: {},  // key: url, value: bookmark data
};

// helper functions

// async
function getOptions() {
  if (cachedData.options !== null) {
    return Promise.resolve(cachedData.options);
  }

  return new Promise((resolve) => {
    chrome.storage.sync.get(Constants.OPTIONS_DEFAULT, (options) => {
      console.log('storage.sync.get', options);

      cachedData.options = options;
      resolve(options);
    });
  });
}

// async
function getBookmark(url) {
  if (!Utils.isBookmarkable(url)) {
    return Promise.resolve(null);
  }

  if (cachedData.bookmarks.hasOwnProperty(url)) {
    return Promise.resolve(cachedData.bookmarks[url]);
  }

  return getOptions()
    .then(options => Api.getBookmark(options[Constants.OPTIONS_AUTH_TOKEN], url))
    .then((json) => {
      console.log('getBookmark: ', json);

      // json.posts must be array
      let bookmark = null;
      if (json.posts.length > 0) {
        bookmark = json.posts[0];
      }
      cachedData.bookmarks[url] = bookmark;
      return bookmark;
    });
}

// async
function getTags() {
  if (cachedData.tags !== null) {
    return Promise.resolve(cachedData.tags);
  }

  return getOptions()
    .then(options => Api.getTags(options[Constants.OPTIONS_AUTH_TOKEN]))
    .then((json) => {
      console.log('getTags: ', json);

      try {
        cachedData.tags = Object.keys(json);
        return cachedData.tags;
      } catch (e) {
        return Promise.reject(e);
      }
    });
}

// async. check if url is bookmarked on pinboard
function isBookmarked(url) {
  return getBookmark(url).then(bookmark => bookmark !== null);
}

// set the browser action icon to pinned / unpinned
// TODO
function setIconBookmarked(bookmarked, tabId) {
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

// update browser action icon for tab
// cache current tab
// if currentTab is undefined, use cached tab
function updateIconForTab(currentTab) {
  console.log('cachedData.tab', cachedData.tab);
  console.log('cacheTabAndUpdateIcon', currentTab);

  let tab;
  if (typeof currentTab === 'undefined') {
    tab = cachedData.tab;
  } else {
    cachedData.tab = tab = currentTab;
  }

  console.log('cachedData', cachedData);

  if (!tab || !tab.id || tab.id === chrome.tabs.TAB_ID_NONE || !tab.url) {
    return;
  }

  const tabId = tab.id;
  const tabUrl = tab.url;

  if (!Utils.isBookmarkable(tabUrl)) {
    setIconBookmarked(false, tabId);
  } else {
    isBookmarked(tabUrl)
      .then((bookmarked) => { setIconBookmarked(bookmarked, tabId); });
  }
}

// listeners

// reload option cache when storage changed
chrome.storage.onChanged.addListener((changes) => {
  console.log('storage.onChanged', changes);

  if (cachedData.options !== null) {
    const changeKeys = Object.keys(changes);

    if (changeKeys.length > 0) {
      let updated = false;

      changeKeys.forEach((key) => {
        if (Constants.OPTIONS_DEFAULT.hasOwnProperty(key)) {
          cachedData.options[key] = changes[key].newValue;
          updated = true;
        }
      });

      if (updated) {
        // clear all other caches as the user may change
        // to another pinboard account
        cachedData.tab = null;
        cachedData.tags = null;
        cachedData.bookmarks = {};
      }
    }
  }
});

// update browser action icon when tab is activated
chrome.tabs.onActivated.addListener((activeInfo) => {
  console.log('tabs.onActivated', activeInfo);

  chrome.tabs.get(activeInfo.tabId, (tab) => {
    updateIconForTab(tab);
  });
});

// update browser action icon when url changed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  console.log('tabs.onUpdated', tabId, changeInfo, tab);

  if (changeInfo.url) {
    updateIconForTab(tab);
  }
});

// update browser action icon when window focus changed
chrome.windows.onFocusChanged.addListener((windowId) => {
  console.log('windows.onFocusChanged', windowId);

  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // all chrome windows have lost focus
    return;
  }

  // get the active tab of the new focus window and update its icon
  chrome.windows.get(windowId, { populate: true }, (window) => {
    if (window && window.tabs && Array.isArray(window.tabs)) {
      window.tabs.forEach((tab) => {
        if (tab.active) {
          updateIconForTab(tab);
        }
      });
    }
  });
});

// handle message from content scripts / popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('runtime.onMessage', message, sender, sendResponse);

  let async = false;

  if (message) {
    switch (message.type) {
      case Constants.ACTION_GET_BOOKMARK_FROM_URL:
        async = true;
        getBookmark(message.url)
          .then((bookmark) => { sendResponse(bookmark); });
        break;
      case Constants.ACTION_GET_POPUP_INFO_1: {
        async = true;

        const result = {
          error: null,
          options: null,
          tab: cachedData.tab,
        };

        getOptions()
          .then((options) => {
            console.log('get options: ', options);
            result.options = options;

            if (!result.tab || !Utils.isBookmarkable(result.tab.url)) {
              throw new Error(Constants.ERROR_INVALID_URL);
            }
          })
          .catch((error) => {
            console.log('catch error: ', error);
            // set error
            result.error = error.message;
          })
          .then(() => {
            console.log('sendResponse: ', result);
            sendResponse(result);
          });
        break;
      }
      case Constants.ACTION_GET_POPUP_INFO_2: {
        async = true;

        const result = {
          error: null,    // error mesage, null for no error
          // tab: null,      // null or tab
          bookmark: null, // null for no bookmark, otherwise array from pinboard
          tags: [],       // tags for autocomplete, must be array
          // options: null,  // null or options
          tab: cachedData.tab,
        };

        // 1. get tags
        // 2. get bookmark

        getTags()
          .then((tags) => {
            console.log('get tags: ', tags);
            result.tags = tags;   // must be array

            if (!result.tab || !Utils.isBookmarkable(result.tab.url)) {
              throw new Error(Constants.ERROR_INVALID_URL);
            }

            // get bookmark
            return getBookmark(result.tab.url);
          })
          .then((bookmark) => {
            console.log('get bookmark: ', bookmark);
            result.bookmark = bookmark;
          })
          .catch((error) => {
            console.log('catch error: ', error);
            // set error
            result.error = error.message;
          })
          .then(() => {
            console.log('sendResponse: ', result);
            sendResponse(result);
          });
        break;
      }
      case Constants.ACTION_ADD_BOOKMARK: {
        async = true;

        const url = message.url;
        const title = message.title;
        const description = message.description;
        const tags = message.tags;
        const isPrivate = message.private;      // true / false
        const isReadLater = message.readLater;  // true / false

        const result = {
          error: null,    // error message, null for no error
        };

        getOptions()
          .then((options) => {
            const data = {
              url,
              description: title,
              extended: description,
              tags,
              shared: isPrivate ? 'no' : 'yes',
              toread: isReadLater ? 'yes' : 'no',
            };
            return Api.addBookmark(options[Constants.OPTIONS_AUTH_TOKEN], data);
          })
          .then((json) => {
            if (json.result_code !== 'done') {
              throw new Error(json.result_code);
            }
          })
          .catch((error) => {
            result.error = error.message;
          })
          .then(() => {
            // clear cache
            cachedData.tags = null;
            cachedData.bookmarks = {};

            updateIconForTab();

            sendResponse(result);
          });
        break;
      }
      case Constants.ACTION_DELETE_BOOKMARK: {
        async = true;

        const url = message.url;

        const result = {
          error: null,    // error message, null for no error
        };

        getOptions()
          .then((options) =>
            Api.deleteBookmark(options[Constants.OPTIONS_AUTH_TOKEN], url)
          )
          .then((json) => {
            console.log('delete json', json);
            if (json.result_code !== 'done') {
              throw new Error(json.result_code);
            }
          })
          .catch((error) => {
            console.log('error', error);
            result.error = error.message;
          })
          .then(() => {
            // clear cache
            cachedData.tags = null;
            cachedData.bookmarks = {};

            updateIconForTab();

            sendResponse(result);
          });
        break;
      }
      default:
        console.error('unexpected message.type %s', message.type);
        break;
    }
  }

  // return true to indicate you wish to send a response asynchronously
  return async;
});

