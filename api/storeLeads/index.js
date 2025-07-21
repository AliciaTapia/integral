
const { TableClient } = require('@azure/data-tables');

// Initialize table client
let tableClient;
try {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const tableName = process.env.TABLE_NAME || 'leads';
    
    if (connectionString) {
        tableClient = TableClient.fromConnectionString(connectionString, tableName);
        console.log('Table client initialized successfully');
    } else {
        console.error('AZURE_STORAGE_CONNECTION_STRING environment variable is missing');
    }
} catch (error) {
    console.error('Failed to initialize table client:', error);
}

module.exports = async function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');
    
    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Max-Age': '86400'
    };

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        context.res = {
            status: 200,
            headers: corsHeaders,
            body: ''
        };
        return;
    }

    // Handle GET - health check
    if (req.method === 'GET') {
        try {
            // Test connection string availability
            const hasConnectionString = !!process.env.AZURE_STORAGE_CONNECTION_STRING;
            
            // If we have a table client, test the connection
            let tableConnected = false;
            if (tableClient) {
                try {
                    await tableClient.createTable().catch(err => {
                        if (err.statusCode !== 409) { // 409 = table already exists
                            throw err;
                        }
                    });
                    tableConnected = true;
                } catch (tableError) {
                    context.log.error('Table connection test failed:', tableError);
                }
            }

            context.res = {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders
                },
                body: JSON.stringify({
                    message: 'Integral Exterior Leads API is working',
                    timestamp: new Date().toISOString(),
                    hasConnectionString,
                    tableConnected,
                    environment: process.env.AZURE_FUNCTIONS_ENVIRONMENT || 'Production'
                })
            };
        } catch (error) {
            context.log.error('Health check failed:', error);
            context.res = {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders
                },
                body: JSON.stringify({
                    message: 'API health check failed',
                    error: error.message,
                    hasConnectionString: !!process.env.AZURE_STORAGE_CONNECTION_STRING,
                    tableConnected: false
                })
            };
        }
        return;
    }

    // Handle POST - store lead
    if (req.method === 'POST') {
        try {
            // Validate table client
            if (!tableClient) {
                throw new Error('Table storage not configured - missing connection string');
            }

            // Get request body
            const leadData = req.body;
            context.log('Received lead data:', leadData);

            // Validate required fields
            if (!leadData || !leadData.name || !leadData.email || !leadData.phone) {
                context.res = {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        ...corsHeaders
                    },
                    body: JSON.stringify({
                        success: false,
                        error: 'Missing required fields: name, email, phone'
                    })
                };
                return;
            }

            // Ensure table exists
            await tableClient.createTable().catch(err => {
                if (err.statusCode !== 409) { // 409 = table already exists
                    throw err;
                }
            });

            // Create entity with unique row key
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substring(2, 9);
            const entity = {
                partitionKey: 'Leads',
                rowKey: `${timestamp}-${randomId}`,
                name: String(leadData.name || ''),
                email: String(leadData.email || ''),
                phone: String(leadData.phone || ''),
                service: String(leadData.service || 'not-specified'),
                budget: String(leadData.budget || 'not-specified'),
                message: String(leadData.message || ''),
                status: 'new',
                dateCreated: new Date().toISOString(),
                source: 'website-form'
            };

            context.log('Creating entity:', entity);

            // Store in table
            await tableClient.createEntity(entity);
            context.log('Entity created successfully');
            
            context.res = {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders
                },
                body: JSON.stringify({
                    success: true,
                    message: 'Lead stored successfully',
                    leadId: entity.rowKey,
                    timestamp: entity.dateCreated
                })
            };

        } catch (error) {
            context.log.error('Error processing POST request:', error);
            
            context.res = {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders
                },
                body: JSON.stringify({
                    success: false,
                    error: 'Internal server error',
                    details: error.message
                })
            };
        }
        return;
    }

    // Handle unsupported methods
    context.res = {
        status: 405,
        headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
        },
        body: JSON.stringify({
            success: false,
            error: `Method ${req.method} not allowed`
        })
    };
};

// This code is the one that was building correctly on 7/20for the Azure Functions HTTP trigger to handle lead storage
// It initializes the TableClient, handles CORS, and processes GET/POST requests


