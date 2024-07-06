document.addEventListener('DOMContentLoaded', function () {
    fetchDoors();
    fetchArchives();

    document.getElementById('create-door-form').addEventListener('submit', async function(event) {
        event.preventDefault();
        const door = document.getElementById('new-door-name').value;
        await fetch('/doors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ door })
        });
        document.getElementById('new-door-name').value = '';
        fetchDoors();
        updateDoorOptions();
    });

    document.getElementById('lookup-name-form').addEventListener('submit', async function(event) {
        event.preventDefault();
        const name = document.getElementById('lookup-name').value;
        const searchScope = document.querySelector('input[name="search-scope"]:checked').value;
        const allEvents = searchScope === 'all';
        const response = await fetch(`/names/${name}?allEvents=${allEvents}`);
        const names = await response.json();
        renderNames(names);
    });

    document.getElementById('archive-form').addEventListener('submit', async function(event) {
        event.preventDefault();
        const eventName = document.getElementById('event-name').value;
        await fetch('/archive', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventName })
        });
        if (confirm('Event data archived. Do you want to clear all entries?')) {
            await fetch('/names', { method: 'DELETE' });
            alert('All entries deleted');
        }
        fetchArchives();
    });

    document.getElementById('export-data').addEventListener('click', function() {
        window.location.href = '/export';
    });

    document.getElementById('delete-all').addEventListener('click', async function() {
        if (confirm('Are you sure you want to delete all entries?')) {
            await fetch('/names', { method: 'DELETE' });
            alert('All entries deleted');
        }
    });
});

async function fetchDoors() {
    const response = await fetch('/doors');
    const doors = await response.json();
    const doorsList = document.getElementById('doors-list');
    doorsList.innerHTML = '';

    doors.forEach(door => {
        const listItem = document.createElement('li');
        listItem.className = 'door-item';

        const doorName = document.createElement('span');
        doorName.textContent = door.door;
        doorName.className = 'door-name';

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'button-container';

        const renameButton = document.createElement('button');
        renameButton.textContent = 'Rename';
        renameButton.className = 'rename-button';
        renameButton.addEventListener('click', async () => {
            const newDoorName = prompt('Enter new door name:', door.door);
            if (newDoorName) {
                await fetch(`/doors/${door._id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ newDoorName })
                });
                fetchDoors();
                updateDoorOptions();
            }
        });

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.className = 'delete-button';
        deleteButton.addEventListener('click', async () => {
            await fetch(`/doors/${door._id}`, { method: 'DELETE' });
            fetchDoors();
            updateDoorOptions();
        });

        buttonContainer.appendChild(renameButton);
        buttonContainer.appendChild(deleteButton);

        listItem.appendChild(doorName);
        listItem.appendChild(buttonContainer);
        doorsList.appendChild(listItem);
    });
}




async function fetchArchives() {
    const response = await fetch('/archives');
    const archives = await response.json();
    const archivesList = document.getElementById('archives-list');
    archivesList.innerHTML = '';

    archives.forEach(archive => {
        const listItem = document.createElement('li');
        listItem.textContent = `${archive.eventName} (Archived on: ${new Date(archive.timestamp).toLocaleString()}) - Total Count: ${archive.totalCount}`;

        const viewButton = document.createElement('button');
        viewButton.textContent = 'View';
        viewButton.addEventListener('click', async () => {
            const archiveResponse = await fetch(`/archive/${archive._id}`);
            const archiveDetails = await archiveResponse.json();
            renderArchiveDetails(archiveDetails);
        });

        const exportButton = document.createElement('button');
        exportButton.textContent = 'Export';
        exportButton.addEventListener('click', () => {
            window.location.href = `/export-archive/${archive._id}`;
        });

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', async () => {
            if (confirm('Are you sure you want to delete this archive?')) {
                await fetch(`/archive/${archive._id}`, { method: 'DELETE' });
                fetchArchives();
            }
        });

        listItem.appendChild(viewButton);
        listItem.appendChild(exportButton);
        listItem.appendChild(deleteButton);
        archivesList.appendChild(listItem);
    });
}

function renderArchiveDetails(archive) {
    const archiveDetails = document.getElementById('archive-details');
    archiveDetails.innerHTML = '';

    const title = document.createElement('h3');
    title.textContent = `Event: ${archive.eventName}`;
    archiveDetails.appendChild(title);

    const timestamp = document.createElement('p');
    timestamp.textContent = `Archived on: ${new Date(archive.timestamp).toLocaleString()}`;
    archiveDetails.appendChild(timestamp);

    const namesList = document.createElement('ul');
    archive.data.forEach(entry => {
        const listItem = document.createElement('li');
        listItem.textContent = `${entry.name} (Door: ${entry.door}, Time: ${new Date(entry.timestamp).toLocaleString()})`;
        namesList.appendChild(listItem);
    });

    archiveDetails.appendChild(namesList);
}

function renderNames(names) {
    const namesList = document.getElementById('names-list');
    namesList.innerHTML = '';

    names.forEach(nameEntry => {
        const listItem = document.createElement('li');
        listItem.textContent = `${nameEntry.name} (Door: ${nameEntry.door}, Time: ${new Date(nameEntry.timestamp).toLocaleString()})`;

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', async () => {
            await fetch(`/names/${nameEntry._id}`, { method: 'DELETE' });
            listItem.remove();
        });

        listItem.appendChild(deleteButton);
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
