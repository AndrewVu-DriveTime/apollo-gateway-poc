const { fetch } = require("cross-fetch");
const { print } = require("graphql");
const { wrapSchema, introspectSchema } = require("@graphql-tools/wrap");
const { transformSchemaFederation } = require("graphql-transform-federation");

const executor = async ({ document, variables }) => {
    const query = print(document);
    const fetchResult = await fetch("https://api-test.bridgecrest.com/graphql", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            'Authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6IjJaUXBKM1VwYmpBWVhZR2FYRUpsOGxWMFRPSSIsImtpZCI6IjJaUXBKM1VwYmpBWVhZR2FYRUpsOGxWMFRPSSJ9.eyJhdWQiOiJlZjZhZWZlYi1lMzVkLTQ1MDctYWE2Mi0zZmFlNTc1YjgyYzkiLCJpc3MiOiJodHRwczovL3N0cy53aW5kb3dzLm5ldC8xYWZmMDY2OS1lZTVmLTQwYjgtOTgwMC1iNWVjNGYzOWM0OGUvIiwiaWF0IjoxNjU4MjQ5NDMwLCJuYmYiOjE2NTgyNDk0MzAsImV4cCI6MTY1ODI1MzMzMCwiYWlvIjoiRTJaZ1lIQlhqZWk3VktteHhIem43aElqTWRZTEFBPT0iLCJhcHBpZCI6IjU1ZjEwYmE1LWJlMmQtNDMwMy1iZjFmLTEyZmI2MTZiYTMyZCIsImFwcGlkYWNyIjoiMSIsImlkcCI6Imh0dHBzOi8vc3RzLndpbmRvd3MubmV0LzFhZmYwNjY5LWVlNWYtNDBiOC05ODAwLWI1ZWM0ZjM5YzQ4ZS8iLCJvaWQiOiI5MjdjMTE4Ny1kYjk0LTQzYjEtOGQyOC0xZmEzNTJmMGM2NDUiLCJyaCI6IjAuQVc0QWFRYl9HbF91dUVDWUFMWHNUem5FanV2dmF1OWQ0d2RGcW1JX3JsZGJnc2x1QUFBLiIsInJvbGVzIjpbIkFjY291bnRfb2M6RHJpdmVUaW1lX2xwOkRyaXZlVGltZV9zcDpEcml2ZVRpbWUiLCJBY2NvdW50X29jOkdPRklOQU5DSUFMX2xwOkdPRklOQU5DSUFMX3NwOkRyaXZlVGltZSIsIkFjY291bnRfb2M6Q0FSVkFOQV9scDpHT0ZJTkFOQ0lBTF9zcDpEcml2ZVRpbWUiLCJBY2NvdW50X29jOkNBUlZBTkFfbHA6QWxseV9zcDpEcml2ZVRpbWUiLCJBY2NvdW50U3RhdHVzX0FMTCIsIkFjY291bnRfb2M6RHJpdmVUaW1lX2xwOkFsbHlfc3A6RHJpdmVUaW1lIiwiQWNjb3VudF9vYzpEcml2ZVRpbWVfbHA6U2N1c2Ffc3A6U2N1c2EiLCJBY2NvdW50X29jOkdvRmlfbHA6R09GSU5BTkNJQUxfc3A6RHJpdmVUaW1lIl0sInN1YiI6IjkyN2MxMTg3LWRiOTQtNDNiMS04ZDI4LTFmYTM1MmYwYzY0NSIsInRpZCI6IjFhZmYwNjY5LWVlNWYtNDBiOC05ODAwLWI1ZWM0ZjM5YzQ4ZSIsInV0aSI6IjJ5eDRGUUxPZzBHM01BWGZDU3h4QUEiLCJ2ZXIiOiIxLjAifQ.iir--EfwdtJURwmg_Tb2ui0Y12RYFnwzMW-m80P9YwgT9DHP-xApPohBVRe7g_v1ITT94MkwY6eZ-yitSJya7gcUIwIo0rT-3xoZT7v8fDBTHb6XJZjM5HxhX2qLBMaHgPXJ69sgc4VgbIDVpDF-s5aaK7NYEcflJNg4lL_Wd3X_d0mjYaWCApB1AACh1yhuFtwki8J8W_nB_A0aovTztycMBBb_KScMgw6DYUuBTXWOUAa4AfDq8vf0gcz2q_UZ6-BS1e7lk9P1vfqzQgCfb_P8ozSBZQN-H4bny-36CPkuYY99xoewtBR0OqQVDI8InyoglLjrPeypk8_CEtkA_A'
        },
        body: JSON.stringify({ query, variables }),
    });
    return fetchResult.json();
};

module.exports = async () => {
    const schema = wrapSchema({
        schema: await introspectSchema(executor),
        executor,
    });

    return transformSchemaFederation(schema, {
        Query: {
            extend: false,
        },
    });
};
