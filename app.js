const TMDB_API_KEY = '38d2e0b601e99efbde493d2b70ee30ff';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const JIKAN_BASE = 'https://api.jikan.moe/v4';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';

let currentPage = 1;
let currentFetchType = 'top';

window.onload = () => {
    loadData();
};

function resetAndLoad(type) {
    currentPage = 1;
    currentFetchType = type;
    document.getElementById('resultsGrid').innerHTML = '';
    
    document.getElementById('topBtn').classList.toggle('active', type === 'top');
    document.getElementById('mangaBtn').classList.toggle('active', type === 'manga');
    document.getElementById('trendBtn').classList.toggle('active', type === 'trending');
    
    loadData();
}

async function loadData() {
    let url = "";
    const grid = document.getElementById('resultsGrid');

    if (currentFetchType === 'top') {
        document.getElementById('sectionTitle').innerText = "Highest Rated Anime";
        url = `${TMDB_BASE}/discover/tv?api_key=${TMDB_API_KEY}&with_genres=16&with_original_language=ja&sort_by=vote_average.desc&vote_count.gte=100&page=${currentPage}`;
        fetchTMDB(url);
    } 
    else if (currentFetchType === 'trending') {
        document.getElementById('sectionTitle').innerText = "All Trending Anime";
        url = `${TMDB_BASE}/discover/tv?api_key=${TMDB_API_KEY}&with_genres=16&with_original_language=ja&sort_by=popularity.desc&page=${currentPage}`;
        fetchTMDB(url);
    }
    else if (currentFetchType === 'manga') {
        document.getElementById('sectionTitle').innerText = "Highest Rated Manga";
        url = `${JIKAN_BASE}/top/manga?page=${currentPage}`;
        fetchManga(url);
    }
}

async function fetchTMDB(url) {
    const res = await fetch(url);
    const data = await res.json();
    displayCards(data.results.map(i => ({
        name: i.name || i.title,
        img: IMG_URL + i.poster_path,
        rating: i.vote_average,
        link: 'https://anikai.to/home'
    })));
}

async function fetchManga(url) {
    const res = await fetch(url);
    const data = await res.json();
    displayCards(data.data.map(i => ({
        name: i.title,
        img: i.images.jpg.image_url,
        rating: i.score,
        link: 'https://mangafire.to/home'
    })));
}

function loadMore() {
    currentPage++;
    loadData();
}

function displayCards(list) {
    const grid = document.getElementById('resultsGrid');
    list.forEach(item => {
        if (!item.img || item.img.includes('null')) return;
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="rating-badge">⭐ ${item.rating ? item.rating.toFixed(1) : 'N/A'}</div>
            <img src="${item.img}">
            <h4>${item.name}</h4>
        `;
        card.onclick = () => window.open(item.link, '_blank');
        grid.appendChild(card);
    });
}

// Search Logic
document.getElementById('searchInput').addEventListener('input', async (e) => {
    const query = e.target.value;
    if (query.length < 2) return;
    
    const grid = document.getElementById('resultsGrid');
    grid.innerHTML = '';
    
    if (currentFetchType === 'manga') {
        const res = await fetch(`${JIKAN_BASE}/manga?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        displayCards(data.data.map(i => ({
            name: i.title, img: i.images.jpg.image_url, rating: i.score, link: 'https://mangafire.to/home'
        })));
    } else {
        const res = await fetch(`${TMDB_BASE}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`);
        const data = await res.json();
        displayCards(data.results.filter(i => i.origin_country && i.origin_country.includes('JP')).map(i => ({
            name: i.name, img: IMG_URL + i.poster_path, rating: i.vote_average, link: 'https://anikai.to/home'
        })));
    }
});