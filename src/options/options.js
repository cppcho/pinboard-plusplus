import {
  OPTIONS_DEFAULT,
  OPTIONS_AUTH_TOKEN,
  OPTIONS_PRIVATE,
  OPTIONS_READ_LATER,
  OPTIONS_QUICK_ADD,
} from "util/constants";
import Api from "util/api";
import "./options.css";

const elAuthTokenInput = document.getElementById("auth-token");
const elPrivateInput = document.getElementById("private");
const elReadLaterInput = document.getElementById("read-later");
const elQuickAddInput = document.getElementById("quick-add");
const elStatus = document.getElementById("status");
const elSaveButton = document.getElementById("save-btn");

function getLocalOptions() {
  return new Promise((resolve) => {
    chrome.storage.local.get(OPTIONS_DEFAULT, (items) => {
      resolve(items);
    });
  });
}

elSaveButton.addEventListener("click", async function (event) {
  const authToken = elAuthTokenInput.value.trim();
  elAuthTokenInput.value = authToken;

  const aa = await Api.getLastUpdated("cppcho:D1E7D633C8D202A956E7");
  console.log(aa);

  const inputOptions = {
    [OPTIONS_AUTH_TOKEN]: authToken,
    [OPTIONS_PRIVATE]: elPrivateInput.checked,
    [OPTIONS_READ_LATER]: elReadLaterInput.checked,
    [OPTIONS_QUICK_ADD]: elQuickAddInput.checked,
  };

  const localOptions = await getLocalOptions();

  if (authToken && authToken !== localOptions.authToken) {
  }

  // // 1. Get options from storage
  // // 2. Check if auth token is changed
  // // 3. If no, save the options to storage directly
  // // 4. Otherwise query Pinboard to check the auth token is valid before saving

  // const p = new Promise((resolve) => {
  //   chrome.storage.local.get(Constants.OPTIONS_DEFAULT, (options) => {
  //     // check if auth token is unchanged
  //     if (options[Constants.OPTIONS_AUTH_TOKEN] === inputOptions[Constants.OPTIONS_AUTH_TOKEN]) {
  //       inputOptions[Constants.OPTIONS_AUTH_TOKEN_IS_VALID] = options[Constants.OPTIONS_AUTH_TOKEN_IS_VALID];
  //       resolve();

  //     // otherwise when the auth token is updated, query Pinboard to check the auth token
  //     } else if (inputOptions[Constants.OPTIONS_AUTH_TOKEN].length > 0) {
  //       Api.getLastUpdated(inputOptions[Constants.OPTIONS_AUTH_TOKEN])
  //         .then(() => {
  //           inputOptions[Constants.OPTIONS_AUTH_TOKEN_IS_VALID] = true;
  //           resolve();
  //         })
  //         .catch(() => {
  //           inputOptions[Constants.OPTIONS_AUTH_TOKEN_IS_VALID] = false;
  //           resolve();
  //         });
  //     } else {
  //       inputOptions[Constants.OPTIONS_AUTH_TOKEN_IS_VALID] = false;
  //       resolve();
  //     }
  //   });
  // });

  // // Save new options to storage
  // p.then(() => {
  //   if (verifyOptions(inputOptions)) {
  //     chrome.storage.local.set(inputOptions, () => {
  //       if (inputOptions[Constants.OPTIONS_AUTH_TOKEN_IS_VALID]) {
  //         hideInvalidTokenStatus();
  //         showSavedStatus();
  //       } else {
  //         showInvalidTokenStatus();
  //       }
  //     });
  //   }
  // });
});

// let isShowingInvalidTokenStatus = false;
// let statusTimeoutId;

function showInvalidTokenStatus() {
  elStatus.innerText = "Invalid API token";
  elStatus.classList.add("options__status--error");
}

function hideInvalidTokenStatus() {
  elStatus.innerText = "";
  elStatus.classList.remove("options__status--error");
}

// /**
//  * Clear "Invalid API token status message" if any
//  */

// /**
//  * Show "Saved" status message for 2 seconds
//  * only when "Invalid API token" is not showing
//  */
// function showSavedStatus() {
//   if (!isShowingInvalidTokenStatus) {
//     $status.text('Saved');
//     clearTimeout(statusTimeoutId);
//     statusTimeoutId = setTimeout(() => {
//       if (!isShowingInvalidTokenStatus) {
//         $status.text('');
//       }
//     }, 2000);
//   }
// }

// /**
//  * Check if the options has the same state as the input fields
//  */
// function verifyOptions(options) {
//   return (
//     options[Constants.OPTIONS_AUTH_TOKEN] === $authTokenInput.val().trim() &&
//     options[Constants.OPTIONS_PRIVATE] === $privateInput.prop('checked') &&
//     options[Constants.OPTIONS_READ_LATER] === $readLaterInput.prop('checked') &&
//     options[Constants.OPTIONS_QUICK_ADD] === $quickAddInput.prop('checked')
//   );
// }

// /**
//  * Validate the API token and save options to storage
//  */
// function saveOptions() {
// }

// initialize the options page

getLocalOptions().then((items) => {
  console.log(items);

  elAuthTokenInput.value = items[OPTIONS_AUTH_TOKEN];
  elPrivateInput.checked = items[OPTIONS_PRIVATE];
  elReadLaterInput.checked = items[OPTIONS_READ_LATER];
  elQuickAddInput.checked = items[OPTIONS_QUICK_ADD];

  // if (options[Constants.OPTIONS_AUTH_TOKEN].length > 0 &&
  //   !options[Constants.OPTIONS_AUTH_TOKEN_IS_VALID]) {
  //   showInvalidTokenStatus();
  // }
});
