// Configurações Iniciais do Mapa
const map = L.map('map', {
    center: [20, 0], 
    zoom: 2,
    minZoom: 2,
    maxBounds: [[-90, -180], [90, 180]]
});

// Camada de Mapa Base (Filtrada pelo CSS)
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO | Dev: Luis Cereda',
    subdomains: 'abcd',
    maxZoom: 20
}).addTo(map);

// Elementos do Player Global
const globalPlayer = document.getElementById('global-player');
const audioElement = document.getElementById('audio-element');
const playingTitle = document.getElementById('playing-title');
const closePlayer = document.getElementById('close-player');

// Função para tocar áudio
function playPodcast(title, url) {
    if (!url) {
        alert("Link de áudio não encontrado para este episódio.");
        return;
    }
    playingTitle.innerText = title;
    audioElement.src = url;
    globalPlayer.classList.remove('player-hidden');
    audioElement.play();
}

// Fechar Player
closePlayer.addEventListener('click', () => {
    globalPlayer.classList.add('player-hidden');
    audioElement.pause();
});

// Carregar Dados do JSON
fetch('episodes.json')
    .then(response => response.json())
    .then(episodes => {
        // Agrupar episódios por coordenadas
        const groups = {};
        episodes.forEach(ep => {
            if (!ep.coords || (ep.coords[0] === 0 && ep.coords[1] === 0)) return;
            const key = ep.coords.join(',');
            if (!groups[key]) groups[key] = [];
            groups[key].push(ep);
        });

        Object.keys(groups).forEach(key => {
            const group = groups[key];
            
            // Função para extrair o número da parte (Pt. 1, Pt 1, Parte 2, etc)
            const getPart = (title) => {
                const match = title.match(/(?:Pt\.?|Parte)\s*(\d+)/i);
                return match ? parseInt(match[1]) : 999;
            };

            // Ordenar por Parte. Se não houver Parte ou forem iguais, usar ID de forma decrescente
            // (Neste JSON, IDs maiores representam episódios mais antigos)
            group.sort((a, b) => {
                const partA = getPart(a.title);
                const partB = getPart(b.title);
                
                if (partA !== partB) return partA - partB;
                return b.id - a.id; 
            });

            const coords = key.split(',').map(Number);

            // Ícone Personalizado (Alfinete)
            const pinIcon = L.divIcon({
                className: 'custom-pin-container',
                html: `<div class="custom-pin"></div><div class="pin-shadow"></div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 30]
            });

            const marker = L.marker(coords, { icon: pinIcon }).addTo(map);

            // Conteúdo do Popup com suporte a múltiplos episódios
            let popupContent = `<div class="popup-card multi-ep" id="popup-${key.replace(/[,.]/g, '-')}">`;
            
            group.forEach((ep, index) => {
                popupContent += `
                    <div class="ep-slide ${index === 0 ? 'active' : ''}" data-index="${index}">
                        <img src="${ep.image}" alt="${ep.title}" class="popup-img" onerror="this.src='https://via.placeholder.com/280x140?text=Fronteiras+Invisíveis'">
                        <div class="popup-info">
                            <h3 title="${ep.title}">${ep.title}</h3>
                            <p class="popup-desc">${ep.description}</p>
                            <button class="btn-play" onclick="playPodcast('${ep.title.replace(/'/g, "\\'")}', '${ep.audio}')">
                                <span>▶</span> OUVIR EPISÓDIO
                            </button>
                        </div>
                    </div>
                `;
            });

            // Se houver mais de um episódio, adicionar controles
            if (group.length > 1) {
                popupContent += `
                    <div class="ep-controls">
                        ${group.map((_, i) => `<button class="ctrl-dot ${i === 0 ? 'active' : ''}" onclick="switchEp('${key.replace(/[,.]/g, '-')}', ${i})">${i + 1}</button>`).join('')}
                    </div>
                `;
            }

            popupContent += `</div>`;

            marker.bindPopup(popupContent, {
                maxWidth: 300,
                autoPan: false,
                className: 'custom-popup'
            });

            marker.on('mouseover', function (e) {
                this.openPopup();
            });
        });
    })
    .catch(error => console.error('Erro ao carregar episódios:', error));

// Função para alternar entre episódios no popup
function switchEp(key, index) {
    const card = document.getElementById(`popup-${key}`);
    if (!card) return;
    
    // Esconder todos os slides e remover destaque dos pontos
    const slides = card.querySelectorAll('.ep-slide');
    const dots = card.querySelectorAll('.ctrl-dot');
    
    slides.forEach(s => s.classList.remove('active'));
    dots.forEach(d => d.classList.remove('active'));
    
    // Mostrar o slide selecionado e destacar o ponto
    slides[index].classList.add('active');
    dots[index].classList.add('active');
}

// Ajustar o mapa ao carregar
window.addEventListener('load', () => {
    setTimeout(() => {
        map.invalidateSize();
    }, 500);
});
