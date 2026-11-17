const categoriesList = (typeof dynamicCategories !== 'undefined' && dynamicCategories.length > 0)
    ? dynamicCategories
    : [{ id: "همه", title: "همه" }];

const siteBasePath = window.location.pathname
    .split('/recipes/')[0]
    .replace(/\/index\.html$/, '')
    .replace(/\/$/, '');

function normalizeRecipe(r) {
    const isLocal = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    const steps = (r.steps || []).map((s, idx) => {
        let audioUrl = s.audio || s.audioUrl || '';
        if (isLocal && audioUrl) {
            const fileName = audioUrl.split('/').pop().split('?')[0];
            audioUrl = `/local_media/audio/${fileName}`;
        }
        return {
            stepNumber: s.stepNumber || (idx + 1),
            title: s.title || `مرحله ${idx + 1}`,
            text: s.text || '',
            audioUrl: audioUrl
        };
    });
    const ingredients = (r.ingredients || []).map((ing, idx) => {
        const amt = parseFloat(ing.amount);
        const isFixed = Boolean(ing.fixed) || isNaN(amt) || amt === 0;
        return {
            id: ing.id !== undefined ? ing.id : (idx + 1),
            name: ing.name || '',
            amount: isFixed ? 0 : amt,
            unit: ing.unit || (isFixed ? 'به میزان لازم' : ''),
            fixed: isFixed
        };
    });

    let imageUrl = r.image || '';
    if (isLocal && imageUrl) {
        const fileName = imageUrl.split('/').pop().split('?')[0];
        imageUrl = `/local_media/images/${fileName}`;
    }

    return {
        id: String(r.id),
        slug: r.slug || String(r.id),
        title: r.title || '',
        subtitle: r.subtitle || `طرز تهیه ${r.title || ''} به صورت قدم به قدم و صوتی`,
        category: r.category || '',
        catName: r.catName || r.category || 'آشپزی',
        isFeatured: Boolean(r.featured !== undefined ? r.featured : r.isFeatured),
        image: imageUrl,
        prepTime: r.prepTime || r.time || '۳۰ دقیقه',
        cookTime: r.cookTime || '۴۵ دقیقه',
        calories: r.calories || '۵۰۰ کالری',
        difficulty: r.difficulty || 'متوسط',
        defaultServings: Number(r.defaultServings) || 4,
        ingredients,
        steps
    };
}

let normalizedRecipes = [];
let currentView = 'home';
let selectedCategory = 'همه';
let searchQuery = '';
let onlySavedFilter = false;
let savedRecipeIds = new Set((JSON.parse(localStorage.getItem('saved_recipes') || '[]')).map(String));

let activeRecipe = null;
let currentServings = 4;
const checkedIngredients = new Set();
let currentCookStepIndex = 0;
let isCookModeOpen = false;

let activeAudioId = null;
let isPlaying = false;
let currentAudioTime = 0;
let currentAudioDuration = 0;
let realAudioElement = new Audio();
let audioCtx = null;

realAudioElement.addEventListener('loadedmetadata', () => {
    if (realAudioElement.duration && isFinite(realAudioElement.duration)) {
        currentAudioDuration = realAudioElement.duration;
        syncAllAudioUI();
    }
});

realAudioElement.addEventListener('timeupdate', () => {
    currentAudioTime = realAudioElement.currentTime;
    if (realAudioElement.duration && isFinite(realAudioElement.duration)) {
        currentAudioDuration = realAudioElement.duration;
    }
    syncAllAudioUI();
});

realAudioElement.addEventListener('ended', () => {
    isPlaying = false;
    currentAudioTime = 0;
    playFeedbackTone(760, 120);
    syncAllAudioUI();
});

function toPersianDigits(num) {
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return String(num).replace(/\d/g, d => persianDigits[d]);
}

function formatQuantity(val) {
    const rounded = Math.round(val * 100) / 100;
    return toPersianDigits(rounded).replace('.', '٫');
}

