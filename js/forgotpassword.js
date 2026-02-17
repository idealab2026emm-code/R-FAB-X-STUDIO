// Password toggle functionality
const toggleNewPassword = document.getElementById('toggleNewPassword');
const toggleConfirmNewPassword = document.getElementById('toggleConfirmNewPassword');
const newPasswordInput = document.getElementById('newPassword');
const confirmNewPasswordInput = document.getElementById('confirmNewPassword');

if (toggleNewPassword) {
    toggleNewPassword.addEventListener('click', () => {
        const type = newPasswordInput.type === 'password' ? 'text' : 'password';
        newPasswordInput.type = type;
        toggleNewPassword.querySelector('i').classList.toggle('fa-eye');
        toggleNewPassword.querySelector('i').classList.toggle('fa-eye-slash');
    });
}

if (toggleConfirmNewPassword) {
    toggleConfirmNewPassword.addEventListener('click', () => {
        const type = confirmNewPasswordInput.type === 'password' ? 'text' : 'password';
        confirmNewPasswordInput.type = type;
        toggleConfirmNewPassword.querySelector('i').classList.toggle('fa-eye');
        toggleConfirmNewPassword.querySelector('i').classList.toggle('fa-eye-slash');
    });
}

// Store verified email
let verifiedEmail = '';

// Show status message
function showMessage(messageId, message, type) {
    const statusMessage = document.getElementById(messageId);
    statusMessage.textContent = message;
    statusMessage.className = `status-message show ${type}`;

    setTimeout(() => {
        statusMessage.classList.remove('show');
    }, 5000);
}

// Step 1: Email Verification Form
document.getElementById('emailVerificationForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();

    if (!email) {
        showMessage('statusMessage', 'Please enter your email address', 'error');
        return;
    }

    try {
        const response = await fetch('http://localhost:5000/api/verify-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (response.ok) {
            // Email exists in database
            verifiedEmail = email;
            showMessage('statusMessage', 'Email verified! Please enter your new password.', 'success');

            // Hide email verification form and show password reset form
            setTimeout(() => {
                document.getElementById('emailVerificationForm').style.display = 'none';
                document.getElementById('resetPasswordForm').style.display = 'flex';
            }, 1500);
        } else {
            showMessage('statusMessage', data.error || 'Email not found in our records', 'error');
        }
    } catch (error) {
        console.error('Email verification error:', error);
        showMessage('statusMessage', 'Network error. Please check your connection and try again.', 'error');
    }
});

// Step 2: Reset Password Form
document.getElementById('resetPasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;

    // Validate password match
    if (newPassword !== confirmNewPassword) {
        showMessage('resetStatusMessage', 'Passwords do not match', 'error');
        return;
    }

    // Validate password strength
    if (newPassword.length < 6) {
        showMessage('resetStatusMessage', 'Password must be at least 6 characters long', 'error');
        return;
    }

    try {
        const response = await fetch('http://localhost:5000/api/reset-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: verifiedEmail,
                newPassword
            })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('resetStatusMessage', 'Password reset successfully! Redirecting to login...', 'success');

            // Redirect to login page after 2 seconds
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else {
            showMessage('resetStatusMessage', data.error || 'Failed to reset password. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Password reset error:', error);
        showMessage('resetStatusMessage', 'Network error. Please check your connection and try again.', 'error');
    }
});
