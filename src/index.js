const { ApolloServer } = require("apollo-server");
const { stitchSchemas } = require("@graphql-tools/stitch");
const { delegateToSchema } = require("@graphql-tools/delegate");
const { generateBcApiSchema, generateFederationSchema } = require("./schema-services");


const run = async () => {
  // 1. Creating BC API Schema
  const bcApiSchema = await generateBcApiSchema();

  // 2. Create federation schema
  const federationGatewaySchema = await generateFederationSchema();

  // 3. merge these 2 schemas
  // https://www.graphql-tools.com/docs/schema-stitching/stitch-combining-schemas
  const mergedSchema = stitchSchemas({
    subschemas: [
      {
        schema: bcApiSchema,
      },
      {
        schema: federationGatewaySchema,
      },
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
              schema: federationGatewaySchema,
              operation: "query",
              fieldName: "notes",
              context,
              info,
            });
          },
        },
      },
    },
  });

  // 4. create ApolloServer
  const server = new ApolloServer({
    // gateway,
    schema: mergedSchema,
    // executor: gateway.executor,
    // Subscriptions are not currently supported in Apollo Federation
    subscriptions: false,
  });

  server.listen().then(({ url }) => {
    console.log(`🚀 Gateway ready at ... ${url}`);
  });
};

try {
  run();
} catch (err) {
  console.error(err);
}
