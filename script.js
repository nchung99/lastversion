const modal=document.querySelector('.modal');
const trailerBtn=document.querySelector('.trailer');
const modalVideo=modal.querySelector('video');
const modalClose=document.querySelector('.modal-close');
const heroTrailers=['assets/videos/trailer-1.mp4','assets/videos/trailer-2.mp4','assets/videos/trailer-3.mp4'];
trailerBtn.onclick=()=>{modalVideo.src=heroTrailers[heroCurrent];modalVideo.load();modal.classList.add('open')};
modalClose.onclick=()=>modal.classList.remove('open');
modal.onclick=e=>{if(e.target===modal)modal.classList.remove('open')};
document.querySelectorAll('nav a').forEach(a=>a.addEventListener('click',()=>{document.querySelectorAll('nav a').forEach(x=>x.classList.remove('active'));a.classList.add('active')}));

const heroSlide=document.querySelector('.hero-slide'),heroNumber=document.querySelector('.hero-index b'),heroProgress=document.querySelector('.hero-index i'),heroPrev=document.querySelector('.hero-arrow.left'),heroNext=document.querySelector('.hero-arrow.right');
const heroImages=['assets/images/hero/hero-1.webp','assets/images/hero/hero-2.webp','assets/images/hero/hero-3.webp'];let heroCurrent=0;
heroImages.forEach(src=>{const img=new Image();img.src=src});
function renderHero(index){heroCurrent=(index+heroImages.length)%heroImages.length;heroSlide.style.setProperty('--hero',`url('${heroImages[heroCurrent]}')`);heroNumber.textContent=String(heroCurrent+1).padStart(2,'0');heroProgress.style.background=`linear-gradient(90deg,#fff ${(heroCurrent+1)*33.333}%,#ffffff55 ${(heroCurrent+1)*33.333}%)`}
heroPrev.addEventListener('click',()=>window.renderHero(heroCurrent-1));heroNext.addEventListener('click',()=>window.renderHero(heroCurrent+1));

