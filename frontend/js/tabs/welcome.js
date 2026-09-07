// Welcome Kits & Starter Pack — configurable items
const WelcomeTab={_kits:[],_config:null,
async render(){document.getElementById('content').innerHTML=`
<h2>☆ Welcome Kits & Starter Pack</h2>
<div class="tab-nav" id="wkTabs" style="margin-top:8px">
    <div class="tab-nav-item active" onclick="WelcomeTab._showTab('send',event)">📨 Send Kit</div>
    <div class="tab-nav-item" onclick="WelcomeTab._showTab('config',event)">⚙ Configure Kit</div>
</div>
<div id="wkContent"></div>`;
this._config=this._defaultKit();
this._showTab('send')},

_defaultKit(){return [
    {template:'BP_BuildingTool_C',qty:1,quality:0,name:'Building Tool'},
    {template:'BP_RespawnBeacon_C',qty:3,quality:0,name:'Respawn Beacon'},
    {template:'Water',qty:10,quality:0,name:'Water'},
    {template:'CopperOre',qty:50,quality:0,name:'Copper Ore'},
    {template:'IronOre',qty:30,quality:0,name:'Iron Ore'},
    {template:'PlantFiber',qty:50,quality:0,name:'Plant Fiber'},
    {template:'SalvagedMetal',qty:20,quality:0,name:'Salvaged Metal'},
    {template:'FuelCell',qty:5,quality:0,name:'Fuel Cell'},
    {template:'LightAmmo',qty:100,quality:0,name:'Light Ammo'},
    {template:'BP_HealthPack_C',qty:5,quality:0,name:'Health Pack'},
    {template:'WeldingMaterial',qty:10,quality:0,name:'Welding Wire'}
]},

_showTab(tab,ev){
    document.querySelectorAll('#wkTabs .tab-nav-item').forEach(t=>t.classList.remove('active'));
    if(ev?.target)ev.target.classList.add('active');
    var ct=document.getElementById('wkContent');
    if(tab==='send')this._renderSend(ct);
    else this._renderConfig(ct)},

_renderSend(ct){
    ct.innerHTML=`
<div class="card mt-2 card-border-blue"><div class="card-header card-header-actions">
    <span>□ Starter Kit (${this._config.length} items)</span>
    <button class="btn btn-sm btn-success" onclick="WelcomeTab.giveStarter()">☆ Send</button>
</div><div class="card-body">
    <p class="text-muted text-sm mb-2">${this._config.map(function(i){return i.name}).join(', ')}.</p>
    <div class="flex gap-2 items-center">
        <span class="text-xs text-muted">FLS ID:</span>
        <input type="text" class="form-input" id="wkFls" placeholder="FC4D3B70DB35663" value="FC4D3B70DB35663" style="flex:1;max-width:250px">
        <span class="text-xs text-muted">Account ID:</span>
        <input type="text" class="form-input" id="wkAccount" placeholder="1" value="1" style="width:80px">
    </div>
    <div id="wkResult" class="mt-2 text-sm"></div>
</div></div>

<div class="card mt-2 card-border-green"><div class="card-header">⊞ Give Custom Package</div><div class="card-body">
    <div class="flex gap-2 items-center flex-wrap">
        <span class="text-xs text-muted">Template:</span>
        <input type="text" class="form-input" id="pkTemplate" placeholder="HarkAr4" style="width:180px" list="wkTemplateList">
        <datalist id="wkTemplateList"></datalist>
        <span class="text-xs text-muted">Qty:</span>
        <input type="number" class="form-input" id="pkQty" value="1" style="width:60px" min="1">
        <span class="text-xs text-muted">Quality:</span>
        <input type="number" class="form-input" id="pkQuality" value="0" style="width:50px" min="0" max="5">
        <button class="btn btn-sm btn-primary" onclick="WelcomeTab.sendPackage()">⊞ Give</button>
    </div>
    <div id="pkResult" class="mt-2 text-sm"></div>
</div></div>`},

_renderConfig(ct){
    var self=this;
    ct.innerHTML=`
<div class="card mt-2 card-border-orange"><div class="card-header card-header-actions">
    <span>⚙ Kit Configuration</span>
    <div><button class="btn btn-sm btn-primary" onclick="WelcomeTab._saveConfig()">⊞ Save Kit</button>
    <button class="btn btn-sm" onclick="WelcomeTab._addConfigRow()">+ Add Item</button></div>
</div><div class="card-body">
    <p class="text-muted text-sm mb-2">Edit the starter kit items. Changes are saved locally (session only).</p>
    <table class="data-table" id="wkConfigTable">
        <tr><th>Template ID</th><th>Name</th><th>Qty</th><th>Quality</th><th></th></tr>
        ${self._config.map(function(item,idx){return`<tr>
            <td><input type="text" class="form-input" id="wkcTpl${idx}" value="${item.template}" style="width:180px;font-size:11px" onchange="WelcomeTab._updateConfig(${idx},'template',this.value)"></td>
            <td><input type="text" class="form-input" id="wkcName${idx}" value="${item.name}" style="width:160px;font-size:11px" onchange="WelcomeTab._updateConfig(${idx},'name',this.value)"></td>
            <td><input type="number" class="form-input" id="wkcQty${idx}" value="${item.qty}" style="width:60px" onchange="WelcomeTab._updateConfig(${idx},'qty',parseInt(this.value)||1)"></td>
            <td><input type="number" class="form-input" id="wkcQual${idx}" value="${item.quality}" style="width:55px" min="0" max="5" onchange="WelcomeTab._updateConfig(${idx},'quality',parseInt(this.value)||0)"></td>
            <td><button class="btn btn-sm btn-danger" onclick="WelcomeTab._removeConfig(${idx})">×</button></td>
        </tr>`}).join('')}
    </table>
</div></div>
<div class="card mt-2"><div class="card-header">☰ Quick Templates</div><div class="card-body">
    <p class="text-muted text-sm mb-2">Click to add to kit:</p>
    <div style="display:flex;flex-wrap:wrap;gap:4px">${['CopperBar','IronBar','SteelBar','AluminiumBar','CopperOre','IronOre','PlantFiber','GraniteStone','SalvagedMetal','Coal','Sulfur','MelangeSpice','FuelCell','Water','LightAmmo','HeavyAmmo','WeldingMaterial','BP_HealthPack_C','BP_RespawnBeacon_C','BP_BuildingTool_C'].map(function(t){return'<button class="btn btn-sm" onclick="WelcomeTab._quickAdd(\''+t+'\')">'+t+'</button>'}).join('')}</div>
</div></div>`},

_updateConfig(idx,key,val){if(this._config[idx])this._config[idx][key]=val},
_removeConfig(idx){this._config.splice(idx,1);this._showTab('config')},
_addConfigRow(){this._config.push({template:'',name:'New Item',qty:1,quality:0});this._showTab('config')},
_quickAdd(tpl){this._config.push({template:tpl,name:tpl,qty:1,quality:0});this._showTab('config')},
_saveConfig(){showToast('Kit saved ('+this._config.length+' items)','success')},

async giveStarter(){
    const fls=document.getElementById('wkFls')?.value||'FC4D3B70DB35663';
    const accId=document.getElementById('wkAccount')?.value||'1';
    const el=document.getElementById('wkResult');el.innerHTML='<span>◷ Sending starter kit...</span>';
    try{
        var results=[];
        for(var i=0;i<this._config.length;i++){
            var item=this._config[i];
            try{var r=await fetch('/api/v1/gameplay/characters/'+accId+'/give-item',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({template_id:item.template,quantity:item.qty,quality:item.quality})});var d=await r.json();results.push({item:item.name||item.template,ok:d.ok,error:d.message})}catch(e){results.push({item:item.name||item.template,ok:false,error:e.message})}}
        var okCount=results.filter(function(r){return r.ok}).length;
        el.innerHTML='<span class="'+(okCount===results.length?'text-success':'text-warning')+'">✓ Sent '+okCount+'/'+results.length+' items</span>'+results.map(function(r){return'<br><small class="text-xs">'+r.item+': '+(r.ok?'✓':'✗ '+r.error)+'</small>'}).join('')
    }catch(e){el.innerHTML='<span class="text-danger">✗ Error: '+e.message+'</span>'}},

async sendPackage(){
    var accId=document.getElementById('wkAccount')?.value||'1';
    var template=document.getElementById('pkTemplate')?.value;
    var qty=document.getElementById('pkQty')?.value||1;
    var quality=document.getElementById('pkQuality')?.value||0;
    var el=document.getElementById('pkResult');
    if(!template){el.innerHTML='<span class="text-danger">Enter template ID</span>';return}
    el.innerHTML='<span>◷ Sending...</span>';
    try{
        var r=await fetch('/api/v1/gameplay/characters/'+accId+'/give-item',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({template_id:template,quantity:parseInt(qty),quality:parseInt(quality)})});
        var d=await r.json();
        el.innerHTML=d.ok?'<span class="text-success">✓ Item sent!</span>':'<span class="text-danger">✗ '+d.message+'</span>'
    }catch(e){el.innerHTML='<span class="text-danger">✗ Error: '+e.message+'</span>'}},

destroy(){this._kits=[];this._config=null}};
