// Configuration
const API_BASE = 'http://localhost:3000';
const ITEMS_PER_PAGE = 10;

// State
let allPosts = []; // posts from server
let allComments = []; // comments from server
let filteredPosts = [];
let currentPage = 1;
let sortConfig = { field: null, direction: 'asc' };
let commentsOpen = {}; // track open comment panels

/**
 * Fetch posts and comments
 */
async function fetchData() {
    try {
        console.log('📥 Fetching posts and comments from API:', API_BASE);
        const [postsRes, commentsRes] = await Promise.all([
            fetch(`${API_BASE}/posts`),
            fetch(`${API_BASE}/comments`)
        ]);

        if (!postsRes.ok || !commentsRes.ok) {
            throw new Error('Failed to fetch data from server');
        }

        const posts = await postsRes.json();
        const comments = await commentsRes.json();

        allPosts = posts.map(p => ({ ...p }));
        allComments = comments.map(c => ({ ...c }));

        // Ensure ids are strings
        allPosts.forEach(p => { p.id = p.id.toString(); if (p.isDeleted === undefined) p.isDeleted = false; });
        allComments.forEach(c => { c.id = c.id.toString(); c.postId = c.postId.toString(); });

        filteredPosts = [...allPosts];
        renderTable();
        updateStats();

    } catch (err) {
        console.error('❌', err);
        showError('Failed to load posts/comments. Make sure json-server is running (npx json-server db.json).');
    }
}

/** Search */
function handleSearch() {
    const q = document.getElementById('searchInput').value.toLowerCase().trim();
    currentPage = 1;
    if (!q) filteredPosts = [...allPosts];
    else {
        filteredPosts = allPosts.filter(p => {
            const title = (p.title || '').toLowerCase();
            const body = (p.body || '').toLowerCase();
            return title.includes(q) || body.includes(q);
        });
    }
    renderTable();
    updateStats();
}

/** Sorting */
function sortByName() {
    currentPage = 1;
    if (sortConfig.field === 'title') sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    else { sortConfig.field = 'title'; sortConfig.direction = 'asc'; }
    filteredPosts.sort((a, b) => {
        const A = (a.title || '').toLowerCase();
        const B = (b.title || '').toLowerCase();
        return sortConfig.direction === 'asc' ? A.localeCompare(B) : B.localeCompare(A);
    });
    updateSortIcons();
    renderTable();
}
function sortByViews() {
    currentPage = 1;
    if (sortConfig.field === 'views') sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    else { sortConfig.field = 'views'; sortConfig.direction = 'asc'; }
    filteredPosts.sort((a, b) => sortConfig.direction === 'asc' ? (a.views - b.views) : (b.views - a.views));
    updateSortIcons();
    renderTable();
}
function updateSortIcons() {
    document.getElementById('nameIcon').innerHTML = sortConfig.field === 'title' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '';
    document.getElementById('viewsIcon').innerHTML = sortConfig.field === 'views' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '';
}

/** Reset */
function resetData() {
    document.getElementById('searchInput').value = '';
    currentPage = 1;
    sortConfig = { field: null, direction: 'asc' };
    filteredPosts = [...allPosts];
    updateSortIcons();
    renderTable();
    updateStats();
}

/** Render table with pagination */
function renderTable() {
    const tbody = document.getElementById('productsBody');
    const noData = document.getElementById('noDataMessage');
    const paginationSection = document.getElementById('paginationSection');

    if (filteredPosts.length === 0) {
        tbody.innerHTML = '';
        noData.style.display = 'block';
        paginationSection.style.display = 'none';
        return;
    }
    noData.style.display = 'none';

    const totalPages = Math.ceil(filteredPosts.length / ITEMS_PER_PAGE);
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const pageItems = filteredPosts.slice(start, start + ITEMS_PER_PAGE);

    tbody.innerHTML = pageItems.map(p => createPostRow(p)).join('');
    attachRowListeners();
    renderPagination(totalPages);
}

function createPostRow(p) {
    const deletedClass = p.isDeleted ? 'deleted' : '';
    const commentsCount = allComments.filter(c => c.postId === p.id).length;
    const title = escapeHtml(p.title || 'Untitled');
    const body = escapeHtml((p.body || '').substring(0, 80) + (p.body && p.body.length > 80 ? '...' : ''));
    const views = p.views || 0;

    return `
        <tr id="post-${p.id}" class="${deletedClass}">
            <td><strong>${title}</strong></td>
            <td><small class="text-muted">${body}</small></td>
            <td>${views}</td>
            <td>
                <button class="btn btn-sm btn-primary btn-comments" data-id="${p.id}">Comments (${commentsCount})</button>
                <button class="btn btn-sm btn-secondary btn-edit" data-id="${p.id}">Edit</button>
                ${p.isDeleted ? `<button class="btn btn-sm btn-success btn-restore" data-id="${p.id}">Restore</button>` : `<button class="btn btn-sm btn-danger btn-delete" data-id="${p.id}">Delete</button>`}
            </td>
        </tr>
        <tr id="comments-row-${p.id}" class="comments-row" style="display:none">
            <td colspan="4">
                <div id="comments-container-${p.id}"></div>
            </td>
        </tr>
    `;
}

