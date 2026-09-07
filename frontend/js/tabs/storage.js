// Storage tab — container browser
const StorageTab={_containers:[],_selId:null,
async render(){document.getElementById('content').innerHTML=
'<h2>□ Storage</h2>'+
'<div class="card mt-2"><div class="card-body">'+
'<div class="flex gap-3 mb-2" id="stStats">'+
'<div style="flex:1;text-align:center"><div style="font-size:24px;font-weight:bold" id="stContainers">--</div><div class="text-xs text-muted">Containers</div></div>'+
'<div style="flex:1;text-align:center"><div style="font-size:24px;font-weight:bold" id="stItems">--</div><div class="text-xs text-muted">Stored Items</div></div>'+
'<div style="flex:1;text-align:center"><div style="font-size:24px;font-weight:bold" id="stPlayers">--</div><div class="text-xs text-muted">Players</div></div></div>'+
'<div class="flex gap-2 items-center">'+
'<input type="text" class="form-input" id="stSearch" placeholder="Search containers, owners, items..." style="flex:1;max-width:300px" oninput="StorageTab._filter()">'+
'<button class="btn btn-sm" onclick="StorageTab.load()">↻ Refresh</button>'+
'<span class="text-xs text-muted" id="stCount"></span></div></div></div>'+
'<div class="card mt-2"><div class="card-body" id="stList" style="max-height:600px;overflow:auto"><div class="spinner"></div></div></div>'+
'<div id="stItemsPanel" style="display:none"><div class="card mt-2 card-border-blue"><div class="card-header card-header-actions"><span>□ Items</span>'+
'<div class="flex gap-1"><button class="btn btn-sm btn-success" onclick="StorageTab.addItem()">+ Add Item</button><button class="btn btn-sm" onclick="StorageTab.refreshItems()">↻</button></div>'+
'</div><div class="card-body" id="stItemsList" style="max-height:400px;overflow:auto"></div></div></div>';this._loadPlayers();this.load()},
async _loadPlayers(){try{var r=await api.get('/gameplay/players');this._players={};(r.players||[]).forEach(function(p){this._players[p.pawn_id]=p.name;this._players[p.controller_id]=p.name;this._players[p.account_id]=p.name}.bind(this))}catch(e){this._players={}}},
_getOwnerName(actorId){if(this._players&&this._players[actorId])return this._players[actorId];return null},
_formatOwner(c){if(c.owner_name&&c.owner_name.indexOf('/Game/')>=0){var m=c.owner_name.match(/BP_(\w+)/);if(m)return m[1]}if(c.owner_name&&c.owner_name!=='World'&&c.owner_name.indexOf('/')<0)return c.owner_name;if(c.account_id&&c.account_id>0){var n=this._getOwnerName(c.account_id);if(n)return n}var n=this._getOwnerName(c.actor||c.actor_id);if(n)return n;return 'World #'+(c.actor||c.actor_id||'?')},
async load(){try{var r=await api.get('/gameplay/storage');this._containers=r.containers||[];this._showAll()}catch(e){document.getElementById('stList').innerHTML='<p class="text-danger text-sm">'+e.message+'</p>'}},
_showAll(){var c=this._containers;var totalItems=0;var players=new Set();var worldContainers=0;
c.forEach(function(x){totalItems+=parseInt(x.items||x.item_count||0);
if(x.account_id&&x.account_id>0)players.add(x.account_id);else worldContainers++});
document.getElementById('stContainers').textContent=c.length;
document.getElementById('stItems').textContent=totalItems;
document.getElementById('stPlayers').textContent=players.size;
document.getElementById('stCount').textContent=c.length+' containers ('+players.size+' players, '+worldContainers+' world)';
this._renderList(c)},
_filter(){var q=(document.getElementById('stSearch')?.value||'').toLowerCase();
var filtered=q?this._containers.filter(function(x){var ownerName=StorageTab._formatOwner(x);return(ownerName||'').toLowerCase().includes(q)||(x.id||'').toString().includes(q)||(x.map||'').toLowerCase().includes(q)}):this._containers;
document.getElementById('stCount').textContent=filtered.length+' of '+this._containers.length+' containers';this._renderList(filtered)},
_renderList(list){var el=document.getElementById('stList');
if(!list.length){el.innerHTML='<p class="text-muted text-sm">No containers found</p>';return}
var typeNames={'0':'Default Inventory','1':'Hotbar','2':'Equipment','3':'Backpack','4':'Storage','12':'Type 12','14':'Storage Container','15':'Module','22':'Large Storage','25':'Vehicle Storage','27':'Type 27','29':'Type 29','30':'Base Storage'};
el.innerHTML='<table class="data-table"><tr><th>Container</th><th>Type</th><th>Owner</th><th>Map</th><th>Items</th></tr>'+
list.map(function(c){var tid=c.type!=null?c.type:(c.inv_type!=null?c.inv_type:'?');var tname=typeNames[tid]||('Type '+tid);
return'<tr style="cursor:pointer" onclick="StorageTab.select('+c.id+')" onmouseenter="this.style.background=\'var(--bg-primary)\'" onmouseleave="this.style.background=\'\'">'+
'<td><strong>#'+c.id+'</strong></td><td>'+tname+'</td>'+
'<td>'+StorageTab._formatOwner(c)+'</td>'+
'<td><span class="text-xs text-muted">'+(c.map||'Hagara Basin')+'</span></td>'+
'<td><span class="badge badge-muted">'+(c.items||c.item_count||0)+' items</span></td></tr>'}).join('')+'</table>'},
async select(id){this._selId=id;document.getElementById('stItemsPanel').style.display='block';await this.refreshItems()},
async refreshItems(){var id=this._selId;if(!id)return;
var el=document.getElementById('stItemsList');el.innerHTML='<div class="spinner"></div>';
try{var r=await api.get('/gameplay/storage/items?id='+id);var items=r.items||[];
if(!items.length){el.innerHTML='<p class="text-muted text-sm">Empty container — no items found</p>';return}
var totalQty=0;items.forEach(function(it){totalQty+=it.stack_size||1});
el.innerHTML='<div class="text-sm mb-2"><strong>'+items.length+'</strong> item types · <strong>'+totalQty+'</strong> total quantity</div>'+
'<table class="data-table"><thead><tr><th>ID</th><th>Template</th><th>Stack</th><th>Quality</th><th>Durability</th><th>Actions</th></tr></thead><tbody>'+
items.map(function(it){return'<tr><td>#'+it.id+'</td><td><code>'+it.template_id+'</code></td><td>'+(it.stack_size||1)+'</td><td>⭐'+(it.quality||0)+'</td><td>'+(it.durability||'N/A')+'</td>'+
'<td><button class="btn btn-sm btn-warning" onclick="StorageTab.deleteItem('+it.id+')">×</button> <button class="btn btn-sm" onclick="StorageTab._editItem('+it.id+','+(it.stack_size||1)+')">✏️</button></td></tr>'}).join('')+'</tbody></table>'
}catch(e){el.innerHTML='<p class="text-danger text-sm">✗ '+e.message+'</p>'}},
async _editItem(itemId,currentStack){var ns=prompt('New stack size:',currentStack);if(ns!==null&&ns!==''){try{await api.post('/gameplay/storage/set-item-stack?item_id='+itemId+'&stack_size='+parseInt(ns));showToast('Updated!','success');this.refreshItems()}catch(e){showToast(e.message,'error')}}},
async addItem(){var id=this._selId;if(!id)return;var t=prompt('Template ID:');var q=prompt('Quantity:','1');var qu=prompt('Quality (0-5):','0');if(t&&q){try{await api.post('/gameplay/storage/give-item?container_id='+id+'&template='+encodeURIComponent(t)+'&qty='+q+'&quality='+qu);showToast('Item added!','success');this.refreshItems()}catch(e){showToast(e.message,'error')}}},
async deleteItem(itemId){if(!confirm('Delete item #'+itemId+'?'))return;try{await api.post('/gameplay/storage/delete-item?item_id='+itemId);showToast('Deleted!','success');this.refreshItems()}catch(e){showToast(e.message,'error')}},
destroy(){this._containers=[];this._selId=null}};
