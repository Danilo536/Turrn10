let appData = {};
let selectedDevice = 'boden';
let deviceList = [];

// --- HILFSFUNKTIONEN ---
function formatDeviceLabel(value) {
    return value
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeDeviceData(dataset, fallbackKey) {
    // Normalisiert die Struktur der JSON-Daten
    if (Array.isArray(dataset?.elements)) {
        return {
            label: dataset.label || formatDeviceLabel(fallbackKey),
            description: dataset.description || 'Turn10-Elemente für dieses Gerät',
            elements: dataset.elements.map((el, index) => ({
                ...el,
                name: el.name || `Element ${index + 1}`,
                summary: el.summary || el.desc || 'Beschreibung folgt.',
                video: el.video || `https://www.youtube.com/results?search_query=Turn10+${encodeURIComponent(fallbackKey)}+${encodeURIComponent(el.name)}`,
                optimalausfuehrung: Array.isArray(el.optimalausfuehrung)
                    ? el.optimalausfuehrung
                    : [...(Array.isArray(el.technique) ? el.technique : []), ...(Array.isArray(el.focus) ? el.focus : [])],
                nicht_anerkennung: Array.isArray(el.nicht_anerkennung) ? el.nicht_anerkennung : [],
                difficulty: el.difficulty || 'Mittel',
                punkte: el.punkte || 0.5
            }))
        };
    }
    // Fallback für verschachtelte Struktur
    const groups = dataset?.turn10_datenbank?.geraet_boden?.elemente || {};
    const elements = Object.values(groups).flatMap((items) => Array.isArray(items) ? items : []);
    return {
        label: dataset?.label || formatDeviceLabel(fallbackKey),
        description: dataset?.description || 'Turn10-Elemente für dieses Gerät',
        elements: elements.map((el, index) => ({
            ...el,
            name: el.name || `Element ${index + 1}`,
            summary: el.summary || el.optimalausfuehrung?.join(' • ') || 'Beschreibung folgt.',
            video: el.video || `https://www.youtube.com/results?search_query=Turn10+${encodeURIComponent(fallbackKey)}+${encodeURIComponent(el.name)}`,
            optimalausfuehrung: Array.isArray(el.optimalausfuehrung) ? el.optimalausfuehrung : [],
            nicht_anerkennung: Array.isArray(el.nicht_anerkennung) ? el.nicht_anerkennung : [],
            difficulty: el.difficulty || 'Mittel',
            punkte: el.punkte || 0.5
        }))
    };
}

// --- INITIALISIERUNG ---
async function initLibrary() {
    const container = document.getElementById('element-container');

    try {
        const deviceFiles = [
            'data/boden-elemente.json', 'data/balken-elemente.json', 'data/barren-elemente.json',
            'data/stufenbarren-elemente.json', 'data/tiefreck-elemente.json', 'data/hochreck-elemente.json',
            'data/minitrampolin-elemente.json', 'data/reck-elemente.json', 'data/sprung-elemente.json'
        ];

        const results = await Promise.allSettled(deviceFiles.map(async (file) => {
            const response = await fetch(file);
            if (!response.ok) {
                throw new Error(`${file} konnte nicht geladen werden (${response.status})`);
            }
            return response.json();
        }));

        appData = {};
        results.forEach((result, index) => {
            if (result.status !== 'fulfilled' || !Array.isArray(result.value?.elements)) {
                if (result.status === 'rejected') console.error(result.reason);
                return;
            }
            const dataset = result.value;
            const key = dataset.device || deviceFiles[index].replace('data/', '').replace('-elemente.json', '');
            appData[key] = normalizeDeviceData(dataset, key);
        });

        deviceList = Object.keys(appData);
        createDeviceButtons();
        const firstButton = document.querySelector('.device-btn');
        if (deviceList.length > 0) {
            loadElements(deviceList[0], firstButton);
        } else if (container) {
            container.innerHTML = '<p class="library-message error">Die Elemente konnten nicht geladen werden. Bitte lade die Seite erneut.</p>';
        }
    } catch (error) {
        console.error('Fehler beim Laden der Bibliothek:', error);
        if (container) {
            container.innerHTML = '<p class="library-message error">Die Elemente konnten nicht geladen werden. Bitte lade die Seite erneut.</p>';
        }
    }
}

function createDeviceButtons() {
    const menu = document.getElementById('device-menu');
    if (!menu) return;
    menu.innerHTML = '';
    deviceList.forEach((deviceKey) => {
        const btn = document.createElement('button');
        btn.innerText = appData[deviceKey].label;
        btn.className = 'device-btn';
        btn.onclick = () => loadElements(deviceKey, btn);
        menu.appendChild(btn);
    });
}

// --- RENDER FUNKTIONEN ---
function loadElements(geraet, clickedBtn) {
    const buttons = document.querySelectorAll('.device-btn');
    buttons.forEach((btn) => btn.classList.remove('active-device'));
    if (clickedBtn) clickedBtn.classList.add('active-device');

    const dataset = appData[geraet];
    document.getElementById('library-title').innerText = `${dataset.label}-Elemente`;
    document.getElementById('library-description').innerText = dataset.description;

    const container = document.getElementById('element-container');
    container.innerHTML = '';

    dataset.elements.forEach((el) => {
        const btn = document.createElement('button');
        btn.className = 'element-btn';
        // Neues Design: Getrennte Klassen für Titel und Badge
        btn.innerHTML = `
            <div class="element-title">${el.name}</div>
            <div class="difficulty-badge">${el.difficulty}</div>
        `;
        btn.onclick = () => showDetail(el, dataset.label);
        container.appendChild(btn);
    });
}

function showDetail(el, deviceLabel) {
    const modal = document.getElementById('detail-modal');
    
    // Basis-Infos setzen
    document.getElementById('modal-title').textContent = el.name;
    document.getElementById('modal-desc').textContent = el.summary;
    
    // Chips füllen (falls vorhanden)
    if(document.getElementById('device-chip')) document.getElementById('device-chip').textContent = deviceLabel;
    if(document.getElementById('difficulty-chip')) document.getElementById('difficulty-chip').textContent = el.difficulty;
    if(document.getElementById('points-chip')) document.getElementById('points-chip').textContent = `${el.punkte} Pkt.`;

    // 1. Video Einbetten
    const videoContainer = document.getElementById('video-container');
    const videoLinkBtn = document.getElementById('video-link');
    
    let embedUrl = '';
    try {
        const videoUrl = new URL(el.video);
        if (videoUrl.hostname === 'youtu.be') {
            embedUrl = `https://www.youtube.com/embed/${videoUrl.pathname.slice(1)}`;
        } else if (videoUrl.hostname.endsWith('youtube.com')) {
            const videoId = videoUrl.searchParams.get('v');
            if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}`;
        }
    } catch (error) {
        console.error('Ungültiger Video-Link:', error);
    }

    videoContainer.innerHTML = embedUrl
        ? `<iframe width="100%" height="100%" src="${embedUrl}" title="Video-Anleitung: ${el.name}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`
        : '<p class="video-placeholder">Für dieses Element ist nur die externe Videosuche verfügbar.</p>';
    videoLinkBtn.href = el.video;

    // 2. Listen dynamisch bauen mit Karten-Optik
    const buildCardHTML = (items, title, icon) => {
        if (!items || items.length === 0) return '';
        return `
            <div class="detail-card">
                <h3>${icon} ${title}</h3>
                <ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>
            </div>
        `;
    };
    
    // Einfügen in die entsprechenden Container
    // Hinweis: Diese IDs müssen in deinem HTML existieren
    document.getElementById('element-focus').innerHTML = buildCardHTML(el.optimalausfuehrung, "Optimalausführung", "⭐");
    document.getElementById('element-analysis').innerHTML = buildCardHTML(el.nicht_anerkennung, "Nicht-Anerkennung", "⚠️");

    modal.style.display = 'flex';
}

function closeModal() {
    document.getElementById('detail-modal').style.display = 'none';
    document.getElementById('video-container').innerHTML = ''; // Stoppt Video
}

// --- EVENTS ---
const detailModal = document.getElementById('detail-modal');
if (detailModal) {
    detailModal.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal-overlay')) closeModal();
    });
}

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && detailModal?.style.display === 'flex') closeModal();
});

window.closeModal = closeModal;
window.loadElements = loadElements;

initLibrary();
