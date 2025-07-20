const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');

// Initialize Table Client
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const tableName = 'leads';

app.http('storeLeads', {
    methods: ['GET', 'POST', 'OPTIONS'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log(`HTTP function processed request for URL "${request.url}"`);

        // Handle CORS preflight requests
        if (request.method === 'OPTIONS') {
            return {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    'Access-Control-Max-Age': '86400'
                },
                body: ''
            };
        }

        // Handle GET request - return test response
        if (request.method === 'GET') {
            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                jsonBody: {
                    message: 'Integral Exterior Leads API is running',
                    timestamp: new Date().toISOString()
                }
            };
        }

        // Handle POST request - store lead data
        if (request.method === 'POST') {
            try {
                // Parse the request body
                const leadData = await request.json();
                context.log('Received lead data:', leadData);

                // Validate required fields
                const requiredFields = ['name', 'email', 'phone'];
                for (const field of requiredFields) {
                    if (!leadData[field]) {
                        return {
                            status: 400,
                            headers: {
                                'Content-Type': 'application/json',
                                'Access-Control-Allow-Origin': '*'
                            },
                            jsonBody: {
                                success: false,
                                error: `Missing required field: ${field}`
                            }
                        };
                    }
                }

                // Create table client
                const tableClient = new TableClient(connectionString, tableName);

                // Ensure table exists
                await tableClient.createTable().catch(err => {
                    if (err.statusCode !== 409) { // 409 = table already exists
                        throw err;
                    }
                });

                // Generate unique identifiers
                const timestamp = Date.now();
                const partitionKey = 'Leads';
                const rowKey = `${timestamp}-${Math.random().toString(36).substr(2, 9)}`;

                // Prepare entity for Table Storage
                const entity = {
                    partitionKey: partitionKey,
                    rowKey: rowKey,
                    name: leadData.name || '',
                    email: leadData.email || '',
                    phone: leadData.phone || '',
                    service: leadData.service || 'not-specified',
                    budget: leadData.budget || 'not-specified',
                    message: leadData.message || '',
                    status: 'new',
                    dateCreated: new Date().toISOString(),
                    source: 'website-form',
                    followUpRequired: true,
                    estimatedValue: getBudgetValue(leadData.budget),
                    priority: calculatePriority(leadData.service, leadData.budget)
                };

                context.log('Storing entity:', entity);

                // Store entity in table
                const result = await tableClient.createEntity(entity);
                context.log('Entity stored successfully:', result);

                // Return success response
                return {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    jsonBody: {
                        success: true,
                        message: 'Lead stored successfully',
                        leadId: rowKey,
                        timestamp: entity.dateCreated
                    }
                };

            } catch (error) {
                context.log('Error storing lead:', error);
                
                return {
                    status: 500,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
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
                'Access-Control-Allow-Origin': '*'
            },
            jsonBody: {
                success: false,
                error: 'Method not allowed'
            }
        };
    }
});

// Helper function to convert budget range to estimated value
function getBudgetValue(budget) {
    const budgetMap = {
        'under-1000': 500,
        '1000-5000': 3000,
        '5000-10000': 7500,
        '10000-25000': 17500,
        'over-25000': 30000
    };
    return budgetMap[budget] || 0;
}

// Helper function to calculate lead priority
function calculatePriority(service, budget) {
    const highValueServices = ['hardscaping', 'landscape-design', 'irrigation'];
    const highValueBudgets = ['10000-25000', 'over-25000'];
    
    if (highValueServices.includes(service) && highValueBudgets.includes(budget)) {
        return 'high';
    } else if (highValueServices.includes(service) || highValueBudgets.includes(budget)) {
        return 'medium';
    }
    return 'low';
}