function formatTime(seconds) {
    const sec = Math.max(0, Math.floor(seconds || 0));
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${toPersianDigits(m)}:${toPersianDigits(s)}`;
}

function playFeedbackTone(freq = 520, durationMs = 90) {
    try {
        if (!audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContextClass();
        }
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + durationMs / 1000);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + durationMs / 1000);
    } catch (e) {}
}

function renderHomeCategories() {
    const container = document.getElementById('categoryPillsContainer');
    container.innerHTML = categoriesList.map(cat => `
        <button type="button" class="category-pill ${selectedCategory === cat.id ? 'active' : ''}" data-cat="${cat.id}">
            ${cat.title}
        </button>
    `).join('');

    container.querySelectorAll('.category-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            selectedCategory = btn.getAttribute('data-cat');
            renderHomeCategories();
            renderHomeRecipes();
        });
    });
}

function renderFeaturedSuggestion() {
    const section = document.getElementById('featuredSection');
    const container = document.getElementById('featuredCardContainer');

    if (
        normalizedRecipes.length === 0 ||
        searchQuery.trim() !== '' ||
        selectedCategory !== 'همه' ||
        onlySavedFilter
    ) {
        section.classList.add('hidden');
        return;
    }

    const featuredRecipe = normalizedRecipes.find(r => r.isFeatured) || normalizedRecipes[0];
    section.classList.remove('hidden');

    container.innerHTML = `
        <div class="featured-card" data-open-recipe="${featuredRecipe.id}">
            <img class="featured-img" src="${featuredRecipe.image}" alt="${featuredRecipe.title}">
            <div class="featured-gradient">
                <div class="featured-top-badges">
                    <span class="chef-badge">
                        <svg viewBox="0 0 24 24" style="width:14px;height:14px;">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="currentColor"/>
                        </svg>
                        پیشنهاد سرآشپز
                    </span>
                    <span class="audio-tag-pill">
                        <svg viewBox="0 0 24 24" style="width:14px;height:14px;">
                            <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
                            <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
                        </svg>
                        گام‌به‌گام صوتی
                    </span>
                </div>
                <div class="featured-info">
                    <h2>${featuredRecipe.title}</h2>
                    <div class="featured-meta">
                        <span>⏱ پخت: ${featuredRecipe.cookTime}</span>
                        <span>•</span>
                        <span>🔥 سختی: ${featuredRecipe.difficulty}</span>
                        <span>•</span>
                        <span>🎙 ${toPersianDigits(featuredRecipe.steps.length)} مرحله صوتی</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    container.querySelector('.featured-card').addEventListener('click', () => {
        openRecipe(featuredRecipe.id, true);
    });
}

