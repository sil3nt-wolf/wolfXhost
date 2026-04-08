
document.addEventListener('DOMContentLoaded', () => {
    loadRequests();
    
    document.getElementById('statusFilter').addEventListener('change', loadRequests);
});

async function loadRequests() {
    const statusFilter = document.getElementById('statusFilter').value;
    const requestsList = document.getElementById('requestsList');
    requestsList.innerHTML = '<div class="loading">Loading...</div>';

    try {
        const response = await fetch('/my-bot-requests');
        const requests = await response.json();

        const filteredRequests = statusFilter === 'all' 
            ? requests 
            : requests.filter(req => req.status === statusFilter);

        requestsList.innerHTML = filteredRequests.map(request => `
            <div class="request-card ${request.status}">
                <div class="request-header">
                    <h3>${request.name}</h3>
                    <span class="status-badge ${request.status}">${request.status}</span>
                </div>
                <div class="request-details">
                    <p><strong>Repository:</strong> ${request.repo_url}</p>
                    <p><strong>Website:</strong> ${request.website_url || 'Not provided'}</p>
                    <p><strong>Deployment Cost:</strong> ${request.deployment_cost} coins</p>
                    
                    <div class="social-links">
                        <h4>Social Links:</h4>
                        <ul>
                            ${request.social_links.map(link => `
                                <li>
                                    <strong>${link.type}:</strong> 
                                    <a href="${link.url}" target="_blank">${link.url}</a>
                                </li>
                            `).join('')}
                        </ul>
                    </div>

                    <div class="env-vars">
                        <h4>Environment Variables:</h4>
                        <ul>
                            ${request.env_vars.map(env => `
                                <li>
                                    <strong>${env.name}:</strong> ${env.description}
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                </div>
                ${request.status === 'pending' ? `
                    <div class="request-actions">
                        <button onclick="editRequest(${request.id})" class="btn btn-secondary">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                    </div>
                ` : ''}
            </div>
        `).join('') || '<p>No requests found.</p>';
    } catch (error) {
        console.error('Error loading requests:', error);
        requestsList.innerHTML = '<p class="error">Error loading requests. Please try again later.</p>';
    }
}

function editRequest(requestId) {
    // Show edit modal and populate form
    const modal = document.getElementById('editModal');
    modal.style.display = 'block';
    
    
    fetch(`/my-bot-requests/${requestId}`)
        .then(response => response.json())
        .then(request => {
            document.getElementById('editBotName').value = request.name;
            document.getElementById('editRepoUrl').value = request.repo_url;
            document.getElementById('editWebsiteUrl').value = request.website_url || '';
            document.getElementById('editDeploymentCost').value = request.deployment_cost;
            
            
            const socialLinksContainer = document.getElementById('editSocialLinksContainer');
            socialLinksContainer.innerHTML = '';
            request.social_links.forEach(link => addSocialLinkField(link));
            
            // Populate env vars
            const envVarsContainer = document.getElementById('editEnvVarsContainer');
            envVarsContainer.innerHTML = '';
            request.env_vars.forEach(env => addEnvVarField(env));
        });
}

// Add social link field to edit form
function addSocialLinkField(link = { type: '', url: '' }) {
    const container = document.createElement('div');
    container.className = 'social-link-group';
    container.innerHTML = `
        <select required>
            <option value="">Select Type</option>
            <option value="whatsapp" ${link.type === 'whatsapp' ? 'selected' : ''}>WhatsApp</option>
            <option value="telegram" ${link.type === 'telegram' ? 'selected' : ''}>Telegram</option>
            <option value="discord" ${link.type === 'discord' ? 'selected' : ''}>Discord</option>
            <option value="other" ${link.type === 'other' ? 'selected' : ''}>Other</option>
        </select>
        <input type="url" placeholder="Enter URL" required value="${link.url}">
        <button type="button" class="remove-btn" onclick="this.parentElement.remove()">×</button>
    `;
    document.getElementById('editSocialLinksContainer').appendChild(container);
}

function addEnvVarField(env = { name: '', description: '' }) {
    const container = document.createElement('div');
    container.className = 'env-var-group';
    container.innerHTML = `
        <input type="<input type="text" placeholder="Variable Name" required value="${env.name}">
        <input type="text" placeholder="Description" required value="${env.description}">
        <button type="button" class="remove-btn" onclick="this.parentElement.remove()">×</button>
    `;
    document.getElementById('editEnvVarsContainer').appendChild(container);
}


document.querySelector('.add-link-btn').addEventListener('click', () => addSocialLinkField());
document.querySelector('.add-env-btn').addEventListener('click', () => addEnvVarField());


document.querySelector('.modal .close').addEventListener('click', () => {
    document.getElementById('editModal').style.display = 'none';
});


document.getElementById('editRequestForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const requestId = document.getElementById('editRequestForm').dataset.requestId;
    
    
    const formData = {
        name: document.getElementById('editBotName').value,
        repoUrl: document.getElementById('editRepoUrl').value,
        websiteUrl: document.getElementById('editWebsiteUrl').value,
        deploymentCost: parseInt(document.getElementById('editDeploymentCost').value),
        
        
        socialLinks: Array.from(document.getElementById('editSocialLinksContainer').children).map(group => ({
            type: group.querySelector('select').value,
            url: group.querySelector('input[type="url"]').value
        })),
        
        
        envVars: Array.from(document.getElementById('editEnvVarsContainer').children).map(group => {
            const inputs = group.querySelectorAll('input');
            return {
                name: inputs[0].value,
                description: inputs[1].value
            };
        })
    };

    try {
        const response = await fetch(`/bot-request/${requestId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            throw new Error(await response.text());
        }

        
        document.getElementById('editModal').style.display = 'none';
        loadRequests();
        
        
        const successMessage = document.createElement('div');
        successMessage.className = 'success-message';
        successMessage.textContent = 'Bot request updated successfully!';
        document.body.appendChild(successMessage);
        
        setTimeout(() => {
            successMessage.remove();
        }, 3000);
    } catch (error) {
        console.error('Error updating request:', error);
        alert('Error updating request: ' + error.message);
    }
});


const style = document.createElement('style');
style.textContent = `
    .success-message {
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #4CAF50;
        color: white;
        padding: 15px 25px;
        border-radius: 4px;
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);