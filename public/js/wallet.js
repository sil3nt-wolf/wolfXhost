

function showNotification(message, type = 'success') {
    const notification = document.querySelector(`.${type}`);
    notification.textContent = message;
    notification.style.display = 'block';
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

        document.addEventListener('DOMContentLoaded', () => {
            const claimButton = document.getElementById('claimCoinsBtn');
    claimButton.addEventListener('click', async (e) => {
        e.preventDefault();
        await claimDailyCoins();
    });
    
    
    checkClaimStatus();
    loadWalletInfo();

    document.getElementById('sendCoinsBtn').addEventListener('click', sendCoins);
    document.getElementById('depositCoinsBtn').addEventListener('click', depositCoins);
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    document.getElementById('logoutBtn').addEventListener('click', logout);
});

async function loadWalletInfo() {
    try {
        const response = await fetch('/api/wallet');
        const data = await response.json();

        document.getElementById('coinBalance').textContent = data.coins;
        document.getElementById('totalDeployments').textContent = data.deployments.count;
        document.getElementById('totalSpent').textContent = data.deployments.total_cost;

        const transactionList = document.getElementById('transactionList');
        transactionList.innerHTML = '';
        data.recentTransactions.forEach(transaction => {
            const li = document.createElement('li');
            li.textContent = `${transaction.transaction_type}: ${transaction.amount} coins - ${new Date(transaction.transaction_date).toLocaleString()}`;
            transactionList.appendChild(li);
        });
    } catch (error) {
        console.error('Error loading wallet info:', error);
    }
}

async function sendCoins() {
    const recipientPhone = document.getElementById('recipientPhone').value;
    const amount = parseInt(document.getElementById('sendAmount').value);

    try {
        const response = await fetch('/api/send-coins', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ recipientPhone, amount }),
        });

        const data = await response.json();
        if (response.ok) {
            alert(data.message);
            loadWalletInfo();
        } else {
            alert(data.error);
        }
    } catch (error) {
        console.error('Error sending coins:', error);
        alert('An error occurred while sending coins');
    }
}

async function depositCoins() {
    const depositInput = document.getElementById('depositAmount');
    const amount = parseInt(depositInput.value);

    
    if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid positive number for the amount.');
        depositInput.value = ''; // Clear the input field
        return; // Stop further execution
    }

    try {
        const response = await fetch('/api/deposit-coins', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ amount }), 
        });

        const data = await response.json();
        if (response.ok) {
            alert(data.message);
            loadWalletInfo(); 
            depositInput.value = ''; // Clear the input field after successful deposit
        } else {
            alert(data.error);
        }
    } catch (error) {
        console.error('Error depositing coins:', error);
        alert('An error occurred while depositing coins');
    }
}


function toggleTheme() {
    document.body.classList.toggle('dark-theme');
}

function logout() {
    window.location.href = '/logout';
}



let claimTimer;

async function startClaimTimer(nextClaimTime) {
    const timerText = document.getElementById('nextClaimTimer');
    const claimButton = document.getElementById('claimCoinsBtn');
    
    
    if (claimTimer) {
        clearInterval(claimTimer);
    }
    
    claimTimer = setInterval(() => {
        const now = new Date().getTime();
        const nextClaim = new Date(nextClaimTime).getTime();
        const distance = nextClaim - now;
        
        if (distance < 0) {
            clearInterval(claimTimer);
            claimButton.disabled = false;
            claimButton.classList.remove('disabled');
            timerText.textContent = 'Coins are ready to claim!';
            return;
        }
        
        
        const hours = Math.floor(distance / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        timerText.textContent = `Next claim available in: ${hours}h ${minutes}m ${seconds}s`;
    }, 1000);
}


async function checkClaimStatus() {
    try {
        const response = await fetch('/check-claim-status');
        const data = await response.json();
        
        const claimButton = document.getElementById('claimCoinsBtn');
        const timerText = document.getElementById('nextClaimTimer');
        
        if (data.canClaim) {
            claimButton.disabled = false;
            claimButton.classList.remove('disabled');
            timerText.textContent = 'Coins are ready to claim!';
            
            if (claimTimer) {
                clearInterval(claimTimer);
            }
        } else {
            claimButton.disabled = true;
            claimButton.classList.add('disabled');
            startClaimTimer(data.nextClaimTime);
        }
    } catch (error) {
        console.error('Error checking claim status:', error);
    }
}


async function claimDailyCoins() {
    const claimButton = document.getElementById('claimCoinsBtn');
    const timerText = document.getElementById('nextClaimTimer');
    
    try {
        claimButton.disabled = true; 
        
        const response = await fetch('/claim-coins', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            
            document.getElementById('coinBalance').textContent = data.currentCoins;
            
            alert(data.message);
            
            claimButton.classList.add('disabled');
            startClaimTimer(data.nextClaimTime);
        } else {
            
            claimButton.disabled = false;
            claimButton.classList.remove('disabled');
            alert(data.message || 'Failed to claim coins');
        }
    } catch (error) {
        
        console.error('Error claiming coins:', error);
        claimButton.disabled = false;
        claimButton.classList.remove('disabled');
        alert('An error occurred while claiming coins');
    }
}



async function updateCoinBalance() {
    try {
        const response = await fetch('/user-coins');
        const data = await response.json();
        document.getElementById('coinBalance').textContent = data.coins;
    } catch (error) {
        console.error('Error updating coin balance:', error);
    }
}
   

document.getElementById('claimCoinsBtn').addEventListener('click', async () => {
    try {
        const response = await fetch('/claim-coins', { method: 'POST' });
        const data = await response.json();

        if (response.ok) {
            showNotification(data.message);
            updateCoinBalance();
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        showNotification(error.message, 'error');
    }
});