// ===== SyndFCO Support Chat - secured player side =====
const SUPABASE_URL='https://pmcxxstouaqpyfnfpcoo.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_jpQqkPqtD-oCXHtoK2ppng_41JYTa-L';
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const playerImageInput=document.getElementById('playerImageInput'),playerImagePick=document.getElementById('playerImagePick'),playerImagePreview=document.getElementById('playerImagePreview');
const supportModal=document.getElementById('supportModal'),openGiftChat=document.getElementById('openGiftChat'),chatFab=document.getElementById('chatFab'),closeSupport=document.getElementById('closeSupport'),playerForm=document.getElementById('playerForm'),chatScreen=document.getElementById('chatScreen'),messagesBox=document.getElementById('messages'),chatForm=document.getElementById('chatForm'),chatInput=document.getElementById('chatInput');
let playerConversationId=localStorage.getItem('syndfco_conversation_id'),playerData=null,playerMessages=[],channel=null,playerSelectedImages=[];
const imageUrlCache=new Map();
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function timeOf(v){const d=new Date(v);return `${d.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})} ${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}`}
async function getImageUrl(path){if(!path)return '';if(imageUrlCache.has(path))return imageUrlCache.get(path);const {data,error}=await db.storage.from('support-images').createSignedUrl(path,3600);if(error){console.error(error);return ''}imageUrlCache.set(path,data.signedUrl);return data.signedUrl}
async function hydrateImages(){const imgs=[...messagesBox.querySelectorAll('img[data-image-path]')];await Promise.all(imgs.map(async img=>{const url=await getImageUrl(img.dataset.imagePath);if(url)img.src=url}))}
function clearPlayerImage(){playerSelectedImages=[];playerImageInput.value='';playerImagePreview.classList.add('hidden');playerImagePreview.innerHTML=''}
function showPlayerImages(files){playerImagePreview.innerHTML=`<div class="preview-grid">${files.map((file,i)=>`<div class="preview-thumb"><img src="${URL.createObjectURL(file)}" alt="Ảnh ${i+1}"><button type="button" data-remove-image="${i}">×</button></div>`).join('')}</div><span>${files.length} ảnh đã chọn</span><button type="button" id="removePlayerImage">Xóa hết</button>`;playerImagePreview.classList.remove('hidden');playerImagePreview.querySelectorAll('[data-remove-image]').forEach(b=>b.onclick=()=>{playerSelectedImages.splice(Number(b.dataset.removeImage),1);playerImageInput.value='';playerSelectedImages.length?showPlayerImages(playerSelectedImages):clearPlayerImage()});document.getElementById('removePlayerImage').onclick=clearPlayerImage}
function imagePaths(value){if(!value)return[];try{const a=JSON.parse(value);if(Array.isArray(a))return a.filter(Boolean)}catch(e){}return [value]}
function imageGridHtml(value){const paths=imagePaths(value);if(!paths.length)return'';return `<div class="chat-image-grid count-${paths.length}">${paths.map(p=>`<img class="chat-image" data-image-path="${esc(p)}" alt="Ảnh gửi trong chat">`).join('')}</div>`}
async function compressChatImage(file){
  const MAX_SIDE=1600, QUALITY=.82, SKIP_SIZE=700*1024;
  const img=await new Promise((resolve,reject)=>{const el=new Image();const url=URL.createObjectURL(file);el.onload=()=>{URL.revokeObjectURL(url);resolve(el)};el.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Không đọc được ảnh'))};el.src=url});
  const longest=Math.max(img.naturalWidth,img.naturalHeight);
  if(file.size<=SKIP_SIZE&&longest<=MAX_SIDE)return file;
  const scale=Math.min(1,MAX_SIDE/longest),w=Math.max(1,Math.round(img.naturalWidth*scale)),h=Math.max(1,Math.round(img.naturalHeight*scale));
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;canvas.getContext('2d').drawImage(img,0,0,w,h);
  const type='image/webp';
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,type,QUALITY));
  if(!blob||blob.size>=file.size)return file;
  return new File([blob],file.name.replace(/\.[^.]+$/,'.webp'),{type,lastModified:Date.now()});
}
async function uploadChatImages(files,conversationId){
  if(!files.length)return[];
  const {data:{user},error:authError}=await db.auth.getUser();if(authError||!user)throw authError||new Error('Chưa đăng nhập');
  const optimized=await Promise.all(files.map(compressChatImage));
  return Promise.all(optimized.map(async file=>{const ext=(file.type.split('/')[1]||file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'');const path=`${user.id}/${conversationId}/${crypto.randomUUID()}.${ext}`;const {error}=await db.storage.from('support-images').upload(path,file,{contentType:file.type,upsert:false,cacheControl:'3600'});if(error)throw error;return path}));
}
function renderMessages(){let html='';if(playerData)html=`<div class="msg admin">Xin chào ${esc(playerData.player_name)}! Bạn cần hỗ trợ nhận Giftcode đúng không?<small>Support</small></div>`;html+=playerMessages.map(m=>`<div class="msg ${m.sender==='player'?'user':'admin'}">${imageGridHtml(m.image_path)}<span class="msg-content">${m.content==='[Hình ảnh]'?'':esc(m.content)}</span><small>${m.sender==='player'?'Bạn':'Support'} • ${timeOf(m.created_at)}</small></div>`).join('');messagesBox.innerHTML=html;hydrateImages();messagesBox.scrollTop=messagesBox.scrollHeight}
function setPlayerUI(){if(playerData){playerForm.style.display='none';chatScreen.classList.add('active');document.getElementById('chatStatus').textContent='Đang hỗ trợ • '+playerData.player_name;document.getElementById('playerInfo').innerHTML=`${esc(playerData.player_name)} • ID: ${esc(playerData.player_id)} • ${esc(playerData.server||'Chưa chọn server')} <button class="switch-player" id="switchPlayer">Đổi nhân vật</button>`;document.getElementById('switchPlayer').onclick=resetPlayerSession}else{playerForm.style.display='block';chatScreen.classList.remove('active');document.getElementById('chatStatus').textContent='Nhập thông tin để bắt đầu'}renderMessages()}
async function ensureAnonymousAuth(){const {data:{session}}=await db.auth.getSession();if(session)return session;const {data,error}=await db.auth.signInAnonymously();if(error)throw error;return data.session}
async function subscribePlayer(){if(channel){await db.removeChannel(channel);channel=null}if(!playerConversationId)return;channel=db.channel('player-'+playerConversationId).on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:`conversation_id=eq.${playerConversationId}`},payload=>{const m=payload.new;if(!playerMessages.some(x=>x.id===m.id)){playerMessages.push(m);renderMessages()}}).subscribe()}
async function loadPlayerConversation(){try{await ensureAnonymousAuth()}catch(e){console.error(e);alert('Chưa bật Anonymous Sign-ins trong Supabase. Xem file HUONG-DAN-SETUP.txt.');return}if(!playerConversationId){playerData=null;playerMessages=[];setPlayerUI();return}const {data:conv,error}=await db.from('conversations').select('*').eq('id',playerConversationId).maybeSingle();if(error||!conv){localStorage.removeItem('syndfco_conversation_id');playerConversationId=null;playerData=null;playerMessages=[];setPlayerUI();return}playerData=conv;const {data:msgs}=await db.from('messages').select('*').eq('conversation_id',playerConversationId).order('created_at',{ascending:true});playerMessages=msgs||[];setPlayerUI();await subscribePlayer()}
async function resetPlayerSession(){if(!confirm('Đổi sang nhân vật khác? Cuộc chat cũ vẫn được lưu ở Admin.'))return;await db.auth.signOut();localStorage.removeItem('syndfco_conversation_id');playerConversationId=null;playerData=null;playerMessages=[];if(channel){await db.removeChannel(channel);channel=null}await ensureAnonymousAuth();setPlayerUI()}
async function openChat(){supportModal.classList.add('open');await loadPlayerConversation()}
openGiftChat.onclick=openChat;chatFab.onclick=openChat;closeSupport.onclick=()=>supportModal.classList.remove('open');supportModal.onclick=e=>{if(e.target===supportModal)supportModal.classList.remove('open')};
document.getElementById('startChat').onclick=async()=>{const name=document.getElementById('playerName').value.trim(),id=document.getElementById('playerId').value.trim(),server=document.getElementById('playerServer').value.trim(),zalo=document.getElementById('playerZalo').value.trim();if(!name||!id){alert('Nhập Tên nhân vật và ID trước nhé.');return}const btn=document.getElementById('startChat');btn.disabled=true;btn.textContent='ĐANG KẾT NỐI...';try{await ensureAnonymousAuth();const {data:{user}}=await db.auth.getUser();const {data:conv,error}=await db.from('conversations').insert({player_user_id:user.id,player_name:name,player_id:id,server:server||'Chưa chọn server',zalo:zalo||'Chưa nhập'}).select().single();if(error)throw error;playerConversationId=conv.id;localStorage.setItem('syndfco_conversation_id',conv.id);playerData=conv;playerMessages=[];await subscribePlayer();setPlayerUI()}catch(error){console.error(error);alert('Chưa tạo được cuộc chat. Hãy chạy SQL bảo mật và bật Anonymous Sign-ins.')}finally{btn.disabled=false;btn.textContent='BẮT ĐẦU CHAT'}};
playerImagePick.onclick=()=>playerImageInput.click();playerImageInput.onchange=()=>{const files=[...playerImageInput.files].slice(0,3);if(!files.length)return;if(playerImageInput.files.length>3)alert('Mỗi lần gửi tối đa 3 ảnh.');if(files.some(file=>!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024)){alert('Mỗi ảnh chỉ nhận JPG, PNG, WebP tối đa 5MB.');clearPlayerImage();return}playerSelectedImages=files;showPlayerImages(files)};
chatForm.onsubmit=async e=>{e.preventDefault();const text=chatInput.value.trim();const files=[...playerSelectedImages];if((!text&&!files.length)||!playerConversationId)return;chatInput.value='';chatForm.querySelector('.send-btn').disabled=true;try{const paths=await uploadChatImages(files,playerConversationId);const image_path=paths.length?(paths.length===1?paths[0]:JSON.stringify(paths)):null;const {error}=await db.from('messages').insert({conversation_id:playerConversationId,sender:'player',content:text||'[Hình ảnh]',image_path});if(error)throw error;clearPlayerImage()}catch(error){console.error(error);alert('Gửi tin nhắn/ảnh thất bại.');chatInput.value=text}finally{chatForm.querySelector('.send-btn').disabled=false}};
loadPlayerConversation();