function renderHomeRecipes() {
    renderFeaturedSuggestion();
    updateBookmarkBadgeUI();

    const grid = document.getElementById('recipesGrid');
    const titleEl = document.getElementById('listSectionTitle');
    const countEl = document.getElementById('recipesCountLabel');

    const normalizedQuery = searchQuery.trim().toLowerCase();

    const filtered = normalizedRecipes.filter(recipe => {
        if (onlySavedFilter && !savedRecipeIds.has(String(recipe.id))) {
            return false;
        }
        if (
            selectedCategory !== 'همه' &&
            recipe.category !== selectedCategory &&
            recipe.catName !== selectedCategory
        ) {
            return false;
        }
        if (normalizedQuery !== '') {
            const inTitle = recipe.title.toLowerCase().includes(normalizedQuery);
            const inIng = recipe.ingredients.some(i => i.name.toLowerCase().includes(normalizedQuery));
            return inTitle || inIng;
        }
        return true;
    });

    if (onlySavedFilter) {
        titleEl.textContent = 'دستورهای ذخیره شده شما';
    } else if (normalizedQuery !== '') {
        titleEl.textContent = `نتایج جستجو برای «${searchQuery}»`;
    } else if (selectedCategory !== 'همه') {
        const catObj = categoriesList.find(c => c.id === selectedCategory);
        titleEl.textContent = `دسته‌بندی: ${catObj ? catObj.title : selectedCategory}`;
    } else {
        titleEl.textContent = 'همه دستور پخت‌ها';
    }

    countEl.textContent = `${toPersianDigits(filtered.length)} دستور`;

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="empty-state-box">
                <svg viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <div class="empty-state-title">دستور پختی پیدا نشد!</div>
                <p class="empty-state-sub">لطفاً عبارت دیگری جستجو کنید یا فیلترها را پاک کنید.</p>
                <button type="button" id="resetFiltersBtn" class="reset-filter-btn">نمایش همه دستور پخت‌ها</button>
            </div>
        `;
        document.getElementById('resetFiltersBtn').addEventListener('click', () => {
            searchQuery = '';
            selectedCategory = 'همه';
            onlySavedFilter = false;
            document.getElementById('searchInput').value = '';
            document.getElementById('clearSearchBtn').classList.add('hidden');
            document.getElementById('bookmarksFilterBtn').classList.remove('active-filter');
            renderHomeCategories();
            renderHomeRecipes();
        });
        return;
    }

    grid.innerHTML = filtered.map(recipe => {
        const isSaved = savedRecipeIds.has(String(recipe.id));
        const recipeHref = `${siteBasePath}/recipes/${recipe.slug}/`;
        return `
            <article class="home-recipe-card" data-recipe-id="${recipe.id}">
                <div class="card-thumb-wrapper">
                    <img class="card-thumb-img" src="${recipe.image}" alt="${recipe.title}" loading="lazy">
                    <span class="card-category-badge">${recipe.catName}</span>

                    <button type="button" class="card-bookmark-btn ${isSaved ? 'saved' : ''}" data-bookmark-id="${recipe.id}" aria-label="افزودن به علاقه‌مندی‌ها">
                        <svg viewBox="0 0 24 24" style="width:18px;height:18px;">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                        </svg>
                    </button>

                    <span class="card-audio-badge">
                        <svg viewBox="0 0 24 24" style="width:14px;height:14px;">
                            <polygon points="5 3 19 12 5 21 5 3" fill="currentColor"/>
                        </svg>
                        راهنمای صوتی (${toPersianDigits(recipe.steps.length)} گام)
                    </span>
                </div>

                <div class="card-body">
                    <h3 class="card-title">${recipe.title}</h3>
                    <p class="card-subtitle">${recipe.subtitle}</p>

                    <div class="card-footer-meta">
                        <div class="card-meta-group">
                            <span class="meta-pill-inline">
                                <svg viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="10"/>
                                    <polyline points="12 6 12 12 16 14"/>
                                </svg>
                                پخت: ${recipe.cookTime}
                            </span>
                            <span class="meta-pill-inline">
                                <svg viewBox="0 0 24 24">
                                    <path d="M12 20V10"/>
                                    <path d="M18 20V4"/>
                                    <path d="M6 20v-4"/>
                                </svg>
                                ${recipe.difficulty}
                            </span>
                        </div>
                        <a href="${recipeHref}" class="card-seo-link" style="color:var(--accent);font-weight:800;text-decoration:none;">مشاهده دستور ←</a>
                    </div>
                </div>
            </article>
        `;
    }).join('');

    grid.querySelectorAll('.home-recipe-card').forEach(card => {
        card.addEventListener('click', e => {
            if (e.target.closest('.card-bookmark-btn')) return;
            e.preventDefault();
            const id = card.getAttribute('data-recipe-id');
            openRecipe(id, true);
        });
    });

    grid.querySelectorAll('.card-bookmark-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const id = btn.getAttribute('data-bookmark-id');
            toggleBookmark(id);
        });
    });
}

function toggleBookmark(recipeId) {
    const strId = String(recipeId);
    if (savedRecipeIds.has(strId)) {
        savedRecipeIds.delete(strId);
    } else {
        savedRecipeIds.add(strId);
        playFeedbackTone(640, 70);
    }
    localStorage.setItem('saved_recipes', JSON.stringify(Array.from(savedRecipeIds)));
    renderHomeRecipes();
    syncDetailBookmarkUI();
}

function updateBookmarkBadgeUI() {
    const badge = document.getElementById('bookmarkCountBadge');
    const count = savedRecipeIds.size;
    if (count > 0) {
        badge.textContent = toPersianDigits(count);
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

function syncDetailBookmarkUI() {
    const btn = document.getElementById('detailBookmarkBtn');
    if (!btn || !activeRecipe) return;
    if (savedRecipeIds.has(String(activeRecipe.id))) {
        btn.classList.add('saved');
    } else {
        btn.classList.remove('saved');
    }
}

function openRecipe(recipeId, updateUrl = true) {
    const found = normalizedRecipes.find(r => String(r.id) === String(recipeId) || r.slug === String(recipeId));
    if (!found) return;

    stopAudioInternal();
    activeAudioId = null;
    activeRecipe = found;
    currentServings = activeRecipe.defaultServings;
    checkedIngredients.clear();
    currentCookStepIndex = 0;

    document.getElementById('dishImage').src = activeRecipe.image;
    document.getElementById('difficultyBadge').textContent = `سختی: ${activeRecipe.difficulty}`;
    document.getElementById('recipeTitle').textContent = activeRecipe.title;
    document.getElementById('recipeSubtitle').textContent = activeRecipe.subtitle;
    document.getElementById('prepTime').textContent = activeRecipe.prepTime;
    document.getElementById('cookTime').textContent = activeRecipe.cookTime;
    const calEl = document.getElementById('caloriesMeta');
    if (calEl) calEl.textContent = activeRecipe.calories;
    document.getElementById('totalStepsMeta').textContent = `${toPersianDigits(activeRecipe.steps.length)} مرحله`;

    document.title = `${activeRecipe.title} - طرز تهیه قدم به قدم و صوتی`;

    syncDetailBookmarkUI();
    renderIngredients();
    renderVerticalSteps();
    renderStorySegments();
    updateCookModeSlide();

    currentView = 'detail';
    document.getElementById('homeView').classList.add('hidden');
    document.getElementById('detailView').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (updateUrl) {
        const newUrl = `${siteBasePath}/recipes/${activeRecipe.slug}/`;
        if (window.location.pathname !== newUrl) {
            history.pushState({ view: 'detail', id: activeRecipe.id }, '', newUrl);
        }
    }
}

const openRecipeDetail = openRecipe;

function backToHomeView(updateUrl = true) {
    stopAudioInternal();
    activeAudioId = null;
    syncAllAudioUI();

    document.title = 'آشپزخونه | دستیار هوشمند آشپزی';

    currentView = 'home';
    document.getElementById('detailView').classList.add('hidden');
    document.getElementById('homeView').classList.remove('hidden');
    renderHomeRecipes();
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (updateUrl) {
        const homeUrl = `${siteBasePath}/`;
        if (window.location.pathname !== homeUrl) {
            history.pushState({ view: 'home' }, '', homeUrl);
        }
    }
}

function renderIngredients() {
    const listEl = document.getElementById('ingredientsList');
    const drawerListEl = document.getElementById('drawerIngredientsList');
    document.getElementById('servingsDisplay').textContent = `${toPersianDigits(currentServings)} نفر`;
    document.getElementById('drawerServingsCount').textContent = toPersianDigits(currentServings);

    const ratio = currentServings / activeRecipe.defaultServings;

    const htmlContent = activeRecipe.ingredients.map(item => {
        const isChecked = checkedIngredients.has(item.id);
        const amountText = item.fixed
            ? (item.unit || 'به میزان لازم')
            : `${formatQuantity(item.amount * ratio)} ${item.unit}`;

        return `
            <div class="ingredient-row ${isChecked ? 'checked' : ''}" data-ing-id="${item.id}">
                <div class="ing-right">
                    <div class="custom-checkbox">
                        <svg viewBox="0 0 24 24">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                    </div>
                    <span class="ing-name">${item.name}</span>
                </div>
                <span class="ing-amount">${amountText}</span>
            </div>
        `;
    }).join('');

    listEl.innerHTML = htmlContent;
    drawerListEl.innerHTML = htmlContent;

    document.querySelectorAll('.ingredient-row').forEach(row => {
        row.addEventListener('click', () => {
            const id = Number(row.getAttribute('data-ing-id'));
            if (checkedIngredients.has(id)) {
                checkedIngredients.delete(id);
            } else {
                checkedIngredients.add(id);
            }
            renderIngredients();
        });
    });
}

function renderVerticalSteps() {
    const container = document.getElementById('stepsVerticalList');
    container.innerHTML = activeRecipe.steps.map((step, index) => {
        const isThisStepPlaying = (activeAudioId === index && isPlaying);
        return `
            <article class="step-card ${activeAudioId === index ? 'active-audio' : ''}" id="step-${index + 1}">
                <div class="step-card-header">
                    <span class="step-badge">${step.title || ('مرحله ' + toPersianDigits(step.stepNumber))}</span>
                    ${step.audioUrl ? `
                    <button type="button" class="step-inline-audio-btn ${isThisStepPlaying ? 'playing' : ''}" data-step-index="${index}">
                        ${isThisStepPlaying
                            ? `<svg viewBox="0 0 24 24" style="width:15px;height:15px;"><rect x="6" y="4" width="4" height="16" fill="currentColor"/><rect x="14" y="4" width="4" height="16" fill="currentColor"/></svg><span>توقف صوت</span>`
                            : `<svg viewBox="0 0 24 24" style="width:15px;height:15px;"><polygon points="5 3 19 12 5 21 5 3" fill="currentColor"/></svg><span>پخش راهنمای صوتی</span>`
                        }
                    </button>` : ''}
                </div>
                <p class="step-text">${step.text}</p>
            </article>
        `;
    }).join('');

    container.querySelectorAll('.step-inline-audio-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = Number(btn.getAttribute('data-step-index'));
            toggleAudioTarget(idx);
        });
    });
}

function toggleAudioTarget(targetIndex) {
    if (activeAudioId === targetIndex) {
        if (isPlaying) {
            pauseAudio();
        } else {
            resumeAudio();
        }
    } else {
        startNewAudio(targetIndex);
    }
}

function startNewAudio(targetIndex) {
    stopAudioInternal();
    const stepObj = activeRecipe.steps[targetIndex];
    if (!stepObj || !stepObj.audioUrl) {
        alert('برای این مرحله فایل صوتی ثبت نشده است.');
        return;
    }

    activeAudioId = targetIndex;
    currentAudioTime = 0;
    currentAudioDuration = 0;

    realAudioElement.src = stepObj.audioUrl;
    realAudioElement.currentTime = 0;

    playFeedbackTone(580, 90);
    isPlaying = true;

    realAudioElement.play().catch(err => {
        console.error('Audio play error:', err);
        isPlaying = false;
        syncAllAudioUI();
    });

    syncAllAudioUI();
}

function resumeAudio() {
    isPlaying = true;
    playFeedbackTone(640, 70);
    realAudioElement.play().catch(() => {});
    syncAllAudioUI();
}

function pauseAudio() {
    isPlaying = false;
    playFeedbackTone(420, 70);
    realAudioElement.pause();
    syncAllAudioUI();
}

function stopAudioInternal() {
    isPlaying = false;
    realAudioElement.pause();
}

function syncAllAudioUI() {
    if (!activeRecipe) return;
    renderVerticalSteps();

    const statusLabel = document.getElementById('playerStatusLabel');
    const timeDisplay = document.getElementById('playerTimeDisplay');
    const scrubber = document.getElementById('audioScrubber');
    const playIcon = document.getElementById('playerPlayIcon');

    const stepObj = activeRecipe.steps[currentCookStepIndex];
    if (!stepObj) return;

    const displayedDuration = (activeAudioId === currentCookStepIndex) ? currentAudioDuration : 0;
    const displayedTime = (activeAudioId === currentCookStepIndex) ? currentAudioTime : 0;

    timeDisplay.textContent = `${formatTime(displayedTime)} / ${formatTime(displayedDuration)}`;

    const pct = displayedDuration > 0 ? (displayedTime / displayedDuration) * 100 : 0;
    scrubber.value = pct;

    if (activeAudioId === currentCookStepIndex && isPlaying) {
        statusLabel.textContent = `در حال خواندن مرحله ${toPersianDigits(stepObj.stepNumber)}...`;
        playIcon.innerHTML = `<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>`;
    } else {
        statusLabel.textContent = `صوت مرحله ${toPersianDigits(stepObj.stepNumber)} آماده پخش`;
        playIcon.innerHTML = `<polygon points="5 3 19 12 5 21 5 3"/>`;
    }
}

function renderStorySegments() {
    const container = document.getElementById('storySegments');
    container.innerHTML = activeRecipe.steps.map((_, idx) => {
        let stateClass = '';
        if (idx < currentCookStepIndex) stateClass = 'completed';
        else if (idx === currentCookStepIndex) stateClass = 'current';
        return `
            <div class="story-segment ${stateClass}" data-segment-index="${idx}">
                <div class="story-segment-fill"></div>
            </div>
        `;
    }).join('');

    container.querySelectorAll('.story-segment').forEach(seg => {
        seg.addEventListener('click', () => {
            const idx = Number(seg.getAttribute('data-segment-index'));
            goToCookStep(idx, true);
        });
    });
}

function updateCookModeSlide() {
    if (!activeRecipe || !activeRecipe.steps.length) return;
    const step = activeRecipe.steps[currentCookStepIndex];
    const total = activeRecipe.steps.length;

    document.getElementById('cookStepCounter').textContent =
        `مرحله ${toPersianDigits(step.stepNumber)} از ${toPersianDigits(total)}`;
    document.getElementById('cookCardTitle').textContent = step.title;
    document.getElementById('cookInstructionText').textContent = step.text;

    const isFirst = currentCookStepIndex === 0;
    const isLast = currentCookStepIndex === total - 1;

    document.getElementById('playerPrevBtn').disabled = isFirst;
    document.getElementById('cardPrevBtn').disabled = isFirst;
    document.getElementById('playerNextBtn').disabled = isLast;
    document.getElementById('cardNextBtn').disabled = isLast;

    renderStorySegments();
    syncAllAudioUI();
}

function goToCookStep(newIndex, autoPlayAudio = false) {
    if (newIndex < 0 || newIndex >= activeRecipe.steps.length) return;
    const card = document.getElementById('cookStepCard');
    card.style.opacity = '0.4';
    card.style.transform = 'scale(0.97)';

    setTimeout(() => {
        currentCookStepIndex = newIndex;
        updateCookModeSlide();
        card.style.opacity = '1';
        card.style.transform = 'scale(1)';
        if (autoPlayAudio) {
            startNewAudio(currentCookStepIndex);
        }
    }, 140);
}

function openCookMode() {
    isCookModeOpen = true;
    const overlay = document.getElementById('cookModeOverlay');
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    if (typeof activeAudioId === 'number') {
        currentCookStepIndex = activeAudioId;
    }
    updateCookModeSlide();
}

function closeCookMode() {
    isCookModeOpen = false;
    const overlay = document.getElementById('cookModeOverlay');
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

function setupTouchSwipe() {
    const stage = document.getElementById('cookCardStage');
    let touchStartX = 0;
    let touchEndX = 0;

    stage.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    stage.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        const diffX = touchEndX - touchStartX;
        if (Math.abs(diffX) > 50) {
            if (diffX < 0) {
                goToCookStep(currentCookStepIndex + 1, isPlaying);
            } else {
                goToCookStep(currentCookStepIndex - 1, isPlaying);
            }
        }
    }, { passive: true });
}

function initTheme() {
    const savedTheme = localStorage.getItem('recipe_theme') || 'light';
    applyTheme(savedTheme);

    const toggleThemeHandler = () => {
        const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        localStorage.setItem('recipe_theme', next);
    };

    document.getElementById('homeThemeToggleBtn').addEventListener('click', toggleThemeHandler);
    document.getElementById('detailThemeToggleBtn').addEventListener('click', toggleThemeHandler);
}

function applyTheme(theme) {
    const icons = document.querySelectorAll('.theme-icon-svg');
    if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        icons.forEach(icon => {
            icon.innerHTML = `
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            `;
        });
    } else {
        document.documentElement.removeAttribute('data-theme');
        icons.forEach(icon => {
            icon.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>`;
        });
    }
}

