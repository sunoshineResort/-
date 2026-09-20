// Brochure builder — turns the photo sections of index.html into a 16:9 PDF deck.
// Run it from build-brochure.html over http (a local server or the live site), never
// from a file:// path: browsers refuse to read local images back out of a canvas.
(() => {
  const W = 297, H = 167;                       // page size in millimetres
  const GOLD = [212, 165, 32], DARK = [26, 26, 26], WHITE = [255, 255, 255];
  const GAP = 3, PER_PAGE = 5;

  const CONTACT = {
    phone: '+91 8169203765',
    email: 'sunoshine2026@gmail.com',
    instagram: 'instagram.com/sunoshine2026',
    address: 'Karjat, Murbad Road, Near Mumbai, 410201, Maharashtra'
  };
  const CHIPS = ['Private pool', 'Elegant rooms', 'Lush gardens', 'Warm hospitality',
                 'Family getaways', 'Weekend trips', 'Corporate outings'];

  const load = src => new Promise((ok, fail) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => fail(new Error('image failed: ' + src));
    img.src = src;
  });

  // Crop to fill w x h at ~150dpi — the print equivalent of CSS object-fit: cover.
  function cropped(img, w, h) {
    const px = 150 / 25.4;
    const c = document.createElement('canvas');
    c.width = Math.round(w * px);
    c.height = Math.round(h * px);
    const s = Math.max(c.width / img.naturalWidth, c.height / img.naturalHeight);
    const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
    c.getContext('2d').drawImage(img, (c.width - dw) / 2, (c.height - dh) / 2, dw, dh);
    return c.toDataURL('image/jpeg', 0.82);
  }

  const fill = (pdf, img, x, y, w, h) => pdf.addImage(cropped(img, w, h), 'JPEG', x, y, w, h);

  const alpha = (pdf, a) => pdf.setGState(new pdf.GState({ opacity: a }));

  // Photo card: white mount, then the cropped photo.
  function tile(pdf, img, x, y, w, h) {
    pdf.setFillColor(...WHITE);
    pdf.rect(x - 0.9, y - 0.9, w + 1.8, h + 1.8, 'F');
    fill(pdf, img, x, y, w, h);
  }

  // One to five photos arranged inside the given box.
  function collage(pdf, imgs, x, y, w, h) {
    const n = imgs.length;
    if (n === 1) return tile(pdf, imgs[0], x, y, w, h);
    if (n === 2) {
      const cw = (w - GAP) / 2;
      return imgs.forEach((im, i) => tile(pdf, im, x + i * (cw + GAP), y, cw, h));
    }
    if (n === 3) {
      const bw = (w - GAP) * 0.62, sw = w - GAP - bw, sh = (h - GAP) / 2;
      tile(pdf, imgs[0], x, y, bw, h);
      tile(pdf, imgs[1], x + bw + GAP, y, sw, sh);
      return tile(pdf, imgs[2], x + bw + GAP, y + sh + GAP, sw, sh);
    }
    if (n === 4) {
      const cw = (w - GAP) / 2, ch = (h - GAP) / 2;
      return imgs.forEach((im, i) =>
        tile(pdf, im, x + (i % 2) * (cw + GAP), y + Math.floor(i / 2) * (ch + GAP), cw, ch));
    }
    const bw = (w - GAP) * 0.56, sw = (w - bw - 2 * GAP) / 2, ch = (h - GAP) / 2;
    tile(pdf, imgs[0], x, y, bw, h);
    imgs.slice(1, 5).forEach((im, i) =>
      tile(pdf, im, x + bw + GAP + (i % 2) * (sw + GAP), y + Math.floor(i / 2) * (ch + GAP), sw, ch));
  }

  function coverPage(pdf, hero, logo) {
    fill(pdf, hero, 0, 0, W, H);
    pdf.setFillColor(0, 0, 0);
    alpha(pdf, 0.22);
    pdf.rect(0, 0, W, H, 'F');
    alpha(pdf, 0.68);
    pdf.rect(0, 84, W, H - 84, 'F');
    alpha(pdf, 1);

    const lw = 54, lh = lw * logo.naturalHeight / logo.naturalWidth;
    pdf.addImage(logo, 'JPEG', 14, 14, lw, lh);

    pdf.setTextColor(...WHITE);
    pdf.setFont('helvetica', 'bold').setFontSize(40);
    pdf.text('SUN SHINE RESORT', 14, 108);
    pdf.setDrawColor(...GOLD).setLineWidth(1.2);
    pdf.line(14, 116, 104, 116);
    pdf.setFont('times', 'italic').setFontSize(18);
    pdf.text('Where Comfort meets Royalty', 14, 128);
    pdf.setFont('helvetica', 'normal').setFontSize(10.5);
    pdf.text('A luxury retreat near Mumbai  ·  Karjat, Maharashtra', 14, 138);

    pdf.setFillColor(...GOLD);
    pdf.rect(0, H - 15, W, 15, 'F');
    pdf.setTextColor(...DARK).setFont('helvetica', 'bold').setFontSize(10.5);
    pdf.text(`${CONTACT.phone}     ${CONTACT.email}     ${CONTACT.instagram}`, 14, H - 5.4);
  }

  function aboutPage(pdf, photo, paragraphs) {
    const panel = 122;
    fill(pdf, photo, panel, 0, W - panel, H);
    pdf.setFillColor(...GOLD);
    pdf.rect(0, 0, panel, H, 'F');

    pdf.setTextColor(...DARK);
    pdf.setFont('helvetica', 'bold').setFontSize(20);
    pdf.text('THE RESORT', 14, 30);
    pdf.setDrawColor(...DARK).setLineWidth(0.6);
    pdf.line(14, 35, 46, 35);

    pdf.setFont('times', 'italic').setFontSize(15);
    pdf.text('"Escape the Ordinary.\nEmbrace the Royal."', 14, 48);

    pdf.setFont('helvetica', 'normal').setFontSize(9.5);
    let y = 70;
    paragraphs.forEach(p => {
      const lines = pdf.splitTextToSize(p, panel - 28);
      pdf.text(lines, 14, y);
      y += lines.length * 5 + 5;
    });

    pdf.setFont('helvetica', 'bold').setFontSize(9);
    let cx = 14, cy = y + 2;
    CHIPS.forEach(chip => {
      const cw = pdf.getTextWidth(chip) + 7;
      if (cx + cw > panel - 14) { cx = 14; cy += 10; }
      pdf.setFillColor(...DARK);
      pdf.roundedRect(cx, cy - 5.6, cw, 8, 4, 4, 'F');
      pdf.setTextColor(...GOLD);
      pdf.text(chip, cx + 3.5, cy);
      cx += cw + 3;
    });
  }

  function photoPage(pdf, title, imgs) {
    pdf.setFillColor(...GOLD);
    pdf.rect(0, 0, W, 19, 'F');
    pdf.setTextColor(...DARK);
    pdf.setFont('helvetica', 'bold').setFontSize(15);
    pdf.text(title.toUpperCase(), 14, 12.6);
    pdf.setFont('times', 'italic').setFontSize(10);
    pdf.text('Sun Shine Resort  ·  Karjat, Maharashtra', W - 14, 12.4, { align: 'right' });
    collage(pdf, imgs, 14, 25, W - 28, H - 37);
  }

  function closingPage(pdf, photo) {
    fill(pdf, photo, 0, 0, W, H);
    pdf.setFillColor(0, 0, 0);
    alpha(pdf, 0.25);
    pdf.rect(0, 0, W, H, 'F');
    alpha(pdf, 0.82);
    pdf.rect(0, 0, 168, H, 'F');
    alpha(pdf, 1);

    pdf.setTextColor(...WHITE);
    pdf.setFont('helvetica', 'bold').setFontSize(28);
    pdf.text('READY TO BOOK YOUR ESCAPE?', 14, 52);
    pdf.setDrawColor(...GOLD).setLineWidth(1.1);
    pdf.line(14, 60, 112, 60);

    pdf.setFont('helvetica', 'normal').setFontSize(13);
    pdf.text([
      `WhatsApp    ${CONTACT.phone}`,
      `Email       ${CONTACT.email}`,
      `Instagram   ${CONTACT.instagram}`
    ], 14, 78, { lineHeightFactor: 1.9 });

    pdf.setFont('times', 'italic').setFontSize(12);
    pdf.text(CONTACT.address, 14, 122);

    pdf.setFillColor(...GOLD);
    pdf.rect(0, H - 15, W, 15, 'F');
    pdf.setTextColor(...DARK).setFont('helvetica', 'bold').setFontSize(11);
    pdf.text('Sun Shine Resort  —  Where Comfort meets Royalty', 14, H - 5.4);
  }

  // Photo strips as they stand in the site markup: heading + its images.
  const sections = doc => [...doc.querySelectorAll('.gallery .gallery-sub')].map(h => ({
    title: h.textContent.trim(),
    srcs: [...h.nextElementSibling.querySelectorAll('.hscroll img')].map(i => i.getAttribute('src'))
  }));

  const chunk = (a, n) => a.reduce((out, v, i) =>
    (i % n ? out[out.length - 1].push(v) : out.push([v]), out), []);

  async function build() {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [W, H] });
    pdf.setProperties({
      title: 'Sun Shine Resort — Brochure',
      subject: 'Luxury resort in Karjat, Maharashtra',
      author: 'Sun Shine Resort',
      creator: 'Sun Shine Resort',
      keywords: 'Sun Shine Resort, Karjat, resort near Mumbai'
    });

    const page = await fetch('index.html').then(r => r.text());
    const doc = new DOMParser().parseFromString(page, 'text/html');
    const strips = sections(doc);
    const [hero, logo] = await Promise.all([load('images/hero-bg.jpg'), load('images/logo.jpeg')]);
    coverPage(pdf, hero, logo);

    const paragraphs = [...doc.querySelectorAll('.gallery-intro p')].map(p => p.textContent.trim());
    const aboutSrc = strips[0].srcs[0];
    pdf.addPage([W, H], 'landscape');
    aboutPage(pdf, await load(aboutSrc), paragraphs);

    for (const strip of strips) {
      for (const group of chunk(strip.srcs, PER_PAGE)) {
        const imgs = await Promise.all(group.map(load));
        pdf.addPage([W, H], 'landscape');
        photoPage(pdf, strip.title, imgs);
      }
    }

    pdf.addPage([W, H], 'landscape');
    closingPage(pdf, await load(strips[0].srcs[1] || aboutSrc));
    pdf.save('Sun-Shine-Resort-Brochure.pdf');
  }

  window.buildBrochure = build;
})();
