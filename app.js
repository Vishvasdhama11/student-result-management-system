/* ========================================
   FINACER - Main Application Logic
   Dashboard, Customer Management & Calculations
   ======================================== */

// ========================================
// STATE MANAGEMENT
// ========================================
let currentUser = null;
let allCustomers = [];
let filteredCustomers = [];
let editingCustomerId = null;
let unsubscribeCustomers = null;

function isFileProtocol() {
    return window.location.protocol === 'file:';
}

function showLocalServerWarning() {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:9998;pointer-events:auto;';

    const warning = document.createElement('div');
    warning.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);max-width:760px;width:calc(100% - 40px);padding:22px 24px;background:#1f2937;border:1px solid #ef4444;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.35);color:#f9fafb;font-size:0.95rem;line-height:1.6;z-index:9999;text-align:left;';
    warning.innerHTML = `
        <strong style="display:block;font-size:1.05rem;margin-bottom:10px;color:#fecaca;">Local file protocol detected</strong>
        This application should be opened from a local web server, not directly via <code>file://</code>. Browsers treat <code>file:</code> URLs as unique security origins, which can break Firebase Authentication, Firestore, and native date-picker behavior.
        <div style="margin-top:14px;font-weight:600;">Use one of these options:</div>
        <ul style="margin:10px 0 0 18px;padding:0;list-style:disc;color:#d1d5db;">
            <li><code>npx http-server .</code> (from the project root)</li>
            <li>VS Code Live Server extension</li>
        </ul>
        <div style="margin-top:12px;color:#fef3c7;">Then open the app at the local server address shown in the terminal.</div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(warning);
}

// ========================================
// INITIALIZATION
// ========================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initializeApp();
        setupEventListeners();
        startClock();
    });
} else {
    initializeApp();
    setupEventListeners();
    startClock();
}

// Initialize app and check authentication
async function initializeApp() {
    if (isFileProtocol()) {
        showLocalServerWarning();
        return;
    }

    if (!auth || typeof auth.onAuthStateChanged !== 'function') {
        console.error('Firebase Auth is not initialized. Check assets/js/firebase.js for valid configuration and ensure Firebase scripts load successfully.');
        return;
    }

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            console.log('User authenticated:', user.email);
            
            // Update user info display
            document.getElementById('userInfo').textContent = `👤 ${user.email}`;
            
            if (document.getElementById('dashboard')) {
                subscribeCustomerChanges(currentUser.uid);
            }
        } else {
            // Only redirect to login from protected dashboard pages
            if (document.getElementById('dashboard')) {
                window.location.href = 'index.html';
            }

            if (unsubscribeCustomers) {
                unsubscribeCustomers();
                unsubscribeCustomers = null;
            }
        }
    });
}

function subscribeCustomerChanges(uid) {
    if (unsubscribeCustomers) {
        unsubscribeCustomers();
        unsubscribeCustomers = null;
    }

    unsubscribeCustomers = db.collection('customers')
        .where('userId', '==', uid)
        .onSnapshot((snapshot) => {
            const customers = [];
            snapshot.forEach((doc) => {
                customers.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            customers.sort((a, b) => {
                const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
                const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
                return bTime - aTime;
            });

            allCustomers = customers;
            filteredCustomers = allCustomers;
            updateCustomersDisplay();
            updateDashboardStats();
            updateRecentCustomers();
        }, (error) => {
            console.error('Realtime customer listener error:', error);
        });
}

// Setup all event listeners
function setupEventListeners() {
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Add customer form
    const addCustomerForm = document.getElementById('addCustomerForm');
    if (addCustomerForm) {
        addCustomerForm.addEventListener('submit', handleAddCustomer);
        
        // Real-time calculation preview
        document.getElementById('principalAmount')?.addEventListener('input', updatePreview);
        document.getElementById('interestPercentage')?.addEventListener('input', updatePreview);
        document.getElementById('startDate')?.addEventListener('change', updatePreview);
        document.getElementById('interestType')?.addEventListener('change', updatePreview);
        document.getElementById('paymentAmount')?.addEventListener('input', (event) => {
            const value = event.target.value;
            event.target.value = value.replace(/[^0-9]/g, '');
        });
        document.getElementById('customerPhone')?.addEventListener('input', (event) => {
            event.target.value = event.target.value.replace(/[^0-9]/g, '');
        });
    }

    const editCustomerForm = document.getElementById('editCustomerForm');
    if (editCustomerForm) {
        editCustomerForm.addEventListener('submit', handleEditCustomer);
    }

    document.getElementById('editPhoneNumber')?.addEventListener('input', (event) => {
        event.target.value = event.target.value.replace(/[^0-9]/g, '');
    });

    // Search functionality
    const customerSearch = document.getElementById('customerSearch');
    if (customerSearch) {
        customerSearch.addEventListener('input', searchCustomers);
    }

    const globalSearch = document.getElementById('globalSearch');
    if (globalSearch) {
        globalSearch.addEventListener('input', handleGlobalSearch);
    }

    // Date picker helper only on a real user gesture
    document.querySelectorAll('input[type="date"]').forEach((input) => {
        input.addEventListener('pointerdown', (event) => {
            if (event.isTrusted && typeof input.showPicker === 'function') {
                try {
                    input.showPicker();
                } catch (error) {
                    console.warn('Date picker showPicker() not available in this browser:', error);
                }
            }
        });
    });
}

// ========================================
// AUTHENTICATION HANDLERS
// ========================================

// Handle user logout
async function handleLogout() {
    try {
        await auth.signOut();
        console.log('User logged out successfully');
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
        alert('Failed to logout. Please try again.');
    }
}

// ========================================
// CUSTOMER MANAGEMENT
// ========================================

// Load all customers from Firestore
async function loadCustomers() {
    try {
        const querySnapshot = await db
            .collection('customers')
            .where('userId', '==', currentUser.uid)
            .get();

        allCustomers = [];
        querySnapshot.forEach((doc) => {
            allCustomers.push({
                id: doc.id,
                ...doc.data()
            });
        });

        allCustomers.sort((a, b) => {
            const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
            const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
            return bTime - aTime;
        });

        filteredCustomers = allCustomers;
        console.log('Loaded customers:', allCustomers.length);
        
        // Update UI
        updateCustomersDisplay();
        updateDashboardStats();
        updateRecentCustomers();

    } catch (error) {
        console.error('Error loading customers:', error);
        if (error.code === 'permission-denied') {
            console.warn('Permission denied. Check Firestore security rules.');
        }
    }
}

// Handle adding a new customer
async function handleAddCustomer(e) {
    e.preventDefault();
    clearFormErrors('add');

    const name = document.getElementById('customerName').value.trim();
    const startDate = document.getElementById('startDate').value;
    const phoneNumber = document.getElementById('customerPhone').value.trim().replace(/[^0-9]/g, '');
    const principal = parseFloat(document.getElementById('principalAmount').value);
    const guarantor = document.getElementById('guarantorName')?.value.trim() || 'Not set';
    const interestPercentage = parseFloat(document.getElementById('interestPercentage').value);
    const interestType = document.getElementById('interestType').value;
    const status = document.getElementById('customerStatus')?.value || 'Active';
    const tags = parseTags(document.getElementById('customerTags')?.value || '');

    // Validation
    if (!name) {
        document.getElementById('nameError').textContent = 'Customer name is required.';
        return;
    }
    if (!startDate) {
        document.getElementById('dateError').textContent = 'Start date is required.';
        return;
    }
    if (phoneNumber && !/^[0-9]{6,20}$/.test(phoneNumber)) {
        document.getElementById('phoneError').textContent = 'Enter a valid phone number using only digits.';
        return;
    }
    if (principal <= 0) {
        document.getElementById('principalError').textContent = 'Principal amount must be greater than 0.';
        return;
    }
    if (interestPercentage < 0) {
        document.getElementById('interestError').textContent = 'Interest percentage must be non-negative.';
        return;
    }
    if (!interestType) {
        document.getElementById('typeError').textContent = 'Interest type is required.';
        return;
    }

    if (!status) {
        document.getElementById('statusError').textContent = 'Status is required.';
        return;
    }

    try {
        const customerData = {
            name,
            startDate,
            phoneNumber,
            principal,
            guarantor,
            interestPercentage,
            interestType,
            status,
            tags,
            payments: [],
            userId: currentUser.uid,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const docRef = await db.collection('customers').add(customerData);
        
        console.log('Customer added:', docRef.id);
        
        // Reset form and show success
        document.getElementById('addCustomerForm').reset();
        const baseMessage = `✅ ₹${principal.toFixed(2)} @ ${interestPercentage.toFixed(2)}% (${interestType}) started from ${formatDate(startDate)}.`;
        const notificationText = phoneNumber ? ` Text notification prepared for ${phoneNumber}.` : ' No phone number was provided.';
        document.getElementById('formSuccess').textContent = baseMessage + notificationText;
        document.getElementById('formSuccess').classList.add('show');
        document.getElementById('previewSection').style.display = 'none';
        
        // Reload customers
        await loadCustomers();
        
        // Clear success message after 3 seconds
        setTimeout(() => {
            document.getElementById('formSuccess').classList.remove('show');
        }, 3000);

    } catch (error) {
        console.error('Error adding customer:', error);
        document.getElementById('formError').textContent = '❌ Failed to add customer. Please try again.';
    }
}

// Handle editing a customer
async function handleEditCustomer(e) {
    e.preventDefault();

    const customerId = document.getElementById('editCustomerId').value;
    const name = document.getElementById('editCustomerName').value.trim();
    const startDate = document.getElementById('editStartDate').value;
    const phoneNumber = document.getElementById('editPhoneNumber').value.trim().replace(/[^0-9]/g, '');
    const principal = parseFloat(document.getElementById('editPrincipalAmount').value);
    const guarantor = document.getElementById('editGuarantorName')?.value.trim() || 'Not set';
    const interestPercentage = parseFloat(document.getElementById('editInterestPercentage').value);
    const interestType = document.getElementById('editInterestType').value;
    const status = document.getElementById('editStatus')?.value || 'Active';
    const tags = parseTags(document.getElementById('editTags')?.value || '');

    if (phoneNumber && !/^[0-9]{6,20}$/.test(phoneNumber)) {
        alert('Enter a valid phone number using only digits.');
        return;
    }

    try {
        await db.collection('customers').doc(customerId).update({
            name,
            startDate,
            phoneNumber,
            principal,
            guarantor,
            interestPercentage,
            interestType,
            status,
            tags,
            updatedAt: new Date()
        });

        console.log('Customer updated:', customerId);
        closeEditModal();
        await loadCustomers();

    } catch (error) {
        console.error('Error updating customer:', error);
        alert('Failed to update customer. Please try again.');
    }
}

// Delete a customer
async function deleteCustomer(customerId) {
    if (!confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
        return;
    }

    try {
        await db.collection('customers').doc(customerId).delete();
        console.log('Customer deleted:', customerId);
        await loadCustomers();
    } catch (error) {
        console.error('Error deleting customer:', error);
        alert('Failed to delete customer. Please try again.');
    }
}

// ========================================
// CALCULATIONS
// ========================================

// Calculate interest and amount for a customer
function calculateCustomerMetrics(customer) {
    const startDate = new Date(customer.startDate);
    const today = new Date();
    
    // Calculate days passed
    const daysPassed = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
    
    // Ensure days is not negative
    const validDays = Math.max(0, daysPassed);

    // Calculate daily interest rate
    let dailyInterestRate;
    if (customer.interestType === 'monthly') {
        // Monthly: interestPercentage is a per-month rate, so divide by 30 days.
        dailyInterestRate = customer.interestPercentage / 30;
    } else {
        // Yearly: interestPercentage is a per-year rate, so divide by 365 days.
        dailyInterestRate = customer.interestPercentage / 365;
    }

    // Calculate daily interest amount
    const dailyInterest = (customer.principal * dailyInterestRate) / 100;

    // Calculate total interest
    const totalInterest = dailyInterest * validDays;

    // Calculate payments and balance
    const payments = Array.isArray(customer.payments) ? customer.payments : [];
    const totalPaid = payments.reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
    const balanceDue = Math.max(0, (customer.principal + totalInterest) - totalPaid);

    // Calculate final amount
    const finalAmount = customer.principal + totalInterest;

    const periodInterest = (customer.principal * customer.interestPercentage) / 100;
    const interestCycle = customer.interestType === 'monthly' ? 'Per Month' : 'Per Year';

    return {
        daysPassed: validDays,
        dailyInterest,
        totalInterest,
        finalAmount,
        periodInterest,
        interestCycle,
        totalPaid,
        balanceDue
    };
}

function parseTags(tagString) {
    return tagString
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean);
}

function renderPaymentHistory(customer) {
    const paymentList = document.getElementById('paymentHistoryList');
    if (!paymentList) return;

    const payments = Array.isArray(customer.payments) ? customer.payments : [];
    if (payments.length === 0) {
        paymentList.innerHTML = '<p class="empty-state">No payments recorded yet.</p>';
        return;
    }

    paymentList.innerHTML = payments.map(payment => {
        const paymentDate = payment.date ? formatDate(payment.date) : 'Unknown';
        const note = payment.note ? ` — ${payment.note}` : '';
        return `
            <div class="payment-record">
                <span><strong>${paymentDate}</strong></span>
                <span>₹${parseFloat(payment.amount).toFixed(2)}${note}</span>
                <button type="button" class="btn btn-sm btn-danger" onclick="deletePayment('${customer.id}','${payment.id}')">🗑️</button>
            </div>
        `;
    }).join('');
}

async function addPaymentToCustomer() {
    const customerId = document.getElementById('editCustomerId')?.value;
    const paymentDateInput = document.getElementById('paymentDate');
    const paymentAmountInput = document.getElementById('paymentAmount');
    const paymentNoteInput = document.getElementById('paymentNote');
    const successMessage = document.getElementById('paymentSuccess');
    const errorMessage = document.getElementById('paymentError');

    if (!customerId) return;
    const date = paymentDateInput?.value || new Date().toISOString().split('T')[0];
    const amount = parseFloat(paymentAmountInput?.value);
    const note = paymentNoteInput?.value.trim() || '';

    errorMessage.textContent = '';
    successMessage.textContent = '';

    if (!amount || amount <= 0) {
        errorMessage.textContent = 'Enter a valid payment amount.';
        return;
    }

    try {
        const customer = allCustomers.find(c => c.id === customerId);
        if (!customer) {
            errorMessage.textContent = 'Customer not found.';
            return;
        }

        const payments = Array.isArray(customer.payments) ? [...customer.payments] : [];
        const paymentId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        payments.push({ id: paymentId, date, amount, note });

        await db.collection('customers').doc(customerId).update({
            payments,
            updatedAt: new Date()
        });

        paymentDateInput.value = '';
        paymentAmountInput.value = '';
        paymentNoteInput.value = '';
        successMessage.textContent = 'Payment added successfully.';

        renderPaymentHistory({ ...customer, payments });
        await loadCustomers();

        setTimeout(() => {
            successMessage.textContent = '';
        }, 3000);
    } catch (error) {
        console.error('Error adding payment:', error);
        errorMessage.textContent = 'Failed to add payment. Please try again.';
    }
}

async function deletePayment(customerId, paymentId) {
    if (!customerId || !paymentId) return;
    if (!confirm('Delete this payment entry from history?')) return;

    try {
        const customer = allCustomers.find(c => c.id === customerId);
        if (!customer) return;

        const payments = (Array.isArray(customer.payments) ? customer.payments : []).filter(payment => payment.id !== paymentId);
        await db.collection('customers').doc(customerId).update({ payments, updatedAt: new Date() });

        renderPaymentHistory({ ...customer, payments });
        await loadCustomers();
    } catch (error) {
        console.error('Error deleting payment:', error);
        alert('Unable to delete payment. Please try again.');
    }
}

function exportPaymentHistoryCSV(customerId) {
    if (!customerId) return;
    const customer = allCustomers.find(c => c.id === customerId);
    if (!customer) return;

    const payments = Array.isArray(customer.payments) ? customer.payments : [];
    if (payments.length === 0) {
        alert('No payments available to export.');
        return;
    }

    const headers = ['Date', 'Amount', 'Note'];
    const rows = payments.map(payment => [
        payment.date ? formatDate(payment.date) : '',
        payment.amount.toFixed ? payment.amount.toFixed(2) : parseFloat(payment.amount).toFixed(2),
        payment.note || ''
    ]);

    const csvContent = [headers, ...rows]
        .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `payment-history-${customer.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function exportCustomerCSV() {
    const headers = [
        'Name', 'Phone', 'Date', 'Principal', 'Interest %', 'Type', 'Status', 'Tags', 'Guarantor', 'Days', 'Total Interest', 'Final Amount', 'Total Paid', 'Balance Due'
    ];

    const rows = filteredCustomers.map(customer => {
        const metrics = calculateCustomerMetrics(customer);
        return [
            customer.name,
            customer.phoneNumber || '',
            formatDate(customer.startDate),
            customer.principal.toFixed(2),
            customer.interestPercentage.toFixed(2),
            customer.interestType === 'monthly' ? 'Per Month' : 'Per Year',
            customer.status || 'Active',
            (customer.tags || []).join(' | '),
            customer.guarantor || '',
            metrics.daysPassed,
            metrics.totalInterest.toFixed(2),
            metrics.finalAmount.toFixed(2),
            metrics.totalPaid.toFixed(2),
            metrics.balanceDue.toFixed(2)
        ];
    });

    const csvContent = [headers, ...rows].map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'customers-report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function downloadSummaryReport() {
    const stats = {
        totalCustomers: filteredCustomers.length,
        totalPrincipal: 0,
        totalInterest: 0,
        totalAmount: 0,
        totalPaid: 0,
        totalBalance: 0
    };

    filteredCustomers.forEach(customer => {
        const metrics = calculateCustomerMetrics(customer);
        stats.totalPrincipal += customer.principal;
        stats.totalInterest += metrics.totalInterest;
        stats.totalAmount += metrics.finalAmount;
        stats.totalPaid += metrics.totalPaid;
        stats.totalBalance += metrics.balanceDue;
    });

    const lines = [
        'Finacer Summary Report',
        `Date: ${new Date().toLocaleString()}`,
        '',
        `Total Customers: ${stats.totalCustomers}`,
        `Total Principal: ₹${stats.totalPrincipal.toFixed(2)}`,
        `Total Interest: ₹${stats.totalInterest.toFixed(2)}`,
        `Total Amount: ₹${stats.totalAmount.toFixed(2)}`,
        `Total Paid: ₹${stats.totalPaid.toFixed(2)}`,
        `Total Balance Due: ₹${stats.totalBalance.toFixed(2)}`,
        '',
        'Customers included in this report:',
        ...filteredCustomers.map(customer => `- ${customer.name} (${customer.status || 'Active'})`)
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'finacer-summary-report.txt');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Update calculation preview in real-time
function updatePreview() {
    const principal = parseFloat(document.getElementById('principalAmount').value) || 0;
    const interestPercentage = parseFloat(document.getElementById('interestPercentage').value) || 0;
    const startDate = document.getElementById('startDate').value;
    const interestType = document.getElementById('interestType').value;

    if (!startDate || principal <= 0 || interestPercentage < 0 || !interestType) {
        document.getElementById('previewSection').style.display = 'none';
        return;
    }

    const customer = {
        startDate,
        principal,
        interestPercentage,
        interestType
    };

    const metrics = calculateCustomerMetrics(customer);

    // Show preview
    document.getElementById('previewSection').style.display = 'block';
    document.getElementById('previewDays').textContent = metrics.daysPassed;
    document.getElementById('previewDailyInterest').textContent = metrics.dailyInterest.toFixed(2);
    document.getElementById('previewTotalInterest').textContent = metrics.totalInterest.toFixed(2);
    document.getElementById('previewFinalAmount').textContent = metrics.finalAmount.toFixed(2);
    document.getElementById('previewCycleLabel').textContent = metrics.interestCycle === 'Per Month' ? 'Monthly Interest' : 'Yearly Interest';
    document.getElementById('previewCycleInterest').textContent = metrics.periodInterest.toFixed(2);
}

// ========================================
// UI UPDATES & DISPLAYS
// ========================================

// Update dashboard statistics
function updateDashboardStats() {
    const stats = {
        totalCustomers: allCustomers.length,
        totalPrincipal: 0,
        totalInterest: 0,
        totalAmount: 0
    };

    allCustomers.forEach(customer => {
        stats.totalPrincipal += customer.principal;
        const metrics = calculateCustomerMetrics(customer);
        stats.totalInterest += metrics.totalInterest;
        stats.totalAmount += metrics.finalAmount;
    });

    // Update dashboard cards
    document.getElementById('totalCustomers').textContent = stats.totalCustomers;
    document.getElementById('totalPrincipal').textContent = `₹${stats.totalPrincipal.toFixed(2)}`;
    document.getElementById('totalInterest').textContent = `₹${stats.totalInterest.toFixed(2)}`;
    document.getElementById('totalAmount').textContent = `₹${stats.totalAmount.toFixed(2)}`;
}

// Update customers display in table
function updateCustomersDisplay() {
    const tableBody = document.getElementById('customersTableBody');
    
    if (filteredCustomers.length === 0) {
        tableBody.innerHTML = `
            <tr class="empty-row">
                <td colspan="11" class="empty-state">No customers found. Start by adding a customer!</td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = filteredCustomers.map(customer => {
        const metrics = calculateCustomerMetrics(customer);
        const tagText = (customer.tags || []).join(', ');
        
        return `
            <tr>
                <td data-label="Name">
                    <strong>${customer.name}</strong>
                </td>
                <td data-label="Phone">${customer.phoneNumber || 'N/A'}</td>
                <td data-label="Date">${formatDate(customer.startDate)}</td>
                <td data-label="Principal">₹${customer.principal.toFixed(2)}</td>
                <td data-label="Interest %">${customer.interestPercentage.toFixed(2)}%</td>
                <td data-label="Type">${customer.interestType === 'monthly' ? 'Per Month' : 'Per Year'}</td>
                <td data-label="Status">${customer.status || 'Active'}</td>
                <td data-label="Tags">${tagText || 'None'}</td>
                <td data-label="Guarantor">${customer.guarantor || 'N/A'}</td>
                <td data-label="Days">${metrics.daysPassed}</td>
                <td data-label="Total Interest">₹${metrics.totalInterest.toFixed(2)}</td>
                <td data-label="Final Amount"><strong>₹${metrics.finalAmount.toFixed(2)}</strong></td>
                <td data-label="Actions">
                    <div class="action-buttons">
                        <button class="btn btn-sm" onclick="openEditModal('${customer.id}')">✏️ Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteCustomer('${customer.id}')">🗑️ Delete</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Update recent customers preview on dashboard
function updateRecentCustomers() {
    const container = document.getElementById('recentCustomersContainer');
    const recentList = allCustomers.slice(0, 3);

    if (recentList.length === 0) {
        container.innerHTML = '<p class="empty-state">No customers yet. Add one to get started!</p>';
        return;
    }

    container.innerHTML = recentList.map(customer => {
        const metrics = calculateCustomerMetrics(customer);
        
        return `
            <div class="customer-card">
                <div class="customer-card-name">${customer.name}</div>
                <div class="customer-card-info">
                    <span>
                        📅 Date
                        <strong>${formatDate(customer.startDate)}</strong>
                    </span>
                    <span>
                        🤝 Guarantor
                        <strong>${customer.guarantor || 'N/A'}</strong>
                    </span>
                </div>
                <div class="customer-card-info">
                    <span>
                        📊 Days
                        <strong>${metrics.daysPassed}</strong>
                    </span>
                </div>
                <div class="customer-card-amount">
                    <div class="card-amount-item">
                        <span>Principal</span>
                        <strong>₹${customer.principal.toFixed(2)}</strong>
                    </div>
                    <div class="card-amount-item">
                        <span>Interest</span>
                        <strong>₹${metrics.totalInterest.toFixed(2)}</strong>
                    </div>
                </div>
                <div class="customer-card-info">
                    <span>
                        💰 Final Amount
                        <strong>₹${metrics.finalAmount.toFixed(2)}</strong>
                    </span>
                </div>
                <div class="card-actions">
                    <button class="btn btn-sm" onclick="openEditModal('${customer.id}')">✏️ Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteCustomer('${customer.id}')">🗑️ Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

// ========================================
// SEARCH & FILTER
// ========================================

// Search customers in table
function searchCustomers(e) {
    const searchTerm = e.target.value.toLowerCase();

    if (!searchTerm) {
        filteredCustomers = allCustomers;
    } else {
        filteredCustomers = allCustomers.filter(customer => {
            const name = customer.name?.toLowerCase() || '';
            const phone = customer.phoneNumber?.toLowerCase() || '';
            const guarantor = customer.guarantor?.toLowerCase() || '';
            const status = customer.status?.toLowerCase() || '';
            const tags = (customer.tags || []).join(', ').toLowerCase();
            const interestType = customer.interestType?.toLowerCase() || '';
            return name.includes(searchTerm) || phone.includes(searchTerm) || guarantor.includes(searchTerm) || status.includes(searchTerm) || tags.includes(searchTerm) || interestType.includes(searchTerm);
        });
    }

    updateCustomersDisplay();
}

// Global search across all sections
function handleGlobalSearch(e) {
    const searchTerm = e.target.value.toLowerCase();

    if (!searchTerm) {
        filteredCustomers = allCustomers;
    } else {
        filteredCustomers = allCustomers.filter(customer => {
            const name = customer.name?.toLowerCase() || '';
            const phone = customer.phoneNumber?.toLowerCase() || '';
            const guarantor = customer.guarantor?.toLowerCase() || '';
            const status = customer.status?.toLowerCase() || '';
            const tags = (customer.tags || []).join(', ').toLowerCase();
            const interestType = customer.interestType?.toLowerCase() || '';
            return name.includes(searchTerm) || phone.includes(searchTerm) || guarantor.includes(searchTerm) || status.includes(searchTerm) || tags.includes(searchTerm) || interestType.includes(searchTerm);
        });
    }

    showSection('customers', null, { skipReload: true });

    // Update all displays
    updateCustomersDisplay();
    updateRecentCustomers();
}

// ========================================
// MODAL HANDLERS
// ========================================

// Open edit modal
async function openEditModal(customerId) {
    editingCustomerId = customerId;
    const customer = allCustomers.find(c => c.id === customerId);

    if (!customer) return;

    document.getElementById('editCustomerId').value = customer.id;
    document.getElementById('editCustomerName').value = customer.name;
    document.getElementById('editStartDate').value = customer.startDate;
    document.getElementById('editPhoneNumber').value = customer.phoneNumber || '';
    document.getElementById('editPrincipalAmount').value = customer.principal;
    document.getElementById('editGuarantorName').value = customer.guarantor || '';
    document.getElementById('editInterestPercentage').value = customer.interestPercentage;
    document.getElementById('editInterestType').value = customer.interestType;
    document.getElementById('editStatus').value = customer.status || 'Active';
    document.getElementById('editTags').value = (customer.tags || []).join(', ');

    renderPaymentHistory(customer);
    document.getElementById('paymentSuccess').textContent = '';
    document.getElementById('paymentError').textContent = '';
    document.getElementById('editModal')?.classList.add('show');
}

// Close edit modal
function closeEditModal() {
    document.getElementById('editModal').classList.remove('show');
    editingCustomerId = null;
}

// Close modal on outside click
document.addEventListener('click', (e) => {
    const modal = document.getElementById('editModal');
    if (e.target === modal) {
        closeEditModal();
    }
});

document.addEventListener('click', (e) => {
    const sidebar = document.querySelector('.sidebar');
    const toggleBtn = document.querySelector('.mobile-menu-toggle');
    if (!sidebar?.classList.contains('active')) return;
    if (window.innerWidth > 768) return;
    if (sidebar.contains(e.target) || toggleBtn?.contains(e.target)) return;
    sidebar.classList.remove('active');
    document.body.classList.remove('sidebar-open');
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelector('.sidebar')?.classList.remove('active');
        document.body.classList.remove('sidebar-open');
    }
});

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    const isActive = !sidebar.classList.contains('active');
    sidebar.classList.toggle('active');
    document.body.classList.toggle('sidebar-open', isActive);
}

// Show specific section
function showSection(sectionName, event, options = {}) {
    const { skipReload = false } = options;

    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    // Remove active class from nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // Show selected section
    const section = document.getElementById(sectionName);
    if (section) {
        section.classList.add('active');
    }

    // Add active class to nav item
    const navItem = event?.target?.closest('.nav-item') || document.querySelector(`.nav-item[data-section="${sectionName}"]`);
    if (navItem) {
        navItem.classList.add('active');
    }

    // Close mobile sidebar after navigation
    if (window.innerWidth <= 768) {
        document.querySelector('.sidebar')?.classList.remove('active');
        document.body.classList.remove('sidebar-open');
    }

    // Update header subtitle
    const subtitles = {
        'dashboard': 'Manage your finances efficiently',
        'customers': 'View and manage all customers',
        'add-customer': 'Add a new customer to your portfolio'
    };

    document.getElementById('headerSubtitle').textContent = subtitles[sectionName] || 'Welcome to Finacer';

    // Reload customers data when switching sections, unless explicitly skipped
    if (!skipReload && (sectionName === 'customers' || sectionName === 'dashboard')) {
        loadCustomers();
    }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

// Format date to readable format
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Clear form errors
function clearFormErrors(formType) {
    const selector = formType === 'add'
        ? '#addCustomerForm .error-msg'
        : formType === 'edit'
            ? '#editCustomerForm .error-msg'
            : '.error-msg';

    const errorElements = document.querySelectorAll(selector);
    errorElements.forEach(elem => elem.textContent = '');
}

// Update current time in header
function startClock() {
    function updateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        const dateString = now.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });

        const timeElement = document.getElementById('currentTime');
        if (timeElement) {
            timeElement.textContent = `${dateString} • ${timeString}`;
        }
    }

    updateTime();
    setInterval(updateTime, 1000);
}

// ========================================
// AUTO-REFRESH DATA
// ========================================

// Auto-refresh customers data every 30 seconds
setInterval(() => {
    if (currentUser && document.visibilityState === 'visible') {
        loadCustomers();
    }
}, 30000);

// Refresh when page becomes visible again
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && currentUser) {
        loadCustomers();
    }
});

console.log('Finacer application loaded successfully');
