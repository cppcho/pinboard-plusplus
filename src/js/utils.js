/* eslint no-script-url: "off" */

const Utils = {};

Utils.isBookmarkable = (url) => {
  try {
    const protocol = new URL(url).protocol;
    return (
      protocol === 'http:' ||
      protocol === 'https:' ||
      protocol === 'javascript:' ||
      protocol === 'mailto:' ||
      protocol === 'ftp:' ||
      protocol === 'file:'
    );
  } catch (e) {
    console.log('invalid url: %s', url);
    return false;
  }
};

export default Utils;
