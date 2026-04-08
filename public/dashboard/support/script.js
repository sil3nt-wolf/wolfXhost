document.getElementById('ticketForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const ticketData = {
        customerName: document.getElementById('customerName').value,
        customerEmail: document.getElementById('customerEmail').value,
        title: document.getElementById('title').value,
        category: document.getElementById('category').value,
        priority: document.getElementById('priority').value,
        description: document.getElementById('description').value
    };

    try {
        const response = await fetch('/api/support/tickets', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(ticketData)
        });

        const result = await response.json();

        if (response.ok) {
            alert('Ticket created successfully!');
            
            e.target.reset();
            
            fetchTickets();
        } else {
            throw new Error(result.error || 'Failed to create ticket');
        }
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
});


async function fetchTickets(page = 1, status = '', priority = '') {
    try {
        const queryParams = new URLSearchParams({
            page,
            status,
            priority
        }).toString();

        const response = await fetch(`/api/support/tickets?${queryParams}`);
        const data = await response.json();

        const ticketListContainer = document.getElementById('ticketListContainer');
        ticketListContainer.innerHTML = ''; // Clear existing tickets

        data.tickets.forEach(ticket => {
            const ticketElement = document.createElement('div');
            ticketElement.classList.add('ticket-item');
            ticketElement.innerHTML = `
                <div>
                    <h3>${ticket.title}</h3>
                    <p>
                        <span class="ticket-status status-${ticket.status}">
                            ${ticket.status.replace('_', ' ').toUpperCase()}
                        </span>
                        | Priority: <span class="priority-${ticket.priority}">
                            ${ticket.priority.toUpperCase()}
                        </span>
                    </p>
                    <small>
                        ${ticket.customer_name} (${ticket.customer_email}) 
                        | Created: ${new Date(ticket.created_at).toLocaleString()}
                    </small>
                </div>
                <div>
                    <button class="btn" onclick="viewTicketDetails('${ticket.ticket_id}')">View Details</button>
                </div>
            `;
            ticketListContainer.appendChild(ticketElement);
        });

        
        renderPagination(data.pagination);
    } catch (error) {
        console.error('Error fetching tickets:', error);
        alert('Failed to load tickets');
    }
}


