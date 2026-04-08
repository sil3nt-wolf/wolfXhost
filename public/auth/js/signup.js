const verificationForm = document.getElementById('verificationForm');
const emailInput = document.getElementById('email');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const submitButton = document.getElementById('submitButton');
const verifyButton = document.getElementById('verifyButton');
const resendCodeLink = document.getElementById('resendCode');
const themeToggle = document.getElementById('themeToggle');
const themeToggleMobile = document.getElementById('themeToggle-mobile');

const root = document.documentElement;

function setTheme(theme) {
root.setAttribute('data-theme', theme);
localStorage.setItem('theme', theme);
themeToggle.innerHTML = theme === 'dark'
    ? '<i class="fas fa-sun"></i>'
    : '<i class="fas fa-moon"></i>';
}



document.addEventListener('DOMContentLoaded', () => {
const savedTheme = localStorage.getItem('theme') || 'light';
setTheme(savedTheme);
});

themeToggle.addEventListener('click', () => {
const currentTheme = root.getAttribute('data-theme');
setTheme(currentTheme === 'dark' ? 'light' : 'dark');
});
themeToggleMobile.addEventListener('click', () => {
const currentTheme = root.getAttribute('data-theme');
setTheme(currentTheme === 'dark' ? 'light' : 'dark');
});

const mobileMenuButton = document.getElementById('mobile-menu-button');
const mobileMenuClose = document.getElementById('mobile-menu-close');
const mobileMenu = document.getElementById('mobile-menu');
const menuContent = document.querySelector('.menu-content');


function toggleMobileMenu(show) {
if (show) {
    mobileMenu.classList.remove('hidden');
    setTimeout(() => {
        mobileMenu.classList.add('menu-overlay', 'active');

    }, 10);
    
} else {
    mobileMenu.classList.remove('active');

    setTimeout(() => {
        mobileMenu.classList.add('hidden');
        document.body.style.overflow = '';
    }, 300);
}
}

if (mobileMenuButton) {
mobileMenuButton.addEventListener('click', () => toggleMobileMenu(true));
}

if (mobileMenuClose) {
mobileMenuClose.addEventListener('click', () => toggleMobileMenu(false));
}


if (mobileMenu) {
mobileMenu.addEventListener('click', (e) => {
    if (e.target === mobileMenu) {
        toggleMobileMenu(false);
    }
});
}


document.querySelectorAll('a[href^="#"]').forEach(anchor => {
anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
        
        toggleMobileMenu(false);

        
        target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
});
});

function getUrlParameter(name) {
const urlParams = new URLSearchParams(window.location.search);
return urlParams.get(name);
}

let resendTimeout = 60;


    document.addEventListener('DOMContentLoaded', function () {
        const referralCode = getUrlParameter('ref');
        if (referralCode) {
            
            showToast(`Signup with referral code: ${referralCode}`, 'info');
            document.getElementById('registerForm').dataset.referralCode = referralCode;
        }



setupPasswordStrengthMeter();
setupVerificationInputs();
});
const countrySelect = document.getElementById('country');



function populateCountries(userCountry = '') {
    fetch('/api/countries')
        .then(response => response.json())
        .then(countries => {
            countrySelect.innerHTML = '';  // Clear existing options
            countries.forEach(country => {
                const option = document.createElement('option');
                option.value = country;
                option.textContent = country;
                countrySelect.appendChild(option);
                
                if (country === userCountry) {
                    option.selected = true;
                }
            });
        })
        .catch(error => console.error('Error fetching countries:', error));
}




fetch('https://ipapi.co/json/')
    .then(response => response.json())
    .then(data => {
        const userCountry = data.country_name;
        populateCountries(userCountry);  
    })
    .catch(error => {
        console.error('Error getting geolocation:', error);
        populateCountries();  
    });


function debounce(func, wait) {
let timeout;
return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
};
}


