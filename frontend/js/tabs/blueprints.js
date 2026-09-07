// Blueprints tab
const BlueprintsTab={_bps:[],
async render(){document.getElementById('content').innerHTML=
'<h2>◻ Blueprints</h2>'+
'<div class="card mt-2"><div class="card-body">'+
'<div class="flex gap-3 mb-2" id="bpStats">'+
'<div style="flex:1;text-align:center"><div style="font-size:24px;font-weight:bold" id="bpCount">--</div><div class="text-xs text-muted">Blueprints</div></div>'+
'<div style="flex:1;text-align:center"><div style="font-size:24px;font-weight:bold" id="bpPieces">--</div><div class="text-xs text-muted">Total Pieces</div></div>'+
'<div style="flex:1;text-align:center"><div style="font-size:24px;font-weight:bold" id="bpOwners">--</div><div class="text-xs text-muted">Owners</div></div></div>'+
'<div class="flex gap-2 items-center">'+
'<input type="text" class="form-input" id="bpSearch" placeholder="Search blueprints or owners..." style="flex:1;max-width:300px" oninput="BlueprintsTab._filter()">'+
'<button class="btn btn-sm" onclick="BlueprintsTab.importBp()">↓ Import Blueprint</button>'+
'<button class="btn btn-sm" onclick="BlueprintsTab.load()">↻ Refresh</button>'+
'<button class="btn btn-sm btn-primary" onclick="BlueprintsTab.openDesigner()">⬡ Blueprint Designer</button>'+
'<span class="text-xs text-muted" id="bpFilterCount"></span></div></div></div>'+
'<div class="card mt-2"><div class="card-body" id="bpList" style="max-height:550px;overflow:auto"><div class="spinner"></div></div></div>';this.load()},
async load(){try{var r=await api.get('/gameplay/blueprints');this._bps=r.blueprints||[];this._showAll()}catch(e){document.getElementById('bpList').innerHTML='<p class="text-danger text-sm">'+e.message+'</p>'}},
_showAll(){var bps=this._bps;var owners=new Set();var totalPieces=0;
bps.forEach(function(b){owners.add(b.owner_name||b.owner||'?');totalPieces+=parseInt(b.pieces||0)});
document.getElementById('bpCount').textContent=bps.length;
document.getElementById('bpPieces').textContent=totalPieces;
document.getElementById('bpOwners').textContent=owners.size;
document.getElementById('bpFilterCount').textContent=bps.length+' blueprints';
this._render(bps)},
_filter(){var q=(document.getElementById('bpSearch')?.value||'').toLowerCase();
var f=q?this._bps.filter(function(b){return(b.item_id||'').toLowerCase().includes(q)||(b.owner||'').toLowerCase().includes(q)||(b.owner_name||'').toLowerCase().includes(q)}):this._bps;
document.getElementById('bpFilterCount').textContent=f.length+' of '+this._bps.length+' blueprints';this._render(f)},
_render(list){var el=document.getElementById('bpList');
if(!list.length){el.innerHTML='<p class="text-muted text-sm">No blueprints found</p>';return}
el.innerHTML='<table class="data-table"><tr><th>Blueprint</th><th>Owner</th><th>Pieces</th><th>Placeables</th><th>Export</th></tr>'+
list.map(function(b){var name=(b.name||b.item_id||'Blueprint').replace(/_/g,' ').replace('Building BP ','').replace('Choam ','');
return'<tr><td><strong>'+name.substring(0,40)+'</strong><div class="text-xs text-muted">'+(b.item_id||'').substring(0,45)+'</div></td>'+
'<td>'+(b.owner_name||b.owner||'?')+'</td><td>'+b.pieces+'</td><td>'+b.placeables+'</td>'+
'<td><button class="btn btn-sm btn-info" onclick="BlueprintsTab.exportBp('+b.id+')">↑ Export</button></td></tr>'}).join('')+'</table>'},
async exportBp(id){try{var r=await api.get('/gameplay/blueprints/export?id='+id);var d=r.blueprint||r;
var blob=new Blob([JSON.stringify(d,null,2)],{type:'application/json'});var a=document.createElement('a');
a.href=URL.createObjectURL(blob);a.download='exportBase_'+id+'.json';a.click();showToast('Exported blueprint #'+id,'success')}catch(e){showToast(e.message,'error')}},
async importBp(){showToast('Import blueprint - select .json file','info')},
async openDesigner(){showToast('Blueprint Designer - opening...','info');
try{var r=await fetch('/api/v1/gameplay/commands/fix-maps',{method:'POST'});var d=await r.json();showToast(d.message||d.output||'Designer opened','success')}catch(e){showToast(e.message,'error')}},
destroy(){this._bps=[]}};
