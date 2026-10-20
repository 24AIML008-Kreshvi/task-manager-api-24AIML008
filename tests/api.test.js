const test=require('node:test'),assert=require('node:assert/strict'),app=require('../server');let server,base;
test.before(async()=>{server=app.listen(0);await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port});test.after(()=>server.close());
test('GET',async()=>{const r=await fetch(base+'/tasks');assert.equal(r.status,200)});
test('CRUD',async()=>{let r=await fetch(base+'/tasks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'test'})});assert.equal(r.status,201);const x=(await r.json()).task.id;r=await fetch(base+'/tasks/'+x,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'edited'})});assert.equal(r.status,200);r=await fetch(base+'/tasks/'+x,{method:'DELETE'});assert.equal(r.status,200)});
test('errors',async()=>{assert.equal((await fetch(base+'/tasks/abc')).status,400);assert.equal((await fetch(base+'/invalid-page')).status,404)});
