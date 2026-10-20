(() => {
  'use strict';
  const STORAGE_KEY = 'acessifood.prototype.v2';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const money = n => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const fmtDate = value => { if (!value) return '—'; const p = String(value).slice(0,10).split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : value; };
  const fmtDateTime = value => { const d = new Date(value); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}); };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const makeId = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
  const csvCell = value => `"${String(value ?? '').replace(/"/g,'""')}"`;
  const download = (name, content, type = 'text/plain;charset=utf-8') => {
    const url = URL.createObjectURL(new Blob([content], {type}));
    const a = document.createElement('a'); a.href = url; a.download = name; a.style.display = 'none'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1200);
  };

  const DEFAULT_PREFS = { glutenFree:false, lactoseFree:false, vegetarian:false, vegan:false, allergies:'', taste:'both', temperature:'any', largeText:false, highContrast:false, reducedMotion:false, readableFont:false, relaxedLines:false, wideSpacing:false, highlightLinks:false, strongFocus:false, readingGuide:false, focusMode:false, lowSaturation:false, largeControls:false, darkMode:false, leftAlign:false, largeCursor:false, grayscale:false };
  const DEFAULT_STORE = { storeId:'store-tempero', name:'Tempero da Casa', category:'Brasileira', address:'Limeira, SP (endereço demonstrativo)', owner:'', phone:'', email:'', cnpj:'', ownerCpf:'', ownerRg:'', color:'#c64032', logoText:'TC' };
  const seedProducts = [
    {id:'seed-feijoada',name:'Feijoada da Casa',price:34.9,offer:0,category:'Brasileira',image:'brazilian.jpg',description:'Feijão preto, acompanhamentos da casa e tempero tradicional.',stock:18,active:true,vegetarian:false,vegan:false,glutenFree:true,lactoseFree:true,sweet:false,hotMeal:true,storeName:'Tempero da Casa',storeId:'store-tempero',ownedByCurrentStore:true,rating:4.9},
    {id:'seed-burger',name:'Hambúrguer artesanal',price:32.9,offer:0,category:'Hambúrgueres',image:'burger.jpg',description:'Hambúrguer artesanal, pão macio e ingredientes frescos.',stock:14,active:true,vegetarian:false,vegan:false,glutenFree:false,lactoseFree:false,sweet:false,hotMeal:true,storeName:'Brasa Burger',storeId:'store-brasa',ownedByCurrentStore:false,rating:4.8},
    {id:'seed-pizza',name:'Pizza marguerita',price:39.9,offer:10,category:'Pizzas',image:'pizza.jpg',description:'Molho de tomate, queijo derretido e manjericão fresco.',stock:9,active:true,vegetarian:true,vegan:false,glutenFree:false,lactoseFree:false,sweet:false,hotMeal:true,storeName:'Forno & Massa',storeId:'store-forno',ownedByCurrentStore:false,rating:4.7},
    {id:'seed-bowl',name:'Bowl colorido',price:29.9,offer:0,category:'Vegetariana',image:'food-table.jpg',description:'Legumes frescos, folhas e molho especial servido à parte.',stock:20,active:true,vegetarian:true,vegan:true,glutenFree:true,lactoseFree:true,sweet:false,hotMeal:false,storeName:'Verde no Prato',storeId:'store-verde',ownedByCurrentStore:false,rating:4.9},
    {id:'seed-soup',name:'Sopa da horta',price:22.5,offer:0,category:'Brasileira',image:'brazilian.jpg',description:'Sopa de legumes da estação, com ervas e azeite.',stock:12,active:true,vegetarian:true,vegan:true,glutenFree:true,lactoseFree:true,sweet:false,hotMeal:true,storeName:'Tempero da Casa',storeId:'store-tempero',ownedByCurrentStore:true,rating:4.8},
    {id:'seed-pudding',name:'Pudim caseiro',price:12,offer:0,category:'Doces',image:'food-table.jpg',description:'Sobremesa cremosa preparada em pequenas fornadas.',stock:16,active:true,vegetarian:true,vegan:false,glutenFree:true,lactoseFree:false,sweet:true,hotMeal:false,storeName:'Doce Afeto',storeId:'store-doce',ownedByCurrentStore:false,rating:4.9}
  ];
  function freshState() { return { products:seedProducts.map(x=>({...x})), cart:[], coupon:'', favorites:[], preferences:{...DEFAULT_PREFS}, profile:{name:'',email:'',phone:'',cpf:'',rg:'',address:''}, store:{...DEFAULT_STORE}, orders:[], nextOrderNumber:1, currentView:'home', sellerTab:'overview', orderFilter:'all', reportType:'sale' }; }
  function loadState() {
    const fallback = freshState();
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!saved || typeof saved !== 'object') return fallback;
      return {...fallback,...saved,
        products:Array.isArray(saved.products)?saved.products:fallback.products,
        cart:Array.isArray(saved.cart)?saved.cart:[], coupon:typeof saved.coupon==='string'?saved.coupon:'',
        favorites:Array.isArray(saved.favorites)?saved.favorites:[], preferences:{...DEFAULT_PREFS,...(saved.preferences||{})},
        profile:{...fallback.profile,...(saved.profile||{})}, store:{...fallback.store,...(saved.store||{})},
        orders:Array.isArray(saved.orders)?saved.orders:[], nextOrderNumber:Number(saved.nextOrderNumber)||1,
        currentView:saved.currentView||'home', sellerTab:saved.sellerTab||'overview', orderFilter:saved.orderFilter||'all', reportType:saved.reportType||'sale'};
    } catch (e) { console.warn('Falha ao ler dados locais do AcessiFood.',e); return fallback; }
  }
  let state = loadState();
  let categoryFilter = 'Todos', orderFilter = state.orderFilter || 'all', reportType = state.reportType || 'sale';
  let lastFocused = null, toastTimer = null;
  function save(showError=false) { try { localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); return true; } catch(e) { console.warn('Falha ao salvar dados locais.',e); if(showError) toast('O navegador não conseguiu salvar. Verifique o espaço disponível.','error'); return false; } }
  function toast(message,kind='success') { const region=$('#toastRegion'); if(!region) return; const el=document.createElement('div'); el.className=`toast${kind==='error'?' error':''}`; el.setAttribute('role','status'); el.textContent=message; region.appendChild(el); if(toastTimer) clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.remove(),3600); }
  function announce(message) { const node=$('#liveAnnouncement'); if(node) node.textContent=message; }
  function view(name) {
    if (!$('#view-'+name)) name='home'; state.currentView=name; save();
    $$('[data-view-panel]').forEach(p=>p.hidden=p.dataset.viewPanel!==name);
    $$('.nav-link').forEach(b=>{const active=b.dataset.view===name;b.classList.toggle('active',active); if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
    $('#mainNav').classList.remove('mobile-open'); $('#menuToggle').setAttribute('aria-expanded','false');
    if(name==='home') renderCatalog(); if(name==='preferences') loadPrefs(); if(name==='orders') renderOrders(); if(name==='profile') loadProfile();
    if(name==='seller'){switchSellerTab(state.sellerTab||'overview');renderSeller();}
    $('#mainContent').scrollIntoView({behavior:state.preferences.reducedMotion?'auto':'smooth',block:'start'});
    const names={home:'Explorar cardápio',about:'Objetivo e proposta do projeto',preferences:'Preferências',orders:'Meus pedidos',profile:'Cadastro e perfil',seller:'Área do vendedor',downloads:'Versão desktop'}; announce(`Seção aberta: ${names[name]||name}.`);
  }
  function byId(id) { return state.products.find(p=>p.id===id); }
  function unitPrice(p) { const base=Number(p?.price)||0, off=Math.max(0,Math.min(90,Number(p?.offer)||0)); return Math.round(base*(1-off/100)*100)/100; }
  function cartLines() { return state.cart.map(l=>({...l,product:byId(l.productId)})).filter(l=>l.product); }
  function cartQty() { return state.cart.reduce((n,l)=>n+(Number(l.qty)||0),0); }
  function subtotal() { return cartLines().reduce((sum,l)=>sum+unitPrice(l.product)*l.qty,0); }
  function deliveryFee() { return cartQty()?4.99:0; }
  function discount() { const c=state.coupon.toUpperCase(), s=subtotal(); if(c==='ACESSI10'&&s>=30)return Math.round(s*.1*100)/100; if(c==='BEMVINDO5'&&s>=20)return Math.round(s*.05*100)/100; if(c==='PRIMEIRA15'&&s>=60)return Math.round(s*.15*100)/100; return 0; }
  function total() { return Math.max(0,Math.round((subtotal()+deliveryFee()-discount())*100)/100); }
  function couponRate() { return ({ACESSI10:'10%',BEMVINDO5:'5%',PRIMEIRA15:'15%'})[state.coupon.toUpperCase()]||''; }
  function tags(p) { const t=[]; if(p.vegetarian)t.push('Vegetariano');if(p.vegan)t.push('Vegano');if(p.glutenFree)t.push('Sem glúten');if(p.lactoseFree)t.push('Sem lactose');if(p.sweet)t.push('Doce');if(p.hotMeal)t.push('Prato quente');return t; }
  function matchingPreferences(p) { const x=state.preferences; return (!x.glutenFree||p.glutenFree)&&(!x.lactoseFree||p.lactoseFree)&&(!x.vegetarian||p.vegetarian)&&(!x.vegan||p.vegan)&&(x.taste==='both'||(x.taste==='sweet'?p.sweet:!p.sweet))&&(x.temperature==='any'||(x.temperature==='cold'?p.hotMeal:!p.hotMeal)); }
  function matchesCategory(p,c) { if(c==='Todos')return true;if(c==='Sem glúten')return !!p.glutenFree;if(c==='Sem lactose')return !!p.lactoseFree;if(c==='Vegetariana')return !!p.vegetarian;if(c==='Hambúrgueres'||c==='Pizzas')return p.category===c;return p.category===c; }
  function renderProduct(p) {
    const favorite=state.favorites.includes(p.id), price=unitPrice(p);
    return `<article class="product-card"><div class="product-photo"><img src="assets/${esc(p.image||'food-table.jpg')}" alt="Imagem ilustrativa de ${esc(p.name)}" loading="lazy"><div class="product-badges">${p.offer?`<span class="product-badge offer">${esc(p.offer)}% OFF</span>`:''}<span class="product-badge">${esc(p.category)}</span></div><button class="favorite-button${favorite?' favorited':''}" type="button" data-favorite="${esc(p.id)}" aria-label="${favorite?'Remover dos favoritos':'Adicionar aos favoritos'}: ${esc(p.name)}" aria-pressed="${favorite}">${favorite?'♥':'♡'}</button><button class="add-button" type="button" data-add-cart="${esc(p.id)}" aria-label="Adicionar ${esc(p.name)} à sacola" ${p.stock<=0?'disabled':''}>+</button></div><div class="product-body"><div class="product-meta"><span>${esc(p.category)}</span><span class="rating">★ ${esc(p.rating||'4,8')}</span></div><h3>${esc(p.name)}</h3><span class="product-store">${esc(p.storeName||state.store.name)}</span><p class="product-description">${esc(p.description)}</p><div class="product-tags">${tags(p).slice(0,3).map(t=>`<span class="product-tag">${esc(t)}</span>`).join('')||'<span class="product-tag">Consulte ingredientes</span>'}</div><div class="product-footer"><div class="product-price">${p.offer?`<del>${money(p.price)}</del>`:''}<strong>${money(price)}</strong></div><span class="product-stock">${p.stock>0?`${p.stock} disponíveis`:'Indisponível'}</span></div></div></article>`;
  }
  function renderCatalog() {
    const grid=$('#productGrid'); if(!grid)return;
    const term=$('#searchInput').value.trim().toLocaleLowerCase('pt-BR'); let list=state.products.filter(p=>p.active&&p.stock>0&&matchesCategory(p,categoryFilter)&&matchingPreferences(p));
    list=list.filter(p=>[p.name,p.description,p.category,p.storeName,tags(p).join(' ')].join(' ').toLocaleLowerCase('pt-BR').includes(term));
    const sort=$('#sortSelect').value; if(sort==='priceAsc')list.sort((a,b)=>unitPrice(a)-unitPrice(b));else if(sort==='priceDesc')list.sort((a,b)=>unitPrice(b)-unitPrice(a));else if(sort==='name')list.sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));else list.sort((a,b)=>(b.rating||0)-(a.rating||0));
    grid.setAttribute('aria-busy','true'); grid.innerHTML=list.map(renderProduct).join(''); grid.setAttribute('aria-busy','false'); $('#emptyProducts').hidden=list.length!==0;
    const p=state.preferences; $('#recommendationNote').hidden=!(p.glutenFree||p.lactoseFree||p.vegetarian||p.vegan||p.taste!=='both'||p.temperature!=='any'||String(p.allergies||'').trim());
  }
  function addToCart(productId) {
    const p=byId(productId); if(!p||!p.active||p.stock<=0)return toast('Este produto está indisponível no momento.','error');
    const line=state.cart.find(l=>l.productId===productId); if((line?.qty||0)>=p.stock)return toast(`Só há ${p.stock} unidade(s) de ${p.name}.`,'error');
    if(line)line.qty++;else state.cart.push({productId,qty:1}); state.coupon=''; save(true); renderCart(); renderCatalog(); toast(`${p.name} adicionado à sacola.`);
  }
  function setQty(productId,delta) { const l=state.cart.find(x=>x.productId===productId),p=byId(productId);if(!l||!p)return;const q=l.qty+delta;if(q<1)state.cart=state.cart.filter(x=>x.productId!==productId);else if(q>p.stock)return toast(`Estoque disponível: ${p.stock} unidade(s).`,'error');else l.qty=q;state.coupon='';save(true);renderCart();renderCatalog(); }
  function renderCart() {
    const lines=cartLines(); $('#cartCount').textContent=cartQty();$('#cartHeadingCount').textContent=`(${cartQty()})`;$('#navOrderCount').textContent=state.orders.length;
    $('#cartItems').innerHTML=lines.map(l=>`<div class="cart-line"><img src="assets/${esc(l.product.image||'food-table.jpg')}" alt=""><div class="cart-line-info"><strong>${esc(l.product.name)}</strong><small>${esc(l.product.storeName||state.store.name)}</small><span>${money(unitPrice(l.product))}</span><div class="qty-control"><button type="button" data-cart-qty="${esc(l.productId)}" data-delta="-1" aria-label="Diminuir quantidade de ${esc(l.product.name)}">−</button><span>${l.qty}</span><button type="button" data-cart-qty="${esc(l.productId)}" data-delta="1" aria-label="Aumentar quantidade de ${esc(l.product.name)}">+</button><button type="button" class="remove-line" data-remove-cart="${esc(l.productId)}">Remover</button></div></div><strong class="order-price">${money(unitPrice(l.product)*l.qty)}</strong></div>`).join('');
    const empty=!lines.length; $('#cartEmpty').hidden=!empty;$('#cartSummary').hidden=empty;$('#cartSubtotal').textContent=money(subtotal());$('#cartDelivery').textContent=money(deliveryFee());$('#cartDiscount').textContent=`− ${money(discount())}`;$('#discountRow').hidden=discount()<=0;$('#cartTotalPrice').textContent=money(total());$('#checkoutTotal').textContent=money(total());$('#couponCode').value=state.coupon;
    const stat=$('#couponStatus'); stat.style.color='var(--green)'; stat.textContent=state.coupon?(discount()?`Cupom ${state.coupon} aplicado (${couponRate()} de desconto).`:`Cupom ${state.coupon} inválido para o valor atual.`):'';
  }
  function openLayer(selector,focusSelector) { lastFocused=document.activeElement;$(selector).hidden=false;document.body.style.overflow='hidden';requestAnimationFrame(()=>$(focusSelector||'.close-button',$(selector))?.focus()); }
  function closeLayer(selector) { if($(selector).hidden)return;$(selector).hidden=true; if(['#cartOverlay','#checkoutModal','#productModal','#a11yModal'].every(x=>$(x).hidden))document.body.style.overflow='';if(lastFocused?.focus)lastFocused.focus(); }
  function openCart() { renderCart();openLayer('#cartOverlay','.close-button'); }
  function openCheckout() {
    if(!cartQty())return toast('Adicione pelo menos um produto antes de continuar.','error');
    $('#checkoutName').value=state.profile.name||'';$('#checkoutAddress').value=state.profile.address||'';$('#deliveryDate').min=today();if(!$('#deliveryDate').value||$('#deliveryDate').value<today())$('#deliveryDate').value=today();
    $('#checkoutTotal').textContent=money(total());closeLayer('#cartOverlay');openLayer('#checkoutModal','#checkoutName');
  }
  function finishCheckout(event) {
    event.preventDefault();const form=event.currentTarget;if(!form.reportValidity())return;if($('#deliveryDate').value<today())return toast('Escolha hoje ou uma data futura para a entrega.','error');
    const fd=new FormData(form), lines=cartLines();if(!lines.length)return toast('A sacola está vazia.','error');
    for(const l of lines){if(l.qty>l.product.stock)return toast(`Estoque insuficiente para ${l.product.name}.`,'error');}
    const items=lines.map(l=>({productId:l.productId,name:l.product.name,price:unitPrice(l.product),qty:l.qty,image:l.product.image,storeName:l.product.storeName||state.store.name,storeId:l.product.storeId||'store-tempero'}));
    const sub=subtotal(),delivery=deliveryFee(),disc=discount(),n=state.nextOrderNumber++;
    const order={id:`AF-${String(n).padStart(4,'0')}`,createdAt:new Date().toISOString(),customer:String(fd.get('customer')||'').trim(),address:String(fd.get('address')||'').trim(),deliveryDate:String(fd.get('date')||''),deliveryTime:String(fd.get('time')||''),payment:String(fd.get('payment')||'Pix'),notes:String(fd.get('notes')||'').trim(),items,subtotal:sub,delivery,discount:disc,coupon:state.coupon,total:Math.max(0,Math.round((sub+delivery-disc)*100)/100),status:'Recebido'};
    items.forEach(i=>{const p=byId(i.productId);if(p)p.stock=Math.max(0,p.stock-i.qty);});state.orders.unshift(order);state.profile.name=order.customer||state.profile.name;state.profile.address=order.address||state.profile.address;state.cart=[];state.coupon='';save(true);closeLayer('#checkoutModal');renderAll();view('orders');toast(`Pedido ${order.id} criado! Compra demonstrativa: não há cobrança nem entrega real.`);
  }
  function loadPrefs() { const f=$('#preferencesForm');if(!f)return;Object.entries(state.preferences).forEach(([k,v])=>{const x=f.elements.namedItem(k);if(!x)return;if(x.type==='checkbox')x.checked=!!v;else x.value=v??'';});syncA11y(); }
  function savePrefs(event) { event.preventDefault();const form=event.currentTarget,next={...DEFAULT_PREFS};Object.keys(DEFAULT_PREFS).forEach(k=>{const x=form.elements.namedItem(k);if(x)next[k]=x.type==='checkbox'?x.checked:x.value;});next.allergies=String(new FormData(form).get('allergies')||'').trim();state.preferences=next;applyA11y();save(true);renderCatalog();$('#preferencesStatus').textContent='Preferências salvas neste navegador. O catálogo foi atualizado.';toast('Preferências salvas e aplicadas ao catálogo.'); }
  function resetPrefs() { state.preferences={...DEFAULT_PREFS};applyA11y();loadPrefs();save(true);renderCatalog();$('#preferencesStatus').textContent='Preferências restauradas para o padrão.';toast('Preferências restauradas.'); }
  function syncA11y() { $$('[data-a11y-pref]').forEach(input=>{ const key=input.dataset.a11yPref; if(key in state.preferences) input.checked=!!state.preferences[key]; }); }
  function positionReadingGuide(y) { const guide=$('#readingGuide'); if(!guide||!state.preferences.readingGuide)return;const top=Math.max(0,Math.min(window.innerHeight-30,Number(y)-15));guide.style.top=`${top}px`; }
  function applyA11y() {
    const p=state.preferences, body=document.body;
    body.classList.toggle('large-text',!!p.largeText); body.classList.toggle('high-contrast',!!p.highContrast);
    body.classList.toggle('reduced-motion',!!p.reducedMotion); body.classList.toggle('readable-font',!!p.readableFont);
    body.classList.toggle('relaxed-lines',!!p.relaxedLines); body.classList.toggle('wide-spacing',!!p.wideSpacing);
    body.classList.toggle('highlight-links',!!p.highlightLinks); body.classList.toggle('strong-focus',!!p.strongFocus);
    body.classList.toggle('focus-mode',!!p.focusMode); body.classList.toggle('low-saturation',!!p.lowSaturation);
    body.classList.toggle('large-controls',!!p.largeControls);
    body.classList.toggle('dark-mode',!!p.darkMode); body.classList.toggle('left-align',!!p.leftAlign);
    body.classList.toggle('large-cursor',!!p.largeCursor); body.classList.toggle('grayscale-mode',!!p.grayscale);
    const guide=$('#readingGuide'); if(guide){guide.hidden=!p.readingGuide; if(p.readingGuide&&!guide.style.top)guide.style.top=`${Math.round(window.innerHeight*.45)}px`;}
    syncA11y();
  }
  function updateA11yFromQuick() { ['largeText','highContrast','readableFont','reducedMotion','relaxedLines','wideSpacing','highlightLinks','strongFocus','readingGuide','focusMode','lowSaturation','largeControls','darkMode','leftAlign','largeCursor','grayscale'].forEach(key=>{state.preferences[key]=$$(`[data-a11y-pref="${key}"]`).some(input=>input.checked);});applyA11y();save(true); }
  function resetA11y() { ['largeText','highContrast','readableFont','reducedMotion','relaxedLines','wideSpacing','highlightLinks','strongFocus','readingGuide','focusMode','lowSaturation','largeControls','darkMode','leftAlign','largeCursor','grayscale'].forEach(k=>state.preferences[k]=false);applyA11y();loadPrefs();save(true);toast('Ajustes de acessibilidade restaurados.'); }
  function loadProfile() { const f=$('#profileForm');Object.entries(state.profile).forEach(([k,v])=>{if(f.elements.namedItem(k))f.elements.namedItem(k).value=v||'';}); }
  function saveProfile(e) { e.preventDefault();const d=new FormData(e.currentTarget);state.profile={name:String(d.get('name')||'').trim(),email:String(d.get('email')||'').trim(),phone:String(d.get('phone')||'').trim(),cpf:String(d.get('cpf')||'').trim(),rg:String(d.get('rg')||'').trim(),address:String(d.get('address')||'').trim()};save(true);toast('Cadastro salvo neste navegador.'); }
  function statusClass(s) { return ({'Recebido':'received','Em preparo':'preparing','Saiu para entrega':'delivery','Concluído':'completed','Cancelado':'cancelled'})[s]||''; }
  function pill(s) { return `<span class="status-pill ${statusClass(s)}">${esc(s||'Recebido')}</span>`; }
  function renderOrders() {
    $$('#view-orders [data-order-filter]').forEach(b=>{const on=b.dataset.orderFilter===orderFilter;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on));});let list=[...state.orders];if(orderFilter==='active')list=list.filter(o=>['Recebido','Em preparo','Saiu para entrega'].includes(o.status));if(orderFilter==='completed')list=list.filter(o=>o.status==='Concluído');if(orderFilter==='cancelled')list=list.filter(o=>o.status==='Cancelado');
    $('#ordersList').innerHTML=list.length?list.map(o=>{const f=o.items?.[0]||{};const items=(o.items||[]).map(i=>`${i.qty}× ${i.name}`).join(', ');const canCancel=!['Concluído','Cancelado'].includes(o.status),reorder=['Concluído','Cancelado'].includes(o.status);return `<article class="order-card"><div class="order-card-head"><div><strong>Pedido ${esc(o.id)}</strong><small>Feito em ${esc(fmtDateTime(o.createdAt))} · Entrega: ${esc(fmtDate(o.deliveryDate))}, ${esc(o.deliveryTime)}</small></div>${pill(o.status)}</div><div class="order-items"><img class="order-thumb" src="assets/${esc(f.image||'food-table.jpg')}" alt=""><div class="order-items-main"><strong>${(o.items||[]).length} ${(o.items||[]).length===1?'produto':'produtos'}</strong><small>${esc(items)}</small><small>Pagamento: ${esc(o.payment)} · ${esc(o.address)}</small></div><strong class="order-price">${money(o.total)}</strong></div><div class="order-card-foot"><small>${o.notes?`Observação: ${esc(o.notes)}`:'Obrigado por apoiar pequenos negócios.'}</small><div class="order-card-actions">${canCancel?`<button class="btn btn-outline" type="button" data-cancel-order="${esc(o.id)}">Cancelar pedido</button>`:''}${reorder?`<button class="btn btn-primary" type="button" data-reorder="${esc(o.id)}">Pedir novamente ↻</button>`:''}</div></div></article>`;}).join(''):`<div class="empty-orders"><span aria-hidden="true">♧</span><h3>Nenhum pedido por aqui</h3><p>${esc(({all:'Quando você fizer um pedido, ele aparecerá aqui.',active:'Você não tem pedidos em andamento.',completed:'Ainda não há pedidos finalizados.',cancelled:'Não há pedidos cancelados.'})[orderFilter])}</p><button type="button" class="btn btn-primary" data-view="home">Explorar cardápio →</button></div>`;
  }
  function cancelOrder(orderId) { const o=state.orders.find(x=>x.id===orderId);if(!o||['Concluído','Cancelado'].includes(o.status))return;if(!confirm(`Cancelar o pedido ${orderId}? Os itens serão devolvidos ao estoque da demonstração.`))return;o.status='Cancelado';(o.items||[]).forEach(i=>{const p=byId(i.productId);if(p)p.stock+=Number(i.qty)||0;});save(true);renderAll();toast(`Pedido ${orderId} cancelado.`); }
  function reorder(orderId) { const o=state.orders.find(x=>x.id===orderId);if(!o)return;let added=0;for(const i of o.items||[]){const p=byId(i.productId);if(!p||!p.active||p.stock<=0)continue;const line=state.cart.find(x=>x.productId===p.id);const q=Math.min(Number(i.qty)||1,Math.max(0,p.stock-(line?.qty||0)));if(q>0){if(line)line.qty+=q;else state.cart.push({productId:p.id,qty:q});added+=q;}}if(!added)return toast('Os produtos deste pedido estão indisponíveis.','error');state.coupon='';save(true);renderCart();toast(`${added} item(ns) adicionados à sacola.`);openCart(); }

  function sellerProducts() { const sid=state.store.storeId||'store-tempero';return state.products.filter(p=>p.storeId===sid||p.ownedByCurrentStore===true); }
  function sellerOrders() { const sid=state.store.storeId||'store-tempero';return state.orders.filter(o=>(o.items||[]).some(i=>i.storeId?i.storeId===sid:i.storeName===state.store.name)); }
  function ownItems(o) { const sid=state.store.storeId||'store-tempero';return (o.items||[]).filter(i=>i.storeId?i.storeId===sid:i.storeName===state.store.name); }
  function ownTotal(o) { return Math.round(ownItems(o).reduce((sum,i)=>sum+(Number(i.price)||0)*(Number(i.qty)||0),0)*100)/100; }
  function switchSellerTab(tab) { if(!$(`[data-seller-panel="${tab}"]`))tab='overview';state.sellerTab=tab;save();$$('[data-seller-panel]').forEach(p=>p.hidden=p.dataset.sellerPanel!==tab);$$('[data-seller-tab]').forEach(b=>{const on=b.dataset.sellerTab===tab;b.classList.toggle('selected',on);if(on)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});if(tab==='overview')renderOverview();if(tab==='store')loadStore();if(tab==='products')renderSellerProducts();if(tab==='sales')renderSales();if(tab==='reports')renderReport(); }
  function renderSeller() { $('#sellerStoreName').textContent=state.store.name||'Minha loja';$('#sellerStoreMeta').textContent=state.store.category||'Loja cadastrada';$('#sellerAvatar').textContent=(state.store.logoText||state.store.name||'AF').slice(0,3).toUpperCase();$('#sellerAvatar').style.background=state.store.color||'var(--red)';$('#sellerProductCount').textContent=sellerProducts().filter(p=>p.active).length;$('#sellerToday').textContent=new Date().toLocaleDateString('pt-BR',{dateStyle:'medium'});renderOverview(); }
  function renderOverview() { const orders=sellerOrders().filter(o=>o.status!=='Cancelado');const revenue=orders.reduce((s,o)=>s+ownTotal(o),0);$('#statSales').textContent=money(revenue);$('#statOrders').textContent=sellerOrders().length;$('#statProducts').textContent=sellerProducts().filter(p=>p.active).length;$('#statTicket').textContent=money(orders.length?revenue/orders.length:0);const recent=sellerOrders().slice(0,5);$('#recentSalesTable').innerHTML=recent.length?recent.map(o=>`<tr><td><strong>${esc(o.id)}</strong></td><td>${esc(o.customer)}</td><td>${esc(fmtDate(o.createdAt))}</td><td><strong>${money(ownTotal(o))}</strong></td><td>${pill(o.status)}</td></tr>`).join(''):`<tr><td colspan="5" class="table-empty">Os pedidos desta loja aparecerão aqui.</td></tr>`; }
  function loadStore() { const f=$('#storeForm');Object.entries(state.store).forEach(([k,v])=>{const el=f.elements.namedItem(k);if(el)el.value=v??'';}); }
  function saveStore(e) { e.preventDefault();const d=new FormData(e.currentTarget);state.store={storeId:state.store.storeId||'store-tempero',name:String(d.get('name')||'').trim(),category:String(d.get('category')||'Outros'),address:String(d.get('address')||'').trim(),owner:String(d.get('owner')||'').trim(),phone:String(d.get('phone')||'').trim(),email:String(d.get('email')||'').trim(),cnpj:String(d.get('cnpj')||'').trim(),ownerCpf:String(d.get('ownerCpf')||'').trim(),ownerRg:String(d.get('ownerRg')||'').trim(),color:String(d.get('color')||'#c64032'),logoText:String(d.get('logoText')||'').trim().slice(0,3)};state.products.forEach(p=>{if(p.storeId===state.store.storeId||p.ownedByCurrentStore)p.storeName=state.store.name;});save(true);renderAll();toast('Dados da loja atualizados neste navegador.'); }
  function openProductEditor(p=null) { const f=$('#productForm');f.reset();$('#productId').value=p?.id||'';$('#productModalTitle').textContent=p?'Editar produto':'Cadastrar produto';if(p){$('#productName').value=p.name||'';$('#productPrice').value=p.price??'';$('#productCategory').value=p.category||'Outros';$('#productDescription').value=p.description||'';$('#productImage').value=p.image||'food-table.jpg';$('#productStock').value=p.stock??0;$('#productOffer').value=p.offer??0;['vegetarian','vegan','glutenFree','lactoseFree','sweet','hotMeal'].forEach(k=>{const el=f.elements.namedItem(k);if(el)el.checked=!!p[k];});}else{$('#productStock').value=10;$('#productOffer').value=0;}openLayer('#productModal','#productName'); }
  function saveProduct(e) { e.preventDefault();const f=e.currentTarget;if(!f.reportValidity())return;const d=new FormData(f),old=byId(String(d.get('id')||''));const p={id:old?.id||makeId('prod'),name:String(d.get('name')||'').trim(),price:Math.round(Number(d.get('price'))*100)/100,offer:Math.max(0,Math.min(90,Number(d.get('offer')||0))),category:String(d.get('category')||'Outros'),image:String(d.get('image')||'food-table.jpg'),description:String(d.get('description')||'').trim(),stock:Math.max(0,Math.floor(Number(d.get('stock')||0))),active:old?old.active:true,vegetarian:f.elements.namedItem('vegetarian').checked,vegan:f.elements.namedItem('vegan').checked,glutenFree:f.elements.namedItem('glutenFree').checked,lactoseFree:f.elements.namedItem('lactoseFree').checked,sweet:f.elements.namedItem('sweet').checked,hotMeal:f.elements.namedItem('hotMeal').checked,storeName:state.store.name||'Minha loja',storeId:state.store.storeId||'store-tempero',ownedByCurrentStore:true,rating:old?.rating||4.8};if(!(p.price>0))return toast('Informe um preço maior que zero.','error');if(old)Object.assign(old,p);else state.products.unshift(p);state.cart=state.cart.filter(l=>{const product=byId(l.productId);if(!product)return false;l.qty=Math.min(l.qty,product.stock);return l.qty>0&&product.active;});save(true);closeLayer('#productModal');renderAll();view('seller');switchSellerTab('products');toast(old?'Produto atualizado.':'Produto cadastrado e publicado no catálogo.'); }
  function renderSellerProducts() { const term=($('#sellerProductSearch').value||'').trim().toLocaleLowerCase('pt-BR'),filter=$('#sellerProductStatus').value;let list=sellerProducts().filter(p=>[p.name,p.category,p.description].join(' ').toLocaleLowerCase('pt-BR').includes(term));if(filter==='active')list=list.filter(p=>p.active);if(filter==='inactive')list=list.filter(p=>!p.active);$('#sellerProductsList').innerHTML=list.length?list.map(p=>`<article class="seller-product-row"><img src="assets/${esc(p.image||'food-table.jpg')}" alt=""><div class="seller-product-info"><h3>${esc(p.name)}</h3><p>${esc(p.category)} · ${p.stock} unidades disponíveis${p.offer?` · ${p.offer}% de desconto`:''}</p><div><strong>${money(unitPrice(p))}</strong><span class="mini-status${p.active?'':' off'}">${p.active?'Ativo no catálogo':'Pausado'}</span></div></div><div class="row-actions"><button type="button" data-edit-product="${esc(p.id)}">Editar</button><button type="button" data-toggle-product="${esc(p.id)}">${p.active?'Pausar':'Ativar'}</button><button class="danger" type="button" data-delete-product="${esc(p.id)}">Excluir</button></div></article>`).join(''):`<div class="empty-orders"><h3>Nenhum produto encontrado</h3><p>Altere os filtros ou cadastre um produto.</p><button type="button" class="btn btn-primary" id="emptyNewProduct">+ Novo produto</button></div>`;$('#sellerProductCount').textContent=sellerProducts().filter(p=>p.active).length; }
  function toggleProduct(productId) { const p=byId(productId);if(!p)return;p.active=!p.active;if(!p.active)state.cart=state.cart.filter(l=>l.productId!==productId);save(true);renderAll();switchSellerTab('products');toast(p.active?'Produto voltou ao catálogo.':'Produto pausado no catálogo.'); }
  function deleteProduct(productId) { const p=byId(productId);if(!p)return;if(!confirm(`Excluir "${p.name}"? Pedidos realizados manterão os dados dos itens.`))return;state.products=state.products.filter(x=>x.id!==productId);state.cart=state.cart.filter(x=>x.productId!==productId);state.favorites=state.favorites.filter(x=>x!==productId);save(true);renderAll();switchSellerTab('products');toast('Produto excluído do catálogo.'); }
  function filteredSales() { const term=($('#salesSearch').value||'').trim().toLocaleLowerCase('pt-BR'),status=$('#salesStatus').value,from=$('#salesDateFrom').value,to=$('#salesDateTo').value;return sellerOrders().filter(o=>{const its=ownItems(o),q=[o.id,o.customer,...its.map(i=>i.name)].join(' ').toLocaleLowerCase('pt-BR').includes(term),date=String(o.createdAt||'').slice(0,10);return q&&(status==='all'||o.status===status)&&(!from||date>=from)&&(!to||date<=to);}); }
  function renderSales() { const orders=filteredSales();$('#salesTable').innerHTML=orders.map(o=>`<tr><td><strong>${esc(o.id)}</strong></td><td><strong>${esc(o.customer)}</strong><br><small>${esc(ownItems(o).map(i=>`${i.qty}× ${i.name}`).join(', '))}</small></td><td>${esc(fmtDateTime(o.createdAt))}</td><td>${esc(o.payment)}</td><td><strong>${money(ownTotal(o))}</strong></td><td><select class="status-select" data-order-status="${esc(o.id)}" aria-label="Atualizar status do pedido ${esc(o.id)}">${['Recebido','Em preparo','Saiu para entrega','Concluído','Cancelado'].map(s=>`<option${o.status===s?' selected':''}>${s}</option>`).join('')}</select></td></tr>`).join('');$('#salesEmpty').hidden=orders.length>0; }
  function updateOrderStatus(orderId,status) { const o=state.orders.find(x=>x.id===orderId);if(!o||!['Recebido','Em preparo','Saiu para entrega','Concluído','Cancelado'].includes(status))return;if(o.status==='Cancelado'&&status!=='Cancelado'){toast('Um pedido cancelado não pode ser reaberto.','error');renderSales();return;}if(status==='Cancelado'&&o.status!=='Cancelado'){if(!confirm(`Marcar ${orderId} como cancelado? Os itens serão devolvidos ao estoque.`)){renderSales();return;}(o.items||[]).forEach(i=>{const p=byId(i.productId);if(p)p.stock+=Number(i.qty)||0;});}o.status=status;save(true);renderAll();switchSellerTab('sales');toast(`Status do pedido ${orderId}: ${status}.`); }
  function reportOrders() { const from=$('#reportFrom').value,to=$('#reportTo').value,min=$('#reportMin').value===''?null:Number($('#reportMin').value),max=$('#reportMax').value===''?null:Number($('#reportMax').value),customer=$('#reportCustomer').value.trim().toLocaleLowerCase('pt-BR');return sellerOrders().filter(o=>{if(o.status==='Cancelado')return false;const date=String(o.createdAt||'').slice(0,10),amount=ownTotal(o);return(!from||date>=from)&&(!to||date<=to)&&(min===null||amount>=min)&&(max===null||amount<=max)&&(!customer||String(o.customer).toLocaleLowerCase('pt-BR').includes(customer));}); }
  function renderReport() { $$('[data-report-type]').forEach(b=>{const on=b.dataset.reportType===reportType;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on));});const orders=reportOrders(),revenue=orders.reduce((s,o)=>s+ownTotal(o),0);$('#reportCount').textContent=orders.length;$('#reportRevenue').textContent=money(revenue);$('#reportAverage').textContent=money(orders.length?revenue/orders.length:0);const head=$('#reportHead'),body=$('#reportBody');if(reportType==='sale'){head.innerHTML='<tr><th>Código da venda</th><th>Cliente</th><th>Data</th><th>Pagamento</th><th>Itens</th><th>Valor</th></tr>';body.innerHTML=orders.map(o=>`<tr><td><strong>${esc(o.id)}</strong></td><td>${esc(o.customer)}</td><td>${esc(fmtDate(o.createdAt))}</td><td>${esc(o.payment)}</td><td>${esc(ownItems(o).map(i=>`${i.qty}× ${i.name} (${money(i.price)})`).join(', '))}</td><td><strong>${money(ownTotal(o))}</strong></td></tr>`).join('');}else if(reportType==='customer'){const grouped=new Map();orders.forEach(o=>{const key=o.customer||'Cliente não informado',v=grouped.get(key)||{name:key,count:0,total:0,payments:new Set()};v.count++;v.total+=ownTotal(o);v.payments.add(o.payment||'—');grouped.set(key,v);});head.innerHTML='<tr><th>Cliente</th><th>Pedidos</th><th>Formas de pagamento</th><th>Total de vendas</th></tr>';body.innerHTML=[...grouped.values()].sort((a,b)=>b.total-a.total).map(g=>`<tr><td><strong>${esc(g.name)}</strong></td><td>${g.count}</td><td>${esc([...g.payments].join(', '))}</td><td><strong>${money(g.total)}</strong></td></tr>`).join('');}else{const grouped=new Map();orders.forEach(o=>{const key=String(o.createdAt||'').slice(0,10)||'Data não informada',v=grouped.get(key)||{date:key,count:0,total:0,payments:new Set(),customers:new Set()};v.count++;v.total+=ownTotal(o);v.payments.add(o.payment||'—');v.customers.add(o.customer||'Cliente não informado');grouped.set(key,v);});head.innerHTML='<tr><th>Data</th><th>Pedidos</th><th>Clientes</th><th>Pagamento</th><th>Total de vendas</th></tr>';body.innerHTML=[...grouped.values()].sort((a,b)=>String(b.date).localeCompare(String(a.date))).map(g=>`<tr><td><strong>${esc(fmtDate(g.date))}</strong></td><td>${g.count}</td><td>${esc([...g.customers].join(', '))}</td><td>${esc([...g.payments].join(', '))}</td><td><strong>${money(g.total)}</strong></td></tr>`).join('');}$('#reportEmpty').hidden=body.children.length>0; }
  function exportSales(list,filename='acessifood-vendas.csv') { const rows=[['Pedido','Cliente','Data','Data entrega','Horário','Pagamento','Status','Endereço','Itens','Total da loja']];list.forEach(o=>rows.push([o.id,o.customer,fmtDate(o.createdAt),fmtDate(o.deliveryDate),o.deliveryTime,o.payment,o.status,o.address,ownItems(o).map(i=>`${i.qty}x ${i.name}`).join('; '),ownTotal(o).toFixed(2)]));download(filename,'\ufeff'+rows.map(r=>r.map(csvCell).join(';')).join('\r\n'),'text/csv;charset=utf-8');toast('Arquivo CSV exportado.'); }
  function exportReport() { const orders=reportOrders(),rows=[['Pedido','Cliente','Data','Pagamento','Itens','Status','Valor loja']];orders.forEach(o=>rows.push([o.id,o.customer,fmtDate(o.createdAt),o.payment,ownItems(o).map(i=>`${i.qty}x ${i.name}`).join('; '),o.status,ownTotal(o).toFixed(2)]));download('acessifood-relatorio.csv','\ufeff'+rows.map(r=>r.map(csvCell).join(';')).join('\r\n'),'text/csv;charset=utf-8');toast('Relatório exportado.'); }
  function exportBackup() { download(`acessifood-backup-${today()}.json`,JSON.stringify({app:'AcessiFood',version:2,exportedAt:new Date().toISOString(),state},null,2),'application/json;charset=utf-8');toast('Backup JSON preparado. Guarde o arquivo em local seguro.'); }
  function importBackup(file) { if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const parsed=JSON.parse(String(reader.result||'{}')),incoming=parsed.state||parsed;if(!incoming||!Array.isArray(incoming.products)||!Array.isArray(incoming.orders)||!incoming.profile||!incoming.preferences)throw new Error('Formato inválido');if(!confirm('Restaurar o backup? Os dados atuais neste navegador serão substituídos.'))return;const fb=freshState();state={...fb,...incoming,products:incoming.products,orders:incoming.orders,cart:Array.isArray(incoming.cart)?incoming.cart:[],preferences:{...DEFAULT_PREFS,...incoming.preferences},profile:{...fb.profile,...incoming.profile},store:{...fb.store,...incoming.store},favorites:Array.isArray(incoming.favorites)?incoming.favorites:[]};state.cart=state.cart.filter(l=>byId(l.productId));save(true);applyA11y();renderAll();view(state.currentView||'home');toast('Backup restaurado neste navegador.');}catch(e){toast('Não foi possível importar. Selecione um backup JSON válido do AcessiFood.','error');}finally{$('#importBackup').value='';}};reader.onerror=()=>toast('Erro ao ler o arquivo.','error');reader.readAsText(file); }
  function speakSummary() { if(!('speechSynthesis'in window))return toast('Este navegador não oferece leitura em voz alta.','error');window.speechSynthesis.cancel();const summary={home:'AcessiFood. Explore o cardápio, pesquise pratos, use filtros e adicione produtos à sacola.',about:'Sobre o AcessiFood. O objetivo é reduzir barreiras digitais para quem compra comida online e para pequenos vendedores. A proposta combina acessibilidade ajustável, preferências alimentares, fluxo de compra claro e ferramentas de gestão de loja.',preferences:'Preferências. Configure restrições alimentares e ajustes visuais.',orders:'Meus pedidos. Acompanhe pedidos em andamento e consulte finalizados.',profile:'Cadastro e perfil. Atualize dados de contato e endereço.',seller:'Área do vendedor. Gerencie a loja, produtos, vendas e relatórios.',downloads:'Versão desktop. Você pode baixar o pacote portátil em ZIP e, quando o site estiver publicado em HTTPS, instalar como aplicativo pelo navegador.'};const u=new SpeechSynthesisUtterance(summary[state.currentView]||summary.home);u.lang='pt-BR';speechSynthesis.speak(u);toast('Leitura do resumo iniciada.'); }
  function renderAll() { renderCart();renderCatalog();renderOrders();renderSeller();renderSellerProducts();renderSales();renderReport();$('#navOrderCount').textContent=state.orders.length; }
  function bind() {
    document.addEventListener('click',e=>{
      const backdrop=e.target.closest('.modal-backdrop');if(backdrop){if(backdrop.hasAttribute('data-close-checkout')){closeLayer('#checkoutModal');openCart();return;}if(backdrop.hasAttribute('data-close-product')){closeLayer('#productModal');return;}if(backdrop.hasAttribute('data-close-a11y')){closeLayer('#a11yModal');return;}}
      const el=e.target.closest('button,a');if(!el)return;
      if(el.hasAttribute('data-close-cart'))closeLayer('#cartOverlay');
      if(el.dataset.view){e.preventDefault();view(el.dataset.view);return;}if(el.dataset.viewLink){e.preventDefault();view(el.dataset.viewLink);return;}
      if(el.dataset.scroll){$(el.dataset.scroll)?.scrollIntoView({behavior:state.preferences.reducedMotion?'auto':'smooth'});return;}
      if(el.dataset.addCart){addToCart(el.dataset.addCart);return;}
      if(el.dataset.favorite){const id=el.dataset.favorite;state.favorites=state.favorites.includes(id)?state.favorites.filter(x=>x!==id):[...state.favorites,id];save();renderCatalog();toast(state.favorites.includes(id)?'Adicionado aos favoritos.':'Removido dos favoritos.');return;}
      if(el.dataset.cartQty){setQty(el.dataset.cartQty,Number(el.dataset.delta));return;}if(el.dataset.removeCart){state.cart=state.cart.filter(x=>x.productId!==el.dataset.removeCart);state.coupon='';save(true);renderCart();renderCatalog();return;}
      if(el.hasAttribute('data-close-checkout')){closeLayer('#checkoutModal');openCart();return;}if(el.hasAttribute('data-close-product')){closeLayer('#productModal');return;}if(el.hasAttribute('data-close-a11y')){closeLayer('#a11yModal');return;}
      if(el.dataset.orderFilter){orderFilter=el.dataset.orderFilter;state.orderFilter=orderFilter;save();renderOrders();return;}if(el.dataset.cancelOrder){cancelOrder(el.dataset.cancelOrder);return;}if(el.dataset.reorder){reorder(el.dataset.reorder);return;}
      if(el.dataset.sellerTab){switchSellerTab(el.dataset.sellerTab);return;}if(el.dataset.editProduct){const p=byId(el.dataset.editProduct);if(p)openProductEditor(p);return;}if(el.dataset.toggleProduct){toggleProduct(el.dataset.toggleProduct);return;}if(el.dataset.deleteProduct){deleteProduct(el.dataset.deleteProduct);return;}
      if(el.dataset.reportType){reportType=el.dataset.reportType;state.reportType=reportType;save();renderReport();return;}
      if(el.id==='openCart'){openCart();return;}if(['openA11y','openA11yTop','footerAccess'].includes(el.id)||el.hasAttribute('data-open-a11y')){syncA11y();openLayer('#a11yModal','#quickLarge');return;}if(el.id==='openCheckout'){openCheckout();return;}
      if(['newProductTop','newProductButton','emptyNewProduct'].includes(el.id)){openProductEditor();return;}
      if(el.id==='clearFilters'){$('#searchInput').value='';categoryFilter='Todos';$$('.filter-chip').forEach(b=>{const on=b.dataset.category==='Todos';b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on));});$('#sortSelect').value='recommended';renderCatalog();return;}
      if(el.id==='resetPreferences'){resetPrefs();return;}if(el.id==='resetA11y'){resetA11y();return;}if(el.id==='speakPage'){speakSummary();return;}if(el.id==='stopSpeech'){if('speechSynthesis'in window)window.speechSynthesis.cancel();toast('Leitura por voz interrompida.');return;}if(el.id==='exportSalesCsv'){exportSales(filteredSales());return;}if(el.id==='exportReportCsv'){exportReport();return;}if(el.id==='exportBackup'){exportBackup();return;}
      if(el.id==='menuToggle'){const nav=$('#mainNav'),opened=nav.classList.toggle('mobile-open');el.setAttribute('aria-expanded',String(opened));return;}
    });
    $('#searchInput').addEventListener('input',renderCatalog);$('#sortSelect').addEventListener('change',renderCatalog);
    $('#categoryFilters').addEventListener('click',e=>{const b=e.target.closest('[data-category]');if(!b)return;categoryFilter=b.dataset.category;$$('.filter-chip').forEach(x=>{const on=x===b;x.classList.toggle('selected',on);x.setAttribute('aria-pressed',String(on));});renderCatalog();});
    $('#couponForm').addEventListener('submit',e=>{e.preventDefault();const code=$('#couponCode').value.trim().toUpperCase(),s=subtotal(),valid=(code==='ACESSI10'&&s>=30)||(code==='BEMVINDO5'&&s>=20)||(code==='PRIMEIRA15'&&s>=60);if(!code){state.coupon='';save();renderCart();return;}if(!valid){state.coupon='';save();renderCart();$('#couponStatus').textContent='Cupom inválido ou valor mínimo não atingido.';$('#couponStatus').style.color='var(--red)';return;}state.coupon=code;save();renderCart();toast(`Cupom ${code} aplicado.`);});
    $('#checkoutForm').addEventListener('submit',finishCheckout);$('#preferencesForm').addEventListener('submit',savePrefs);$('#profileForm').addEventListener('submit',saveProfile);$('#storeForm').addEventListener('submit',saveStore);$('#productForm').addEventListener('submit',saveProduct);
    $('#sellerProductSearch').addEventListener('input',renderSellerProducts);$('#sellerProductStatus').addEventListener('change',renderSellerProducts);
    ['salesSearch','salesStatus','salesDateFrom','salesDateTo'].forEach(id=>$('#'+id).addEventListener(id==='salesSearch'?'input':'change',renderSales));['reportFrom','reportTo','reportMin','reportMax','reportCustomer'].forEach(id=>$('#'+id).addEventListener('input',renderReport));
    $('#importBackup').addEventListener('change',e=>importBackup(e.target.files?.[0]));
    document.addEventListener('change',e=>{
      const option=e.target.closest('[data-a11y-pref]');
      if(option){const key=option.dataset.a11yPref;if(key in state.preferences){state.preferences[key]=option.checked;applyA11y();save(true);if($('#preferencesForm')){const status=$('#preferencesStatus');if(status)status.textContent='Ajuste aplicado imediatamente e salvo neste navegador.';}}}
      const s=e.target.closest('[data-order-status]');if(s)updateOrderStatus(s.dataset.orderStatus,s.value);
    });
    document.addEventListener('pointermove',e=>{if(state.preferences.readingGuide)positionReadingGuide(e.clientY);},{passive:true});
    document.addEventListener('focusin',e=>{if(state.preferences.readingGuide){const r=e.target.getBoundingClientRect();if(r.height)positionReadingGuide(r.top+Math.min(r.height/2,20));}});
    window.addEventListener('resize',()=>{if(state.preferences.readingGuide)positionReadingGuide(Math.min(window.innerHeight*.45,window.innerHeight-30));});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('#productModal').hidden)closeLayer('#productModal');else if(!$('#checkoutModal').hidden){closeLayer('#checkoutModal');openCart();}else if(!$('#a11yModal').hidden)closeLayer('#a11yModal');else if(!$('#cartOverlay').hidden)closeLayer('#cartOverlay');return;}if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();view('home');$('#searchInput').focus();}const layer=$$('.modal-layer:not([hidden]),.overlay:not([hidden])').pop();if(e.key==='Tab'&&layer){const f=$$('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])',layer).filter(x=>x.offsetParent!==null);if(f.length){if(e.shiftKey&&document.activeElement===f[0]){e.preventDefault();f.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===f.at(-1)){e.preventDefault();f[0].focus();}}}});
  }
  function setupDesktopInstall() {
    const button = $('#installDesktopBtn');
    const status = $('#installDesktopStatus');
    if (!button || !status) return;
    let deferredPrompt = null;
    const canRegisterWorker = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if ('serviceWorker' in navigator && canRegisterWorker) {
      navigator.serviceWorker.register('./service-worker.js').catch(error => console.warn('Não foi possível preparar o modo offline.', error));
    }
    window.addEventListener('beforeinstallprompt', event => {
      event.preventDefault();
      deferredPrompt = event;
      button.disabled = false;
      button.textContent = 'Instalar AcessiFood';
      status.textContent = 'Seu navegador permite instalar o AcessiFood. Clique no botão para continuar.';
    });
    button.addEventListener('click', async () => {
      if (!deferredPrompt) {
        status.textContent = 'A instalação pelo navegador precisa de um endereço HTTPS, manifesto válido e suporte do navegador. Use o ZIP portátil enquanto isso.';
        return;
      }
      const promptEvent = deferredPrompt;
      deferredPrompt = null;
      button.disabled = true;
      await promptEvent.prompt();
      const result = await promptEvent.userChoice;
      if (result?.outcome === 'accepted') {
        status.textContent = 'Instalação solicitada. Procure o AcessiFood nos aplicativos do computador.';
        toast('Pedido de instalação enviado ao navegador.');
      } else {
        status.textContent = 'A instalação foi cancelada. Você pode continuar usando a versão portátil.';
      }
    });
    window.addEventListener('appinstalled', () => {
      button.disabled = true;
      button.textContent = 'AcessiFood instalado';
      status.textContent = 'Aplicativo instalado neste dispositivo.';
      toast('AcessiFood instalado no computador.');
    });
    if (window.matchMedia('(display-mode: standalone)').matches) {
      button.disabled = true;
      button.textContent = 'AcessiFood instalado';
      status.textContent = 'O AcessiFood está aberto no modo aplicativo.';
    }
  }

  function init() {
    state.cart=state.cart.filter(l=>{const p=byId(l.productId);if(!p||!p.active||p.stock<=0)return false;l.qty=Math.min(Math.max(1,Number(l.qty)||1),p.stock);return true;});
    $('#deliveryDate').min=today();$('#deliveryDate').value=today();applyA11y();loadPrefs();loadProfile();loadStore();bind();renderAll();view('home');
    try{if(!localStorage.getItem(STORAGE_KEY))save();}catch(e){console.warn('Armazenamento local indisponível.',e);}
  }
  setupDesktopInstall();
  document.addEventListener('DOMContentLoaded',init);
})();
