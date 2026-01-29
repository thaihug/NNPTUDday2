// Configuration - GitHub Raw URL for db.json
const DB_URL = 'db.json';

const ITEMS_PER_PAGE = 10;

// State management
let allProducts = [];
let filteredProducts = [];
let currentPage = 1;
let sortConfig = {
    field: null,
    direction: 'asc'
};

/**
 * Fetch products from GitHub
 */
async function fetchProducts() {
    try {
        const response = await fetch(DB_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        allProducts = data.filter(p => p.id && p.title && p.price && p.description);
        filteredProducts = [...allProducts];
        renderTable();
        updateStats();
    } catch (error) {
        console.error('Error fetching products:', error);
        showError(`❌ Failed to load products: ${error.message}`);
    }
}

/**
 * Handle search input with onChanged event
 */
function handleSearch() {
    const query = document.getElementById('searchInput').value.toLowerCase().trim();
    currentPage = 1;
    
    if (!query) {
        filteredProducts = [...allProducts];
    } else {
        filteredProducts = allProducts.filter(product => {
            const title = product.title ? product.title.toLowerCase() : '';
            const category = product.category && product.category.name ? product.category.name.toLowerCase() : '';
            const description = product.description ? product.description.toLowerCase() : '';
            
            return title.includes(query) || category.includes(query) || description.includes(query);
        });
    }
    
    renderTable();
    updateStats();
}

/**
 * Sort by Name
 */
function sortByName() {
    currentPage = 1;
    
    if (sortConfig.field === 'title') {
        sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    } else {
        sortConfig.field = 'title';
        sortConfig.direction = 'asc';
    }
    
    filteredProducts.sort((a, b) => {
        let valA = a.title.toLowerCase();
        let valB = b.title.toLowerCase();
        
        if (sortConfig.direction === 'asc') {
            return valA.localeCompare(valB);
        } else {
            return valB.localeCompare(valA);
        }
    });
    
    updateSortIcons();
    renderTable();
}

/**
 * Sort by Price
 */
function sortByPrice() {
    currentPage = 1;
    
    if (sortConfig.field === 'price') {
        sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    } else {
        sortConfig.field = 'price';
        sortConfig.direction = 'asc';
    }
    
    filteredProducts.sort((a, b) => {
        if (sortConfig.direction === 'asc') {
            return a.price - b.price;
        } else {
            return b.price - a.price;
        }
    });
    
    updateSortIcons();
    renderTable();
}

/**
 * Update sort icons
 */
function updateSortIcons() {
    document.getElementById('nameIcon').innerHTML = 
        sortConfig.field === 'title' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '';
    document.getElementById('priceIcon').innerHTML = 
        sortConfig.field === 'price' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '';
}

/**
 * Reset to original data
 */
function resetData() {
    document.getElementById('searchInput').value = '';
    currentPage = 1;
    sortConfig = { field: null, direction: 'asc' };
    filteredProducts = [...allProducts];
    updateSortIcons();
    renderTable();
    updateStats();
}

/**
 * Render table with pagination
 */
function renderTable() {
    const tbody = document.getElementById('productsBody');
    const noDataMsg = document.getElementById('noDataMessage');
    const paginationSection = document.getElementById('paginationSection');
    
    if (filteredProducts.length === 0) {
        tbody.innerHTML = '';
        noDataMsg.style.display = 'block';
        paginationSection.style.display = 'none';
        return;
    }
    
    noDataMsg.style.display = 'none';
    
    // Pagination
    const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIdx = startIdx + ITEMS_PER_PAGE;
    const pageProducts = filteredProducts.slice(startIdx, endIdx);
    
    tbody.innerHTML = pageProducts.map(product => createTableRow(product)).join('');
    
    attachCartListeners();
    renderPagination(totalPages);
}

/**
 * Create table row HTML
 */
function createTableRow(product) {
    const imageUrl = product.images && product.images[0] ? product.images[0] : 'https://placehold.co/60x60?text=No+Image';
    const categoryName = product.category && product.category.name ? product.category.name : 'Uncategorized';
    const title = escapeHtml(product.title);
    const description = escapeHtml(product.description).substring(0, 50) + '...';
    
    return `
        <tr>
            <td>
                <img src="${imageUrl}" alt="${title}" class="product-image" 
                     onerror="this.src='https://placehold.co/60x60?text=Error'">
            </td>
            <td>
                <strong>${title}</strong>
            </td>
            <td>
                <span class="category-badge">${categoryName}</span>
            </td>
            <td>
                <small class="text-muted">${description}</small>
            </td>
            <td>
                <span class="price-badge">$${product.price.toFixed(2)}</span>
            </td>
            <td>
                <button class="btn btn-add-cart add-to-cart-btn" data-product-id="${product.id}">
                    <i class="fas fa-shopping-cart"></i> Add
                </button>
            </td>
        </tr>
    `;
}

/**
 * Render pagination
 */
function renderPagination(totalPages) {
    const paginationSection = document.getElementById('paginationSection');
    const paginationHtml = document.getElementById('pagination');
    
    if (totalPages <= 1) {
        paginationSection.style.display = 'none';
        return;
    }
    
    paginationSection.style.display = 'flex';
    let html = '';
    
    // Previous button
    html += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="goToPage(${currentPage - 1}); return false;">
                <i class="fas fa-chevron-left"></i>
            </a>
        </li>
    `;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            html += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="goToPage(${i}); return false;">${i}</a>
                </li>
            `;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        }
    }
    
    // Next button
    html += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="goToPage(${currentPage + 1}); return false;">
                <i class="fas fa-chevron-right"></i>
            </a>
        </li>
    `;
    
    paginationHtml.innerHTML = html;
}

/**
 * Go to page
 */
function goToPage(page) {
    const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        renderTable();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

/**
 * Attach cart listeners
 */
function attachCartListeners() {
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const productId = this.getAttribute('data-product-id');
            const product = allProducts.find(p => p.id == productId);
            if (product) {
                addToCart(product);
            }
        });
    });
}

/**
 * Add to cart
 */
function addToCart(product) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            title: product.title,
            price: product.price,
            quantity: 1,
            image: product.images && product.images[0] ? product.images[0] : ''
        });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    showNotification(`✅ ${product.title} added to cart!`);
}

/**
 * Show notification
 */
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('remove');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

/**
 * Show error
 */
function showError(message) {
    const tbody = document.getElementById('productsBody');
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-5"><i class="fas fa-exclamation-circle"></i><br>${escapeHtml(message)}</td></tr>`;
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Update stats
 */
function updateStats() {
    const statsElement = document.getElementById('stats');
    const total = allProducts.length;
    const displayed = filteredProducts.length;
    
    if (displayed === total) {
        statsElement.textContent = `📊 Total: ${displayed} products`;
    } else {
        statsElement.textContent = `📊 Showing ${displayed} of ${total} products`;
    }
}

/**
 * Initialize
 */
function init() {
    console.log('🚀 Product Store initialized');
    fetchProducts();
}

// Start
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}