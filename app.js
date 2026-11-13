const STORE = { auth:'mahyar_auth', data:'mahyar_data_v2', notified:'mahyar_notified_v2', user:'mahyar_user_v1' };
// ورود همیشه با اطلاعات ثابت انجام می‌شود؛ وضعیت ورود قدیمی نادیده گرفته شود.
sessionStorage.removeItem(STORE.auth);
// حساب پیش‌فرض: اگه هنوز حسابی روی این مرورگر نیست، همین ساخته می‌شه.
const DEFAULT_USER = { username:'amiri', password:'FA' };
// چند روز مونده به موعد، سؤال «پریود شدی؟» نشون داده بشه
const PRE_DAYS = 3;
const $ = id => document.getElementById(id);
const ids = ['themeLabel','loginView','appView','loginForm','username','password','loginError','authTitle','authDescription','authSubmit','switchAuthBtn','authHint','logoutBtn','todayText','statusPill','mainTitle','mainDescription','dayValue','periodDayValue','nextValue','startDateInput','startTodayBtn','saveDateBtn','registerStatusText','nextDateInfo','suggestionBadge','suggestionIcon','suggestionTitle','suggestionText','periodLength','cycleLength','saveSettingsBtn','notificationStatus','enableNotificationsBtn','lateCard','lateTitle','lateText','periodStartedBtn','notYetBtn','historyList','clearHistoryBtn','clearAllBtn','toast'];
const els = Object.fromEntries(ids.map(id=>[id,$(id)]));
const THEME_STORE='periodme_theme_v1';
const themeState=()=>{try{return {...{mode:'light',color:'pink'},...JSON.parse(localStorage.getItem(THEME_STORE)||'{}')}}catch{return {mode:'light',color:'pink'}}};
function applyTheme(){
  const t=themeState();
  document.documentElement.dataset.theme=t.mode;
  document.documentElement.dataset.color=t.color;
  const light=$('lightModeBtn'),dark=$('darkModeBtn');
  if(light&&dark){light.classList.toggle('active',t.mode==='light');dark.classList.toggle('active',t.mode==='dark');}
  document.querySelectorAll('.color-dot').forEach(b=>b.classList.toggle('active',b.dataset.color===t.color));
  const toggle=$('themeToggle'); if(toggle){ toggle.setAttribute('aria-pressed',String(t.mode==='dark')); const label=$('themeLabel'); if(label) label.textContent=t.mode==='dark'?'تاریک':'روشن'; }
}
function saveTheme(patch){const t={...themeState(),...patch};localStorage.setItem(THEME_STORE,JSON.stringify(t));applyTheme();toast(t.mode==='dark'?'حالت تاریک فعال شد 🌙':'حالت روشن فعال شد ☀️');}

