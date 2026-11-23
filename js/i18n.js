/*
 * Italian / English.
 *
 * The switch in the navbar always shows the language you can change TO ("EN" on the Italian site, "IT" on the
 * English one). Pressing it:
 *   - rolls its two letters up into the other language's letters,
 *   - fades the menu, the small label and the headline out, swaps the text, fades them back in,
 *   - eases the width of the bar to fit the new menu words.
 * The choice is remembered in this browser. Elements are translated through data-i18n="key" (text),
 * data-i18n-html (the text may contain <br>) and data-i18n-attr="attribute:key" (e.g. aria-label).
 * The contact panel re-writes itself through the "bromaslog:languagechange" event (see js/contact.js).
 *
 * Everything visible is translated, including the claim on the right of the home. The e-mail subject / labels sent
 * to you stay in Italian.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'bromaslog:lang';

  var DICT = {
    it: {
      'nav.aria': 'Principale',
      'nav.about': 'Chi siamo',
      'nav.portfolio': 'Portfolio',
      'nav.contact': 'Contatti',
      'lang.aria': 'Cambia lingua: inglese',
      'hero.eyebrow': 'Tessuti tecnici industriali',
      'hero.title': 'Precisione<br>in ogni fibra.',
      'hero.claim': '<span class="ln">Guidiamo la</span> <span class="ln">Rivoluzione Industriale con</span> <span class="ln">una Tecnologia Composita all\'avanguardia.</span>',
      'hero.sub': '<span class="ln">Soluzioni tessili avanzate per</span> <span class="ln">industrie più resistenti, leggere ed efficienti.</span>',
      'about.title': "Tessuti tecnici,<br>plasmati dall’innovazione<br>continua.",
      'about.p1': "Siamo un’azienda specializzata nello sviluppo e nella produzione di impianti tecnologicamente avanzati per la tessitura triassiale della fibra di carbonio e di apparecchiature per l’intera linea di produzione tessile di questo materiale. Grazie alla nostra esperienza nel settore e alla continua ricerca tecnologica, forniamo soluzioni su misura per soddisfare le esigenze di un mercato in costante evoluzione.",
      'about.cta': 'Scopri la nostra tecnologia',
      'about.p2': "Attraverso il nostro settore di ricerca e sviluppo, apportiamo significative innovazioni nei processi industriali di produzione tessile nel settore dei tessuti tecnici, migliorando l’efficienza, la qualità e la sostenibilità. La nostra capacità di combinare materiali innovativi, come i compositi, con tecnologie avanzate ci consente di supportare i nostri clienti nel raggiungimento di nuovi standard competitivi.",
      'texy.alt': "La macchina TEXY TRJ W per la tessitura triassiale della fibra di carbonio",
      'texy.p': "Nel panorama delle applicazioni pratiche, la TEXY TRJ W si distingue come un’avanguardia tecnologica nella tessitura triassiale, offrendo un’eccellenza senza precedenti nella produzione di tessuti in fibra di carbonio. Questi materiali, cuore dei compositi avanzati, si caratterizzano per una resistenza e una rigidità superiori, risultando indispensabili in ambiti dove le sollecitazioni meccaniche e strutturali sono critiche. Grazie a questa tecnologia, i tessuti prodotti eccellono sotto ogni aspetto, trovando impiego in settori che spaziano dall’aerospaziale all’automobilistico, fino alle applicazioni ingegneristiche più avanzate.",
      'portfolio.title': 'Settori di applicazione',
      'portfolio.1.t': 'Aerospazio',
      'portfolio.1.d': 'Compositi leggeri per strutture e componenti ad alte prestazioni.',
      'portfolio.2.t': 'Automotive',
      'portfolio.2.d': 'Rinforzi in carbonio per ridurre il peso senza perdere resistenza.',
      'portfolio.3.t': 'Nautica',
      'portfolio.3.d': 'Tessuti per scafi e strutture che resistono all\'ambiente marino.',
      'footer.top': 'Torna su',
      'panel.close': 'Chiudi il pannello contatti',
      'panel.title': 'Contattaci',
      'panel.lead': 'Parlaci del tuo progetto. Il nostro team ti ricontatterà al più presto.',
      'field.name': 'Nome e cognome *',
      'field.company': 'Azienda',
      'field.email': 'Email *',
      'field.phone': 'Telefono',
      'field.message': 'Messaggio *',
      'btn.send': 'Invia richiesta',
      'detail.email': 'Email',
      'detail.phone': 'Telefono',
      'detail.address': 'Sede',
      'detail.hours': 'Orari',
      'detail.addressValue': 'Via delle Industrie 24, 20100 Milano (MI)',
      'detail.hoursValue': 'Lun – Ven, 9:00 – 18:00',
      'form.sending': 'Invio in corso…',
      'form.ok': 'Grazie! Abbiamo ricevuto la tua richiesta: ti ricontatteremo al più presto.',
      'form.error': 'Invio non riuscito. Riprova tra poco o scrivici a {mail}.',
      'form.mailto': 'Si apre la tua app di posta: premi invia per completare la richiesta.'
    },
    en: {
      'nav.aria': 'Main',
      'nav.about': 'About us',
      'nav.portfolio': 'Portfolio',
      'nav.contact': 'Contact',
      'lang.aria': 'Change language: Italian',
      'hero.eyebrow': 'Industrial technical textiles',
      'hero.title': 'Precision<br>in every fibre.',
      'hero.claim': '<span class="ln">Leading the</span> <span class="ln">Industrial Revolution with</span> <span class="ln">Cutting-edge Composite Technology.</span>',
      'hero.sub': '<span class="ln">Advanced textile solutions for</span> <span class="ln">stronger, lighter, and more efficient industries.</span>',
      'about.title': "Technical textiles,<br>shaped by continuous<br>innovation.",
      'about.p1': "We are a company specialised in the development and manufacture of technologically advanced machinery for the triaxial weaving of carbon fibre, and of equipment for the entire textile production line of this material. Thanks to our experience in the field and continuous technological research, we provide tailor-made solutions to meet the needs of a constantly evolving market.",
      'about.cta': 'Discover Our Technology',
      'about.p2': "Through our research and development department, we bring significant innovations to the industrial processes of textile production in the technical textiles sector, improving efficiency, quality and sustainability. Our ability to combine innovative materials, such as composites, with advanced technologies allows us to support our customers in reaching new competitive standards.",
      'texy.alt': "The TEXY TRJ W machine for triaxial weaving of carbon fibre",
      'texy.p': "Among practical applications, the TEXY TRJ W stands out as a technological frontier in triaxial weaving, offering unprecedented excellence in the production of carbon fibre fabrics. These materials, the heart of advanced composites, are characterised by superior strength and stiffness, making them indispensable wherever mechanical and structural loads are critical. Thanks to this technology, the fabrics produced excel in every respect, finding use in sectors ranging from aerospace to automotive, up to the most advanced engineering applications.",
      'portfolio.title': 'Fields of application',
      'portfolio.1.t': 'Aerospace',
      'portfolio.1.d': 'Lightweight composites for high-performance structures and components.',
      'portfolio.2.t': 'Automotive',
      'portfolio.2.d': 'Carbon reinforcements that cut weight without losing strength.',
      'portfolio.3.t': 'Marine',
      'portfolio.3.d': 'Fabrics for hulls and structures that withstand the marine environment.',
      'footer.top': 'Back to top',
      'panel.close': 'Close the contact panel',
      'panel.title': 'Contact us',
      'panel.lead': 'Tell us about your project. Our team will get back to you as soon as possible.',
      'field.name': 'Full name *',
      'field.company': 'Company',
      'field.email': 'Email *',
      'field.phone': 'Phone',
      'field.message': 'Message *',
      'btn.send': 'Send request',
      'detail.email': 'Email',
      'detail.phone': 'Phone',
      'detail.address': 'Office',
      'detail.hours': 'Hours',
      'detail.addressValue': 'Via delle Industrie 24, 20100 Milan (MI), Italy',
      'detail.hoursValue': 'Mon – Fri, 9:00 – 18:00',
      'form.sending': 'Sending…',
      'form.ok': 'Thank you! We have received your request and will get back to you as soon as possible.',
      'form.error': 'Could not send. Please try again shortly or write to {mail}.',
      'form.mailto': 'Your email app is opening: press send to complete your request.'
    }
  };

  var root = document.documentElement;
  var lang = 'it';
  try {
    var saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'it' || saved === 'en') lang = saved;
  } catch (e) { /* storage blocked: the site simply starts in Italian */ }

  function t(key) {
    return (DICT[lang] && DICT[lang][key]) || DICT.it[key] || key;
  }

  function otherLang(l) { return l === 'it' ? 'en' : 'it'; }
  function labelFor(l) { return otherLang(l).toUpperCase(); }     // what the switch shows while the site is in `l`

  function motionReduced() {
    var p = new URLSearchParams(window.location.search).get('motion');
    if (p === 'full') return false;
    if (p === 'reduced') return true;
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /* ---------- text ---------- */

  function apply() {
    root.lang = lang;
    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n]'), function (el) {
      var value = t(el.getAttribute('data-i18n'));
      if (el.hasAttribute('data-i18n-html')) el.innerHTML = value;   // our own strings only
      else el.textContent = value;
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n-attr]'), function (el) {
      el.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
        var p = pair.split(':');
        if (p.length === 2) el.setAttribute(p[0].trim(), t(p[1].trim()));
      });
    });
    window.dispatchEvent(new CustomEvent('bromaslog:languagechange', { detail: { lang: lang } }));
  }

  /* ---------- the switch: two letters, each in a clipped slot ---------- */

  var btn = document.getElementById('lang-toggle');
  var label = btn && btn.querySelector('.lang-label');
  var cols = [];

  function buildLabel() {
    if (!label) return;
    label.textContent = '';
    cols = [0, 1].map(function () {
      var slot = document.createElement('span');
      slot.className = 'lg';
      var inner = document.createElement('span');
      inner.className = 'lg-in';
      inner.appendChild(document.createElement('span'));    // current letter
      inner.appendChild(document.createElement('span'));    // the letter that rolls in
      slot.appendChild(inner);
      label.appendChild(slot);
      return inner;
    });
  }

  function showLabel(text) {
    cols.forEach(function (inner, i) {
      inner.children[0].textContent = text.charAt(i);
      inner.children[1].textContent = '';
    });
    if (window.gsap) window.gsap.set(cols, { yPercent: 0 });
  }

  function rollLabel(from, to) {
    cols.forEach(function (inner, i) {
      inner.children[0].textContent = from.charAt(i);
      inner.children[1].textContent = to.charAt(i);
    });
    return window.gsap.fromTo(cols, { yPercent: 0 }, {
      yPercent: -50,
      duration: 0.55,
      ease: 'power3.inOut',
      stagger: 0.07,
      onComplete: function () { showLabel(to); }
    });
  }

  /* ---------- changing language ---------- */

  var busy = false;

  function save() {
    try { window.localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* ignore */ }
  }

  function switchTo(next) {
    if (busy || next === lang) return;
    busy = true;
    var from = labelFor(lang);
    var gsap = window.gsap;

    if (!gsap || motionReduced()) {
      lang = next;
      save();
      apply();
      showLabel(labelFor(lang));
      busy = false;
      return;
    }

    var nav = document.getElementById('nav');
    var texts = gsap.utils.toArray('.nav-links > a, .site-eyebrow, .site-hero h1, .site-claim, .site-sub');
    var w0 = nav.getBoundingClientRect().width;
    root.classList.add('is-switching-lang');

    var tl = gsap.timeline({
      onComplete: function () {
        root.classList.remove('is-switching-lang');
        gsap.set(texts, { clearProps: 'transform,opacity,visibility' });
        busy = false;
      }
    });
    tl.add(rollLabel(from, labelFor(next)), 0)
      .to(texts, { autoAlpha: 0, y: -8, duration: 0.22, ease: 'power2.in', stagger: 0.03 }, 0)
      .call(function () {
        lang = next;
        save();
        apply();                                                   // new words, hidden for the moment
        gsap.set(nav, { width: 'auto' });
        var w1 = nav.getBoundingClientRect().width;               // width the bar needs for the new words
        gsap.set(nav, { width: w0 });
        gsap.to(nav, { width: w1, duration: 0.5, ease: 'power3.inOut', clearProps: 'width' });
      }, null, 0.32)
      .fromTo(texts, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power3.out', stagger: 0.04 }, 0.36);
  }

  buildLabel();
  apply();
  showLabel(labelFor(lang));
  if (btn) btn.addEventListener('click', function () { switchTo(otherLang(lang)); });

  window.BromaslogI18n = {
    t: t,
    get lang() { return lang; }
  };
})();
