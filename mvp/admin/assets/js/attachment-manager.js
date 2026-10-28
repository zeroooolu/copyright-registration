/* MVP admin inline file management. Browser-local metadata, no binary upload. */
(function(){
'use strict';
const S=window.CopyrightSupplement;if(!S)return;
const esc=S.escapeHTML;
const appNo=new URLSearchParams(location.search).get('id')||'CR202609030001';
const labels={'作品附件':'audio','证件附件':'identity','原授权书':'authorization','补充授权书':'extra_authorization','代理委托书':'agent_authorization'};
const fields=new Map(),opened=new Set();
document.querySelectorAll('.info-row').forEach(function(row){
 const name=row.querySelector('.k')?.textContent.trim(),key=labels[name];
 if(!key)return;
 const holder=row.querySelector('.v');if(!holder)return;
 const flag=holder.querySelector('[data-flag]');
 const fallback=holder.querySelector('.file-link')?.textContent.trim()||'';
 holder.classList.add('att-file-field');
 fields.set(key,{label:name,holder:holder,flag:flag,fallback:fallback});
});
if(!fields.size)return;
const overlay=document.createElement('div');
overlay.id='attachmentDialog';overlay.className='att-dialog-overlay';
overlay.setAttribute('aria-hidden','true');
overlay.innerHTML='<div class="att-dialog" role="dialog" aria-modal="true" aria-labelledby="attDialogTitle">'
 +'<div class="att-dialog-header"><div><h2 id="attDialogTitle">附件上传</h2><p id="attDialogSubtitle">后台附件管理</p></div><button type="button" class="ra-btn" id="attDialogClose">关闭</button></div>'
 +'<div class="att-dialog-body"><div class="att-dialog-current" id="attDialogCurrent"></div>'
 +'<label class="att-dialog-label" for="attFileInput">选择文件 *</label><input type="file" class="att-dialog-input" id="attFileInput">'
 +'<p class="att-dialog-help" id="attFileHint"></p><label class="att-dialog-label" for="attDialogNote">操作说明（选填）</label>'
 +'<textarea class="att-dialog-textarea" id="attDialogNote" placeholder="例如：根据官方补正意见替换盖章版"></textarea>'
 +'<div class="att-dialog-error" id="attDialogError" aria-live="polite"></div>'
 +'</div>'
 +'<div class="att-dialog-footer"><button type="button" class="ra-btn" id="attDialogCancel">取消</button><button type="button" class="ra-btn primary" id="attDialogConfirm">确认上传</button></div></div>';
document.body.appendChild(overlay);
const $=id=>document.getElementById(id);
let context=null;
function close(){
 overlay.classList.remove('open');overlay.setAttribute('aria-hidden','true');
 $('attFileInput').value='';context=null;
}
function open(key,mode,targetId){
 const field=fields.get(key),data=S.getAttachment(appNo,key,field.fallback);
 const target=data.entries.find(x=>x.id===targetId);
 if(mode==='replace'&&!target){alert('该位置尚无文件，请使用补充上传');return}
 if(S.active(appNo)?.items.some(x=>x.key===key)){alert('该附件尚有未完成的用户补充任务，请先完成复核');return}
 context={key:key,mode:mode,targetId:targetId};
 $('attDialogTitle').textContent=(mode==='replace'?'替换文件 · ':'补充上传 · ')+field.label;
 $('attDialogSubtitle').textContent='登记申请：'+appNo;
 $('attDialogCurrent').textContent=mode==='replace'?'待替换：'+target.name+'（旧版本保留在操作历史）':'保留现有文件，新增上传的附件文件';
 const input=$('attFileInput');
 input.value='';input.multiple=mode==='append';input.accept=S.MATERIALS.find(x=>x.key===key)?.accept||'';
 $('attFileHint').textContent=(mode==='append'?'支持一次选择多个文件。':'每次只替换一个文件。')+' 单文件不得超过 20MB。';
 $('attDialogNote').value='';$('attDialogError').textContent='';
 overlay.classList.add('open');overlay.setAttribute('aria-hidden','false');input.focus();
}
$('attDialogClose').onclick=close;$('attDialogCancel').onclick=close;
overlay.addEventListener('click',ev=>{if(ev.target===overlay)close()});
document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&context)close()});
$('attDialogConfirm').onclick=()=>{
 if(!context)return;
 const files=Array.from($('attFileInput').files||[]);
 if(!files.length){$('attDialogError').textContent='请选择文件';return}
 try{
  S.commitAttachment({appNo:appNo,key:context.key,mode:context.mode,targetId:context.targetId,files:files,
    fallbackName:fields.get(context.key).fallback,note:$('attDialogNote').value.trim(),operator:'后台运营',source:'admin'});
  close();render();
 }catch(err){$('attDialogError').textContent=err.message}
};
function render(){
 fields.forEach((field,key)=>{
  const info=S.getAttachment(appNo,key,field.fallback);
  const blocked=!!S.active(appNo)?.items.some(x=>x.key===key);
  const entries=info.entries.map((file,index)=>{
   return '<div class="att-entry"><div class="att-entry-main"><span aria-hidden="true">📎</span><div class="att-entry-copy">'
     +'<button type="button" class="att-entry-name att-preview" data-att-action="preview" data-att-key="'+key+'" data-att-name="'+esc(file.name)+'">'+esc(file.name)+'</button>'
     +'<span class="att-entry-sub">'+(index===0?'主文件':'补充文件')+' · '+(file.source==='original'?'初始提交':esc(file.operator)+' · '+esc(file.at))+'</span>'
     +'</div></div><div class="att-entry-actions"><button type="button" class="att-small-action" data-att-action="replace" data-att-key="'+key+'" data-att-target="'+esc(file.id)+'" '+(blocked?'disabled':'')+'>替换</button></div></div>';
  }).join('')||'<div class="att-empty">暂无文件</div>';
  const history=opened.has(key)?'<div class="att-history">'+(info.history.length?info.history.map(h=>{
   return '<div class="att-history-item">'+esc(h.at)+' · '+(h.action==='replace'?'替换':'补充上传')+' · '+esc(h.operator)
    +'<div>'+(h.action==='replace'?esc(h.from)+' → ':'')+esc(h.to)+'</div>'
    +(h.note?'<div>备注：'+esc(h.note)+'</div>':'')+'</div>';
  }).join(''):'暂无操作历史')+'</div>':'';
  field.holder.innerHTML='<div class="att-file-stack">'+entries+'<div class="att-field-bottom">'
    +'<button type="button" class="att-upload-btn" data-att-action="append" data-att-key="'+key+'" '+(blocked?'disabled':'')+'>＋ 补充上传</button>'
    +'<button type="button" class="att-history-btn" data-att-action="history" data-att-key="'+key+'">操作历史'+(info.history.length?'（'+info.history.length+'）':'')+'</button>'
    +(blocked?'<span class="att-blocked">当前存在补充任务</span>':'')
    +'</div>'+history+'</div>';
  // Move the original bound "标记需补充" control; preserve its click listener.
  if(field.flag)field.holder.querySelector('.att-field-bottom').appendChild(field.flag);
 });
}
document.addEventListener('click',ev=>{
 const btn=ev.target.closest('button[data-att-action]');if(!btn)return;
 const key=btn.dataset.attKey,action=btn.dataset.attAction;
 if(!fields.has(key))return;
 if(action==='preview'){alert('附件预览演示：'+btn.dataset.attName+'。原型未保存文件本体，实际预览需接入文件服务。')}
 else if(action==='history'){opened.has(key)?opened.delete(key):opened.add(key);render()}
 else if(action==='replace'||action==='append')open(key,action,btn.dataset.attTarget||'');
});
window.addEventListener('copyright-attachments-updated',render);
window.addEventListener('copyright-supplement-updated',render);
window.addEventListener('storage',render);
render();
})();
