// Integral Exterior Website JavaScript

// Initialize the website when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeWebsite();
});

// Main initialization function
function initializeWebsite() {
    setupMobileMenu();
    setupSmoothScrolling();
    setupContactForm();
    setupCRMSystem();
    setupAnimations();
    loadSampleData();
}

// Mobile Menu Setup
function setupMobileMenu() {
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (mobileToggle) {
        mobileToggle.addEventListener('click', function() {
            navLinks.classList.toggle('active');
            this.classList.toggle('active');
        });
    }
    
    // Close mobile menu when clicking on a link
    const navLinkItems = document.querySelectorAll('.nav-links a');
    navLinkItems.forEach(link => {
        link.addEventListener('click', function() {
            navLinks.classList.remove('active');
            mobileToggle.classList.remove('active');
        });
    });
}

// Smooth Scrolling Setup
function setupSmoothScrolling() {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                const headerOffset = 80;
                const elementPosition = targetElement.offsetTop;
                const offsetPosition = elementPosition - headerOffset;
                
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Contact Form Setup
async function setupContactForm() {
    const contactForm = document.getElementById('contactForm');
    
    if (contactForm) {
        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const leadData = {
                name: formData.get('name'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                service: formData.get('service'),
                budget: formData.get('budget'),
                message: formData.get('message')
            };
            
            try {
                const response = await fetch('https://red-grass-08edfac10.2.azurestaticapps.net/api/storeLeads', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(leadData)
                });
                
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                
                const result = await response.json();
                
                if (result.success) {
                    showNotification('Thank you! Your quote request has been submitted. We\'ll contact you soon!', 'success');
                    this.reset();
                } else {
                    showNotification('There was an error submitting your request. Please try again.', 'error');
                }
            } catch (error) {
                console.error('Error submitting form:', error);
                showNotification('There was an error submitting your request. Please try again.', 'error');
            }
        });
    }
}

// CRM System Setup
function setupCRMSystem() {
    // Initialize data structures
    if (!window.crmData) {
        window.crmData = {
            leads: [],
            customers: [],
            projects: []
        };
    }
}

// Tab switching functionality
function showTab(tabName) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active class from all buttons
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.classList.remove('active');
    });
    
    // Show selected tab content
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Add active class to clicked button
    const clickedButton = event.target;
    clickedButton.classList.add('active');
    
    // Display appropriate data
    switch(tabName) {
        case 'leads':
            displayLeads();
            break;
        case 'customers':
            displayCustomers();
            break;
        case 'projects':
            displayProjects();
            break;
    }
}

//Lead Management Functions
function addLead(leadData) {
    if (!window.crmData.leads) {
        window.crmData.leads = [];
    }
    window.crmData.leads.push(leadData);
    saveCRMData();
}

function displayLeads() {
    const leadsTableBody = document.getElementById('leadsTableBody');
    if (!leadsTableBody) return;
    
    const leads = window.crmData.leads || [];
    
    if (leads.length === 0) {
        leadsTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #666;">No leads found</td></tr>';
        return;
    }
    
    leadsTableBody.innerHTML = leads.map(lead => `
        <tr>
            <td>${lead.name}</td>
            <td>${lead.email}</td>
            <td>${lead.phone}</td>
            <td>${formatService(lead.service)}</td>
            <td>${formatBudget(lead.budget)}</td>
            <td><span class="status-badge status-${lead.status}">${lead.status}</span></td>
            <td>${lead.date}</td>
        </tr>
    `).join('');
}

function displayCustomers() {
    const customersTableBody = document.getElementById('customersTableBody');
    if (!customersTableBody) return;
    
    const customers = window.crmData.customers || [];
    
    if (customers.length === 0) {
        customersTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #666;">No customers found</td></tr>';
        return;
    }
    
    customersTableBody.innerHTML = customers.map(customer => `
        <tr>
            <td>${customer.name}</td>
            <td>${customer.email}</td>
            <td>${customer.phone}</td>
            <td>${customer.address}</td>
            <td>${customer.totalProjects}</td>
            <td>$${customer.totalValue.toLocaleString()}</td>
            <td>${customer.lastService}</td>
        </tr>
    `).join('');
}

function displayProjects() {
    const projectsTableBody = document.getElementById('projectsTableBody');
    if (!projectsTableBody) return;
    
    const projects = window.crmData.projects || [];
    
    if (projects.length === 0) {
        projectsTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #666;">No projects found</td></tr>';
        return;
    }
    
    projectsTableBody.innerHTML = projects.map(project => `
        <tr>
            <td>${project.name}</td>
            <td>${project.customer}</td>
            <td>${formatService(project.serviceType)}</td>
            <td>$${project.value.toLocaleString()}</td>
            <td><span class="status-badge status-${project.status}">${project.status}</span></td>
            <td>${project.startDate}</td>
            <td>${project.completion}%</td>
        </tr>
    `).join('');
}

// Utility Functions
function formatService(service) {
    if (!service) return 'Not specified';
    
    const serviceMap = {
        'landscape-design': 'Landscape Design',
        'lawn-maintenance': 'Lawn Maintenance',
        'hardscaping': 'Hardscaping',
        'irrigation': 'Irrigation Systems',
        'tree-services': 'Tree Services',
        'plant-installation': 'Plant Installation'
    };
    
    return serviceMap[service] || service;
}

