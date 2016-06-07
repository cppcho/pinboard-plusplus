import './tagcomplete';
import * as Constants from './constants';
import Utils from './utils';

// autofocus attribute is not working on chrome extension
// https://code.google.com/p/chromium/issues/detail?id=111660#c7
if (location.search !== '?foo') {
  location.search = '?foo';
  throw new Error();
  // load everything on the next page;
  // stop execution on this page
}

function getSelectedText() {
  return new Promise((resolve) => {
    try {
      chrome.tabs.executeScript({
        code: 'window.getSelection().toString();',
      }, (selection) => {
        if (selection && selection.length > 0) {
          resolve(selection[0]);
        }
      });
    } catch (e) {
      throw e;
    }
  });
}

function getOptionsAndTab() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(Constants.OPTIONS_DEFAULT, (options) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        console.log(options, tabs);

        const tab = tabs[0];
        resolve({ options, tab });
      });
    });
  });
}

function getTagsAndBookmark(url) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      type: Constants.ACTION_GET_POPUP_INFO,
      url,
    }, (info) => {
      resolve(info);
    });
  });
}

function setupGoToOptionsLink() {
  $('.js-go-to-options').on('click', (e) => {
    e.preventDefault();

    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('html/options.html'));
    }
  });
}

function setBodyClass(bookmarked) {
  if (bookmarked) {
    $('body').addClass('popup--bookmarked');
  } else {
    $('body').removeClass('popup--bookmarked');
  }
}

function submitForm($form) {
  setBodyClass(true);

  const serializedArray = $form.serializeArray();
  const formData = {
    url: '',
    title: '',
    description: '',
    tags: '',
    private: '',
    read_later: '',
  };

  serializedArray.forEach((v) => {
    formData[v.name] = v.value;
  });

  chrome.runtime.sendMessage({
    type: Constants.ACTION_ADD_BOOKMARK,
    url: formData.url,
    title: formData.title,
    description: formData.description,
    tags: formData.tags,
    private: formData.private === 'on',
    readLater: formData.read_later === 'on',
  }, (result) => {
    console.log(result);
    window.close();
  });
}

$(document).ready(() => {
  setupGoToOptionsLink();

  const $form = $('#form');

  // Skip the rest for non-form popup
  if ($form.length === 0) {
    return;
  }

  const ENTER_KEY = 13;

  const $status = $('#status');
  const $urlInput = $('#url');
  const $titleInput = $('#title');
  const $descriptionInput = $('#description');
  const $tagsInput = $('#tags');
  const $privateCheckBox = $('#private');
  const $readLaterCheckBox = $('#read_later');
  const $removeButton = $('#remove');
  const $doneButton = $('#done');
  const $userInfo = $('#user-info');

  // setup popup data
  getOptionsAndTab()
    .then((info) => {
      const options = info.options;
      const tab = info.tab;

      // Should occur but for safety..
      if (!options[Constants.OPTIONS_AUTH_TOKEN_IS_VALID] || !tab.url || !Utils.isBookmarkable(tab.url)) {
        $form.empty();
        return;
      }

      // Setup user name
      const username = Utils.getUsernameFromAuthToken(options[Constants.OPTIONS_AUTH_TOKEN]);
      $userInfo.text(` - ${username}`);

      $urlInput.val(tab.url);
      $titleInput.val(tab.title);

      getTagsAndBookmark(tab.url)
        .then((tagsAndBookmarkInfo) => {
          const tags = tagsAndBookmarkInfo.tags;
          const bookmark = tagsAndBookmarkInfo.bookmark;
          const error = tagsAndBookmarkInfo.error;

          let url = tab.url;

          // set error message (if any)
          if (info.error !== null) {
            $status.text(error);
          }

          // set tag autocomplete
          if (tags.length > 0) {
            $tagsInput.tagcomplete({
              tags,
            });
          }

          // setup form inputs
          if (bookmark === null) {
            getSelectedText()
              .then((selection) => {
                $descriptionInput.val(String(selection).trim());
                $descriptionInput.select();
              });
            $privateCheckBox.prop('checked', options[Constants.OPTIONS_PRIVATE]);
            $readLaterCheckBox.prop('checked', options[Constants.OPTIONS_READ_LATER]);

            setBodyClass(false);
          } else {
            url = bookmark.href;

            $urlInput.val(url);
            $titleInput.val(bookmark.description);
            $descriptionInput.val(bookmark.extended);
            $tagsInput.val(bookmark.tags);
            $privateCheckBox.prop('checked', bookmark.shared === 'no');
            $readLaterCheckBox.prop('checked', bookmark.toread === 'yes');

            $removeButton.show();

            setBodyClass(true);

            const t = Utils.timeSince(bookmark.time);
            const h = `https://pinboard.in/search/u:${username}?query=${encodeURIComponent(bookmark.href)}`;
            $status.html(`<a href="${h}" target="_blank">bookmarked ${t}</a>`);
          }

          // bind events

          $(':input').on('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.which === ENTER_KEY) {
              e.preventDefault();
              submitForm($form);
            }
          });

          $removeButton.on('click', (e) => {
            e.preventDefault();
            setBodyClass(false);

            chrome.runtime.sendMessage({
              type: Constants.ACTION_DELETE_BOOKMARK,
              url,
            }, (result) => {
              console.log(result);
              window.close();
            });
          });

          $doneButton.on('click', (e) => {
            e.preventDefault();
            submitForm($form);
          });
        });
    });
});