function renderPagination(totalPages) {
    const paginationSection = document.getElementById('paginationSection');
    const paginationHtml = document.getElementById('pagination');
    if (totalPages <= 1) { paginationSection.style.display = 'none'; return; }
    paginationSection.style.display = 'flex';

    let html = '';
    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}"><a class="page-link" href="#" onclick="goToPage(${currentPage - 1}); return false;"> <i class="fas fa-chevron-left"></i></a></li>`;

    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            html += `<li class="page-item ${i === currentPage ? 'active' : ''}"><a class="page-link" href="#" onclick="goToPage(${i}); return false;">${i}</a></li>`;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        }
    }

    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}"><a class="page-link" href="#" onclick="goToPage(${currentPage + 1}); return false;"><i class="fas fa-chevron-right"></i></a></li>`;
    paginationHtml.innerHTML = html;
}

function goToPage(page) {
    const totalPages = Math.ceil(filteredPosts.length / ITEMS_PER_PAGE);
    if (page >= 1 && page <= totalPages) { currentPage = page; renderTable(); window.scrollTo({ top:0, behavior: 'smooth' }); }
}

/** Row listeners (edit/delete/comments) */
function attachRowListeners() {
    // comments toggle
    document.querySelectorAll('.btn-comments').forEach(btn => {
        btn.onclick = () => toggleComments(btn.getAttribute('data-id'));
    });
    // edit
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.onclick = () => openEditDialog(btn.getAttribute('data-id'));
    });
    // delete
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.onclick = () => softDeletePost(btn.getAttribute('data-id'));
    });
    // restore
    document.querySelectorAll('.btn-restore').forEach(btn => {
        btn.onclick = () => restorePost(btn.getAttribute('data-id'));
    });
}

/** Toggle comments panel */
function toggleComments(postId) {
    const row = document.getElementById(`comments-row-${postId}`);
    const container = document.getElementById(`comments-container-${postId}`);
    if (row.style.display === 'none') {
        row.style.display = ''; // show
        renderComments(postId);
    } else {
        row.style.display = 'none';
        container.innerHTML = '';
    }
}

function renderComments(postId) {
    const container = document.getElementById(`comments-container-${postId}`);
    const comments = allComments.filter(c => c.postId === postId);

    container.innerHTML = `
        <div class="mb-2">
            <strong>Comments</strong>
            <div id="comments-list-${postId}" class="mt-2"></div>
            <div class="input-group mt-3">
                <input type="text" id="new-comment-${postId}" class="form-control" placeholder="Write a comment...">
                <button class="btn btn-primary" onclick="createComment('${postId}')">Add</button>
            </div>
        </div>
    `;

    const listEl = document.getElementById(`comments-list-${postId}`);
    if (comments.length === 0) {
        listEl.innerHTML = '<div class="text-muted">No comments yet.</div>';
    } else {
        listEl.innerHTML = comments.map(c => `
            <div class="d-flex align-items-start gap-2 mb-2" id="comment-${c.id}">
                <div class="flex-grow-1">
                    <small>${escapeHtml(c.text)}</small>
                </div>
                <div>
                    <button class="btn btn-sm btn-outline-secondary" onclick="editCommentPrompt('${c.id}', '${c.postId}')">Edit</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteComment('${c.id}', '${c.postId}')">Delete</button>
                </div>
            </div>
        `).join('');
    }
}

/** CRUD: Posts */
async function createPost() {
    const title = prompt('Title:');
    if (!title) return;
    const body = prompt('Body:') || '';
    const viewsStr = prompt('Views (number):', '0') || '0';
    const views = parseInt(viewsStr) || 0;

    // compute new id as string
    const maxId = allPosts.length ? Math.max(...allPosts.map(p => Number(p.id))) : 0;
    const newId = (maxId + 1).toString();

    const newPost = { id: newId, title, body, views, isDeleted: false };
    try {
        const res = await fetch(`${API_BASE}/posts`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(newPost) });
        if (!res.ok) throw new Error('Failed to create post');
        allPosts.push(newPost);
        filteredPosts = [...allPosts];
        renderTable();
        updateStats();
        showNotification('Post created');
    } catch (err) { console.error(err); showError('Failed to create post'); }
}

