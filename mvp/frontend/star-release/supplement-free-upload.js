/* Customer supplement upload when the operator supplied only a written correction. */
(function(global){
  'use strict';
  function mount(container,store,appNo,onSubmitted,options={}){
    const E=store.escapeHTML,standalone=options.standalone===true;
    const materials=store.MATERIALS.filter(m=>m.key!=='other'&&m.key!=='authorization');
    const allowed='.wav,.mp3,.flac,.m4a,.pdf,.jpg,.jpeg,.png';
    container.innerHTML='<div id="suppFreeRows" class="supp-free-rows"></div>'+
      '<button type="button" class="supp-free-add" id="suppFreeAdd">＋ 添加附件</button>'+
      '<div class="supp-front-actions"><p class="supp-free-hint" id="suppFreeHint">请选择文件和类型</p>'+
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
        selected.textContent=file?file.name+' · '+(file.size/1024/1024).toFixed(2)+' MB':'';
        let problem='';
        if(file&&select.value){
          try{store.validateAttachmentFile(select.value,file)}catch(err){problem=err.message}
        }
        error.textContent=problem;
        if(file&&select.value&&!problem)count++;
        else ready=false;
      });
      submit.disabled=!ready||count>20;
      hint.textContent=ready?'已选 '+count+' 份附件':'已完成 '+count+'/'+nodes.length+' 份，请选择文件和类型';
      add.disabled=nodes.length>=20;
    }
    function appendRow(){
      if(rows.children.length>=20)return;
      const id='suppFree'+(++counter);
      const el=document.createElement('div');
      el.className='supp-free-row';
      el.innerHTML='<div class="supp-free-title"><strong>附件 '+counter+'</strong><button type="button" class="supp-free-remove">移除</button></div>'+
        '<div class="supp-free-fields">'+
        '<label for="'+id+'File">文件<input id="'+id+'File" type="file" accept="'+allowed+'"></label>'+
        '<label for="'+id+'Type">附件类型<select id="'+id+'Type"><option value="">请选择类型</option>'+
        materials.map(m=>'<option value="'+E(m.key)+'">'+E(m.name)+'</option>').join('')+'</select></label></div>'+
        '<div class="supp-free-file-name"></div><div class="supp-free-error" role="alert"></div>';
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
            files:entries
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
