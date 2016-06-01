import './tagcomplete';
import * as Constants from './constants';
import moment from 'moment';

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
    console.log('get selected text');
    try {
      chrome.tabs.executeScript({
        code: 'window.getSelection().toString();',
      }, (selection) => {
        console.log('selected text', selection);
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
    console.log('getOptionsAndTab');
    chrome.runtime.sendMessage({
      type: Constants.ACTION_GET_POPUP_INFO_1,
    }, (info) => {
      console.log('popup info', info);
      resolve(info);
    });
  });
}

function getTagsAndBookmark() {
  return new Promise((resolve) => {
    console.log('getTagsAndBookmark');
    chrome.runtime.sendMessage({
      type: Constants.ACTION_GET_POPUP_INFO_2,
    }, (info) => {
      console.log('popup info', info);
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

$(document).ready(() => {
  console.log('popup ready');

  const $status = $('#status');
  const $urlInput = $('#url');
  const $titleInput = $('#title');
  const $descriptionInput = $('#description');
  const $tagsInput = $('#tags');
  const $privateCheckBox = $('#private');
  const $readLaterCheckBox = $('#read_later');
  const $removeButton = $('#remove');
  const $doneButton = $('#done');
  const $form = $('#form');
  const $setupApiToken = $('#setup-api-token');
  const $invalidApiToken = $('#invalid-api-token');
  const $invalidUrl = $('#invalid-url');
  const $userInfo = $('user-info');

  let options;

  // setup popup data
  getOptionsAndTab()
    .then((info) => {
      console.log('info', info);

      options = info.options;

      const authToken = info.options[Constants.OPTIONS_AUTH_TOKEN];

      // empty auth token
      if (authToken.length === 0) {
        $setupApiToken.show();
        setupGoToOptionsLink();

        // invalid auth token
      } else if (!info.options[Constants.OPTIONS_AUTH_TOKEN_IS_VALID]) {
        $invalidApiToken.show();
        setupGoToOptionsLink();

        // invalid url
      } else if (info.error === Constants.ERROR_INVALID_URL) {
        $invalidUrl.show();

        // valid url + valid token
      } else {
        $form.show();

        // setup user info text
        const username = authToken.split(':')[0];
        $userInfo.text(` - ${username}`);

        console.log(username);

        return getTagsAndBookmark();  // url must be bookmarkable here
      }

      return null;
    })
    .then((info) => {
      console.log(info);

      if (info === null) {
        return;
      }

      // set error message (if any)
      if (info.error !== null) {
        $status.text(info.error);
      }

      // set tag autocomplete
      if (info.tags.length > 0) {
        $tagsInput.tagcomplete({
          tags: info.tags,
        });
      }

      // focus the description box
      $('#description').focus();

      let url = null;

      if (info.bookmark !== null) {
        // bookmarked

        const bookmark = info.bookmark;

        url = bookmark.href;

        $urlInput.val(url);
        $titleInput.val(bookmark.description);
        $descriptionInput.val(bookmark.extended);
        $tagsInput.val(bookmark.tags);
        $privateCheckBox.prop('checked', bookmark.shared === 'no');
        $readLaterCheckBox.prop('checked', bookmark.toread === 'yes');

        $removeButton.show();

        $status.text(moment(info.bookmark.time).fromNow());
      } else if (info.tab !== null) {
        // not bookmarked

        const tab = info.tab;

        url = tab.url;

        $urlInput.val(url);
        $titleInput.val(tab.title);
        getSelectedText()
          .then((selection) => {
            $descriptionInput.val(String(selection).trim());
            $descriptionInput.select();
          });
        $privateCheckBox.prop('checked', options[Constants.OPTIONS_PRIVATE]);
        $readLaterCheckBox.prop('checked', options[Constants.OPTIONS_READ_LATER]);
      }

      // remove button
      $removeButton.on('click', (e) => {
        e.preventDefault();

        console.log('remove', url);

        if (url) {
          chrome.runtime.sendMessage({
            type: Constants.ACTION_DELETE_BOOKMARK,
            url,
          }, (result) => {
            console.log('delete bookmark', result);

            // TODO

            // close popup
            window.close();
          });
        }
      });

      $doneButton.on('click', (e) => {
        e.preventDefault();

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

        console.log('formData: ', serializedArray);
        console.log('formData: ', formData);

        chrome.runtime.sendMessage({
          type: Constants.ACTION_ADD_BOOKMARK,
          url: formData.url,
          title: formData.title,
          description: formData.description,
          tags: formData.tags,
          private: formData.private === 'on',
          readLater: formData.read_later === 'on',
        }, (result) => {
          console.log('add bookmark', result);

          // TODO
          window.close();
        });
      });
    });
});
