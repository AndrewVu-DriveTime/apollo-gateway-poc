const { fetch } = require('cross-undici-fetch');
const { ApolloGateway } = require('@apollo/gateway');
const { introspectSchema, wrapSchema } = require('@graphql-tools/wrap');
const { print } = require('graphql');
const { stitchSchemas } = require('@graphql-tools/stitch');
const { delegateToSchema } = require('@graphql-tools/delegate');
const express = require('express');
const { graphqlHTTP } = require('express-graphql');

const run = async () => {
    // 1. Creating BC API Schema
    const executor = async ({ document, variables }) => {
        const query = print(document)
        const fetchResult = await fetch('https://api-test.bridgecrest.com/graphql', { // BC API uri for stiching
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Need new Authorization after it's expired
                'Authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6IjJaUXBKM1VwYmpBWVhZR2FYRUpsOGxWMFRPSSIsImtpZCI6IjJaUXBKM1VwYmpBWVhZR2FYRUpsOGxWMFRPSSJ9.eyJhdWQiOiJlZjZhZWZlYi1lMzVkLTQ1MDctYWE2Mi0zZmFlNTc1YjgyYzkiLCJpc3MiOiJodHRwczovL3N0cy53aW5kb3dzLm5ldC8xYWZmMDY2OS1lZTVmLTQwYjgtOTgwMC1iNWVjNGYzOWM0OGUvIiwiaWF0IjoxNjU4MjU0NjAzLCJuYmYiOjE2NTgyNTQ2MDMsImV4cCI6MTY1ODI1ODUwMywiYWlvIjoiRTJaZ1lMQ09XUGNvbXNualM3eDNhM3o0cjFjcEFBPT0iLCJhcHBpZCI6IjU1ZjEwYmE1LWJlMmQtNDMwMy1iZjFmLTEyZmI2MTZiYTMyZCIsImFwcGlkYWNyIjoiMSIsImlkcCI6Imh0dHBzOi8vc3RzLndpbmRvd3MubmV0LzFhZmYwNjY5LWVlNWYtNDBiOC05ODAwLWI1ZWM0ZjM5YzQ4ZS8iLCJvaWQiOiI5MjdjMTE4Ny1kYjk0LTQzYjEtOGQyOC0xZmEzNTJmMGM2NDUiLCJyaCI6IjAuQVc0QWFRYl9HbF91dUVDWUFMWHNUem5FanV2dmF1OWQ0d2RGcW1JX3JsZGJnc2x1QUFBLiIsInJvbGVzIjpbIkFjY291bnRfb2M6RHJpdmVUaW1lX2xwOkRyaXZlVGltZV9zcDpEcml2ZVRpbWUiLCJBY2NvdW50X29jOkdPRklOQU5DSUFMX2xwOkdPRklOQU5DSUFMX3NwOkRyaXZlVGltZSIsIkFjY291bnRfb2M6Q0FSVkFOQV9scDpHT0ZJTkFOQ0lBTF9zcDpEcml2ZVRpbWUiLCJBY2NvdW50X29jOkNBUlZBTkFfbHA6QWxseV9zcDpEcml2ZVRpbWUiLCJBY2NvdW50U3RhdHVzX0FMTCIsIkFjY291bnRfb2M6RHJpdmVUaW1lX2xwOkFsbHlfc3A6RHJpdmVUaW1lIiwiQWNjb3VudF9vYzpEcml2ZVRpbWVfbHA6U2N1c2Ffc3A6U2N1c2EiLCJBY2NvdW50X29jOkdvRmlfbHA6R09GSU5BTkNJQUxfc3A6RHJpdmVUaW1lIl0sInN1YiI6IjkyN2MxMTg3LWRiOTQtNDNiMS04ZDI4LTFmYTM1MmYwYzY0NSIsInRpZCI6IjFhZmYwNjY5LWVlNWYtNDBiOC05ODAwLWI1ZWM0ZjM5YzQ4ZSIsInV0aSI6Inc1ZEJHZms0ZWt1ZE1qQ2otZmtrQUEiLCJ2ZXIiOiIxLjAifQ.LLyB7C-JBAc1v-fWI8VF4mzE5PRpFKWQyXaMSzW4LqPoFOzV-gC1io8GxyQk2IWoxLn24t5PEByxj4xVoSYPIwzrD1siWwOUHF5KRjV1en65-SuhO3xNn9UZT7pIWpF39Mf0Dkd8ZDua4k_0uAnKFTp19plKDqf8dDPis_fzpmmjUEX3ozrJIQyobj4sNEWr6vhmt28XRUiMKHdJhjn-75_xr9QjUtr8bccAiMNPB2KBQEJC4f2aC64racYn2zYEe-cjQCXbh-Hs3-36U46nULgHgPMyKbzPIRDK--4xlCmmePZTKB1r9lNzbIavB_dY1VtHtYUHNyVXv-WKKx9Eww'
            },
            body: JSON.stringify({ query, variables })
        })
        return fetchResult.json()
    }
    const bcApiSchema = await  wrapSchema({
        schema: await introspectSchema(executor),
        executor,
        transforms: [] // wrapSchema can use transforms to rename query name. Possibly can be used to match BC API queries to the current BFF queries
        // https://www.graphql-tools.com/docs/schema-wrapping
    });

    // 2. Create gateway and federation schema
    // Authentication and other options: https://www.apollographql.com/docs/federation/api/apollo-gateway
    const gateway = new ApolloGateway({
        // serviceList is deprecated. Only using it for POC purposes
        serviceList: [
            { name: 'locations', url: 'https://flyby-locations-sub.herokuapp.com/' },
            { name: 'reviews', url: 'https://flyby-reviews-sub.herokuapp.com/' },
            { name: 'loan-mod-api', url: 'http://localhost:5154/graphql' }, // add loan mod uri here
        ],
    });
    await gateway.load();


    // 3. merge these 2 schemas
    // https://www.graphql-tools.com/docs/schema-stitching/stitch-combining-schemas
    const mergedSchema = stitchSchemas({
        subschemas: [
            {
                schema: bcApiSchema,
            },
            {
                schema: gateway.schema,
                executor: gateway.executor, // TODO: this executor is not resolving anything,
            }
        ],
        //https://www.graphql-tools.com/docs/schema-stitching/stitch-schema-extensions
        typeDefs: /* GraphQL */ `
            extend type SelfServiceCustomerType {
                notes: [Note]
            }
        `,
        resolvers: {
            SelfServiceCustomerType: {
                notes: {
                    resolve(parent, args, context, info) {
                        return delegateToSchema({
                            schema: gateway.schema,
                            operation: 'query',
                            fieldName: 'notes',
                            context, info
                        })
                    }
                }
            }
        }
    });

    // 4. create graphql server
    const app = express();
    app.use('/graphql', graphqlHTTP({
        schema: mergedSchema,
        graphiql: true,
    }));
    app.listen(4000);
    console.log('Running a GraphQL API server at http://localhost:4000/graphql');
}

try {
    run();
} catch (err) {
    console.error(err);
}
