const JIKAN_BASE = 'https://api.jikan.moe/v4';
let currentPage = 1;
let currentMode = 'top/anime';

window.onload = () => loadData();

function getMyList() {
    return JSON.parse(localStorage.getItem('animeHubList')) || [];
}

function setMode(mode, btnId) {
    currentMode = mode;
    currentPage = 1;
    document.getElementById('resultsGrid').innerHTML = '';
    
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    document.getElementById(btnId).classList.add('active');

    if (mode === 'mylist') {
        document.getElementById('sectionTitle').innerText = "My Saved List";
        document.getElementById('loadMoreBtn').style.display = 'none';
        displayCards(getMyList());
    } else {
        document.getElementById('loadMoreBtn').style.display = 'block';
        const titles = { 'top/anime': 'Highest Rated Anime', 'top/manga': 'Highest Rated Manga', 'seasons/now': 'Trending' };
        document.getElementById('sectionTitle').innerText = titles[mode];
        loadData();
    }
}

async function loadData() {
    try {
        const res = await fetch(`${JIKAN_BASE}/${currentMode}?page=${currentPage}`);
        const data = await res.json();
        displayCards(data.data);
    } catch (err) { console.error(err); }
}

function displayCards(list) {
    const grid = document.getElementById('resultsGrid');
    const isMyListPage = (currentMode === 'mylist');

    list.forEach((item, index) => {
        const title = item.title_english || item.title;
        const img = item.images?.jpg?.large_image_url || item.img;
        const id = item.mal_id || item.id;
        
        // Figure out details based on type
        let subDetail = "";
        if (currentMode.includes('manga') || item.chapters) {
            const ch = item.chapters || "?";
            const vol = item.volumes || "?";
            subDetail = `<span class="detail-tag">${ch} CHs</span> <span class="detail-tag">${vol} VOLs</span>`;
        } else {
            const eps = item.episodes || "?";
            // Most modern anime are Sub/Dub, we display the format
            const format = item.type || "TV"; 
            subDetail = `<span class="detail-tag">${eps} EPs</span> <span class="detail-tag">${format}</span>`;
        }

        const card = document.createElement('div');
        card.className = 'card';
        card.style.animationDelay = `${index * 0.05}s`;

        const buttonIcon = isMyListPage ? '✕' : '+';
        const buttonClass = isMyListPage ? 'action-btn remove-mode' : 'action-btn';

        card.innerHTML = `
            <button class="${buttonClass}" onclick="handleAction(event, this, ${JSON.stringify({id, title, img, subDetail}).replace(/"/g, '&quot;')})">
                ${buttonIcon}
            </button>
            <img src="${img}">
            <div class="card-info">
                <h4>${title}</h4>
                <div class="card-details">${subDetail}</div>
            </div>
        `;

        card.onclick = (e) => {
            if(e.target.closest('.action-btn')) return;
            const homeUrl = currentMode.includes('manga') ? 'https://mangafire.to/home' : 'https://anikai.to/home';
            window.open(homeUrl, '_blank');
        };

        grid.appendChild(card);
    });
}

function handleAction(event, button, item) {
    event.stopPropagation();
    let list = getMyList();

    if (currentMode === 'mylist') {
        list = list.filter(s => s.id !== item.id);
        localStorage.setItem('animeHubList', JSON.stringify(list));
        button.closest('.card').style.opacity = '0';
        setTimeout(() => setMode('mylist', 'myList'), 300);
    } else {
        if (!list.some(s => s.id === item.id)) {
            list.push(item);
            localStorage.setItem('animeHubList', JSON.stringify(list));
            button.innerText = '✓';
            button.classList.add('added');
            setTimeout(() => {
                button.innerText = '+';
                button.classList.remove('added');
            }, 1500);
        }
    }
}

function loadMore() {
    currentPage++;
    loadData();
}

// Enter key search
document.getElementById('searchInput').addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
        const query = e.target.value;
        const type = currentMode.includes('manga') ? 'manga' : 'anime';
        const res = await fetch(`${JIKAN_BASE}/${type}?q=${query}`);
        const data = await res.json();
        document.getElementById('resultsGrid').innerHTML = '';
        displayCards(data.data);
    }
});