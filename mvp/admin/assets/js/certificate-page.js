/* Certificate intake and fulfillment actions. File storage follows CopyrightCertificate. */
(()=>{
'use strict';
const C=window.CopyrightCertificate,$=id=>document.getElementById(id),esc=C.esc;
const scopedAppId=new URLSearchParams(location.search).get('app_id'),scopedApp=C.app(scopedAppId);
if(scopedApp){
 $('certUploadTitle').textContent='上传当前申请证书';
 document.querySelector('.cert-header h1').textContent='上传证书 · '+scopedApp.work;
 document.querySelector('.cert-upload-panel .cert-muted').textContent=scopedApp.id+' · PNG · 单张 ≤ 20 MB';
 $('certFiles').multiple=false;
 const back=document.createElement('a');back.className='cert-btn';back.href='registration-application-detail.html?id='+encodeURIComponent(scopedApp.id);back.textContent='返回登记详情';document.querySelector('.cert-header').appendChild(back);
}
let selected=new Set(),current=null,chosenApp='',previewUrl=null,ocrWorker=null,ocrLoader=null,processing=false,drawerReading=false;
const statusText=r=>{
 if(r.delivery==='delivered')return '已发放';
 if(r.matchStatus==='matched')return '待发放';
 if(r.matchStatus==='duplicate')return '重复文件 / 登记号';
 if(r.matchStatus==='review'||r.matchStatus==='conflict')return '待核对';
 if(r.matchStatus==='unmatched')return '未匹配';
 return '待识别';
};
const badge=r=>r.delivery==='delivered'||r.matchStatus==='matched'?'success':
  ['duplicate','conflict'].includes(r.matchStatus)?'error':'warn';
const eligible=r=>r.delivery!=='delivered'&&r.matchStatus==='matched'&&(!scopedApp||r.appId===scopedApp.id);
function visibleRecords(){
 const filter=$('certFilter').value,q=$('certSearch').value.trim().toLowerCase();
 return C.all().filter(r=>{
  if(filter==='pending'&&(r.delivery==='delivered'||r.matchStatus==='matched'))return false;
  if(filter==='matched'&&!eligible(r))return false;
  if(filter==='delivered'&&r.delivery!=='delivered')return false;
  return !q||[r.fileName,r.regNumber,r.appId,C.app(r.appId)?.work||''].join(' ').toLowerCase().includes(q);
 });
}
function render(){
 const all=C.all(),visible=visibleRecords();
 const valid=new Set(all.filter(eligible).map(r=>r.id));
 selected=new Set([...selected].filter(id=>valid.has(id)));
 $('certificateRows').innerHTML=visible.length?visible.map(r=>{
  const app=C.app(r.appId),canDeliver=eligible(r);
  return '<tr><td><input type="checkbox" data-check="'+esc(r.id)+'"'+
    (selected.has(r.id)?' checked':'')+(canDeliver?'':' disabled')+
    ' aria-label="选择可发放证书"></td>'+
    '<td><div class="cert-name">'+esc(r.fileName)+'</div>'+
      '<div class="cert-sub">'+esc(r.createdAt)+' · '+(r.fileSize/1024/1024).toFixed(2)+' MB</div></td>'+
    '<td><div class="cert-name">'+esc(r.regNumber||'—')+'</div></td>'+
    '<td>'+(app?'<div class="cert-name">'+esc(app.work)+'</div><div class="cert-sub">'+esc(app.id)+'</div>':
      '<span class="cert-sub">尚未关联</span>')+'</td>'+
    '<td><span class="cert-tag '+badge(r)+'">'+esc(statusText(r))+'</span></td>'+
    '<td><button type="button" class="cert-link" data-view="'+esc(r.id)+'">'+
      (r.delivery==='delivered'?'查看':'核对')+'</button></td></tr>';
 }).join(''):'<tr><td colspan="6" class="cert-empty">暂无符合条件的记录</td></tr>';
 $('resultCount').textContent='共 '+all.length+' 条'+(visible.length!==all.length?' · 当前显示 '+visible.length+' 条':'');
 const candidates=visible.filter(eligible);
 $('certSelectAll').checked=candidates.length>0&&candidates.every(r=>selected.has(r.id));
 $('certSelectAll').indeterminate=candidates.some(r=>selected.has(r.id))&&!$('certSelectAll').checked;
 $('certSelectAll').disabled=!candidates.length;
 $('bulkDeliver').disabled=!selected.size||processing;
 $('bulkDeliver').textContent='批量发放（'+selected.size+'）';
}
function setProgress(message){
 $('uploadProgress').hidden=!message;
 $('uploadProgress').textContent=message||'';
}
const drop=$('uploadDrop'),input=$('certFiles');
const choose=()=>{if(!processing)input.click()};
drop.onclick=choose;
drop.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();choose()}};
$('chooseFiles').onclick=choose;
drop.ondragover=event=>{event.preventDefault();if(!processing)drop.classList.add('drag')};
drop.ondragleave=()=>drop.classList.remove('drag');
drop.ondrop=event=>{event.preventDefault();drop.classList.remove('drag');if(!processing)processFiles([...event.dataTransfer.files])};
input.onchange=()=>{const files=[...input.files];input.value='';processFiles(files)};
function loadOCR(){
 if(window.Tesseract)return Promise.resolve();
 if(ocrLoader)return ocrLoader;
 ocrLoader=new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  script.src='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
  script.onload=resolve;
  script.onerror=()=>reject(Error('识别组件加载失败'));
  document.head.appendChild(script);
 }).catch(err=>{ocrLoader=null;throw err});
 return ocrLoader;
}
async function recognize(id){
 const record=C.getRecord(id);
 if(!record||record.delivery==='delivered')throw Error('当前证书不可重新识别');
 const blob=await C.getBlob(id);
 if(!blob)throw Error('证书文件不存在');
 await loadOCR();
 if(!ocrWorker)ocrWorker=await window.Tesseract.createWorker('chi_sim+eng',1);
 const result=await ocrWorker.recognize(blob),text=result.data?.text||'';
 const detected=C.extractReg(text),info=C.extractCertificateInfo(text,record.fileName);
 C.patch(id,{ocrText:text,recognition:'ocr',regNumber:detected||record.regNumber,workName:info.workName||record.workName,owner:info.owner||record.owner});
 return detected;
}
async function processFiles(files){
 if(processing)return;
 if(!files.length)return;
 if(scopedApp&&files.length>1){setProgress('当前申请每次只能上传一张证书');return}
 if(files.length>100){setProgress('每批最多上传 100 张 PNG');return}
 processing=true;
 $('chooseFiles').disabled=true;
 let uploaded=0,failed=0,needsReview=0,problems=[];
 try{
  for(let i=0;i<files.length;i++){
   const file=files[i];
   setProgress('正在处理 '+(i+1)+'/'+files.length+'：'+file.name);
   let record;
   try{record=await C.upload(file);uploaded++}
   catch(err){failed++;problems.push(file.name+'：'+err.message);continue}
   render();
   try{
    const number=await recognize(record.id);
    if(!number||C.getRecord(record.id)?.matchStatus!=='matched')needsReview++;
   }catch(err){
    needsReview++;
    // A file-name registration number can still be retained for manual confirmation.
    const latest=C.getRecord(record.id);
    C.patch(record.id,{recognition:latest.regNumber?'filename':'unavailable'});
   }
   render();
   if(scopedApp)await openDrawer(record.id);
  }
 }finally{
  processing=false;$('chooseFiles').disabled=false;
  render();
  setProgress('已上传 '+uploaded+' 张'+(needsReview?' · '+needsReview+' 张需核对登记号':'')+
    (failed?' · '+failed+' 张失败':'')+
    (problems.length?'（'+problems.slice(0,2).join('；')+'）':''));
 }
}
$('certFilter').onchange=()=>{selected.clear();render()};
$('certSearch').oninput=render;
$('certSelectAll').onchange=event=>{
 for(const r of visibleRecords().filter(eligible)){
  if(event.target.checked)selected.add(r.id);else selected.delete(r.id);
 }
 render();
};
$('certificateRows').onclick=event=>{
 const check=event.target.closest('[data-check]');
 if(check){if(check.checked)selected.add(check.dataset.check);else selected.delete(check.dataset.check);render();return}
 const view=event.target.closest('[data-view]');
 if(view)openDrawer(view.dataset.view);
};
function cleanPreview(){
 if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null}
}
function closeDrawer(){
 current=null;cleanPreview();
 $('certOverlay').classList.remove('open');
 $('certOverlay').setAttribute('aria-hidden','true');
}
function describeMatch(record){
 const app=C.app(record.appId),status=statusText(record);
 $('certMatchInfo').className='cert-match-info '+(eligible(record)?'success':record.matchStatus==='duplicate'?'warn':'');
 $('certMatchInfo').textContent=app?
  status+' · '+app.id+' · '+app.work+' · '+app.owner:
  status+' · '+(record.matchReason||'请核对证书并关联申请');
}
async function openDrawer(id){
 cleanPreview();current=id;
 const record=C.getRecord(id);if(!record)return;
 const readonly=record.delivery==='delivered',app=C.app(record.appId);
 $('certDrawerTitle').textContent=record.fileName;
 $('certDrawerSubtitle').textContent=readonly?'发放时间：'+(record.deliveredAt||'—'):'核对登记号与申请信息';
 $('certReg').value=record.regNumber||'';
 chosenApp=app?.id||scopedApp?.id||'';
 $('certAppSearch').value='';
 $('certAppSearch').disabled=readonly||!!scopedApp;
 showAppResults();
 $('certOCRResult').textContent='';
 describeMatch(record);
 $('certReg').disabled=readonly;
 $('certSave').disabled=readonly;$('certOCR').disabled=readonly;
 $('certDelete').disabled=readonly;
 $('certDeliver').disabled=readonly||!eligible(record);
 $('certPreview').innerHTML='<span class="cert-placeholder">正在加载证书…</span>';
 $('certOverlay').classList.add('open');$('certOverlay').setAttribute('aria-hidden','false');
 try{
  const file=await C.getBlob(id);
  if(current!==id)return;
  if(file){previewUrl=URL.createObjectURL(file);$('certPreview').innerHTML='<img src="'+previewUrl+'" alt="登记证书预览">'}
  else $('certPreview').innerHTML='<span class="cert-placeholder">证书文件不可用</span>';
 }catch(err){
  if(current===id)$('certPreview').innerHTML='<span class="cert-placeholder">'+esc(err.message)+'</span>';
 }
}
$('certClose').onclick=closeDrawer;
$('certOverlay').onclick=ev=>{if(ev.target===$('certOverlay'))closeDrawer()};
document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&current)closeDrawer()});
const modified=()=>{$('certDeliver').disabled=true};
$('certReg').oninput=modified;
function showAppResults(){
 const query=$('certAppSearch').value.trim(),matches=C.searchApplications(query);
 const picked=C.app(chosenApp);
 $('certSelectedApp').hidden=!picked;
 $('certSelectedApp').textContent=picked?'已关联：'+picked.id+' · '+picked.work+' · '+picked.owner:'';
 $('certAppResults').innerHTML=!query?'':matches.length?matches.map(a=>
  '<button type="button" class="cert-app-option" data-app="'+esc(a.id)+'"><strong>'+esc(a.work)+
  '</strong><small>'+esc(a.id)+' · '+esc(a.owner)+'</small></button>').join(''):
  '<div class="cert-app-no-results">未找到相关登记申请</div>';
}
$('certAppSearch').oninput=showAppResults;
$('certAppResults').onclick=event=>{
 const option=event.target.closest('[data-app]');
 if(!option)return;
 chosenApp=option.dataset.app;
 $('certAppSearch').value='';
 showAppResults();
 modified();
};
async function saveAndMatch(){
 if(!current)return;
 const record=C.getRecord(current);
 if(!record||record.delivery==='delivered')throw Error('当前证书不可修改');
 if(scopedApp&&chosenApp!==scopedApp.id)throw Error('只能关联当前登记申请');
 const reg=C.extractReg($('certReg').value);
 if(!reg)throw Error('请填写有效的作品登记号');
 const chosen=chosenApp;
 if(chosen){
  const app=C.app(chosen);
  if(!app)throw Error('登记申请不存在');
  const prior=C.getReg(chosen);
  const changing=!prior||C.normalizeReg(prior.number)!==C.normalizeReg(reg);
  if(changing){
   if(!confirm('请核对证书原图中的登记号、作品名称和著作权人，确认将 '+reg+' 关联至 '+app.work+'（'+app.id+'）？'))return null;
   C.bindManually(chosen,reg);
  }
 }
 const result=C.patch(current,{regNumber:reg,recognition:'manual'});
 render();
 await openDrawer(current);
 if(result.matchStatus!=='matched'&&chosen){
  $('certOCRResult').textContent='关联已保存，但匹配尚未通过：'+result.matchReason;
 }
 return result;
}
$('certSave').onclick=async()=>{
 try{await saveAndMatch()}catch(err){alert(err.message)}
};
async function confirmDelivery(ids){
 if(!ids.length)return;
 const candidates=ids.map(id=>C.getRecord(id));
 if(scopedApp&&candidates.some(r=>r?.appId!==scopedApp.id)){alert('只能发放当前登记申请的证书');return}
 if(candidates.some(r=>!r||!eligible(r))){alert('所选记录存在未匹配或已发放的证书，请重新选择');return}
 for(const id of ids){if(!(await C.getBlob(id))){alert('证书原图不存在，不能发放');return}}
 if(!confirm('确认向 '+ids.length+' 条登记申请发放证书？请确保登记号、作品名称、著作权人与原图一致。'))return;
 const result=C.deliver(ids);
 if(result.done.length)selected.clear();
 render();
 if(current&&C.getRecord(current))await openDrawer(current);
 if(scopedApp&&result.done.length){location.href='registration-application-detail.html?id='+encodeURIComponent(scopedApp.id);return}
 alert('已发放 '+result.done.length+' 张'+(result.rejected.length?'，'+result.rejected.length+' 张未发放':''));
}
$('bulkDeliver').onclick=()=>confirmDelivery([...selected]);
$('certDeliver').onclick=()=>confirmDelivery(current?[current]:[]);
$('certDelete').onclick=async()=>{
 if(!current)return;
 const r=C.getRecord(current);
 if(!r||r.delivery==='delivered')return;
 if(!confirm('确定删除「'+r.fileName+'」？删除后无法恢复上传文件。'))return;
 try{await C.remove(current);selected.delete(current);closeDrawer();render()}
 catch(err){alert(err.message)}
};
$('certOCR').onclick=async()=>{
 if(!current||drawerReading)return;
 const id=current;drawerReading=true;$('certOCR').disabled=true;
 $('certOCRResult').textContent='正在识别登记号…';
 try{
  const detected=await recognize(id);
  if(current===id){
   await openDrawer(id);
   $('certOCRResult').textContent=detected?'已识别登记号：'+detected:'未识别到登记号，请手动录入';
  }
  render();
 }catch(err){if(current===id)$('certOCRResult').textContent='无法识别：'+err.message+'。可手动输入登记号。'}
 finally{drawerReading=false;if(current===id&&C.getRecord(id)?.delivery!=='delivered')$('certOCR').disabled=false}
};
$('certOpenImage').onclick=async()=>{
 if(!current)return;
 const tab=window.open('about:blank','_blank');
 if(!tab){alert('新窗口被阻止，请允许此网站打开新窗口');return}
 tab.opener=null;
 try{
  const blob=await C.getBlob(current);
  if(!blob){tab.close();alert('证书文件不可用');return}
  const url=URL.createObjectURL(blob);
  tab.location.replace(url);
  setTimeout(()=>URL.revokeObjectURL(url),120000);
 }catch(err){tab.close();alert('打开证书失败：'+err.message)}
};
async function seedDemoRecords(){
 const rows=[
  {name:'待识别-证书.png',state:'unreadable'},
  {name:'待核对-证书.png',state:'review'},
  {name:'沪作登字-2026-S-00000026-蔷薇写给长街.png',state:'matched',app:'CR202608270026',reg:'沪作登字-2026-S-00000026'},
  {name:'沪作登字-2025-S-03886487-关上世界的窗.png',state:'delivered',app:'CR202510150001',reg:'沪作登字-2025-S-03886487'},
  {name:'重复登记号-示例.png',state:'duplicate',reg:'沪作登字-2025-S-03886487'}
 ];
 for(const item of rows){
  if(C.all().some(record=>record.fileName===item.name))continue;
  if(item.state==='delivered'&&C.getDelivered(item.app))continue;
  try{
  const canvas=document.createElement('canvas');canvas.width=720;canvas.height=960;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#fffdf8';ctx.fillRect(0,0,720,960);
  ctx.strokeStyle='#b79b70';ctx.lineWidth=4;ctx.strokeRect(35,35,650,890);
  ctx.fillStyle='#664b38';ctx.textAlign='center';ctx.font='bold 38px sans-serif';ctx.fillText('作品登记证书',360,170);
  ctx.font='24px sans-serif';ctx.fillText(item.name.replace(/\.png$/,''),360,320);
  ctx.fillStyle='#a66';ctx.fillText('原型示意 · 非正式证书',360,800);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
  if(!blob)continue;
  const record=await C.upload(new File([blob],item.name,{type:'image/png'}));
  if(item.state==='duplicate')C.patch(record.id,{regNumber:item.reg,recognition:'demo'});
  if(item.state==='review')C.patch(record.id,{regNumber:'沪作登字-2026-S-12345678',workName:'待人工核对作品',owner:'待人工核对权利人',recognition:'demo'});
  if(item.app){
   C.bindManually(item.app,item.reg);
   C.patch(record.id,{regNumber:item.reg,workName:C.app(item.app).work,owner:C.app(item.app).owner,recognition:'demo'});
   if(item.state==='delivered')C.deliver([record.id]);
  }
  }catch(err){setProgress('部分示例记录加载失败：'+err.message)}
 }
 render();
}
seedDemoRecords().catch(err=>setProgress('示例记录加载失败：'+err.message));
window.addEventListener('copyright-certificate-updated',render);
window.addEventListener('storage',render);
render();
})();