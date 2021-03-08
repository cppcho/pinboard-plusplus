fetch(url).then(data => data.text()).then(data => {
  document.querySelector(selector).innerHTML = data
}).then(completeCallback)

function makeRequest(authToken, path, data) {
  const d = $.extend({}, { format: 'json', auth_token: authToken, id: 'pinboard-plusplus' }, data);
  const u = `https://api.pinboard.in/v1/${path}`;

  console.debug('%cmakeRequest url: %s $data: %o', 'background: blue; color: white', u, d);

  return new Promise((resolve, reject) => {
    $.ajax({
      url: u,
      method: 'GET',
      data: d,
      timeout: 3000,
    }).done((response) => {
      console.log('response: %o', response);

      try {
        resolve(JSON.parse(response));
      } catch (e) {
        console.error(e);
        reject();
      }
    }).fail((_, textStatus, error) => {
      console.error('textStatus: %s error: %s', textStatus, error);

      reject();
    });
  });
}

const Api = {};

Api.getLastUpdated = (authToken) => makeRequest(authToken, 'posts/update');

Api.addBookmark = (authToken, data) => makeRequest(authToken, 'posts/add', data);

Api.deleteBookmark = (authToken, url) => makeRequest(authToken, 'posts/delete', { url });

Api.getBookmark = (authToken, url) => makeRequest(authToken, 'posts/get', { url });

Api.getTags = (authToken) => makeRequest(authToken, 'tags/get');

export default Api;
