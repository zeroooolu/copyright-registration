/* MVP certificate batch intake workbench: browser-only interactive demo. */
(()=>{
'use strict';
const C=window.CopyrightCertificate,$=id=>document.getElementById(id),esc=C.esc;
let tab='pending',selected=new Set(),current=null,previewUrl=null,ocrWorker=null,ocrLoader=null,processing=false;
const labels={
 matched:'唯一匹配',review:'信息待核实',unmatched:'未匹配',unreadable:'待识别',conflict:'编号冲突',duplicate:'重复登记号'
};
const shortStatus=r=>r.delivery==='delivered'?'已发放':labels[r.matchStatus]||'待处理';
const badge=r=>r.delivery==='delivered'?'success':r.matchStatus==='matched'?'success':r.matchStatus==='review'||r.matchStatus==='unmatched'?'warn':'error';
function render(){
 const stats=C.stats();
 $('statTotal').textContent=stats.total;$('statMatched').textContent=stats.matched;
 $('statExceptions').textContent=stats.exceptions;$('statDelivered').textContent=stats.delivered;
 const q=$('certSearch').value.trim().toLowerCase();
 const visible=C.all().filter(r=>{
   const inTab=tab==='pending'?r.delivery!=='delivered':tab==='exceptions'?r.delivery!=='delivered'&&r.matchStatus!=='matched':r.delivery==='delivered';
   return inTab&&(!q||[r.fileName,r.regNumber,r.workName,r.owner,r.appId].join(' ').toLowerCase().includes(q));
 });
 const existing=new Set(C.all().filter(r=>r.matchStatus==='matched'&&r.delivery!=='delivered').map(r=>r.id));
 selected=new Set([...selected].filter(x=>existing.has(x)));
 $('certificateRows').innerHTML=visible.length?visible.map(r=>{
   const a=C.app(r.appId),eligible=r.delivery!=='delivered'&&r.matchStatus==='matched';
   return '<tr><td><input type="checkbox" data-check="'+r.id+'" '+(selected.has(r.id)?'checked':'')+' '+(eligible?'':'disabled')+' aria-label="选择证书"></td>'+
     '<td><div class="cert-name">'+esc(r.fileName)+'</div><div class="cert-sub">'+esc(r.createdAt)+' · '+(r.fileSize/1024/1024).toFixed(2)+' MB</div></td>'+
     '<td><div class="cert-name">'+esc(r.regNumber||'—')+'</div><div class="cert-sub">'+(r.recognition==='demo'?'演示数据':r.recognition==='ocr'?'浏览器 OCR':r.recognition==='filename'?'来自文件名':r.recognition==='manual'?'人工修正':'待识别 / 请人工核对')+'</div></td>'+
     '<td><div class="cert-name">'+(a?esc(a.work):'—')+'</div><div class="cert-sub">'+(a?esc(a.id)+' · '+esc(a.owner):esc(r.matchReason))+'</div></td>'+
     '<td><span class="cert-label '+badge(r)+'">'+esc(shortStatus(r))+'</span>'+(r.deliveredAt?'<div class="cert-sub">'+esc(r.deliveredAt)+'</div>':'')+'</td>'+
     '<td><button class="cert-link" data-view="'+r.id+'">'+(r.delivery==='delivered'?'查看':'校对 / 处理')+'</button></td></tr>';
 }).join(''):'<tr><td colspan="6"><div class="cert-empty">此分类暂无记录</div></td></tr>';
 $('resultCount').textContent='当前 '+visible.length+' 条，共 '+stats.total+' 条证书记录';
 $('bulkDeliver').disabled=!selected.size;
 $('bulkDeliver').textContent='确认批量发放（'+selected.size+'）';
 const candidates=visible.filter(r=>r.matchStatus==='matched'&&r.delivery!=='delivered');
 $('certSelectAll').checked=candidates.length>0&&candidates.every(r=>selected.has(r.id));
 $('certSelectAll').disabled=!candidates.length;
 $('certTabs').querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
}
function setProgress(msg){$('uploadProgress').hidden=!msg;$('uploadProgress').textContent=msg||''}
function syncNumbers(ids){
 const result=C.sync(ids);
 const ok=result.filter(r=>r.code==='success').length;
 $('syncInfo').textContent='模拟接口同步：成功 '+ok+' 条，未获得登记号 '+(result.length-ok)+' 条。';
 $('syncResults').innerHTML=result.map(r=>'<div>'+esc(r.id)+' · '+(r.code==='success'?'<span style="color:#218257">'+esc(r.number)+'</span>':esc(r.message))+'</div>').join('');
 C.rematchAll();render();return result;
}
$('syncAll').onclick=()=>syncNumbers(C.applications.map(a=>a.id));
const drop=$('uploadDrop'),input=$('certFiles');
const choose=()=>input.click();
drop.onclick=choose;drop.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();choose()}};
$('chooseFiles').onclick=choose;
drop.ondragover=event=>{event.preventDefault();drop.classList.add('drag')};
drop.ondragleave=()=>drop.classList.remove('drag');
drop.ondrop=event=>{event.preventDefault();drop.classList.remove('drag');processFiles([...event.dataTransfer.files])};
input.onchange=()=>{const fs=[...input.files];input.value='';processFiles(fs)};
function loadTesseract(){
 if(window.Tesseract)return Promise.resolve();
 if(ocrLoader)return ocrLoader;
 ocrLoader=new Promise((resolve,reject)=>{
   const s=document.createElement('script');
   s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
   s.onload=resolve;s.onerror=()=>reject(Error('OCR 组件加载失败，可改用人工录入'));
   document.head.appendChild(s);
 }).catch(err=>{ocrLoader=null;throw err});
 return ocrLoader;
}
async function recognize(id){
 const record=C.getRecord(id);if(!record||record.delivery==='delivered')return;
 const blob=await C.getBlob(id);
 if(!blob)throw Error('本地 PNG 文件已丢失，请重新上传');
 await loadTesseract();
 if(!ocrWorker)ocrWorker=await window.Tesseract.createWorker('chi_sim+eng',1);
 const result=await ocrWorker.recognize(blob);
 const text=result.data?.text||'';
 const detected=C.extractReg(text);
 C.patch(id,{ocrText:text,recognition:'ocr',regNumber:detected||record.regNumber});
 return {text,detected};
}
async function processFiles(files){
 if(processing)return alert('正在处理上一批文件');
 if(!files.length)return;
 if(files.length>100)return alert('每批最多选择 100 张 PNG');
 processing=true;$('chooseFiles').disabled=true;$('demoCert').disabled=true;
 let succeeded=0,errors=[];
 try{
  for(let i=0;i<files.length;i++){
   const file=files[i];
   setProgress('上传第 '+(i+1)+'/'+files.length+' 张：'+file.name+'（保存到当前浏览器）');
   try{
    const record=await C.upload(file);succeeded++;render();
    setProgress('第 '+(i+1)+'/'+files.length+' 张：正在 OCR 识别 '+file.name+'，可能需要加载中文识别组件…');
    try{await recognize(record.id)}
    catch(err){
      C.patch(record.id,{recognition:record.regNumber?'filename':'unavailable'});
      errors.push(file.name+'：'+err.message+'，请人工修正登记号');
    }
    render();
   }catch(err){errors.push(file.name+'：'+err.message)}
  }
 }finally{
   processing=false;$('chooseFiles').disabled=false;$('demoCert').disabled=false;
   setProgress('本批完成：保存 '+succeeded+' 张'+(errors.length?'；提示：'+errors.slice(0,3).join('；'):'。请检查匹配结果并确认发放。'));
 }
}
$('demoCert').onclick=async()=>{
 if(processing)return;
 // All sample properties come from an explicitly labeled demo fixture, not the real government service.
 try{
  if(!C.getReg('CR202510150001'))syncNumbers(['CR202510150001']);
  const w=1100,h=760,canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);
  ctx.strokeStyle='#c6a35b';ctx.lineWidth=12;ctx.strokeRect(16,16,w-32,h-32);
  ctx.lineWidth=2;ctx.strokeRect(33,33,w-66,h-66);
  ctx.textAlign='center';ctx.fillStyle='#333';ctx.font='bold 57px serif';ctx.fillText('作品登记证书 · 演示',w/2,130);
  ctx.textAlign='left';ctx.fillStyle='#1f2835';ctx.font='27px sans-serif';
  ctx.fillText('登记号：沪作登字-2025-S-03886487',105,230);
  ctx.fillText('作品/制品名称：关上世界的窗',105,307);
  ctx.fillText('作品类别：录音制品',105,385);
  ctx.fillText('著作权人：欢唱网络科技（上海）有限公司',105,463);
  ctx.fillText('登记日期：2025年12月15日',105,541);
  ctx.font='21px sans-serif';ctx.fillStyle='#a07732';ctx.fillText('仅供前端流程演示，非真实登记证书',105,655);
  const blob=await new Promise(res=>canvas.toBlob(res,'image/png'));
  if(!blob)throw Error('无法创建演示图片');
  const file=new File([blob],'演示-关上世界的窗.png',{type:'image/png'});
  const record=await C.upload(file);
  C.patch(record.id,{regNumber:'沪作登字-2025-S-03886487',workName:'关上世界的窗',
    owner:'欢唱网络科技（上海）有限公司',recognition:'demo',
    ocrText:'演示预置：沪作登字-2025-S-03886487 / 关上世界的窗'});
  tab='pending';setProgress('已生成演示证书。此登记号与 WorkID 的对应关系为模拟数据；点击「校对 / 处理」查看匹配结果。');
  render();await openDrawer(record.id);
 }catch(err){alert(err.message)}
};
$('certTabs').onclick=ev=>{const b=ev.target.closest('[data-tab]');if(!b)return;tab=b.dataset.tab;selected.clear();render()};
$('certSearch').oninput=render;
$('certSelectAll').onchange=event=>{
 C.all().filter(r=>r.delivery!=='delivered'&&r.matchStatus==='matched').forEach(r=>{
  if(event.target.checked)selected.add(r.id);else selected.delete(r.id);
 });render();
};
$('certificateRows').onclick=ev=>{
 const check=ev.target.closest('[data-check]');if(check){
  if(check.checked)selected.add(check.dataset.check);else selected.delete(check.dataset.check);
  render();return;
 }
 const view=ev.target.closest('[data-view]');if(view)openDrawer(view.dataset.view);
};
async function confirmDelivery(ids){
 if(!ids.length)return;
 for(const id of ids){
  if(!(await C.getBlob(id))){alert('原始 PNG 文件缺失：'+id+'，无法发放');return}
 }
 if(!confirm('即将向 '+ids.length+' 条申请发放证书。请确认已核对作品登记号、作品名称和著作权人。'))return;
 const result=C.deliver(ids);
 if(result.done.length)selected.clear();
 render();
 if(current)await openDrawer(current);
 alert('成功发放 '+result.done.length+' 张'+(result.rejected.length?'；未发放 '+result.rejected.length+' 张：'+result.rejected.map(x=>x.reason).join('；'):''));
}
$('bulkDeliver').onclick=()=>confirmDelivery([...selected]);
function cleanPreview(){if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null}}
async function openDrawer(id){
 cleanPreview();current=id;
 const r=C.getRecord(id);if(!r)return;
 $('certDrawerTitle').textContent=r.fileName;
 $('certDrawerSubtitle').textContent=r.delivery==='delivered'?'已发放 · '+r.deliveredAt:'核对登记号并检查申请信息';
 $('certReg').value=r.regNumber||'';$('certWork').value=r.workName||'';$('certOwner').value=r.owner||'';
 $('certAppSelect').innerHTML='<option value="">选择申请</option>'+C.applications.map(a=>'<option value="'+esc(a.id)+'">'+esc(a.id)+' · '+esc(a.work)+' · '+esc(a.owner)+'</option>').join('');
 $('certAppSelect').value=r.appId||'';
 $('certMatchInfo').textContent=shortStatus(r)+'：'+(r.matchReason||'');
 $('certDrawerHint').textContent=r.appId?'当前匹配：'+r.appId+' · '+C.app(r.appId)?.work+' · '+C.app(r.appId)?.owner:
   '没有可靠的唯一匹配，需核对官方作品登记号，必要时人工绑定申请。';
 $('certOCRResult').textContent=r.ocrText?'OCR / 识别来源：'+r.recognition+' · '+r.ocrText.slice(0,190):'尚无 OCR 文本，可尝试重新识别或手工输入。';
 const readonly=r.delivery==='delivered';
 for(const x of ['certReg','certWork','certOwner','certAppSelect'])$(x).disabled=readonly;
 $('certSave').disabled=readonly;$('certOCR').disabled=readonly;$('certManualBind').disabled=readonly;
 $('certDeliver').disabled=readonly||r.matchStatus!=='matched';
 $('certPreview').innerHTML='<span class="cert-placeholder">正在加载本地证书图片…</span>';
 $('certOverlay').classList.add('open');$('certOverlay').setAttribute('aria-hidden','false');
 try{
  const file=await C.getBlob(id);if(current!==id)return;
  if(file){previewUrl=URL.createObjectURL(file);$('certPreview').innerHTML='<img src="'+previewUrl+'" alt="登记证书预览">'}
  else $('certPreview').innerHTML='<span class="cert-placeholder">原始文件未保存在当前浏览器</span>';
 }catch(err){$('certPreview').innerHTML='<span class="cert-placeholder">'+esc(err.message)+'</span>'}
}
function closeDrawer(){current=null;cleanPreview();$('certOverlay').classList.remove('open');$('certOverlay').setAttribute('aria-hidden','true')}
$('certClose').onclick=closeDrawer;$('certOverlay').onclick=ev=>{if(ev.target===$('certOverlay'))closeDrawer()};
document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&current)closeDrawer()});
function saveRecognition(){
 if(!current)return null;
 const reg=C.extractReg($('certReg').value);
 if(!reg)throw Error('作品登记号格式不正确，请核对证书上的登记号');
 const updated=C.patch(current,{regNumber:reg,workName:$('certWork').value.trim(),owner:$('certOwner').value.trim(),recognition:'manual'});
 render();return updated;
}
$('certSave').onclick=()=>{try{const r=saveRecognition();openDrawer(r.id)}catch(err){alert(err.message)}};
$('certManualBind').onclick=()=>{
 if(!current)return;
 const id=$('certAppSelect').value;if(!id)return alert('请先选择对应的登记申请');
 const a=C.app(id);if(!a)return alert('登记申请不存在');
 try{
  const reg=C.extractReg($('certReg').value);if(!reg)throw Error('请填写有效的作品登记号');
  const prior=C.getReg(id);
  if(!confirm('人工绑定申请 '+id+'（'+a.work+'），将记录作品登记号 '+reg+'。'+(prior?'原登记号 '+prior.number+' 将被覆盖。':'')+' 请确认已核验原证书。'))return;
  C.bindManually(id,reg);
  const r=saveRecognition();openDrawer(r.id);
 }catch(err){alert(err.message)}
};
$('certOCR').onclick=async()=>{
 if(!current)return;
 $('certOCRResult').textContent='正在识别，请保持页面打开…';
 try{
  const r=await recognize(current);
  $('certOCRResult').textContent=r.detected?'已识别：'+r.detected:'OCR 完成但未识别到登记号，请人工核对。';
  render();openDrawer(current);
 }catch(err){$('certOCRResult').textContent='OCR 不可用：'+err.message+'。请根据原图手工录入作品登记号。'}
};
$('certOpenImage').onclick=async()=>{
 if(!current)return;
 const blob=await C.getBlob(current);
 if(!blob)return alert('文件已不可用');
 const url=URL.createObjectURL(blob);window.open(url,'_blank','noopener');
 setTimeout(()=>URL.revokeObjectURL(url),60000);
};
$('certDeliver').onclick=()=>confirmDelivery([current]);
window.addEventListener('copyright-certificate-updated',render);
window.addEventListener('storage',render);
render();
})();