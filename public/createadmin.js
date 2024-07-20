document.addEventListener('DOMContentLoaded', function() {
    fetchUsers();

    document.getElementById('createAdminForm').addEventListener('submit', async function(event) {
        event.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const role = document.getElementById('role').value;

        const response = await fetch('/createadmin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password, role })
        });

        const result = await response.text();
        document.getElementById('response').textContent = result;

        document.getElementById('createAdminForm').reset();
        fetchUsers();
    });
});

async function fetchUsers() {
    const response = await fetch('/users');
    const users = await response.json();

    const userList = document.getElementById('userList');
    userList.innerHTML = '';

    users.forEach(user => {
        const listItem = document.createElement('li');
        listItem.textContent = `${user.username} (${user.role}) `;
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', () => deleteUser(user._id));
        listItem.appendChild(deleteButton);
        userList.appendChild(listItem);
    });
}

async function deleteUser(userId) {
    const response = await fetch(`/users/${userId}`, {
        method: 'DELETE'
    });

    if (response.ok) {
        fetchUsers();
    } else {
        console.error('Failed to delete user');
    }
}