let wakeLockSentinel = null;
let wakeLockFallbackActive = false;

async function toggleWakeLock() {
    const btn = document.getElementById('wakeLockBtn');
    const label = document.getElementById('wakeLockText');

    if (wakeLockSentinel || wakeLockFallbackActive) {
        if (wakeLockSentinel) {
            await wakeLockSentinel.release();
            wakeLockSentinel = null;
        }
        wakeLockFallbackActive = false;
        btn.classList.remove('active');
        label.textContent = 'روشن ماندن صفحه';
        return;
    }

    try {
        if ('wakeLock' in navigator) {
            wakeLockSentinel = await navigator.wakeLock.request('screen');
            wakeLockSentinel.addEventListener('release', () => {
                btn.classList.remove('active');
                label.textContent = 'روشن ماندن صفحه';
            });
        } else {
            wakeLockFallbackActive = true;
        }
        btn.classList.add('active');
        label.textContent = 'صفحه روشن می‌ماند';
        playFeedbackTone(660, 80);
    } catch (err) {
        wakeLockFallbackActive = true;
        btn.classList.add('active');
        label.textContent = 'صفحه روشن می‌ماند';
        playFeedbackTone(660, 80);
    }
}

function initApp() {
    const rawData = typeof recipesData !== 'undefined' ? recipesData : [];
    normalizedRecipes = rawData.map(normalizeRecipe);
    activeRecipe = normalizedRecipes[0] || null;
    initTheme();
    renderHomeCategories();
    renderHomeRecipes();
    setupTouchSwipe();

    window.addEventListener('popstate', () => {
        const match = window.location.pathname.match(/\/recipes\/([^\/]+)/);
        if (match && match[1]) {
            openRecipe(match[1], false);
        } else {
            if (isCookModeOpen) closeCookMode();
            backToHomeView(false);
        }
    });
}

