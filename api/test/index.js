const { app } = require('@azure/functions');

app.http('test', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        return {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            jsonBody: { message: 'Hello from Azure Functions!' }
        };
    }
});