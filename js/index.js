/* =============================
    VARIABLES GLOBALES
================================*/
let menuData = [];
let allergensMap = {};

// Normalizador universal (quita tildes + minúsculas)
function normalize(str) {
    return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
}

/* =============================
    CARGA DE JSON (MENÚ + ALÉRGENOS)
================================*/
Promise.all([
    fetch("json/menu.json").then(r => r.json()),
    fetch("json/allergens.json").then(r => r.json())
])
    .then(([menu, allergens]) => {
        menuData = menu;

        // Convertimos los alérgenos a un mapa { slug: objeto }
        allergens.forEach(a => {
            allergensMap[a.slug.toLowerCase()] = a;
        });

        renderMenu(menuData);
    })
    .catch(err => console.error("Error cargando JSON:", err));


/* =============================
    ELEMENTOS DEL DOM
================================*/
const container = document.getElementById('menuContainer');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const clearBtn = document.getElementById('clearBtn');
const noResultsEl = document.getElementById('noResults');
const printBtn = document.getElementById('printBtn');

// Modal
const dishModalEl = document.getElementById('dishModal');
const dishModal = new bootstrap.Modal(dishModalEl);

const dishModalTitle = document.getElementById('dishModalTitle');
const dishModalDescription = document.getElementById('dishModalDescription');
const dishModalIngredients = document.getElementById('dishModalIngredients');
const dishModalAllergens = document.getElementById('dishModalAllergens');
const dishModalSetup = document.getElementById('dishModalSetup');
const dishModalFlavor = document.getElementById('dishModalFlavor');
const dishModalTags = document.getElementById('dishModalTags');
const dishModalImage = document.getElementById('dishModalImage');

const favModalBtn = document.getElementById('favModalBtn');
const favModalIcon = document.getElementById('favModalIcon');

let currentDishId = null;
let favorites = new Set(JSON.parse(localStorage.getItem('pn_favs') || '[]'));


/* =============================
    RENDERIZAR GRID DEL MENÚ
================================*/
function renderMenu(list) {
    container.innerHTML = '';

    if (!list.length) {
        noResultsEl.classList.remove('d-none');
        return;
    } else {
        noResultsEl.classList.add('d-none');
    }

    list.forEach(item => {
        const col = document.createElement('div');
        col.className = 'col-sm-6 col-lg-4';

        const card = document.createElement('div');
        card.className = 'card card-menu h-100';

        const img = document.createElement('img');
        img.className = 'card-img-top placeholder-img';
        img.alt = item.name;
        img.src = item.image || 'img/placeholder.jpg';
        img.onerror = () => { img.src = 'img/placeholder.jpg'; };

        const body = document.createElement('div');
        body.className = 'card-body d-flex flex-column';

        body.innerHTML = `
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <span class="cat-badge text-muted">${item.category}</span>
                    <h5 class="mt-1 mb-1">${item.name}</h5>
                </div>
                <div class="text-end">
                    <button class="btn btn-sm btn-outline-secondary fav-btn" data-id="${item.id}">
                        ${favorites.has(item.id) ? '★' : '☆'}
                    </button>
                </div>
            </div>

            <p class="text-muted small mb-2">${item.short}</p>

            <div class="mb-2">
                ${item.tags.map(t => `<span class="badge bg-light text-dark badge-tag">${t}</span>`).join(' ')}
            </div>

            <div class="mt-auto d-flex justify-content-between align-items-center">
                <small class="text-muted">Alérgenos: ${item.allergens}</small>
                <button class="btn btn-sm btn-primary btn-detail" data-id="${item.id}">Ver</button>
            </div>
        `;

        card.appendChild(img);
        card.appendChild(body);
        col.appendChild(card);
        container.appendChild(col);

        // Eventos
        body.querySelector('.btn-detail').addEventListener('click', () => openDishModal(item.id));

        body.querySelector('.fav-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(item.id, e.currentTarget);
        });
    });
}


/* =============================
    FAVORITOS
================================*/
function toggleFavorite(id, btnEl) {
    if (favorites.has(id)) {
        favorites.delete(id);
        btnEl.textContent = '☆';
    } else {
        favorites.add(id);
        btnEl.textContent = '★';
    }
    localStorage.setItem('pn_favs', JSON.stringify([...favorites]));
}


/* =============================
    MODAL DE PLATO
================================*/
function openDishModal(id) {
    const dish = menuData.find(d => d.id === id);
    if (!dish) return;

    currentDishId = id;

    dishModalTitle.textContent = dish.name;
    dishModalDescription.textContent = dish.description;
    dishModalIngredients.textContent = dish.ingredients;

    /* ------ ALÉRGENOS DINÁMICOS ------ */
    dishModalAllergens.innerHTML = "";

    const allergenList = dish.allergens
        .split(",")
        .map(a => normalize(a).replace(/\s+/g, "-"));

    allergenList.forEach(al => {
        const info = allergensMap[al];
        if (!info) return;

        const wrapper = document.createElement("div");
        wrapper.className = "d-inline-flex align-items-center me-2 mb-1";

        const img = document.createElement("img");
        img.src = info.icon;
        img.alt = info.name;
        img.className = "allergen-icon";

        const label = document.createElement("span");
        label.textContent = info.name;
        label.className = "ms-1 small";

        wrapper.appendChild(img);
        wrapper.appendChild(label);
        dishModalAllergens.appendChild(wrapper);
    });

    dishModalSetup.textContent = dish.setup;
    dishModalFlavor.textContent = dish.flavor;

    dishModalImage.src = dish.image || 'img/placeholder.jpg';
    dishModalImage.onerror = () => { dishModalImage.src = 'img/placeholder.jpg'; };

    dishModalTags.innerHTML = dish.tags
        .map(t => `<span class="badge bg-secondary me-1">${t}</span>`)
        .join(' ');

    favModalIcon.textContent = favorites.has(id) ? '★' : '♡';

    dishModal.show();
}

// Botón de favoritos dentro del modal
favModalBtn.addEventListener('click', () => {
    if (!currentDishId) return;

    if (favorites.has(currentDishId))
        favorites.delete(currentDishId);
    else
        favorites.add(currentDishId);

    localStorage.setItem('pn_favs', JSON.stringify([...favorites]));
    favModalIcon.textContent = favorites.has(currentDishId) ? '★' : '♡';
    renderMenu(menuDataFiltered());
});


/* =============================
    BUSCADOR + FILTROS
================================*/
function menuDataFiltered() {
    const q = searchInput.value.trim().toLowerCase();
    const cat = categoryFilter.value;

    return menuData.filter(d => {
        if (cat !== 'all' && d.category !== cat) return false;
        if (!q) return true;

        const hay = (
            d.name +
            " " + d.short +
            " " + d.description +
            " " + d.ingredients +
            " " + d.allergens +
            " " + d.tags.join(' ')
        ).toLowerCase();

        return hay.includes(q);
    });
}

function applyFilters() {
    renderMenu(menuDataFiltered());
}

searchInput.addEventListener('input', applyFilters);
categoryFilter.addEventListener('change', applyFilters);
clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    categoryFilter.value = 'all';
    applyFilters();
});

printBtn.addEventListener('click', () => window.print());


// Primera renderización
renderMenu(menuData);
