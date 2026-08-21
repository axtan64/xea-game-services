// Aggregate documentation for all routes and serve it at /docs
module.exports = (swaggerDefinition, routes) => async () => {
    const docs = { ...swaggerDefinition };

    if(!docs.paths) docs.paths = {};
    if(!docs.components) docs.components = {};
    if(!docs.components.schemas) docs.components.schemas = {};

    // Fetch documentation from each microservice that has a docs route defined
    const entries = await Promise.all(
        Object.entries(routes).map(async ([prefix, route]) => {
            if(!route.docs)
                return null;

            try {
                const res = await fetch(route.origin + route.docs);
                return [prefix, await res.json()];
            } catch(err) {
                console.error(`Error fetching docs from ${route.origin + route.docs}:`, err);
                return null;
            }
        })
    )

    // Inject paths and schemas from each microservice's documentation into the gateway docs.
    // Paths are rewritten with the service's gateway prefix (e.g. /track -> /discord-webhook/track),
    // since that's the path a caller actually has to hit - the gateway strips it before forwarding.
    for(const entry of entries) {
        if(!entry) continue;

        const [prefix, spec] = entry;

        for(const [path, definition] of Object.entries(spec.paths || {}))
            docs.paths[`${prefix}${path}`] = definition;

        docs.components.schemas = { ...docs.components.schemas, ...spec.components?.schemas };
    }

    return docs;
}
