const deployForm = document.getElementById('deployForm');
const outputDiv = document.getElementById('output');

const deployBot = async () => {
    showLoader();
    const sessionId = document.getElementById('sessionId').value;
    const ownerNumber = document.getElementById('ownerNumber').value;
    const workType = document.getElementById('workType').value;

    
    if (!sessionId || !ownerNumber || !workType) {
        outputDiv.innerHTML = '<p style="color: red;">All fields are required!</p>';
        hideLoader();
        return;
    }

    const deployButton = document.getElementById('deployButton');
    deployButton.disabled = true; 

    try {
        const response = await fetch('/deploy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, ownerNumber, workType })
        });

        const data = await response.json();

        outputDiv.innerHTML = ''; // Clear the spinner
        if (response.ok) {
            outputDiv.innerHTML = `
                <p>${data.message}</p>
                <p>Deployment URL: <a href="${data.appUrl}" target="_blank">${data.appUrl}</a></p>
                <pre>${JSON.stringify(data.logs, null, 2)}</pre>
            `;
            updateCoinBalance(); // Update coin balance after successful deployment
            fetchUserApps(); // Refresh the list of user's apps
        } else {
            outputDiv.innerHTML = `<p style="color: red;">Error: ${data.message}</p>`;
        }
    } catch (error) {
        outputDiv.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    } finally {
        hideLoader();
        deployButton.disabled = false; 
    }
};


document.getElementById('deployButton').onclick = deployBot;



function showLoader() {
    document.getElementById('loader').style.display = 'block';
}


function hideLoader() {
    document.getElementById('loader').style.display = 'none';
}


const checkLogin = async () => {
    try {
        const response = await fetch('/check-login', { method: 'GET' });
        if (!response.ok) {
            window.location.href = '/login';
        }
    } catch (error) {
        outputDiv.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
};


checkLogin();
