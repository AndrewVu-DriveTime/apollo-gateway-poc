const { fetch } = require('cross-undici-fetch');
const { ApolloServer } = require('apollo-server');
const { ApolloGateway } = require('@apollo/gateway');
const { introspectSchema, wrapSchema } = require('@graphql-tools/wrap');
const { print } = require('graphql');
const { stitchSchemas } = require('@graphql-tools/stitch');
const { delegateToSchema } = require('@graphql-tools/delegate');

const run = async () => {
    // 1. Creating BC API Schema
    const executor = async ({ document, variables }) => {
        const query = print(document)
        const fetchResult = await fetch('https://api-test.bridgecrest.com/graphql', { // BC API uri for stiching
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Need new Authorization after it's expired
                'Authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6IjJaUXBKM1VwYmpBWVhZR2FYRUpsOGxWMFRPSSIsImtpZCI6IjJaUXBKM1VwYmpBWVhZR2FYRUpsOGxWMFRPSSJ9.eyJhdWQiOiJlZjZhZWZlYi1lMzVkLTQ1MDctYWE2Mi0zZmFlNTc1YjgyYzkiLCJpc3MiOiJodHRwczovL3N0cy53aW5kb3dzLm5ldC8xYWZmMDY2OS1lZTVmLTQwYjgtOTgwMC1iNWVjNGYzOWM0OGUvIiwiaWF0IjoxNjU4MTg0NjQ4LCJuYmYiOjE2NTgxODQ2NDgsImV4cCI6MTY1ODE4ODU0OCwiYWlvIjoiRTJaZ1lDaWI4ZjNWOUNmL2p1aG5Xd1FzWTNXcUFnQT0iLCJhcHBpZCI6IjU1ZjEwYmE1LWJlMmQtNDMwMy1iZjFmLTEyZmI2MTZiYTMyZCIsImFwcGlkYWNyIjoiMSIsImlkcCI6Imh0dHBzOi8vc3RzLndpbmRvd3MubmV0LzFhZmYwNjY5LWVlNWYtNDBiOC05ODAwLWI1ZWM0ZjM5YzQ4ZS8iLCJvaWQiOiI5MjdjMTE4Ny1kYjk0LTQzYjEtOGQyOC0xZmEzNTJmMGM2NDUiLCJyaCI6IjAuQVc0QWFRYl9HbF91dUVDWUFMWHNUem5FanV2dmF1OWQ0d2RGcW1JX3JsZGJnc2x1QUFBLiIsInJvbGVzIjpbIkFjY291bnRfb2M6RHJpdmVUaW1lX2xwOkRyaXZlVGltZV9zcDpEcml2ZVRpbWUiLCJBY2NvdW50X29jOkdPRklOQU5DSUFMX2xwOkdPRklOQU5DSUFMX3NwOkRyaXZlVGltZSIsIkFjY291bnRfb2M6Q0FSVkFOQV9scDpHT0ZJTkFOQ0lBTF9zcDpEcml2ZVRpbWUiLCJBY2NvdW50X29jOkNBUlZBTkFfbHA6QWxseV9zcDpEcml2ZVRpbWUiLCJBY2NvdW50U3RhdHVzX0FMTCIsIkFjY291bnRfb2M6RHJpdmVUaW1lX2xwOkFsbHlfc3A6RHJpdmVUaW1lIiwiQWNjb3VudF9vYzpEcml2ZVRpbWVfbHA6U2N1c2Ffc3A6U2N1c2EiLCJBY2NvdW50X29jOkdvRmlfbHA6R09GSU5BTkNJQUxfc3A6RHJpdmVUaW1lIl0sInN1YiI6IjkyN2MxMTg3LWRiOTQtNDNiMS04ZDI4LTFmYTM1MmYwYzY0NSIsInRpZCI6IjFhZmYwNjY5LWVlNWYtNDBiOC05ODAwLWI1ZWM0ZjM5YzQ4ZSIsInV0aSI6IlI5RTdIZ0ppQ0VDcWxMR3ZEQlk2QUEiLCJ2ZXIiOiIxLjAifQ.lQcBkJ67Fej_LoGK76lQCdMtavMQqYezMhGx5PF5nrNYJBT9cy5rgpJv8DRyYh2_jq39eA9c5cZfZob16c7b-BmU-sszTWSHGvHumhRrbzkyQjD_w_ZBmHck_EyxsgLa4onnEpbtLKj-xiafbIU1BgB4j7AC1FBhoaPPKfElgxQrABbCDERZjvAAIn3DaL64YHOTwFwZiNU6veXtPUh9i61gqTcHx8dqTrwJCXYfmiOeSY-pwFf8fR4g18AQtfTEXIUuF54QejcPkr8yC-6_qhhAOhja6TzCppI1BLGkeL05CHqOz-qpGogxrZVI_1wkUyqZbmLzwi_cwkF1njhpnA'
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
            // { name: 'locations', url: 'https://flyby-locations-sub.herokuapp.com/' },
            // { name: 'reviews', url: 'https://flyby-reviews-sub.herokuapp.com/' },
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
                executor: gateway.executor // TODO: this executor is giving errors
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

    // 4. create ApolloServer
    const server = new ApolloServer({
        // gateway,
        schema: mergedSchema,
        // executor: gateway.executor,
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
