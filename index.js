const { ApolloServer } = require("apollo-server");
const {
    ApolloGateway,
    RemoteGraphQLDataSource,
    LocalGraphQLDataSource,
} = require("@apollo/gateway");

const getBCApiSchema = require("./bc-api-service");

const setupGateway = async () => {
    const bcApiSchema = await getBCApiSchema();

    const gateway = new ApolloGateway({
        serviceList: [
            { name: "bc-api", url: "http://bc-api" },
            { name: "loan-mod-api", url: "http://localhost:5154/graphql" }, // add loan mod uri here
        ],

        // Experimental: Enabling this enables the query plan view in Playground.
        __exposeQueryPlanExperimental: false,
        buildService: ({ url }) => {
            if (url === "http://bc-api") {
                return new LocalGraphQLDataSource(bcApiSchema);
            } else {
                return new RemoteGraphQLDataSource({
                    url,
                });
            }
        },
    });

    return gateway;
};

(async () => {
    const gateway = await setupGateway();

    const server = new ApolloServer({
        gateway,

        // Apollo Graph Manager (previously known as Apollo Engine)
        // When enabled and an `ENGINE_API_KEY` is set in the environment,
        // provides metrics, schema management and trace reporting.
        engine: false,

        // Subscriptions are unsupported but planned for a future Gateway version.
        subscriptions: false,
    });

    server.listen().then(({ url }) => {
        console.log(`🚀 Server ready at ${url}`);
    });
})();
