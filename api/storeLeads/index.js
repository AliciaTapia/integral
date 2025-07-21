
// This code is the one that was building correctly on 7/20for the Azure Functions HTTP trigger to handle lead storage
// It initializes the TableClient, handles CORS, and processes GET/POST requests


// api/storeLeads/index.js (CORRECTED VERSION)
const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');

// Configuration
const TABLE_NAME = 'leads';

// Initialize with error handling
let tableClient;
try {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
        console.error('AZURE_STORAGE_CONNECTION_STRING not found');
    }
    tableClient = TableClient.fromConnectionString(connectionString, TABLE_NAME);
} catch (error) {
    console.error('Failed to initialize table client:', error);
}
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

      // Handle GET - health check
        if (request.method === 'GET') {
            try {
                const hasConnectionString = !!process.env.AZURE_STORAGE_CONNECTION_STRING;
                let tableConnected = false;
                
                // Test table connection if we have a client
                if (tableClient) {
                    try {
                        await tableClient.createTable().catch(err => {
                            if (err.statusCode !== 409) { // 409 = table already exists
                                throw err;
                            }
                        });
                        tableConnected = true;
                    } catch (tableError) {
                        context.log('Table connection test failed:', tableError.message);
                    }
                }

                return {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        ...corsHeaders
                    },
                    jsonBody: {
                        message: 'Integral Exterior Leads API is working',
                        timestamp: new Date().toISOString(),
                        hasConnectionString,
                        tableConnected,
                        environment: process.env.AZURE_FUNCTIONS_ENVIRONMENT || 'Production'
                    }
                };
            } catch (error) {
                context.log('Health check failed:', error);
                return {
                    status: 500,
                    headers: {
                        'Content-Type': 'application/json',
                        ...corsHeaders
                    },
                    jsonBody: {
                        message: 'API health check failed',
                        error: error.message,
                        hasConnectionString: !!process.env.AZURE_STORAGE_CONNECTION_STRING
                    }
                };
            }
        }

        // Handle POST - store lead
        if (request.method === 'POST') {
            try {
                // Check connection string
                const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
                if (!connectionString) {
                    throw new Error('Azure Storage connection string not configured');
                }

                // Initialize TableClient inside handler
                const tableClient = TableClient.fromConnectionString(connectionString, 'leads');

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