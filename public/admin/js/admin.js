

document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
    loadBots();
    document.getElementById('addBotBtn').addEventListener('click', showAddBotForm);
});

async function loadUsers() {
    try {
        const response = await fetch('/admin/users');
        const users = await response.json();
        const usersList = document.getElementById('usersList');
        usersList.innerHTML = '';
        users.forEach(user => {
            const userElement = document.createElement('div');
            userElement.className = 'user-item';
            userElement.innerHTML = `
                <span>${user.phone_number} - Coins: ${user.coins}</span>
                <input type="number" id="coins-${user.id}" value="${user.coins}">
                <button onclick="updateUserCoins(${user.id})">Update Coins</button>
                <button onclick="deleteUser(${user.id})">Delete User</button>
            `;
            usersList.appendChild(userElement);
        });
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

async function updateUserCoins(userId) {
    const coinsInput = document.getElementById(`coins-${userId}`);
    const newCoins = coinsInput.value;
    try {
        const response = await fetch(`/admin/users/${userId}/coins`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ coins: newCoins }),
        });
        if (response.ok) {
            alert('User coins updated successfully');
            loadUsers();
        } else {
            alert('Failed to update user coins');
        }
    } catch (error) {
        console.error('Error updating user coins:', error);
    }
}

async function deleteUser(userId) {
    if (confirm('Are you sure you want to delete this user?')) {
        try {
            const response = await fetch(`/admin/users/${userId}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                alert('User deleted successfully');
                loadUsers();
            } else {
                alert('Failed to delete user');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
        }
    }
}

async function loadBots() {
    try {
        const response = await fetch('/admin/bots');
        const bots = await response.json();
        const botsList = document.getElementById('botsList');
        botsList.innerHTML = '';
        bots.forEach(bot => {
            const botElement = document.createElement('div');
            botElement.className = 'bot-item';
            botElement.innerHTML = `
                <span>${bot.name} - Repo: ${bot.repo_url}</span>
                <span>Deployment Cost: ${bot.deployment_cost}</span>
                <button onclick="deleteBot(${bot.id})">Delete Bot</button>
            `;
            botsList.appendChild(botElement);
        });
    } catch (error) {
        console.error('Error loading bots:', error);
    }
}

function showAddBotForm() {
    const form = document.createElement('form');
    form.innerHTML = `
        <input type="text" id="botName" placeholder="Bot Name" required>
        <input type="text" id="repoUrl" placeholder="Repository URL" required>
        <input type="number" id="deploymentCost" placeholder="Deployment Cost" required>
        <div id="envVars"></div>
        <button type="button" onclick="addEnvVar()">Add Environment Variable</button>
        <button type="submit">Add Bot</button>
    `;
    form.onsubmit = addBot;
    document.getElementById('bots').appendChild(form);
}

function addEnvVar() {
    const envVarsContainer = document.getElementById('envVars');
    const envVarDiv = document.createElement('div');
    envVarDiv.innerHTML = `
        <input type="text" placeholder="Variable Name" required>
        <input type="text" placeholder="Variable Description" required>
    `;
    envVarsContainer.appendChild(envVarDiv);
}

async function addBot(event) {
    event.preventDefault();
    const name = document.getElementById('botName').value;
    const repoUrl = document.getElementById('repoUrl').value;
    const deploymentCost = document.getElementById('deploymentCost').value;
    const envVarDivs = document.querySelectorAll('#envVars > div');
    const envVars = Array.from(envVarDivs).map(div => ({
        name: div.children[0].value,
        description: div.children[1].value
    }));

    try {
        const response = await fetch('/admin/bots', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, repoUrl, deploymentCost, envVars }),
        });
        if (response.ok) {
            alert('Bot added successfully');
            loadBots();
        } else {
            alert('Failed to add bot');
        }
    } catch (error) {
        console.error('Error adding bot:', error);
    }
}

async function deleteBot(botId) {
    if (confirm('Are you sure you want to delete this bot?')) {
        try {
            const response = await fetch(`/admin/bots/${botId}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                alert('Bot deleted successfully');
                loadBots();
            } else {
                alert('Failed to delete bot');
            }
        } catch (error) {
            console.error('Error deleting bot:', error);
        }
    }
}



async function loadBotRequests() {
    try {
        const response = await fetch('/admin/bot-requests');
        const requests = await response.json();
        
        const container = document.getElementById('botRequestsList');
        container.innerHTML = '';
        
        requests.forEach(request => {
            const requestElement = document.createElement('div');
            requestElement.className = 'bot-request';
            requestElement.innerHTML = `
                <div class="bot-request-header">
                    <h3>${request.name}</h3>
                    <span class="status-badge status-${request.status.toLowerCase()}">${request.status}</span>
                </div>
                <div class="bot-request-details">
                    <p><strong>Repository:</strong> ${request.repo_url}</p>
                    <p><strong>Developer Contact:</strong> ${request.dev_number}</p>
                    <p><strong>Deployment Cost:</strong> ${request.deployment_cost} coins</p>
                    <p><strong>Submitted:</strong> ${new Date(request.created_at).toLocaleString()}</p>
                </div>
                <div class="env-vars">
                    <h4>Environment Variables:</h4>
                    <ul class="env-vars-list">
                        ${request.env_vars.map(env => `
                            <li><strong>${env.name}:</strong> ${env.description}</li>
                        `).join('')}
                    </ul>
                </div>
                ${request.status === 'pending' ? `
                    <div class="action-buttons">
                        <button class="approve-btn" onclick="handleRequest(${request.id}, 'approved')">Approve</button>
                        <button class="reject-btn" onclick="handleRequest(${request.id}, 'rejected')">Reject</button>
                    </div>
                ` : ''}
            `;
            container.appendChild(requestElement);
        });
    } catch (error) {
        console.error('Error loading bot requests:', error);
        alert('Failed to load bot requests');
    }
}

async function handleRequest(id, status) {
    try {
        const response = await fetch(`/admin/bot-requests/${id}/handle`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });

        if (!response.ok) {
            throw new Error(await response.text());
        }

        const result = await response.json();
        alert(`Bot request ${status} successfully`);
        loadBotRequests(); 
    } catch (error) {
        console.error('Error handling bot request:', error);
        alert('Failed to handle bot request');
    }
}


document.addEventListener('DOMContentLoaded', loadBotRequests);