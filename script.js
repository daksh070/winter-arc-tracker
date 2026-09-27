/* Winter Arc Tracker — browser-only demo storage. Never use this auth pattern for sensitive data. */
(() => {
  'use strict';
  const KEYS = { users: 'winterArcUsers', current: 'winterArcCurrentUser', habits: 'winterArcHabits', progress: 'winterArcProgress', photos: 'winterArcPhotos', badges: 'winterArcBadges' };
  let HABITS = [
    { id: 'workout', title: 'Workout completed', detail: 'Move with intention', icon: '🏋️' },
    { id: 'water', title: '3L water completed', detail: 'Hydrate through the day', icon: '💧' },
    { id: 'junk', title: 'No junk food', detail: 'Choose food that fuels you', icon: '🥗' },
    { id: 'sleep', title: '7+ hours sleep', detail: 'Rest is part of the work', icon: '🌙' },
    { id: 'steps', title: '10k steps', detail: 'Get your steps in', icon: '👟' },
    { id: 'study', title: 'Study / work completed', detail: 'Make space for your goals', icon: '📖' },
    { id: 'skincare', title: 'Skincare completed', detail: 'Take care of yourself', icon: '✨' }
  ];
  const DEFAULT_HABITS = HABITS.map(h => ({...h}));
  const BADGES = [
    { id: 'login', title: 'First Login', description: 'You started your winter arc.', icon: '❄️', test: () => true },
    { id: 'workout', title: 'First Workout', description: 'Complete your first workout habit.', icon: '🏋️', test: (s) => s.workoutCount > 0 },
    { id: 'streak3', title: '3 Day Streak', description: 'Show up three days in a row.', icon: '🔥', test: (s) => s.longest >= 3 },
    { id: 'streak7', title: '7 Day Streak', description: 'A full week of consistency.', icon: '🌟', test: (s) => s.longest >= 7 },
    { id: 'streak15', title: '15 Day Streak', description: 'Two weeks and a little more.', icon: '💎', test: (s) => s.longest >= 15 },
    { id: 'streak30', title: '30 Day Streak', description: 'Thirty days of showing up.', icon: '👑', test: (s) => s.longest >= 30 },
    { id: 'progress', title: 'First Progress Entry', description: 'Log your first check-in.', icon: '📈', test: (s) => s.entries > 0 },
    { id: 'photo', title: 'First Photo Upload', description: 'Save a progress photo.', icon: '📸', test: (s) => s.photos > 0 },
    { id: 'bmi', title: 'BMI Checked', description: 'Check in with your body metrics.', icon: '◉', test: (s) => s.bmi > 0 },
    { id: 'protein', title: 'Protein Target Set', description: 'Set your daily protein target.', icon: '🥛', test: (s) => s.protein > 0 }
  ];
  const $ = (id) => document.getElementById(id);
  const read = (key, fallback) => { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } };
  const write = (key, value) => { localStorage.setItem(key, JSON.stringify(value)); };
  const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const today = () => dateKey(new Date());
  const userKey = (u) => (u.email || '').toLowerCase();
  const getUsers = () => read(KEYS.users, []);
  let user = null;
  let chart = null;
  let toast;
  const goalRates = { 'Fat Loss': 1.8, 'Muscle Gain': 2, 'Lean Body': 1.6, Maintain: 1.4 };

  function notice(message) { $('toastMessage').textContent = message; if (toast) toast.show(); }
  function sectionNav() {
    document.querySelectorAll('[data-section], [data-jump]').forEach((link) => link.addEventListener('click', (event) => {
      const target = link.dataset.section || link.dataset.jump;
      if (!target) return;
      event.preventDefault();
      showSection(target);
      history.replaceState(null, '', `#${target}`);
      const collapse = $('mainNav');
      if (collapse.classList.contains('show') && window.bootstrap) bootstrap.Collapse.getOrCreateInstance(collapse).hide();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }));
  }
  function showSection(id) {
    if (!$(id)?.classList.contains('page-section')) id = 'dashboard';
    document.querySelectorAll('.page-section').forEach((section) => section.classList.toggle('active-section', section.id === id));
    document.querySelectorAll('#navLinks .nav-link').forEach((link) => link.classList.toggle('active', link.dataset.section === id));
    if (user && id === 'progress') renderProgress();
    if (user) requestAnimationFrame(updateComparison);
  }
  window.addEventListener('hashchange', () => { if(user) showSection(location.hash.slice(1)); });
  window.addEventListener('resize', () => { if(user) updateComparison(); });
  function switchAuth(login) {
    $('registerForm').classList.toggle('d-none', login); $('loginForm').classList.toggle('d-none', !login);
    $('registerTab').classList.toggle('active', !login); $('loginTab').classList.toggle('active', login);
    $('authEyebrow').textContent = login ? 'GOOD TO HAVE YOU BACK' : 'A NEW SEASON STARTS HERE';
    $('authTitle').textContent = login ? 'Welcome back.' : 'Start your arc.';
    $('authSubtitle').textContent = login ? 'Pick up where you left off.' : 'Create your account to make this season count.';
    $('authError').textContent = ''; $('loginError').textContent = '';
  }
  function openApp() {
    $('authView').classList.add('d-none'); $('appView').classList.remove('d-none');
    $('welcomeName').textContent = user.name.split(' ')[0]; $('navUserName').textContent = user.name.split(' ')[0];
    updateGreeting();
    $('userInitial').textContent = user.name.trim().charAt(0).toUpperCase();
    $('goalLabel').textContent = user.goal; $('durationLabel').textContent = `${user.duration} days`; $('heroDuration').textContent = user.duration; $('statDuration').textContent = user.duration;
    $('todayDate').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    $('entryDate').value = today();
    $('bmiHeight').value = user.height; $('bmiWeight').value = user.weight;
    if (user.bmi) renderBmi(user.bmi, user.bmiCategory);
    if (user.protein) renderProtein(user.protein);
    loadArcSettings(); injectPersonalTools(); renderAll(); renderPersonalTools();
    showSection(location.hash.slice(1) || 'dashboard'); startClock();
    $('entryDate').max = today();
  }
  function sessionData(key, fallback) { const all = read(key, {}); return all[userKey(user)] ?? fallback; }
  function saveSessionData(key, value) { const all = read(key, {}); all[userKey(user)] = value; write(key, all); }
  function habitData() { return sessionData(KEYS.habits, {}); }
  function progressData() { return sessionData(KEYS.progress, []); }
  function photoData() { return sessionData(KEYS.photos, {}); }
  function badgeData() { return sessionData(KEYS.badges, []); }
  function setHabits(value) { saveSessionData(KEYS.habits, value); }
  function arcSettings() { return sessionData('winterArcSettings', {}); }
  function saveArcSettings(value) { saveSessionData('winterArcSettings', value); }
  function scheduledHabits(date) {
    const day = new Date(`${date}T00:00:00`).getDay(); const settings = arcSettings();
    return HABITS.filter((h) => { const days = settings.schedules?.[h.id]; return (!h.createdAt || date >= h.createdAt) && (!days || days.includes(day)); });
  }
  function getStreakStats(habits) {
    const savedDates = Object.keys(habits).sort(); const completedDates = []; let longest = 0, run = 0;
    let cursor = new Date(`${savedDates[0] || today()}T00:00:00`); const end = new Date(`${today()}T00:00:00`); let guard = 0;
    while (cursor <= end && guard++ < 4000) {
      const date = dateKey(cursor); const due = habits[date]?._required ? habits[date]._required.map(id=>({id})) : scheduledHabits(date).filter(h=>h.key!==false);
      if (due.length) {
        if (due.every((h) => habits[date]?.[h.id])) { run++; longest = Math.max(longest, run); completedDates.push(date); }
        else if (date !== today()) run = 0;
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return { current: run, longest, completedDates };
  }
  function getTodayPct() { const items = habitData()[today()] || {}; const due = scheduledHabits(today()); return due.length ? Math.round(due.filter((h) => items[h.id]).length / due.length * 100) : 100; }
  function toggleHabit(id, checked) {
    const data = habitData(); data[today()] = data[today()] || {}; data[today()][id] = checked; data[today()]._required = scheduledHabits(today()).filter(h=>h.key!==false).map(h=>h.id); setHabits(data);
    renderAll(); checkBadges();
  }
  function renderHabits() {
    const data = habitData(); const todayItems = data[today()] || {}; const todayHabits = scheduledHabits(today()); const count = todayHabits.filter((h) => todayItems[h.id]).length; const pct = todayHabits.length ? Math.round(count / todayHabits.length * 100) : 100;
    $('habitList').innerHTML = todayHabits.map((h) => `<div class="habit-row ${todayItems[h.id] ? 'done' : ''}"><input class="habit-check habit-toggle" type="checkbox" aria-label="${escapeHtml(h.title)}" data-id="${h.id}" ${todayItems[h.id] ? 'checked' : ''}><span class="habit-emoji">${h.icon}</span><span class="habit-copy"><strong>${escapeHtml(h.title)}</strong><small>${escapeHtml(h.detail)}</small></span>${h.target ? `<label class="habit-amount"><input class="form-control habit-amount-input" data-amount-id="${h.id}" type="number" min="0" step="0.1" value="${Number(todayItems[`${h.id}_amount`]||0)}"><span>/ ${escapeHtml(h.target)} ${escapeHtml(h.unit||'')}</span></label>` : ''}${h.custom ? `<button class="habit-remove" type="button" data-remove-habit="${h.id}" aria-label="Remove ${escapeHtml(h.title)}">×</button>` : ''}</div>`).join('');
    $('dashboardHabits').innerHTML = todayHabits.slice(0, 4).map((h) => `<label class="quick-habit ${todayItems[h.id] ? 'done' : ''}"><input class="habit-check habit-toggle" type="checkbox" aria-label="${escapeHtml(h.title)}" data-id="${h.id}" ${todayItems[h.id] ? 'checked' : ''}>${escapeHtml(h.title)}</label>`).join('');
    document.querySelectorAll('.habit-toggle').forEach((input) => input.addEventListener('change', () => toggleHabit(input.dataset.id, input.checked)));
    document.querySelectorAll('[data-amount-id]').forEach((input) => input.addEventListener('change', () => { const id=input.dataset.amountId;const habit=HABITS.find(h=>h.id===id);const data=habitData();data[today()]=data[today()]||{};const amount=Number(input.value)||0;data[today()][`${id}_amount`]=amount;data[today()][id]=amount>=Number(habit.target);setHabits(data);renderAll(); }));
    document.querySelectorAll('[data-remove-habit]').forEach((btn) => btn.addEventListener('click', (e) => { e.preventDefault(); removeCustomHabit(btn.dataset.removeHabit); }));
    const streak = getStreakStats(data);
    $('habitCount').textContent = `${count} / ${todayHabits.length} done`; $('statComplete').textContent = `${pct}%`; $('ringPct').textContent = `${pct}%`;
    $('habitProgress').style.width = `${pct}%`; $('ringPct').setAttribute('aria-label', `${pct}% complete`);
    $('habitRing').style.strokeDashoffset = `${364.4 * (1 - pct / 100)}`;
    $('statStreak').textContent = streak.current; $('statLongest').textContent = streak.longest; $('habitStreak').textContent = streak.current; $('habitLongest').textContent = streak.longest;
    $('challengeProgress').style.width = `${Math.min(100, challengeDay() / Number(user.duration) * 100)}%`;
    $('challengePct').textContent = `${Math.min(100, Math.round(challengeDay() / Number(user.duration) * 100))}% complete`;
    $('statDay').textContent = String(challengeDay()).padStart(2, '0'); $('heroDay').textContent = String(challengeDay()).padStart(2, '0');
  }
  function challengeDay() { const start = new Date(`${user.challengeStart || user.createdAt || today()}T00:00:00`); const now = new Date(`${user.paused && user.pausedOn ? user.pausedOn : today()}T00:00:00`); return Math.min(Number(user.duration), Math.max(1, Math.floor((now - start) / 86400000) + 1)); }
  function calculateBmi() {
    const height = Number($('bmiHeight').value), weight = Number($('bmiWeight').value);
    if (!height || !weight || height < 100 || height > 250 || weight < 30 || weight > 300) return notice('Enter a valid height and weight first.');
    user.height = height; user.weight = weight; const bmi = +(weight / ((height / 100) ** 2)).toFixed(1);
    const category = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese'; user.bmi = bmi; user.bmiCategory = category; updateUser(); renderBmi(bmi, category); calculateProtein(false); renderDiet(); renderProgress(); renderDashboard(); checkBadges(); notice('BMI updated.');
  }
  function renderBmi(bmi, category) { $('bmiResult').textContent = bmi; $('bmiCategory').textContent = category; $('dashBmi').textContent = bmi; $('dashBmiCat').textContent = category; }
  function calculateProtein(announce = true) { const rate = goalRates[user.goal] || 1.6; user.protein = Math.round(Number(user.weight) * rate); updateUser(); renderProtein(user.protein); renderDashboard(); checkBadges(); if (announce) notice('Protein target updated.'); }
  function renderProtein(value) { $('proteinResult').textContent = value; $('dashProtein').textContent = value; $('proteinExplanation').textContent = `${user.weight} kg × ${goalRates[user.goal]} g per kg for your ${user.goal.toLowerCase()} goal.`; }
  const diets = {
    'Fat Loss': { summary: 'Keep protein high, choose moderate portions of carbs, and go easy on added sugar. These vegetarian ideas are a starting point.', meals: [['BREAKFAST','Oats & curd','Oats with milk or curd, fruit and a few seeds.'],['LUNCH','Paneer & salad','Paneer, dal, a modest rice portion and fresh salad.'],['SNACK','Sprouts bowl','Sprouts chaat with lemon, or buttermilk.'],['DINNER','Dal & greens','Dal, sautéed vegetables and a small roti portion.']], water: 'A common starting point is 2–3 L; adjust for your activity and clinician guidance.', tip: 'A steady, comfortable calorie deficit supports sustainable progress.' },
    'Muscle Gain': { summary: 'Support training with enough energy, protein at each meal and satisfying carbohydrate choices.', meals: [['BREAKFAST','Oats & milk','Oats with milk, banana, peanut butter and seeds.'],['LUNCH','Paneer rice bowl','Paneer or soya chunks, rice, dal and vegetables.'],['SNACK','Banana & curd','Banana with curd, or a peanut butter toast.'],['DINNER','Soya & roti','Soya chunks, roti, dal and a vegetable side.']], water: 'Sip regularly; increase fluids around longer or sweatier training sessions.', tip: 'Pair progressive strength training with good sleep and enough food.' },
    'Lean Body': { summary: 'Aim for balanced meals, protein with every meal and carbs in portions that suit your activity.', meals: [['BREAKFAST','Oats & fruit','Oats with milk or curd and seasonal fruit.'],['LUNCH','Paneer & rice','Paneer, dal, brown rice and crunchy salad.'],['SNACK','Curd & fruit','Curd with fruit, or roasted chana.'],['DINNER','Dal & vegetables','Dal, vegetables and a measured roti or rice portion.']], water: 'Keep water nearby; thirst, weather and activity all affect your needs.', tip: 'Build meals around protein, plants and a carb portion that feels right.' },
    Maintain: { summary: 'Keep calories balanced, protein steady and enjoy familiar home food with portions that feel satisfying.', meals: [['BREAKFAST','Oats & milk','Oats with milk or curd and fruit.'],['LUNCH','Home-style plate','Paneer or dal, vegetables, roti or rice and curd.'],['SNACK','Simple snack','Fruit with curd, or a handful of roasted chana.'],['DINNER','Balanced dinner','Dal, seasonal vegetables and your usual grain.']], water: 'Drink regularly through the day and adjust for heat and activity.', tip: 'A flexible routine is easier to sustain than chasing perfection.' }
  };
  function renderDiet() {
    const plan=diets[user.goal]||diets['Lean Body'], settings=arcSettings(), variation=settings.mealVariation||0;
    const target=user.protein||Math.round(user.weight*goalRates[user.goal]);
    const alternatives=[['Savory oats & yogurt','Vegetable oats with plain yogurt and seeds.'],['Tofu & dal bowl','Tofu, dal, rice and seasonal vegetables.'],['Roasted chana & fruit','Roasted chana with fruit and plain curd.'],['Chickpea & roti plate','Chickpeas, roti and a vegetable side.']];
    $('dietSummary').textContent=`${user.goal} · ${user.weight} kg · Protein estimate ${target} g/day${user.bmi?' · BMI '+user.bmi:''}. ${plan.summary} These are rule-based meal ideas; portions and brands change nutritional values.`;
    $('mealGrid').innerHTML=plan.meals.map((m,i)=>`<article class="meal-card"><span>${m[0]}</span><strong>${variation%2?alternatives[i][0]:m[1]}</strong><p>${variation%2?alternatives[i][1]:m[2]}</p><small>Protein planning share: about ${Math.round(target*[.25,.30,.15,.30][i])} g</small></article>`).join('');
    if(!$('refreshMeals')){$('dietSummary').insertAdjacentHTML('afterend','<button class="btn btn-outline-light mb-3" type="button" id="refreshMeals">Try another meal set ↻</button>');$('refreshMeals').onclick=()=>{const s=arcSettings();s.mealVariation=(s.mealVariation||0)+1;saveArcSettings(s);renderDiet();};}
    $('waterTip').textContent=plan.water; $('fitnessTip').textContent=Number(user.age)<18?'Adult BMI categories and protein formulas are not personalized advice for under-18s.':plan.tip; $('focusGoal').textContent=user.goal;
  }
  function renderProgress() {
    const entries = progressData().slice().sort((a, b) => a.date.localeCompare(b.date));
    $('chartEmpty').classList.toggle('hidden', entries.length > 0);
    const ctx = window.Chart ? $('progressChart').getContext('2d') : null;
    if (chart) chart.destroy();
    const bmiValues = entries.map((e) => +(e.weight / ((Number(user.height) / 100) ** 2)).toFixed(1));
    if (ctx) chart = new Chart(ctx, { type: 'line', data: { labels: entries.map((e) => new Date(`${e.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })), datasets: [{ label: 'Weight (kg)', data: entries.map((e) => e.weight), yAxisID: 'y', borderColor: '#38bdf8', backgroundColor: 'rgba(56,189,248,.1)', pointBackgroundColor: '#a5f3fc', pointBorderColor: '#38bdf8', pointRadius: 4, pointHoverRadius: 6, tension: .34, fill: true }, { label: 'BMI', data: bmiValues, yAxisID: 'bmi', borderColor: '#c4b5fd', backgroundColor: 'transparent', pointBackgroundColor: '#ddd6fe', pointBorderColor: '#a78bfa', pointRadius: 3, tension: .34, borderDash: [5,4] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, labels: { color: '#a7b5c8', boxWidth: 10, font: { size: 13 } } }, tooltip: { backgroundColor: '#0f172a', titleColor: '#e0f2fe', bodyColor: '#cbd5e1', borderColor: '#26344b', borderWidth: 1 } }, scales: { x: { grid: { color: 'rgba(148,163,184,.08)' }, ticks: { color: '#8191a7', font: { size: 13 } } }, y: { position: 'left', grid: { color: 'rgba(148,163,184,.08)' }, ticks: { color: '#8191a7', font: { size: 13 } }, suggestedMin: entries.length ? Math.min(...entries.map((e) => e.weight)) - 2 : undefined, suggestedMax: entries.length ? Math.max(...entries.map((e) => e.weight)) + 2 : undefined }, bmi: { position: 'right', grid: { drawOnChartArea: false }, ticks: { color: '#b9a9f4', font: { size: 13 } }, suggestedMin: bmiValues.length ? Math.min(...bmiValues) - 2 : undefined, suggestedMax: bmiValues.length ? Math.max(...bmiValues) + 2 : undefined } } } });
    if (!entries.length) { $('progressEntries').innerHTML = '<div class="empty-entries">No check-ins yet. Your first entry starts the story.</div>'; return; }
    $('progressEntries').innerHTML = `<table class="entries-table"><thead><tr><th>DATE</th><th>WEIGHT</th><th>WAIST</th><th>HIPS</th><th>NOTES</th></tr></thead><tbody>${entries.slice().reverse().map((e) => `<tr><td>${new Date(`${e.date}T00:00:00`).toLocaleDateString()}</td><td>${e.weight} kg</td><td>${e.waist ? `${e.waist} cm` : '—'}</td><td>${e.hips ? `${e.hips} cm` : '—'}</td><td class="entry-note" title="${escapeHtml(e.notes || '')}">${escapeHtml(e.notes || '—')}</td></tr>`).join('')}</tbody></table>`;
  }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function renderPhotos() {
    const photos = photoData(); const before = $('beforeImage'), after = $('afterImage');
    before.classList.toggle('d-none', !photos.before); after.classList.toggle('d-none', !photos.after);
    if (photos.before) before.src = photos.before; else before.removeAttribute('src');
    if (photos.after) after.src = photos.after; else after.removeAttribute('src');
    const has = photos.before || photos.after; document.querySelector('.photo-empty').classList.toggle('d-none', !!has);
    $('beforeLabel').classList.toggle('d-none', !photos.before); $('afterLabel').classList.toggle('d-none', !photos.after);
    updateComparison();
  }
  function updateComparison() {
    const photos = photoData(), paired = !!(photos.before && photos.after);
    const value = paired ? Number($('compareSlider').value) : 0;
    const width = $('photoStage').clientWidth;
    $('compareSlider').disabled = !paired;
    $('afterClip').style.left = `${value}%`;
    $('afterImage').style.width = `${width}px`;
    $('afterImage').style.left = `${-width * value / 100}px`;
    $('compareValue').textContent = paired ? `${value} / ${100-value}` : 'Add both photos to compare';
  }
  function renderBadges() { const unlocked = badgeData(); $('badgeCount').textContent = unlocked.length; $('dashBadges').textContent = unlocked.length; $('badgeGrid').innerHTML = BADGES.map((b) => { const earned = unlocked.includes(b.id); return `<article class="badge-card ${earned ? 'unlocked' : ''}"><div class="badge-emoji">${b.icon}</div><strong>${b.title}</strong><p>${b.description}</p><span class="badge-status">${earned ? 'UNLOCKED' : 'LOCKED'}</span></article>`; }).join(''); }
  function checkBadges() {
    const habits = habitData(); const stats = getStreakStats(habits); const photos = photoData();
    const state = { workoutCount: Object.values(habits).filter((d) => d.workout).length, longest: stats.longest, entries: progressData().length, photos: Number(!!photos.before) + Number(!!photos.after), bmi: user.bmi || 0, protein: user.protein || 0 };
    const unlocked = badgeData(); let changed = false;
    BADGES.forEach((b) => { if (!unlocked.includes(b.id) && b.test(state)) { unlocked.push(b.id); changed = true; } });
    if (changed) { saveSessionData(KEYS.badges, unlocked); renderBadges(); }
  }
  function renderDashboard() { const p = getTodayPct(); $('statComplete').textContent = `${p}%`; $('dashBmi').textContent = user.bmi || '—'; $('dashBmiCat').textContent = user.bmiCategory || 'Not checked'; $('dashProtein').textContent = user.protein || '—'; }
  function renderAll() { renderHabits(); renderProgress(); renderPhotos(); renderDiet(); renderDashboard(); checkBadges(); renderBadges(); }
  function updateUser() { const users = getUsers(); const idx = users.findIndex((u) => userKey(u) === userKey(user)); if (idx >= 0) users[idx] = user; write(KEYS.users, users); write(KEYS.current, user.email); }
  function processPhoto(file, which) {
    if (!file) return;
    if (!file.type.startsWith('image/')) return notice('Choose an image file.');
    const reader = new FileReader(); reader.onerror = () => notice('That image could not be read.');
    reader.onload = () => {
      const img = new Image(); img.onerror = () => notice('That image could not be processed.');
      img.onload = () => {
        const max = 1200; const scale = Math.min(1, max / Math.max(img.width, img.height)); const canvas = document.createElement('canvas'); canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale); canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', .78); const photos = photoData(); photos[which] = dataUrl;
        try { saveSessionData(KEYS.photos, photos); renderPhotos(); checkBadges(); notice(`${which === 'before' ? 'Before' : 'After'} photo saved.`); }
        catch { notice('Browser storage is full. Try a smaller photo or remove an existing one.'); }
      }; img.src = reader.result;
    }; reader.readAsDataURL(file);
  }
  function createReport() {
    if (!window.jspdf?.jsPDF) return notice('PDF library is unavailable. Check your internet connection and reload.');
    const { jsPDF } = window.jspdf; const doc = new jsPDF(); const entries = progressData().slice().sort((a, b) => b.date.localeCompare(a.date)); const names = BADGES.filter((b) => badgeData().includes(b.id)).map((b) => b.title);
    let y = 20; const line = (text, size = 11, color = [35, 52, 70]) => { doc.setFontSize(size); doc.setTextColor(...color); const wrapped = doc.splitTextToSize(String(text), 175); if (y + wrapped.length * 6 > 280) { doc.addPage(); y = 20; } doc.text(wrapped, 18, y); y += wrapped.length * 6 + 2; };
    doc.setFillColor(5, 8, 22); doc.rect(0, 0, 210, 42, 'F'); doc.setTextColor(165, 243, 252); doc.setFontSize(10); doc.text('YOUR SEASON. YOUR RESET.', 18, 15); doc.setTextColor(248, 250, 252); doc.setFontSize(23); doc.text('Winter Arc Progress Report', 18, 30); y = 53;
    line(`Report generated: ${new Date().toLocaleDateString()}`, 9, [100, 116, 139]); line('YOUR PROFILE', 10, [2, 132, 199]);
    line(`Name: ${user.name}  |  Age: ${user.age}`); line(`Height: ${user.height} cm  |  Starting weight: ${user.startingWeight} kg  |  Current profile weight: ${user.weight} kg`); line(`Goal: ${user.goal}  |  Challenge: ${user.duration} days  |  Current challenge day: ${challengeDay()}`);
    const streak = getStreakStats(habitData()); line(`Current streak: ${streak.current} days  |  Longest streak: ${streak.longest} days`); line(`BMI: ${user.bmi ? `${user.bmi} (${user.bmiCategory})` : 'Not calculated'}  |  Protein target: ${user.protein ? `${user.protein} g/day` : 'Not calculated'}`);
    y += 3; line('MILESTONES', 10, [2, 132, 199]); line(names.length ? names.join(' · ') : 'No badges unlocked yet.');
    y += 3; line('LATEST PROGRESS ENTRIES', 10, [2, 132, 199]); if (!entries.length) line('No progress entries yet.'); entries.slice(0, 8).forEach((e) => line(`${e.date} — ${e.weight} kg${e.waist ? ` — waist ${e.waist} cm` : ''}${e.notes ? ` — ${e.notes}` : ''}`, 9));
    y += 3; line('NUTRITION NOTE', 10, [2, 132, 199]); line(`${(diets[user.goal] || diets['Lean Body']).summary} Meals are general ideas; adapt to your personal needs.`);
    doc.save('winter-arc-progress-report.pdf');
  }

  const WEEKDAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];
  function loadArcSettings() {
    const settings = arcSettings(); HABITS = DEFAULT_HABITS.concat(settings.customHabits || []).map(h=>({...h,...(settings.habitEdits?.[h.id]||{})})).filter(h=>!h.archived); const order=settings.habitOrder||[]; HABITS.sort((a,b)=>(order.includes(a.id)?order.indexOf(a.id):999)-(order.includes(b.id)?order.indexOf(b.id):999));
    user.challengeStart = user.challengeStart || user.createdAt || today();
  }
  function injectPersonalTools() {
    if ($('myarc')) return;
    const nav = document.createElement('li'); nav.className = 'nav-item'; nav.innerHTML = '<a class="nav-link" href="#myarc" data-section="myarc">My arc</a>'; $('navLinks').appendChild(nav); nav.querySelector('a').addEventListener('click',(e)=>{e.preventDefault();showSection('myarc');history.replaceState(null,'','#myarc');$('mainNav').classList.remove('show');window.scrollTo({top:0,behavior:'smooth'});});
    $('appView').querySelector('main.app-container').insertAdjacentHTML('beforeend', `<section id="myarc" class="page-section"><div class="page-heading"><div><p class="eyebrow">MAKE THIS CHALLENGE YOURS</p><h1>My arc & settings<span class="greeting-snow">✳</span></h1><p class="muted">Personalize your routine, reflect and manage your data.</p></div><div class="date-chip" id="liveClock"></div></div><div class="row g-4"><div class="col-lg-6"><div class="content-card glass-card"><p class="eyebrow">BUILD YOUR OWN ROUTINE</p><h3>Custom habits</h3><p class="muted">Add your own daily or weekly habits. Choose which days count as active days.</p><form id="customHabitForm" class="custom-habit-form"><input class="form-control" id="customHabitName" maxlength="36" placeholder="e.g. Read for 20 minutes" required><input class="form-control" id="customHabitDetail" maxlength="54" placeholder="A small reminder (optional)"><input class="form-control" id="customHabitTarget" type="number" min="0.1" step="0.1" placeholder="Target (optional)"><input class="form-control" id="customHabitUnit" maxlength="10" placeholder="Unit, e.g. pages"><button class="btn btn-primary" type="submit">Add habit +</button></form><div class="schedule-editor" id="scheduleEditor"></div></div></div><div class="col-lg-6"><div class="content-card glass-card"><div class="card-heading"><div><p class="eyebrow">THE LAST FOUR WEEKS</p><h3>Your consistency calendar</h3></div><span class="completion-chip">Each tile = one day</span></div><div id="habitCalendar" class="habit-calendar"></div><div class="calendar-legend"><span>Less</span><i></i><i></i><i></i><i></i><span>More habits</span></div></div></div><div class="col-lg-7"><div class="content-card glass-card"><p class="eyebrow">A CHECK-IN BEYOND THE CHECKLIST</p><h3>How are you feeling?</h3><p class="muted">A private daily note for sleep, training, mood and energy.</p><form id="wellnessForm" class="row g-3 mt-1"><div class="col-6 col-md-3"><label class="form-label" for="sleepHours">Sleep (hours)</label><input class="form-control" id="sleepHours" type="number" min="0" max="24" step="0.5" placeholder="7.5"></div><div class="col-6 col-md-3"><label class="form-label" for="workoutMinutes">Workout (min)</label><input class="form-control" id="workoutMinutes" type="number" min="0" max="600" step="5" placeholder="45"></div><div class="col-6 col-md-3"><label class="form-label" for="moodScore">Mood (1–5)</label><select class="form-select" id="moodScore"><option value="">Choose</option><option value="1">1 · Low</option><option value="2">2 · Meh</option><option value="3">3 · Okay</option><option value="4">4 · Good</option><option value="5">5 · Great</option></select></div><div class="col-6 col-md-3"><label class="form-label" for="energyScore">Energy (1–5)</label><select class="form-select" id="energyScore"><option value="">Choose</option><option value="1">1 · Low</option><option value="2">2 · Meh</option><option value="3">3 · Okay</option><option value="4">4 · Good</option><option value="5">5 · Great</option></select></div><div class="col-12"><label class="form-label" for="wellnessNote">Notes for today</label><textarea class="form-control" id="wellnessNote" rows="2" placeholder="A win, a challenge, or how your body feels"></textarea></div><div class="col-12"><button class="btn btn-primary" type="submit">Save today’s check-in ↗</button></div></form><div class="weekly-reflection"><div><p class="eyebrow">WEEKLY REFLECTION</p><label class="form-label" for="weeklyReflection">What went well? What will you focus on next week?</label><textarea class="form-control" id="weeklyReflection" rows="3" placeholder="Give yourself a moment to notice your progress…"></textarea><button class="btn btn-outline-light mt-2" id="saveReflectionBtn" type="button">Save reflection</button></div></div></div></div><div class="col-lg-5"><div class="content-card glass-card"><p class="eyebrow">YOUR PERSONAL PLAN</p><h3>Edit profile & challenge</h3><form id="profileForm" class="row g-3 mt-1"><div class="col-12"><label class="form-label" for="profileName">Full name</label><input class="form-control" id="profileName" required></div><div class="col-6"><label class="form-label" for="profileAge">Age</label><input class="form-control" id="profileAge" type="number" min="13" max="100"></div><div class="col-6"><label class="form-label" for="profileStartWeight">Starting weight (kg)</label><input class="form-control" id="profileStartWeight" type="number" min="30" max="300" step=".1"></div><div class="col-6"><label class="form-label" for="profileHeight">Height (cm)</label><input class="form-control" id="profileHeight" type="number" min="100" max="250"></div><div class="col-6"><label class="form-label" for="profileWeight">Current weight (kg)</label><input class="form-control" id="profileWeight" type="number" min="30" max="300" step=".1"></div><div class="col-6"><label class="form-label" for="profileGoal">Goal</label><select class="form-select" id="profileGoal"><option>Fat Loss</option><option>Muscle Gain</option><option>Lean Body</option><option>Maintain</option></select></div><div class="col-6"><label class="form-label" for="profileDuration">Challenge</label><select class="form-select" id="profileDuration"><option value="30">30 days</option><option value="60">60 days</option><option value="90">90 days</option></select></div><div class="col-12"><label class="form-label" for="profileStart">Challenge start date</label><input class="form-control" id="profileStart" type="date"></div><div class="col-12"><button class="btn btn-primary" type="submit">Save profile ↗</button> <button class="btn btn-outline-light" id="challengePauseBtn" type="button">Pause challenge</button> <button class="text-button" id="challengeRestartBtn" type="button">Restart challenge</button></div></form></div></div><div class="col-12"><div class="content-card glass-card"><p class="eyebrow">YOUR SPACE, YOUR CHOICES</p><h3>Preferences, reminders & backup</h3><div class="row g-4 mt-1"><div class="col-lg-4"><strong class="setting-title">Dashboard cards</strong><p class="muted">Choose the stats you want to see.</p><div id="dashboardPrefs" class="setting-list"></div></div><div class="col-lg-4"><strong class="setting-title">Habit reminder</strong><p class="muted">Optional browser reminder on this device.</p><div class="d-flex gap-2 align-items-center"><input id="reminderTime" class="form-control" type="time" value="20:00"><button class="btn btn-outline-light" id="reminderBtn" type="button">Enable</button></div><small class="fine-print" id="reminderStatus">Notifications are off.</small></div><div class="col-lg-4"><strong class="setting-title">Data backup</strong><p class="muted">Export or restore your local tracker data.</p><button class="btn btn-outline-light" id="exportDataBtn" type="button">Export backup ↓</button><label class="btn btn-outline-light ms-1" for="importDataInput">Import backup ↑</label><input class="d-none" id="importDataInput" type="file" accept="application/json"><button class="text-button d-block mt-3" id="clearAllDataBtn" type="button">Delete my local account & data</button></div></div></div></div></div></section>`);
    const addDate = document.createElement('small'); addDate.className = 'live-date muted'; addDate.id = 'welcomeDate'; $('welcomeName').parentElement.insertAdjacentElement('afterend', addDate);
    $('workoutMinutes').parentElement.insertAdjacentHTML('afterend','<div class="col-6 col-md-4"><label class="form-label" for="exerciseName">Exercise / activity</label><input class="form-control" id="exerciseName" maxlength="50" placeholder="Strength, walk, yoga…"></div><div class="col-6 col-md-4"><label class="form-label" for="exerciseSets">Sets</label><input class="form-control" id="exerciseSets" type="number" min="0" max="100" placeholder="3"></div><div class="col-6 col-md-4"><label class="form-label" for="exerciseReps">Reps</label><input class="form-control" id="exerciseReps" type="number" min="0" max="1000" placeholder="10"></div>');
    $('entryWaist').parentElement.insertAdjacentHTML('afterend','<div class="mb-3"><label class="form-label" for="entryHips">Hips (cm) <span class="optional">optional</span></label><input class="form-control" id="entryHips" type="number" min="20" max="250" step="0.1" placeholder="—"></div>');
    const habitCard = $('habitList').closest('.content-card'); habitCard.insertAdjacentHTML('beforeend', '<div class="habit-actions"><a href="#myarc" data-jump="myarc">Customize habits ↗</a><span id="todayPrompt"></span></div>');
    document.querySelectorAll('[data-jump="myarc"]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); showSection('myarc'); history.replaceState(null, '', '#myarc'); window.scrollTo({top:0,behavior:'smooth'}); }));
    document.querySelectorAll('#profileForm input').forEach(input=>input.required=true);
    bindPersonalTools();
  }
  function renderPersonalTools() {
    if (!$('myarc')) return;
    const settings = arcSettings(); const custom = settings.customHabits || [];
    $('scheduleEditor').innerHTML = HABITS.map((h) => `<div class="schedule-row"><strong>${escapeHtml(h.title)}</strong><div class="habit-edit-actions"><button type="button" class="text-button" data-edit-habit="${h.id}">Edit</button><button type="button" class="text-button" data-up-habit="${h.id}" aria-label="Move ${escapeHtml(h.title)} up">↑</button><button type="button" class="text-button" data-archive-habit="${h.id}">Archive</button><label><input type="checkbox" data-key-habit="${h.id}" ${h.key!==false?'checked':''}> Streak habit</label></div><div>${WEEKDAYS.map((d,i) => `<label><input type="checkbox" data-schedule="${h.id}" value="${i}" ${(settings.schedules?.[h.id] || [0,1,2,3,4,5,6]).includes(i) ? 'checked' : ''}><span>${d}</span></label>`).join('')}</div></div>`).join('');
    document.querySelectorAll('[data-schedule]').forEach((input) => input.addEventListener('change', () => { const s = arcSettings(); const group = [...document.querySelectorAll(`[data-schedule="${input.dataset.schedule}"]`)]; s.schedules = s.schedules || {}; s.schedules[input.dataset.schedule] = group.filter((x) => x.checked).map((x) => Number(x.value));  saveArcSettings(s); renderAll(); renderPersonalTools(); }));
    bindHabitEditor();
    const data = habitData(); const start = new Date(`${today()}T00:00:00`); const days = Array.from({length:28},(_,i)=>{const d=new Date(start);d.setDate(d.getDate()-(27-i));const key=dateKey(d);const due=scheduledHabits(key);const n=due.filter(h=>data[key]?.[h.id]).length;const p=due.length?n/due.length:0;return `<span class="calendar-day level-${p===0?0:p<.34?1:p<.67?2:p<1?3:4}" title="${key}: ${n}/${due.length} habits"></span>`;}).join('');
    $('habitCalendar').innerHTML = `<div class="calendar-labels">${WEEKDAYS.map(d=>`<span>${d}</span>`).join('')}</div><div class="calendar-grid">${'<span></span>'.repeat((start.getDay()+1)%7)}${days}</div><small class="muted">Last 28 days · scheduled habit completion</small>`;
    const wellness=sessionData('winterArcWellness',{});const todayWell=wellness[today()]||{};['sleepHours','workoutMinutes','moodScore','energyScore','wellnessNote','exerciseName','exerciseSets','exerciseReps'].forEach((id)=>{if($(id))$(id).value=todayWell[id]??(['moodScore','energyScore'].includes(id)?'3':'');});
    $('weeklyReflection').value=sessionData('winterArcReflections',{})[weekKey()]||'';
    $('profileName').value=user.name;$('profileAge').value=user.age;$('profileStartWeight').value=user.startingWeight||user.weight;$('profileHeight').value=user.height;$('profileWeight').value=user.weight;$('profileGoal').value=user.goal;$('profileDuration').value=user.duration;$('profileStart').value=user.challengeStart||user.createdAt||today();
    $('challengePauseBtn').textContent=user.paused?'Resume challenge':'Pause challenge';
    const pref=settings.dashboardCards||['challenge','streak','longest','completion'];const names=['Challenge day','Current streak','Longest streak','Today’s check-in'];$('dashboardPrefs').innerHTML=names.map((n,i)=>`<label class="preference-row"><input type="checkbox" data-dashboard-pref="${i}" ${pref.includes(['challenge','streak','longest','completion'][i])?'checked':''}> ${n}</label>`).join('');
    document.querySelectorAll('[data-dashboard-pref]').forEach((input)=>input.addEventListener('change',()=>{const s=arcSettings();s.dashboardCards=s.dashboardCards||['challenge','streak','longest','completion'];const key=['challenge','streak','longest','completion'][Number(input.dataset.dashboardPref)];s.dashboardCards=input.checked?[...new Set([...s.dashboardCards,key])]:s.dashboardCards.filter(x=>x!==key);saveArcSettings(s);applyDashboardPrefs();}));
    const prefs=arcSettings();$('reminderTime').value=prefs.reminderTime||'20:00';$('reminderStatus').textContent=prefs.reminderEnabled?`Reminder enabled for ${prefs.reminderTime||'20:00'} (while this page is open).`:'Notifications are off.';$('reminderBtn').textContent=prefs.reminderEnabled?'Turn off':'Enable';
    $('todayPrompt').textContent=promptForDay();
    applyDashboardPrefs();
  }
  function bindPersonalTools() {
    $('customHabitForm').addEventListener('submit',(e)=>{e.preventDefault();const name=$('customHabitName').value.trim();if(!name)return;const s=arcSettings();s.customHabits=s.customHabits||[];if(s.customHabits.length>=15)return notice('You can add up to 15 custom habits.');const target=Number($('customHabitTarget').value)||null;const habit={id:`custom_${Date.now()}`,title:name,detail:$('customHabitDetail').value.trim()||'Your personal routine',icon:'✦',custom:true,createdAt:today(),target,unit:$('customHabitUnit').value.trim()};s.customHabits.push(habit);saveArcSettings(s);$('customHabitForm').reset();loadArcSettings();renderAll();renderPersonalTools();notice('Custom habit added.');});
    $('wellnessForm').addEventListener('submit',(e)=>{e.preventDefault();const all=sessionData('winterArcWellness',{});all[today()]={sleepHours:$('sleepHours').value,workoutMinutes:$('workoutMinutes').value,exerciseName:$('exerciseName').value.trim(),exerciseSets:$('exerciseSets').value,exerciseReps:$('exerciseReps').value,moodScore:$('moodScore').value,energyScore:$('energyScore').value,wellnessNote:$('wellnessNote').value.trim()};saveSessionData('winterArcWellness',all);notice('Daily wellness check-in saved.');});
    $('saveReflectionBtn').addEventListener('click',()=>{const all=sessionData('winterArcReflections',{});all[weekKey()]=$('weeklyReflection').value.trim();saveSessionData('winterArcReflections',all);notice('Weekly reflection saved.');});
    $('profileForm').addEventListener('submit',(e)=>{e.preventDefault();if(!e.currentTarget.reportValidity() || !$('profileName').value.trim() || Number($('profileHeight').value)<100 || Number($('profileWeight').value)<30 || Number($('profileAge').value)<13 || Number($('profileStartWeight').value)<30 || $('profileStart').value>today())return notice('Enter a valid name, age, height, weight and start date.');user.name=$('profileName').value.trim();user.age=Number($('profileAge').value);user.startingWeight=Number($('profileStartWeight').value);user.height=Number($('profileHeight').value);user.weight=Number($('profileWeight').value);user.goal=$('profileGoal').value;user.duration=Number($('profileDuration').value);user.challengeStart=$('profileStart').value||today();user.bmi=+(user.weight/((user.height/100)**2)).toFixed(1);user.bmiCategory=user.bmi<18.5?'Underweight':user.bmi<25?'Normal':user.bmi<30?'Overweight':'Obese';user.protein=Math.round(user.weight*(goalRates[user.goal]||1.6));updateUser();$('welcomeName').textContent=user.name.split(' ')[0];$('navUserName').textContent=user.name.split(' ')[0];$('userInitial').textContent=user.name.charAt(0).toUpperCase();$('goalLabel').textContent=user.goal;$('durationLabel').textContent=`${user.duration} days`;$('heroDuration').textContent=user.duration;$('statDuration').textContent=user.duration;$('bmiHeight').value=user.height;$('bmiWeight').value=user.weight;renderBmi(user.bmi,user.bmiCategory);renderProtein(user.protein);renderDiet();renderAll();notice('Profile and challenge updated.');});
    $('challengePauseBtn').addEventListener('click',()=>{user.paused=!user.paused;if(user.paused)user.pausedOn=today();else if(user.pausedOn){const days=Math.max(0,Math.floor((new Date(`${today()}T00:00:00`)-new Date(`${user.pausedOn}T00:00:00`))/86400000));const d=new Date(`${user.challengeStart||user.createdAt}T00:00:00`);d.setDate(d.getDate()+days);user.challengeStart=dateKey(d);user.pausedOn=null;}updateUser();renderPersonalTools();renderHabits();notice(user.paused?'Challenge paused.':'Challenge resumed.');});
    $('challengeRestartBtn').addEventListener('click',()=>{if(!confirm('Restart the challenge from today? Your habits and progress entries will be kept.'))return;user.challengeStart=today();user.paused=false;user.pausedOn=null;updateUser();renderPersonalTools();renderHabits();notice('Challenge restarted for today.');});
    $('reminderBtn').addEventListener('click',async()=>{const s=arcSettings();if(s.reminderEnabled){s.reminderEnabled=false;saveArcSettings(s);renderPersonalTools();return;}if(!('Notification'in window))return notice('This browser does not support notifications.');const permission=await Notification.requestPermission();if(permission!=='granted')return notice('Notification permission was not granted.');s.reminderEnabled=true;s.reminderTime=$('reminderTime').value||'20:00';saveArcSettings(s);renderPersonalTools();});
    $('reminderTime').addEventListener('change',()=>{const s=arcSettings();s.reminderTime=$('reminderTime').value;saveArcSettings(s);renderPersonalTools();});
    $('exportDataBtn').addEventListener('click',exportBackup);
    $('importDataInput').addEventListener('change',(e)=>importBackup(e.target.files[0]));
    $('clearAllDataBtn').addEventListener('click',clearAccountData);
  }
  function bindHabitEditor(){
    const change=(id,edit)=>{const s=arcSettings();s.habitEdits=s.habitEdits||{};s.habitEdits[id]={...s.habitEdits[id],...edit};saveArcSettings(s);loadArcSettings();renderAll();renderPersonalTools();};
    document.querySelectorAll('[data-key-habit]').forEach(el=>el.onchange=()=>change(el.dataset.keyHabit,{key:el.checked}));
    document.querySelectorAll('[data-edit-habit]').forEach(el=>el.onclick=()=>{const h=HABITS.find(h=>h.id===el.dataset.editHabit);const title=prompt('Habit name',h.title);if(!title?.trim())return;const target=prompt('Numeric target (leave empty for a checkbox)',h.target||'');if(target===null)return;const number=Number(target);if(target && (!Number.isFinite(number)||number<=0))return notice('Target must be a positive number.');const unit=prompt('Unit (for example glasses, minutes, steps)',h.unit||'');if(unit===null)return;change(h.id,{title:title.trim().slice(0,80),target:number||null,unit:unit.slice(0,20)});});
    document.querySelectorAll('[data-up-habit]').forEach(el=>el.onclick=()=>{const order=HABITS.map(h=>h.id),i=order.indexOf(el.dataset.upHabit);if(i>0){[order[i-1],order[i]]=[order[i],order[i-1]];const s=arcSettings();s.habitOrder=order;saveArcSettings(s);loadArcSettings();renderAll();renderPersonalTools();}});
    document.querySelectorAll('[data-archive-habit]').forEach(el=>el.onclick=()=>{if(confirm('Archive this habit? Past check-ins are kept.'))change(el.dataset.archiveHabit,{archived:true});});
  }
  function removeCustomHabit(id){if(!confirm('Remove this custom habit? Its previous check-ins are kept in your history.'))return;const s=arcSettings();s.customHabits=(s.customHabits||[]).filter(h=>h.id!==id);saveArcSettings(s);HABITS=HABITS.filter(h=>h.id!==id);renderAll();renderPersonalTools();notice('Custom habit removed.');}
  function applyDashboardPrefs(){const chosen=arcSettings().dashboardCards||['challenge','streak','longest','completion'];document.querySelectorAll('.stat-card').forEach((card,i)=>card.classList.toggle('stat-hidden',!chosen.includes(['challenge','streak','longest','completion'][i])));}
  function updateGreeting(){const h=new Date().getHours();const greeting=h<12?'Good morning':h<17?'Good afternoon':h<21?'Good evening':'Good night';$('welcomeName').dataset.greeting=greeting;const line=$('welcomeName').closest('h1');line.firstChild.textContent=`${greeting}, `;if($('welcomeDate'))$('welcomeDate').textContent=new Date().toLocaleString(undefined,{weekday:'long',month:'long',day:'numeric',hour:'numeric',minute:'2-digit'});if($('liveClock'))$('liveClock').textContent=new Date().toLocaleString(undefined,{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});}
  function startClock(){updateGreeting();if(window.arcClock)clearInterval(window.arcClock);let clockDay=today();window.arcClock=setInterval(()=>{if(!user)return;updateGreeting();if(clockDay!==today()){clockDay=today();$('entryDate').value=today();$('entryDate').max=today();renderAll();renderPersonalTools();$('todayDate').textContent=new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});} const s=arcSettings();if(s.reminderEnabled&&'Notification'in window&&Notification.permission==='granted'&&new Date().toTimeString().slice(0,5)===(s.reminderTime||'20:00')){const stamp=`${today()}-${s.reminderTime}`;if(sessionStorage.getItem('winterArcReminder')!==stamp){new Notification('Winter Arc check-in',{body:'A small promise to yourself, kept daily.'});sessionStorage.setItem('winterArcReminder',stamp);}}},30000);}
  function weekKey(){const d=new Date(`${today()}T00:00:00`);d.setDate(d.getDate()-((d.getDay()+6)%7));return dateKey(d);}
  function promptForDay(){const prompts=['What is one small promise you can keep today?','Make one choice today that your future self will thank you for.','Progress is built quietly. What is your next small step?','Take a moment to notice what is already working.','Show up gently today; consistency can be kind.','What would make today feel like a win?','Rest and recovery count as progress too.'];return `TODAY’S PROMPT · ${prompts[new Date(`${today()}T00:00:00`).getDay()]}`;}
  function exportBackup(){const payload={format:'winter-arc-backup-v1',exportedAt:new Date().toISOString(),user:Object.fromEntries(Object.entries(user).filter(([key])=>key!=='password')),habits:habitData(),progress:progressData(),photos:photoData(),badges:badgeData(),settings:arcSettings(),wellness:sessionData('winterArcWellness',{}),reflections:sessionData('winterArcReflections',{})};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='winter-arc-backup.json';a.click();URL.revokeObjectURL(a.href);}
  function importBackup(file){
    if(!file)return;if(file.size>8*1024*1024)return notice('Backup must be smaller than 8 MB.');
    const reader=new FileReader();reader.onerror=()=>notice('Backup could not be read.');reader.onload=()=>{
      const keys=[KEYS.habits,KEYS.progress,KEYS.photos,KEYS.badges,'winterArcSettings','winterArcWellness','winterArcReflections'];
      const old=keys.map(k=>localStorage.getItem(k));
      try{
        const b=JSON.parse(reader.result),obj=v=>v&&typeof v==='object'&&!Array.isArray(v);
        if(b.format!=='winter-arc-backup-v1'||!b.user||userKey(b.user)!==userKey(user)||!obj(b.habits)||!Array.isArray(b.progress)||!obj(b.photos)||!Array.isArray(b.badges)||!obj(b.settings||{}))throw Error();
        if(b.progress.some(e=>!/^\d{4}-\d{2}-\d{2}$/.test(e.date)||!Number.isFinite(e.weight)||e.weight<30||e.weight>300||e.date>today()))throw Error();
        if(Object.values(b.photos).some(v=>typeof v!=='string'||!/^data:image\/(jpeg|png|webp);base64,/.test(v)))throw Error();
        if((b.settings?.customHabits||[]).some(h=>!/^custom_[a-zA-Z0-9_]+$/.test(h.id)||typeof h.title!=='string'))throw Error();
        if(!confirm('Replace your current tracker data with this backup?'))return;
        [b.habits,b.progress,b.photos,b.badges.filter(id=>BADGES.some(x=>x.id===id)),b.settings||{},b.wellness||{},b.reflections||{}].forEach((v,i)=>saveSessionData(keys[i],v));
        loadArcSettings();renderAll();renderPersonalTools();notice('Tracker data restored. Profile and login credentials are unchanged.');
      }catch{keys.forEach((k,i)=>{if(old[i]===null)localStorage.removeItem(k);else localStorage.setItem(k,old[i]);});notice('Backup is invalid, belongs to another account, or exceeds storage capacity.');}
      $('importDataInput').value='';
    };reader.readAsText(file);
  }
  function clearAccountData(){if(!confirm('Permanently delete this local account and all its tracker data from this browser?'))return;const email=userKey(user);write(KEYS.users,getUsers().filter(u=>userKey(u)!==email));[KEYS.habits,KEYS.progress,KEYS.photos,KEYS.badges,'winterArcSettings','winterArcWellness','winterArcReflections'].forEach(k=>{const all=read(k,{});delete all[email];write(k,all);});localStorage.removeItem(KEYS.current);location.reload();}

  $('registerTab').addEventListener('click', () => switchAuth(false)); $('loginTab').addEventListener('click', () => switchAuth(true));
  $('registerForm').addEventListener('submit', (e) => {
    e.preventDefault(); const error = $('authError'); error.textContent = '';
    const name = $('regName').value.trim(), email = $('regEmail').value.trim().toLowerCase(), password = $('regPassword').value, age = Number($('regAge').value), height = Number($('regHeight').value), weight = Number($('regWeight').value);
    if (!e.currentTarget.reportValidity()) return;
    if (!name || !email || !password || !age || !height || !weight) { error.textContent = 'Please complete every field.'; return; }
    const users = getUsers(); if (users.some((u) => userKey(u) === email)) { error.textContent = 'An account already exists for this email. Please log in.'; return; }
    user = { name, email, password, age, height, weight, startingWeight: weight, goal: $('regGoal').value, duration: Number($('regDuration').value), createdAt: today() };
    users.push(user); write(KEYS.users, users); write(KEYS.current, email); saveSessionData(KEYS.badges, ['login']); calculateProtein(false); openApp(); notice('Your winter arc starts today.');
  });
  $('loginForm').addEventListener('submit', (e) => { e.preventDefault(); const email = $('loginEmail').value.trim().toLowerCase(), password = $('loginPassword').value; const match = getUsers().find((u) => userKey(u) === email && u.password === password); if (!match) { $('loginError').textContent = 'We couldn’t match those details. Please try again.'; return; } user = match; write(KEYS.current, user.email); checkBadges(); openApp(); });
  $('logoutBtn').addEventListener('click', () => { localStorage.removeItem(KEYS.current); clearInterval(window.arcClock); if(chart){chart.destroy();chart=null;} user = null; $('appView').classList.add('d-none'); $('authView').classList.remove('d-none'); switchAuth(true); $('loginForm').reset(); });
  $('bmiBtn').addEventListener('click', calculateBmi); $('proteinBtn').addEventListener('click', () => calculateProtein(true));
  $('progressForm').addEventListener('submit', e => {
    e.preventDefault(); if (!e.currentTarget.reportValidity()) return;
    const entry = {date:$('entryDate').value,weight:Number($('entryWeight').value),waist:Number($('entryWaist').value)||null,hips:Number($('entryHips').value)||null,notes:$('entryNotes').value.trim()};
    if(!entry.date || entry.date>today() || entry.weight<30 || entry.weight>300) return notice('Use today or a past date and a weight from 30 to 300 kg.');
    const entries=progressData(), index=entries.findIndex(x=>x.date===entry.date);
    if(index>=0) entries[index]=entry; else entries.push(entry);
    saveSessionData(KEYS.progress,entries);
    user.weight=entries.slice().sort((a,b)=>b.date.localeCompare(a.date))[0].weight;
    $('bmiWeight').value=user.weight; calculateBmi();
    ['entryWeight','entryWaist','entryHips','entryNotes'].forEach(id=>$(id).value='');
    renderAll(); notice('Progress check-in saved.');
  });
  $('clearProgressBtn').addEventListener('click', () => { if (!progressData().length) return notice('There are no progress entries to reset.'); if (window.confirm('Delete all your progress entries and chart data?')) { saveSessionData(KEYS.progress, []); renderProgress(); checkBadges(); notice('Progress entries cleared.'); } });
  $('beforeUpload').addEventListener('change', (e) => { processPhoto(e.target.files[0], 'before'); e.target.value = ''; }); $('afterUpload').addEventListener('change', (e) => { processPhoto(e.target.files[0], 'after'); e.target.value = ''; }); $('compareSlider').addEventListener('input', updateComparison); $('reportBtn').addEventListener('click', createReport);
  sectionNav();
  if (window.bootstrap) toast = bootstrap.Toast.getOrCreateInstance($('appToast'), { delay: 2600 });
  const currentEmail = read(KEYS.current, null); if (currentEmail) { user = getUsers().find((u) => userKey(u) === String(currentEmail).toLowerCase()) || null; if (user) { checkBadges(); openApp(); } else localStorage.removeItem(KEYS.current); }
})();