function setupUsernameValidation() {
const usernameInput = document.getElementById('username');
const usernameStatus = document.getElementById('usernameStatus');

const checkUsernameAvailability = async (username) => {
    try {
        const response = await fetch(`/check-username?username=${encodeURIComponent(username)}`);
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message);
        }
        
        return data;
    } catch (error) {
        console.error('Error checking username:', error);
        throw error;
    }
};

const validateUsername = async (username) => {
    
    usernameStatus.textContent = '';
    
    // Basic validation checks
    if (username.length < 3) {
        usernameStatus.textContent = 'Username must be at least 3 characters';
        usernameStatus.style.color = 'red';
        return;
    }

    if (username.length > 15) {
        usernameStatus.textContent = 'Username must be max 15 characters';
        usernameStatus.style.color = 'red';
        return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        usernameStatus.textContent = 'Username can only contain letters, numbers, and underscores';
        usernameStatus.style.color = 'red';
        return;
    }

    
    usernameStatus.textContent = 'Checking availability...';
    usernameStatus.style.color = '#666';

    try {
        const result = await checkUsernameAvailability(username);
        
        if (result.isAvailable) {
            usernameStatus.textContent = 'Username is available!';
            usernameStatus.style.color = 'green';
        } else {
            usernameStatus.textContent = 'Username is already taken';
            usernameStatus.style.color = 'red';
        }
    } catch (error) {
        usernameStatus.textContent = 'Error checking username availability';
        usernameStatus.style.color = 'red';
    }
};


const debouncedValidation = debounce((username) => {
    validateUsername(username);
}, 500);


usernameInput.addEventListener('input', function() {
    const username = this.value.trim();
    
    if (username) {
        debouncedValidation(username);
    } else {
        usernameStatus.textContent = '';
    }
});
}



// Flag to track submission state
let isSubmitting = false;

registerForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    
    if (isSubmitting) {
        return; 
    }

    const email = emailInput.value.trim();
    const username = usernameInput.value.trim();
    const country = countrySelect.value;
    const password = passwordInput.value;
    const referralCode = getUrlParameter('ref');

    
    if (!email || !username || !country || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }


    
    submitButton.disabled = true;
    isSubmitting = true;

    const loading = submitButton.querySelector('.loading');
    loading.style.display = 'inline-block';

    try {
        const response = await fetch('/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                password,
                country,
                username,
                referralCode,
            })
        });

        const data = await response.json();

        if (data.success) {
            
            registerForm.style.display = 'none';
            verificationForm.style.display = 'block';
            verificationForm.dataset.email = email;

            showToast(data.message, 'success');
            startResendTimer();
            focusFirstVerificationInput();
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        console.error('Signup error:', error);
        showToast('An error occurred during signup', 'error');
    } finally {
        
        submitButton.disabled = false;
        isSubmitting = false;
        loading.style.display = 'none';
    }
});



verifyButton.addEventListener('click', async function() {
    const email = verificationForm.dataset.email;
    
    
    let code = '';
    document.querySelectorAll('.verification-input').forEach(input => {
        code += input.value;
    });

    if (code.length !== 6) {
        showToast('Please enter the complete verification code', 'error');
        return;
    }


verifyButton.disabled = true;
const loading = verifyButton.querySelector('.loading');
loading.style.display = 'inline-block';

try {
const response = await fetch('/verify-signup', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        email,
        code
    })
});

const data = await response.json();

if (data.success) {
    if (data.banned) {
        
        showToast('We are having problem with your account, please contact support', 'error');
        setTimeout(() => {
            window.location.href = '/banned';
        }, 2000);
    } else {
        
        showToast('Account created successfully!', 'success');
        setTimeout(() => {
            window.location.href = '/dashboard/';
        }, 2000);
    }
} else {
    showToast(data.message || 'Verification failed', 'error');
    clearVerificationInputs();
}
} catch (error) {
console.error('Verification error:', error);
showToast('An error occurred during verification', 'error');
} finally {
verifyButton.disabled = false;
loading.style.display = 'none';
}})