const defaultData = () => ({currentStart:null,nextPeriod:null,periodLength:7,cycleLength:28,history:[],lateDismissedDay:null});
function loadData(){try{return {...defaultData(),...JSON.parse(localStorage.getItem(STORE.data)||'{}')};}catch{return defaultData();}}
function saveData(d){localStorage.setItem(STORE.data,JSON.stringify(d));}
function localISO(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
function dateOnly(v){const [y,m,d]=v.split('-').map(Number);return new Date(y,m-1,d,12);}
function addDays(v,n){const d=dateOnly(v);d.setDate(d.getDate()+n);return localISO(d);}
function diffDays(a,b){return Math.round((dateOnly(a)-dateOnly(b))/86400000);}
function faDate(v){return v?dateOnly(v).toLocaleDateString('fa-IR',{year:'numeric',month:'long',day:'numeric'}):'—';}
function faNum(n){return Number(n).toLocaleString('fa-IR');}
function toast(msg){els.toast.textContent=msg;els.toast.classList.remove('hidden');clearTimeout(window.__toast);window.__toast=setTimeout(()=>els.toast.classList.add('hidden'),2600);}
function getUser(){try{return JSON.parse(localStorage.getItem(STORE.user)||'null');}catch{return null;}}
async function hashPassword(password){
  const data=new TextEncoder().encode(password);
  const hash=await crypto.subtle.digest('SHA-256',data);
  return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function ensureDefaultUser(){
  // فقط یک حساب هست: amiri / FA. اگه حساب قدیمی روی مرورگر مونده، با همین جایگزین می‌شه.
  const passwordHash=await hashPassword(DEFAULT_USER.password);
  const cur=getUser();
  if(!cur||cur.username!==DEFAULT_USER.username||cur.passwordHash!==passwordHash){
    localStorage.setItem(STORE.user,JSON.stringify({username:DEFAULT_USER.username,passwordHash}));
  }
}

/* ---------- اعلان‌ها (قبلاً تعریف نشده بودن و برنامه موقع رندر خطا می‌داد) ---------- */
function notify(title,body){
  try{
    if(!('Notification' in window)||Notification.permission!=='granted')return;
    new Notification(title,{body,lang:'fa',dir:'rtl',icon:'icon.svg'});
  }catch(e){console.warn(e);}
}
function notifyOnce(key,title,body){
  try{
    const sent=JSON.parse(localStorage.getItem(STORE.notified)||'{}');
    if(sent[key])return;
    sent[key]=1;
    localStorage.setItem(STORE.notified,JSON.stringify(sent));
    notify(title,body);
  }catch{}
}

/* ---------- متن‌های روزانه و هفتگی ---------- */
const PERIOD_DAY_TIPS=[
  {icon:'🫖',title:'روز اول، آروم باش',text:'امروز لازم نیست همه‌چی رو تموم کنی. یه نوشیدنی گرم، یه پتوی نرم و کمی استراحت کافیه. اگه درد داری، گرما روی شکمت کمک می‌کنه.'},
  {icon:'🍫',title:'روز دوم، به خودت شیرینی بده',text:'اگه حالت گرفته‌ست، یه تکه شکلات تلخ یا میوه‌ی خوش‌طعم بخور. آب یادت نره؛ اگه شد، یه دوش آب گرم بگیر.'},
  {icon:'🌤',title:'روز سوم، یه قدم کوچیک',text:'اگه حالت بهتر شده، یه پیاده‌روی ملایم یا کشش سبک عالیه. اگه نه، همون استراحت هم کار درستیه.'},
  {icon:'🥣',title:'روز چهارم، غذای مقوی',text:'عدس، تخم‌مرغ و سبزی‌های برگ‌دار بدنت رو کمک می‌کنن. یادت باشه بدنت داره کار سختی انجام می‌ده.'},
  {icon:'💤',title:'روز پنجم، خواب کافی',text:'خواب کم، حس خستگی و درد رو بیشتر می‌کنه. اگه می‌تونی زودتر بخواب و گوشی رو کنار بذار.'},
  {icon:'🌸',title:'روز ششم، داره تموم می‌شه',text:'به آخر این دوره نزدیک می‌شی. حتی اگه حالت خوب نیست، این هم می‌گذره؛ خودت رو سرزنش نکن.'},
  {icon:'🌷',title:'روز آخر، آفرین!',text:'این دوره هم تموم شد و تو با صبر و مراقبت ازش رد شدی. امروز هم یه کار خوب برای خودت انجام بده.'}
];
const WEEK_TIPS=[
  {icon:'🌿',title:'هفته‌ی اول، شروع آروم',text:'بدنت تازه از پریود بیرون اومده و داره آروم‌آروم جون می‌گیره. امروز یه صبحانه‌ی مقوی بخور و یه قدم کوچیک برای خودت بردار؛ لازم نیست عجله کنی.'},
  {icon:'☀️',title:'هفته‌ی دوم، انرژی برمی‌گرده',text:'معمولاً این هفته حال و حوصله و تمرکزت بیشتر می‌شه. کارهایی که فکر می‌خوان رو همین روزها انجام بده و آب و خواب رو هم کنار کارها نگه دار.'},
  {icon:'🌙',title:'هفته‌ی سوم، اوج آرامش',text:'اگه ایده یا پروژه‌ای داری، این هفته پیش‌رفتش راحت‌تره. یه دور کوتاه به خودت هم بزن: یه فیلم دوست‌داشتنی، یا یه قدم بیرون با آدمی که دوستش داری.'},
  {icon:'🍂',title:'ادامه‌ی چرخه، با مهربونی',text:'ممکنه کمی حساس‌تر، خسته‌تر یا گرسنه‌تر بشی؛ این طبیعیه. کم‌کردن کافئین و خواب منظم کمک می‌کنه و خودت رو با دل‌رحمی ببین.'}
];
function suggestionFor(cycleDay,periodLength){
  if(!cycleDay||cycleDay<1)return{badge:'روز خاص',icon:'🌸',title:'یه روز آروم برای خودت بساز',text:'تاریخ شروع پریودت رو ثبت کن تا راهنمای همون روز و هفته رو ببینی.'};
  if(cycleDay<=periodLength){
    const t=PERIOD_DAY_TIPS[Math.min(cycleDay,PERIOD_DAY_TIPS.length)-1];
    return{badge:`روز ${faNum(cycleDay)} پریود`,icon:t.icon,title:t.title,text:t.text};
  }
  const week=Math.min(Math.floor((cycleDay-1)/7),WEEK_TIPS.length-1);
  const t=WEEK_TIPS[week];
  return{badge:`هفته ${faNum(week+1)} چرخه`,icon:t.icon,title:t.title,text:t.text};
}

/* ---------- جلوه‌ها ---------- */
function nopePop(){
  const el=document.createElement('div');
  el.className='nope-pop';
  el.textContent='نههههههه 😭';
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),1800);
}
function celebrate(){ if(typeof window.celebrateStars==='function') window.celebrateStars(); }