// // api/storeLeads/index.js (CORRECTED VERSION)
// const { app } = require('@azure/functions');
// const { TableClient } = require('@azure/data-tables');

// // Initialize with error handling
// let tableClient;
// try {
//     const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
//     if (!connectionString) {
//         console.error('AZURE_STORAGE_CONNECTION_STRING not found');
//     }
//     tableClient = TableClient.fromConnectionString(connectionString, 'leads');
// } catch (error) {
//     console.error('Failed to initialize table client:', error);
// }

// app.http('storeLeads', {
//     methods: ['GET', 'POST', 'OPTIONS'],
//     authLevel: 'anonymous',
//     handler: async (request, context) => {
//         context.log(`HTTP function processed request for URL "${request.url}"`);
//         context.log('Method:', request.method);

//         // CORS headers for all responses
//         const corsHeaders = {
//             'Access-Control-Allow-Origin': '*',
//             'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
//             'Access-Control-Allow-Headers': 'Content-Type, Authorization',
//             'Access-Control-Max-Age': '86400'
//         };

//         // Handle CORS preflight
//         if (request.method === 'OPTIONS') {
//             return {
//                 status: 200,
//                 headers: corsHeaders,
//                 body: ''
//             };
//         }

//         // Handle GET - test endpoint
//         if (request.method === 'GET') {
//             return {
//                 status: 200,
//                 headers: {
//                     'Content-Type': 'application/json',
//                     ...corsHeaders
//                 },
//                 jsonBody: {
//                     message: 'Integral Exterior Leads API is running',
//                     timestamp: new Date().toISOString(),
//                     hasConnectionString: !!process.env.AZURE_STORAGE_CONNECTION_STRING
//                 }
//             };
//         }

//         // Handle POST - store lead
//         if (request.method === 'POST') {
//             try {
//                 // Check connection string
//                 if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
//                     throw new Error('Azure Storage connection string not configured');
//                 }

//                 // Parse request body
//                 const leadData = await request.json();
//                 context.log('Received lead data:', leadData);

//                 // Validate required fields
//                 if (!leadData.name || !leadData.email || !leadData.phone) {
//                     return {
//                         status: 400,
//                         headers: {
//                             'Content-Type': 'application/json',
//                             ...corsHeaders
//                         },
//                         jsonBody: {
//                             success: false,
//                             error: 'Missing required fields: name, email, phone'
//                         }
//                     };
//                 }

//                 // Create table if it doesn't exist
//                 await tableClient.createTable().catch(err => {
//                     if (err.statusCode !== 409) { // 409 = already exists
//                         throw err;
//                     }
//                 });

//                 // Create entity
//                 const timestamp = Date.now();
//                 const entity = {
//                     partitionKey: 'Leads',
//                     rowKey: `${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
//                     name: leadData.name,
//                     email: leadData.email,
//                     phone: leadData.phone,
//                     service: leadData.service || 'not-specified',
//                     budget: leadData.budget || 'not-specified',
//                     message: leadData.message || '',
//                     status: 'new',
//                     dateCreated: new Date().toISOString(),
//                     source: 'website-form'
//                 };

//                 context.log('Storing entity:', entity);

//                 // Store in table
//                 await tableClient.createEntity(entity);
                
//                 return {
//                     status: 200,
//                     headers: {
//                         'Content-Type': 'application/json',
//                         ...corsHeaders
//                     },
//                     jsonBody: {
//                         success: true,
//                         message: 'Lead stored successfully',
//                         leadId: entity.rowKey
//                     }
//                 };

//             } catch (error) {
//                 context.log('Error processing POST request:', error);
                
//                 return {
//                     status: 500,
//                     headers: {
//                         'Content-Type': 'application/json',
//                         ...corsHeaders
//                     },
//                     jsonBody: {
//                         success: false,
//                         error: 'Internal server error',
//                         details: error.message
//                     }
//                 };
//             }
//         }

//         // Handle unsupported methods
//         return {
//             status: 405,
//             headers: {
//                 'Content-Type': 'application/json',
//                 ...corsHeaders
//             },
//             jsonBody: {
//                 success: false,
//                 error: 'Method not allowed'
//             }
//         };
//     }
// });