const makeRemoteExecutor = require("./remote-executor");
const { observableToAsyncIterable } = require("@graphql-tools/utils");
const { createClient } = require("graphql-ws");
const { print, getOperationAST, OperationTypeNode } = require("graphql");
const ws = require("ws");
const { gql } = require("apollo-server");

const makeWSRemoteExecutor = (wsUri) => {
  const subscriptionClient = createClient({
    url: wsUri,
    webSocketImpl: ws,
  });
  return async ({ document, variables }) => {
    console.log('document: ', wsUri);
    return observableToAsyncIterable({
      subscribe: (observer) => ({ // TODO: this is not subscribing, WHY???
        unsubscribe: subscriptionClient.subscribe(
            {
              query: typeof document === "string" ? document : print(document),
              variables,
            },
            {
              next: (data) => {
                console.log('data' + wsUri);
                return observer.next && observer.next(data)
              },
              error: (err) => {
                if (!observer.error) return;
                if (err instanceof Error) {
                  observer.error(err);
                  // } else if (err instanceof CloseEvent) {
                  //   observer.error(
                  //     new Error(`Socket closed with event ${err.code}`)
                  //   );
                } else if (Array.isArray(err)) {
                  // GraphQLError[]
                  observer.error(
                      new Error(err.map(({ message }) => message).join(", "))
                  );
                }
              },
              complete: () => observer.complete && observer.complete(),
            }
        ),
      }),
    });
  }
};

const makeHybridExecutor =
  (uri, wsUri, headers = {}) =>
  (args) => {
    const wsExecutor = makeWSRemoteExecutor(wsUri);
    const httpExecutor = makeRemoteExecutor(uri, headers);

    const document =
      typeof args.document === "string"
        ? gql`
            ${args.document}
          `
        : args.document;

    // get the operation node of from the document that should be executed
    const operation = getOperationAST(document, args.operationName);
    // subscription operations should be handled by the wsExecutor

    if (operation?.operation === OperationTypeNode.SUBSCRIPTION) {
      return wsExecutor(args);
    }
    // all other operations should be handles by the httpExecutor
    return httpExecutor(args);
  };

module.exports = {
  makeRemoteExecutor,
  makeWSRemoteExecutor,
  makeHybridExecutor,
};
