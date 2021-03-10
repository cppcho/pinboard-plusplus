import {
  OPTIONS_AUTH_TOKEN,
  OPTIONS_PRIVATE,
  OPTIONS_READ_LATER,
  OPTIONS_QUICK_ADD,
  OPTIONS_AUTH_TOKEN_IS_VALID,
} from "util/constants";
import { getLocalOptions, setLocalOptions } from "util/helpers";
import { getLastUpdated } from "util/api";
import "./options.css";

const elAuthTokenInput = document.getElementById("auth-token");
const elPrivateInput = document.getElementById("private");
const elReadLaterInput = document.getElementById("read-later");
const elQuickAddInput = document.getElementById("quick-add");
const elStatus = document.getElementById("status");
const elSaveButton = document.getElementById("save-btn");

function showInvalidTokenStatus() {
  elStatus.innerText = "Invalid API token";
  elStatus.classList.add("options__status--error");
}

function hideInvalidTokenStatus() {
  elStatus.innerText = "";
  elStatus.classList.remove("options__status--error");
}

async function handleSaveButtonClick() {
  const localOptions = await getLocalOptions();

  const newAuthToken = elAuthTokenInput.value.trim();
  const newOptions = {
    [OPTIONS_AUTH_TOKEN]: newAuthToken,
    [OPTIONS_PRIVATE]: elPrivateInput.checked,
    [OPTIONS_READ_LATER]: elReadLaterInput.checked,
    [OPTIONS_QUICK_ADD]: elQuickAddInput.checked,
    [OPTIONS_AUTH_TOKEN_IS_VALID]: localOptions[OPTIONS_AUTH_TOKEN_IS_VALID],
  };

  if (!newAuthToken) {
    newOptions[OPTIONS_AUTH_TOKEN_IS_VALID] = false;
  } else if (newAuthToken !== localOptions.authToken) {
    const response = getLastUpdated(newAuthToken);
    console.log(response);

    if (response.time) {
      newOptions[OPTIONS_AUTH_TOKEN_IS_VALID] = true;
    } else {
      newOptions[OPTIONS_AUTH_TOKEN_IS_VALID] = false;
    }
  }

  await setLocalOptions(newOptions);

  if (newOptions[OPTIONS_AUTH_TOKEN_IS_VALID]) {
    hideInvalidTokenStatus();
  } else {
    showInvalidTokenStatus();
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const options = await getLocalOptions();

  elAuthTokenInput.value = options[OPTIONS_AUTH_TOKEN];
  elPrivateInput.checked = options[OPTIONS_PRIVATE];
  elReadLaterInput.checked = options[OPTIONS_READ_LATER];
  elQuickAddInput.checked = options[OPTIONS_QUICK_ADD];

  if (!options[OPTIONS_AUTH_TOKEN_IS_VALID]) {
    showInvalidTokenStatus();
  }

  elSaveButton.addEventListener("click", handleSaveButtonClick);
});
