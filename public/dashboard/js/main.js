           

let selectedBots = new Set();
let isSelectionMode = false;


function toggleSelectionMode() {
    isSelectionMode = !isSelectionMode;
    selectedBots.clear();
    filterAndDisplayApps();
    updateSelectionUI();
}


function toggleBotSelection(botName, event) {
    event.stopPropagation();
    
    if (!isSelectionMode) {
        isSelectionMode = true;
    }
    
    if (selectedBots.has(botName)) {
        selectedBots.delete(botName);
    } else {
        selectedBots.add(botName);
    }

  
  const botCard = document.querySelector(`[data-bot-name="${botName}"]`);
    if (botCard) {
        botCard.classList.toggle('selected', selectedBots.has(botName));
        const checkbox = botCard.querySelector('input[type="checkbox"]');
        if (checkbox) {
            checkbox.checked = selectedBots.has(botName);
        }
    }
    
    filterAndDisplayApps();
}

function cancelSelection() {
    isSelectionMode = false;
    selectedBots.clear();
    filterAndDisplayApps();
}


function updateSelectionUI() {
    const selectionControls = document.getElementById('selectionControls');
    if (!selectionControls) return;

    if (isSelectionMode) {
        selectionControls.innerHTML = `
            <div class="selection-controls">
                <span class="selected-count">${selectedBots.size} selected</span>
                ${selectedBots.size > 0 ? `
                    <button class="btn btn-danger" onclick="deleteSelectedBots()">
                        <i class="fas fa-trash"></i> Delete Selected
                    </button>
                ` : ''}
                <button class="btn btn-secondary" onclick="toggleSelectionMode()">
                    Cancel
                </button>
            </div>
        `;
    } else {
        selectionControls.innerHTML = '';
    }
}

