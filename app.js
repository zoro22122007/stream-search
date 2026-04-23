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

// Mode Switcher
window.setMode = function(mode) {
    currentMode = mode;
    document.getElementById('tvBtn').classList.toggle('active-nav', mode === 'tv');
    document.getElementById('movieBtn').classList.toggle('active-nav', mode === 'movie');
    document.getElementById('animeBtn').classList.toggle('active-nav', mode === 'anime');
    
    searchInput.value = '';
    suggestionsBox.style.display = 'none';
    
    if(mode === 'anime') loadAnimeTrending();
    else loadTrending();
};

async function loadTrending() {
    resultsGrid.innerHTML = `<h2 class="section-title" style="grid-column:1/-1">Trending ${currentMode === 'tv' ? 'Series' : 'Movies'}</h2>`;
    const response = await fetch(`${BASE_URL}/trending/${currentMode}/week?api_key=${API_KEY}`);
    const data = await response.json();
    displayCards(data.results);
}

async function loadAnimeTrending() {
    resultsGrid.innerHTML = `<h2 class="section-title" style="grid-column:1/-1">Trending Anime</h2>`;
    const response = await fetch(`${BASE_URL}/discover/tv?api_key=${API_KEY}&with_genres=16&with_original_language=ja&sort_by=popularity.desc`);
    const data = await response.json();
    displayCards(data.results);
}

// Suggestions
searchInput.addEventListener('input', async () => {
    const query = searchInput.value;
    if (query.length < 2) {
        suggestionsBox.style.display = 'none';
        return;
    }
    const type = currentMode === 'anime' ? 'tv' : currentMode;
    const res = await fetch(`${BASE_URL}/search/${type}?api_key=${API_KEY}&query=${encodeURIComponent(query)}`);
    const data = await res.json();
    
    if (data.results && data.results.length > 0) {
        suggestionsBox.innerHTML = data.results.slice(0, 6).map(item => `
            <div class="suggestion-item" onclick="selectSuggestion('${item.id}', '${(item.name || item.title).replace(/'/g, "\\'")}')">
                <img src="${item.poster_path ? IMG_URL + item.poster_path : 'https://placehold.co/30x45?text=No+Img'}">
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
    resultsGrid.innerHTML = `<h2 class="section-title" style="grid-column:1/-1">Results for: ${query}</h2>`;
    displayCards(data.results);
}

function displayCards(list) {
    if (!list || list.length === 0) return;
    list.forEach((item, index) => {
        if (!item.poster_path) return;
        const card = document.createElement('div');
        card.className = 'card';
        card.style.animationDelay = `${index * 0.05}s`;
        card.innerHTML = `
            <img src="${IMG_URL + item.poster_path}" onerror="this.src='https://placehold.co/200x300?text=No+Poster'">
            <div style="padding: 15px;">
                <h4>${item.name || item.title}</h4>
                <p style="color:#ff4d4d; font-size: 0.8rem;">⭐ ${item.vote_average.toFixed(1)}</p>
            </div>
        `;
        card.onclick = () => showDetails(item.id, (item.name || item.title).replace(/'/g, "\\'"));
        resultsGrid.appendChild(card);
    });
}

// THE GLOBAL DETAILS FUNCTION
async function showDetails(id, title) {
    const type = currentMode === 'anime' ? 'tv' : currentMode;
    const selectedRegion = regionSelect.value; // GET SELECTED REGION FROM UI

    try {
        const res = await fetch(`${BASE_URL}/${type}/${id}?api_key=${API_KEY}`);
        const detail = await res.json();
        const watchRes = await fetch(`${BASE_URL}/${type}/${id}/watch/providers?api_key=${API_KEY}`);
        const watchData = await watchRes.json();
        
        const regionData = watchData.results?.[selectedRegion];
        const providers = regionData?.flatrate || [];
        const watchLink = regionData?.link || "#"; 
        const inList = myList.some(item => item.id == id);

        document.getElementById('modalDetails').innerHTML = `
            <h2>${title}</h2>
            <p style="margin:15px 0; font-size:0.9rem; color:#ccc; line-height:1.5;">${detail.overview}</p>
            <button class="list-add-btn" onclick="toggleMyList('${id}', '${title.replace(/'/g, "\\'")}', '${detail.poster_path}')">
                ${inList ? 'REMOVE FROM LIST' : 'ADD TO MY LIST'}
            </button>
            <h3 style="margin-top:25px; border-top:1px solid #333; padding-top:15px;">Streaming in ${selectedRegion} on:</h3>
            <div style="display:flex; justify-content:center; flex-wrap:wrap; gap:15px; margin-top:10px;">
                ${providers.map(p => `
                    <a href="${watchLink}" target="_blank" title="${p.provider_name}">
                        <img src="${IMG_URL + p.logo_path}" width="55" style="border-radius:12px; border:2px solid #444;">
                    </a>
                `).join('') || `<p style="color:#888;">Not found on subscription in ${selectedRegion}. Try switching regions!</p>`}
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
    resultsGrid.innerHTML = '<h2 class="section-title" style="grid-column:1/-1">Saved to My List</h2>';
    if (myList.length === 0) { resultsGrid.innerHTML += "<p style='margin-left:20px;'>Your list is empty.</p>"; return; }
    displayCards(myList.map(i => ({ id: i.id, name: i.title, poster_path: i.poster, vote_average: 0 })));
};

function updateListCount() { listCountSpan.innerText = myList.length; }

document.getElementById('searchBtn').onclick = searchMedia;
searchInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') searchMedia(); });
document.querySelector('.close-modal').onclick = () => modal.style.display = 'none';
window.onclick = (e) => { if(e.target == modal) modal.style.display = 'none'; };