import * as Constants from './constants';
import Utils from './utils';

const GOOGLE_SELECTOR_SEARCH_RESULT_NODE = 'li.g, div.g';
const GOOGLE_SELECTOR_SEARCH_RESULT_LINK = 'h3 > a';
const GOOGLE_SELECTOR_SEARCH_RESULT_LINK_WRAPPER = 'h3';

const DUCKDUCKGO_SELECTOR_SEARCH_RESULT_NODE = 'div.result';
const DUCKDUCKGO_SELECTOR_SEARCH_RESULT_LINK = 'h2 > a.result__a';
const DUCKDUCKGO_SELECTOR_SEARCH_RESULT_LINK_WRAPPER = 'h2';

export const addPinsToSearchResults = (page) => {
  let selectorSearchResultNode;
  let selectorSearchResultLink;
  let selectorSearchResultLinkWrapper;

  if (page === 'google') {
    selectorSearchResultNode = GOOGLE_SELECTOR_SEARCH_RESULT_NODE;
    selectorSearchResultLink = GOOGLE_SELECTOR_SEARCH_RESULT_LINK;
    selectorSearchResultLinkWrapper = GOOGLE_SELECTOR_SEARCH_RESULT_LINK_WRAPPER;
  } else if (page === 'duckduckgo') {
    selectorSearchResultNode = DUCKDUCKGO_SELECTOR_SEARCH_RESULT_NODE;
    selectorSearchResultLink = DUCKDUCKGO_SELECTOR_SEARCH_RESULT_LINK;
    selectorSearchResultLinkWrapper = DUCKDUCKGO_SELECTOR_SEARCH_RESULT_LINK_WRAPPER;
  } else {
    return;
  }

  chrome.storage.sync.get(Constants.OPTIONS_DEFAULT, (options) => {
    console.log('options: %o', options);

    // check PIN_IN_GOOGLE and AUTH_TOKEN options
    if (!options[Constants.OPTIONS_PIN_IN_GOOGLE] || !options[Constants.OPTIONS_AUTH_TOKEN_IS_VALID]) {
      console.log('skip content scripts');
      return;
    }

    const PIN_INDICATOR_CLASS = 'pinboard-plusplus-widget';

    const username = Utils.getUsernameFromAuthToken(options[Constants.OPTIONS_AUTH_TOKEN]);

    // Mutation observer for observing the changes in google search
    let mutationObserver = null;

    // Observe the subtree changes in <body>
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

    /**
     * Get the URL from the search result block element in Google Search
     */
    function getUrlFromSearchResult($searchResult) {
      const $searchResultAnchor = $searchResult.find(selectorSearchResultLink);
      if ($searchResultAnchor.length === 0) {
        return '';
      }

      let url = $searchResultAnchor.attr('href');

      if (page === 'google') {
        // A regular expression to deal with redirections through Google services,
        //   e.g.for translated results like
        // http://translate.google.com/translate?u=http://example.com
        const redirectRegex = '^(https?://[a-z.]+[.]?google([.][a-z]{2,4}){1,2})?/' +
          '[a-z_-]*[?]((img)?u|.*&(img)?u)(rl)?=([^&]*[.][^&]*).*$';
        url = url.replace(redirectRegex, '$7');
      }

      console.log('getUrlFromSearchResult url:', url);

      return url;
    }

    /**
     * Update the pin indicators on Google Search result page
     */
    function addPinIndicatorsToSearchResults() {
      console.log('addPinIndicatorsToSearchResults');

      const $searchResultNode = $(selectorSearchResultNode);

      $searchResultNode.each((index, node) => {
        const $node = $(node);

        if ($node.find(`.${PIN_INDICATOR_CLASS}`).length === 0) {
          const url = getUrlFromSearchResult($node);

          if (Utils.isBookmarkable(url)) {
            chrome.runtime.sendMessage({
              type: Constants.ACTION_GET_BOOKMARK_FROM_URL,
              url,
            }, (info) => {
              if (info.bookmark !== null) {
                // info.bookmark must be array here
                console.log('receive bookmark info: %o', info);

                const $linkWrapper = $(node).find(selectorSearchResultLinkWrapper);

                if ($linkWrapper.find(`.${PIN_INDICATOR_CLASS}`).length === 0) {
                  console.log('add pin icon for %s', info.bookmark.href);

                  stopObserveMutation();

                  // Add pin indicator next to search result link
                  const id = `ppp_${info.bookmark.hash}`;
                  const href = `https://pinboard.in/search/u:${username}?query=${encodeURIComponent(info.bookmark.href)}`;
                  const html = `<a id="${id}" href="${href}" class="${PIN_INDICATOR_CLASS}"></a>`;
                  const $pin = $(html).appendTo($linkWrapper.first());
                  const desc = info.bookmark.extended.trim();

                  // Add tooltip
                  if (desc.length > 0) {
                    $pin.tooltipster({
                      content: $(`<span>${desc.replace(/(?:\r\n|\r|\n)/g, '<br />')}</span>`),
                      maxWidth: 300,
                      position: 'bottom',
                    });
                  }

                  startObserveMutation();
                }
              }
            });
          }
        }
      });
    }

    // Start observe DOM mutation

    let timeoutId = null;
    mutationObserver = new MutationObserver(() => {
      clearTimeout(timeoutId);

      timeoutId = setTimeout(() => {
        addPinIndicatorsToSearchResults();
      }, 400);
    });

    startObserveMutation();
  });
};
