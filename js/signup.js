// ==================== EMAIL VALIDATION ====================
function validateEmail(email) {
    const emailPattern = /^[a-zA-Z0-9._-]+@rathinam\.in$/;
    return emailPattern.test(email);
}

// ==================== SHOW MESSAGES ====================
function showMessage(message, type) {
    const el = document.getElementById('statusMessage');
    el.textContent = message;
    el.className = `status-message show ${type}`;
    // Auto-hide after 5 seconds if multiple errors occur
    setTimeout(() => {
        if (el.className.includes(type)) el.classList.remove('show');
    }, 5000);
}

// ==================== PASSWORD TOGGLE ====================
document.getElementById('togglePassword').addEventListener('click', () => {
    const passwordInput = document.getElementById('password');
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    document.getElementById('togglePassword').querySelector('i').classList.toggle('fa-eye');
    document.getElementById('togglePassword').querySelector('i').classList.toggle('fa-eye-slash');
});

document.getElementById('toggleConfirmPassword').addEventListener('click', () => {
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const type = confirmPasswordInput.type === 'password' ? 'text' : 'password';
    confirmPasswordInput.type = type;
    document.getElementById('toggleConfirmPassword').querySelector('i').classList.toggle('fa-eye');
    document.getElementById('toggleConfirmPassword').querySelector('i').classList.toggle('fa-eye-slash');
});

// ==================== REAL-TIME EMAIL VALIDATION ====================
document.getElementById('email').addEventListener('blur', function () {
    const email = this.value.trim();
    if (email && !validateEmail(email)) {
        showMessage('Email must end with @rathinam.in', 'error');
    }
});

// ==================== HANDLE FORM SUBMISSION ====================
document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullname = document.getElementById('fullname').value.trim();
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const rollno = document.getElementById('rollno').value.trim();
    const department = document.getElementById('department').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validate fields
    if (!fullname || !username || !email || !rollno || !department || !password) {
        showMessage('All fields are required', 'error');
        return;
    }

    if (!validateEmail(email)) {
        showMessage('Email must be a valid @rathinam.in college email', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showMessage('Passwords do not match', 'error');
        return;
    }

    if (password.length < 6) {
        showMessage('Password must be at least 6 characters long', 'error');
        return;
    }

    const signupBtn = document.getElementById('signupBtn');
    signupBtn.disabled = true;
    const originalBtnText = signupBtn.querySelector('.button-text').textContent;
    signupBtn.querySelector('.button-text').textContent = 'Creating Account...';

    try {
        const response = await fetch('/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                fullname,
                username,
                rollno,
                department,
                password
            })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('Account created successfully! Redirecting to login...', 'success');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else {
            showMessage(data.error || 'Signup failed. Please try again.', 'error');
            signupBtn.disabled = false;
            signupBtn.querySelector('.button-text').textContent = originalBtnText;
        }
    } catch (error) {
        console.error('Signup error:', error);
        showMessage('Network error. Please try again.', 'error');
        signupBtn.disabled = false;
        signupBtn.querySelector('.button-text').textContent = originalBtnText;
    }
});
