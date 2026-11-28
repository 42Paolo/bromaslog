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
      'hero.claim': 'Guidiamo la Rivoluzione Industriale con una Tecnologia Composita all\'avanguardia.',
      'hero.sub': 'Soluzioni tessili avanzate per industrie più resistenti, leggere ed efficienti.',
      'about.title': "Tessuti tecnici,<br>plasmati dall’innovazione<br>continua",
      'about.p1': "Siamo un’azienda specializzata nello sviluppo e nella produzione di impianti tecnologicamente avanzati per la tessitura triassiale della fibra di carbonio e di apparecchiature per l’intera linea di produzione tessile di questo materiale. Grazie alla nostra esperienza nel settore e alla continua ricerca tecnologica, forniamo soluzioni su misura per soddisfare le esigenze di un mercato in costante evoluzione.",
      'about.cta': 'Scopri la nostra tecnologia',
      'about.p2': "Attraverso il nostro settore di ricerca e sviluppo, apportiamo significative innovazioni nei processi industriali di produzione tessile nel settore dei tessuti tecnici, migliorando l’efficienza, la qualità e la sostenibilità. La nostra capacità di combinare materiali innovativi, come i compositi, con tecnologie avanzate ci consente di supportare i nostri clienti nel raggiungimento di nuovi standard competitivi.",
      'dens.alt': "La macchina DENSITRAX® per la spiegatura di precisione dei tessuti",
      'dens.p': "Un nuovo approccio ai tessuti tecnici inizia con l’eliminazione dello spazio inutile tra ordito e trama. Grazie a una tecnologia di spiegatura di precisione, le fibre vengono portate a un contatto più stretto, riducendo in modo significativo la quantità di resina necessaria. A differenza dei tessuti convenzionali, nei quali l’eccesso di resina aumenta il peso senza migliorare la resistenza strutturale, questa tecnologia consente di produrre laminati più sottili, più leggeri e più resistenti. Con un risparmio di resina del 15–20%, DENSITRAX® ottiene un rapporto fibra/resina ottimizzato, stabilendo un nuovo standard nella produzione di compositi.",
      'equ.alt': "Il creel EQU 8 con le bobine di carbonio e kevlar",
      'equ.title': "EQU 8 CREEL A CONTROLLO PROATTIVO",
      'equ.p1': "Il Creel studiato per svolgere in deroule le bobine di carbonio o kevlar.",
      'equ.p2': "Il sistema si avvale di un controllo proattivo per la gestione delle tensioni ideale per l’alimentazione di telai. Le geometrie e i passaggi del filo in svolgimento agevolano e facilitano il distacco del filo dalla bobina.",
      'equ.p3': "Ha un sistema di caricamento agevolato che facilita le operazioni di cambio bobina.",
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
      'vision.title': 'La nostra visione',
      'vision.headline': 'Anticipare le tendenze e guidarle con coraggio',
      'vision.s2.label': 'Settore',
      'vision.s2.title': 'Soluzioni che creano un vantaggio competitivo',
      'vision.s2.p1': 'Vogliamo dare slancio al mercato con idee innovative che rispondono a bisogni reali, invitando le aziende a esplorare nuovi orizzonti e opportunità con le tecnologie avanzate dei nostri prodotti.',
      'vision.s2.p2': 'Scegliere noi significa creare prodotti distintivi e senza eguali, riconosciuti per l\'elevata qualità. Esperienza e impegno verso il progresso ci permettono di offrire soluzioni su misura che superano gli standard del settore e aiutano le aziende a distinguersi.',
      'vision.s3.label': 'Settore',
      'vision.s3.title': '30 anni di esperienza e innovazione',
      'vision.s3.p1': 'In tre decenni abbiamo costruito una profonda competenza nella produzione tessile. Tessuto, fibre e filati sono la base di ogni composito, e sappiamo anticipare e risolvere sfide come tensione, svolgimento, attrito e sfilacciamento.',
      'vision.s3.p2': 'La nostra conoscenza ci permette di trattare ogni tipo di filato e di gestire la produzione del tessuto riducendo o eliminando i problemi. Per noi qualità e produttività sono inscindibili e le perseguiamo con impegno e dedizione.',
      'vision.p1': 'Vogliamo dare energia al mercato con idee innovative che rispondono a bisogni reali, guidando i nostri clienti verso i nuovi orizzonti e le opportunità offerti dalle tecnologie sofisticate dei nostri prodotti.',
      'vision.p2': 'La nostra esperienza e la dedizione all\'eccellenza ci permettono di offrire soluzioni all\'avanguardia e su misura, che superano le aspettative. Collaborare con noi significa un approccio proattivo e visionario, guidato dalla passione per l\'innovazione.',
      'vision.w1': 'Direzione.',
      'vision.w2': 'Tensione.',
      'vision.w3': 'Spazio.',
      'vision.line': 'Ciò che rende un tessuto pronto per le sfide dei nostri partner, in ogni settore.',
      'hangar.l': 'Trent\'anni di<br>tessile al servizio',
      'hangar.r': 'esperienza<br>di settori diversi',
      'hangar.sr': 'Trent\'anni di esperienza tessile al servizio di settori diversi',
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
      'detail.project': 'Ufficio progetti',
      'detail.projectValue': 'Via Cellerese 33, 50013 Campi Bisenzio (FI), Italy',
      'detail.main': 'Sede principale',
      'detail.mainValue': 'Via Rimini, 7, 59100 Prato, Italy',
      'detail.mainIds': 'P.I. e CF 02199860970 · N.REA PO-511085',
      'detail.operating': 'Sede operativa',
      'detail.operatingValue': 'Via Donatello 19/c, 59016 Poggio a Caiano (PO), Italy',
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
      'hero.claim': 'Leading the Industrial Revolution with Cutting-edge Composite Technology.',
      'hero.sub': 'Advanced textile solutions for stronger, lighter, and more efficient industries.',
      'about.title': "Technical textiles,<br>shaped by continuous<br>innovation",
      'about.p1': "We are a company specialised in the development and manufacture of technologically advanced machinery for the triaxial weaving of carbon fibre, and of equipment for the entire textile production line of this material. Thanks to our experience in the field and continuous technological research, we provide tailor-made solutions to meet the needs of a constantly evolving market.",
      'about.cta': 'Discover Our Technology',
      'about.p2': "Through our research and development department, we bring significant innovations to the industrial processes of textile production in the technical textiles sector, improving efficiency, quality and sustainability. Our ability to combine innovative materials, such as composites, with advanced technologies allows us to support our customers in reaching new competitive standards.",
      'dens.alt': "The DENSITRAX® machine for precision fabric spreading",
      'dens.p': "A new approach to technical textiles begins with the elimination of unnecessary space between warp and weft. Through precision spreading technology, fibres are brought into closer contact, significantly reducing the amount of resin required. Unlike conventional fabrics, where excess resin increases weight without improving structural strength, this technology enables the production of thinner, lighter and stronger laminates. With resin savings of 15–20%, DENSITRAX® achieves an optimised fibre-to-resin ratio, setting a new standard in composite manufacturing.",
      'equ.alt': "The EQU 8 creel with carbon and Kevlar spools",
      'equ.title': "EQU 8 CREEL WITH PROACTIVE CONTROL",
      'equ.p1': "The creel designed to unwind carbon or Kevlar spools in pay-off.",
      'equ.p2': "The system uses proactive control to manage tensions, ideal for feeding looms. The geometry and the path of the thread as it unwinds make it easier for the thread to come away from the spool.",
      'equ.p3': "It has an easy-loading system that makes spool changes simpler.",
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
      'vision.title': 'Our vision',
      'vision.headline': 'Anticipate trends and lead them boldly',
      'vision.s2.label': 'Sector',
      'vision.s2.title': 'Solutions that create a competitive advantage',
      'vision.s2.p1': 'We strive to invigorate the market with innovative ideas that meet genuine needs, inviting companies to explore new horizons and opportunities with the advanced technologies of our products.',
      'vision.s2.p2': 'Choosing us means creating distinctive, unparalleled products, recognized for their superior quality. Our experience and commitment to progress deliver customized solutions that exceed industry standards and help businesses stand out.',
      'vision.s3.label': 'Sector',
      'vision.s3.title': '30 years of experience and innovation',
      'vision.s3.p1': 'Over three decades we have built deep expertise in textile production. Fabric, fibers and yarn are the foundation of every composite, and we anticipate and resolve challenges such as tension, unwinding, friction and fraying.',
      'vision.s3.p2': 'Our knowledge lets us handle every type of yarn and manage fabric production so that issues are minimized or eliminated. For us, quality and productivity are inextricably linked, and we pursue both with commitment and dedication.',
      'vision.p1': 'We aspire to energize the market with innovative ideas that meet genuine needs, guiding our clients toward the new horizons and opportunities offered by the sophisticated technologies of our products.',
      'vision.p2': 'Our years of experience and dedication to excellence enable us to offer cutting-edge, customized solutions that exceed expectations. Partnering with us means a proactive and visionary approach, driven by a passion for innovation.',
      'vision.w1': 'Direction.',
      'vision.w2': 'Tension.',
      'vision.w3': 'Space.',
      'vision.line': 'Everything that makes a fabric ready for our partners\' challenges, in every field.',
      'hangar.l': 'Thirty years of<br>serving a range',
      'hangar.r': 'textile expertise<br>of industries',
      'hangar.sr': 'Thirty years of textile expertise serving a range of industries',
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
      'detail.project': 'Project office',
      'detail.projectValue': 'Via Cellerese 33, 50013 Campi Bisenzio (FI), Italy',
      'detail.main': 'Main office',
      'detail.mainValue': 'Via Rimini, 7, 59100 Prato, Italy',
      'detail.mainIds': 'VAT and tax code 02199860970 · REA PO-511085',
      'detail.operating': 'Operating office',
      'detail.operatingValue': 'Via Donatello 19/c, 59016 Poggio a Caiano (PO), Italy',
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
    var M = window.BromaslogMotion;
    return window.gsap.fromTo(cols, { yPercent: 0 }, {
      yPercent: -50,
      duration: M.dur.fast,
      ease: M.ease.move,
      stagger: M.stagger.base,
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

    var M = window.BromaslogMotion;
    var nav = document.getElementById('nav');
    var texts = gsap.utils.toArray('.nav-links > a, .site-eyebrow, .site-hero h1, .site-claim, .site-sub');
    var w0 = nav.getBoundingClientRect().width;
    root.classList.add('is-switching-lang');

    var swap = M.exit(M.dur.fast) + M.delay.hair;                  // the old words are gone: the text is swapped
    var tl = gsap.timeline({
      onComplete: function () {
        root.classList.remove('is-switching-lang');
        gsap.set(texts, { clearProps: 'transform,opacity,visibility' });
        busy = false;
      }
    });
    tl.add(rollLabel(from, labelFor(next)), 0)
      .to(texts, { autoAlpha: 0, y: -8, duration: M.exit(M.dur.fast), ease: M.ease.in, stagger: M.stagger.tight }, 0)
      .call(function () {
        lang = next;
        save();
        apply();                                                   // new words, hidden for the moment
        gsap.set(nav, { width: 'auto' });
        var w1 = nav.getBoundingClientRect().width;               // width the bar needs for the new words
        gsap.set(nav, { width: w0 });
        gsap.to(nav, { width: w1, duration: M.dur.fast, ease: M.ease.move, clearProps: 'width' });
      }, null, swap)
      .fromTo(texts, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: M.dur.fast, ease: M.ease.out, stagger: M.stagger.tight }, swap + M.delay.hair);
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
