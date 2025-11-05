// Dashboard functionality with FIREBASE
let uploadedFiles = [];
const db = firebase.firestore();
const storage = firebase.storage();

// Initialize dashboard with FIREBASE
document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard initialized with Firebase');

    // Check authentication
    checkAuthentication();

    // Initialize components
    initializeSidebar();
    initializeFileUpload();
    initializeProfileForm();
    initializeThemeToggle();
    loadUserData();
    loadFilesData();

    // Show home section by default
    showSection('home');
});

// Authentication check with FIREBASE
function checkAuthentication() {
    const userRole = localStorage.getItem('userRole');
    const userName = localStorage.getItem('userName');
    const userId = localStorage.getItem('userId');

    if (!userRole || !userName || !userId) {
        console.log('User not authenticated, redirecting to login...');
        window.location.href = 'index.html';
        return;
    }

    // Verify user is still logged in with Firebase
    firebase.auth().onAuthStateChanged((user) => {
        if (!user) {
            console.log('Firebase authentication lost, redirecting to login...');
            window.location.href = 'index.html';
            return;
        }
        console.log('User authenticated with Firebase:', user.email);
    });
}

// Initialize sidebar
function initializeSidebar() {
    const toggleBtn = document.getElementById('toggleSidebar');
    const sidebar = document.getElementById('sidebar');
    
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');
        });
    }
}

// Initialize file upload
function initializeFileUpload() {
    const fileUpload = document.getElementById('fileUpload');
    const uploadArea = document.getElementById('uploadArea');
    
    if (fileUpload) {
        fileUpload.addEventListener('change', function(e) {
            if (e.target.files.length > 0) {
                handleFileUpload(e.target.files[0]);
            }
        });
    }
    
    if (uploadArea) {
        // Drag and drop functionality
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, preventDefaults, false);
        });
        
        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, highlight, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, unhighlight, false);
        });
        
        function highlight() {
            uploadArea.classList.add('dragover');
        }
        
        function unhighlight() {
            uploadArea.classList.remove('dragover');
        }
        
        uploadArea.addEventListener('drop', function(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length > 0) {
                handleFileUpload(files[0]);
            }
        });
    }
}

// File upload functionality with FIREBASE STORAGE
function handleFileUpload(file) {
    // Validation
    if (file.type !== 'application/pdf') {
        alert('Please upload only PDF files!');
        return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
        alert('File size must be less than 10MB!');
        return;
    }

    // Show progress
    const uploadProgress = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');

    if (uploadProgress) uploadProgress.style.display = 'block';

    const userId = localStorage.getItem('userId');
    const fileName = `files/${userId}/${Date.now()}_${file.name}`;
    const storageRef = storage.ref().child(fileName);

    // Upload to Firebase Storage
    const uploadTask = storageRef.put(file);

    uploadTask.on('state_changed',
        (snapshot) => {
            // Progress
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (progressFill) progressFill.style.width = progress + '%';
            if (progressText) progressText.textContent = `Uploading... ${Math.round(progress)}%`;
        },
        (error) => {
            // Error
            console.error('Upload error:', error);
            alert('Upload failed: ' + error.message);
            if (uploadProgress) uploadProgress.style.display = 'none';
        },
        () => {
            // Complete
            uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
                completeFileUpload(file, downloadURL, fileName);
            });
        }
    );
}

function completeFileUpload(file, downloadURL, storagePath) {
    const userId = localStorage.getItem('userId');
    const userEmail = localStorage.getItem('userEmail');

    const fileData = {
        id: Date.now(),
        name: file.name,
        size: (file.size / 1024 / 1024).toFixed(2),
        uploadDate: new Date().toISOString(),
        type: file.type,
        downloadURL: downloadURL,
        storagePath: storagePath,
        uploadedBy: userId,
        uploadedByEmail: userEmail
    };

    // Save to Firestore
    db.collection('files').add(fileData)
        .then((docRef) => {
            console.log('File saved to Firestore with ID:', docRef.id);

            // Add to local array
            uploadedFiles.unshift(fileData);

            // Hide progress
            const uploadProgress = document.getElementById('uploadProgress');
            if (uploadProgress) uploadProgress.style.display = 'none';

            // Reset file input
            const fileUpload = document.getElementById('fileUpload');
            if (fileUpload) fileUpload.value = '';

            // Show success message
            alert(`File "${file.name}" uploaded successfully!`);

            // Refresh files display
            refreshFilesTable();
            updateHomeStats();
            updateRecentFiles();

            // Switch to files section
            showSection('files');
        })
        .catch((error) => {
            console.error('Error saving to Firestore:', error);
            alert('Error saving file information');
        });
}

