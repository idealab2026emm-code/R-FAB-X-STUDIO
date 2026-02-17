console.log('📝 Register Page Loaded');

// CHECK ADMIN
window.addEventListener('load', function () {
  console.log('✓ Checking authentication...');
  const user = localStorage.getItem('user');
  if (!user) {
    console.log('❌ No user found');
    window.location.href = 'login.html';
    return;
  }
  const userData = JSON.parse(user);
  if (userData.role !== 'admin') {
    console.log('❌ Not admin');
    alert('Admin access required');
    window.location.href = 'login.html';
    return;
  }
  console.log('✅ Admin verified');
});

// SUBMIT FORM
async function handleSubmit(event) {
  event.preventDefault();
  console.log('📝 Form submitted');

  const username = document.getElementById('username').value;
  const mail = document.getElementById('mail').value;
  const password = document.getElementById('password').value;
  const fullname = document.getElementById('fullname').value;
  const rollno = document.getElementById('rollno').value;
  const department = document.getElementById('department').value;

  console.log('📋 Data:', { username, mail, fullname, rollno, department });

  try {
    console.log('📤 Sending request...');
    const res = await fetch('http://localhost:5000/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, mail, password, fullname, rollno, department })
    });

    console.log('✓ Response status:', res.status);
    const data = await res.json();
    console.log('✓ Response data:', data);

    if (res.ok) {
      console.log('✅ User registered successfully');
      showMessage('✅ User registered successfully!', 'success');
      document.getElementById('form').reset();
      setTimeout(() => {
        console.log('📍 Redirecting to admin home...');
        window.location.href = 'adminhome.html';
      }, 1500);
    } else {
      console.log('❌ Error:', data.message);
      showMessage('❌ ' + data.message, 'error');
    }
  } catch (e) {
    console.error('❌ Error:', e);
    showMessage('❌ Error: ' + e.message, 'error');
  }
}

// SHOW MESSAGE
function showMessage(msg, type) {
  console.log('[' + type.toUpperCase() + ']', msg);
  const el = document.getElementById('message');
  el.textContent = msg;
  el.className = 'message show ' + type;
}

// GO BACK
function goBack() {
  console.log('⬅️ Going back...');
  window.location.href = 'adminhome.html';
}

// TOGGLE PASSWORD VISIBILITY
function togglePassword() {
  const passwordInput = document.getElementById('password');
  const toggleIcon = document.getElementById('passwordToggle');

  if (passwordInput.type === 'password') {
    passwordInput.type = 'text';
    toggleIcon.classList.remove('fa-eye-slash');
    toggleIcon.classList.add('fa-eye');
  } else {
    passwordInput.type = 'password';
    toggleIcon.classList.remove('fa-eye');
    toggleIcon.classList.add('fa-eye-slash');
  }
}

console.log('✅ Register Page Ready!');