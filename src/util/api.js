// TODO: limit rate to 1 per 3sec
// TODO: timeout fetch API

async function makeRequest(authToken, path, params) {
  const p = {
    format: "json",
    auth_token: authToken,
    id: "pinboard-plusplus",
    ...params,
  };
  const url = new URL(`https://api.pinboard.in/v1/${path}`);
  url.search = new URLSearchParams(p).toString();

  console.debug("%cmakeRequest url: %s", "background: blue; color: white", url);

  const response = await fetch(url);
  console.log("response: %o", response);

  // TODO: check response.ok and throw (reject) if error
  return response.json();
}

export default {
  getLastUpdated: (authToken) => makeRequest(authToken, "posts/update"),

  addBookmark: (authToken, data) => makeRequest(authToken, "posts/add", data),

  deleteBookmark: (authToken, url) =>
    makeRequest(authToken, "posts/delete", { url }),

  getBookmark: (authToken, url) => makeRequest(authToken, "posts/get", { url }),

  getTags: (authToken) => makeRequest(authToken, "tags/get"),
};
