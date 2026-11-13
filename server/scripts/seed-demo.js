/* Sample reports for trying the dashboard locally, on real Xətai streets. They
   are stored with source = "demo" and have no photos.

     npm run seed:demo              add them (only into an empty database)
     npm run seed:demo -- --force   add them even if reports exist
     npm run seed:demo -- --remove  delete every sample report again        */

import { db, createReport, updateReport, addEvent, countReports, tx } from '../src/db.js';

const args = new Set(process.argv.slice(2));

if (args.has('--remove')) {
  const { changes } = db.prepare("DELETE FROM reports WHERE source = 'demo'").run();
  console.log(`Removed ${changes} sample reports.`);
  process.exit(0);
}

if (countReports() > 0 && !args.has('--force')) {
  console.log('The database already has reports. Use --force to add the samples anyway.');
  process.exit(0);
}

const DEPT = {
  roads: ['Yollar və Asfalt', 'Yol İstismar İdarəsi'],
  water: ['Su və Subasma', 'Sukanal İdarəsi'],
  sanitation: ['Təmizlik və Tullantılar', 'Təmizlik və Tullantı İdarəsi'],
  greenery: ['Yaşıllıq və Ağaclar', 'Yaşıllaşdırma İdarəsi'],
  lighting: ['Küçə İşıqlandırması', 'İşıqlandırma İdarəsi'],
  facades: ['Bina Fasadları', 'Tikinti və Təmir İdarəsi'],
  parks: ['Parklar və Avadanlıq', 'Park və Bağ İdarəsi'],
};

// title, category, severity, status, worker, hours ago, confidence, cost, lat, lng, address, note, explanation
const SAMPLES = [
  ['Dərin çuxur yağışdan sonra sürücülər üçün təhlükə yaradır', 'roads', 'critical', 'in_progress', 'Tural Əliyev', 38, 96, 640, 40.38994, 49.89868, 'Babək prospekti', 'Maşınımın təkəri zədələndi, çuxur çox dərindir. Gecə görünmür.', 'Yol örtüyündə dərin çuxur və çatlar görünür. Səth nəqliyyat və piyadalar üçün risk yaradır.'],
  ['Asfalt örtüyü döngə boyunca dağılıb', 'roads', 'high', 'approved', null, 14, 89, 420, 40.39303, 49.9235, 'Babək prospekti, Nizami rayonu tərəfi', 'Bütün döngə boyunca asfalt qopub.', 'Asfaltın üst qatı geniş sahədə qopub, kənarlarda çatlar var.'],
  ['Səki daşları qalxıb, piyadalar büdrəyir', 'roads', 'medium', 'pending', null, 5, 74, 180, 40.3837, 49.86398, 'Yusif Səfərov küçəsi', 'Yaşlı insanlar keçə bilmir.', 'Səki plitələri yerindən çıxıb, keçid hissəsində hündürlük fərqi yaranıb.'],
  ['Küçə lampası üç gündür yanmır', 'lighting', 'high', 'in_progress', 'Kamran Səfərov', 52, 91, 95, 40.37679, 49.86734, 'Ağ şəhər bulvarı', 'Axşamlar tam qaranlıqdır.', 'Sıradan çıxmış küçə lampası görünür. Gecə təhlükəsizliyi üçün risk yüksəkdir.'],
  ['Konteynerlər bir həftədir boşaldılmayıb', 'sanitation', 'high', 'approved', null, 20, 88, 60, 40.38059, 49.87195, 'Sabit Orucov küçəsi', 'İy gəlir, zibil küçəyə tökülüb.', 'Konteyner ətrafına dağılmış məişət tullantısı müəyyən edildi.'],
  ['Tikinti tullantıları piyada yolunu bağlayıb', 'sanitation', 'medium', 'pending', null, 8, 71, 220, 40.37334, 49.92773, 'Nobel prospekti', 'Söküntü qalıqları yolu bağlayıb.', 'Piyada yolunda söküntü qalıqları və iri tullantı yığını var.'],
  ['Qırılmış ağac yola düşmək üzrədir', 'greenery', 'critical', 'approved', null, 12, 94, 310, 40.38235, 49.87005, 'Xocalı prospekti', 'Külək vurub, kökündən laxlayıb.', 'Ağacın gövdəsi əyilib, kök hissəsi torpaqdan qalxıb. Yola düşmə riski var.'],
  ['Kanalizasiya daşıb, su küçəyə çıxıb', 'water', 'critical', 'pending', null, 3, 97, 880, 40.37287, 49.9353, 'Həzi Aslanov küçəsi', 'Pis iy yayılıb, su evlərə yaxınlaşır.', 'Kanalizasiya quyusundan daşma və yolda yığılmış çirkab su görünür.'],
  ['Su xətti zədəlidir, içməli su itir', 'water', 'high', 'proof', 'Səbuhi Rəhimov', 26, 90, 540, 40.36713, 49.95993, 'Gəncə prospekti', 'Yol kənarından fasiləsiz su axır.', 'Yol kənarında davamlı su axını görünür, ehtimal ki, boru zədəlidir.'],
  ['Avtobus dayanacağının damı uçub', 'facades', 'high', 'approved', null, 18, 87, 470, 40.36548, 49.94521, 'Nobel prospekti, dayanacaq', 'Yağışdan qorunmaq mümkün deyil.', 'Dayanacağın dam örtüyü zədələnib, bir hissəsi yerə düşüb.'],
  ['Yol nişanı əyilib, görünmür', 'roads', 'low', 'resolved', 'Tural Əliyev', 110, 70, 75, 40.38781, 49.8635, 'Yusif Səfərov küçəsi, kəsişmə', 'İndi düzəldilib, təşəkkürlər.', 'Yol nişanının dirəyi əyilib, nişan sürücülərə görünmür.'],
  ['Parkda skamyalar sınıb', 'parks', 'low', 'rejected', null, 80, 55, 0, 40.35611, 49.96162, 'Gəncə prospekti, park', 'Şəkil aydın deyil.', 'Şəkildə park avadanlığı görünür, zədə aydın seçilmir.'],
];

const HOUR = 3600_000;
const STEPS = ['pending', 'approved', 'in_progress', 'proof', 'resolved'];

const added = tx(() => {
  let n = 0;
  for (const [title, cat, severity, status, worker, hours, confidence, cost, lat, lng, address, note, explanation] of SAMPLES) {
    const created = Date.now() - hours * HOUR;
    const [category, department] = DEPT[cat];
    const id = createReport({
      title, explanation, category, categoryId: cat, severity, confidence, department, address, lat, lng,
      reporter: 'Nümunə vətəndaş', note, source: 'demo', costMax: cost || null, createdAt: created,
    });
    // Walk the case through each stage it has reached, a few hours apart.
    let at = created;
    let prev = 'pending';
    const path = status === 'rejected' ? ['rejected'] : STEPS.slice(1, STEPS.indexOf(status) + 1);
    for (const next of path) {
      at += Math.max(1, Math.round(hours / (path.length + 1))) * HOUR;
      const actor = next === 'in_progress' || next === 'proof' ? worker : 'Aysel Abbasova';
      addEvent(id, next === 'proof' ? 'proof' : 'status', { from: prev, to: next, actor, at });
      prev = next;
    }
    updateReport(id, {
      status,
      worker,
      resolvedBy: status === 'resolved' ? 'Aysel Abbasova' : null,
      resolvedAt: status === 'resolved' ? at : null,
    }, status === 'pending' ? created : at);
    n += 1;
  }
  return n;
});

console.log(`Added ${added} sample reports (source "demo", no photos).`);
