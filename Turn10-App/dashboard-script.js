const radioJa = document.getElementById('radioJa');
const radioNein = document.getElementById('radioNein');
const grundJa = document.getElementById('grundJa');
const grundNein = document.getElementById('grundNein');
const formular = document.getElementById('abstimmungsFormular');
const statusMessage = document.getElementById('statusMessage');

function setReasonFieldState(activeRadio, activeInput, inactiveInput) {
    activeInput.disabled = false;
    activeInput.required = false;
    inactiveInput.disabled = true;
    inactiveInput.value = '';
    inactiveInput.required = false;
}

if (radioJa && radioNein) {
    radioJa.addEventListener('change', function() {
        if (this.checked) {
            setReasonFieldState(this, grundJa, grundNein);
        }
    });

    radioNein.addEventListener('change', function() {
        if (this.checked) {
            grundNein.disabled = false;
            grundNein.required = true;
            grundJa.disabled = true;
            grundJa.value = '';
        }
    });
}

if (formular) {
    formular.addEventListener('submit', function(event) {
        event.preventDefault();

        const selectedChoice = document.querySelector('input[name="teilnahme"]:checked');
        if (!selectedChoice) {
            statusMessage.className = 'status-message error';
            statusMessage.textContent = 'Bitte wähle zuerst eine Teilnahmeoption.';
            return;
        }

        if (selectedChoice.value === 'nein' && !grundNein.value.trim()) {
            statusMessage.className = 'status-message error';
            statusMessage.textContent = 'Bitte gib einen Grund an, warum du nicht teilnehmen kannst.';
            return;
        }

        statusMessage.className = 'status-message success';
        statusMessage.textContent = 'Die Abstimmung wurde gespeichert.';
    });
}