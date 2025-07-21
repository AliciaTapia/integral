const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
};

async function ensureTableExists(tableClient) {
    try {
        await tableClient.createTable();
    } catch (error) {
        if (error.statusCode !== 409) { // 409 = table already exists
            throw error;
        }
    }
}

app.http('storeLeads', {
    methods: ['GET', 'POST', 'OPTIONS'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return {
                status: 200,
                headers: corsHeaders,
                body: ''
            };
        }

        // Initialize TableClient inside handler
        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
        if (!connectionString) {
            context.log('Azure Storage connection string not configured');
            return {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders
                },
                jsonBody: {
                    success: false,
                    error: 'Server configuration error'
                }
            };
        }

        const tableClient = TableClient.fromConnectionString(connectionString, 'leads');

        try {
            await ensureTableExists(tableClient);
        } catch (error) {
            context.log('Table creation error:', error);
            return {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders
                },
                jsonBody: {
                    success: false,
                    error: 'Failed to initialize storage',
                    details: error.message
                }
            };
        }

        // Handle GET - health check
        if (request.method === 'GET') {
            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders
                },
                jsonBody: {
                    message: 'Integral Exterior Leads API is working',
                    timestamp: new Date().toISOString(),
                    hasConnectionString: !!connectionString,
                    environment: process.env.AZURE_FUNCTIONS_ENVIRONMENT || 'Production'
                }
            };
        }

        // Handle POST - store lead
        if (request.method === 'POST') {
            try {
                const leadData = await request.json();
                context.log('Received lead data:', leadData);

                // Validate required fields
                if (!leadData.name || !leadData.email || !leadData.phone) {
                    return {
                        status: 400,
                        headers: {
                            'Content-Type': 'application/json',
                            ...corsHeaders
                        },
                        jsonBody: {
                            success: false,
                            error: 'Missing required fields: name, email, phone'
                        }
                    };
                }

                // Create entity
                const timestamp = Date.now();
                const entity = {
                    partitionKey: 'Leads',
                    rowKey: `${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
                    name: leadData.name,
                    email: leadData.email,
                    phone: leadData.phone,
                    service: leadData.service || 'not-specified',
                    budget: leadData.budget || 'not-specified',
                    message: leadData.message || '',
                    status: 'new',
                    dateCreated: new Date().toISOString(),
                    source: 'website-form'
                };

                context.log('Storing entity:', entity);
                await tableClient.createEntity(entity);
                
                return {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        ...corsHeaders
                    },
                    jsonBody: {
                        success: true,
                        message: 'Lead stored successfully',
                        leadId: entity.rowKey
                    }
                };
            } catch (error) {
                context.log('Error processing POST request:', error);
                return {
                    status: 500,
                    headers: {
                        'Content-Type': 'application/json',
                        ...corsHeaders
                    },
                    jsonBody: {
                        success: false,
                        error: 'Internal server error',
                        details: error.message
                    }
                };
            }
        }

        // Handle unsupported methods
        return {
            status: 405,
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
            },
            jsonBody: {
                success: false,
                error: 'Method not allowed'
            }
        };
    }
});