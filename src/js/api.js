function makeRequest(authToken, path, data) {
  const d = $.extend({}, { format: 'json', auth_token: authToken }, data);
  const u = `https://api.pinboard.in/v1/${path}`;

  console.log('%c requesting %s', 'background: blue; color: white', u, d);

  return new Promise((resolve, reject) => {
    $.ajax({
      url: u,
      method: 'GET',
      data: d,
    }).done(response => resolve(JSON.parse(response)))
      .fail((_, textStatus, error) => reject(new Error(`${textStatus}: ${error}`)));
  });
}

const Api = {};

Api.getLastUpdated = (authToken) => makeRequest(authToken, 'posts/update');

Api.addBookmark = (authToken, data) => makeRequest(authToken, 'posts/add', data);

Api.deleteBookmark = (authToken, url) => makeRequest(authToken, 'posts/delete', { url });

Api.getBookmark = (authToken, url) => makeRequest(authToken, 'posts/get', { url });

Api.getTags = (authToken) => makeRequest(authToken, 'tags/get');

export default Api;
