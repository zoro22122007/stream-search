const API_KEY = '38d2e0b601e99efbde493d2b70ee30ff';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';

let currentMode = 'tv'; 
let myList = JSON.parse(localStorage.getItem('streamList')) || [];

const searchInput = document.getElementById('searchInput');
const suggestionsBox = document.getElementById('suggestions');
const resultsGrid = document.getElementById('resultsGrid');
const modal = document.getElementById('movieModal');
const listCountSpan = document.getElementById('listCount');
const regionSelect = document.getElementById('regionSelect');

window.onload = () => {
    updateListCount();
    loadTrending();
};

window.addEventListener('scroll', () => {
    const nav = document.querySelector('.navbar');
    if (window.scrollY > 50) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
});

window.setMode = function(mode) {
    currentMode = mode;
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    if(mode === 'tv') document.getElementById('tvBtn').classList.add('active');
    if(mode === 'movie') document.getElementById('movieBtn').classList.add('active');
    if(mode === 'anime') document.getElementById('animeBtn').classList.add('active');
    
    searchInput.value = '';
    suggestionsBox.style.display = 'none';
    if(mode === 'anime') loadAnimeTrending();
    else loadTrending();
};

async function loadTrending() {
    document.getElementById('homeBtn').classList.add('active');
    resultsGrid.innerHTML = '';
    const response = await fetch(`${BASE_URL}/trending/${currentMode === 'anime' ? 'tv' : currentMode}/week?api_key=${API_KEY}`);
    const data = await response.json();
    displayCards(data.results);
}

async function loadAnimeTrending() {
    resultsGrid.innerHTML = '';
    const response = await fetch(`${BASE_URL}/discover/tv?api_key=${API_KEY}&with_genres=16&with_original_language=ja&sort_by=popularity.desc`);
    const data = await response.json();
    displayCards(data.results);
}

searchInput.addEventListener('input', async () => {
    const query = searchInput.value;
    if (query.length < 2) { suggestionsBox.style.display = 'none'; return; }
    const type = currentMode === 'anime' ? 'tv' : currentMode;
    const res = await fetch(`${BASE_URL}/search/${type}?api_key=${API_KEY}&query=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (data.results && data.results.length > 0) {
        suggestionsBox.innerHTML = data.results.slice(0, 6).map(item => `
            <div class="suggestion-item" onclick="selectSuggestion('${item.id}', '${(item.name || item.title).replace(/'/g, "\\'")}')">
                <img src="${item.poster_path ? IMG_URL + item.poster_path : 'https://placehold.co/30x45'}">
                <span>${item.name || item.title}</span>
            </div>
        `).join('');
        suggestionsBox.style.display = 'block';
    }
});

window.selectSuggestion = function(id, name) {
    searchInput.value = name;
    suggestionsBox.style.display = 'none';
    searchMedia();
};

async function searchMedia() {
    const query = searchInput.value;
    if(!query) return;
    suggestionsBox.style.display = 'none';
    resultsGrid.innerHTML = '<div class="loader"></div>';
    const type = currentMode === 'anime' ? 'tv' : currentMode;
    const response = await fetch(`${BASE_URL}/search/${type}?api_key=${API_KEY}&query=${encodeURIComponent(query)}`);
    const data = await response.json();
    resultsGrid.innerHTML = '';
    displayCards(data.results);
}

function displayCards(list) {
    if (!list) return;
    list.forEach(item => {
        if (!item.poster_path) return;
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <img src="${IMG_URL + item.poster_path}">
            <h4>${item.name || item.title}</h4>
        `;
        card.onclick = () => showDetails(item.id, (item.name || item.title).replace(/'/g, "\\'"));
        resultsGrid.appendChild(card);
    });
}

async function showDetails(id, title) {
    const type = currentMode === 'anime' ? 'tv' : currentMode;
    const selectedRegion = regionSelect.value;
    try {
        const res = await fetch(`${BASE_URL}/${type}/${id}?api_key=${API_KEY}`);
        const detail = await res.json();
        
        const videoRes = await fetch(`${BASE_URL}/${type}/${id}/videos?api_key=${API_KEY}`);
        const videoData = await videoRes.json();
        const trailer = videoData.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
        const trailerBtn = trailer ? `<a href="https://www.youtube.com/watch?v=${trailer.key}" target="_blank" class="trailer-btn"><i class="fab fa-youtube"></i> Play Trailer</a>` : '';

        const watchRes = await fetch(`${BASE_URL}/${type}/${id}/watch/providers?api_key=${API_KEY}`);
        const watchData = await watchRes.json();
        const regionData = watchData.results?.[selectedRegion];
        const providers = regionData?.flatrate || [];
        const inList = myList.some(item => item.id == id);

        document.getElementById('modalDetails').innerHTML = `
            <div style="padding:40px; text-align:left;">
                <h1 style="margin-top:0;">${title}</h1>
                <p style="color:#aaa; margin-bottom:20px;">${detail.overview}</p>
                ${trailerBtn}
                <button class="list-add-btn" onclick="toggleMyList('${id}', '${title.replace(/'/g, "\\'")}', '${detail.poster_path}')">
                    ${inList ? '✓ In Your List' : '+ Add to My List'}
                </button>
                <h4 style="margin-top:30px;">Available on (${selectedRegion}):</h4>
                <div style="display:flex; gap:10px; margin-top:10px;">
                    ${providers.map(p => `<img src="${IMG_URL + p.logo_path}" width="45" style="border-radius:8px;">`).join('') || 'Not on Subscription'}
                </div>
            </div>
        `;
        modal.style.display = 'block';
    } catch (err) { console.error(err); }
}

window.toggleMyList = function(id, title, poster) {
    const index = myList.findIndex(item => item.id == id);
    if (index === -1) myList.push({ id, title, poster });
    else myList.splice(index, 1);
    localStorage.setItem('streamList', JSON.stringify(myList));
    updateListCount();
    showDetails(id, title);
};

window.showMyList = function() {
    resultsGrid.innerHTML = '';
    displayCards(myList.map(i => ({ id: i.id, name: i.title, poster_path: i.poster })));
};

function updateListCount() { listCountSpan.innerText = myList.length; }
document.getElementById('searchBtn').onclick = searchMedia;
searchInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') searchMedia(); });
document.querySelector('.close-modal').onclick = () => modal.style.display = 'none';
window.onclick = (e) => { if(e.target == modal) modal.style.display = 'none'; };