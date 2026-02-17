// Password toggle functionality
const togglePassword = document.getElementById('togglePassword');
const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');

togglePassword.addEventListener('click', () => {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    togglePassword.querySelector('i').classList.toggle('fa-eye');
    togglePassword.querySelector('i').classList.toggle('fa-eye-slash');
});

toggleConfirmPassword.addEventListener('click', () => {
    const type = confirmPasswordInput.type === 'password' ? 'text' : 'password';
    confirmPasswordInput.type = type;
    toggleConfirmPassword.querySelector('i').classList.toggle('fa-eye');
    toggleConfirmPassword.querySelector('i').classList.toggle('fa-eye-slash');
});

// Email validation for @rathinam.in domain
function validateEmail(email) {
    const emailPattern = /^[a-zA-Z0-9._-]+@rathinam\.in$/;
    return emailPattern.test(email);
}

// Show status message
function showMessage(message, type) {
    const statusMessage = document.getElementById('statusMessage');
    statusMessage.textContent = message;
    statusMessage.className = `status-message show ${type}`;

    setTimeout(() => {
        statusMessage.classList.remove('show');
    }, 5000);
}

// Form submission handler
document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const fullname = document.getElementById('fullname').value.trim();
    const username = document.getElementById('username').value.trim();
    const rollno = document.getElementById('rollno').value.trim();
    const department = document.getElementById('department').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validate email domain
    if (!validateEmail(email)) {
        showMessage('Email must be a valid @rathinam.in address', 'error');
        return;
    }

    // Validate password match
    if (password !== confirmPassword) {
        showMessage('Passwords do not match', 'error');
        return;
    }

    // Validate password strength
    if (password.length < 6) {
        showMessage('Password must be at least 6 characters long', 'error');
        return;
    }

    // Prepare data for submission
    const userData = {
        email,
        fullname,
        username,
        rollno,
        department,
        password
    };

    try {
        const response = await fetch('http://localhost:5000/api/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('Account created successfully! Redirecting to login...', 'success');

            // Redirect to login page after 2 seconds
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else {
            showMessage(data.error || 'Failed to create account. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Signup error:', error);
        showMessage('Network error. Please check your connection and try again.', 'error');
    }
});

// Real-time email validation feedback
document.getElementById('email').addEventListener('blur', function () {
    const email = this.value.trim();
    if (email && !validateEmail(email)) {
        showMessage('Email must end with @rathinam.in', 'error');
    }
});
