import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { auth } from "./firebase-config.js";
import { saveInvoice, getUserInvoices } from "./db.js";

// State Management
let currentUser = null;
let listenersInitialized = false;
let invoiceData = {
    biz: { name: '', email: '', address: '', logo: null },
    client: { biz: '', name: '', email: '', address: '' },
    items: [{ id: Date.now(), desc: 'Sample Item', qty: 1, price: 100 }],
    taxRate: 10,
    currency: '$',
    themeColor: '#2563eb',
    invoiceId: '#INV-2026-001',
    date: new Date().toISOString().split('T')[0],
    showDueDate: false,
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    payMethod: 'Bank Transfer / PayPal',
    payTerms: 'Due within 30 days',
    notes: '',
    terms: 'Please pay within 15 days of receiving this invoice. Late payments may be subject to a 1.5% monthly interest charge.',
};

// Initialize
function init() {
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = 'auth.html';
        } else {
            currentUser = user;
            document.getElementById('user-email').textContent = user.email;

            if (!listenersInitialized) {
                applyThemeColor(invoiceData.themeColor);
                renderItems();
                syncFormInputs(); // Sync UI with initial state
                updatePreview();
                setupEventListeners();
                loadHistory();
                listenersInitialized = true;
            }
        }
    });
}

function setupEventListeners() {
    // UI - Profile Sidebar
    const profileSidebar = document.getElementById('profile-sidebar');
    document.getElementById('open-profile').addEventListener('click', () => {
        profileSidebar.classList.add('active');
        loadHistory();
    });
    document.getElementById('close-profile').addEventListener('click', () => profileSidebar.classList.remove('active'));
    document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));

    // Basic fields sync
    const fields = [
        { id: 'biz-name', target: ['biz', 'name'] },
        { id: 'biz-email', target: ['biz', 'email'] },
        { id: 'biz-address', target: ['biz', 'address'] },
        { id: 'client-biz', target: ['client', 'biz'] },
        { id: 'client-name', target: ['client', 'name'] },
        { id: 'client-email', target: ['client', 'email'] },
        { id: 'client-address', target: ['client', 'address'] },
        { id: 'tax-rate', target: ['taxRate'], type: 'number' },
        { id: 'currency', target: ['currency'] },
        { id: 'theme-color', target: ['themeColor'] },
        { id: 'notes-input', target: ['notes'] },
        { id: 'terms-input', target: ['terms'] },
        { id: 'invoice-id', target: ['invoiceId'] },
        { id: 'invoice-date', target: ['date'] },
        { id: 'due-date', target: ['dueDate'] },
        { id: 'pay-method', target: ['payMethod'] },
        { id: 'pay-terms', target: ['payTerms'] }
    ];

    fields.forEach(({ id, target, type }) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', (e) => {
            let val = type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
            if (target.length === 2) invoiceData[target[0]][target[1]] = val;
            else invoiceData[target[0]] = val;

            if (id === 'theme-color') applyThemeColor(val);
            updatePreview();
        });
    });

    // Toggle Due Date
    document.getElementById('enable-due-date').addEventListener('change', (e) => {
        invoiceData.showDueDate = e.target.checked;
        document.getElementById('due-date').disabled = !e.target.checked;
        updatePreview();
    });

    // Logo Upload
    document.getElementById('logo-upload').addEventListener('change', handleLogoUpload);
    document.getElementById('add-item').addEventListener('click', addItem);
    document.getElementById('save-invoice').addEventListener('click', saveData);
    document.getElementById('reset-invoice').addEventListener('click', resetData);
    document.getElementById('print-pdf').addEventListener('click', downloadPDF);

    async function downloadPDF() {
        const btn = document.getElementById('print-pdf');
        const originalText = btn.textContent;
        btn.textContent = 'Generating PDF...';
        btn.disabled = true;

        const element = document.getElementById('invoice');
        const invoiceNumber = invoiceData.invoiceId || 'invoice';
        const filename = `${invoiceNumber}.pdf`;

        const opt = {
            margin: 0,
            filename: filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                logging: false,
                letterRendering: true
            },
            jsPDF: {
                unit: 'mm',
                format: 'a4',
                orientation: 'portrait'
            }
        };

        try {
            await html2pdf().set(opt).from(element).save();
        } catch (error) {
            console.error('PDF generation failed:', error);
            // Fallback to print if PDF fails
            window.print();
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }

    async function loadHistory() {
        if (!currentUser) return;
        const historyList = document.getElementById('invoice-history');
        historyList.innerHTML = '<div class="empty-state">Loading history...</div>';

        try {
            const invoices = await getUserInvoices(currentUser.uid);
            if (invoices.length === 0) {
                historyList.innerHTML = '<div class="empty-state">No saved invoices yet.</div>';
                return;
            }

            historyList.innerHTML = '';
            invoices.forEach(inv => {
                const item = document.createElement('div');
                item.className = 'history-item';

                // Calculate total for history display
                let subtotal = 0;
                inv.items.forEach(i => subtotal += ((i.qty || 0) * (i.price || 0)));
                const total = subtotal + (subtotal * ((inv.taxRate || 0) / 100));

                const formatDateShort = (dateStr) => {
                    if (!dateStr) return 'No date';
                    const d = new Date(dateStr);
                    return isNaN(d.getTime()) ? 'No date' : d.toLocaleDateString();
                };

                item.innerHTML = `
                <div class="info">
                    <span class="title">${inv.invoiceId || 'No ID'}</span>
                    <span class="date">${formatDateShort(inv.date)}</span>
                </div>
                <span class="amount">${inv.currency || '$'}${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            `;
                item.onclick = () => {
                    invoiceData = { ...inv };
                    renderItems();
                    updatePreview();
                    syncFormInputs(); // Sync UI when loading from history
                    document.getElementById('profile-sidebar').classList.remove('active');
                };
                historyList.appendChild(item);
            });
        } catch (e) {
            console.error(e);
            historyList.innerHTML = '<div class="empty-state" style="color: red;">Failed to load history.</div>';
        }
    }

    function handleLogoUpload(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                invoiceData.biz.logo = event.target.result;
                updatePreview();
            };
            reader.readAsDataURL(file);
        }
    }

    function applyThemeColor(color) {
        document.documentElement.style.setProperty('--primary', color);
        document.documentElement.style.setProperty('--primary-hover', color + 'dd');
        document.documentElement.style.setProperty('--primary-light', color + '15');
    }

    function addItem() {
        invoiceData.items.push({ id: Date.now(), desc: '', qty: 1, price: 0 });
        renderItems();
        updatePreview();
    }

    window.removeItem = (id) => {
        invoiceData.items = invoiceData.items.filter(item => item.id !== id);
        renderItems();
        updatePreview();
    };

    window.updateItem = (id, field, value) => {
        const item = invoiceData.items.find(i => i.id === id);
        if (item) {
            if (field === 'qty' || field === 'price') item[field] = parseFloat(value) || 0;
            else item[field] = value;
            updatePreview();
        }
    };

    function renderItems() {
        const container = document.getElementById('items-container');
        container.innerHTML = '';

        invoiceData.items.forEach(item => {
            const row = document.createElement('div');
            row.className = 'item-row';
            row.innerHTML = `
            <input type="text" placeholder="Item Name" value="${item.desc}" oninput="updateItem(${item.id}, 'desc', this.value)">
            <input type="number" placeholder="Qty" value="${item.qty}" oninput="updateItem(${item.id}, 'qty', this.value)">
            <input type="number" placeholder="Price" value="${item.price}" oninput="updateItem(${item.id}, 'price', this.value)">
            <button class="btn-danger" style="height: 38px; width: 32px;" onclick="removeItem(${item.id})"><i class="ph ph-trash"></i></button>
        `;
            container.appendChild(row);
        });
    }

    function updatePreview() {
        const logoContainer = document.getElementById('view-logo-container');
        if (invoiceData.biz.logo) {
            logoContainer.innerHTML = `<img src="${invoiceData.biz.logo}" style="max-height: 80px; max-width: 200px; object-fit: contain;">`;
        } else {
            logoContainer.innerHTML = `<i class="ph-fill ph-receipt" style="font-size: 3rem; color: var(--primary);"></i>`;
        }

        document.getElementById('view-biz-name').textContent = invoiceData.biz.name || 'Your Company';
        document.getElementById('view-biz-address').textContent = invoiceData.biz.address || '123 Business St,\nCity, Country';
        document.getElementById('view-client-biz').textContent = invoiceData.client.biz || 'Client Company';
        document.getElementById('view-client-name').textContent = invoiceData.client.name || 'Client Contact Name';
        document.getElementById('view-client-address').textContent = invoiceData.client.address || '456 Client Avenue,\nSuite 100';
        document.getElementById('view-tax-rate').textContent = invoiceData.taxRate;
        document.getElementById('view-terms').textContent = invoiceData.terms;

        const notesContainer = document.getElementById('view-notes-container');
        if (invoiceData.notes) {
            notesContainer.style.display = 'block';
            document.getElementById('view-notes').textContent = invoiceData.notes;
        } else {
            notesContainer.style.display = 'none';
        }

        document.getElementById('view-invoice-id').textContent = invoiceData.invoiceId || '#INV-000';

        // Robust Date Formatting
        const formatDate = (dateStr) => {
            if (!dateStr) return 'Not set';
            const d = new Date(dateStr);
            return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        };

        document.getElementById('view-date').textContent = formatDate(invoiceData.date);

        const dueDateContainer = document.getElementById('view-due-date-container');
        if (invoiceData.showDueDate) {
            dueDateContainer.style.display = 'block';
            document.getElementById('view-due-date').textContent = formatDate(invoiceData.dueDate);
        } else {
            dueDateContainer.style.display = 'none';
        }

        document.getElementById('view-pay-method').textContent = invoiceData.payMethod;
        document.getElementById('view-pay-terms').textContent = invoiceData.payTerms;

        const tableBody = document.getElementById('invoice-items-preview');
        tableBody.innerHTML = '';

        let subtotal = 0;
        invoiceData.items.forEach(item => {
            const qty = parseFloat(item.qty) || 0;
            const price = parseFloat(item.price) || 0;
            const lineTotal = qty * price;
            subtotal += lineTotal;
            const tr = document.createElement('tr');
            tr.innerHTML = `
            <td>${item.desc || 'Untitled Item'}</td>
            <td style="text-align: center;">${qty}</td>
            <td style="text-align: right;">${invoiceData.currency}${price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
            <td class="amount">${invoiceData.currency}${lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
        `;
            tableBody.appendChild(tr);
        });

        const taxAmount = subtotal * (invoiceData.taxRate / 100);
        const total = subtotal + taxAmount;

        document.getElementById('view-subtotal').textContent = `${invoiceData.currency}${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
        document.getElementById('view-tax-amount').textContent = `${invoiceData.currency}${taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
        document.getElementById('view-total').textContent = `${invoiceData.currency}${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    }

    function syncFormInputs() {
        const fields = {
            'biz-name': invoiceData.biz.name,
            'biz-email': invoiceData.biz.email,
            'biz-address': invoiceData.biz.address,
            'client-biz': invoiceData.client.biz,
            'client-name': invoiceData.client.name,
            'client-email': invoiceData.client.email,
            'client-address': invoiceData.client.address,
            'tax-rate': invoiceData.taxRate,
            'currency': invoiceData.currency,
            'theme-color': invoiceData.themeColor,
            'notes-input': invoiceData.notes,
            'terms-input': invoiceData.terms,
            'invoice-id': invoiceData.invoiceId,
            'invoice-date': invoiceData.date,
            'due-date': invoiceData.dueDate,
            'pay-method': invoiceData.payMethod,
            'pay-terms': invoiceData.payTerms
        };

        for (const [id, value] of Object.entries(fields)) {
            const el = document.getElementById(id);
            if (el) el.value = value || '';
        }
        document.getElementById('enable-due-date').checked = !!invoiceData.showDueDate;
        document.getElementById('due-date').disabled = !invoiceData.showDueDate;
    }

    async function saveData() {
        if (!currentUser) return;
        const btn = document.getElementById('save-invoice');
        btn.textContent = 'Saving...';
        btn.disabled = true;

        try {
            await saveInvoice(currentUser.uid, invoiceData);
            alert('Invoice saved to your cloud account!');
            loadHistory();
        } catch (e) {
            alert('Failed to save to cloud.');
        } finally {
            btn.textContent = 'Save Changes';
            btn.disabled = false;
        }
    }

    function resetData() {
        if (confirm('Reset this invoice? (This will not delete saved history)')) {
            location.reload();
        }
    }

    init();
