const { fetch } = require('cross-undici-fetch');
const { ApolloServer } = require('apollo-server');
const { ApolloGateway } = require('@apollo/gateway');
const { introspectSchema, wrapSchema } = require('@graphql-tools/wrap');
const { print } = require('graphql');

const run = async () => {
    // stiching BC API over
    const executor = async ({ document, variables }) => {
        const query = print(document)
        const fetchResult = await fetch('http://localhost:5002/graphql', { // BC API uri for stiching
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query, variables })
        })
        return fetchResult.json()
    }

    const bcApiSchema = await  wrapSchema({
        schema: await introspectSchema(executor),
        executor
    });

// Create gateway for federation
    const gateway = new ApolloGateway({
        // serviceList is deprecated. Only using it for POC purposes
        serviceList: [
            { name: 'locations', url: 'https://flyby-locations-sub.herokuapp.com/' },
            { name: 'reviews', url: 'https://flyby-reviews-sub.herokuapp.com/' },
            { name: 'loan-mod-api', url: 'http://localhost:5154/graphql' }, // add loan mod uri here
        ],
    });

    const server = new ApolloServer({
        gateway,
        // schema: bcApiSchema,
        // Subscriptions are not currently supported in Apollo Federation
        subscriptions: false
    });

    server.listen().then(({ url }) => {
        console.log(`🚀 Gateway ready at ... ${url}`);
    });
}

try {
    run();
} catch (err) {
    console.error(err);
}
