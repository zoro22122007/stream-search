const JIKAN_BASE = 'https://api.jikan.moe/v4';

let currentPage = 1;
let currentFetchType = 'top';
let searchTimeout;
let isSearching = false;

window.onload = () => {
    loadData();
};

function resetAndLoad(type) {
    currentPage = 1;
    currentFetchType = type;
    isSearching = false;
    document.getElementById('searchInput').value = '';
    showSkeletons();
    
    document.getElementById('topBtn').classList.toggle('active', type === 'top');
    document.getElementById('mangaBtn').classList.toggle('active', type === 'manga');
    document.getElementById('trendBtn').classList.toggle('active', type === 'trending');
    document.getElementById('listBtn').classList.toggle('active', type === 'mylist');
    
    document.getElementById('loadMoreBtn').style.display = type === 'mylist' ? 'none' : 'inline-block';
    loadData();
}

function showSkeletons() {
    const grid = document.getElementById('resultsGrid');
    grid.innerHTML = '';
    for(let i=0; i<12; i++) {
        const div = document.createElement('div');
        div.className = 'skeleton';
        grid.appendChild(div);
    }
}

async function loadData() {
    let url = "";
    if (currentFetchType === 'top') {
        document.getElementById('sectionTitle').innerText = "Highest Rated Anime";
        url = `${JIKAN_BASE}/top/anime?page=${currentPage}`;
        fetchData(url);
    } 
    else if (currentFetchType === 'trending') {
        document.getElementById('sectionTitle').innerText = "Trending This Season";
        url = `${JIKAN_BASE}/seasons/now?page=${currentPage}`;
        fetchData(url);
    }
    else if (currentFetchType === 'manga') {
        document.getElementById('sectionTitle').innerText = "Highest Rated Manga";
        url = `${JIKAN_BASE}/top/manga?page=${currentPage}`;
        fetchData(url);
    }
    else if (currentFetchType === 'mylist') {
        document.getElementById('sectionTitle').innerText = "My Saved List";
        loadMyList();
    }
}

async function fetchData(url) {
    try {
        const res = await fetch(url);
        const data = await res.json();
        if(currentPage === 1) document.getElementById('resultsGrid').innerHTML = '';
        displayCards(data.data.map(i => ({
            id: `${currentFetchType}_${i.mal_id}`,
            name: i.title_english || i.title,
            img: i.images.jpg.large_image_url,
            rating: i.score,
            link: i.url
        })));
    } catch (err) { console.error(err); }
}

function displayCards(list) {
    const grid = document.getElementById('resultsGrid');
    list.forEach((item, index) => {
        if (!item.img) return;
        const card = document.createElement('div');
        card.className = 'card';
        card.style.animationDelay = `${index * 0.04}s`; // Staggered reveal
        card.setAttribute('data-item', JSON.stringify(item));

        const isMyListPage = (currentFetchType === 'mylist');
        const btnIcon = isMyListPage ? '✕' : '+';
        const btnFunc = isMyListPage ? 'removeItemFromList(event, this)' : 'saveItemToList(event, this)';

        card.innerHTML = `
            <div class="rating-badge">⭐ ${item.rating ? item.rating.toFixed(1) : 'N/A'}</div>
            <button class="add-to-list-btn" onclick="${btnFunc}">${btnIcon}</button>
            <img src="${item.img}" alt="${item.name}" loading="lazy">
            <h4>${item.name}</h4>
        `;
        
        card.onclick = (e) => {
            if (!e.target.closest('.add-to-list-btn')) {
                window.open(item.link, '_blank');
            }
        };
        grid.appendChild(card);
    });
}

function loadMore() {
    if (isSearching || currentFetchType === 'mylist') return;
    currentPage++;
    loadData();
}

document.getElementById('searchInput').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    if (query.length === 0) { resetAndLoad(currentFetchType); return; }
    if (query.length < 3) return;

    searchTimeout = setTimeout(async () => {
        isSearching = true;
        showSkeletons();
        document.getElementById('loadMoreBtn').style.display = 'none';

        const searchType = currentFetchType === 'manga' ? 'manga' : 'anime';
        const res = await fetch(`${JIKAN_BASE}/${searchType}?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        
        document.getElementById('resultsGrid').innerHTML = '';
        displayCards(data.data.map(i => ({
            id: `${searchType}_${i.mal_id}`, name: i.title_english || i.title, img: i.images.jpg.large_image_url, rating: i.score, link: i.url
        })));
    }, 600);
});

/* LIST LOGIC */
function getSavedList() { return JSON.parse(localStorage.getItem('animehub_list')) || []; }

function saveItemToList(event, buttonEl) {
    event.stopPropagation();
    const card = buttonEl.closest('.card');
    const itemData = JSON.parse(card.getAttribute('data-item'));
    let savedList = getSavedList();

    if (!savedList.some(item => item.id === itemData.id)) {
        savedList.push(itemData);
        localStorage.setItem('animehub_list', JSON.stringify(savedList));
        buttonEl.innerHTML = '✓';
        buttonEl.style.background = 'var(--primary)';
        setTimeout(() => { buttonEl.innerHTML = '+'; buttonEl.style.background = ''; }, 1000);
    }
}

function removeItemFromList(event, buttonEl) {
    event.stopPropagation();
    const card = buttonEl.closest('.card');
    const itemData = JSON.parse(card.getAttribute('data-item'));
    let savedList = getSavedList();
    savedList = savedList.filter(item => item.id !== itemData.id);
    localStorage.setItem('animehub_list', JSON.stringify(savedList));
    card.style.transform = "scale(0.5)";
    card.style.opacity = "0";
    setTimeout(() => { loadMyList(); }, 300);
}

function loadMyList() {
    const grid = document.getElementById('resultsGrid');
    grid.innerHTML = '';
    const savedList = getSavedList();
    if (savedList.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 50px; color: #444;">Empty List</p>';
        return;
    }
    displayCards(savedList);
}