const socket = io();

socket.on('statsUpdate', (data) => {
    document.getElementById('totalCount').textContent = data.totalCount;
    const doorCountsList = document.getElementById('doorCounts');
    doorCountsList.innerHTML = '';

    for (const [door, count] of Object.entries(data.doorCounts)) {
        const listItem = document.createElement('li');
        listItem.textContent = `Door ${door}: ${count}`;
        doorCountsList.appendChild(listItem);
    }
});

// Fetch initial stats on page load
window.addEventListener('load', async () => {
    const response = await fetch('/stats-data');
    const data = await response.json();

    document.getElementById('totalCount').textContent = data.totalCount;
    const doorCountsList = document.getElementById('doorCounts');
    doorCountsList.innerHTML = '';

    for (const [door, count] of Object.entries(data.doorCounts)) {
        const listItem = document.createElement('li');
        listItem.textContent = `Door ${door}: ${count}`;
        doorCountsList.appendChild(listItem);
    }
});
