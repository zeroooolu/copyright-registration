/* Customer supplement upload when the operator supplied only a written correction. */
(function(global){
  'use strict';
  function mount(container,store,appNo,onSubmitted,options={}){
    const E=store.escapeHTML,standalone=options.standalone===true;
    const materials=store.MATERIALS.filter(m=>m.key!=='other');
    const allowed='.wav,.mp3,.flac,.m4a,.pdf,.jpg,.jpeg,.png';
    container.innerHTML='<div class="supp-free-head"><strong>'+(standalone?'自主补充材料':'上传补充附件')+'</strong>'+
      '<p>'+(standalone?'当前申请处于待补正阶段，尚无后台指定清单。可以根据已知补正要求上传证件、授权文件或音频，并为每份文件选择附件类型。':
        '根据上方补证说明选择文件，并为每份文件指定附件类型。可以一次添加多份附件。')+'</p></div>'+
      '<div id="suppFreeRows" class="supp-free-rows"></div>'+
      '<button type="button" class="supp-free-add" id="suppFreeAdd">＋ 添加一份附件</button>'+
      (standalone?'<label class="supp-free-note-label" for="suppFreeNote">本次补充说明（选填）</label>'+
      '<textarea class="supp-free-note" id="suppFreeNote" maxlength="500" placeholder="可以简单说明本次补充的材料和原因，方便后台核对"></textarea>':'')+
      '<div class="supp-front-actions"><p class="supp-free-hint" id="suppFreeHint">请上传至少一份附件并选择类型</p>'+
      '<button type="button" id="suppFreeSubmit" class="supp-front-submit" disabled>提交补充材料</button></div>';
    const rows=container.querySelector('#suppFreeRows'),add=container.querySelector('#suppFreeAdd');
    const submit=container.querySelector('#suppFreeSubmit'),hint=container.querySelector('#suppFreeHint');
    let counter=0;
    function check(){
      const nodes=[...rows.querySelectorAll('.supp-free-row')];
      let count=0,ready=nodes.length>0;
      nodes.forEach(row=>{
        const input=row.querySelector('input[type="file"]'),select=row.querySelector('select'),file=input.files?.[0];
        const error=row.querySelector('.supp-free-error'),selected=row.querySelector('.supp-free-file-name');
        selected.textContent=file?'已选择：'+file.name+'（'+(file.size/1024/1024).toFixed(2)+' MB）':'未选择文件';
        let problem='';
        if(file&&select.value){
          try{store.validateAttachmentFile(select.value,file)}catch(err){problem=err.message}
        }
        error.textContent=problem;
        if(file&&select.value&&!problem)count++;
        else ready=false;
      });
      submit.disabled=!ready||count>20;
      hint.textContent=count+' / '+nodes.length+' 份附件填写完整'+(ready?'，可以提交':'；请选择文件和附件类型');
      add.disabled=nodes.length>=20;
    }
    function appendRow(){
      if(rows.children.length>=20)return;
      const id='suppFree'+(++counter);
      const el=document.createElement('div');
      el.className='supp-free-row';
      el.innerHTML='<div class="supp-free-title"><strong>补充附件 '+counter+'</strong><button type="button" class="supp-free-remove">移除</button></div>'+
        '<div class="supp-free-fields">'+
        '<label for="'+id+'File">上传文件 <span>*</span><input id="'+id+'File" type="file" accept="'+allowed+'"></label>'+
        '<label for="'+id+'Type">附件类型 <span>*</span><select id="'+id+'Type"><option value="">请选择附件类型</option>'+
        materials.map(m=>'<option value="'+E(m.key)+'">'+E(m.name)+'</option>').join('')+'</select></label></div>'+
        '<div class="supp-free-file-name">未选择文件</div><div class="supp-free-error" role="alert"></div>';
      el.querySelector('.supp-free-remove').onclick=()=>{el.remove();check()};
      el.querySelector('input[type=file]').onchange=check;
      el.querySelector('select').onchange=check;
      rows.appendChild(el);check();
    }
    add.onclick=appendRow;
    submit.onclick=()=>{
      const entries=[...rows.querySelectorAll('.supp-free-row')].map(row=>({
        key:row.querySelector('select').value,
        file:row.querySelector('input[type=file]').files?.[0]
      }));
      try{
        if(standalone){
          store.submitCustomerCorrection({
            appNo,workTitle:options.workTitle||'',stage:'pending_supplement',
            note:container.querySelector('#suppFreeNote')?.value||'',files:entries
          });
        }else{
          store.submit(appNo,{},entries);
        }
        onSubmitted();
      }catch(err){hint.textContent=err.message}
    };
    appendRow();
  }
  global.CopyrightFreeSupplement={mount};
})(window);
