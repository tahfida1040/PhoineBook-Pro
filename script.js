// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBCxkIW06pVTT8SvDSHEwaHMcpw8hfwLjI",
  authDomain: "phonebook-pro.firebaseapp.com",
  projectId: "phonebook-pro",
  storageBucket: "phonebook-pro.firebasestorage.app",
  messagingSenderId: "1075433875615",
  appId: "1:1075433875615:web:89e817ef0fb72ef256daaa"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
// Note: Storage not needed - images stored as base64 in Firestore

// Application State
let currentUser = null;
let isAdmin = false;
let editingContactId = null;
let allContacts = [];
let allUsers = [];

// Default admin user
const defaultAdmin = {
    id: 'admin',
    username: 'admin',
    email: 'admin@phonebook.com',
    password: 'admin123',
    isAdmin: true,
    registrationDate: new Date().toISOString()
};

// Initialize App
async function initApp() {
    try {
        await initializeDefaultAdmin();
        showWelcome();
        setupEventListeners();
    } catch (error) {
        console.error('Error initializing app:', error);
        showError('Failed to initialize application');
    }
}

// Initialize default admin if not exists
async function initializeDefaultAdmin() {
    try {
        const adminDoc = await db.collection('users').doc('admin').get();
        if (!adminDoc.exists) {
            await db.collection('users').doc('admin').set(defaultAdmin);
            console.log('Default admin created');
        }
    } catch (error) {
        console.error('Error creating default admin:', error);
    }
}

// Event Listeners
function setupEventListeners() {
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    document.getElementById('contact-form').addEventListener('submit', handleContactSubmit);
    document.getElementById('search-input').addEventListener('input', handleSearch);
    document.getElementById('contact-image').addEventListener('change', handleImagePreview);
}

// Navigation Functions
function showWelcome() {
    hideAllPages();
    document.getElementById('welcome-page').classList.remove('hidden');
    updateNavigation();
}

async function showContacts() {
    if (!currentUser) {
        showError('Please login first');
        return;
    }
    hideAllPages();
    document.getElementById('contacts-page').classList.remove('hidden');
    await loadContacts();
    updateNavigation();
}

async function showUsers() {
    if (!isAdmin) {
        showError('Admin access required');
        return;
    }
    hideAllPages();
    document.getElementById('admin-users-page').classList.remove('hidden');
    await loadUsers();
    updateNavigation();
}

function hideAllPages() {
    document.getElementById('welcome-page').classList.add('hidden');
    document.getElementById('contacts-page').classList.add('hidden');
    document.getElementById('admin-users-page').classList.add('hidden');
}

function updateNavigation() {
    document.getElementById('guest-nav').classList.toggle('hidden', !!currentUser);
    document.getElementById('user-nav').classList.toggle('hidden', !currentUser || isAdmin);
    document.getElementById('admin-nav').classList.toggle('hidden', !isAdmin);
    
    if (currentUser) {
        document.getElementById('current-user').textContent = currentUser.username;
    }
}

// Modal Functions
function showLogin() {
    document.getElementById('login-modal').style.display = 'block';
}

function showRegister() {
    document.getElementById('register-modal').style.display = 'block';
}

function showAddContact() {
    if (!currentUser) {
        showError('Please login first');
        return;
    }
    editingContactId = null;
    document.getElementById('contact-modal-title').textContent = 'Add Contact';
    document.getElementById('contact-form').reset();
    document.getElementById('image-preview').classList.add('hidden');
    document.getElementById('contact-modal').style.display = 'block';
}