// Files management with FIRESTORE
function loadFilesData() {
    const userId = localStorage.getItem('userId');

    db.collection('files')
        .where('uploadedBy', '==', userId)
        .orderBy('uploadDate', 'desc')
        .get()
        .then((querySnapshot) => {
            uploadedFiles = [];
            querySnapshot.forEach((doc) => {
                const fileData = doc.data();
                fileData.firestoreId = doc.id; // Store Firestore document ID
                uploadedFiles.push(fileData);
            });
            refreshFilesTable();
            updateHomeStats();
            updateRecentFiles();
        })
        .catch((error) => {
            console.error('Error loading files:', error);
        });
}

// File actions with FIREBASE
function downloadFile(fileId) {
    const file = uploadedFiles.find(f => f.id === fileId);
    if (file && file.downloadURL) {
        // Open download URL in new tab
        window.open(file.downloadURL, '_blank');
    }
}

function deleteFile(fileId) {
    if (confirm('Are you sure you want to delete this file?')) {
        const file = uploadedFiles.find(f => f.id === fileId);

        if (file && file.firestoreId && file.storagePath) {
            // Delete from Firestore
            db.collection('files').doc(file.firestoreId).delete()
                .then(() => {
                    // Delete from Storage
                    return storage.ref().child(file.storagePath).delete();
                })
                .then(() => {
                    // Remove from local array
                    uploadedFiles = uploadedFiles.filter(f => f.id !== fileId);
                    refreshFilesTable();
                    updateHomeStats();
                    updateRecentFiles();
                    alert('File deleted successfully!');
                })
                .catch((error) => {
                    console.error('Error deleting file:', error);
                    alert('Error deleting file');
                });
        }
    }
}

// Initialize profile form
function initializeProfileForm() {
    const profileForm = document.getElementById('profileForm');
    
    if (!profileForm) return;
    
    // Load current profile data
    const userName = localStorage.getItem('userName');
    const userEmail = localStorage.getItem('userEmail');
    const userRole = localStorage.getItem('userRole');
    
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const roleDisplay = document.getElementById('roleDisplay');
    const profileName = document.getElementById('profileName');
    const profileRole = document.getElementById('profileRole');
    
    if (nameInput) nameInput.value = userName || '';
    if (emailInput) emailInput.value = userEmail || '';
    if (roleDisplay) roleDisplay.value = userRole || 'User';
    if (profileName) profileName.textContent = userName || 'User';
    if (profileRole) profileRole.textContent = userRole || 'User';
    
    profileForm.addEventListener('submit', function(e) {
        e.preventDefault();
        saveProfileChanges();
    });
}

// Initialize theme toggle
function initializeThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    
    if (!themeToggle || !themeIcon) return;
    
    // Check for saved theme preference or use preferred color scheme
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    const currentTheme = localStorage.getItem('theme');
    
    if (currentTheme === 'dark' || (!currentTheme && prefersDarkScheme.matches)) {
        document.body.classList.add('dark-theme');
        themeIcon.className = 'fas fa-sun';
        themeToggle.title = 'Switch to light mode';
    }
    
    themeToggle.addEventListener('click', function() {
        document.body.classList.toggle('dark-theme');
        
        if (document.body.classList.contains('dark-theme')) {
            localStorage.setItem('theme', 'dark');
            themeIcon.className = 'fas fa-sun';
            themeToggle.title = 'Switch to light mode';
        } else {
            localStorage.setItem('theme', 'light');
            themeIcon.className = 'fas fa-moon';
            themeToggle.title = 'Switch to dark mode';
        }
    });
}

// Load user data
function loadUserData() {
    const userName = localStorage.getItem('userName');
    const userRole = localStorage.getItem('userRole');
    
    const welcomeMessage = document.getElementById('welcomeMessage');
    const userRoleElement = document.getElementById('userRole');
    
    if (welcomeMessage) welcomeMessage.textContent = `Welcome, ${userName || 'User'}!`;
    if (userRoleElement) userRoleElement.textContent = userRole || 'User';
}

// Show section function
function showSection(sectionName) {
    // Hide all sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    const activeSection = document.getElementById(sectionName);
    if (activeSection) {
        activeSection.classList.add('active');
    }
    
    // Update active menu item
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.classList.remove('active');
    });
    
    // Find and activate corresponding menu item
    const activeMenuItem = Array.from(menuItems).find(item => {
        const link = item.querySelector('a');
        return link && link.getAttribute('onclick')?.includes(sectionName);
    });
    
    if (activeMenuItem) {
        activeMenuItem.classList.add('active');
    }
    
    // Update page title
    updatePageTitle(sectionName);
}

// Update page title
function updatePageTitle(sectionName) {
    const titles = {
        'home': 'CCIT Dashboard',
        'upload': 'Upload Files - CCIT',
        'files': 'My Files - CCIT',
        'profile': 'Profile - CCIT'
    };
    
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
        pageTitle.textContent = titles[sectionName] || 'CCIT Dashboard';
    }
}