// Add this function to delete selected bots
async function deleteSelectedBots() {
    if (selectedBots.size === 0) return;

    if (!confirm(`Are you sure you want to delete ${selectedBots.size} bot${selectedBots.size > 1 ? 's' : ''}?`)) {
        return;
    }

    const deletePromises = Array.from(selectedBots).map(async (botName) => {
        try {
            console.log(`Attempting to delete bot: ${botName}`);  // Diagnostic logging
            const response = await fetch(`/delete-app/${botName}-td`, { method: 'DELETE' });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Failed to delete ${botName}: ${errorText}`);  
                throw new Error(`Failed to delete ${botName}: ${errorText}`);
            }
            
            console.log(`Successfully deleted bot: ${botName}`);  
            return { botName, success: true };
        } catch (error) {
            console.error(`Deletion error for ${botName}:`, error);  
            return { botName, success: false, error: error.message };
        }
    });

    const results = await Promise.all(deletePromises);
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log('Deletion Results:', { successCount, failCount });  

    if (successCount > 0) {
        showNotification(`Successfully deleted ${successCount} bot${successCount > 1 ? 's' : ''}`);
    }
    if (failCount > 0) {
        showNotification(`Failed to delete ${failCount} bot${failCount > 1 ? 's' : ''}`, 'error');
    }

    selectedBots.clear();
    isSelectionMode = false;
    await fetchUserApps();
}

async function deleteSingleBot(botName, event) {
    event.stopPropagation();
    
    if (!confirm(`Are you sure you want to delete ${botName}?`)) {
        return;
    }

    try {
        const response = await fetch(`/delete-app/${botName}-td`, { method: 'DELETE' });
        if (!response.ok) {
            throw new Error('Failed to delete bot');
        }
        showNotification('Bot deleted successfully');
        await fetchUserApps();
    } catch (error) {
        showNotification('Failed to delete bot', 'error');
    }
}

  
            


function showNotification(message, type = 'success') {
const notification = document.querySelector(`.${type}`);
notification.textContent = message;
notification.style.display = 'block';

setTimeout(() => {
notification.style.display = 'none';
}, 3000);
}




let allApps = []; 
let currentFilter = 'all';
let searchQuery = '';
let currentPage = 1;
const botsPerPage = 5;

// Frontend Improvements
// Update the fetchUserApps function
async function fetchUserApps() {
const loader = document.getElementById('loader');
loader.style.display = 'block';

try {
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10000); 

const response = await fetch('/user-apps', {
    signal: controller.signal,
    headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
    }
});

clearTimeout(timeoutId);

if (!response.ok) {
    throw new Error(await response.text() || 'Failed to load apps');
}

const newApps = await response.json();


if (JSON.stringify(newApps) !== JSON.stringify(allApps)) {
    allApps = newApps;
    updateDashboardStats(allApps);
    filterAndDisplayApps();
}
} catch (error) {
if (error.name === 'AbortError') {
    showNotification('Request timed out. Retrying...', 'warning');
    setTimeout(fetchUserApps, 1000); 
} else {
    showNotification(error.message, 'error');
}
} finally {
loader.style.display = 'none';
}
}
function refreshDashboard() {
    fetchUserApps();
   
}

function showHelpModal() {
    
    
    alert('Help section coming soon! Need assistance? Contact our support team.');
}

function updateDashboardStats(apps) {
document.getElementById('totalBots').textContent = apps.length;
document.getElementById('activeBots').textContent = 
apps.filter(app => app.status === 'active').length;
document.getElementById('failedBots').textContent = 
apps.filter(app => app.status === 'failed').length;
}

function getStatusBadge(status) {
const statusColors = {
'active': 'green',
'failed': 'red',
'deploying': 'blue',
'creating': 'purple',
'configuring': 'orange',
'building': 'yellow'
};

const color = statusColors[status] || 'gray';
const icon = status === 'active' ? '✓' : 
         status === 'failed' ? '✗' : 
         '•';

return `
<span class="status-badge status-${color}">
    ${icon} ${status.charAt(0).toUpperCase() + status.slice(1)}
</span>
`;
}

function formatDate(dateString) {
const date = new Date(dateString);
const now = new Date();
const diffTime = Math.abs(now - date);
const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

if (diffDays === 0) {
return 'Today';
} else if (diffDays === 1) {
return 'Yesterday';
} else if (diffDays < 7) {
return `${diffDays} days ago`;
} else {
return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
});
}
}

function generatePageButtons(totalPages) {
    let buttons = '';
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // Add previous page button
    buttons += `
        <button class="pagination-btn ${currentPage === 1 ? 'disabled' : ''}" 
            onclick="changePage(${currentPage - 1})" 
            ${currentPage === 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i>
        </button>
    `;

    // Add page numbers
    for (let i = startPage; i <= endPage; i++) {
        buttons += `
            <button class="pagination-btn ${i === currentPage ? 'active' : ''}" 
                onclick="changePage(${i})">
                ${i}
            </button>
        `;
    }

    // Add next page button
    buttons += `
        <button class="pagination-btn ${currentPage === totalPages ? 'disabled' : ''}" 
            onclick="changePage(${currentPage + 1})"
            ${currentPage === totalPages ? 'disabled' : ''}>
            <i class="fas fa-chevron-right"></i>
        </button>
    `;

    return buttons;
}



function changePage(newPage) {
if (newPage >= 1 && newPage <= Math.ceil(allApps.length / botsPerPage)) {
currentPage = newPage;
filterAndDisplayApps();
window.scrollTo({ top: 0, behavior: 'smooth' });
}
}
function displayUserApps(apps) {
    const userAppsDiv = document.getElementById('userApps');

    if (apps.length === 0) {
        userAppsDiv.innerHTML = `
            <div class="empty-state">
                <h3>No Bot Deployed Yet</h3>
                <p>Start by deploying your first bot from the marketplace!</p>
                <a href="/dashboard/select-bot" class="btn btn-primary">
                    <i class="fas fa-rocket"></i> Deploy Your First Bot
                </a>
            </div>
        `;
        return;
    }
    const totalPages = Math.ceil(apps.length / botsPerPage);
    const startIndex = (currentPage - 1) * botsPerPage;
    const endIndex = startIndex + botsPerPage;
    const currentBots = apps.slice(startIndex, endIndex);

    const botsHTML = currentBots.map(app => `
        <div class="app-card ${selectedBots.has(app.display_name) ? 'selected' : ''}" 
             data-bot-name="${app.display_name}">
            <div class="app-item" onclick="${isSelectionMode ? 
                `toggleBotSelection('${app.display_name}', event)` : 
                `window.location.href='/dashboard/bot-details/${app.display_name}'`}">
                <div class="selection-checkbox ${isSelectionMode ? 'visible' : ''}">
                    <input type="checkbox" 
                        ${selectedBots.has(app.display_name) ? 'checked' : ''}
                        onchange="toggleBotSelection('${app.display_name}', event)">
                </div>
                <div class="app-info">
                    <div class="app-icon">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="app-details">
                        <h3 class="app-name">${app.display_name}</h3>
                        <div class="app-meta">
                            <span>
                                <i class="far fa-clock"></i> 
                                ${formatDate(app.deployed_at)}
                            </span>
                            ${getStatusBadge(app.status)}
                        </div>
                    </div>
                </div>
                ${!isSelectionMode ? `

                <div class="app-actions">
                <div class="dropdown">
                            <button class="action-btn" onclick="event.stopPropagation()">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <div class="dropdown-content">
                                <button onclick="toggleBotSelection('${app.display_name}', event)">
                                    <i class="fas fa-check-square"></i> Select
                                </button>
                                <button onclick="deleteSingleBot('${app.display_name}', event)">
                                    <i class="fas fa-trash"></i> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');


    const selectionControls = isSelectionMode && selectedBots.size > 0 ? `
        <div class="multi-delete-controls">
            <button class="btn btn-danger" onclick="deleteSelectedBots()">
                <i class="fas fa-trash"></i> Delete Selected (${selectedBots.size})
            </button>
            <button class="btn btn-secondary" onclick="cancelSelection()">
                Cancel
            </button>
        </div>
    ` : '';

    userAppsDiv.innerHTML = `
        <div id="selectionControls" class="selection-controls-container">
            ${selectionControls}
        </div>
        <div class="dashboard-content">
            <div class="apps-container">
                ${botsHTML}
            </div>
        </div>
        <div class="pagination-container">
            <div class="pagination">
                ${generatePageButtons(totalPages)}
            </div>
        </div>
    `;
}

    updateSelectionUI();



// Optimize auto-refresh
let autoRefreshInterval;
let consecutiveFailures = 0;
const MAX_FAILURES = 3;

function startAutoRefresh() {
if (!autoRefreshInterval) {
autoRefreshInterval = setInterval(() => {
    if (document.visibilityState === 'visible') {
        fetchUserApps()
            .then(() => {
                consecutiveFailures = 0;
            })
            .catch(() => {
                consecutiveFailures++;
                if (consecutiveFailures >= MAX_FAILURES) {
                    stopAutoRefresh();
                    showNotification('Auto-refresh stopped due to errors. Click to retry.', 'error');
                }
            });
    }
}, 15000); 
}
}

async function retryWithBackoff(fn, maxRetries = 3) {
for (let i = 0; i < maxRetries; i++) {
try {
    return await fn();
} catch (error) {
    if (i === maxRetries - 1) throw error;
    await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
}
}
}


function stopAutoRefresh() {
if (autoRefreshInterval) {
clearInterval(autoRefreshInterval);
autoRefreshInterval = null;
}
}

function filterAndDisplayApps() {
let filteredApps = allApps;

if (currentFilter !== 'all') {
filteredApps = filteredApps.filter(app => app.status === currentFilter);
}

if (searchQuery) {
filteredApps = filteredApps.filter(app => 
    app.display_name.toLowerCase().includes(searchQuery.toLowerCase())
);
}

const userAppsDiv = document.getElementById('userApps');

if (filteredApps.length === 0) {
userAppsDiv.innerHTML = `
    <div class="no-results">
        <i class="fas fa-search fa-2x mb-3" style="color: var(--neutral); opacity: 0.5;"></i>
        <h3>No bots found</h3>
        <p>Try adjusting your search or filters</p>
    </div>
`;
return;
}

if (currentPage > Math.ceil(filteredApps.length / botsPerPage)) {
currentPage = 1;
}

displayUserApps(filteredApps);
}


document.getElementById('searchInput').addEventListener('input', (e) => {
searchQuery = e.target.value;
currentPage = 1; 
filterAndDisplayApps();
});

document.querySelectorAll('.filter-btn').forEach(btn => {
btn.addEventListener('click', () => {
document.querySelectorAll('.filter-btn').forEach(b => 
    b.classList.remove('active'));
btn.classList.add('active');
currentFilter = btn.dataset.status;
currentPage = 1; 
filterAndDisplayApps();
});
});




document.addEventListener('DOMContentLoaded', () => {

    document.addEventListener('click', (e) => {
        const actionBtn = e.target.closest('.action-btn');
        if (actionBtn) {
            e.stopPropagation();
            const dropdown = actionBtn.closest('.dropdown');
            
            
            document.querySelectorAll('.dropdown.show').forEach(d => {
                if (d !== dropdown) d.classList.remove('show');
            });
            
            
            dropdown.classList.toggle('show');
        } else if (!e.target.closest('.dropdown-content')) {
            
            document.querySelectorAll('.dropdown.show').forEach(d => {
                d.classList.remove('show');
            });
        }
    });
retryWithBackoff(() => {
fetchUserApps();
});
startAutoRefresh();



let visibilityTimeout;
document.addEventListener('visibilitychange', () => {
if (document.hidden) {
    stopAutoRefresh();
} else {
    
    clearTimeout(visibilityTimeout);
    visibilityTimeout = setTimeout(() => {
        startAutoRefresh();
        refreshDashboard();
    }, 1000);
}
});
});