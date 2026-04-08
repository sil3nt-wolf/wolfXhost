
document.addEventListener('DOMContentLoaded', function() {
    const container = document.querySelector('body');
    const bodyChildren = Array.from(document.body.children);
    
    bodyChildren.forEach(child => {
        if (child.id !== 'instructionsModal' && child.id !== 'container') {
            container.appendChild(child);
        }
    });

    
    initializeEnvVars();
});


const defaultEnvVars = [
    {
        name: 'SESSION_ID',
        description: 'Your WhatsApp session ID for bot authentication'
    },
    {
        name: 'PREFIX',
        description: 'Command prefix for the bot (e.g., !, /, #)'
    },
    {
        name: 'OWNER_NUMBER',
        description: 'WhatsApp number of the bot owner (with country code)'
    }
];


function initializeEnvVars() {
    const envVarsContainer = document.getElementById('envVarsContainer');
    
    
    envVarsContainer.innerHTML = '';
    
    // Add default environment variables
    defaultEnvVars.forEach(envVar => {
        const container = document.createElement('div');
        container.className = 'env-var-group default-env';
        container.innerHTML = `
            <div class="inputs">
                <input type="text" value="${envVar.name}" readonly class="default-env-input">
                <input type="text" value="${envVar.description}" readonly class="default-env-input">
            </div>
            <small class="default-env-label">Required</small>
        `;
        envVarsContainer.appendChild(container);
    });

    
    addEmptyEnvVar();
}


const loadingScreen = document.getElementById('loading-screen');
loadingScreen.style.display = 'none';


const savedFormData = localStorage.getItem('botRequestFormData');
if (savedFormData) {
    const formData = JSON.parse(savedFormData);
    Object.keys(formData).forEach(key => {
        const input = document.getElementById(key);
        if (input) {
            input.value = formData[key];
        }
    });
}


function handleModalResponse(accepted) {
    const modal = document.getElementById('instructionsModal');
    const content = document.querySelector('.container');
    
    if (accepted) {
        modal.style.display = 'none';
        content.style.display = 'block';
    } else {
        window.location.href = '/dashboard';
    }
}


function showNotification(message, type = 'success') {
    
    const existingNotifications = document.querySelectorAll('.success-message, .error-message');
    existingNotifications.forEach(notification => notification.remove());

    
    const notification = document.createElement('div');
    notification.className = type === 'success' ? 'success-message' : 'error-message';
    
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <div class="message-content">${message}</div>
        <button class="close-notification" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    document.body.appendChild(notification);

    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
}


function addEmptyEnvVar() {
    const container = document.createElement('div');
    container.className = 'env-var-group custom-env';
    container.innerHTML = `
        <button type="button" class="remove-env" onclick="this.parentElement.remove()">×</button>
        <div class="inputs">
            <input type="text" placeholder="Variable Name (e.g., API_KEY)" required>
            <input type="text" placeholder="Description of this variable" required>
        </div>
    `;
    document.getElementById('envVarsContainer').appendChild(container);
}


document.getElementById('addEnvVar').addEventListener('click', addEmptyEnvVar);


function validateRepoUrl(url) {
    const urlRegex = /^[a-zA-Z0-9-]+\/[a-zA-Z0-9-_.]+$/;
    return urlRegex.test(url);
}


document.getElementById('botRequestForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const botName = document.getElementById('botName').value;
    const repoUrl = document.getElementById('repoUrl').value;
    const deploymentCost = document.getElementById('deploymentCost').value;
    const websiteUrl = document.getElementById('websiteUrl').value;

    
    if (!validateRepoUrl(repoUrl)) {
        showNotification('Please enter a valid repository URL format (username/repository)', 'error');
        return;
    }

    
    const envVars = [];
    
    
    document.querySelectorAll('.env-var-group.default-env').forEach(group => {
        const inputs = group.getElementsByTagName('input');
        envVars.push({
            name: inputs[0].value,
            description: inputs[1].value,
            required: true
        });
    });

    
    document.querySelectorAll('.env-var-group.custom-env').forEach(group => {
        const inputs = group.getElementsByTagName('input');
        const name = inputs[0].value.trim();
        const description = inputs[1].value.trim();
        if (name && description) {
            envVars.push({
                name,
                description,
                required: false
            });
        }
    });

    
    if (envVars.length === defaultEnvVars.length) {
        showNotification('Please add at least one custom environment variable', 'error');
        return;
    }

    const data = {
        name: botName.trim(),
        repoUrl: repoUrl.trim(),
        deploymentCost: parseInt(deploymentCost),
        websiteUrl: websiteUrl.trim(),
        envVars
    };

    
    const loadingScreen = document.getElementById('loading-screen');
    loadingScreen.style.display = 'flex';

    try {
        const response = await fetch('/bot-request', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(await response.text());
        }

        const result = await response.json();
        showNotification('Bot request submitted successfully!', 'success');

        
        setTimeout(() => {
            resetForm();
        }, 3000);
    } catch (error) {
        showNotification(`Error submitting request: ${error.message}`, 'error');
    } finally {
        loadingScreen.style.display = 'none';
    }
});


function resetForm() {
    const form = document.getElementById('botRequestForm');
    form.reset();

    
    const envVarsContainer = document.getElementById('envVarsContainer');
    
    
    envVarsContainer.innerHTML = '';
    
    // Reinitialize with defaults and one empty custom var
    initializeEnvVars();

    // Clear local storage
    localStorage.removeItem('botRequestFormData');
}


document.getElementById('deploymentCost').addEventListener('input', function() {
    this.value = Math.max(0, Math.floor(this.value));
});


document.getElementById('websiteUrl').addEventListener('input', function() {
    if (this.value && !this.value.startsWith('http')) {
        this.value = 'https://' + this.value;
    }
});


const formInputs = document.querySelectorAll('input');
formInputs.forEach(input => {
    input.addEventListener('change', () => {
        const formData = {};
        formInputs.forEach(inp => {
            if (inp.id) {
                formData[inp.id] = inp.value;
            }
        });
        localStorage.setItem('botRequestFormData', JSON.stringify(formData));
    });
});


