import Api from './api';
import * as Constants from './constants';

$(document).ready(() => {
  const ENTER_KEY = 13;

  const $authTokenInput = $('#auth_token');
  const $authTokenError = $('#auth_token_error');
  const $privateInput = $('#private');
  const $readLaterInput = $('#read_later');
  const $saveButton = $('#save');
  const $statusArea = $('#status');
  let statusTimeoutID = null;

  function updateAuthTokenError(options) {
    console.log(options);
    if (options[Constants.OPTIONS_AUTH_TOKEN].trim().length > 0 &&
      !options[Constants.OPTIONS_AUTH_TOKEN_IS_VALID]) {
      $authTokenError.show();
    } else {
      $authTokenError.hide();
    }
  }

  function showStatus() {
    console.log('show status');

    clearTimeout(statusTimeoutID);

    $statusArea.text('ok');
    statusTimeoutID = setTimeout(() => {
      console.log('clear status');

      $statusArea.text('');
    }, 1000);
  }

  function saveOptions() {
    console.log('save options');

    const trimmedAuthToken = $authTokenInput.val().trim();
    $authTokenInput.val(trimmedAuthToken);

    const options = {
      [Constants.OPTIONS_AUTH_TOKEN]: trimmedAuthToken,
      [Constants.OPTIONS_PRIVATE]: $privateInput.prop('checked'),
      [Constants.OPTIONS_READ_LATER]: $readLaterInput.prop('checked'),
    };

    // check if auth token is valid
    const p = new Promise((resolve) => {
      if (trimmedAuthToken.length > 0) {
        Api.getLastUpdated(trimmedAuthToken)
          .then(() => {
            options[Constants.OPTIONS_AUTH_TOKEN_IS_VALID] = true;
            resolve();
          })
          .catch(() => {
            options[Constants.OPTIONS_AUTH_TOKEN_IS_VALID] = false;
            resolve();
          });
      } else {
        options[Constants.OPTIONS_AUTH_TOKEN_IS_VALID] = false;
        resolve();
      }
    });
    p.then(() => {
      // then save options to storage
      chrome.storage.sync.set(options, () => {
        console.log('chrome.storage.sync.set done');

        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.message);
        }

        showStatus();
        updateAuthTokenError(options);
      });
    });
  }

  console.log('options ready');

  // restore options from storage
  chrome.storage.sync.get(Constants.OPTIONS_DEFAULT, (items) => {
    console.log('chrome.storage.sync.get done', items);

    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError.message);
    }

    // set dom values / properties
    $authTokenInput.val(items[Constants.OPTIONS_AUTH_TOKEN]);
    $privateInput.prop('checked', items[Constants.OPTIONS_PRIVATE]);
    $readLaterInput.prop('checked', items[Constants.OPTIONS_READ_LATER]);

    updateAuthTokenError(items);

    $authTokenInput.select();

    // on enter key pressed in auth_token input
    $authTokenInput.keypress((event) => {
      if (event.which === ENTER_KEY) {
        console.log('enter key pressed');

        event.preventDefault();

        saveOptions();
        $authTokenInput.select();
      }
    });

    // on save button clicked
    $saveButton.on('click', () => {
      console.log('save button clicked');
      saveOptions();
    });
  });
});
