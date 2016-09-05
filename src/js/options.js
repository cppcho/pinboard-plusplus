import * as Constants from './constants';
import Api from './api';

$(document).ready(() => {
  const ENTER_KEY = 13;

  const $authTokenInput = $('#auth_token');
  const $privateInput = $('#private');
  const $readLaterInput = $('#read_later');
  const $pinInGoogleInput = $('#pin_in_google');
  const $quickAddInput = $('#quick_add');
  const $status = $('#status');

  let isShowingInvalidTokenStatus = false;
  let statusTimeoutId;

  /**
   * Show "Invalid API token" status message
   * Has higher priority than "Saved" message
   */
  function showInvalidTokenStatus() {
    $status.text('Invalid API token');
    $status.addClass('options__status--error');
    isShowingInvalidTokenStatus = true;
    clearTimeout(statusTimeoutId);
  }

  /**
   * Clear "Invalid API token status message" if any
   */
  function hideInvalidTokenStatus() {
    if (isShowingInvalidTokenStatus) {
      $status.text('');
      $status.removeClass('options__status--error');
      isShowingInvalidTokenStatus = false;
      clearTimeout(statusTimeoutId);
    }
  }

  /**
   * Show "Saved" status message for 1 second
   * only when "Invalid API token" is not showing
   */
  function showSavedStatus() {
    if (!isShowingInvalidTokenStatus) {
      $status.text('Saved');
      clearTimeout(statusTimeoutId);
      statusTimeoutId = setTimeout(() => {
        if (!isShowingInvalidTokenStatus) {
          $status.text('');
        }
      }, 1000);
    }
  }

  /**
   * Check if the options has the same state as the input fields
   */
  function verifyOptions(options) {
    return (
      options[Constants.OPTIONS_AUTH_TOKEN] === $authTokenInput.val().trim() &&
      options[Constants.OPTIONS_PRIVATE] === $privateInput.prop('checked') &&
      options[Constants.OPTIONS_READ_LATER] === $readLaterInput.prop('checked') &&
      // options[Constants.OPTIONS_PIN_IN_GOOGLE] === $pinInGoogleInput.prop('checked') &&  // TODO: Dsiable pin in Google temporary
      options[Constants.OPTIONS_QUICK_ADD] === $quickAddInput.prop('checked')
    );
  }

  /**
   * Validate the API token and save options to storage
   */
  function saveOptions() {
    const trimmedAuthToken = $authTokenInput.val().trim();
    $authTokenInput.val(trimmedAuthToken);

    const inputOptions = {
      [Constants.OPTIONS_AUTH_TOKEN]: trimmedAuthToken,
      [Constants.OPTIONS_PRIVATE]: $privateInput.prop('checked'),
      [Constants.OPTIONS_READ_LATER]: $readLaterInput.prop('checked'),
      // [Constants.OPTIONS_PIN_IN_GOOGLE]: $pinInGoogleInput.prop('checked'),  // TODO: Dsiable pin in Google temporary
      [Constants.OPTIONS_QUICK_ADD]: $quickAddInput.prop('checked'),
    };

    // 1. Get options from storage
    // 2. Check if auth token is changed
    // 3. If no, save the options to storage directly
    // 4. Otherwise query Pinboard to check the auth token is valid before saving

    const p = new Promise((resolve) => {
      chrome.storage.sync.get(Constants.OPTIONS_DEFAULT, (options) => {
        // check if auth token is unchanged
        if (options[Constants.OPTIONS_AUTH_TOKEN] === inputOptions[Constants.OPTIONS_AUTH_TOKEN]) {
          inputOptions[Constants.OPTIONS_AUTH_TOKEN_IS_VALID] = options[Constants.OPTIONS_AUTH_TOKEN_IS_VALID];
          resolve();

        // otherwise when the auth token is updated, query Pinboard to check the auth token
        } else if (inputOptions[Constants.OPTIONS_AUTH_TOKEN].length > 0) {
          Api.getLastUpdated(inputOptions[Constants.OPTIONS_AUTH_TOKEN])
            .then(() => {
              inputOptions[Constants.OPTIONS_AUTH_TOKEN_IS_VALID] = true;
              resolve();
            })
            .catch(() => {
              inputOptions[Constants.OPTIONS_AUTH_TOKEN_IS_VALID] = false;
              resolve();
            });
        } else {
          inputOptions[Constants.OPTIONS_AUTH_TOKEN_IS_VALID] = false;
          resolve();
        }
      });
    });

    // Save new options to storage
    p.then(() => {
      if (verifyOptions(inputOptions)) {
        chrome.storage.sync.set(inputOptions, () => {
          if (inputOptions[Constants.OPTIONS_AUTH_TOKEN_IS_VALID]) {
            hideInvalidTokenStatus();
            showSavedStatus();
          } else {
            showInvalidTokenStatus();
          }
        });
      }
    });
  }

  // initialize the options page

  // load options data from storage
  chrome.storage.sync.get(Constants.OPTIONS_DEFAULT, (options) => {
    // set input field values
    $authTokenInput.val(options[Constants.OPTIONS_AUTH_TOKEN]);
    $privateInput.prop('checked', options[Constants.OPTIONS_PRIVATE]);
    $readLaterInput.prop('checked', options[Constants.OPTIONS_READ_LATER]);
    // $pinInGoogleInput.prop('checked', options[Constants.OPTIONS_PIN_IN_GOOGLE]); // TODO: Dsiable pin in Google temporary
    $quickAddInput.prop('checked', options[Constants.OPTIONS_QUICK_ADD]);

    if (options[Constants.OPTIONS_AUTH_TOKEN].length > 0 &&
      !options[Constants.OPTIONS_AUTH_TOKEN_IS_VALID]) {
      showInvalidTokenStatus();
    }

    // event handlers

    $authTokenInput.keypress((e) => {
      if (e.which === ENTER_KEY) {
        e.preventDefault();

        saveOptions();
        $authTokenInput.select();
      }
    });

    $authTokenInput.blur((e) => {
      e.preventDefault();

      saveOptions();
    });

    $(':checkbox').change(() => {
      saveOptions();
    });
  });
});