// Refresh files table
function refreshFilesTable() {
    const tableBody = document.getElementById('filesTableBody');
    
    if (!tableBody) return;
    
    if (uploadedFiles.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="no-files">No files uploaded yet</td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = uploadedFiles.map(file => `
        <tr>
            <td>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div class="file-icon">
                        <i class="fas fa-file-pdf"></i>
                    </div>
                    <div>
                        <div class="file-name">${file.name}</div>
                        <div class="file-meta">PDF Document</div>
                    </div>
                </div>
            </td>
            <td>${file.size} MB</td>
            <td>${new Date(file.uploadDate).toLocaleDateString()}</td>
            <td>
                <button class="btn-small" onclick="downloadFile(${file.id})">
                    <i class="fas fa-download"></i> Download
                </button>
                <button class="btn-small btn-danger" onclick="deleteFile(${file.id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        </tr>
    `).join('');
}

// Update home stats
function updateHomeStats() {
    const totalFilesElement = document.getElementById('totalFiles');
    const totalStorageElement = document.getElementById('totalStorage');
    
    if (totalFilesElement) totalFilesElement.textContent = uploadedFiles.length;
    
    const totalStorage = uploadedFiles.reduce((total, file) => total + parseFloat(file.size), 0);
    if (totalStorageElement) totalStorageElement.textContent = totalStorage.toFixed(1) + ' MB';
}

// Update recent files
function updateRecentFiles() {
    const recentFilesList = document.getElementById('recentFilesList');
    
    if (!recentFilesList) return;
    
    const recentFiles = uploadedFiles.slice(0, 5);
    
    if (recentFiles.length === 0) {
        recentFilesList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <p>No recent files uploaded yet</p>
            </div>
        `;
        return;
    }
    
    recentFilesList.innerHTML = recentFiles.map(file => `
        <div class="file-item">
            <div class="file-icon">
                <i class="fas fa-file-pdf"></i>
            </div>
            <div class="file-info">
                <div class="file-name">${file.name}</div>
                <div class="file-meta">
                    ${file.size} MB • ${new Date(file.uploadDate).toLocaleDateString()}
                </div>
            </div>
        </div>
    `).join('');
}

// Save profile changes
function saveProfileChanges() {
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    
    if (!nameInput || !emailInput || !passwordInput || !confirmPasswordInput) return;
    
    const name = nameInput.value;
    const email = emailInput.value;
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    
    if (password && password !== confirmPassword) {
        alert('Passwords do not match!');
        return;
    }
    
    // Update localStorage
    localStorage.setItem('userName', name);
    localStorage.setItem('userEmail', email);
    
    // Update UI
    const profileName = document.getElementById('profileName');
    const welcomeMessage = document.getElementById('welcomeMessage');
    
    if (profileName) profileName.textContent = name;
    if (welcomeMessage) welcomeMessage.textContent = `Welcome, ${name}!`;
    
    // Update Firebase user (basic implementation)
    const user = firebase.auth().currentUser;
    
    if (user) {
        // Update email if changed
        if (email !== user.email) {
            user.updateEmail(email).then(() => {
                console.log('Email updated successfully');
            }).catch((error) => {
                console.error('Error updating email:', error);
                alert('Error updating email: ' + error.message);
            });
        }
        
        // Update password if provided
        if (password) {
            user.updatePassword(password).then(() => {
                console.log('Password updated successfully');
                // Clear password fields
                passwordInput.value = '';
                confirmPasswordInput.value = '';
            }).catch((error) => {
                console.error('Error updating password:', error);
                alert('Error updating password: ' + error.message);
            });
        }
    }
    
    alert('Profile updated successfully!');
}

// Reset profile form
function resetProfileForm() {
    const userName = localStorage.getItem('userName');
    const userEmail = localStorage.getItem('userEmail');
    
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    
    if (nameInput) nameInput.value = userName || '';
    if (emailInput) emailInput.value = userEmail || '';
    if (passwordInput) passwordInput.value = '';
    if (confirmPasswordInput) confirmPasswordInput.value = '';
}

// Logout functionality with FIREBASE
document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();

            if (confirm('Are you sure you want to logout?')) {
                // Firebase sign out
                firebase.auth().signOut().then(() => {
                    // Clear user data
                    localStorage.removeItem('userRole');
                    localStorage.removeItem('userName');
                    localStorage.removeItem('userEmail');
                    localStorage.removeItem('userId');
                    localStorage.removeItem('uploadedFiles');

                    // Redirect to login
                    window.location.href = 'index.html';
                }).catch((error) => {
                    console.error('Logout error:', error);
                });
            }
        });
    }
});