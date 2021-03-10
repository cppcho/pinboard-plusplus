import { OPTIONS_DEFAULT } from "util/constants";

/**
 * Get option settings from local storage
 *
 * @return Promise
 */
export const getLocalOptions = () => {
  return new Promise((resolve) => {
    chrome.storage.local.get(OPTIONS_DEFAULT, (items) => {
      resolve(items);
    });
  });
};

export const setLocalOptions = (options) => {
  return new Promise((resolve) => {
    chrome.storage.local.set(options, () => {
      resolve();
    });
  });
};

/**
 * Check if url is a valid link to be bookmarked on Pinboard
 *
 * @param {string} url
 * @return {boolean}
 */
export const isBookmarkable = (url) =>
  url.trim().search(/^(https|http|javascript|mailto|ftp|file)(?=:)/) !== -1;

/**
 * Get the username from API auth token
 *
 * @param {string} valid API auth token
 * @return {string} username
 */
export const getUsernameFromAuthToken = (authToken) =>
  authToken.trim().split(":")[0];

/**
 * Attempts to pluralize the singular word unless count is 1
 *
 * @param {number} count
 * @param {string} singular
 * @param {string} plural
 * @return {string}
 */
export const pluralize = (count, singular, plural) => {
  let word = plural;
  if (count === 1) {
    word = singular;
  }

  return `${count} ${word}`;
};

/**
 * Convert date string to relative date
 *
 * http://stackoverflow.com/a/23352499/5032533
 */
export const timeSince = (dateString) => {
  if (dateString === undefined) {
    return "0 seconds ago";
  }

  const timeStamp = new Date(dateString);
  const now = new Date();
  const secondsPast = (now.getTime() - timeStamp.getTime()) / 1000;

  if (secondsPast < 60) {
    return pluralize(parseInt(secondsPast, 10), "second ago", "seconds ago");
  }
  if (secondsPast < 3600) {
    return pluralize(
      parseInt(secondsPast / 60, 10),
      "minute ago",
      "minutes ago"
    );
  }
  if (secondsPast <= 86400) {
    return pluralize(parseInt(secondsPast / 3600, 10), "hour ago", "hours ago");
  }

  const day = timeStamp.getDate();
  const month = timeStamp
    .toDateString()
    .match(/ [a-zA-Z]*/)[0]
    .replace(" ", "");
  const year =
    timeStamp.getFullYear() === now.getFullYear()
      ? ""
      : ` ${timeStamp.getFullYear()}`;
  return `${day} ${month}${year}`;
};