function lateLabel(daysLate){if(daysLate===null||daysLate===undefined)return'';if(daysLate===0)return'درست سر موعد ثبت‌شده';if(daysLate>0)return`${faNum(daysLate)} روز دیرتر از موعد`;return`${faNum(Math.abs(daysLate))} روز زودتر از موعد`;}
function setPeriodStart(value){if(!value)return toast('اول یه تاریخ انتخاب کن 🌷');if(diffDays(value,localISO())>0)return toast('تاریخ شروع نمی‌تونه آینده باشه.');const d=loadData();const expected=d.nextPeriod||null;const daysLate=expected?diffDays(value,expected):null;if(!d.history.some(x=>x.start===value))d.history.unshift({start:value,expected,daysLate,loggedAt:new Date().toISOString()});d.currentStart=value;d.lateDismissedDay=null;d.nextPeriod=addDays(value,d.cycleLength);saveData(d);toast(daysLate===null?'شروع پریود ثبت شد 💗':`ثبت شد؛ ${lateLabel(daysLate)} 💗`);render();}
function updateSuggestion(s){els.suggestionBadge.textContent=s.badge;els.suggestionIcon.textContent=s.icon;els.suggestionTitle.textContent=s.title;els.suggestionText.textContent=s.text;}
function updateAuthMode(){
  if(els.authTitle) els.authTitle.textContent='خوش اومدی 💗';
  if(els.authDescription) els.authDescription.textContent='با نام کاربری و رمز عبور وارد شو.';
  if(els.authSubmit) els.authSubmit.textContent='ورود به پریود من ✨';
  if(els.password) els.password.autocomplete='current-password';
  if(els.authHint) els.authHint.textContent='';
}

