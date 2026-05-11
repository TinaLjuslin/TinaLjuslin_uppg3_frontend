const alarms = [
    { id: 0, location: 'hall, övervåning', status: 'deactivated', sort: 'fire' },
    { id: 1, location: 'hall, övervåning', status: 'activated', sort: 'burglar' },
    { id: 2, location: 'hall nedervåning', status: 'deactivated', sort: 'fire' },
    { id: 3, location: 'hall nedervåning', status: 'activated', sort: 'burglar' }
];
//det finns två användare för jag hade en idé som kom av sig...
const pins = ['1234', '9876'];

// Spara bara start-larmen om det är första gången appen körs
if (!localStorage.getItem('wigellAlarms')) {
    localStorage.setItem('wigellAlarms', JSON.stringify(alarms));
}

localStorage.setItem('pins', JSON.stringify(pins));
let currentPendingAlarmIndex = null;
let pendingAction = null;
let isSystemLocked = false;

//ritar upp allting
function displayAlarms() {
    const listElement = document.getElementById('alarm-list');
    const data = localStorage.getItem('wigellAlarms');

    if (data && listElement) {
        const alarmArray = JSON.parse(data);
        listElement.innerHTML = '';
        //rita ut och bygg panel för varje alarm
        alarmArray.forEach((alarm, index) => {
            const li = document.createElement('li');
            const panel = document.createElement('div');
            panel.classList.add('panel');

            let btnId = 'btn-negative';

            if (alarm.status === 'activated') {
                panel.classList.add('panel-positive');

            } else {
                panel.classList.add('panel-negative');
                btnId = 'btn-positive';
            }
            panel.innerHTML =
                `
                <div class='panel-text-content'>
                    <h3>${alarm.sort === 'fire' ? 'Brandalarm, ' : 'Inbrottsalarm, '}
                    ${alarm.status === 'activated' ? 'aktivt' : 'avstängt'}</h3>
                    <p>Plats: ${alarm.location}</p>
                </div>
                <button id='btn-${index}' class='${btnId} btn'>
                    ${alarm.status === 'activated' ? 'Stäng av' : 'Aktivera'}
                </button>
                `;
            li.appendChild(panel);
            listElement.appendChild(li);
            const allAlarmButtons = document.querySelectorAll('#alarm-list button');

            // Om det finns knappar, ge den första fokus
            if (allAlarmButtons.length > 0) {
                allAlarmButtons[0].focus();
            }
        });
        //panel med knappar för aktviera allt mm
        const li = document.createElement('li');
        const panel = document.createElement('div');
        panel.classList.add('panel');
        panel.classList.add('panel-neutral');
        panel.innerHTML =
            `
            <button id='btn-activate-all' class='btn-standard btn'>
                Aktivera allt
            </button>
            <button id='btn-deactivate-all' class='btn-standard btn'>
                Stäng av allt
            </button>
            <button id='btn-add-alarm' class='btn-standard btn'>
                Lägg till alarm
            </button>
            <button id='btn-remove-alarm' class='btn-standard btn'>
                Ta bort alarm
            </button>
            `;
        li.appendChild(panel);
        listElement.appendChild(li);

    }

    //tabellen med logg
    const activities = localStorage.getItem('activities');
    const logWrapper = document.getElementById('log-wrapper');
    const tableBody = document.getElementById('log-table-body');

    let activityArray;
    if (activities) {
        activityArray = JSON.parse(activities);
    } else {
        activityArray = [];
    }
    if (tableBody) {
        tableBody.innerHTML = '';
        //för varje aktivitet, skapa rad
        activityArray.forEach(activity => {
            const tr = document.createElement('tr');
            tr.innerHTML =
                `
                    <td>${activity.time}</td>
                    <td>${activity.activity}</td>
                `
            tableBody.appendChild(tr);
        });
        logWrapper.scrollTop = logWrapper.scrollHeight;
    }
}
const listElement = document.getElementById('alarm-list');

//någon klickar på en knapp i listan
listElement.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
        const btnId = e.target.id;
        //här ska jag kolla id för de andra fyra knapparna
        if (btnId === 'btn-activate-all') {
            activateAll();
        } else if (btnId === 'btn-deactivate-all') {
            deactivateAll();
        } else if (btnId === 'btn-add-alarm') {
            pendingAction = 'OPEN_ADD_MODAL';
            console.log('nytt alarm');
            openPinModal();
        } else if (btnId === 'btn-remove-alarm') {
            console.log('ta bort alarm');
            myAlert('Du har inte rättighet att plocka bort alarm, ring en admin', 'Nope', 'alert-negative');
        } else {
            currentPendingAlarmIndex = btnId.split('-')[1]; // Spara indexet
            openPinModal();
        }
    }
});

