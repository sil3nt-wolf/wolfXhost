


const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('loginEmail');
const submitButton = document.getElementById('submitButton');


function validateEmail(email) {
const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
return re.test(String(email).toLowerCase());
}


let isInCooldown = false;
const COOLDOWN_DURATION = 60000; 

loginForm.addEventListener('submit', async (e) => {
e.preventDefault();

submitButton.disabled = true;
submitButton.innerHTML = 'Logging in... <div class="loading"></div>';


const email = document.getElementById('phoneNumber').value.trim();
if (!validateEmail(email)) {
    showToast('Please enter a valid email address', 'error');
    submitButton.disabled = false;
    submitButton.textContent = 'Login';
    return;
}


sessionStorage.setItem('loginEmail', email);

const password = document.getElementById('password').value;

try {
    const response = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            identifier: email, 
            password: password 
        })
    });

    const data = await response.json();

    if (response.ok) {
        if (data.requireVerification) {
            showToast('Verification code sent', 'success');
            loginForm.style.display = 'none';
            document.getElementById('verificationForm').style.display = 'block';
            setupVerificationInputs();
        } else {
            showToast('Login successful! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1500);
        }
    } else {
        showToast(data.error || 'Login failed. Please try again.', 'error');
    }
} catch (error) {
    console.error('Error:', error);
    showToast('An error occurred. Please try again.', 'error');
} finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Login';
}
});
document.getElementById('verifyButton').addEventListener('click', async () => {
const inputs = document.querySelectorAll('.verification-input');
let code = '';
inputs.forEach((input) => {
    code += input.value;
});

if (code.length !== 6) {
    showToast('Please enter the complete verification code', 'error');
    return;
}

const verifyButton = document.getElementById('verifyButton');
verifyButton.disabled = true;
verifyButton.innerHTML = 'Verifying... <div class="loading"></div>';


const loginEmail = sessionStorage.getItem('loginEmail');

if (!loginEmail) {
    showToast('Session expired. Please log in again.', 'error');
    window.location.reload();
    return;
}

try {
    const response = await fetch("/verify-device-login", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: loginEmail,
            code: code
        })
    });

    const data = await response.json();

    if (response.ok) {
        
        sessionStorage.removeItem('loginEmail');

        showToast('Login successful! Redirecting...', 'success');
        setTimeout(() => {
            window.location.href = '/dashboard';
        }, 1500);
    } else {
        showToast(data.message || 'Verification failed', 'error');
        inputs.forEach(input => input.value = '');
        inputs[0].focus();
    }
} catch (error) {
    console.error('Error:', error);
    showToast('An error occurred during verification', 'error');
} finally {
    verifyButton.disabled = false;
    verifyButton.textContent = 'Verify';
}
});


function setupVerificationInputs() {
const inputs = document.querySelectorAll('#verificationForm .verification-input');

inputs.forEach((input, index) => {
    
    input.value = '';

    // Handle input
    input.addEventListener('input', (e) => {
        

e.target.value = e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 1);
        
        if (e.target.value.length === 1) {
            if (index < inputs.length - 1) {
                inputs[index + 1].focus();
            } else {
                // All inputs filled, get verify button
                const verifyBtn = document.getElementById('verifyButton');
                if (verifyBtn) {
                    verifyBtn.focus();
                }
            }
        }
    });

    
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace') {
            if (e.target.value.length === 0 && index > 0) {
                inputs[index - 1].focus();
                inputs[index - 1].value = '';
            } else {
                e.target.value = '';
            }
            e.preventDefault();
        }
    });

    // Enhanced paste functionality
    input.addEventListener('paste', (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text')
            .replace(/[^a-zA-Z0-9]/g, '') 
            .slice(0, inputs.length); // Limit to input count
        
        if (pastedData.length > 0) {
            // Fill all inputs with pasted data
            inputs.forEach((input, i) => {
                if (i < pastedData.length) {
                    input.value = pastedData[i];
                }
            });
            
            // Focus the next empty input or the verify button
            const nextEmptyIndex = Array.from(inputs).findIndex(input => !input.value);
            if (nextEmptyIndex === -1) {
                // All inputs filled, focus verify button
                const verifyBtn = document.getElementById('verifyButton');
                if (verifyBtn) {
                    verifyBtn.focus();
                }
            } else {
                inputs[nextEmptyIndex].focus();
            }
        }
    });
});
}