async function openEditDialog(postId) {
    const post = allPosts.find(p => p.id === postId);
    if (!post) return;
    const newTitle = prompt('Edit title:', post.title);
    if (newTitle === null) return; // cancelled
    const newBody = prompt('Edit body:', post.body || '');
    const viewsStr = prompt('Views:', post.views || '0');
    const views = parseInt(viewsStr) || 0;

    try {
        const res = await fetch(`${API_BASE}/posts/${postId}`, { method: 'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ title: newTitle, body: newBody, views }) });
        if (!res.ok) throw new Error('Failed to update post');
        post.title = newTitle; post.body = newBody; post.views = views;
        renderTable();
        showNotification('Post updated');
    } catch (err) { console.error(err); showError('Failed to update post'); }
}

async function softDeletePost(postId) {
    if (!confirm('Are you sure you want to soft-delete this post?')) return;
    try {
        const res = await fetch(`${API_BASE}/posts/${postId}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ isDeleted: true }) });
        if (!res.ok) throw new Error('Failed');
        const post = allPosts.find(p => p.id === postId);
        if (post) post.isDeleted = true;
        renderTable();
        showNotification('Post soft-deleted');
    } catch (err) { console.error(err); showError('Failed to delete post'); }
}

async function restorePost(postId) {
    try {
        const res = await fetch(`${API_BASE}/posts/${postId}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ isDeleted: false }) });
        if (!res.ok) throw new Error('Failed');
        const post = allPosts.find(p => p.id === postId);
        if (post) post.isDeleted = false;
        renderTable();
        showNotification('Post restored');
    } catch (err) { console.error(err); showError('Failed to restore post'); }
}

/** Comments CRUD */
async function createComment(postId) {
    const input = document.getElementById(`new-comment-${postId}`);
    const text = input.value.trim();
    if (!text) return;
    const maxId = allComments.length ? Math.max(...allComments.map(c => Number(c.id))) : 0;
    const newId = (maxId + 1).toString();
    const comment = { id: newId, postId: postId.toString(), text };
    try {
        const res = await fetch(`${API_BASE}/comments`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(comment) });
        if (!res.ok) throw new Error('Failed');
        allComments.push(comment);
        input.value = '';
        renderComments(postId);
        renderTable();
        showNotification('Comment added');
    } catch (err) { console.error(err); showError('Failed to add comment'); }
}

function editCommentPrompt(commentId, postId) {
    const comment = allComments.find(c => c.id === commentId);
    if (!comment) return;
    const newText = prompt('Edit comment:', comment.text);
    if (newText === null) return;
    updateComment(commentId, newText, postId);
}

async function updateComment(commentId, text, postId) {
    try {
        const res = await fetch(`${API_BASE}/comments/${commentId}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text }) });
        if (!res.ok) throw new Error('Failed');
        const comment = allComments.find(c => c.id === commentId);
        if (comment) comment.text = text;
        renderComments(postId);
        showNotification('Comment updated');
    } catch (err) { console.error(err); showError('Failed to update comment'); }
}

async function deleteComment(commentId, postId) {
    if (!confirm('Delete this comment?')) return;
    try {
        const res = await fetch(`${API_BASE}/comments/${commentId}`, { method:'DELETE' });
        if (!res.ok) throw new Error('Failed');
        allComments = allComments.filter(c => c.id !== commentId);
        renderComments(postId);
        renderTable();
        showNotification('Comment deleted');
    } catch (err) { console.error(err); showError('Failed to delete comment'); }
}

/** UI helpers */
function showNotification(message) {
    const n = document.createElement('div'); n.className = 'notification'; n.textContent = message; document.body.appendChild(n);
    setTimeout(() => { n.classList.add('remove'); setTimeout(() => n.remove(), 300); }, 2500);
}
function showError(msg) { const tbody = document.getElementById('productsBody'); tbody.innerHTML = `<tr><td colspan="4" class="text-danger text-center py-5">${escapeHtml(msg)}</td></tr>`; }
function escapeHtml(text) { const map = { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }; return String(text).replace(/[&<>"']/g, m => map[m]); }
function updateStats() { const stats = document.getElementById('stats'); const total = allPosts.length; const displayed = filteredPosts.length; stats.textContent = displayed === total ? `📊 Total: ${displayed} posts` : `📊 Showing ${displayed} of ${total} posts`; }

/** Init */
function init() { console.log('🚀 Posts app init'); fetchData(); document.getElementById('addPostBtn').onclick = createPost; }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();