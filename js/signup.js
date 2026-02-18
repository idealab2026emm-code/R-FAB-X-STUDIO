// ==================== STATE ====================
let currentEmail = '';
let countdownInterval = null;

// ==================== EMAIL VALIDATION ====================
function validateEmail(email) {
    const emailPattern = /^[a-zA-Z0-9._-]+@rathinam\.in$/;
    return emailPattern.test(email);
}

// ==================== SHOW MESSAGES ====================
function showStepMessage(elementId, message, type) {
    const el = document.getElementById(elementId);
    el.textContent = message;
    el.className = `status-message show ${type}`;
    setTimeout(() => { el.classList.remove('show'); }, 5000);
}

// ==================== STEP INDICATOR ====================
function setActiveStep(stepNum) {
    // Update step circles
    for (let i = 1; i <= 3; i++) {
        const indicator = document.getElementById(`stepIndicator${i}`);
        indicator.classList.remove('active', 'completed');

        if (i < stepNum) {
            indicator.classList.add('completed');
        } else if (i === stepNum) {
            indicator.classList.add('active');
        }
    }

    // Update step lines
    for (let i = 1; i <= 2; i++) {
        const line = document.getElementById(`stepLine${i}`);
        if (i < stepNum) {
            line.classList.add('active');
        } else {
            line.classList.remove('active');
        }
    }
}

// ==================== STEP 1: SEND OTP ====================
document.getElementById('sendOtpBtn').addEventListener('click', async () => {
    const email = document.getElementById('email').value.trim();

    // Validate email
    if (!email) {
        showStepMessage('step1StatusMessage', 'Please enter your college email address', 'error');
        return;
    }

    if (!validateEmail(email)) {
        showStepMessage('step1StatusMessage', 'Email must be a valid @rathinam.in college email', 'error');
        return;
    }

    const sendBtn = document.getElementById('sendOtpBtn');
    sendBtn.disabled = true;
    sendBtn.querySelector('.button-text').textContent = 'Sending OTP...';

    try {
        const response = await fetch('/api/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (response.ok) {
            currentEmail = email;
            showStep2(email);
        } else {
            showStepMessage('step1StatusMessage', data.error || 'Failed to send OTP. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Send OTP error:', error);
        showStepMessage('step1StatusMessage', 'Network error. Please check your connection.', 'error');
    } finally {
        sendBtn.disabled = false;
        sendBtn.querySelector('.button-text').textContent = 'Send Verification OTP';
    }
});

// Allow Enter key on email input
document.getElementById('email').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('sendOtpBtn').click();
    }
});

// ==================== SHOW STEP 2 (OTP SCREEN) ====================
function showStep2(email) {
    document.getElementById('step1Section').style.display = 'none';
    document.getElementById('step2Section').style.display = 'block';
    document.getElementById('step3Section').style.display = 'none';
    document.getElementById('otpEmailDisplay').textContent = email;

    setActiveStep(2);

    // Clear OTP inputs
    for (let i = 1; i <= 6; i++) {
        document.getElementById(`otpInput${i}`).value = '';
    }
    document.getElementById('otpInput1').focus();

    startCountdown();
}

// ==================== BACK TO STEP 1 ====================
document.getElementById('backToStep1').addEventListener('click', () => {
    document.getElementById('step1Section').style.display = 'block';
    document.getElementById('step2Section').style.display = 'none';
    document.getElementById('step3Section').style.display = 'none';
    setActiveStep(1);
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

// ==================== STEP 2: VERIFY OTP → GO TO STEP 3 ====================
document.getElementById('verifyOtpBtn').addEventListener('click', async () => {
    const otp = Array.from(otpInputs).map(i => i.value).join('');

    if (otp.length !== 6) {
        showStepMessage('otpStatusMessage', 'Please enter the complete 6-digit OTP', 'error');
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
            showStepMessage('otpStatusMessage', 'Email verified! Loading registration form...', 'success');
            if (countdownInterval) clearInterval(countdownInterval);

            // Short delay then show Step 3
            setTimeout(() => {
                showStep3(currentEmail);
            }, 1000);
        } else {
            showStepMessage('otpStatusMessage', data.error || 'Verification failed. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Verify OTP error:', error);
        showStepMessage('otpStatusMessage', 'Network error. Please try again.', 'error');
    } finally {
        verifyBtn.disabled = false;
        verifyBtn.querySelector('.button-text').textContent = 'Verify Email';
    }
});

// ==================== SHOW STEP 3 (DETAILS FORM) ====================
function showStep3(email) {
    document.getElementById('step1Section').style.display = 'none';
    document.getElementById('step2Section').style.display = 'none';
    document.getElementById('step3Section').style.display = 'block';
    document.getElementById('verifiedEmailText').textContent = email;

    setActiveStep(3);

    // Focus on the first field
    document.getElementById('fullname').focus();
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

// ==================== STEP 3: CREATE ACCOUNT ====================
document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullname = document.getElementById('fullname').value.trim();
    const username = document.getElementById('username').value.trim();
    const rollno = document.getElementById('rollno').value.trim();
    const department = document.getElementById('department').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validate fields
    if (!fullname || !username || !rollno || !department || !password) {
        showStepMessage('statusMessage', 'All fields are required', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showStepMessage('statusMessage', 'Passwords do not match', 'error');
        return;
    }

    if (password.length < 6) {
        showStepMessage('statusMessage', 'Password must be at least 6 characters long', 'error');
        return;
    }

    const signupBtn = document.getElementById('signupBtn');
    signupBtn.disabled = true;
    signupBtn.querySelector('.button-text').textContent = 'Creating Account...';

    try {
        const response = await fetch('/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: currentEmail,
                fullname,
                username,
                rollno,
                department,
                password
            })
        });

        const data = await response.json();

        if (response.ok) {
            showStepMessage('statusMessage', 'Account created successfully! Redirecting to login...', 'success');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else {
            showStepMessage('statusMessage', data.error || 'Signup failed. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Signup error:', error);
        showStepMessage('statusMessage', 'Network error. Please try again.', 'error');
    } finally {
        signupBtn.disabled = false;
        signupBtn.querySelector('.button-text').textContent = 'Create Account';
    }
});

// ==================== RESEND OTP ====================
document.getElementById('resendOtpBtn').addEventListener('click', async () => {
    const resendBtn = document.getElementById('resendOtpBtn');
    resendBtn.disabled = true;
    resendBtn.textContent = 'Sending...';

    try {
        const response = await fetch('/api/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: currentEmail })
        });

        const data = await response.json();

        if (response.ok) {
            showStepMessage('otpStatusMessage', 'New OTP sent to your college email!', 'success');
            startCountdown();
        } else {
            showStepMessage('otpStatusMessage', data.error || 'Failed to resend OTP.', 'error');
        }
    } catch (error) {
        showStepMessage('otpStatusMessage', 'Network error. Please try again.', 'error');
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
        showStepMessage('step1StatusMessage', 'Email must end with @rathinam.in', 'error');
    }
});
