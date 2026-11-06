(function () {
  'use strict'

  /* ---------- Settings ---------- */
  // Hours ahead of UTC for the bank. Ghana is UTC+0 all year.
  var UTC_OFFSET = 0
  var CURRENCY = 'GH₵'

  var $ = function (s, r) { return (r || document).querySelector(s) }
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)) }
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  var params = new URLSearchParams(location.search)
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] }) }
  var money = function (n, dp) { return CURRENCY + ' ' + Number(n).toLocaleString('en-GH', { minimumFractionDigits: dp || 0, maximumFractionDigits: dp || 0 }) }
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d } catch (e) { return d } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch (e) {} }
  }

  /* ---------- Review mode: ?review=1 highlights every figure still to confirm ---------- */
  if (params.has('review') || store.get('mkrb-review', false)) {
    store.set('mkrb-review', params.get('review') !== '0')
    if (params.get('review') !== '0') {
      document.documentElement.classList.add('review')
      var n = $$('[data-confirm]').length
      var b = document.createElement('div')
      b.className = 'review-banner'
      b.setAttribute('role', 'status')
      b.innerHTML = '<strong>Review mode.</strong> ' + n + ' item' + (n === 1 ? '' : 's') + ' on this page still need the bank to confirm them. They are highlighted in yellow. <a href="?review=0" style="color:#ffd84d;text-decoration:underline">Turn off</a>'
      document.body.appendChild(b)
    }
  }

  /* ---------- Header and menus ---------- */
  var header = $('[data-header]')
  var onScroll = function () { if (header) header.classList.toggle('is-stuck', window.scrollY > 8); catchUp() }
  window.addEventListener('scroll', onScroll, { passive: true })

  var megas = $$('[data-mega]')
  function closeMegas(except) {
    megas.forEach(function (m) { if (m === except) return; m.classList.remove('is-open'); $('button', m).setAttribute('aria-expanded', 'false') })
  }
  megas.forEach(function (m) {
    var b = $('button', m), t
    var hover = function () { return window.matchMedia('(hover: hover) and (pointer: fine)').matches }
    b.addEventListener('click', function () { var open = !m.classList.contains('is-open'); closeMegas(m); m.classList.toggle('is-open', open); b.setAttribute('aria-expanded', String(open)) })
    m.addEventListener('mouseenter', function () { if (!hover()) return; clearTimeout(t); t = setTimeout(function () { closeMegas(m); m.classList.add('is-open'); b.setAttribute('aria-expanded', 'true') }, 80) })
    m.addEventListener('mouseleave', function () { if (!hover()) return; clearTimeout(t); t = setTimeout(function () { m.classList.remove('is-open'); b.setAttribute('aria-expanded', 'false') }, 180) })
    m.addEventListener('focusout', function (e) { if (!m.contains(e.relatedTarget)) { m.classList.remove('is-open'); b.setAttribute('aria-expanded', 'false') } })
  })
  document.addEventListener('click', function (e) { if (!e.target.closest('[data-mega]')) closeMegas() })

  var menuBtn = $('[data-menu-button]'), menu = $('#mobile-menu')
  function setMenu(open) {
    if (!menuBtn) return
    menuBtn.setAttribute('aria-expanded', String(open))
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu')
    if (open) { var hd = $('[data-header]'); if (hd) menu.style.top = Math.max(0, hd.getBoundingClientRect().bottom) + 'px' }
    menu.classList.toggle('is-open', open)
    document.documentElement.style.overflow = open ? 'hidden' : ''
  }
  if (menuBtn) {
    menuBtn.addEventListener('click', function () { setMenu(menuBtn.getAttribute('aria-expanded') !== 'true') })
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false) }) })
    window.addEventListener('resize', function () { if (window.innerWidth >= 1280) setMenu(false) })
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var open = $('[data-mega].is-open button')
      closeMegas()
      if (open) open.focus()
      if (menu && menu.classList.contains('is-open')) { setMenu(false); menuBtn.focus() }
    }
  })

  /* ---------- Notice bar: dismissed notices stay dismissed ---------- */
  $$('[data-notice]').forEach(function (n) {
    var id = n.dataset.notice
    if (store.get('mkrb-notice-' + id)) { n.remove(); return }
    var x = $('[data-notice-close]', n)
    if (x) x.addEventListener('click', function () { store.set('mkrb-notice-' + id, true); n.remove() })
  })

  /* ---------- Reveal on scroll ---------- */
  var pending = []
  function catchUp() {
    pending = pending.filter(function (el) {
      if (el.getBoundingClientRect().top < innerHeight * 0.95) { el.classList.add('is-revealed'); return false }
      return true
    })
  }
  if ('IntersectionObserver' in window && !calm) {
    pending = $$('[data-reveal]')
    var io = new IntersectionObserver(function (en) { en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-revealed'); io.unobserve(e.target) } }) }, { rootMargin: '0px 0px -6% 0px' })
    pending.forEach(function (el) { io.observe(el) })
    catchUp()
  } else $$('[data-reveal]').forEach(function (el) { el.classList.add('is-revealed') })

  /* ---------- Tabs ---------- */
  $$('[role="tablist"]').forEach(function (list) {
    var tabs = $$('[role="tab"]', list)
    function select(t, focus) {
      tabs.forEach(function (x) { var on = x === t; x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1; var p = document.getElementById(x.getAttribute('aria-controls')); if (p) p.hidden = !on })
      if (focus) t.focus()
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t) })
      t.addEventListener('keydown', function (e) {
        var k = { ArrowRight: 1, ArrowLeft: -1 }[e.key]
        if (k) { e.preventDefault(); select(tabs[(i + k + tabs.length) % tabs.length], true) }
        if (e.key === 'Home') { e.preventDefault(); select(tabs[0], true) }
        if (e.key === 'End') { e.preventDefault(); select(tabs[tabs.length - 1], true) }
      })
    })
  })

  /* ---------- Dialogs: search, people, lightbox ---------- */
  var lastFocus
  function openDialog(d) { lastFocus = document.activeElement; if (d.showModal) d.showModal(); else d.setAttribute('open', '') }
  function closeDialog(d) { if (d.close) d.close(); else d.removeAttribute('open'); if (lastFocus && lastFocus.focus) lastFocus.focus() }
  $$('dialog').forEach(function (d) {
    d.addEventListener('click', function (e) { if (e.target === d) closeDialog(d) })
    d.addEventListener('close', function () { if (lastFocus && lastFocus.focus) lastFocus.focus() })
    $$('[data-close-dialog]', d).forEach(function (b) { b.addEventListener('click', function () { closeDialog(d) }) })
  })

  var sDlg = $('[data-search-dialog]'), sIn = $('[data-search-input]'), sOut = $('[data-search-results]'), index = null
  function runSearch() {
    var q = sIn.value.trim().toLowerCase()
    if (!q) { sOut.innerHTML = '<p class="px-2 py-3 text-muted">Try “susu”, “salary loan”, “Madina” or “annual report”.</p>'; return }
    if (!index) { sOut.innerHTML = '<p class="px-2 py-3 text-muted">Loading…</p>'; return }
    var terms = q.split(/\s+/)
    var hits = index.map(function (x) {
      var t = x.t.toLowerCase(), d = (x.d || '').toLowerCase(), s = 0
      terms.forEach(function (w) { if (t.indexOf(w) === 0) s += 5; else if (t.indexOf(w) > -1) s += 3; if (d.indexOf(w) > -1) s += 1 })
      return { x: x, s: terms.every(function (w) { return t.indexOf(w) > -1 || d.indexOf(w) > -1 }) ? s : 0 }
    }).filter(function (h) { return h.s }).sort(function (a, b) { return b.s - a.s }).slice(0, 10)
    var mark = function (s) { var o = esc(s); terms.forEach(function (w) { if (w.length > 1) o = o.replace(new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>') }); return o }
    sOut.innerHTML = hits.length ? hits.map(function (h) { return '<a class="result" href="' + esc(h.x.u) + '"><span class="block text-[.78rem] font-bold uppercase tracking-[.1em] text-brand-2">' + esc(h.x.k) + '</span><span class="block font-display text-[1.1rem] font-bold text-ink">' + mark(h.x.t) + '</span><span class="block text-[.92rem] text-muted">' + mark((h.x.d || '').slice(0, 130)) + '</span></a>' }).join('') : '<p class="px-2 py-3 text-muted">No results for “' + esc(q) + '”. Try another word, or <a class="prose-link" href="contact">ask us</a>.</p>'
  }
  if (sDlg) {
    $$('[data-open-search]').forEach(function (b) { b.addEventListener('click', function () { setMenu(false); openDialog(sDlg); setTimeout(function () { sIn.focus() }, 30) }) })
    sIn.addEventListener('input', runSearch)
    $('[data-search-form]').addEventListener('submit', function (e) { e.preventDefault(); var a = $('a', sOut); if (a) location.href = a.getAttribute('href') })
    sIn.addEventListener('focus', function () {
      if (index) return
      fetch('./assets/search-index.json').then(function (r) { return r.json() }).then(function (j) { index = j; runSearch() }).catch(function () { sOut.innerHTML = '<p class="px-2 py-3 text-muted">Search is not available right now.</p>' })
    })
    document.addEventListener('keydown', function (e) {
      var typing = /input|textarea|select/i.test(document.activeElement.tagName)
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) { e.preventDefault(); openDialog(sDlg); sIn.focus() }
    })
    runSearch()
  }

  // Board and management biographies
  var pDlg = $('[data-person-dialog]')
  $$('[data-person]').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = $('template', b.closest('.person'))
      $('[data-person-body]', pDlg).innerHTML = t.innerHTML
      openDialog(pDlg)
    })
  })

  // Gallery lightbox: arrow keys, swipe, captions
  var lb = $('[data-lightbox]')
  if (lb) {
    var shots = $$('[data-shot]'), cur = 0, lImg = $('img', lb), cap = $('[data-lb-cap]', lb), count = $('[data-lb-count]', lb)
    var show = function (i) {
      cur = (i + shots.length) % shots.length
      var s = shots[cur]
      lImg.src = s.dataset.full; lImg.alt = s.querySelector('img').alt
      cap.textContent = s.querySelector('img').alt
      count.textContent = (cur + 1) + ' of ' + shots.length
    }
    shots.forEach(function (s, i) { s.addEventListener('click', function () { show(i); openDialog(lb) }) })
    $('[data-lb-prev]', lb).addEventListener('click', function () { show(cur - 1) })
    $('[data-lb-next]', lb).addEventListener('click', function () { show(cur + 1) })
    lb.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') show(cur - 1); if (e.key === 'ArrowRight') show(cur + 1) })
    var x0 = null
    lb.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX }, { passive: true })
    lb.addEventListener('touchend', function (e) { if (x0 == null) return; var dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) show(cur + (dx < 0 ? 1 : -1)); x0 = null })
  }

  /* ---------- Opening hours ---------- */
  // data-hours="08:30-16:00|closed" (weekdays|saturday). Sundays and public holidays closed.
  function openState(spec) {
    var d = new Date(Date.now() + UTC_OFFSET * 3600000), day = d.getUTCDay(), m = d.getUTCHours() * 60 + d.getUTCMinutes()
    var parts = spec.split('|'), today = day === 0 ? 'closed' : day === 6 ? parts[1] : parts[0]
    var toM = function (t) { var p = t.split(':'); return +p[0] * 60 + +p[1] }
    if (today && today !== 'closed') {
      var r = today.split('-'), o = toM(r[0]), c = toM(r[1])
      if (m >= o && m < c) return { open: true, text: 'Open now, until ' + r[1] }
      if (m < o) return { open: false, text: 'Closed, opens at ' + r[0] }
    }
    var next = day === 5 ? (parts[1] !== 'closed' ? 'Saturday' : 'Monday') : day === 6 || day === 0 ? 'Monday' : 'tomorrow'
    return { open: false, text: 'Closed, opens ' + next + ' at ' + parts[0].split('-')[0] }
  }
  $$('[data-hours]').forEach(function (el) { var s = openState(el.dataset.hours); el.classList.toggle('is-open', s.open); $('span', el).textContent = s.text })

  /* ---------- Branch finder ---------- */
  var finder = $('[data-finder]')
  if (finder) {
    var cards = $$('[data-branch]'), q = $('[data-finder-q]', finder), region = 'all', type = 'all'
    var apply = function () {
      var t = q.value.trim().toLowerCase(), n = 0
      cards.forEach(function (c) {
        var ok = (region === 'all' || c.dataset.region === region) && (type === 'all' || c.dataset.type === type || (type === 'open' && $('.open-dot.is-open', c))) && (!t || c.dataset.text.indexOf(t) > -1)
        c.hidden = !ok; if (ok) n++
      })
      $('[data-finder-count]').textContent = n === cards.length ? 'Showing all ' + n + ' locations' : 'Showing ' + n + ' of ' + cards.length + ' locations'
      $('[data-finder-empty]').hidden = n > 0
    }
    $$('[data-region]', finder).forEach(function (b) { b.addEventListener('click', function () { region = b.dataset.region; $$('[data-region]', finder).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)) }); apply() }) })
    $$('[data-type]', finder).forEach(function (b) { b.addEventListener('click', function () { type = b.dataset.type; $$('[data-type]', finder).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)) }); apply() }) })
    q.addEventListener('input', apply)
    var start = params.get('town'); if (start) { q.value = start; apply() }
  }

  // Copy a GPS address
  $$('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = b.dataset.copy, done = function () { var o = b.innerHTML; b.textContent = 'Copied'; setTimeout(function () { b.innerHTML = o }, 1500) }
      if (navigator.clipboard) navigator.clipboard.writeText(t).then(done, function () {})
    })
  })

  /* ---------- Simple filters (news, reports, FAQs) ---------- */
  $$('[data-filter-group]').forEach(function (g) {
    var list = $('[data-filter-list="' + g.dataset.filterGroup + '"]')
    $$('[data-filter]', g).forEach(function (b) {
      b.addEventListener('click', function () {
        $$('[data-filter]', g).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)) })
        var f = b.dataset.filter
        $$('[data-cat]', list).forEach(function (c) { c.hidden = f !== 'all' && c.dataset.cat.split(' ').indexOf(f) < 0 })
      })
    })
  })

  /* ---------- Loan calculator ---------- */
  $$('[data-loan-calc]').forEach(function (c) {
    var amt = $('[data-amount]', c), mon = $('[data-months]', c), rate = $('[data-rate]', c)
    var fill = function (r) { r.style.setProperty('--fill', ((r.value - r.min) / (r.max - r.min) * 100) + '%') }
    var calc = function () {
      var P = +amt.value, n = +mon.value, a = (+rate.value || 0) / 100 / 12
      var pay = a ? P * a / (1 - Math.pow(1 + a, -n)) : P / n
      $('[data-amount-out]', c).textContent = money(P)
      $('[data-months-out]', c).textContent = n + (n === 1 ? ' month' : ' months')
      $('[data-pay-out]', c).textContent = money(Math.round(pay))
      $('[data-total-out]', c).textContent = money(Math.round(pay * n))
      $('[data-interest-out]', c).textContent = money(Math.round(pay * n - P))
      fill(amt); fill(mon)
      var go = $('[data-calc-apply]', c)
      if (go && go.dataset.base) go.href = go.dataset.base + '?amount=' + P + '&months=' + n + '#apply'
      c.dataset.amount = P; c.dataset.months = n
    }
    // On a product page the button jumps to the form below and fills in the amount and period
    var goBtn = $('[data-calc-apply]', c)
    if (goBtn && !goBtn.dataset.base) goBtn.addEventListener('click', function () {
      var f = $('#apply form'); if (!f) return
      if (f.amount) f.amount.value = c.dataset.amount
      if (f.months) f.months.value = c.dataset.months
    })
    var prod = $('[data-calc-product]', c)
    if (prod) prod.addEventListener('change', function () {
      var o = prod.selectedOptions[0]
      amt.min = o.dataset.min; amt.max = o.dataset.max; mon.max = o.dataset.months
      amt.value = Math.min(Math.max(+amt.value, +amt.min), +amt.max); mon.value = Math.min(+mon.value, +mon.max)
      $('[data-calc-apply]', c).dataset.base = o.value
      calc()
    })
    ;[amt, mon, rate].forEach(function (el) { el.addEventListener('input', calc) })
    calc()
  })

  /* ---------- Susu planner ---------- */
  $$('[data-susu]').forEach(function (c) {
    var d = $('[data-daily]', c), days = $('[data-days]', c), wk = $('[data-weeks]', c)
    var calc = function () {
      var total = +d.value * +days.value * +wk.value
      $('[data-daily-out]', c).textContent = money(+d.value)
      $('[data-weeks-out]', c).textContent = wk.value + ' weeks'
      $('[data-susu-out]', c).textContent = money(total)
      ;[d, wk].forEach(function (r) { r.style.setProperty('--fill', ((r.value - r.min) / (r.max - r.min) * 100) + '%') })
    }
    ;[d, days, wk].forEach(function (el) { el.addEventListener('input', calc) })
    calc()
  })

  /* ---------- Forms ---------- */
  var PHONE = /^(\+?233|0)[235]\d{8}$/
  function setErr(input, msg) {
    var field = input.closest('.field') || input.closest('.check') || input.parentElement
    var err = field.querySelector('.err[data-auto]')
    input.classList.toggle('is-bad', !!msg)
    input.setAttribute('aria-invalid', msg ? 'true' : 'false')
    if (msg) {
      if (!err) { err = document.createElement('span'); err.className = 'err'; err.setAttribute('data-auto', ''); err.id = 'e' + Math.random().toString(36).slice(2, 8); field.appendChild(err) }
      err.textContent = msg; err.hidden = false
      input.setAttribute('aria-describedby', [input.dataset.hint, err.id].filter(Boolean).join(' '))
    } else if (err) { err.hidden = true; if (input.dataset.hint) input.setAttribute('aria-describedby', input.dataset.hint); else input.removeAttribute('aria-describedby') }
    return !msg
  }
  function check(i) {
    if (i.disabled || i.closest('[hidden]') || i.closest('.hp')) return true
    var v = (i.value || '').trim()
    if (i.type === 'checkbox') return setErr(i, i.required && !i.checked ? (i.dataset.msg || 'Please tick this box to continue.') : '')
    if (i.type === 'radio') { var g = $$('input[name="' + i.name + '"]', i.form); return !i.required || g.some(function (x) { return x.checked }) ? setErr(i, '') : setErr(i, 'Please choose one.') }
    if (i.required && !v) return setErr(i, 'Please fill this in.')
    if (v && i.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return setErr(i, 'Enter an email address like name@example.com.')
    if (v && i.type === 'tel' && !PHONE.test(v.replace(/[\s()-]/g, ''))) return setErr(i, 'Enter a Ghana phone number, for example 024 000 0000.')
    if (v && i.dataset.min && +v < +i.dataset.min) return setErr(i, 'The minimum is ' + i.dataset.min + '.')
    return setErr(i, '')
  }
  function validate(root) {
    var bad = $$('input, select, textarea', root).filter(function (i) { return !check(i) })
    if (bad.length) bad[0].focus()
    return !bad.length
  }
  document.addEventListener('change', function (e) { if (e.target.matches && e.target.matches('[aria-invalid="true"]')) check(e.target) })
  document.addEventListener('blur', function (e) { if (e.target.matches && e.target.matches('.input[aria-invalid="true"]')) check(e.target) }, true)

  var ref = function (p) { return p + '-' + new Date().toISOString().slice(2, 10).replace(/-/g, '') + '-' + Math.floor(1000 + Math.random() * 9000) }
  $$('form[data-form]').forEach(function (f) {
    // Prefill from the calculator link: ?amount=&months=
    var a = $('[name="amount"]', f); if (a && params.get('amount')) a.value = params.get('amount')
    var m = $('[name="months"]', f); if (m && params.get('months')) m.value = params.get('months')
    var pr = $('[name="product"]', f); if (pr && params.get('product')) pr.value = params.get('product')
    f.addEventListener('submit', function (e) {
      e.preventDefault()
      // Honeypot: real visitors never see or fill this field
      var hp = $('.hp input', f)
      if (hp && hp.value) return
      if (!validate(f)) return
      // This is where the form would be sent to your server. See README in _build.
      var ok = $('[data-form-ok="' + f.id + '"]') || $('[data-form-ok]', f.parentElement)
      if (ok) {
        var r = $('[data-ref]', ok); if (r) r.textContent = ref(f.dataset.form.toUpperCase().slice(0, 3))
        f.hidden = true; ok.hidden = false; ok.setAttribute('tabindex', '-1'); ok.focus()
      }
    })
  })

  /* ---------- Open an account: four steps ---------- */
  var wiz = $('[data-wizard]')
  if (wiz) {
    var steps = $$('[data-step]', wiz), bars = $$('[data-step-bar]', wiz), at = 0
    var go = function (i) {
      at = i
      steps.forEach(function (s, k) { s.hidden = k !== i })
      bars.forEach(function (b, k) { b.classList.toggle('bg-brand', k <= i); b.classList.toggle('bg-mint-2', k > i) })
      $('[data-step-label]', wiz).textContent = 'Step ' + (i + 1) + ' of ' + steps.length
      var h = $('h2', steps[i]); if (h) { h.setAttribute('tabindex', '-1'); h.focus() }
      if (i === steps.length - 1) review()
      wiz.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' })
    }
    $$('[data-next]', wiz).forEach(function (b) { b.addEventListener('click', function () { if (validate(steps[at])) go(at + 1) }) })
    $$('[data-back]', wiz).forEach(function (b) { b.addEventListener('click', function () { go(at - 1) }) })
    // Show the right document list for the chosen account
    var docs = function () {
      var c = $('input[name="account"]:checked', wiz)
      $$('[data-docs-for]', wiz).forEach(function (d) { d.hidden = !c || d.dataset.docsFor !== c.value })
    }
    $$('input[name="account"]', wiz).forEach(function (r) { r.addEventListener('change', docs) })
    var pre = params.get('account'); if (pre) { var r0 = $('input[name="account"][value="' + pre + '"]', wiz); if (r0) r0.checked = true }
    docs()
    function review() {
      var get = function (n) { var el = $('[name="' + n + '"]', wiz); if (!el) return ''; if (el.type === 'radio') { var c = $('input[name="' + n + '"]:checked', wiz); return c ? c.dataset.label : '' } return el.tagName === 'SELECT' ? el.selectedOptions[0].text : el.value }
      $('[data-review]', wiz).innerHTML = [['Account', get('account')], ['Name', get('first') + ' ' + get('last')], ['Phone', get('phone')], ['Email', get('email') || 'Not given'], ['Branch', get('branch')], ['Best time to call', get('time')]].map(function (r) { return '<div class="flex justify-between gap-4 border-b border-line py-3"><dt class="text-muted">' + r[0] + '</dt><dd class="text-right font-semibold text-ink">' + esc(r[1]) + '</dd></div>' }).join('')
    }
    go(0)
    // go(0) focuses the heading; undo the scroll on first load
    window.scrollTo(0, 0)
  }

  // Print buttons
  $$('[data-print]').forEach(function (b) { b.addEventListener('click', function () { window.print() }) })

  onScroll()
})()