function escapeHtml(unsafe) {
    if (unsafe == null) {
        return '';
    }
    return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


async function fetchTicketChat(ticketId) {
    try {
        const response = await fetch(`/api/tickets/${ticketId}/chat`);
        const messages = await response.json();

        
        const currentUserId = getCurrentUserId(); 

        const chatContainer = document.createElement('div');
        chatContainer.classList.add('ticket-chat');
        chatContainer.innerHTML = `
            <h3>Chat</h3>
            <div id="chatMessagesContainer" class="chat-messages">
                ${messages.length > 0 ? messages.map(message => `
                    <div class="chat-message ${message.sender_id === currentUserId ? 'sent-message' : 'received-message'}">
                        <div class="message-header">
                            <strong class="sender-name">${escapeHtml(message.sender_name)}</strong>
                            <small class="message-time">${formatMessageTime(message.created_at)}</small>
                        </div>
                        <div class="message-content">
                            ${escapeHtml(message.message_text)}
                        </div>
                    </div>
                `).join('') : '<p class="no-messages">No messages yet</p>'}
            </div>
            <div class="chat-input-section">
                <textarea id="chatMessageText" rows="3" placeholder="Type your message..."></textarea>
                <button onclick="sendChatMessage('${ticketId}')" class="send-message-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 11 22 2"></polygon>
                    </svg>
                </button>
            </div>
        `;

        
        const modalContent = document.querySelector('.ticket-modal-content');
        if (modalContent) {
            modalContent.appendChild(chatContainer);
        }

        
        const messagesContainer = document.getElementById('chatMessagesContainer');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    } catch (error) {
        console.error('Error fetching chat messages:', error);
    }
}


async function sendChatMessage(ticketId) {
    const messageText = document.getElementById('chatMessageText').value.trim();
    if (!messageText) {
        alert('Please enter a message');
        return;
    }

    try {
        const response = await fetch(`/api/tickets/${ticketId}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ messageText })
        });

        const result = await response.json();

        if (response.ok) {
            
            document.getElementById('chatMessageText').value = '';
            fetchTicketChat(ticketId);
        } else {
            throw new Error(result.error || 'Failed to send message');
        }
    } catch (error) {
        console.error('Error sending chat message:', error);
        alert(`Error: ${error.message}`);
    }
}


function getCurrentUserId() {
    
    if (window.session && window.session.user && window.session.user.id) {
        return window.session.user.id;
    }

    
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
        try {
            const parsedUser = JSON.parse(storedUser);
            return parsedUser.id;
        } catch (error) {
            console.warn('Error parsing stored user data');
        }
    }

    
    const userId = sessionStorage.getItem('userId');
    if (userId) {
        return userId;
    }

    
    return null;
}


function formatMessageTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();

    
    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    
    return date.toLocaleDateString();
}


async function viewTicketDetails(ticketId) {
    try {
        const response = await fetch(`/api/support/tickets/${ticketId}`);
        const ticket = await response.json();

        
        const modalHtml = `
            <div class="ticket-modal">
                <div class="ticket-modal-content">
                    <h2>${ticket.title}</h2>
                    <p><strong>Status:</strong> 
                        <span class="ticket-status status-${ticket.status}">
                            ${ticket.status.replace('_', ' ').toUpperCase()}
                        </span>
                    </p>
                    <p><strong>Priority:</strong> 
                        <span class="priority-${ticket.priority}">
                            ${ticket.priority.toUpperCase()}
                        </span>
                    </p>
                    <p><strong>Customer:</strong> ${ticket.customer_name}</p>
                    <p><strong>Email:</strong> ${ticket.customer_email}</p>
                    <p><strong>Category:</strong> ${ticket.category || 'General'}</p>
                    <p><strong>Created:</strong> ${new Date(ticket.created_at).toLocaleString()}</p>
                    
                    <h3>Description</h3>
                    <p>${ticket.description}</p>

                    ${ticket.notes ? `
                        <h3>Internal Notes</h3>
                        <p>${ticket.notes}</p>
                    ` : ''}

                    <div class="ticket-actions">
                        <button class="btn" onclick="updateTicketStatus('${ticket.ticket_id}', 'resolved')">
                            Mark Resolved
                        </button>
                        <button class="btn" onclick="closeTicketModal()">Close</button>
                    </div>
                </div>
            </div>
        `;

        
        const modalContainer = document.createElement('div');
        modalContainer.id = 'ticketModal';
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer);
        fetchTicketChat(ticketId);

        
        const modalStyle = document.createElement('style');
        modalStyle.textContent = `
            .ticket-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            }
            .ticket-modal-content {
                background: var(--base-100);
                padding: 30px;
                border-radius: 10px;
                width: 80%;
                max-width: 600px;
                max-height: 80%;
                overflow-y: auto;
            }
            .ticket-actions {
                display: flex;
                justify-content: space-between;
                margin-top: 20px;
            }
        `;
        document.head.appendChild(modalStyle);
    } catch (error) {
        console.error('Error fetching ticket details:', error);
        alert('Failed to load ticket details');
    }
}


async function updateTicketStatus(ticketId, status) {
    try {
        const response = await fetch(`/api/support/tickets/${ticketId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });

        const result = await response.json();

        if (response.ok) {
            alert(`Ticket marked as ${status}`);
            closeTicketModal();
            fetchTickets(); 
        } else {
            throw new Error(result.error || 'Failed to update ticket');
        }
    } catch (error) {
        console.error('Error updating ticket:', error);
        alert(`Error: ${error.message}`);
    }
}


function closeTicketModal() {
    const modal = document.getElementById('ticketModal');
    if (modal) {
        modal.remove();
    }
}


function renderPagination(paginationData) {
    const paginationContainer = document.createElement('div');
    paginationContainer.classList.add('pagination');

    for (let i = 1; i <= paginationData.totalPages; i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        pageButton.classList.add(i === paginationData.page ? 'active' : '');
        pageButton.addEventListener('click', () => fetchTickets(i));
        paginationContainer.appendChild(pageButton);
    }

    const ticketListContainer = document.getElementById('ticketListContainer');
    ticketListContainer.appendChild(paginationContainer);
}


fetchTickets();


document.getElementById('statusFilter').addEventListener('change', (e) => {
    fetchTickets(1, e.target.value);
});

document.getElementById('priorityFilter').addEventListener('change', (e) => {
    fetchTickets(1, '', e.target.value);
});