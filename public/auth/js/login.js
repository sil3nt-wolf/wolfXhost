
function validateEmail(email) {
const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
return re.test(String(email).toLowerCase());
}




const loginForm = document.getElementById('loginForm');
const identifierInput = document.getElementById('loginIdentifier'); 
const submitButton = document.getElementById('submitButton');


let isInCooldown = false;
const COOLDOWN_DURATION = 60000; 

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    submitButton.disabled = true;
    submitButton.innerHTML = 'Logging in... <div class="loading"></div>';

    const identifier = identifierInput.value.trim();
    if (!identifier) {
        showToast('Please enter an email address or username', 'error');
        submitButton.disabled = false;
        submitButton.textContent = 'Login';
        return;
    }

    
    sessionStorage.setItem('loginIdentifier', identifier);

    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                identifier: identifier,
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
                    window.location.href = '/dashboard/';
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

    
    const loginIdentifier = sessionStorage.getItem('loginIdentifier');

    if (!loginIdentifier) {
        showToast('Session expired. Please log in again.', 'error');
        window.location.reload();
        return;
    }

    try {
        const response = await fetch("/verify-device-login", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                identifier: loginIdentifier,
                code: code
            })
        });

        const data = await response.json();

        if (response.ok) {
            
            sessionStorage.removeItem('loginIdentifier');

            showToast('Login successful! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = '/dashboard/';
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
    window.location.href = '/auth/reset-password'
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
            window.location.href = '/dashboard/';
        }
    } catch (error) {
        console.log('Not logged in');
    }
}

checkLogin();