window.addEventListener('unload', () => {

sessionStorage.removeItem('loginEmail');
});


const forgotPasswordLink = document.createElement('a');
const logo = document.querySelector('.logo');
const loginFooter  = document.querySelector('.login-footer');
forgotPasswordLink.href = '#';
forgotPasswordLink.className = 'forgot-password-link';
forgotPasswordLink.textContent = 'Forgot Password?';
document.querySelector('.form-group:last-of-type').appendChild(forgotPasswordLink);


forgotPasswordLink.addEventListener('click', (e) => {
    e.preventDefault();
    logo.style.display = 'none';
    loginFooter.style.display = 'block';
    loginForm.style.display = 'none';
    document.getElementById('resetPasswordContainer').style.display = 'block';
});


document.getElementById('requestResetButton').addEventListener('click', async () => {
    const requestButton = document.getElementById('requestResetButton');
    const emailInput = document.getElementById('resetEmail');
    const email = emailInput.value.trim();

    if (isInCooldown) {
        showToast('Please wait before requesting another code', 'error');
        return;
    }

    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showToast('Please enter a valid email address', 'error');
        return;
    }

    requestButton.disabled = true;
    requestButton.innerHTML = 'Sending... <div class="loading"></div>';

    try {
        const response = await fetch('/request-password-reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (response.ok) {
            showToast(data.message, 'success');
            document.getElementById('emailStep').style.display = 'none';
            document.getElementById('codeStep').style.display = 'block';
            setupVerificationInputs('#codeStep');
            startCooldown(requestButton);
        } else {
            showToast(data.message || 'Failed to send verification code', 'error');
            requestButton.disabled = false;
            requestButton.textContent = 'Send Code';
        }
    } catch (error) {
        showToast('An error occurred. Please try again.', 'error');
        requestButton.disabled = false;
        requestButton.textContent = 'Send Code';
    }
});

document.getElementById('verifyResetCodeButton').addEventListener('click', async () => {
    const emailInput = document.getElementById('resetEmail');
    const email = emailInput.value.trim();
    const inputs = document.querySelectorAll('#codeStep .verification-input');
    let code = '';

    inputs.forEach((input) => {
        code += input.value;
    });

    if (code.length !== 6) { // Assuming 6-digit verification code
        showToast('Please enter the complete verification code', 'error');
        return;
    }

    const verifyButton = document.getElementById('verifyResetCodeButton');
    verifyButton.disabled = true;
    verifyButton.innerHTML = 'Verifying... <div class="loading"></div>';

    try {
        const response = await fetch('/verify-reset-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code })
        });

        const data = await response.json();

        if (response.ok) {
            showToast(data.message, 'success');
            document.getElementById('codeStep').style.display = 'none';
            document.getElementById('passwordStep').style.display = 'block';
        } else {
            showToast(data.message || 'Verification failed', 'error');
            inputs.forEach(input => input.value = '');
            inputs[0].focus();
        }
    } catch (error) {
        showToast('An error occurred during verification', 'error');
    } finally {
        verifyButton.disabled = false;
        verifyButton.textContent = 'Verify';
    }
});


document.getElementById('resetPasswordButton').addEventListener('click', async () => {
    const emailInput = document.getElementById('resetEmail');
    const email = emailInput.value.trim();
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    let code = '';
    document.querySelectorAll('#codeStep .verification-input').forEach((input) => {
        code += input.value;
    });

    if (newPassword !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }

    
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
        showToast('Password must be at least 8 characters long and include lowercase, uppercase, numbers, and symbols', 'error');
        return;
    }

    try {
        const response = await fetch('/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code, newPassword })
        });

        const data = await response.json();

        if (response.ok) {
            showToast('Password reset successful! Please login with your new password.', 'success');
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        showToast('An error occurred. Please try again.', 'error');
    }
});


document.addEventListener('DOMContentLoaded', () => {
    
    setupVerificationInputs('#verificationForm');
});


window.addEventListener('unload', () => {
    storedPassword = '';
});


// Check login status on page load
async function checkLogin() {
    try {
        const response = await fetch('/check-login');
        if (response.ok) {
            window.location.href = '/dashboard';
        }
    } catch (error) {
        console.log('Not logged in');
    }
}

checkLogin();