// Image lightbox
function openPlayerImageLightbox(src){if(!src)return;let box=document.getElementById('imageLightbox');if(!box){box=document.createElement('div');box.id='imageLightbox';box.className='image-lightbox';box.innerHTML='<button type="button" class="image-lightbox-close" aria-label="Đóng">×</button><img alt="Ảnh trong cuộc trò chuyện">';document.body.appendChild(box);box.addEventListener('click',e=>{if(e.target===box||e.target.classList.contains('image-lightbox-close'))box.classList.remove('open')})}box.querySelector('img').src=src;box.classList.add('open')}
messagesBox.addEventListener('click',e=>{const img=e.target.closest('.chat-image');if(img&&img.src)openPlayerImageLightbox(img.src)});
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.getElementById('imageLightbox')?.classList.remove('open')});

// ===== Tu Tien Vuc UI Upgrade =====
(() => {
  const loader=document.getElementById('siteLoader');
  const loaderStarted=performance.now();
  let loaderFinished=false;
  const finishLoad=()=>{if(loaderFinished)return;loaderFinished=true;document.body.classList.remove('is-loading');loader?.classList.add('hide');setTimeout(()=>loader?.remove(),550)};
  const finishAfterMinimum=()=>{const wait=Math.max(0,1500-(performance.now()-loaderStarted));setTimeout(finishLoad,wait)};
  if(document.readyState==='complete')finishAfterMinimum();else window.addEventListener('load',finishAfterMinimum,{once:true});
  setTimeout(finishLoad,4000);

  // Scroll reveal
  const revealTargets=[...document.querySelectorAll('.panel,.side-card,footer .footer-brand,footer>div:not(.copyright)')];
  revealTargets.forEach((el,i)=>{el.classList.add('reveal');if(i%4)el.classList.add(`reveal-delay-${Math.min(i%4,3)}`)});
  if('IntersectionObserver' in window){
    const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('reveal-in');io.unobserve(e.target)}}),{threshold:.12,rootMargin:'0px 0px -40px'});
    revealTargets.forEach(el=>io.observe(el));
  }else revealTargets.forEach(el=>el.classList.add('reveal-in'));

  // Lightweight image loading polish
  document.querySelectorAll('img').forEach(img=>{
    if(!img.complete)img.classList.add('img-loading');
    const ready=()=>{img.classList.remove('img-loading');img.classList.add('img-ready')};
    img.complete?ready():img.addEventListener('load',ready,{once:true});
  });

  // Rich hero copy + auto rotate, while keeping the existing trailer mapping.
  const heroContent=[
    {eyebrow:'THẦN MA // TU TIÊN VỰC',title:'THẾ GIỚI MỚI<br><em>ĐANG CHỜ BẠN</em>',desc:'Khám phá những tựa game hấp dẫn và bước vào hành trình phiêu lưu của riêng bạn.'},
    {eyebrow:'THIÊN CƠ // QUYỀN  ',title:'NHẬP MỘNG<br><em>PHÁ GIỚI HẠN</em>',desc:'Bước qua tiên cảnh, kết giao đồng đội và viết nên hành trình của riêng bạn.'},
    {eyebrow:'TÂN BINH // THỨC TỈNH ',title:'THẾ GIỚI DIỆU KỲ<br><em>PHIÊU LƯU NGAY</em>',desc:'Sẵn sàng chiến đấu, săn thưởng và khám phá những thử thách mới mỗi ngày.'}
  ];
  const copy=document.querySelector('.hero-copy');
  const oldRender=window.renderHero;
  if(copy && typeof renderHero==='function'){
    const baseRender=renderHero;
    window.renderHero=function(index){
      const slide=document.querySelector('.hero-slide');copy.classList.add('copy-swap');slide?.classList.add('hero-swap');
      setTimeout(()=>{baseRender(index);const c=heroContent[heroCurrent];copy.querySelector('.eyebrow').textContent=c.eyebrow;copy.querySelector('h1').innerHTML=c.title;copy.querySelector('p').textContent=c.desc;requestAnimationFrame(()=>{copy.classList.remove('copy-swap');slide?.classList.remove('hero-swap')})},180);
    };
    // existing listeners captured original renderHero; add auto-rotation through upgraded renderer
    let heroTimer=setInterval(()=>window.renderHero(heroCurrent+1),7000);
    document.querySelector('.hero')?.addEventListener('mouseenter',()=>clearInterval(heroTimer));
    document.querySelector('.hero')?.addEventListener('mouseleave',()=>{clearInterval(heroTimer);heroTimer=setInterval(()=>window.renderHero(heroCurrent+1),7000)});
  }

  // Featured event: whole banner opens one detail popup with 3 game actions
  const featuredEvent=document.getElementById('featuredEvent');
  const featuredModal=document.getElementById('featuredEventModal');
  const closeFeatured=()=>{featuredModal?.classList.remove('open');featuredModal?.setAttribute('aria-hidden','true')};
  const openFeatured=()=>{featuredModal?.classList.add('open');featuredModal?.setAttribute('aria-hidden','false')};
  featuredEvent?.addEventListener('click',openFeatured);
  featuredEvent?.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openFeatured()}});
  featuredModal?.querySelector('.featured-event-close')?.addEventListener('click',closeFeatured);
  featuredModal?.addEventListener('click',e=>{if(e.target===featuredModal)closeFeatured()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeFeatured()});

  // Game detail modal
  const gameModal=document.getElementById('gameDetailModal');
  const detailImg=document.getElementById('gameDetailImage'),detailTitle=document.getElementById('gameDetailTitle'),detailDesc=document.getElementById('gameDetailDesc'),detailSchedule=document.getElementById('gameDetailSchedule'),detailPlay=document.getElementById('gameDetailPlay');
  const gameDescriptions=[
    'Thần ma giao tranh, tiên lộ rộng mở. Khám phá thế giới nhập vai và đồng hành cùng cộng đồng Tu Tiên Vực.',
    'Một hành trình tiên hiệp giàu màu sắc với những vùng đất mới, hoạt động cộng đồng và thử thách liên server.',
    'Bắt đầu từ tân binh, thức tỉnh sức mạnh và từng bước chinh phục những cột mốc mới trong hành trình phiêu lưu.',
    'Một thế giới giang hồ huyền ảo từng đồng hành cùng cộng đồng Tu Tiên Vực. Tựa game hiện đã ngừng phát hành.'
  ];
  const closeGame=()=>{gameModal?.classList.remove('open');gameModal?.setAttribute('aria-hidden','true')};
  document.querySelectorAll('.game-grid article').forEach((card,i)=>{
    card.setAttribute('tabindex','0');card.setAttribute('role','button');
    const open=()=>{const img=card.querySelector('img'),title=card.querySelector('h3')?.textContent||'',schedule=card.querySelector('p')?.textContent||'',link=card.querySelector('a.round')?.href||'#';detailImg.src=img?.src||'';detailTitle.textContent=title;detailDesc.textContent=gameDescriptions[i]||'';detailSchedule.textContent=schedule;detailPlay.href=link;const stopped=/ngừng phát hành/i.test(schedule);detailPlay.style.display=stopped?'none':'';gameModal.classList.add('open');gameModal.setAttribute('aria-hidden','false')};
    card.addEventListener('click',e=>{if(e.target.closest('a.round'))return;open()});
    card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}});
  });
  gameModal?.querySelector('.game-detail-close')?.addEventListener('click',closeGame);document.getElementById('gameDetailBack')?.addEventListener('click',closeGame);gameModal?.addEventListener('click',e=>{if(e.target===gameModal)closeGame()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeGame()});
})();
