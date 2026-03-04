const API ='/api';
const rs = v =>`Rs ${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

class BookStore {
 constructor() {
 this.currentUser = null;
 this.cart = [];
 this.wishlist = [];
 this.books = [];
 this.activeFilter ='All';
 this.filtered = [];
 this.currentPage ='';
 this._toastT = null;
 this.previousPage ='home';
 this.CATS = ["All","Fiction","Non-Fiction","Self-Help","Technology","Science Fiction"];
 this.init();
 }

 async init() {
 this.initLoader();
 this.initStars();
 this.initCursor();
 this.initNav();
 this.initSearch();
 this.initEvents();
 this.renderChips();

 await this.restoreSession();
 await this.fetchBooks();
 this.renderHeroStack();
 this.renderAuthBooks();
 this.renderBooks();
 this.updateCartCount();
 this.updateAuthUI();

 if (this.currentUser) {
 await this.syncCartFromServer();
 await this.fetchWishlist();
 }

 this.showPage(this.currentUser ?'home' :'auth', true);
 const urlParams=new URLSearchParams(window.location.search);
 if(urlParams.get('unauthorized')==='1'){
 window.history.replaceState({},'','/');
 setTimeout(()=>{
 this.showPage('auth',true);
 setTimeout(()=>{
 const adminBtn=document.querySelector('.at-btn[data-tab="admin"]');
 if(adminBtn) adminBtn.click();
 const errEl=document.getElementById('adminLoginErr');
 if(errEl) errEl.textContent='Access denied. Admin privileges required to view that page.';
 },100);
 },200);
 }
 }

 async apiFetch(url, opts = {}) {
 const res = await fetch(API + url, {
 credentials:'include',
 headers: {'Content-Type':'application/json',...opts.headers },
...opts
 });
 return res.json();
 }

 async restoreSession() {
 try {
 const data = await this.apiFetch('/auth/me');
 this.currentUser = data.user || null;
 } catch {
 this.currentUser = null;
 }
 }

 async fetchBooks(params = {}) {
 try {
 const q = new URLSearchParams(params).toString();
 const data = await this.apiFetch('/books' + (q ?'?' + q :''));
 this.books = (data.books || []).map(b => ({
 id: b.id,
 title: b.title,
 author: b.author,
 price: parseFloat(b.price),
 orig: parseFloat(b.original_price),
 cat: b.category,
 rating: parseFloat(b.rating),
 cover: b.cover_url,
 description: b.description,
 pages: b.pages,
 publisher: b.publisher,
 year: b.year,
 stock: b.stock
 }));
 this.filtered = [...this.books];
 } catch (e) {
 console.error('fetchBooks error:', e);
 }
 }

 async syncCartFromServer() {
 try {
 const data = await this.apiFetch('/cart');
 this.cart = (data.items || []).map(i => ({
 bookId: i.book_id,
 quantity: i.quantity,
 book: {
 id: i.book_id, title: i.title, author: i.author,
 price: parseFloat(i.price), orig: parseFloat(i.original_price),
 cover: i.cover_url, cat: i.category
 }
 }));
 this.updateCartCount();
 } catch (e) { console.error('cart sync error:', e); }
 }

 async fetchWishlist() {
 try {
 const data = await this.apiFetch('/wishlist');
 this.wishlist = (data.items || []).map(i => i.book_id);
 this.updateWishlistCount();
 } catch {}
 }

 initLoader() {
 const canvas = document.getElementById('loaderCanvas');
 if (!canvas) return;
 const ctx = canvas.getContext('2d');
 canvas.width = window.innerWidth;
 canvas.height = window.innerHeight;
 const rings = Array.from({length:6}, (_,i) => ({r:60+i*50,alpha:0.03+i*0.02,speed:0.001+i*0.0005,angle:0}));
 const particles = Array.from({length:80}, () => ({x:Math.random()*canvas.width,y:Math.random()*canvas.height,size:Math.random()*2+0.5,alpha:Math.random()*0.3,speed:Math.random()*0.3+0.1}));
 const cx=canvas.width/2, cy=canvas.height/2;
 let pct=0;
 const bar=document.getElementById('loaderFill'), pctEl=document.getElementById('loaderPct');
 let animId;
 const draw=()=>{
 ctx.clearRect(0,0,canvas.width,canvas.height);
 rings.forEach(r=>{r.angle+=r.speed;ctx.beginPath();ctx.arc(cx,cy,r.r,0,Math.PI*2);ctx.strokeStyle=`rgba(201,147,58,${r.alpha})`;ctx.lineWidth=1;ctx.stroke();ctx.beginPath();ctx.arc(cx+Math.cos(r.angle)*r.r,cy+Math.sin(r.angle)*r.r,2,0,Math.PI*2);ctx.fillStyle=`rgba(232,176,90,0.6)`;ctx.fill();});
 particles.forEach(p=>{p.y-=p.speed;if(p.y<0){p.y=canvas.height;p.x=Math.random()*canvas.width;}ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fillStyle=`rgba(201,147,58,${p.alpha})`;ctx.fill();});
 animId=requestAnimationFrame(draw);
 };
 draw();
 const interval=setInterval(()=>{pct=Math.min(pct+Math.random()*12+3,100);if(bar)bar.style.width=pct+'%';if(pctEl)pctEl.textContent=Math.floor(pct);if(pct>=100){clearInterval(interval);cancelAnimationFrame(animId);setTimeout(()=>{document.getElementById('loader').classList.add('out');},400);}},60);
 }

 initStars() {
 const canvas=document.getElementById('stars'); if(!canvas)return;
 const ctx=canvas.getContext('2d');
 const resize=()=>{canvas.width=window.innerWidth;canvas.height=window.innerHeight;};
 resize(); window.addEventListener('resize',resize);
 const stars=Array.from({length:200},()=>({x:Math.random()*canvas.width,y:Math.random()*canvas.height,r:Math.random()*1.5+0.2,alpha:Math.random()*0.5+0.1,pulse:Math.random()*Math.PI*2,speed:Math.random()*0.005+0.001}));
 const drawStars=()=>{ctx.clearRect(0,0,canvas.width,canvas.height);stars.forEach(s=>{s.pulse+=s.speed;const a=s.alpha*(0.6+0.4*Math.sin(s.pulse));ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fillStyle=`rgba(201,147,58,${a})`;ctx.fill();});requestAnimationFrame(drawStars);};
 drawStars();
 }

 initCursor() {
 const ring=document.getElementById('cRing'), dot=document.getElementById('cDot'); if(!ring||!dot)return;
 let mx=0,my=0,rx=0,ry=0;
 document.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;});
 const tick=()=>{rx+=(mx-rx)*0.1;ry+=(my-ry)*0.1;ring.style.left=rx+'px';ring.style.top=ry+'px';dot.style.left=mx+'px';dot.style.top=my+'px';requestAnimationFrame(tick);};
 tick();
 document.addEventListener('mousedown',()=>ring.classList.add('clicking'));
 document.addEventListener('mouseup',()=>ring.classList.remove('clicking'));
 document.addEventListener('mouseover',e=>{const t=e.target.closest('a,button,.book-card,.chip');ring.classList.toggle('hovered',!!t);});
 }

 initNav() {
 const nav=document.getElementById('nav'); if(!nav)return;
 window.addEventListener('scroll',()=>nav.classList.toggle('scrolled',window.scrollY>40),{passive:true});
 }

 initSearch() {
 const toggle=document.getElementById('searchToggle'), ov=document.getElementById('searchOv'), close=document.getElementById('searchClose'), input=document.getElementById('searchInput'), liveEl=document.getElementById('searchLive');
 if(!toggle||!ov)return;
 toggle.addEventListener('click',()=>{
 if(!this.currentUser){this.showToast('Please sign in to search books.','error');return;}
 ov.classList.add('open');setTimeout(()=>input?.focus(),200);
 });
 close.addEventListener('click',()=>ov.classList.remove('open'));
 document.addEventListener('keydown',e=>{if(e.key==='Escape')ov.classList.remove('open');});
 let searchTimer;
 input.addEventListener('input',()=>{
 clearTimeout(searchTimer);
 const q=input.value.toLowerCase().trim();
 if(!q){liveEl.innerHTML='';return;}
 searchTimer=setTimeout(async()=>{
 const res=this.books.filter(b=>b.title.toLowerCase().includes(q)||b.author.toLowerCase().includes(q)).slice(0,6);
 liveEl.innerHTML=res.length?res.map(b=>`<div class="sl-item" data-id="${b.id}"><img src="${b.cover}" onerror="this.src='https://via.placeholder.com/36x48/111118/c9933a?text=?'"><div><div class="sl-title">${b.title}</div><div class="sl-author">${b.author}</div></div><div class="sl-price">${rs(b.price)}</div></div>`).join('')
 :'<p style="padding:20px;color:var(--muted)">No books found</p>';
 liveEl.querySelectorAll('.sl-item').forEach(el=>{
 el.addEventListener('click',()=>{ov.classList.remove('open');input.value='';liveEl.innerHTML='';this.showBookDetail(parseInt(el.dataset.id));});
 });
 },300);
 });
 }

 initEvents() {
 document.querySelectorAll('[data-page]').forEach(el=>{
 el.addEventListener('click',e=>{e.preventDefault();this.showPage(el.dataset.page);});
 });

 document.querySelectorAll('.mnb-item[data-page]').forEach(el=>{
 el.addEventListener('click',()=>this.showPage(el.dataset.page));
 });

 document.getElementById('loginForm')?.addEventListener('submit',e=>this.handleLogin(e));
 document.getElementById('adminLoginForm')?.addEventListener('submit',e=>this.handleAdminLogin(e));
 document.getElementById('editProfileForm')?.addEventListener('submit',e=>this.handleProfileUpdate(e));
 document.getElementById('regStep1Btn')?.addEventListener('click',()=>this.regSendOTP());
 document.getElementById('regStep2Btn')?.addEventListener('click',()=>this.regVerifyOTP());
 document.getElementById('regStep3Btn')?.addEventListener('click',()=>this.regSetPassword());
 document.getElementById('regResendBtn')?.addEventListener('click',()=>this.regSendOTP(true));
 document.getElementById('forgotLink')?.addEventListener('click',e=>{e.preventDefault();this.showForgot();});
 document.getElementById('forgotBackBtn')?.addEventListener('click',()=>this.hideForgot());
 document.getElementById('fgtStep1Btn')?.addEventListener('click',()=>this.fgtSendOTP());
 document.getElementById('fgtStep2Btn')?.addEventListener('click',()=>this.fgtVerifyOTP());
 document.getElementById('fgtStep3Btn')?.addEventListener('click',()=>this.fgtReset());

 document.querySelectorAll('.at-btn').forEach(btn=>{
 btn.addEventListener('click',()=>{
 document.querySelectorAll('.at-btn').forEach(b=>b.classList.remove('active'));
 document.querySelectorAll('.af').forEach(f=>{f.classList.remove('active');f.style.display='none';});
 btn.classList.add('active');
 const ind=document.getElementById('atIndicator');
 if(btn.dataset.tab==='login'){
 document.getElementById('loginForm').classList.add('active');
 document.getElementById('loginForm').style.display='flex';
 if(ind) ind.className='at-indicator';
 } else if(btn.dataset.tab==='register'){
 document.getElementById('registerForm').classList.add('active');
 document.getElementById('registerForm').style.display='flex';
 if(ind) ind.className='at-indicator mid';
 } else if(btn.dataset.tab==='admin'){
 document.getElementById('adminLoginForm').classList.add('active');
 document.getElementById('adminLoginForm').style.display='flex';
 if(ind) ind.className='at-indicator right';
 }
 document.getElementById('forgotFlow')?.classList.add('hidden');
 });
 });
 document.getElementById('fgtResendBtn')?.addEventListener('click',()=>this.fgtSendOTP());
 document.getElementById('regStep1Btn')?.addEventListener('click',()=>{
 const emailEl=document.getElementById('regEmailDisplay');
 if(emailEl) emailEl.textContent=document.getElementById('regEmail').value.trim();
 },{capture:false});

 document.querySelectorAll('.ptab').forEach(btn=>{
 btn.addEventListener('click',()=>{
 document.querySelectorAll('.ptab').forEach(b=>b.classList.remove('active'));
 document.querySelectorAll('.ptab-content').forEach(c=>c.classList.remove('active'));
 btn.classList.add('active');
 document.getElementById('ptab'+btn.dataset.ptab.charAt(0).toUpperCase()+btn.dataset.ptab.slice(1))?.classList.add('active');
 if(btn.dataset.ptab==='reviews') this.renderMyReviews();
 });
 });

 document.getElementById('cartItems')?.addEventListener('click',e=>{
 const btn=e.target.closest('.qty-btn');
 const rem=e.target.closest('.cic-remove');
 if(btn){
 const id=parseInt(btn.dataset.id), act=btn.dataset.action;
 const item=this.cart.find(i=>i.bookId===id);
 if(item) this.updateQty(id, act==='inc'?item.quantity+1:item.quantity-1);
 }
 if(rem) this.removeFromCart(parseInt(rem.dataset.id));
 });

 document.getElementById('booksGrid')?.addEventListener('click',e=>{
 const cartBtn=e.target.closest('.btn-add-cart');
 const wishBtn=e.target.closest('.btn-wishlist');
 const card=e.target.closest('.book-card');
 if(cartBtn){e.stopPropagation();this.addToCart(parseInt(cartBtn.dataset.id));}
 else if(wishBtn){e.stopPropagation();this.toggleWishlist(parseInt(wishBtn.dataset.id),wishBtn);}
 else if(card&&card.dataset.id){this.showBookDetail(parseInt(card.dataset.id));}
 });

 document.getElementById('wishlistGrid')?.addEventListener('click',e=>{
 const cartBtn=e.target.closest('.btn-add-cart');
 const rem=e.target.closest('.btn-wishlist-remove');
 if(cartBtn) this.addToCart(parseInt(cartBtn.dataset.id));
 else if(rem) this.toggleWishlist(parseInt(rem.dataset.id),rem);
 });

 document.getElementById('bookDetailContent')?.addEventListener('click',e=>{
 const cartBtn=e.target.closest('.btn-add-cart');
 const wishBtn=e.target.closest('.btn-wishlist');
 if(cartBtn) this.addToCart(parseInt(cartBtn.dataset.id));
 if(wishBtn) this.toggleWishlist(parseInt(wishBtn.dataset.id),wishBtn);
 });

 document.getElementById('backBtn')?.addEventListener('click',()=>this.showPage(this.previousPage));

 document.getElementById('checkoutBtn')?.addEventListener('click',()=>this.proceedToCheckout());
 document.getElementById('checkoutForm')?.addEventListener('submit',e=>this.handleCheckout(e));
 document.getElementById('scrollToCat')?.addEventListener('click',()=>document.getElementById('catSection')?.scrollIntoView({behavior:'smooth'}));
 document.getElementById('sortFilter')?.addEventListener('change',e=>{this.applyFilters(null,e.target.value);});
 document.getElementById('logoutBtn')?.addEventListener('click',()=>this.handleLogout());
 document.getElementById('logoutBtnProfile')?.addEventListener('click',()=>this.handleLogout());
 document.getElementById('editProfileBtn')?.addEventListener('click',()=>{
 document.querySelectorAll('.ptab').forEach(b=>b.classList.remove('active'));
 document.querySelectorAll('.ptab-content').forEach(c=>c.classList.remove('active'));
 document.querySelector('[data-ptab="edit"]')?.classList.add('active');
 document.getElementById('ptabEdit')?.classList.add('active');
 });
 document.getElementById('toastClose')?.addEventListener('click',()=>this.hideToast());

 document.querySelectorAll('input[name="payMethod"]').forEach(r=>{
 r.addEventListener('change',()=>{
 document.getElementById('cardFields')?.classList.toggle('hidden',r.value!=='card');
 document.getElementById('upiFields')?.classList.toggle('hidden',r.value!=='upi');
 });
 });
 }

 showPage(page, skipTransition=false) {
 document.querySelectorAll('.mnb-item').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
 if(page!=='bookDetail') this.previousPage=this.currentPage||'home';
 if(page==='profile'&&!this.currentUser){this.showToast('Please sign in to access your profile.','error');this.showPage('auth');return;}
 if(page==='wishlist'&&!this.currentUser){this.showToast('Please sign in to view your wishlist.','error');this.showPage('auth');return;}
 if(page==='checkout'&&!this.currentUser){this.showToast('Please sign in to proceed to checkout.','error');this.showPage('auth');return;}
 if(page==='home'&&!this.currentUser){this.showToast('Please sign in to view books.','error');this.showPage('auth');return;}
 if(page==='cart'&&!this.currentUser){this.showToast('Please sign in to view your cart.','error');this.showPage('auth');return;}
 if(page==='bookDetail'&&!this.currentUser){this.showToast('Please sign in to view book details.','error');this.showPage('auth');return;}

 const wipe=document.getElementById('wipe');
 const doShow=()=>{
 document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
 const target=document.getElementById(page+'Page');
 if(target){target.classList.add('active');window.scrollTo(0,0);}
 this.currentPage=page;

 if(page==='cart') this.renderCart();
 if(page==='checkout') this.renderOrderSummary();
 if(page==='profile') this.renderProfile();
 if(page==='wishlist') this.renderWishlist();
 };

 if(skipTransition){doShow();return;}
 if(wipe){
 wipe.classList.add('active');
 setTimeout(()=>{doShow();wipe.classList.remove('active');},450);
 } else doShow();
 }

 async handleLogin(e) {
 e.preventDefault();
 const email=document.getElementById('loginEmail').value;
 const password=document.getElementById('loginPassword').value;
 const btn=document.querySelector('#loginForm .btn-submit');
 btn.disabled=true; btn.querySelector('span').textContent='Signing in…';
 try {
 const data=await this.apiFetch('/auth/login',{method:'POST',body:JSON.stringify({email,password})});
 if(data.error){this.showToast(data.error,'error');return;}
 if(data.user.role==='admin'){this.showToast('Admin accounts must use the Admin tab.','error');return;}
 this.currentUser=data.user;
 this.updateAuthUI();
 await this.syncCartFromServer();
 await this.fetchWishlist();
 this.showPage('home');
 this.showToast(`Welcome back, ${data.user.name.split(' ')[0]}!`);
 } catch { this.showToast('Connection error. Please try again.','error'); }
 finally { btn.disabled=false; btn.querySelector('span').textContent='Enter the Library'; }
 }

 async handleAdminLogin(e) {
 e.preventDefault();
 const email=document.getElementById('adminLoginEmail').value;
 const password=document.getElementById('adminLoginPassword').value;
 const errEl=document.getElementById('adminLoginErr');
 const btn=document.querySelector('#adminLoginForm .btn-submit');
 errEl.textContent='';
 btn.disabled=true; btn.querySelector('span').textContent='Verifying…';
 try {
 const data=await this.apiFetch('/auth/admin-login',{method:'POST',body:JSON.stringify({email,password})});
 if(data.error){errEl.textContent=data.error;return;}
 if(data.user.role!=='admin'){
 await this.apiFetch('/auth/logout',{method:'POST'});
 errEl.textContent='Access denied. This account does not have admin privileges.';
 return;
 }
 window.location.href='/admin';
 } catch { errEl.textContent='Connection error. Please try again.'; }
 finally { btn.disabled=false; btn.querySelector('span').textContent='Access Admin Panel'; }
 }

 _reg = { name:'', email:'', otp:'' };

 regShowStep(n) {
 [1,2,3].forEach(i=>document.getElementById(`regStep${i}`)?.classList.toggle('hidden', i!==n));
 document.getElementById('regStepIndicator').textContent =`Step ${n} of 3`;
 }

 async regSendOTP(resend=false) {
 const name = document.getElementById('regName').value.trim();
 const email = document.getElementById('regEmail').value.trim();
 if(!name||!email){this.showToast('Please enter your name and email','error');return;}
 this._reg.name=name; this._reg.email=email;
 const btn=document.getElementById('regStep1Btn');
 btn.disabled=true; btn.textContent=resend?'Resending…':'Sending OTP…';
 try {
 const data=await this.apiFetch('/auth/register/send-otp',{method:'POST',body:JSON.stringify({name,email})});
 if(data.error){this.showToast(data.error,'error');return;}
 this.regShowStep(2);
 this.showToast(resend?'New OTP sent! Check your email':'OTP sent! Check your email');
 this.startOTPTimer('regTimer','regResendBtn');
 } catch { this.showToast('Failed to send OTP. Check your connection.','error'); }
 finally { btn.disabled=false; btn.textContent=resend?'Resend OTP':'Send Verification Code'; }
 }

 async regVerifyOTP() {
 const otp = document.getElementById('regOTP').value.trim();
 if(otp.length!==6){this.showToast('Enter the 6-digit OTP from your email','error');return;}
 this._reg.otp=otp;
 const btn=document.getElementById('regStep2Btn');
 btn.disabled=true; btn.textContent='Verifying…';
 try {
 const data=await this.apiFetch('/auth/register/verify-otp',{method:'POST',body:JSON.stringify({email:this._reg.email,otp})});
 if(data.error){this.showToast(data.error,'error');return;}
 this.regShowStep(3);
 this.showToast('Email verified! Now set your password.');
 } catch { this.showToast('Verification failed. Try again.','error'); }
 finally { btn.disabled=false; btn.textContent='Verify OTP'; }
 }

 async regSetPassword() {
 const password=document.getElementById('regPassword').value;
 const confirm=document.getElementById('regConfirmPassword').value;
 if(password!==confirm){this.showToast('Passwords do not match','error');return;}
 if(password.length<6){this.showToast('Password must be at least 6 characters','error');return;}
 const btn=document.getElementById('regStep3Btn');
 btn.disabled=true; btn.textContent='Creating account…';
 try {
 const data=await this.apiFetch('/auth/register/set-password',{method:'POST',body:JSON.stringify({email:this._reg.email,otp:this._reg.otp,password,confirmPassword:confirm})});
 if(data.error){this.showToast(data.error,'error');return;}
 this.currentUser=data.user;
 this.updateAuthUI();
 this.showPage('home');
 this.showToast(`Welcome to Tales & Trails, ${data.user.name.split(' ')[0]}!`);
 } catch { this.showToast('Account creation failed. Try again.','error'); }
 finally { btn.disabled=false; btn.textContent='Create Account'; }
 }

 _fgt = { email:'', otp:'' };

 showForgot() {
 document.getElementById('loginForm').style.display='none';
 const ff=document.getElementById('forgotFlow');
 ff.classList.remove('hidden');
 ff.style.display='block';
 this.fgtShowStep(1);
 }
 hideForgot() {
 document.getElementById('forgotFlow').style.display='none';
 document.getElementById('forgotFlow').classList.add('hidden');
 document.getElementById('loginForm').style.display='';
 }
 fgtShowStep(n) {
 [1,2,3].forEach(i=>document.getElementById(`fgtStep${i}`)?.classList.toggle('hidden',i!==n));
 }

 async fgtSendOTP() {
 const email=document.getElementById('fgtEmail').value.trim();
 if(!email){this.showToast('Please enter your email','error');return;}
 this._fgt.email=email;
 const btn=document.getElementById('fgtStep1Btn');
 btn.disabled=true; btn.textContent='Sending…';
 try {
 const data=await this.apiFetch('/auth/forgot/send-otp',{method:'POST',body:JSON.stringify({email})});
 if(data.error){this.showToast(data.error,'error');return;}
 this.fgtShowStep(2);
 this.showToast('Reset code sent! Check your email');
 this.startOTPTimer('fgtTimer','fgtResendBtn');
 } catch { this.showToast('Failed to send. Try again.','error'); }
 finally { btn.disabled=false; btn.textContent='Send Reset Code'; }
 }

 async fgtVerifyOTP() {
 const otp=document.getElementById('fgtOTP').value.trim();
 if(otp.length!==6){this.showToast('Enter the 6-digit code from your email','error');return;}
 this._fgt.otp=otp;
 const btn=document.getElementById('fgtStep2Btn');
 btn.disabled=true; btn.textContent='Verifying…';
 try {
 const data=await this.apiFetch('/auth/forgot/verify-otp',{method:'POST',body:JSON.stringify({email:this._fgt.email,otp})});
 if(data.error){this.showToast(data.error,'error');return;}
 this.fgtShowStep(3);
 this.showToast('Code verified! Set your new password.');
 } catch { this.showToast('Verification failed. Try again.','error'); }
 finally { btn.disabled=false; btn.textContent='Verify Code'; }
 }

 async fgtReset() {
 const password=document.getElementById('fgtPassword').value;
 const confirm=document.getElementById('fgtConfirmPassword').value;
 if(password!==confirm){this.showToast('Passwords do not match','error');return;}
 if(password.length<6){this.showToast('Password must be at least 6 characters','error');return;}
 const btn=document.getElementById('fgtStep3Btn');
 btn.disabled=true; btn.textContent='Resetting…';
 try {
 const data=await this.apiFetch('/auth/forgot/reset',{method:'POST',body:JSON.stringify({email:this._fgt.email,otp:this._fgt.otp,password,confirmPassword:confirm})});
 if(data.error){this.showToast(data.error,'error');return;}
 this.hideForgot();
 this.showToast('Password reset! Please sign in with your new password.');
 } catch { this.showToast('Reset failed. Try again.','error'); }
 finally { btn.disabled=false; btn.textContent='Reset Password'; }
 }

 startOTPTimer(timerId, resendBtnId) {
 let secs=60;
 const timerEl=document.getElementById(timerId);
 const resendBtn=document.getElementById(resendBtnId);
 if(resendBtn) resendBtn.disabled=true;
 const iv=setInterval(()=>{
 secs--;
 if(timerEl) timerEl.textContent=secs>0?`Resend in ${secs}s`:'';
 if(secs<=0){
 clearInterval(iv);
 if(resendBtn){resendBtn.disabled=false;}
 }
 },1000);
 }

 async handleLogout() {
 await this.apiFetch('/auth/logout',{method:'POST'});
 this.currentUser=null;
 this.cart=[];
 this.wishlist=[];
 this.updateAuthUI();
 this.updateCartCount();
 this.updateWishlistCount();
 this.renderBooks();
 this.showPage('auth');
 this.showToast('Signed out. See you next time!');
 }

 async handleProfileUpdate(e) {
 e.preventDefault();
 const name=document.getElementById('editName').value;
 const currentPassword=document.getElementById('editCurrentPassword').value;
 const newPassword=document.getElementById('editNewPassword').value;
 const confirmPassword=document.getElementById('editConfirmPassword').value;
 if(newPassword&&newPassword!==confirmPassword){this.showToast('New passwords do not match','error');return;}
 const btn=document.querySelector('#editProfileForm.btn-submit');
 btn.disabled=true; btn.querySelector('span').textContent='Saving…';

 try {
 const body={};
 if(name.trim()) body.name=name.trim();
 if(currentPassword) body.currentPassword=currentPassword;
 if(newPassword) body.newPassword=newPassword;
 const data=await this.apiFetch('/auth/profile',{method:'PUT',body:JSON.stringify(body)});
 if(data.error){this.showToast(data.error,'error');return;}
 this.currentUser=data.user;
 this.updateAuthUI();
 this.renderProfile();
 document.getElementById('editCurrentPassword').value='';
 document.getElementById('editNewPassword').value='';
 document.getElementById('editConfirmPassword').value='';
 this.showToast('Profile updated successfully!');
 } catch {
 this.showToast('Update failed. Please try again.','error');
 } finally {
 btn.disabled=false; btn.querySelector('span').textContent='Save Changes';
 }
 }

 updateAuthUI() {
 const loggedIn=!!this.currentUser;
 document.getElementById('authLink')?.classList.toggle('hidden',loggedIn);
 document.getElementById('navUser')?.classList.toggle('hidden',!loggedIn);
 document.getElementById('logoutBtn')?.classList.toggle('hidden',!loggedIn);
 document.getElementById('profileNavLink')?.style.setProperty('display',loggedIn?'flex':'none');
 document.getElementById('wishlistNavLink')?.style.setProperty('display',loggedIn?'flex':'none');
 if(loggedIn&&this.currentUser){
 const avatar=document.getElementById('nucAvatar');
 if(avatar) avatar.textContent=this.currentUser.avatar_letter||this.currentUser.name[0].toUpperCase();
 const nameEl=document.getElementById('userName');
 if(nameEl) nameEl.textContent=this.currentUser.name.split(' ')[0];
 }
 if(loggedIn&&this.currentUser){
 const editName=document.getElementById('editName');
 if(editName) editName.value=this.currentUser.name;
 }
 this.renderBooks();
 }

 renderChips() {
 const row=document.getElementById('chipRow'); if(!row)return;
 row.innerHTML=this.CATS.map(c=>`<button class="chip${c===this.activeFilter?' active':''}" data-cat="${c}">${c}</button>`).join('');
 row.querySelectorAll('.chip').forEach(c=>{
 c.addEventListener('click',()=>this.applyFilters(c.dataset.cat));
 });
 }

 applyFilters(cat=null, sort=null) {
 if(cat!==null){
 this.activeFilter=cat;
 document.querySelectorAll('.chip').forEach(c=>{c.classList.toggle('active',c.dataset.cat===cat);});
 }
 const sortVal=sort||document.getElementById('sortFilter')?.value||'rating-desc';
 let list=this.activeFilter==='All'?[...this.books]:this.books.filter(b=>b.cat===this.activeFilter);
 const sortFns={'rating-desc':(a,b)=>b.rating-a.rating,'name-asc':(a,b)=>a.title.localeCompare(b.title),'name-desc':(a,b)=>b.title.localeCompare(a.title),'price-asc':(a,b)=>a.price-b.price,'price-desc':(a,b)=>b.price-a.price};
 list.sort(sortFns[sortVal]||sortFns['rating-desc']);
 this.filtered=list;
 this.renderBooks();
 }

 renderBooks() {
 const grid=document.getElementById('booksGrid'), empty=document.getElementById('catEmpty'); if(!grid)return;
 if(!this.filtered.length){grid.innerHTML='';empty?.classList.remove('hidden');return;}
 empty?.classList.add('hidden');
 grid.innerHTML=this.filtered.map((b,i)=>this.bookCardHTML(b,i)).join('');
 }

 bookCardHTML(b, idx=0) {
 const disc=Math.round((b.orig-b.price)/b.orig*100);
 const stars=''.repeat(Math.floor(b.rating))+''.repeat(5-Math.floor(b.rating));
 const wishlisted=this.wishlist.includes(b.id);
 return`
 <div class="book-card" style="--cd:${idx*40}ms" data-id="${b.id}">
 <div class="book-cover-wrap">
 <img src="${b.cover}" alt="${b.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x400/111118/c9933a?text=T%26T'">
 <div class="book-cover-gradient"></div>
 <div class="book-cover-tag">${b.cat}</div>
 ${disc>0?`<div class="book-discount-badge">${disc}% off</div>`:''}
 <button class="btn-wishlist ${wishlisted?'active':''}" data-id="${b.id}" title="${wishlisted?'Remove from wishlist':'Add to wishlist'}">${wishlisted?'':''}</button>
 </div>
 <div class="book-info">
 <div class="book-title">${b.title}</div>
 <div class="book-author">by ${b.author}</div>
 <div class="book-stars"><span class="stars-icons">${stars}</span><span class="stars-num">${b.rating}</span></div>
 <div class="book-price-row">
 <span class="book-price-curr">${rs(b.price)}</span>
 ${b.orig>b.price?`<span class="book-price-orig">${rs(b.orig)}</span>`:''}
 </div>
 <button class="btn-add-cart" data-id="${b.id}"><span>Add to Cart</span></button>
 </div>
 </div>`;
 }

 async showBookDetail(bookId) {
 if(!this.currentUser){this.showToast('Please sign in to view book details.','error');this.showPage('auth');return;}
 this.previousPage=this.currentPage||'home';
 const book=this.books.find(b=>b.id===bookId);
 if(!book)return;

 const container=document.getElementById('bookDetailContent');
 const disc=Math.round((book.orig-book.price)/book.orig*100);
 const stars=''.repeat(Math.floor(book.rating))+''.repeat(5-Math.floor(book.rating));
 const wishlisted=this.wishlist.includes(book.id);

 if(container){
 container.innerHTML=`
 <div class="book-detail-cover-wrap">
 <img src="${book.cover}" alt="${book.title}" onerror="this.src='https://via.placeholder.com/300x420/111118/c9933a?text=T%26T'">
 ${disc>0?`<div class="book-discount-badge">${disc}% off</div>`:''}
 </div>
 <div class="book-detail-info">
 <div class="book-cover-tag" style="display:inline-block;margin-bottom:12px">${book.cat}</div>
 <h1 class="bd-title">${book.title}</h1>
 <p class="bd-author">by <em>${book.author}</em></p>
 <div class="book-stars" style="margin:12px 0"><span class="stars-icons">${stars}</span><span class="stars-num">${book.rating}</span></div>
 ${book.description?`<p class="bd-desc">${book.description}</p>`:''}
 <div class="bd-meta">
 ${book.pages?`<span> ${book.pages} pages</span>`:''}
 ${book.publisher?`<span> ${book.publisher}</span>`:''}
 ${book.year?`<span> ${book.year}</span>`:''}
 </div>
 <div class="bd-price-row">
 <span class="book-price-curr" style="font-size:1.8rem">${rs(book.price)}</span>
 ${book.orig>book.price?`<span class="book-price-orig" style="font-size:1.1rem">${rs(book.orig)}</span>`:''}
 ${disc>0?`<span class="bd-save-badge">Save ${disc}%</span>`:''}
 </div>
 <div class="bd-actions">
 <button class="btn-add-cart btn-lg" data-id="${book.id}"><span> Add to Cart</span></button>
 <button class="btn-wishlist-lg ${wishlisted?'active':''} btn-wishlist" data-id="${book.id}">${wishlisted?' Wishlisted':' Wishlist'}</button>
 </div>
 </div>`;
 }

 this.showPage('bookDetail');

 try {
 const data=await this.apiFetch(`/books/${bookId}`);
 this.renderReviews(data.reviews||[], bookId);
 this.renderSimilarBooks(bookId);
 } catch {}
 }

 renderReviews(reviews, bookId) {
 const reviewFormWrap=document.getElementById('reviewForm');
 const reviewList=document.getElementById('reviewList');

 if(this.currentUser&&reviewFormWrap){
 const existing=reviews.find(r=>r.user_id===this.currentUser.id);
 reviewFormWrap.classList.remove('hidden');
 reviewFormWrap.innerHTML=`
 <div class="review-form">
 <h4>${existing?'Update Your Review':'Write a Review'}</h4>
 <div class="star-rating-input" id="starInput">
 ${[1,2,3,4,5].map(n=>`<span class="star-opt ${existing&&existing.rating>=n?'active':''}" data-val="${n}"></span>`).join('')}
 <input type="hidden" id="ratingVal" value="${existing?existing.rating:0}">
 </div>
 <div class="ff"><input type="text" id="reviewTitle" class="fi" placeholder="" value="${existing?.title||''}"><label class="fl">Review Title</label><div class="fbar"></div></div>
 <div class="ff"><textarea id="reviewBody" class="fi fi-ta" placeholder="">${existing?.body||''}</textarea><label class="fl">Your thoughts…</label><div class="fbar"></div></div>
 <button class="btn-primary" id="submitReviewBtn">Submit Review</button>
 </div>`;

 reviewFormWrap.querySelectorAll('.star-opt').forEach(s=>{
 s.addEventListener('mouseenter',()=>reviewFormWrap.querySelectorAll('.star-opt').forEach(x=>x.classList.toggle('active',x.dataset.val<=s.dataset.val)));
 s.addEventListener('click',()=>{document.getElementById('ratingVal').value=s.dataset.val;});
 s.addEventListener('mouseleave',()=>{const val=document.getElementById('ratingVal').value;reviewFormWrap.querySelectorAll('.star-opt').forEach(x=>x.classList.toggle('active',val&&x.dataset.val<=val));});
 });

 document.getElementById('submitReviewBtn')?.addEventListener('click',async()=>{
 const rating=parseInt(document.getElementById('ratingVal').value);
 const title=document.getElementById('reviewTitle').value;
 const body=document.getElementById('reviewBody').value;
 if(!rating){this.showToast('Please select a star rating','error');return;}
 const data=await this.apiFetch(`/books/${bookId}/review`,{method:'POST',body:JSON.stringify({rating,title,body})});
 if(data.error){this.showToast(data.error,'error');return;}
 this.showToast('Review submitted!');
 const updated=await this.apiFetch(`/books/${bookId}`);
 this.renderReviews(updated.reviews||[],bookId);
 await this.fetchBooks();
 this.renderBooks();
 });
 }

 if(reviewList){
 if(!reviews.length){
 reviewList.innerHTML=`<div style="text-align:center;padding:40px 0;color:var(--muted)"><div style="font-size:2.5rem"></div><p>No reviews yet. Be the first!</p></div>`;
 return;
 }
 reviewList.innerHTML=reviews.map(r=>`
 <div class="review-item">
 <div class="ri-header">
 <div class="ri-avatar">${r.avatar_letter}</div>
 <div>
 <div class="ri-name">${r.user_name}</div>
 <div class="ri-date">${new Date(r.created_at).toLocaleDateString('en-IN',{year:'numeric',month:'long',day:'numeric'})}</div>
 </div>
 <div class="ri-stars">${''.repeat(r.rating)}${''.repeat(5-r.rating)}</div>
 </div>
 ${r.title?`<div class="ri-title">${r.title}</div>`:''}
 ${r.body?`<div class="ri-body">${r.body}</div>`:''}
 </div>`).join('');
 }
 }

 async renderSimilarBooks(bookId) {
 const grid=document.getElementById('similarBooksGrid'); if(!grid)return;
 const data=await this.apiFetch(`/books/${bookId}/similar`);
 const books=(data.books||[]).map(b=>({...b,price:parseFloat(b.price),orig:parseFloat(b.original_price),cat:b.category,cover:b.cover_url,rating:parseFloat(b.rating)}));
 if(!books.length){document.getElementById('similarBooksSection').style.display='none';return;}
 document.getElementById('similarBooksSection').style.display='';
 grid.innerHTML=books.map((b,i)=>this.bookCardHTML(b,i)).join('');
 grid.querySelectorAll('.book-card').forEach(card=>{
 card.addEventListener('click',e=>{if(!e.target.closest('button'))this.showBookDetail(parseInt(card.dataset.id));});
 });
 grid.querySelectorAll('.btn-add-cart').forEach(btn=>{btn.addEventListener('click',e=>{e.stopPropagation();this.addToCart(parseInt(btn.dataset.id));});});
 grid.querySelectorAll('.btn-wishlist').forEach(btn=>{btn.addEventListener('click',e=>{e.stopPropagation();this.toggleWishlist(parseInt(btn.dataset.id),btn);});});
 }

 renderHeroStack() {
 const wrap=document.getElementById('heroStack'); if(!wrap||!this.books.length)return;
 const featured=[this.books[8],this.books[6],this.books[12],this.books[0],this.books[13]].filter(Boolean);
 const positions=[{top:'50px',left:'80px',rot:'-8deg',z:4,scale:1},{top:'30px',left:'180px',rot:'3deg',z:5,scale:1.05},{top:'100px',left:'120px',rot:'-3deg',z:3,scale:0.95},{top:'200px',left:'60px',rot:'8deg',z:2,scale:0.9},{top:'160px',left:'230px',rot:'-5deg',z:1,scale:0.85}];
 wrap.innerHTML=featured.map((b,i)=>{const p=positions[i];return`<div class="hs-book" style="top:${p.top};left:${p.left};transform:rotate(${p.rot}) scale(${p.scale});z-index:${p.z};animation-delay:${i*150}ms"><img src="${b.cover}" alt="${b.title}" onerror="this.src='https://via.placeholder.com/170x230/111118/c9933a?text=+'"><div class="hs-book-spine"></div></div>`;}).join('');
 }

 renderAuthBooks() {
 const wrap=document.getElementById('avBooks'); if(!wrap||!this.books.length)return;
 const picks=[this.books[9],this.books[12],this.books[6],this.books[8]].filter(Boolean);
 wrap.innerHTML=picks.map(b=>`<div class="av-book-mini"><img src="${b.cover}" alt="${b.title}" onerror="this.src='https://via.placeholder.com/50x68/111118/c9933a?text=+'"></div>`).join('');
 }

 async addToCart(id) {
 const book=this.books.find(b=>b.id===id); if(!book)return;
 if(!this.currentUser){this.showPage('auth');this.showToast('Please sign in to add items to your cart.','error');return;}

 try {
 await this.apiFetch('/cart',{method:'POST',body:JSON.stringify({bookId:id,quantity:1})});
 const ex=this.cart.find(i=>i.bookId===id);
 if(ex) ex.quantity++;
 else this.cart.push({bookId:id,quantity:1,book});
 this.updateCartCount();
 this.showToast(`"${book.title}" added to cart`);
 const pill=document.getElementById('cartCount');
 if(pill){pill.style.transform='scale(1.6)';setTimeout(()=>pill.style.transform='',300);}
 } catch {
 this.showToast('Failed to add to cart','error');
 }
 }

 async updateQty(id,qty) {
 if(qty<=0){this.removeFromCart(id);return;}
 const item=this.cart.find(i=>i.bookId===id); if(!item)return;
 try {
 await this.apiFetch(`/cart/${id}`,{method:'PUT',body:JSON.stringify({quantity:qty})});
 item.quantity=qty;
 this.updateCartCount();
 this.renderCart();
 } catch {}
 }

 async removeFromCart(id) {
 const b=this.books.find(x=>x.id===id);
 try {
 await this.apiFetch(`/cart/${id}`,{method:'DELETE'});
 this.cart=this.cart.filter(i=>i.bookId!==id);
 this.updateCartCount();
 this.renderCart();
 if(b) this.showToast(`"${b.title}" removed`);
 } catch {}
 }

 updateCartCount() {
 const n=this.cart.reduce((s,i)=>s+i.quantity,0);
 const el=document.getElementById('cartCount'); if(el){el.textContent=n;el.style.display=n>0?'inline-flex':'none';}
 const mb=document.getElementById('mnbCartBadge'); if(mb){mb.textContent=n;mb.style.display=n>0?'flex':'none';}
 }

 renderCart() {
 const itemsEl=document.getElementById('cartItems'), emptyEl=document.getElementById('cartEmpty'), rightEl=document.getElementById('cartRight'), countEl=document.getElementById('cartCountText');
 if(!itemsEl)return;
 const total=this.cart.reduce((s,i)=>s+i.quantity,0);
 if(countEl) countEl.textContent=`${total} item${total!==1?'s':''} awaiting you`;
 if(!this.cart.length){itemsEl.innerHTML='';emptyEl?.classList.remove('hidden');rightEl?.classList.add('hidden');return;}
 emptyEl?.classList.add('hidden');
 rightEl?.classList.remove('hidden');
 itemsEl.innerHTML=this.cart.map(item=>{
 const b=item.book||this.books.find(x=>x.id===item.bookId);
 if(!b)return'';
 return`<div class="cart-item-card">
 <img src="${b.cover}" class="cic-cover" alt="${b.title}" onerror="this.src='https://via.placeholder.com/72x96/111118/c9933a?text=?'">
 <div class="cic-info">
 <div class="cic-title">${b.title}</div>
 <div class="cic-author">by ${b.author}</div>
 <div class="cic-controls">
 <div class="qty-wrap">
 <button class="qty-btn" data-id="${b.id}" data-action="dec">−</button>
 <span class="qty-n">${item.quantity}</span>
 <button class="qty-btn" data-id="${b.id}" data-action="inc">+</button>
 </div>
 <button class="cic-remove" data-id="${b.id}">Remove</button>
 </div>
 </div>
 <div class="cic-price">${rs(b.price*item.quantity)}</div>
 </div>`;
 }).join('');
 this.updateCartTotals();
 }

 updateCartTotals() {
 const sub=this.cart.reduce((s,i)=>{const b=i.book||this.books.find(x=>x.id===i.bookId);return s+(b?b.price*i.quantity:0);},0);
 const tax=sub*0.08;
 document.getElementById('subtotal').textContent=rs(sub);
 document.getElementById('tax').textContent=rs(tax);
 document.getElementById('total').textContent=rs(sub+tax);
 }

 proceedToCheckout() {
 if(!this.cart.length){this.showToast('Your cart is empty','error');return;}
 if(!this.currentUser){this.showPage('auth');return;}
 this.showPage('checkout');
 if(this.currentUser){
 const parts=this.currentUser.name.split('');
 document.getElementById('firstName').value=parts[0]||'';
 document.getElementById('lastName').value=parts.slice(1).join('')||'';
 }
 }

 renderOrderSummary() {
 const el=document.getElementById('orderItems'); if(!el)return;
 const sub=this.cart.reduce((s,i)=>{const b=i.book||this.books.find(x=>x.id===i.bookId);return s+(b?b.price*i.quantity:0);},0);
 const tax=sub*0.08;
 el.innerHTML=this.cart.map(item=>{const b=item.book||this.books.find(x=>x.id===item.bookId);return b?`<div class="co-item-row"><div><div class="co-item-name">${b.title}</div><div class="co-item-qty">× ${item.quantity}</div></div><div class="co-item-price">${rs(b.price*item.quantity)}</div></div>`:''}).join('');
 document.getElementById('orderSubtotal').textContent=rs(sub);
 document.getElementById('orderTax').textContent=rs(tax);
 document.getElementById('orderTotal').textContent=rs(sub+tax);
 }

 async handleCheckout(e) {
 e.preventDefault();
 const payMethod=document.querySelector('input[name="payMethod"]:checked');
 if(!payMethod){this.showToast('Please select a payment method','error');return;}
 const btn=document.querySelector('.btn-place-order');
 btn.disabled=true; btn.querySelector('span').textContent='Placing order…';

 try {
 const data=await this.apiFetch('/orders',{method:'POST',body:JSON.stringify({
 firstName:document.getElementById('firstName').value,
 lastName:document.getElementById('lastName').value,
 address:document.getElementById('address').value,
 city:document.getElementById('city').value,
 state:document.getElementById('state').value,
 zipCode:document.getElementById('zipCode').value,
 paymentMethod:payMethod.value
 })});

 if(data.error){this.showToast(data.error,'error');return;}

 document.getElementById('orderIdDisplay').textContent=data.orderId;
 document.getElementById('confirmationTotal').textContent=rs(data.total);
 this.cart=[];
 this.updateCartCount();
 this.showPage('confirmation');
 setTimeout(()=>this.animateConfirm(),600);
 this.showToast('Order placed! Your books are on the way');
 } catch {
 this.showToast('Order failed. Please try again.','error');
 } finally {
 btn.disabled=false; btn.querySelector('span').textContent='Place Order';
 }
 }

 animateConfirm() {
 const wrap=document.querySelector('.confirm-ring-wrap'); if(wrap)wrap.classList.add('done');
 const canvas=document.getElementById('confirmCanvas'); if(!canvas)return;
 canvas.width=window.innerWidth; canvas.height=window.innerHeight;
 const ctx=canvas.getContext('2d');
 const colors=['#c9933a','#e8b05a','#f0c878','#3ecf8e','#f2ead8'];
 const pieces=Array.from({length:100},()=>({x:Math.random()*canvas.width,y:-20,vx:(Math.random()-0.5)*4,vy:Math.random()*4+2,r:Math.random()*6+3,color:colors[Math.floor(Math.random()*colors.length)],rot:Math.random()*Math.PI*2,vrot:(Math.random()-0.5)*0.2,shape:Math.random()>0.5?'rect':'circle'}));
 let frame=0,animId;
 const draw=()=>{ctx.clearRect(0,0,canvas.width,canvas.height);pieces.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=0.05;p.rot+=p.vrot;ctx.save();ctx.globalAlpha=Math.max(0,1-frame/180);ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.fillStyle=p.color;if(p.shape==='circle'){ctx.beginPath();ctx.arc(0,0,p.r,0,Math.PI*2);ctx.fill();}else ctx.fillRect(-p.r,-p.r,p.r*2,p.r*2);ctx.restore();});frame++;if(frame<200)animId=requestAnimationFrame(draw);else cancelAnimationFrame(animId);};
 draw();
 }

 async toggleWishlist(id, btn) {
 if(!this.currentUser){this.showPage('auth');this.showToast('Please sign in to use your wishlist.','error');return;}
 try {
 const data=await this.apiFetch(`/wishlist/${id}`,{method:'POST'});
 if(data.action==='added'){
 this.wishlist.push(id);
 if(btn){btn.classList.add('active');btn.textContent='';if(btn.classList.contains('btn-wishlist-lg'))btn.textContent=' Wishlisted';}
 this.showToast('Added to wishlist');
 } else {
 this.wishlist=this.wishlist.filter(x=>x!==id);
 if(btn){btn.classList.remove('active');btn.textContent='';if(btn.classList.contains('btn-wishlist-lg'))btn.textContent=' Wishlist';}
 this.showToast('Removed from wishlist');
 }
 this.updateWishlistCount();
 this.renderBooks();
 } catch {
 this.showToast('Wishlist update failed','error');
 }
 }

 updateWishlistCount() {
 const n=this.wishlist.length;
 const el=document.getElementById('wishlistCount'); if(!el)return;
 el.textContent=n;
 el.style.display=n>0?'inline-flex':'none';
 }

 renderWishlist() {
 const grid=document.getElementById('wishlistGrid'), empty=document.getElementById('wishlistEmpty'), countEl=document.getElementById('wishlistCountText');
 if(!grid)return;
 if(countEl) countEl.textContent=`${this.wishlist.length} book${this.wishlist.length!==1?'s':''} saved`;
 const wlBooks=this.books.filter(b=>this.wishlist.includes(b.id));
 if(!wlBooks.length){grid.innerHTML='';empty?.classList.remove('hidden');return;}
 empty?.classList.add('hidden');
 grid.innerHTML=wlBooks.map((b,i)=>`
 <div class="book-card" style="--cd:${i*40}ms">
 <div class="book-cover-wrap">
 <img src="${b.cover}" alt="${b.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x400/111118/c9933a?text=T%26T'">
 <div class="book-cover-gradient"></div>
 <div class="book-cover-tag">${b.cat}</div>
 <button class="btn-wishlist active btn-wishlist-remove" data-id="${b.id}" title="Remove from wishlist"></button>
 </div>
 <div class="book-info">
 <div class="book-title">${b.title}</div>
 <div class="book-author">by ${b.author}</div>
 <div class="book-price-row"><span class="book-price-curr">${rs(b.price)}</span></div>
 <button class="btn-add-cart" data-id="${b.id}"><span>Add to Cart</span></button>
 </div>
 </div>`).join('');
 }

 async renderProfile() {
 if(!this.currentUser)return;
 document.getElementById('profileName').textContent=this.currentUser.name;
 document.getElementById('profileEmail').textContent=this.currentUser.email;
 document.getElementById('profileAvatarLetter').textContent=this.currentUser.avatar_letter||this.currentUser.name[0].toUpperCase();
 document.getElementById('editName').value=this.currentUser.name;

 try {
 const [ordersData]=await Promise.all([this.apiFetch('/orders')]);
 const orders=ordersData.orders||[];
 document.getElementById('profileOrderCount').textContent=orders.length;
 document.getElementById('profileWishlistCount').textContent=this.wishlist.length;
 const spent=orders.reduce((s,o)=>s+parseFloat(o.total),0);
 document.getElementById('profileSpend').textContent=rs(spent);

 const listEl=document.getElementById('orderHistoryList');
 if(!orders.length){
 listEl.innerHTML=`<div style="text-align:center;padding:60px 0;color:var(--muted)"><div style="font-size:3rem;margin-bottom:16px"></div><p>No orders yet — your story begins here.</p><button class="btn-primary" style="margin-top:20px" data-page="home">Explore Books</button></div>`;
 listEl.querySelector('[data-page]')?.addEventListener('click',e=>{e.preventDefault();this.showPage('home');});
 return;
 }
 listEl.innerHTML=orders.map(o=>`
 <div class="ohp-item">
 <div>
 <div class="ohp-id">${o.id}</div>
 <div class="ohp-date">${new Date(o.created_at).toLocaleDateString('en-IN',{year:'numeric',month:'long',day:'numeric'})}</div>
 <div class="ohp-books">${(o.items||[]).map(i=>`<small> ${i.title} ×${i.quantity}</small>`).join('')}</div>
 <div style="margin-top:6px"><span class="ohp-badge ohp-badge-${o.status}">${o.status.charAt(0).toUpperCase()+o.status.slice(1)}</span></div>
 </div>
 <div class="ohp-amount">${rs(o.total)}</div>
 </div>`).join('');
 } catch(e) {
 console.error('Profile render error:',e);
 }
 }

 async renderMyReviews() {
 const el=document.getElementById('myReviewsList'); if(!el)return;
 el.innerHTML=`<div style="text-align:center;padding:20px;color:var(--muted)">Loading…</div>`;
 el.innerHTML=`<div style="text-align:center;padding:40px 0;color:var(--muted)"><div style="font-size:2.5rem"></div><p>Your reviews appear on book pages.</p><p style="margin-top:8px;font-size:0.85rem">Browse books and write reviews to see them here.</p><button class="btn-primary" style="margin-top:16px" data-page="home">Browse Books</button></div>`;
 el.querySelector('[data-page]')?.addEventListener('click',e=>{e.preventDefault();this.showPage('home');});
 }

 showToast(msg,type='success') {
 const toast=document.getElementById('toast'),text=document.getElementById('toastText'),dot=document.getElementById('toastDot');
 if(!toast||!text)return;
 text.textContent=msg;
 toast.className=`toast ${type}`;
 if(dot) dot.textContent=type==='error'?'':'';
 toast.classList.remove('hidden');
 clearTimeout(this._toastT);
 this._toastT=setTimeout(()=>this.hideToast(),3800);
 }
 hideToast(){document.getElementById('toast')?.classList.add('hidden');}
}

document.addEventListener('DOMContentLoaded',()=>{
 const svg=document.querySelector('.confirm-svg');
 if(svg){
 const defs=document.createElementNS('http://www.w3.org/2000/svg','defs');
 defs.innerHTML=`<linearGradient id="confirmGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#c9933a"/><stop offset="100%" stop-color="#f0c878"/></linearGradient>`;
 svg.insertBefore(defs,svg.firstChild);
 }
 new BookStore();
});