async function showEditContact(contactId) {
    try {
        const contactDoc = await db.collection('contacts').doc(contactId).get();
        if (!contactDoc.exists) {
            showError('Contact not found');
            return;
        }

        const contact = contactDoc.data();
        editingContactId = contactId;
        document.getElementById('contact-modal-title').textContent = 'Edit Contact';
        document.getElementById('contact-firstname').value = contact.firstName;
        document.getElementById('contact-lastname').value = contact.lastName;
        document.getElementById('contact-email').value = contact.email;
        document.getElementById('contact-phone').value = contact.phone;
        document.getElementById('contact-address').value = contact.address;
        
        if (contact.imageBase64) {
            document.getElementById('image-preview').src = contact.imageBase64;
            document.getElementById('image-preview').classList.remove('hidden');
        }
        
        document.getElementById('contact-modal').style.display = 'block';
    } catch (error) {
        console.error('Error loading contact:', error);
        showError('Failed to load contact');
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Authentication Functions
async function handleLogin(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    setButtonLoading(btn, true);

    try {
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        const usersSnapshot = await db.collection('users')
            .where('username', '==', username)
            .where('password', '==', password)
            .get();

        if (!usersSnapshot.empty) {
            const userDoc = usersSnapshot.docs[0];
            currentUser = { id: userDoc.id, ...userDoc.data() };
            isAdmin = currentUser.isAdmin || false;
            closeModal('login-modal');
            
            if (isAdmin) {
                await showUsers();
            } else {
                await showContacts();
            }
            
            showSuccess('Login successful!');
            document.getElementById('login-form').reset();
        } else {
            showError('Invalid credentials');
        }
    } catch (error) {
        console.error('Error logging in:', error);
        showError('Login failed. Please try again.');
    } finally {
        setButtonLoading(btn, false);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    setButtonLoading(btn, true);

    try {
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;

        // Check if username exists
        const usernameCheck = await db.collection('users')
            .where('username', '==', username)
            .get();

        if (!usernameCheck.empty) {
            showError('Username already exists');
            return;
        }

        // Check if email exists
        const emailCheck = await db.collection('users')
            .where('email', '==', email)
            .get();

        if (!emailCheck.empty) {
            showError('Email already registered');
            return;
        }

        const newUser = {
            username,
            email,
            password,
            isAdmin: false,
            registrationDate: new Date().toISOString()
        };

        await db.collection('users').add(newUser);
        
        closeModal('register-modal');
        showSuccess('Registration successful! Please login.');
        document.getElementById('register-form').reset();
    } catch (error) {
        console.error('Error registering:', error);
        showError('Registration failed. Please try again.');
    } finally {
        setButtonLoading(btn, false);
    }
}

function logout() {
    currentUser = null;
    isAdmin = false;
    allContacts = [];
    allUsers = [];
    showWelcome();
    showSuccess('Logged out successfully!');
}

// Contact Functions
async function handleContactSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    setButtonLoading(btn, true);

    try {
        let imageBase64 = document.getElementById('image-preview').src;
        
        // Convert uploaded image to base64 if new file selected
        const imageFile = document.getElementById('contact-image').files[0];
        if (imageFile) {
            imageBase64 = await convertImageToBase64(imageFile);
        }

        const contactData = {
            firstName: document.getElementById('contact-firstname').value,
            lastName: document.getElementById('contact-lastname').value,
            email: document.getElementById('contact-email').value,
            phone: document.getElementById('contact-phone').value,
            address: document.getElementById('contact-address').value,
            imageBase64: imageBase64 || null,
            userId: currentUser.id,
            createdAt: new Date().toISOString()
        };

        if (editingContactId) {
            // Update existing contact
            await db.collection('contacts').doc(editingContactId).update(contactData);
            showSuccess('Contact updated successfully!');
        } else {
            // Add new contact
            await db.collection('contacts').add(contactData);
            showSuccess('Contact added successfully!');
        }

        closeModal('contact-modal');
        await loadContacts();
        document.getElementById('contact-form').reset();
        document.getElementById('image-preview').classList.add('hidden');
    } catch (error) {
        console.error('Error saving contact:', error);
        showError('Failed to save contact');
    } finally {
        setButtonLoading(btn, false);
    }
}

async function deleteContact(contactId) {
    if (confirm('Are you sure you want to delete this contact?')) {
        try {
            await db.collection('contacts').doc(contactId).delete();
            showSuccess('Contact deleted successfully!');
            await loadContacts();
        } catch (error) {
            console.error('Error deleting contact:', error);
            showError('Failed to delete contact');
        }
    }
}

async function loadContacts() {
    try {
        const contactsContainer = document.getElementById('contacts-container');
        contactsContainer.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Loading contacts...</p>
            </div>
        `;

        let query = db.collection('contacts');
        
        if (!isAdmin) {
            query = query.where('userId', '==', currentUser.id);
        }

        const snapshot = await query.get();
        allContacts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        displayContacts(allContacts);
    } catch (error) {
        console.error('Error loading contacts:', error);
        showError('Failed to load contacts');
    }
}

function displayContacts(contactsToShow = allContacts) {
    const container = document.getElementById('contacts-container');

    if (contactsToShow.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 4rem; margin-bottom: 1rem;">📱</div>
                <h3>No contacts found</h3>
                <p>Add your first contact to get started!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="contact-grid">
            ${contactsToShow.map(contact => `
                <div class="contact-card">
                    <div class="contact-header">
                        <img src="${contact.imageBase64 || getDefaultAvatar()}" alt="Contact" class="contact-avatar">
                        <div>
                            <div class="contact-name">${contact.firstName} ${contact.lastName}</div>
                        </div>
                    </div>
                    <div class="contact-info">
                        <p><strong>📧</strong> ${contact.email}</p>
                        <p><strong>📞</strong> ${contact.phone}</p>
                        <p><strong>🏠</strong> ${contact.address}</p>
                    </div>
                    <div class="contact-actions">
                        <button class="btn btn-secondary btn-small" onclick="showEditContact('${contact.id}')">Edit</button>
                        <button class="btn btn-danger btn-small" onclick="deleteContact('${contact.id}')">Delete</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

async function loadUsers() {
    try {
        document.getElementById('users-loading').classList.remove('hidden');
        document.getElementById('users-table').classList.add('hidden');

        const usersSnapshot = await db.collection('users').where('isAdmin', '==', false).get();
        allUsers = usersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        await displayUsers();
    } catch (error) {
        console.error('Error loading users:', error);
        showError('Failed to load users');
    }
}

async function displayUsers() {
    const tbody = document.getElementById('users-table-body');
    
    try {
        // Get contact counts for each user
        const userRows = await Promise.all(allUsers.map(async (user) => {
            const contactsSnapshot = await db.collection('contacts')
                .where('userId', '==', user.id)
                .get();
            
            const registrationDate = new Date(user.registrationDate).toLocaleDateString();
            
            return `
                <tr>
                    <td>${user.username}</td>
                    <td>${user.email}</td>
                    <td>${registrationDate}</td>
                    <td>${contactsSnapshot.size}</td>
                </tr>
            `;
        }));

        tbody.innerHTML = userRows.join('');
        document.getElementById('users-loading').classList.add('hidden');
        document.getElementById('users-table').classList.remove('hidden');
    } catch (error) {
        console.error('Error displaying users:', error);
        showError('Failed to display users');
    }
}

// Image Handling Functions (Base64 instead of Firebase Storage)
async function convertImageToBase64(file) {
    return new Promise((resolve, reject) => {
        // Check file size (limit to 1MB for Firestore)
        if (file.size > 1024 * 1024) {
            reject(new Error('Image size must be less than 1MB'));
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            resolve(e.target.result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function handleImagePreview() {
    const file = document.getElementById('contact-image').files[0];
    const preview = document.getElementById('image-preview');
    
    if (file) {
        // Check file size
        if (file.size > 1024 * 1024) {
            showError('Image size must be less than 1MB');
            document.getElementById('contact-image').value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
}

// Search Function
function handleSearch() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    
    const filteredContacts = allContacts.filter(contact => 
        contact.firstName.toLowerCase().includes(searchTerm) ||
        contact.lastName.toLowerCase().includes(searchTerm) ||
        contact.email.toLowerCase().includes(searchTerm) ||
        contact.phone.includes(searchTerm)
    );

    displayContacts(filteredContacts);
}

// Utility Functions
function getDefaultAvatar() {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMzAiIGZpbGw9IiM2NjdlZWEiLz4KPHN2ZyB4PSIxNSIgeT0iMTUiIHdpZHRoPSIzMCIgaGVpZ2h0PSIzMCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+CjxwYXRoIGQ9Im0xMiAxMmMxLjY1NjkgMCAzLTEuMzQzMSAzLTNzLTEuMzQzMS0zLTMtMy0zIDEuMzQzMS0zIDMgMS4zNDMxIDMgMyAzem0wIDJjLTIuNjcgMC04IDEuMzQtOCA0djJoMTZ2LTJjMC0yLjY2LTUuMzMtNC04LTR6Ii8+Cjwvc3ZnPgo8L3N2Zz4K';
}

function setButtonLoading(button, isLoading) {
    const btnText = button.querySelector('.btn-text');
    const btnSpinner = button.querySelector('.btn-spinner');
    
    if (isLoading) {
        btnText.style.display = 'none';
        btnSpinner.classList.remove('hidden');
        button.disabled = true;
    } else {
        btnText.style.display = 'inline';
        btnSpinner.classList.add('hidden');
        button.disabled = false;
    }
}

function showSuccess(message) {
    showAlert(message, 'success');
}

function showError(message) {
    showAlert(message, 'error');
}

function showAlert(message, type) {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());

    // Create new alert
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;

    // Insert at top of container
    const container = document.querySelector('.container');
    container.insertBefore(alert, container.firstChild);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, 5000);
}

// Close modals when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

// Error handling for Firebase operations
function handleFirebaseError(error) {
    console.error('Firebase error:', error);
    
    switch (error.code) {
        case 'permission-denied':
            showError('Permission denied. Please check your credentials.');
            break;
        case 'unavailable':
            showError('Service temporarily unavailable. Please try again.');
            break;
        case 'network-request-failed':
            showError('Network error. Please check your connection.');
            break;
        default:
            showError('An error occurred. Please try again.');
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);