function render(){
  const authed=sessionStorage.getItem(STORE.auth)==='1';
  els.loginView.classList.toggle('hidden',authed);
  els.appView.classList.toggle('hidden',!authed);
  if(!authed)return;
  const d=loadData(),today=localISO();
  els.todayText.textContent=`امروز ${new Date().toLocaleDateString('fa-IR',{weekday:'long',month:'long',day:'numeric'})}`;
  els.startDateInput.value=d.currentStart||today;
  els.periodLength.value=d.periodLength;
  els.cycleLength.value=d.cycleLength;

  let cycleDay=0,periodDay=0,nextStart=d.nextPeriod||null,daysToNext=null;
  if(d.currentStart){
    cycleDay=diffDays(today,d.currentStart)+1;
    periodDay=cycleDay>=1&&cycleDay<=d.periodLength?cycleDay:0;
    if(!nextStart)nextStart=addDays(d.currentStart,d.cycleLength);
    daysToNext=diffDays(nextStart,today);
    els.dayValue.textContent=cycleDay>0?faNum(cycleDay):'—';
    els.periodDayValue.textContent=periodDay?faNum(periodDay):'تمام';
    els.nextValue.textContent=daysToNext>0?`${faNum(daysToNext)} روز`:daysToNext===0?'امروز':`${faNum(Math.abs(daysToNext))} روز دیر`;
    const end=addDays(d.currentStart,d.periodLength-1);
    if(cycleDay>=1&&cycleDay<=d.periodLength){
      els.statusPill.textContent=`روز ${faNum(cycleDay)} پریود`;
      els.mainTitle.textContent=`امروز روز ${faNum(cycleDay)} ـه 🌷`;
      els.mainDescription.textContent=`شروع: ${faDate(d.currentStart)} • پایان تقریبی: ${faDate(end)}`;
    }else if(daysToNext>0){
      els.statusPill.textContent='پریود این دوره تموم شده 🌸';
      els.mainTitle.textContent=`روز ${faNum(cycleDay)} چرخه`;
      els.mainDescription.textContent=`تاریخ محاسبه‌شده پریود بعدی: ${faDate(nextStart)}`;
    }else{
      els.statusPill.textContent=daysToNext===0?'امروز موعدشه 👀':'از موعد گذشته';
      els.mainTitle.textContent=daysToNext===0?'پریود شدی؟ 🌷':`حدود ${faNum(Math.abs(daysToNext))} روز عقب افتاده`;
      els.mainDescription.textContent='این فقط یک یادآوریه؛ چرخه ممکنه جلو یا عقب بشه.';
    }
    if(cycleDay===d.periodLength+1)notifyOnce(`ended_${end}`,'پریود من 🌷','۷ روز ثبت‌شده تموم شد. اگر هنوز پریود ادامه داره، مدت پریود رو در تنظیمات تغییر بده.');
    if(daysToNext<=0)notifyOnce(`due_${nextStart}`,'پریود من 👀','زمان پریود بعدی رسیده. پریود شدی؟');
  }else{
    els.statusPill.textContent='هنوز شروع ثبت نشده';
    els.mainTitle.textContent='اولین روز رو با هم ثبت کنیم؟ 🌸';
    els.mainDescription.textContent='تاریخ شروع پریود رو وارد کن تا شمارش و راهنمای روزانه فعال بشه.';
    els.dayValue.textContent=els.periodDayValue.textContent=els.nextValue.textContent='—';
    els.registerStatusText.textContent='هنوز تاریخ شروعی ثبت نکردی 🌸';
  }

  // سؤال «پریود شدی؟» از چند روز قبل از موعد نشون داده می‌شه و اگه روز موعد رد شده باشه، همچنان می‌پرسه
  const showLate=!!d.currentStart&&daysToNext!==null&&daysToNext<=PRE_DAYS&&d.lateDismissedDay!==today;
  els.lateCard.classList.toggle('hidden',!showLate);
  if(showLate){
    if(daysToNext>0){
      els.lateTitle.textContent='پریود شدی؟ 👀';
      els.lateText.textContent=`حدود ${faNum(daysToNext)} روز دیگه موعد پریودته. اگه زودتر شروع شد، همین الان بزن که تاریخ و شمارش درست بشه.`;
    }else if(daysToNext===0){
      els.lateTitle.textContent='امروز موعدشه، پریود شدی؟ 🌷';
      els.lateText.textContent='اگه شروع شده، «اله اله، شروع شد» رو بزن تا تاریخ جدید و میزان تأخیر خودکار ثبت بشه.';
    }else{
      els.lateTitle.textContent='اِه، تایمشم رد شد... نشدی خانومی؟ 😭';
      els.lateText.textContent=`حدود ${faNum(Math.abs(daysToNext))} روز از موعد گذشته. چند روز جابه‌جایی طبیعیه؛ اگه شروع شده، ثبتش کن. اگه تأخیر طولانی یا نگرانی داری، با پزشک صحبت کن.`;
    }
  }

  if(window.setStarMode)window.setStarMode(periodDay>0);
  updateSuggestion(suggestionFor(d.currentStart?cycleDay:0,d.periodLength));
  els.nextDateInfo.textContent=d.nextPeriod?`تاریخ محاسبه‌شده: ${faDate(d.nextPeriod)}${daysToNext!==null?(daysToNext>0?` • ${faNum(daysToNext)} روز مونده`:daysToNext===0?' • امروزه':` • ${faNum(Math.abs(daysToNext))} روز از موعد گذشته`):''}`:'هنوز تاریخ شروعی ثبت نکردی تا موعد بعدی محاسبه بشه.';
  if(!('Notification'in window))els.notificationStatus.textContent='این مرورگر اعلان وب رو پشتیبانی نمی‌کنه.';
  else if(Notification.permission==='granted')els.notificationStatus.textContent='اعلان‌ها فعاله 🔔';
  else if(Notification.permission==='denied')els.notificationStatus.textContent='اعلان‌ها از طرف مرورگر مسدوده.';
  else els.notificationStatus.textContent='اگه اعلان رو روشن کنی، پریود من موقع رسیدن تاریخ‌ها بهت یادآوری می‌کنه.';
  els.historyList.innerHTML=d.history.length?d.history.slice(0,12).map((x,i)=>`<div class="history-item"><div><b>چرخه ${faNum(d.history.length-i)}</b><small>روز ثبت: ${faDate(x.start)}${x.daysLate!==undefined&&x.daysLate!==null?' • '+lateLabel(x.daysLate):''}</small></div><span>${faDate(x.start)}</span></div>`).join(''):'<div class="empty">هنوز سابقه‌ای نداری 🌸</div>';
}

