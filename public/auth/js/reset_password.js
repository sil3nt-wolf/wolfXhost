document.addEventListener('DOMContentLoaded', () => {
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    const resetEmailInput = document.getElementById('resetEmail');
    const requestResetButton = document.getElementById('requestResetButton');
    const verificationForm = document.getElementById('verificationForm');
    const verifyResetCodeButton = document.getElementById('verifyResetCodeButton');
    const passwordStep = document.getElementById('passwordStep');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const resetPasswordButton = document.getElementById('resetPasswordButton');

    resetPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = resetEmailInput.value.trim();

        if (!email) {
            showToast('Please enter a valid email address', 'error');
            return;
        }

        requestResetButton.disabled = true;
        requestResetButton.innerHTML = 'Sending... <div class="loading"></div>';

        try {
            const response = await fetch('/request-password-reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (response.ok) {
                showToast(data.message, 'success');
                resetPasswordForm.style.display = 'none';
                verificationForm.style.display = 'block';
                setupVerificationInputs();
            } else {
                showToast(data.message || 'Failed to send verification code', 'error');
                requestResetButton.disabled = false;
                requestResetButton.textContent = 'Send Reset Code';
            }
        } catch (error) {
            showToast('An error occurred. Please try again.', 'error');
            requestResetButton.disabled = false;
            requestResetButton.textContent = 'Send Reset Code';
        }
    });

    verifyResetCodeButton.addEventListener('click', async () => {
        const inputs = document.querySelectorAll('.verification-input');
        let code = '';
        inputs.forEach((input) => {
            code += input.value;
        });

        if (code.length !== 6) {
            showToast('Please enter the complete verification code', 'error');
            return;
        }

        verifyResetCodeButton.disabled = true;
        verifyResetCodeButton.innerHTML = 'Verifying... <div class="loading"></div>';

        try {
            const email = resetEmailInput.value.trim();
            const response = await fetch('/verify-reset-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code })
            });

            const data = await response.json();

            if (response.ok) {
                showToast(data.message, 'success');
                verificationForm.style.display = 'none';
                passwordStep.style.display = 'block';
            } else {
                showToast(data.message || 'Verification failed', 'error');
                inputs.forEach(input => input.value = '');
                inputs[0].focus();
                verifyResetCodeButton.disabled = false;
                verifyResetCodeButton.textContent = 'Verify Code';
            }
        } catch (error) {
            showToast('An error occurred during verification', 'error');
            verifyResetCodeButton.disabled = false;
            verifyResetCodeButton.textContent = 'Verify Code';
        }
    });

    resetPasswordButton.addEventListener('click', async () => {
        const newPassword = newPasswordInput.value.trim();
        const confirmPassword = confirmPasswordInput.value.trim();

        if (newPassword !== confirmPassword) {
            showToast('Passwords do not match', 'error');
            return;
        }

        
        if (newPassword.length < 8) {
            showToast('Password must be at least 8 characters long', 'error');
            return;
        }

        resetPasswordButton.disabled = true;
        resetPasswordButton.innerHTML = 'Resetting... <div class="loading"></div>';

        try {
            const email = resetEmailInput.value.trim();
            let code = '';
            document.querySelectorAll('.verification-input').forEach((input) => {
                code += input.value;
            });

            const response = await fetch('/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code, newPassword })
            });

            const data = await response.json();

            if (response.ok) {
                showToast('Password reset successful! Please login with your new password.', 'success');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
            } else {
                showToast(data.message, 'error');
                resetPasswordButton.disabled = false;
                resetPasswordButton.textContent = 'Reset Password';
            }
        } catch (error) {
            showToast('An error occurred. Please try again.', 'error');
            resetPasswordButton.disabled = false;
            resetPasswordButton.textContent = 'Reset Password';
        }
    });

    function setupVerificationInputs() {
        const inputs = document.querySelectorAll('.verification-input');

        inputs.forEach((input, index) => {
            input.value = '';

            input.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 1);
                if (e.target.value.length === 1) {
                    if (index < inputs.length - 1) {
                        inputs[index + 1].focus();
                    } else {
                        const verifyBtn = document.getElementById('verifyResetCodeButton');
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

            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const pastedData = e.clipboardData.getData('text')
                    .replace(/[^a-zA-Z0-9]/g, '')
                    .slice(0, inputs.length);

                if (pastedData.length > 0) {
                    inputs.forEach((input, i) => {
                        if (i < pastedData.length) {
                            input.value = pastedData[i];
                        }
                    });

                    const nextEmptyIndex = Array.from(inputs).findIndex(input => !input.value);
                    if (nextEmptyIndex === -1) {
                        const verifyBtn = document.getElementById('verifyResetCodeButton');
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

    
    function showToast(message, type) {
        
        let toast = document.querySelector('.toast-notification');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'toast-notification';
            document.body.appendChild(toast);
        }

        
        toast.textContent = message;
        toast.className = `toast-notification toast-${type}`;
        
        
        toast.style.display = 'block';
        
        
        setTimeout(() => {
            toast.style.display = 'none';
        }, 3000);
        
        
        console.log(`${type}: ${message}`);
    }

    
    window.toggleNewPassword = function() {
        newPasswordInput.type = newPasswordInput.type === 'password' ? 'text' : 'password';
    };

    window.toggleConfirmPassword = function() {
        confirmPasswordInput.type = confirmPasswordInput.type === 'password' ? 'text' : 'password';
    };
});