function formatBudget(budget) {
    if (!budget) return 'Not specified';
    
    const budgetMap = {
        'under-1000': 'Under $1,000',
        '1000-5000': '$1,000 - $5,000',
        '5000-10000': '$5,000 - $10,000',
        '10000-25000': '$10,000 - $25,000',
        'over-25000': 'Over $25,000'
    };
    
    return budgetMap[budget] || budget;
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${type === 'success' ? '✓' : 'ℹ'}</span>
            <span class="notification-message">${message}</span>
            <button class="notification-close">&times;</button>
        </div>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4CAF50' : '#2196F3'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 1000;
        animation: slideInRight 0.3s ease-out;
        max-width: 400px;
    `;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Add close functionality
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.remove();
    });
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// Animation Setup
function setupAnimations() {
    // Intersection Observer for scroll animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'fadeInUp 0.6s ease-out forwards';
            }
        });
    }, observerOptions);
    
    // Observe service cards
    const serviceCards = document.querySelectorAll('.service-card');
    serviceCards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        observer.observe(card);
    });
}

// Data Management
function saveCRMData() {
    // In a real application, this would save to a database
    // For now, we'll keep it in memory
    console.log('CRM data saved:', window.crmData);
}

function loadSampleData() {
    // Load sample data for demonstration
    window.crmData = {
        leads: [
            {
                id: 1,
                name: 'John Smith',
                email: 'john.smith@email.com',
                phone: '(281) 555-0101',
                service: 'landscape-design',
                budget: '5000-10000',
                message: 'Looking for a complete backyard redesign',
                status: 'new',
                date: '2024-01-15'
            },
            {
                id: 2,
                name: 'Sarah Johnson',
                email: 'sarah.j@email.com',
                phone: '(281) 555-0102',
                service: 'lawn-maintenance',
                budget: '1000-5000',
                message: 'Need regular lawn care service',
                status: 'contacted',
                date: '2024-01-14'
            },
            {
                id: 3,
                name: 'Mike Davis',
                email: 'mike.davis@email.com',
                phone: '(281) 555-0103',
                service: 'hardscaping',
                budget: '10000-25000',
                message: 'Want to add a patio and fire pit',
                status: 'quoted',
                date: '2024-01-13'
            }
        ],
        customers: [
            {
                id: 1,
                name: 'Robert Wilson',
                email: 'robert.wilson@email.com',
                phone: '(281) 555-0201',
                address: '123 Oak Street, Spring, TX',
                totalProjects: 3,
                totalValue: 15000,
                lastService: '2024-01-10'
            },
            {
                id: 2,
                name: 'Lisa Chen',
                email: 'lisa.chen@email.com',
                phone: '(281) 555-0202',
                address: '456 Pine Avenue, Spring, TX',
                totalProjects: 2,
                totalValue: 8500,
                lastService: '2024-01-08'
            },
            {
                id: 3,
                name: 'David Brown',
                email: 'david.brown@email.com',
                phone: '(281) 555-0203',
                address: '789 Maple Drive, Spring, TX',
                totalProjects: 1,
                totalValue: 12000,
                lastService: '2024-01-05'
            }
        ],
        projects: [
            {
                id: 1,
                name: 'Wilson Backyard Renovation',
                customer: 'Robert Wilson',
                serviceType: 'landscape-design',
                value: 8500,
                status: 'completed',
                startDate: '2023-12-01',
                completion: 100
            },
            {
                id: 2,
                name: 'Chen Garden Installation',
                customer: 'Lisa Chen',
                serviceType: 'plant-installation',
                value: 3200,
                status: 'inprogress',
                startDate: '2024-01-05',
                completion: 75
            },
            {
                id: 3,
                name: 'Brown Patio Construction',
                customer: 'David Brown',
                serviceType: 'hardscaping',
                value: 12000,
                status: 'inprogress',
                startDate: '2024-01-10',
                completion: 45
            }
        ]
    };
    
    // Display initial data
    displayLeads();
}

// Additional CSS for notifications (injected via JavaScript)
const notificationStyles = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    
    .notification-close {
        background: none;
        border: none;
        color: white;
        font-size: 1.2rem;
        cursor: pointer;
        margin-left: auto;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .notification-close:hover {
        opacity: 0.8;
    }
`;

// Inject notification styles
const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);

// Expose functions globally for HTML onclick handlers
window.showTab = showTab;

// Additional utility functions
function generateReport() {
    const leads = window.crmData.leads || [];
    const customers = window.crmData.customers || [];
    const projects = window.crmData.projects || [];
    
    const report = {
        totalLeads: leads.length,
        totalCustomers: customers.length,
        totalProjects: projects.length,
        totalRevenue: projects.reduce((sum, project) => sum + project.value, 0),
        avgProjectValue: projects.length > 0 ? projects.reduce((sum, project) => sum + project.value, 0) / projects.length : 0,
        leadsByStatus: {
            new: leads.filter(l => l.status === 'new').length,
            contacted: leads.filter(l => l.status === 'contacted').length,
            quoted: leads.filter(l => l.status === 'quoted').length,
            closed: leads.filter(l => l.status === 'closed').length
        },
        projectsByStatus: {
            inprogress: projects.filter(p => p.status === 'inprogress').length,
            completed: projects.filter(p => p.status === 'completed').length
        }
    };
    
    console.log('Business Report:', report);
    return report;
}

// Export for potential use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        showTab,
        generateReport,
        addLead,
        displayLeads,
        displayCustomers,
        displayProjects
    };
}