$('themeToggle')?.addEventListener('click',()=>{const t=themeState();saveTheme({mode:t.mode==='dark'?'light':'dark'});});
$('lightModeBtn')?.addEventListener('click',()=>saveTheme({mode:'light'}));
$('darkModeBtn')?.addEventListener('click',()=>saveTheme({mode:'dark'}));
document.querySelectorAll('.color-dot').forEach(b=>b.addEventListener('click',()=>saveTheme({color:b.dataset.color})));
applyTheme();

els.loginForm.addEventListener('submit',async e=>{
  e.preventDefault();
  const username=els.username.value.trim();
  const password=els.password.value;
  els.loginError.classList.add('hidden');
  const hash=await hashPassword(password);
  if(username===DEFAULT_USER.username&&hash===await hashPassword(DEFAULT_USER.password)){
    sessionStorage.setItem(STORE.auth,'1');
    els.username.value='';els.password.value='';
    render();
  }else{
    els.loginError.textContent='نام کاربری یا رمز عبور درست نیست.';
    els.loginError.classList.remove('hidden');
  }
});
els.logoutBtn.onclick=()=>{sessionStorage.removeItem(STORE.auth);updateAuthMode();render();};
els.startTodayBtn.onclick=()=>setPeriodStart(localISO());
els.saveDateBtn.onclick=()=>setPeriodStart(els.startDateInput.value);
els.saveSettingsBtn.onclick=()=>{const p=Number(els.periodLength.value),c=Number(els.cycleLength.value);if(p<1||p>10||c<20||c>45)return toast('مقدار واردشده معتبر نیست.');const d=loadData();d.periodLength=p;d.cycleLength=c;if(d.currentStart)d.nextPeriod=addDays(d.currentStart,c);saveData(d);toast('تنظیمات ذخیره شد ⚙️');render();};
els.enableNotificationsBtn.onclick=async()=>{if(!('Notification'in window))return toast('این مرورگر اعلان وب رو پشتیبانی نمی‌کنه.');const p=await Notification.requestPermission();if(p==='granted'){notify('پریود من 🌷','اعلان‌ها فعال شدن. حواسمون به تاریخ‌ها هست!');toast('اعلان‌ها فعال شد 🔔');}else toast('اجازه اعلان داده نشد.');render();};

// «اله اله، شروع شد» → ستاره‌بازی + پس‌زمینه مشکی + باران ستاره، بعد ثبت تاریخ
els.periodStartedBtn.onclick=()=>{celebrate();setPeriodStart(localISO());};
// «نه، هنوز نه» → «نههههه» و سؤال امروز پنهان می‌شه؛ فردا دوباره می‌پرسه
els.notYetBtn.onclick=()=>{const d=loadData();d.lateDismissedDay=localISO();saveData(d);nopePop();toast('باشه، فردا دوباره می‌پرسم 🌙');render();};
els.clearHistoryBtn.onclick=()=>{if(!confirm('سوابق چرخه‌ها پاک بشه؟'))return;const d=loadData();d.history=[];saveData(d);toast('سوابق پاک شد.');render();};
els.clearAllBtn.onclick=()=>{if(!confirm('همه اطلاعات پریود من از این مرورگر پاک بشه؟'))return;localStorage.removeItem(STORE.data);localStorage.removeItem(STORE.notified);localStorage.removeItem(STORE.user);sessionStorage.removeItem(STORE.auth);updateAuthMode();toast('همه داده‌ها پاک شد.');render();};
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
ensureDefaultUser().catch(()=>{}).finally(()=>{updateAuthMode();render();});

// Firebase Push: when configured, use the existing notification button for real push setup.
if (els.enableNotificationsBtn) {
  els.enableNotificationsBtn.addEventListener('click', async () => {
    if (typeof window.enableFirebasePush !== 'function') return;
    try {
      await window.enableFirebasePush();
      toast('اعلان‌های واقعی روی این دستگاه فعال شد 🔔');
      render();
    } catch (e) {
      console.warn(e);
      toast('فعال‌سازی اعلان‌ها انجام نشد؛ اجازه اعلان و تنظیمات Firebase را بررسی کن.');
    }
  });
}
