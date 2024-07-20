document.addEventListener('DOMContentLoaded', function() {
    updateDoorOptions();
    fetchRecentNames(document.getElementById('door').value);
    updateStats();
    checkUserRole();

    document.getElementById('registrationForm').addEventListener('submit', async function(event) {
        event.preventDefault();

        const door = document.getElementById('door').value;
        const name = document.getElementById('name').value;

        const response = await fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ door, name })
        });

        const result = await response.text();
        document.getElementById('response').textContent = result;

        document.getElementById('name').value = '';

        fetchRecentNames(door);
        updateStats();
    });

    document.getElementById('door').addEventListener('change', function() {
        const door = document.getElementById('door').value;
        document.getElementById('selected-door').textContent = door;
        fetchRecentNames(door);
    });
});

async function fetchRecentNames(door) {
    const response = await fetch(`/recent-names/${door}`);
    const recentNames = await response.json();

    const namesList = document.getElementById('names-list');
    namesList.innerHTML = '';

    recentNames.forEach(nameEntry => {
        const listItem = document.createElement('li');
        listItem.textContent = nameEntry.name;
        namesList.appendChild(listItem);
    });
}

async function updateDoorOptions() {
    const response = await fetch('/doors');
    const doors = await response.json();
    const doorSelect = document.getElementById('door');

    doorSelect.innerHTML = '';
    doors.forEach(door => {
        const option = document.createElement('option');
        option.value = door.door;
        option.textContent = door.door;
        doorSelect.appendChild(option);
    });
}

async function updateStats() {
    const response = await fetch('/stats-data');
    const data = await response.json();

    document.getElementById('totalCount').textContent = data.totalCount;
    const doorCountsList = document.getElementById('doorCounts');
    doorCountsList.innerHTML = '';

    for (const [door, count] of Object.entries(data.doorCounts)) {
        const listItem = document.createElement('li');
        listItem.textContent = `${door}: ${count}`;
        doorCountsList.appendChild(listItem);
    }
}

const socket = io();

socket.on('statsUpdate', (data) => {
    document.getElementById('totalCount').textContent = data.totalCount;
    const doorCountsList = document.getElementById('doorCounts');
    doorCountsList.innerHTML = '';

    for (const [door, count] of Object.entries(data.doorCounts)) {
        const listItem = document.createElement('li');
        listItem.textContent = `${door}: ${count}`;
        doorCountsList.appendChild(listItem);
    }
});

async function checkUserRole() {
    const response = await fetch('/user-role');
    const data = await response.json();

    if (data.role === 'admin') {
        document.querySelector('.admin-button').style.display = 'block';
    } else if (data.role === 'main-admin') {
        document.querySelector('.admin-button').style.display = 'block';
        document.querySelector('.createadmin-button').style.display = 'block';
    }
}