// Stäng modalen
document.getElementById('close-add-modal').addEventListener('click', () => {
    document.getElementById('add-alarm-modal').style.display = 'none';
});

// Hantera formuläret
document.getElementById('add-alarm-form').addEventListener('submit', (e) => {
    e.preventDefault(); // Hindra sidan från att laddas om

    const location = document.getElementById('new-alarm-location').value;
    const type = document.getElementById('new-alarm-type').value;

    const data = localStorage.getItem('wigellAlarms');
    const alarmArray = data ? JSON.parse(data) : [];

    //skapa nytt alarm
    const newAlarm = {
        id: alarmArray.length,
        location: location,
        status: 'deactivated',
        sort: type
    };

    alarmArray.push(newAlarm);
    localStorage.setItem('wigellAlarms', JSON.stringify(alarmArray));

    saveToLog(`Ny enhet installerad: ${type === 'fire' ? 'Brandalarm' : 'Inbrottsalarm'} på ${location}`);

    displayAlarms();
    document.getElementById('add-alarm-modal').style.display = 'none';
    document.getElementById('add-alarm-form').reset(); 
    myAlert(`Ny enhet installerad: ${type === 'fire' ? 'Brandalarm' : 'Inbrottsalarm'} på ${location}`, 'Nytt alarm');

});
function activateAll() {
    pendingAction = 'ACTIVATE_ALL';
    currentPendingAlarmIndex = null;
    openPinModal();
}

function deactivateAll() {
    pendingAction = 'DEACTIVATE_ALL';
    currentPendingAlarmIndex = null;
    openPinModal();
}

//ändra alarm
function confirmAlarmChange() {
    const data = localStorage.getItem('wigellAlarms');
    if (!data) return;

    let alarmArray = JSON.parse(data);

    if (pendingAction === 'ACTIVATE_ALL') {
        alarmArray.forEach(alarm => alarm.status = 'activated');
        saveToLog("SYSTEM: Alla enheter har AKTIVERATS");
        pendingAction = null;
    }
    else if (pendingAction === 'DEACTIVATE_ALL') {
        alarmArray.forEach(alarm => alarm.status = 'deactivated');
        saveToLog("SYSTEM: Alla enheter har STÄNGTS AV");
        pendingAction = null;
    } else if (pendingAction === 'OPEN_ADD_MODAL') {
        document.getElementById('pin-modal').style.display = 'none';
        document.getElementById('add-alarm-modal').style.display = 'flex';
        document.getElementById('new-alarm-location').focus();
        pendingAction = null;
        return;
    } else if (currentPendingAlarmIndex !== null) {
        const index = parseInt(currentPendingAlarmIndex);
        const alarm = alarmArray[index];

        if (alarm.status === 'activated') {
            alarm.status = 'deactivated';
        } else {
            alarm.status = 'activated';
        }

        const statusText = alarm.status === 'activated' ? 'aktiverat' : 'avstängt';
        saveToLog(`${alarm.sort === 'fire' ? 'Brandalarm' : 'Inbrottslarm'} (${alarm.location}) blev ${statusText}`);

        currentPendingAlarmIndex = null;
    }
    localStorage.setItem('wigellAlarms', JSON.stringify(alarmArray));
    displayAlarms();
}


const pinModal = document.getElementById('pin-modal');
const pinInput = document.getElementById('pin-input');
const pinSubmit = document.getElementById('pin-submit');

//Öppna pin-rutan
function openPinModal() {
    if (isSystemLocked) {
        myAlert("Systemet är fortfarande låst. Vänta en stund.", "Nekad tillträde", "alert-negative");
        return;
    }
    pinModal.style.display = 'flex';
    pinInput.value = '';
    pinInput.focus();
}
let numberOfTries = 0;

