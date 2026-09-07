// Bases tab — one base per row
const BasesTab={_bases:[],
async render(){document.getElementById('content').innerHTML=
'<h2>▣ Bases</h2>'+
'<div class="card mt-2"><div class="card-body">'+
'<div class="flex gap-3 mb-2" id="bsStats">'+
'<div style="flex:1;text-align:center"><div style="font-size:24px;font-weight:bold" id="bsCount">--</div><div class="text-xs text-muted">Bases</div></div>'+
'<div style="flex:1;text-align:center"><div style="font-size:24px;font-weight:bold" id="bsPieces">--</div><div class="text-xs text-muted">Building Pieces</div></div>'+
'<div style="flex:1;text-align:center"><div style="font-size:24px;font-weight:bold" id="bsPlaceables">--</div><div class="text-xs text-muted">Placeables</div></div></div>'+
'<div class="flex gap-2 items-center">'+
'<input type="text" class="form-input" id="bsSearch" placeholder="Search bases..." style="flex:1;max-width:300px" oninput="BasesTab._filter()">'+
'<button class="btn btn-sm" onclick="BasesTab.load()">↻ Refresh</button>'+
'<span class="text-xs text-muted" id="bsFilterCount"></span></div></div></div>'+
'<div class="card mt-2"><div class="card-body" id="bsList" style="max-height:550px;overflow:auto"><div class="spinner"></div></div></div>';this.load()},
async load(){try{var r=await api.get('/gameplay/bases');this._bases=r.bases||[];this._showAll()}catch(e){document.getElementById('bsList').innerHTML='<p class="text-danger text-sm">'+e.message+'</p>'}},
_showAll(){var bases=this._bases;
var totalPieces=0,totalPlaceables=0;bases.forEach(function(b){totalPieces+=b.pieces||0;totalPlaceables+=b.placeables||0});
document.getElementById('bsCount').textContent=bases.length;
document.getElementById('bsPieces').textContent=totalPieces;
document.getElementById('bsPlaceables').textContent=totalPlaceables;
document.getElementById('bsFilterCount').textContent=bases.length+' bases';
this._render(bases)},
_filter(){var q=(document.getElementById('bsSearch')?.value||'').toLowerCase();
var list=q?this._bases.filter(function(b){return(b.name||'').toLowerCase().includes(q)||(b.owner||'').toLowerCase().includes(q)}):this._bases;
document.getElementById('bsFilterCount').textContent=list.length+' of '+this._bases.length+' bases';this._render(list)},
_render(list){var el=document.getElementById('bsList');
if(!list.length){el.innerHTML='<p class="text-muted text-sm">No bases found</p>';return}
el.innerHTML='<table class="data-table"><tr><th>Base</th><th>Owner</th><th>Pieces</th><th>Placeables</th><th>Export</th><th>Release</th></tr>'+
list.map(function(b){var name=b.name||'Base #'+b.id;
var rowId='bsRow'+b.id;
return'<tr id="'+rowId+'" style="cursor:pointer" onclick="BasesTab.toggleSublenne('+b.totem_id+','+b.id+')" onmouseenter="this.style.background=\'var(--bg-primary)\'" onmouseleave="this.style.background=\'\'">'+
'<td><strong>'+name+'</strong><div class="text-xs text-muted">Totem #'+(b.totem_id||'?')+'</div></td>'+
'<td>'+(b.owner||'Unknown')+'</td><td>'+b.pieces+'</td><td>'+b.placeables+'</td>'+
'<td><button class="btn btn-sm btn-info" onclick="event.stopPropagation();BasesTab.exportBase('+b.id+')">↑</button></td>'+
'<td><button class="btn btn-sm btn-danger" onclick="event.stopPropagation();BasesTab.releaseClaim('+b.id+')">× Release</button></td></tr>'+
'<tr id="'+rowId+'Sub" style="display:none"><td colspan="6"><div class="card card-border-blue" style="margin:4px 0"><div class="card-body" style="padding:8px 12px"><span class="text-xs text-muted">Loading Sublenne data...</span></div></div></td></tr>'}).join('')+'</table>'},
async toggleSublenne(totemId,baseId){var subRow=document.getElementById('bsRow'+baseId+'Sub');if(!subRow)return;if(subRow.style.display!=='none'){subRow.style.display='none';return}
subRow.style.display='';if(!totemId)return;
try{var r=await api.get('/gameplay/bases/'+totemId+'/sublenne');var td=subRow.querySelector('td');
var s=r||{};
td.innerHTML='<div class="card card-border-blue" style="margin:4px 0"><div class="card-body" style="padding:8px 12px">'+
'<div class="flex gap-4" style="flex-wrap:wrap">'+
'<div><span class="text-xs text-muted">⏻ Power</span><div class="text-sm">'+(s.power_enabled?'● On':'○ Off')+' (Circuit '+s.power_circuit+')</div></div>'+
'<div><span class="text-xs text-muted">▣ Shelter</span><div class="text-sm">'+Math.round((s.shelter_pct||0)*100)+'%</div></div>'+
'<div><span class="text-xs text-muted">◆ Health</span><div class="text-sm">'+Math.round(s.health||0)+' HP</div></div>'+
'<div><span class="text-xs text-muted">⚙ Machines</span><div class="text-sm">'+(s.fabricators||0)+' Fab | '+(s.refineries||0)+' Ref | '+(s.generators||0)+' Gen</div></div>'+
'<div><span class="text-xs text-muted">□ Base Radius</span><div class="text-sm">'+Math.round(s.radius||0)+'m</div></div>'+
'</div></div></div>';
}catch(e){subRow.querySelector('td').innerHTML='<div class="text-danger text-xs">Error loading Sublenne data</div>'}},
async exportBase(id){showToast('Exporting base #'+id,'info')},
async releaseClaim(id){if(!confirm('△ Release claim for base #'+id+'?'))return;
try{await api.delete('/gameplay/world/bases/'+id);showToast('Claim released!','success');this.load()}catch(e){showToast(e.message,'error')}},
destroy(){this._bases=[]}};