window.addEventListener('DOMContentLoaded', () => {
    initApp();

    if (window.__INITIAL_RECIPE_ID__) {
        openRecipe(window.__INITIAL_RECIPE_ID__, false);
    }

    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');

    searchInput.addEventListener('input', e => {
        searchQuery = e.target.value;
        clearSearchBtn.classList.toggle('hidden', searchQuery.trim().length === 0);
        renderHomeRecipes();
    });

    clearSearchBtn.addEventListener('click', () => {
        searchQuery = '';
        searchInput.value = '';
        clearSearchBtn.classList.add('hidden');
        searchInput.focus();
        renderHomeRecipes();
    });

    const bookmarksFilterBtn = document.getElementById('bookmarksFilterBtn');
    bookmarksFilterBtn.addEventListener('click', () => {
        onlySavedFilter = !onlySavedFilter;
        bookmarksFilterBtn.classList.toggle('active-filter', onlySavedFilter);
        renderHomeRecipes();
    });

    document.getElementById('backToHomeBtn').addEventListener('click', () => backToHomeView(true));

    document.getElementById('detailBookmarkBtn').addEventListener('click', () => {
        if (activeRecipe) toggleBookmark(activeRecipe.id);
    });

    document.getElementById('wakeLockBtn').addEventListener('click', toggleWakeLock);

    document.getElementById('decreaseServingsBtn').addEventListener('click', () => {
        if (currentServings > 1) {
            currentServings--;
            renderIngredients();
        }
    });

    document.getElementById('increaseServingsBtn').addEventListener('click', () => {
        if (currentServings < 30) {
            currentServings++;
            renderIngredients();
        }
    });

    document.getElementById('openCookModeBtn').addEventListener('click', openCookMode);
    document.getElementById('closeCookModeBtn').addEventListener('click', closeCookMode);

    document.getElementById('playerPrevBtn').addEventListener('click', () => {
        goToCookStep(currentCookStepIndex - 1, true);
    });
    document.getElementById('cardPrevBtn').addEventListener('click', () => {
        goToCookStep(currentCookStepIndex - 1, isPlaying);
    });

    document.getElementById('playerNextBtn').addEventListener('click', () => {
        goToCookStep(currentCookStepIndex + 1, true);
    });
    document.getElementById('cardNextBtn').addEventListener('click', () => {
        goToCookStep(currentCookStepIndex + 1, isPlaying);
    });

    document.getElementById('playerPlayPauseBtn').addEventListener('click', () => {
        toggleAudioTarget(currentCookStepIndex);
    });

    document.getElementById('audioScrubber').addEventListener('input', e => {
        const pct = Number(e.target.value);
        if (realAudioElement.duration && isFinite(realAudioElement.duration)) {
            realAudioElement.currentTime = (pct / 100) * realAudioElement.duration;
        }
    });

    const drawerBackdrop = document.getElementById('ingredientsDrawerBackdrop');
    document.getElementById('openDrawerBtn').addEventListener('click', () => {
        drawerBackdrop.classList.add('open');
    });
    document.getElementById('closeDrawerBtn').addEventListener('click', () => {
        drawerBackdrop.classList.remove('open');
    });
    drawerBackdrop.addEventListener('click', e => {
        if (e.target === drawerBackdrop) {
            drawerBackdrop.classList.remove('open');
        }
    });
});