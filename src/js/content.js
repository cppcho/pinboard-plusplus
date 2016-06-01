import * as Constants from './constants';
import Utils from './utils';

// TODO remove jquery

let timeoutId = null;
let mutationObserver = null;

// start dom mutation observer
const observerTarget = document.querySelector('body');
const observerConfig = {
  childList: true,
  subtree: true,
};

function startObserveMutation() {
  if (mutationObserver) {
    mutationObserver.observe(observerTarget, observerConfig);
  }
}

function stopObserveMutation() {
  if (mutationObserver) {
    mutationObserver.disconnect();
  }
}

function getSearchResultNodes() {
  return $('li.g, div.g');
}

function getUrlFromSearchResult($searchResult) {
  const $searchResultAnchor = $searchResult.find('h3 > a');
  if ($searchResultAnchor.length === 0) {
    return '';
  }

  // A regular expression to deal with redirections through Google services,
  //   e.g.for translated results like
  // http://translate.google.com/translate?u=http://example.com
  const redirectRegex = '^(https?://[a-z.]+[.]?google([.][a-z]{2,4}){1,2})?/' +
    '[a-z_-]*[?]((img)?u|.*&(img)?u)(rl)?=([^&]*[.][^&]*).*$';

  let url = $searchResultAnchor.attr('href');
  url = url.replace(redirectRegex, '$7');

  return url;
}

function addPinnedIndicatorsToSearchResults() {
  const $searchResultNode = getSearchResultNodes();
  $searchResultNode.each((index, node) => {
    const url = getUrlFromSearchResult($(node));
    if (Utils.isBookmarkable(url)) {
      console.log(url);

      chrome.runtime.sendMessage({
        type: Constants.ACTION_GET_BOOKMARK_FROM_URL,
        url,
      }, (bookmark) => {
        console.log(bookmark);

        if (bookmark !== null) {
          // bookmark must be array here
          const $h3 = $(node).find('h3');
          if ($h3.find('.pinboard-plusplus-widget').length === 0) {
            stopObserveMutation();

            const html = `<a href="#" title="${bookmark.description}"` +
              'class="pinboard-plusplus-widget"></a>';
            $h3.first().append(html);

            startObserveMutation();
          }
        }
      });
    }
  });
}

// when dom mutates
mutationObserver = new MutationObserver(() => {
  // wait a while before try to update the pinned indicators
  clearTimeout(timeoutId);
  timeoutId = setTimeout(() => {
    addPinnedIndicatorsToSearchResults();
  }, 300);
});

startObserveMutation();
