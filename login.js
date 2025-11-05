document.addEventListener('DOMContentLoaded', function() {
    // Page elements
    const loginPage = document.getElementById('loginPage');
    const signupPage = document.getElementById('signupPage');
    const showSignupLink = document.getElementById('showSignup');
    const showLoginLink = document.getElementById('showLogin');
    
    // Login form elements
    const loginForm = document.getElementById('loginForm');
    const googleLoginBtn = document.getElementById('googleLogin');
    const facebookLoginBtn = document.getElementById('facebookLogin');
    
    // Signup form elements
    const signupForm = document.getElementById('signupForm');
    const googleSignupBtn = document.getElementById('googleSignup');
    const facebookSignupBtn = document.getElementById('facebookSignup');
    
    // Check if Firebase is properly initialized
    if (typeof firebase === 'undefined' || !firebase.apps.length) {
        console.error('Firebase is not properly initialized');
        alert('Firebase configuration error. Please check firebase-config.js');
        return;
    }

    // Check if elements exist before adding event listeners
    if (!loginPage || !signupPage || !showSignupLink || !showLoginLink || 
        !loginForm || !signupForm) {
        console.error('Required DOM elements not found');
        return;
    }
    
    // Show signup page
    showSignupLink.addEventListener('click', function(e) {
        e.preventDefault();
        loginPage.classList.remove('active');
        signupPage.classList.add('active');
    });
    
    // Show login page
    showLoginLink.addEventListener('click', function(e) {
        e.preventDefault();
        signupPage.classList.remove('active');
        loginPage.classList.add('active');
    });
    
    // Handle regular form login with FIREBASE
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const role = document.getElementById('role').value;

        // Simple validation
        if (!username || !password || !role) {
            alert('Please fill in all fields');
            return;
        }

        // Show loading state
        const loginBtn = loginForm.querySelector('.btn-primary');
        const originalText = loginBtn.textContent;
        loginBtn.textContent = 'Logging in...';
        loginBtn.disabled = true;

        // Firebase Authentication
        const email = username.includes('@') ? username : username + '@prmsu.edu';

        firebase.auth().signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Store user data in localStorage for dashboard
                localStorage.setItem('userRole', role);
                localStorage.setItem('userName', username);
                localStorage.setItem('userEmail', email);
                localStorage.setItem('userId', userCredential.user.uid);

                console.log('Firebase login successful, redirecting to dashboard...');

                // REDIRECT TO DASHBOARD
                window.location.href = 'dashboard.html';
            })
            .catch((error) => {
                console.error('Login error:', error);
                
                // Better error messages
                let errorMessage = 'Login failed: ';
                switch (error.code) {
                    case 'auth/invalid-email':
                        errorMessage += 'Invalid email address';
                        break;
                    case 'auth/user-disabled':
                        errorMessage += 'This account has been disabled';
                        break;
                    case 'auth/user-not-found':
                        errorMessage += 'No account found with this email';
                        break;
                    case 'auth/wrong-password':
                        errorMessage += 'Incorrect password';
                        break;
                    default:
                        errorMessage += error.message;
                }
                
                alert(errorMessage);

                // Reset button
                loginBtn.textContent = originalText;
                loginBtn.disabled = false;
            });
    });

    // Google login handler with FIREBASE
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', function() {
            // Show loading state
            const originalText = googleLoginBtn.textContent;
            googleLoginBtn.textContent = 'Connecting...';
            googleLoginBtn.disabled = true;

            const provider = new firebase.auth.GoogleAuthProvider();
            
            // Add scopes if needed
            provider.addScope('email');
            provider.addScope('profile');

            firebase.auth().signInWithPopup(provider)
                .then((result) => {
                    const user = result.user;

                    // Store user data
                    localStorage.setItem('userRole', 'instructor');
                    localStorage.setItem('userName', user.displayName || 'Google User');
                    localStorage.setItem('userEmail', user.email);
                    localStorage.setItem('userId', user.uid);

                    console.log('Google login successful, redirecting to dashboard...');
                    window.location.href = 'dashboard.html';
                })
                .catch((error) => {
                    console.error('Google login error:', error);
                    
                    let errorMessage = 'Google login failed: ';
                    if (error.code === 'auth/popup-closed-by-user') {
                        errorMessage += 'Popup was closed before completing login';
                    } else {
                        errorMessage += error.message;
                    }
                    
                    alert(errorMessage);

                    // Reset button
                    googleLoginBtn.textContent = originalText;
                    googleLoginBtn.disabled = false;
                });
        });
    }

    // Facebook login handler with FIREBASE
    if (facebookLoginBtn) {
        facebookLoginBtn.addEventListener('click', function() {
            // Show loading state
            const originalText = facebookLoginBtn.textContent;
            facebookLoginBtn.textContent = 'Connecting...';
            facebookLoginBtn.disabled = true;

            const provider = new firebase.auth.FacebookAuthProvider();
            provider.addScope('email');
            provider.addScope('public_profile');

            firebase.auth().signInWithPopup(provider)
                .then((result) => {
                    const user = result.user;

                    // Store user data
                    localStorage.setItem('userRole', 'admin');
                    localStorage.setItem('userName', user.displayName || 'Facebook User');
                    localStorage.setItem('userEmail', user.email);
                    localStorage.setItem('userId', user.uid);

                    console.log('Facebook login successful, redirecting to dashboard...');
                    window.location.href = 'dashboard.html';
                })
                .catch((error) => {
                    console.error('Facebook login error:', error);
                    
                    let errorMessage = 'Facebook login failed: ';
                    if (error.code === 'auth/popup-closed-by-user') {
                        errorMessage += 'Popup was closed before completing login';
                    } else if (error.code === 'auth/account-exists-with-different-credential') {
                        errorMessage += 'An account already exists with the same email address';
                    } else {
                        errorMessage += error.message;
                    }
                    
                    alert(errorMessage);

                    // Reset button
                    facebookLoginBtn.textContent = originalText;
                    facebookLoginBtn.disabled = false;
                });
        });
    }

    // Handle signup form submission with FIREBASE
    signupForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const fullName = document.getElementById('fullName').value;
        const email = document.getElementById('email').value;
        const username = document.getElementById('signupUsername').value;
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const role = document.getElementById('signupRole').value;

        // Validation
        if (!fullName || !email || !username || !password || !confirmPassword || !role) {
            alert('Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            alert('Password must be at least 6 characters long');
            return;
        }

        // Show loading state
        const signupBtn = signupForm.querySelector('.btn-primary');
        const originalText = signupBtn.textContent;
        signupBtn.textContent = 'Creating Account...';
        signupBtn.disabled = true;

        // Firebase create user
        firebase.auth().createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Store user data
                localStorage.setItem('userRole', role);
                localStorage.setItem('userName', fullName);
                localStorage.setItem('userEmail', email);
                localStorage.setItem('userId', userCredential.user.uid);

                alert(`Account created successfully! Welcome ${fullName}`);
                console.log('Firebase signup successful, redirecting to dashboard...');
                window.location.href = 'dashboard.html';
            })
            .catch((error) => {
                console.error('Signup error:', error);
                
                let errorMessage = 'Signup failed: ';
                switch (error.code) {
                    case 'auth/email-already-in-use':
                        errorMessage += 'This email is already registered';
                        break;
                    case 'auth/invalid-email':
                        errorMessage += 'Invalid email address';
                        break;
                    case 'auth/operation-not-allowed':
                        errorMessage += 'Email/password accounts are not enabled';
                        break;
                    case 'auth/weak-password':
                        errorMessage += 'Password is too weak';
                        break;
                    default:
                        errorMessage += error.message;
                }
                
                alert(errorMessage);

                // Reset button
                signupBtn.textContent = originalText;
                signupBtn.disabled = false;
            });
    });

    // Google signup handler with FIREBASE
    if (googleSignupBtn) {
        googleSignupBtn.addEventListener('click', function() {
            // Show loading state
            const originalText = googleSignupBtn.textContent;
            googleSignupBtn.textContent = 'Creating Account...';
            googleSignupBtn.disabled = true;

            const provider = new firebase.auth.GoogleAuthProvider();
            provider.addScope('email');
            provider.addScope('profile');

            firebase.auth().signInWithPopup(provider)
                .then((result) => {
                    const user = result.user;

                    // Store user data
                    localStorage.setItem('userRole', 'instructor');
                    localStorage.setItem('userName', user.displayName || 'Google User');
                    localStorage.setItem('userEmail', user.email);
                    localStorage.setItem('userId', user.uid);

                    alert('Google account created successfully!');
                    console.log('Google signup successful, redirecting to dashboard...');
                    window.location.href = 'dashboard.html';
                })
                .catch((error) => {
                    console.error('Google signup error:', error);
                    
                    let errorMessage = 'Google signup failed: ';
                    if (error.code === 'auth/popup-closed-by-user') {
                        errorMessage += 'Popup was closed before completing signup';
                    } else {
                        errorMessage += error.message;
                    }
                    
                    alert(errorMessage);

                    // Reset button
                    googleSignupBtn.textContent = originalText;
                    googleSignupBtn.disabled = false;
                });
        });
    }

    // Facebook signup handler with FIREBASE
    if (facebookSignupBtn) {
        facebookSignupBtn.addEventListener('click', function() {
            // Show loading state
            const originalText = facebookSignupBtn.textContent;
            facebookSignupBtn.textContent = 'Creating Account...';
            facebookSignupBtn.disabled = true;

            const provider = new firebase.auth.FacebookAuthProvider();
            provider.addScope('email');
            provider.addScope('public_profile');

            firebase.auth().signInWithPopup(provider)
                .then((result) => {
                    const user = result.user;

                    // Store user data
                    localStorage.setItem('userRole', 'admin');
                    localStorage.setItem('userName', user.displayName || 'Facebook User');
                    localStorage.setItem('userEmail', user.email);
                    localStorage.setItem('userId', user.uid);

                    alert('Facebook account created successfully!');
                    console.log('Facebook signup successful, redirecting to dashboard...');
                    window.location.href = 'dashboard.html';
                })
                .catch((error) => {
                    console.error('Facebook signup error:', error);
                    
                    let errorMessage = 'Facebook signup failed: ';
                    if (error.code === 'auth/popup-closed-by-user') {
                        errorMessage += 'Popup was closed before completing signup';
                    } else if (error.code === 'auth/account-exists-with-different-credential') {
                        errorMessage += 'An account already exists with the same email address';
                    } else {
                        errorMessage += error.message;
                    }
                    
                    alert(errorMessage);

                    // Reset button
                    facebookSignupBtn.textContent = originalText;
                    facebookSignupBtn.disabled = false;
                });
        });
    }
});