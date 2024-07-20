const socket = io();

async function fetchAllNames() {
    try {
        const response = await fetch('/all-names');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const names = await response.json();

        const namesByDoor = names.reduce((acc, nameEntry) => {
            if (!acc[nameEntry.door]) {
                acc[nameEntry.door] = [];
            }
            acc[nameEntry.door].push(nameEntry.name);
            return acc;
        }, {});

        const doorCounts = Object.entries(namesByDoor).reduce((acc, [door, names]) => {
            acc[door] = names.length;
            return acc;
        }, {});

        renderNames(namesByDoor, doorCounts, names.length);
    } catch (error) {
        console.error('Fetch error: ', error);
    }
}

function renderNames(namesByDoor, doorCounts, totalCount) {
    const namesByDoorContainer = document.getElementById('names-by-door');
    const totalCountElement = document.getElementById('total-count');
    totalCountElement.textContent = `Total Count: ${totalCount}`;
    namesByDoorContainer.innerHTML = '';

    for (const [door, names] of Object.entries(namesByDoor)) {
        // Sort names by last name and then by first name
        names.sort((a, b) => {
            const [aFirstName, aLastName] = splitName(a);
            const [bFirstName, bLastName] = splitName(b);
            if (aLastName.toLowerCase() < bLastName.toLowerCase()) return -1;
            if (aLastName.toLowerCase() > bLastName.toLowerCase()) return 1;
            if (aFirstName.toLowerCase() < bFirstName.toLowerCase()) return -1;
            if (aFirstName.toLowerCase() > bFirstName.toLowerCase()) return 1;
            return 0;
        });

        const namesGroup = document.createElement('div');
        namesGroup.className = 'names-group';

        const doorHeading = document.createElement('h2');
        doorHeading.textContent = `Door ${door} (${doorCounts[door]})`;
        namesGroup.appendChild(doorHeading);

        const scrollContainer = document.createElement('div');
        scrollContainer.className = 'scroll-container';

        const namesList = document.createElement('ul');
        names.forEach(name => {
            const listItem = document.createElement('li');
            listItem.textContent = name;
            namesList.appendChild(listItem);
        });
        scrollContainer.appendChild(namesList);
        namesGroup.appendChild(scrollContainer);

        namesByDoorContainer.appendChild(namesGroup);
    }
}

function splitName(name) {
    const parts = name.trim().split(' ');
    if (parts.length === 1) {
        // If only one name is provided, use it as both first and last name
        return [parts[0], parts[0]];
    }
    const lastName = parts.pop();
    const firstName = parts.join(' ');
    return [firstName, lastName];
}

// Fetch all names on page load
fetchAllNames();

// Update the names list and counts in real-time when a new name is added
socket.on('newName', (data) => {
    fetchAllNames();
});