function showToast(message, type) {
const toast = document.createElement('div');
toast.className = `toast ${type}`;
toast.textContent = message;
document.body.appendChild(toast);


setTimeout(() => toast.classList.add('show'), 10);


setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
}, 5000);
}
const verificationInputs = document.querySelectorAll('.verification-input');

function setupVerificationInputs() {
verificationInputs.forEach((input, index) => {
    
    input.value = '';

    // Handle input
    input.addEventListener('input', (e) => {
        if (e.target.value.length === 1) {
            if (index < verificationInputs.length - 1) {
                verificationInputs[index + 1].focus();
            } else {
                
                document.getElementById('verifyButton').click();
            }
        }
    });
    
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && e.target.value.length === 0 && index > 0) {
            verificationInputs[index - 1].focus();
        }
    });

    
    input.addEventListener('paste', (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, verificationInputs.length);
        [...pastedData].forEach((char, i) => {
            if (i < verificationInputs.length) {
                verificationInputs[i].value = char;
            }
        });
        if (pastedData.length === verificationInputs.length) {
            verifyButton.focus();
        }
    });
});
}





function setupPasswordStrengthMeter() {
const passwordInput = document.getElementById('password');
const strengthMeter = document.querySelector('.strength-meter-fill');

passwordInput.addEventListener('input', () => {
    const strength = calculatePasswordStrength(passwordInput.value);
    strengthMeter.style.width = `${strength}%`;

    if (strength < 33) {
        strengthMeter.style.backgroundColor = '#f87171';
    } else if (strength < 66) {
        strengthMeter.style.backgroundColor = '#fbbf24';
    } else {
        strengthMeter.style.backgroundColor = '#34d399';
    }
});
}


function calculatePasswordStrength(password) {
let strength = 0;
if (password.length >= 8) strength += 25;
if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength += 25;
if (password.match(/\d/)) strength += 25;
if (password.match(/[^a-zA-Z\d]/)) strength += 25;
return strength;
}

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

function togglePassword() {
const passwordInput = document.getElementById('password');
const toggle = document.querySelector('.password-toggle');

if (passwordInput.type === 'password') {
    passwordInput.type = 'text';
    toggle.textContent = '🔒';
} else {
    passwordInput.type = 'password';
    toggle.textContent = '👀';
}
}

resendCodeLink.addEventListener('click', async function() {
    const email = verificationForm.dataset.email;

    if (!email) {
        showToast('No email to resend verification to', 'error');
        return;
    }

    
    this.style.pointerEvents = 'none';
    this.style.opacity = '0.5';

    try {
        const response = await fetch('/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email
            })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Verification code resent successfully!', 'success');
            clearVerificationInputs();
            startResendTimer();
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        console.error('Resend error:', error);
        showToast('Failed to resend verification code', 'error');
    } finally {
        this.style.pointerEvents = 'auto';
        this.style.opacity = '1';
    }
});
function startResendTimer() {
let timeLeft = resendTimeout;
const resendButton = document.getElementById('resendCode');


resendButton.style.pointerEvents = 'none';
resendButton.style.opacity = '0.5';
resendButton.textContent = `Resend in ${timeLeft}s`;

const timer = setInterval(() => {
    timeLeft--;

    if (timeLeft <= 0) {
        clearInterval(timer);
        resendButton.style.pointerEvents = 'auto';
        resendButton.style.opacity = '1';
        resendButton.textContent = 'Resend code';
    } else {
        resendButton.textContent = `Resend in ${timeLeft}s`;
    }
}, 1000);
}


function clearVerificationInputs() {
const inputs = document.querySelectorAll('.verification-input');
inputs.forEach(input => {
    input.value = '';
});
// Focus the first input after clearing
if (inputs.length > 0) {
    inputs[0].focus();
}
}
function focusFirstVerificationInput() {
const firstInput = document.querySelector('.verification-input');
if (firstInput) {
    firstInput.focus();
}
}

document.addEventListener('DOMContentLoaded', function() {
setupUsernameValidation();

});
checkLogin()