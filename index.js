const { fetch } = require("cross-undici-fetch");
const { ApolloGateway } = require("@apollo/gateway");
const { introspectSchema, wrapSchema } = require("@graphql-tools/wrap");
const { print } = require("graphql");
const { stitchSchemas } = require("@graphql-tools/stitch");
const { delegateToSchema } = require("@graphql-tools/delegate");
const express = require("express");
const { graphqlHTTP } = require("express-graphql");
const { ApolloServer } = require("apollo-server");

require("dotenv").config();

const run = async () => {
  // 1. Create gateway and federation schema
  // Authentication and other options: https://www.apollographql.com/docs/federation/api/apollo-gateway
  const gateway = new ApolloGateway();

  const federationServer = new ApolloServer({
    gateway,
    // Subscriptions are not currently supported in Apollo Federation
    subscriptions: false,
  });

  // start local federation server for executor to work
  await federationServer
    .listen({
      port: 4001,
    })
    .then(({ url }) => {
      console.log(`🚀 Gateway ready at ${url}`);
    })
    .catch((err) => {
      console.error(err);
    });

  const federationExecutor = async ({ document, variables }) => {
    const query = print(document);
    const fetchResult = await fetch("http://0.0.0:4001/graphql", {
      // BC API uri for stiching
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });
    return fetchResult.json();
  };

  const gatewaySchema = await wrapSchema({
    schema: await introspectSchema(federationExecutor),
    executor: federationExecutor,
  });

  // 2. Creating BC API Schema
  const executor = async ({ document, variables }) => {
    const query = print(document);
    const token =
        "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6IjJaUXBKM1VwYmpBWVhZR2FYRUpsOGxWMFRPSSIsImtpZCI6IjJaUXBKM1VwYmpBWVhZR2FYRUpsOGxWMFRPSSJ9.eyJhdWQiOiJlZjZhZWZlYi1lMzVkLTQ1MDctYWE2Mi0zZmFlNTc1YjgyYzkiLCJpc3MiOiJodHRwczovL3N0cy53aW5kb3dzLm5ldC8xYWZmMDY2OS1lZTVmLTQwYjgtOTgwMC1iNWVjNGYzOWM0OGUvIiwiaWF0IjoxNjU4NDQwMTM5LCJuYmYiOjE2NTg0NDAxMzksImV4cCI6MTY1ODQ0NDAzOSwiYWlvIjoiRTJaZ1lEaXptanRRdk1udjBIZFp3WFVmQk9ZZUFRQT0iLCJhcHBpZCI6IjU1ZjEwYmE1LWJlMmQtNDMwMy1iZjFmLTEyZmI2MTZiYTMyZCIsImFwcGlkYWNyIjoiMSIsImlkcCI6Imh0dHBzOi8vc3RzLndpbmRvd3MubmV0LzFhZmYwNjY5LWVlNWYtNDBiOC05ODAwLWI1ZWM0ZjM5YzQ4ZS8iLCJvaWQiOiI5MjdjMTE4Ny1kYjk0LTQzYjEtOGQyOC0xZmEzNTJmMGM2NDUiLCJyaCI6IjAuQVc0QWFRYl9HbF91dUVDWUFMWHNUem5FanV2dmF1OWQ0d2RGcW1JX3JsZGJnc2x1QUFBLiIsInJvbGVzIjpbIkFjY291bnRfb2M6RHJpdmVUaW1lX2xwOkRyaXZlVGltZV9zcDpEcml2ZVRpbWUiLCJBY2NvdW50X29jOkdPRklOQU5DSUFMX2xwOkdPRklOQU5DSUFMX3NwOkRyaXZlVGltZSIsIkFjY291bnRfb2M6Q0FSVkFOQV9scDpHT0ZJTkFOQ0lBTF9zcDpEcml2ZVRpbWUiLCJBY2NvdW50X29jOkNBUlZBTkFfbHA6QWxseV9zcDpEcml2ZVRpbWUiLCJBY2NvdW50U3RhdHVzX0FMTCIsIkFjY291bnRfb2M6RHJpdmVUaW1lX2xwOkFsbHlfc3A6RHJpdmVUaW1lIiwiQWNjb3VudF9vYzpEcml2ZVRpbWVfbHA6U2N1c2Ffc3A6U2N1c2EiLCJBY2NvdW50X29jOkdvRmlfbHA6R09GSU5BTkNJQUxfc3A6RHJpdmVUaW1lIl0sInN1YiI6IjkyN2MxMTg3LWRiOTQtNDNiMS04ZDI4LTFmYTM1MmYwYzY0NSIsInRpZCI6IjFhZmYwNjY5LWVlNWYtNDBiOC05ODAwLWI1ZWM0ZjM5YzQ4ZSIsInV0aSI6ImN2cHJ6UTgtM2tpYTRfUnE0bExtQUEiLCJ2ZXIiOiIxLjAifQ.M3P3kDy1DXswNLN4b5_wtbMigPjraYSCDRaWIhUWtd7aJv3soEaAPZQDbofJVgDU8zc9zrSD0b4bFAlvNOgX1DxwaMIBITstLJswlYQ35uO5w5IqzQ-4FcSnTYDTj7YcoT7zSoGp4fYso4UVTwUSkWpvfzYfzDzWSiJ626J37baMi3_qS0FtxUGbvzeEcXQD9IyUrxrED4xK12ZzG_PiccAPgiAYyrbXXvEiurw6VoOmnDPSN2P1PuqPd_kQoztXeJi5b3VdbtQtOHAI6rKsu1tKj1QmRkLrX0o45RSAzc1t9KrWD_icj1rDrguh5N0i2ziIteftskox9sWK2YqOsQ";
    const fetchResult = await fetch(
      "https://api-test.bridgecrest.com/graphql",
      {
        // BC API uri for stiching
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Need new Authorization after it's expired
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query, variables }),
      }
    );
    return fetchResult.json();
  };
  const bcApiSchema = await wrapSchema({
    schema: await introspectSchema(executor),
    executor,
    transforms: [], // wrapSchema can use transforms to rename query name. Possibly can be used to match BC API queries to the current BFF queries
    // https://www.graphql-tools.com/docs/schema-wrapping
  });

  // 3. merge these 2 schemas
  // https://www.graphql-tools.com/docs/schema-stitching/stitch-combining-schemas
  const mergedSchema = stitchSchemas({
    subschemas: [
      {
        schema: bcApiSchema,
      },
      {
        schema: gatewaySchema,
        // schema: gateway.schema,
        // executor: gateway.executor, // TODO: this executor is not resolving anything,
      },
    ],
    //https://www.graphql-tools.com/docs/schema-stitching/stitch-schema-extensions
    typeDefs: /* GraphQL */ `
      extend type SelfServiceCustomerType {
        reviews: [Review]
      }
    `,
    resolvers: {
      SelfServiceCustomerType: {
        reviews: {
          resolve(parent, args, context, info) {
            return delegateToSchema({
              schema: gatewaySchema,
              operation: "query",
              fieldName: "latestReviews",
              context,
              info,
            });
          },
        },
      },
    },
  });

  // 4. create graphql server
  const app = express();
  app.use(
    "/graphql",
    graphqlHTTP({
      schema: mergedSchema,
      graphiql: true,
    })
  );
  app.listen(4000);
  console.log("Running a GraphQL API server at http://localhost:4000/graphql");
};

try {
  run();
} catch (err) {
  console.error(err);
}
