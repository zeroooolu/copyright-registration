(()=>{
  const body=document.body;
  const page=body.dataset.adminPage||'home';
  const title=body.dataset.pageTitle||'首页';
  const parent=body.dataset.pageParent||'';
  const inPages=location.pathname.includes('/pages/');
  const root=inPages?'..':'.';
  const frontendHref=inPages?'../../frontend/star-release/index.html':'../frontend/star-release/index.html';
  const icons={
    home:'<svg viewBox="0 0 24 24"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-9.5Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    applications:'<svg viewBox="0 0 24 24"><path d="M6 3.5h9l3 3V20H6V3.5Z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M15 3.5v3h3M9 10h6M9 14h6M9 18h4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    submissions:'<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 9h8M8 13h8M8 17h5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
  };
  const items=[
    {id:'home',label:'首页',href:root+'/index.html'},
    {id:'applications',label:'登记申请',href:root+'/pages/registration-applications.html'},
    {id:'submissions',label:'提交记录',href:root+'/pages/registration-submissions.html'}
  ];
  const shell=document.getElementById('admin-shell');
  if(!shell)return;
  const crumb=parent?`<span>著作权登记</span><i>›</i><span>${parent}</span><i>›</i><strong>${title}</strong>`:`<span>著作权登记</span><i>›</i><strong>${title}</strong>`;
  shell.innerHTML=`<div class="admin-app"><aside class="admin-sidebar"><a class="admin-brand" href="${root}/index.html" aria-label="星球发行首页"><img src="https://star.kanjian.com/app/release/images/star-logo.png" alt="星球发行"></a><button class="admin-collapse" type="button" aria-label="收起菜单">‹</button><nav class="admin-nav"><div class="admin-nav-label">著作权登记</div>${items.map(i=>`<a class="admin-nav-item${i.id===page?' active':''}" href="${i.href}"><span class="admin-nav-icon">${icons[i.id]}</span><span>${i.label}</span></a>`).join('')}</nav></aside><header class="admin-topbar"><div class="admin-page-title"><div class="admin-breadcrumb">${crumb}</div></div><div class="admin-top-actions"><a class="admin-top-action" href="${frontendHref}" title="查看前台" aria-label="查看前台"><svg viewBox="0 0 24 24"><path d="M7 18h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6.1 9.2 4.5 4.5 0 0 0 7 18Z" fill="currentColor"/><path d="m12 9-3 3h2v4h2v-4h2l-3-3Z" fill="#fff"/></svg></a><span class="admin-top-action" title="帮助文档"><svg viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5v-16ZM20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5v-16Z" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></span><span class="admin-top-action" title="语言"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3.5 12h17M12 3c2.2 2.4 3.3 5.4 3.3 9S14.2 18.6 12 21M12 3C9.8 5.4 8.7 8.4 8.7 12s1.1 6.6 3.3 9" fill="none" stroke="currentColor" stroke-width="1.4"/></svg></span><span class="admin-avatar" title="账号"><svg viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="4" fill="currentColor"/><path d="M5 20c.6-4 3.2-6 7-6s6.4 2 7 6" fill="currentColor"/></svg></span></div></header><main class="admin-main"><div class="admin-content"><div class="admin-content-inner" id="admin-content"></div></div></main></div>`;
  const template=document.getElementById('page-content');
  const target=document.getElementById('admin-content');
  if(template&&target)target.appendChild(template.content.cloneNode(true));
})();