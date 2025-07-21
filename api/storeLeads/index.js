// api/storeLeads/index.js (CORRECTED VERSION)
const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');

// Initialize with error handling
let tableClient;
try {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
        console.error('AZURE_STORAGE_CONNECTION_STRING not found');
    }
    tableClient = TableClient.fromConnectionString(connectionString, 'leads');
} catch (error) {
    console.error('Failed to initialize table client:', error);
}

app.http('storeLeads', {
    methods: ['GET', 'POST', 'OPTIONS'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log(`HTTP function processed request for URL "${request.url}"`);
        context.log('Method:', request.method);

        // CORS headers for all responses
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400'
        };

        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return {
                status: 200,
                headers: corsHeaders,
                body: ''
            };
        }

        // Handle GET - test endpoint
        if (request.method === 'GET') {
            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders
                },
                jsonBody: {
                    message: 'Integral Exterior Leads API is running',
                    timestamp: new Date().toISOString(),
                    hasConnectionString: !!process.env.AZURE_STORAGE_CONNECTION_STRING
                }
            };
        }

        // Handle POST - store lead
        if (request.method === 'POST') {
            try {
                // Check connection string
                if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
                    throw new Error('Azure Storage connection string not configured');
                }

                // Parse request body
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

                // Create table if it doesn't exist
                await tableClient.createTable().catch(err => {
                    if (err.statusCode !== 409) { // 409 = already exists
                        throw err;
                    }
                });

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

                // Store in table
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