// ==================== PASSWORD TOGGLE ====================
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

// ==================== EMAIL VALIDATION ====================
function validateEmail(email) {
    const emailPattern = /^[a-zA-Z0-9._-]+@rathinam\.in$/;
    return emailPattern.test(email);
}

// ==================== SHOW MESSAGES ====================
function showMessage(message, type) {
    const statusMessage = document.getElementById('statusMessage');
    statusMessage.textContent = message;
    statusMessage.className = `status-message show ${type}`;
    setTimeout(() => { statusMessage.classList.remove('show'); }, 5000);
}

function showOtpMessage(message, type) {
    const otpStatus = document.getElementById('otpStatusMessage');
    otpStatus.textContent = message;
    otpStatus.className = `status-message show ${type}`;
    setTimeout(() => { otpStatus.classList.remove('show'); }, 5000);
}

// ==================== STATE ====================
let currentEmail = '';
let countdownInterval = null;

// ==================== STEP 1: FORM SUBMIT → SEND OTP ====================
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

    const signupBtn = document.getElementById('signupBtn');
    signupBtn.disabled = true;
    signupBtn.querySelector('.button-text').textContent = 'Sending OTP...';

    try {
        const response = await fetch('/api/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, fullname, username, rollno, department, password })
        });

        const data = await response.json();

        if (response.ok) {
            currentEmail = email;
            showOtpScreen(email);
        } else {
            showMessage(data.error || 'Failed to send OTP. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Send OTP error:', error);
        showMessage('Network error. Please check your connection.', 'error');
    } finally {
        signupBtn.disabled = false;
        signupBtn.querySelector('.button-text').textContent = 'Create Account';
    }
});

// ==================== SHOW OTP SCREEN ====================
function showOtpScreen(email) {
    document.getElementById('signupForm').style.display = 'none';
    document.getElementById('otpSection').style.display = 'block';
    document.getElementById('otpEmailDisplay').textContent = email;

    // Clear OTP inputs
    for (let i = 1; i <= 6; i++) {
        document.getElementById(`otpInput${i}`).value = '';
    }
    document.getElementById('otpInput1').focus();

    startCountdown();
}

// ==================== BACK TO FORM ====================
document.getElementById('backToForm').addEventListener('click', () => {
    document.getElementById('signupForm').style.display = 'flex';
    document.getElementById('otpSection').style.display = 'none';
    if (countdownInterval) clearInterval(countdownInterval);
});

// ==================== OTP INPUT HANDLING ====================
const otpInputs = document.querySelectorAll('.otp-input');

otpInputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
        const val = e.target.value;
        // Only allow digits
        e.target.value = val.replace(/[^0-9]/g, '');

        if (e.target.value && index < otpInputs.length - 1) {
            otpInputs[index + 1].focus();
        }
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.value && index > 0) {
            otpInputs[index - 1].focus();
        }
    });

    // Handle paste
    input.addEventListener('paste', (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
        for (let i = 0; i < pasted.length && (index + i) < otpInputs.length; i++) {
            otpInputs[index + i].value = pasted[i];
        }
        const nextIndex = Math.min(index + pasted.length, otpInputs.length - 1);
        otpInputs[nextIndex].focus();
    });
});

// ==================== STEP 2: VERIFY OTP ====================
document.getElementById('verifyOtpBtn').addEventListener('click', async () => {
    const otp = Array.from(otpInputs).map(i => i.value).join('');

    if (otp.length !== 6) {
        showOtpMessage('Please enter the complete 6-digit OTP', 'error');
        return;
    }

    const verifyBtn = document.getElementById('verifyOtpBtn');
    verifyBtn.disabled = true;
    verifyBtn.querySelector('.button-text').textContent = 'Verifying...';

    try {
        const response = await fetch('/api/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: currentEmail, otp })
        });

        const data = await response.json();

        if (response.ok) {
            showOtpMessage('Account created successfully! Redirecting...', 'success');
            if (countdownInterval) clearInterval(countdownInterval);
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else {
            showOtpMessage(data.error || 'Verification failed. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Verify OTP error:', error);
        showOtpMessage('Network error. Please try again.', 'error');
    } finally {
        verifyBtn.disabled = false;
        verifyBtn.querySelector('.button-text').textContent = 'Verify & Create Account';
    }
});

// ==================== RESEND OTP ====================
document.getElementById('resendOtpBtn').addEventListener('click', async () => {
    const resendBtn = document.getElementById('resendOtpBtn');
    resendBtn.disabled = true;
    resendBtn.textContent = 'Sending...';

    try {
        // Re-collect form data
        const email = document.getElementById('email').value.trim();
        const fullname = document.getElementById('fullname').value.trim();
        const username = document.getElementById('username').value.trim();
        const rollno = document.getElementById('rollno').value.trim();
        const department = document.getElementById('department').value.trim();
        const password = document.getElementById('password').value;

        const response = await fetch('/api/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, fullname, username, rollno, department, password })
        });

        const data = await response.json();

        if (response.ok) {
            showOtpMessage('New OTP sent to your email!', 'success');
            startCountdown();
        } else {
            showOtpMessage(data.error || 'Failed to resend OTP.', 'error');
        }
    } catch (error) {
        showOtpMessage('Network error. Please try again.', 'error');
    } finally {
        resendBtn.disabled = false;
        resendBtn.innerHTML = '<i class="fas fa-redo"></i> Resend OTP';
    }
});

// ==================== COUNTDOWN TIMER ====================
function startCountdown() {
    const timerEl = document.getElementById('resendTimer');
    const countdownEl = document.getElementById('countdown');
    const resendBtn = document.getElementById('resendOtpBtn');

    timerEl.style.display = 'block';
    resendBtn.style.display = 'none';

    let seconds = 60;
    countdownEl.textContent = seconds;

    if (countdownInterval) clearInterval(countdownInterval);

    countdownInterval = setInterval(() => {
        seconds--;
        countdownEl.textContent = seconds;

        if (seconds <= 0) {
            clearInterval(countdownInterval);
            timerEl.style.display = 'none';
            resendBtn.style.display = 'inline-flex';
        }
    }, 1000);
}

// ==================== REAL-TIME EMAIL VALIDATION ====================
document.getElementById('email').addEventListener('blur', function () {
    const email = this.value.trim();
    if (email && !validateEmail(email)) {
        showMessage('Email must end with @rathinam.in', 'error');
    }
});
