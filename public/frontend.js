document.addEventListener('DOMContentLoaded', function() {
    updateDoorOptions();
    fetchRecentNames(document.getElementById('door').value);

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
