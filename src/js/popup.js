import './tagcomplete';
import * as Constants from './constants';
import Utils from './utils';

// autofocus attribute is not working on chrome extension
// https://code.google.com/p/chromium/issues/detail?id=111660#c7
if (location.search !== '?ppp') {
  location.search = '?ppp';
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
        console.log('getSelectedText selection: %o', selection);

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
        console.log('getOptionsAndTab options: %o tab: %o', options, tabs);

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
      console.log('getTagsAndBookmark info: %o', info);

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

function addBookmark($form) {
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
  }, () => {
    window.close();
  });
}

function deleteBookmark(url) {
  setBodyClass(false);

  chrome.runtime.sendMessage({
    type: Constants.ACTION_DELETE_BOOKMARK,
    url,
  }, () => {
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
  const BACKSPACE_KEY = 8;

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
        console.error('invalid options/tab options: %o tab: %o', options, tab);

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

          // Focus the description field
          $descriptionInput.focus();

          // bind events

          $(':input').on('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.which === ENTER_KEY) {
              // Command/Ctrl + ENTER is pressed
              e.preventDefault();
              addBookmark($form);
            } else if ((e.metaKey || e.ctrlKey) && e.which === BACKSPACE_KEY) {
              // Command/Ctrl + BACKSPACE is pressed
              e.preventDefault();
              deleteBookmark(url);
            }
          });

          $removeButton.on('click', (e) => {
            e.preventDefault();
            deleteBookmark(url);
          });

          $doneButton.on('click', (e) => {
            e.preventDefault();
            addBookmark($form);
          });
        });
    });
});
