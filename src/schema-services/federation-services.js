const { stitchSchemas } = require("@graphql-tools/stitch");
const {
  federationToStitchingSDL,
  stitchingDirectives,
} = require("@graphql-tools/stitching-directives");

const { buildSchema } = require("graphql");
const { makeRemoteExecutor } = require("../lib");
const stitchingConfig = stitchingDirectives();

// https://www.graphql-tools.com/docs/schema-stitching/stitch-federation
async function fetchFederationSubchema(executor) {
  const { data } = await executor({ document: "{ _service { sdl } }" });
  const sdl = federationToStitchingSDL(data._service.sdl, stitchingConfig);
  return {
    schema: buildSchema(sdl, { assumeValidSDL: true }),
    executor,
  };
}

async function makeGatewaySchema() {
  return stitchSchemas({
    subschemaConfigTransforms: [stitchingConfig.stitchingDirectivesTransformer],
    subschemas: await Promise.all([
      fetchFederationSubchema(
          makeRemoteExecutor("https://flyby-locations-sub.herokuapp.com/")
      ),
      fetchFederationSubchema(
        makeRemoteExecutor("https://flyby-reviews-sub.herokuapp.com/")
      ),
    ]),
  });
}

module.exports = makeGatewaySchema;
