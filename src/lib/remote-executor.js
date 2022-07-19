const { print } = require("graphql");
const { fetch } = require("cross-undici-fetch");

const makeRemoteExecutor = function (url, headers = {}) {
  return async ({ document, variables }) => {
    const query = typeof document === "string" ? document : print(document);
    const result = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ query, variables }),
    });
    return result.json();
  };
};

module.exports = makeRemoteExecutor;
