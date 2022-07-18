const { fetch } = require('cross-undici-fetch');
const { ApolloServer } = require('apollo-server');
const { ApolloGateway } = require('@apollo/gateway');
const { introspectSchema, wrapSchema } = require('@graphql-tools/wrap');
const { print } = require('graphql');
const { stitchSchemas } = require('@graphql-tools/stitch');

const run = async () => {
    // stiching BC API over
    const executor = async ({ document, variables }) => {
        const query = print(document)
        const fetchResult = await fetch('https://api-test.bridgecrest.com/graphql', { // BC API uri for stiching
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6IjJaUXBKM1VwYmpBWVhZR2FYRUpsOGxWMFRPSSIsImtpZCI6IjJaUXBKM1VwYmpBWVhZR2FYRUpsOGxWMFRPSSJ9.eyJhdWQiOiJlZjZhZWZlYi1lMzVkLTQ1MDctYWE2Mi0zZmFlNTc1YjgyYzkiLCJpc3MiOiJodHRwczovL3N0cy53aW5kb3dzLm5ldC8xYWZmMDY2OS1lZTVmLTQwYjgtOTgwMC1iNWVjNGYzOWM0OGUvIiwiaWF0IjoxNjU4MTc5NjE5LCJuYmYiOjE2NTgxNzk2MTksImV4cCI6MTY1ODE4MzUxOSwiYWlvIjoiRTJaZ1lMaG5JdlVsMisyWjRKbm8zZWJYN3BWdkFBQT0iLCJhcHBpZCI6IjU1ZjEwYmE1LWJlMmQtNDMwMy1iZjFmLTEyZmI2MTZiYTMyZCIsImFwcGlkYWNyIjoiMSIsImlkcCI6Imh0dHBzOi8vc3RzLndpbmRvd3MubmV0LzFhZmYwNjY5LWVlNWYtNDBiOC05ODAwLWI1ZWM0ZjM5YzQ4ZS8iLCJvaWQiOiI5MjdjMTE4Ny1kYjk0LTQzYjEtOGQyOC0xZmEzNTJmMGM2NDUiLCJyaCI6IjAuQVc0QWFRYl9HbF91dUVDWUFMWHNUem5FanV2dmF1OWQ0d2RGcW1JX3JsZGJnc2x1QUFBLiIsInJvbGVzIjpbIkFjY291bnRfb2M6RHJpdmVUaW1lX2xwOkRyaXZlVGltZV9zcDpEcml2ZVRpbWUiLCJBY2NvdW50X29jOkdPRklOQU5DSUFMX2xwOkdPRklOQU5DSUFMX3NwOkRyaXZlVGltZSIsIkFjY291bnRfb2M6Q0FSVkFOQV9scDpHT0ZJTkFOQ0lBTF9zcDpEcml2ZVRpbWUiLCJBY2NvdW50X29jOkNBUlZBTkFfbHA6QWxseV9zcDpEcml2ZVRpbWUiLCJBY2NvdW50U3RhdHVzX0FMTCIsIkFjY291bnRfb2M6RHJpdmVUaW1lX2xwOkFsbHlfc3A6RHJpdmVUaW1lIiwiQWNjb3VudF9vYzpEcml2ZVRpbWVfbHA6U2N1c2Ffc3A6U2N1c2EiLCJBY2NvdW50X29jOkdvRmlfbHA6R09GSU5BTkNJQUxfc3A6RHJpdmVUaW1lIl0sInN1YiI6IjkyN2MxMTg3LWRiOTQtNDNiMS04ZDI4LTFmYTM1MmYwYzY0NSIsInRpZCI6IjFhZmYwNjY5LWVlNWYtNDBiOC05ODAwLWI1ZWM0ZjM5YzQ4ZSIsInV0aSI6IkxIM003SUFzaEVtbzVQbnpRVnRYQUEiLCJ2ZXIiOiIxLjAifQ.SxddL2N0z3YN_QowN3uInh9O-NCAhyvzlRWPWWbKi3JjA6RpkqhjFB2DI46DWckiIVuHUbKSLTNTfZ3z9A99hmAs3Wuh9NS795wjPLvphUArUg0dnshQLoKNhyyySdz0KeoN3xYs12rThCwywvgk_STEU1R10uxYNkGsUafg8Am74_mEBR5-os37qc9a3JEzvJSveqyDFRbzvWwwwdfOVKWBdX-OqUgUuwFYz3TULa_vss6TeHBu2oIjiAicjTDb-qEGR_O1Jzade7okK0XRMOSno4EWaJvPYDH08bAoqTZHZz7mwd16oUGPBjizfcDZN3D293h5EB86Z6PG6ZUUUA'
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

    // Create gateway for federation
    const gateway = new ApolloGateway({
        // serviceList is deprecated. Only using it for POC purposes
        serviceList: [
            { name: 'locations', url: 'https://flyby-locations-sub.herokuapp.com/' },
            { name: 'reviews', url: 'https://flyby-reviews-sub.herokuapp.com/' },
            // { name: 'loan-mod-api', url: 'http://localhost:5154/graphql' }, // add loan mod uri here
        ],
    });

    const gatewaySchema = await (async () => {
        const { schema, executor } = await gateway.load();
        return schema;
    })();


    // https://www.graphql-tools.com/docs/schema-stitching/stitch-combining-schemas
    // https://github.com/gmac/schema-stitching-handbook
    const mergedSchema = stitchSchemas({
        subschemas: [
            bcApiSchema,
            gatewaySchema,
        ]
    });

    const server = new ApolloServer({
        // gateway,
        schema: mergedSchema,
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
