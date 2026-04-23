const JIKAN_BASE = 'https://api.jikan.moe/v4';
let currentPage = 1;
let currentMode = 'top/anime';
let searchTimeout;
let isLoading = false;

window.onload = () => loadData();

// Infinite Scroll Trigger
window.onscroll = () => {
    if (currentMode === 'mylist') return;
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 600) {
        if (!isLoading) loadData();
    }
};

function getMyList() { 
    return JSON.parse(localStorage.getItem('animeHubList')) || []; 
}

function setMode(mode, btnId) {
    currentMode = mode;
    currentPage = 1;
    document.getElementById('resultsGrid').innerHTML = '';
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(btnId).classList.add('active');

    const clearBtn = document.getElementById('clearAllBtn');
    if (mode === 'mylist') {
        document.getElementById('sectionTitle').innerText = "Personal Collection";
        clearBtn.style.display = 'block';
        displayCards(getMyList());
    } else {
        clearBtn.style.display = 'none';
        const titles = {
            'top/anime': 'Global Rated Anime',
            'top/manga': 'Top Rated Manga',
            'top/manga?type=novel': 'Premium Light Novels',
            'seasons/now': 'Trending Now'
        };
        document.getElementById('sectionTitle').innerText = titles[mode] || 'Global Rated';
        loadData();
    }
}

async function loadData() {
    if (isLoading) return;
    isLoading = true;
    try {
        const url = `${JIKAN_BASE}/${currentMode}${currentMode.includes('?') ? '&' : '?'}page=${currentPage}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.data && data.data.length > 0) {
            displayCards(data.data);
            currentPage++;
        }
    } catch (e) {
        console.error("Fetch error:", e);
    } finally {
        setTimeout(() => { isLoading = false; }, 500); // Prevent rapid-fire scrolling
    }
}

function displayCards(list) {
    const grid = document.getElementById('resultsGrid');
    list.forEach((item, index) => {
        const title = item.title_english || item.title;
        const img = item.images?.jpg?.large_image_url || item.img;
        const id = item.mal_id || item.id;
        const type = item.type || "N/A";
        const score = item.score || "N/A";

        const card = document.createElement('div');
        card.className = 'card';
        card.style.animation = `slideUp 0.8s ease forwards ${index * 0.05}s`;

        card.innerHTML = `
            <button class="action-btn" onclick="handleAction(event, this, ${JSON.stringify({id, title, img, score, type}).replace(/"/g, '&quot;')})">
                <i class="${currentMode === 'mylist' ? 'fas fa-trash' : 'fas fa-plus'}"></i>
            </button>
            <img src="${img}" alt="${title}" loading="lazy">
            <div class="card-overlay">
                <h4>${title}</h4>
                <div class="tags">
                    <span class="tag">${type}</span>
                    <span class="tag">★ ${score}</span>
                </div>
            </div>
        `;
        
        // --- SMART REDIRECTION LOGIC ---
        card.onclick = (e) => {
            if (e.target.closest('.action-btn')) return;

            let targetUrl = "";
            if (currentMode.includes('type=novel') || type.toLowerCase() === 'novel') {
                targetUrl = 'https://ranobes.top/';
            } else if (currentMode.includes('manga') || type.toLowerCase().includes('manga')) {
                targetUrl = 'https://mangafire.to/home';
            } else {
                targetUrl = 'https://anikai.to/home';
            }
            window.open(targetUrl, '_blank');
        };
        
        grid.appendChild(card);
    });
}

function handleAction(event, button, item) {
    event.stopPropagation();
    let list = getMyList();
    
    if (currentMode === 'mylist') {
        list = list.filter(i => i.id !== item.id);
        const card = button.closest('.card');
        card.style.opacity = '0';
        setTimeout(() => card.remove(), 400);
    } else {
        if (!list.some(i => i.id === item.id)) {
            list.push(item);
            button.innerHTML = '<i class="fas fa-check"></i>';
            button.style.background = '#2ed573';
            button.style.borderColor = '#2ed573';
        }
    }
    localStorage.setItem('animeHubList', JSON.stringify(list));
}

function clearFullList() {
    if(confirm("Wipe your entire collection?")) {
        localStorage.setItem('animeHubList', '[]');
        document.getElementById('resultsGrid').innerHTML = '';
    }
}

// Search Logic
document.getElementById('searchInput').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    
    if (!query) {
        if (query === "") setMode(currentMode, document.querySelector('.nav-btn.active').id);
        return;
    }

    searchTimeout = setTimeout(async () => {
        let typeSearch = (currentMode.includes('manga') || currentMode.includes('novel')) ? 'manga' : 'anime';
        
        const res = await fetch(`${JIKAN_BASE}/${typeSearch}?q=${query}`);
        const data = await res.json();
        
        document.getElementById('resultsGrid').innerHTML = '';
        if (data.data) {
            displayCards(data.data.filter(i => 
                (i.title_english || i.title).toLowerCase().includes(query.toLowerCase())
            ));
        }
    }, 600);
});