//lyssna på ok-knappen på pin-rutan
pinSubmit.addEventListener('click', () => {
    const enteredPin = pinInput.value;

    if (checkPinCode(enteredPin)) {
        // rätt kod inslagen
        pinModal.style.display = 'none';
        numberOfTries = 0;
        const currentAction = pendingAction;
        // Utför ändringen på larmet
        confirmAlarmChange();
        if (currentAction !== 'OPEN_ADD_MODAL') {
            myAlert('Dina inställningar har sparats', 'Rätt kod', 'alert-positive');

        }
    } else {
        // felaktig kod inslagen
        numberOfTries++;

        if (numberOfTries < 3) {

            myAlert(`Fel kod! Du har ${3 - numberOfTries} försök kvar.`, 'Varning', 'alert-negative');
            pinInput.value = '';
        } else {
            isSystemLocked = true;
            saveToLog('Systemet låst');
            myAlert('Du har slagit in felaktig kod tre gånger. Systemet är låst i 10 sek.', 'Systemmeddelande', 'alert-negative');
            pinModal.style.display = 'none';
            setTimeout(() => {
                isSystemLocked = false;
                numberOfTries = 0;
                saveToLog('Systemet upplåst.')
            }, 10000);

        }
    }
});

// avbryt knapp, stäng  rutan
document.getElementById('pin-cancel').addEventListener('click', () => {
    pinModal.style.display = 'none';
    displayAlarms();
});

//kontroller pin-kod, spara till log om fel kod slagits in
function checkPinCode(enteredPinCode) {
    const correctPins = localStorage.getItem('pins');
    const pinArray = JSON.parse(correctPins);
    const justPin = enteredPinCode.substring(0, 4);
    const lastChar = enteredPinCode.substring(4);
    //kollar flera användare, hade en idé som blev fel
    const isCorrect = pinArray.some(pin => pin === justPin && lastChar === '#');
    if (isCorrect) {
        return true;
    } else {
        saveToLog('Felaktig kod');
        return false;
    }
}

//sparar till log
function saveToLog(activity) {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const secunds = now.getSeconds().toString().padStart(2, '0');

    const time = `${hours}:${minutes}:${secunds}`;

    const newActivity = {
        time: time,
        activity: activity
    }
    const activities = localStorage.getItem('activities');
    let activityArray;
    if (activities) {
        activityArray = JSON.parse(activities);
    } else {
        activityArray = [];
    }
    activityArray.push(newActivity);
    localStorage.setItem('activities', JSON.stringify(activityArray));
}

//för att visa meddelanden
function myAlert(msg, title = 'Systemmeddelande', className) {
    const alertOverlay = document.getElementById('custom-alert');
    const alertBox = alertOverlay.querySelector('.modal-content');

    const msgElement = document.getElementById('alert-message');
    const titleElement = document.getElementById('alert-title');

    if (msgElement && titleElement) {
        msgElement.innerText = msg;
        titleElement.innerText = title;
    }

    // Uppdatera klassen på boxen så den blir grön eller röd
    alertBox.className = `modal-content alert-box ${className}`;

    alertOverlay.style.display = 'flex';
    const okBtn = alertOverlay.querySelector('button');
    okBtn.focus();

}

//stäng medelande-rutan
function closeAlert() {
    document.getElementById('custom-alert').style.display = 'none';
}

//för att få rätt på tabbarna på pin-rutan
pinModal.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
        const focusableElements = pinModal.querySelectorAll('input, button');
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) { // Om man trycker shift+tab
            if (document.activeElement === firstElement) {
                lastElement.focus();
                e.preventDefault();
            }
        } else { // Vanlig tab
            if (document.activeElement === lastElement) {
                firstElement.focus();
                e.preventDefault();
            }
        }
    }
});

//för att bara knapparna ska få fokus vid tab
document.getElementById('alarm-list').addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
        const buttons = document.querySelectorAll('#alarm-list button');
        const firstBtn = buttons[0];
        const lastBtn = buttons[buttons.length - 1];

        if (e.shiftKey) { 
            if (document.activeElement === firstBtn) {
                lastBtn.focus();
                e.preventDefault();
            }
        } else { 
            if (document.activeElement === lastBtn) {
                firstBtn.focus();
                e.preventDefault();
            }
        }
    }
});

//lyssnare för OK-knappen i meddelande-rutan
document.getElementById('alert-ok-btn').addEventListener('click', () => {
    const alertOverlay = document.getElementById('custom-alert');
    const pinInput = document.getElementById('pin-input');

    
    alertOverlay.style.display = 'none';

    if (pinModal.style.display === 'flex') {
        pinInput.focus();
        pinInput.select();
    } else {
        displayAlarms();
    }
});

displayAlarms();