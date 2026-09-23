import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { serial, hardwareModel, PRODUCTS } from "../dist/devices.js";
import { readFile, mkdtemp, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

let client, transport, astro, frame, temporary;
async function mock(hardware) {
  const state = { hardware, local: true, assetPath: "/upload_local_asset", calls: [], fail: null, invalid: false, empty: false, noSnapshot: false, timeoutWrite: false };
  const server = http.createServer(async (req,res) => {
    let chunks=[]; for await (const c of req) chunks.push(c);
    const raw=Buffer.concat(chunks);
    if(req.method==="GET") {
      if(req.url.endsWith(".bmp")) { res.writeHead(200,{"Content-Type":"image/bmp"}); res.end(Buffer.from("BMmock-bitmap")); }
      else { res.writeHead(200,{"Content-Type":"image/webp"}); res.end(Buffer.from("RIFF1234WEBP1234")); }
      return;
    }
    if(req.url!=="/divoom_api") {
      state.calls.push({path:req.url,raw});
      res.end(JSON.stringify({ReturnCode:0,ClockId:60001,FileId:"local://example.bin"})); return;
    }
    const body=JSON.parse(raw);
    state.calls.push(body);
    let data={ReturnCode:0,Command:body.Command};
    if(body.Command==="Device/GetHardwareVersion") data={...data,Hardware:state.hardware};
    else if(body.Command==="Device/GetLanCapabilities") data={...data,Hardware:state.hardware,LocalOnly:state.local,LanApiVersion:1,BundleMaxBytes:0,SupportsAssetBundle:false,AssetTransfer:"sequential",LocalAssetUploadPath:state.assetPath,UploadPersistence:"temporary-until-bound",OutboundFileUpload:false};
    else if(body.Command==="Device/GetLocalClockInfo") {
      if(state.invalid) { res.end("truncated {"); return; }
      data={...data,ClockId:60001,ItemList:state.empty?[]:[{item_id:"time",disp:4,font:26}]};
    } else if(body.Command==="Device/GetLocalFontList") data={...data,FontList:[{id:88,AvailableLocally:true}]};
    else if(body.Command==="Device/GetScreenSnapshot") data={...data,snapShotPath:"/userdata/current.bmp"};
    else if(body.Command==="Sys/GetBrightness") data={...data,Brightness:50};
    if(state.noSnapshot && body.Command==="Device/GetScreenSnapshot") delete data.snapShotPath;
    if(state.timeoutWrite && body.Command==="Device/PatchLocalClockInfo") {
      setTimeout(()=>res.end(JSON.stringify(data)),200); return;
    }
    if(state.fail===body.Command) data={ReturnCode:1,ReturnMessage:"fixture failure"};
    if(state.fail==="missing:"+body.Command) data={Brightness:50};
    if(state.fail==="http:"+body.Command) res.statusCode=503;
    res.end(JSON.stringify(data));
  });
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  return {...state, state, server, target:{host:"127.0.0.1",port:server.address().port,timeoutMs:1500}};
}
function call(name,args={}) { return client.callTool({name,arguments:args}); }
function data(result) { assert.ok(!result.isError,result.content?.[0]?.text); return JSON.parse(result.content[0].text); }
before(async()=>{
  astro=await mock(530); frame=await mock(511);
  temporary=await mkdtemp(path.join(os.tmpdir(),"divoom-mcp-test-"));
  transport=new StdioClientTransport({command:process.execPath,args:["dist/index.js"],
    env:{...process.env,DIVOOM_DEVICE_HOST:"",DIVOOM_DEVICE_MODEL:"auto"},stderr:"pipe"});
  client=new Client({name:"tests",version:"1.0"});
  await client.connect(transport);
});
after(async()=>{
  await client?.close();
  astro?.server.close(); frame?.server.close();
  if(temporary) await rm(temporary,{recursive:true,force:true});
});
test("identify each target by Hardware; no model leaks across devices",async()=>{
  const [a,f]=await Promise.all([call("watchface_get_device_info",{target:astro.target}),call("watchface_get_device_info",{target:frame.target})]);
  const ad=data(a),fd=data(f);
  assert.equal(ad.model,"astrotoo"); assert.equal(fd.model,"timesframe");
  assert.equal(ad.resourceDirectory,"astrotoo"); assert.equal(fd.resourceDirectory,"timesframe");
  assert.deepEqual(ad.mcpFilePolicy,{localAssetUploadPath:"/upload_local_asset",genericUpload:"temporary-until-bound",createPatchUpload:"temporary-until-processed",outboundFileUpload:false});
  assert.deepEqual(fd.mcpFilePolicy,{genericUpload:"disabled",createPatchUpload:"temporary-until-processed",outboundFileUpload:false});
  assert.equal(astro.state.calls[0].Command,"Device/GetHardwareVersion");
  assert.equal(frame.state.calls[0].Command,"Device/GetHardwareVersion");
});
test("unknown hardware and mismatched manual overrides are rejected",async()=>{
  astro.state.hardware=999;
  assert.equal((await call("watchface_get_device_info",{target:astro.target})).isError,true);
  astro.state.hardware=530;
  assert.equal((await call("watchface_get_device_info",{target:{...astro.target,model:"timesframe"}})).isError,true);
  assert.throws(()=>hardwareModel(500),/Unsupported device Hardware/);
  for(const hardware of [510,511,512]) assert.equal(hardwareModel(hardware),"timesframe");
});
test("re-query hardware after an address changes product",async()=>{
  astro.state.hardware=510;
  assert.equal(data(await call("watchface_get_device_info",{target:astro.target})).model,"timesframe");
  astro.state.hardware=530;
});
test("old AstroToo cannot write without a local capability declaration",async()=>{
  astro.state.local=false;
  const n=astro.state.calls.length;
  assert.equal((await call("watchface_set_brightness",{target:astro.target,brightness:40})).isError,true);
  assert.ok(!astro.state.calls.slice(n).some(c=>c.Command==="Channel/SetBrightness"));
  astro.state.local=true;
});
test("invalid, failed and empty prechecks never issue a patch",async()=>{
  for(const mode of ["invalid","empty","failure"]) {
    astro.state.invalid=mode==="invalid"; astro.state.empty=mode==="empty";
    astro.state.fail=mode==="failure"?"Device/GetLocalClockInfo":null;
    const n=astro.state.calls.length;
    assert.equal((await call("watchface_patch_local",{target:astro.target,itemPatchList:[{index:0,patch:{size:32}}]})).isError,true);
    assert.ok(!astro.state.calls.slice(n).some(c=>c.Command==="Device/PatchLocalClockInfo"));
  }
  astro.state.invalid=false;astro.state.empty=false;astro.state.fail=null;
});
test("AstroToo background bytes use validated multipart instead of DeviceImageUrl",async()=>{
  const n=astro.state.calls.length;
  const result=await call("watchface_patch_local",{
    target:astro.target,clockId:60001,deviceImageUrl:"local://temporary.bin",
  });
  assert.equal(result.isError,true);
  assert.match(result.content[0].text,/dialAssetsPath/);
  assert.ok(!astro.state.calls.slice(n).some(c=>
    c.Command==="Device/GetLocalClockInfo" || c.Command==="Device/PatchLocalClockInfo"));
});
test("HTTP, business failure and missing success codes are MCP errors",async()=>{
  for(const fail of ["Sys/GetBrightness","missing:Sys/GetBrightness","http:Sys/GetBrightness"]) {
    astro.state.fail=fail;
    assert.equal((await call("watchface_get_brightness",{target:astro.target})).isError,true);
  }
  astro.state.fail=null;
});
test("AstroToo JSON bound counts UTF-8 bytes, including protocol fields",async()=>{
  const command="Device/GetLocalClockInfo";
  const overhead=Buffer.byteLength(JSON.stringify({Text:"",Command:command,ReturnCode:0}));
  const text="a".repeat(65536-overhead);
  data(await call("watchface_raw_command",{target:astro.target,command,payload:{Text:text}}));
  const n=astro.state.calls.length;
  assert.equal((await call("watchface_raw_command",{target:astro.target,command,payload:{Text:text+"中"}})).isError,true);
  assert.equal(astro.state.calls.slice(n).filter(c=>c.Command===command).length,0);
});
test("dedicated cloud reset stays disabled while raw product commands pass through",async()=>{
  assert.equal((await call("watchface_reset_local_then_cloud",{target:astro.target,clockId:22})).isError,true);
  assert.ok(!astro.state.calls.some(c=>c.Command==="Device/ResetLocalClockFromServer"));
  data(await call("watchface_raw_command",{target:astro.target,command:"Photo/GetPhotoList",payload:{ClockId:411778,StartNum:1,EndNum:100}}));
  assert.equal(astro.state.calls.at(-1).Command,"Photo/GetPhotoList");
});
test("templates, typography and fonts follow the target",async()=>{
  const a=data(await call("watchface_layout_suggest",{target:astro.target,disp:4}));
  const f=data(await call("watchface_layout_suggest",{target:frame.target,disp:4}));
  assert.deepEqual(a.canvas,{width:480,height:480}); assert.equal(a.suggestedItemFields,null);
  assert.deepEqual(f.canvas,{width:800,height:1280});
  const templates=data(await call("watchface_template_search",{target:astro.target}));
  assert.equal(templates.templates.length,8);
  const fonts=data(await call("watchface_font_catalog",{target:astro.target}));
  assert.equal(fonts.fonts.find(font=>font.id===88).AvailableLocally,true);
  const resource=await client.readResource({uri:"divoom://astrotoo/watchface/example-minimal"});
  assert.ok(JSON.parse(resource.contents[0].text).ItemList[0].w<=480);
});
test("clock ids, names, fonts and element semantics stay product-specific",async()=>{
  const astroCatalog=data(await call("watchface_clock_catalog",{
    target:astro.target,clockIds:[101],defaultOnly:true,includeConfig:true,
  }));
  assert.equal(astroCatalog.counts.configurations,1042);
  assert.equal(astroCatalog.counts.defaults,356);
  assert.equal(astroCatalog.clocks[0].clockId,101);
  assert.equal(astroCatalog.clocks[0].nameEn,"NBA Rank");
  assert.equal(astroCatalog.clocks[0].config.ClockId,101);
  assert.ok(astroCatalog.clocks[0].fonts.includes(28));
  const frameCatalog=data(await call("watchface_clock_catalog",{target:frame.target,nameContains:"NBA Rank"}));
  assert.equal(frameCatalog.model,"timesframe");
  assert.equal(frameCatalog.clocks.length,0);
  const frameWithConfig=data(await call("watchface_clock_catalog",{target:frame.target,limit:1,includeConfig:true}));
  assert.equal(frameWithConfig.clocks[0].config.ClockId,frameWithConfig.clocks[0].clockId);
  const resource=await client.readResource({uri:"divoom://astrotoo/clocks/catalog"});
  assert.equal(JSON.parse(resource.contents[0].text).counts.configurations,1042);
  const products=await client.readResource({uri:"divoom://products/catalog"});
  const registry=JSON.parse(products.contents[0].text).products;
  assert.deepEqual(registry.timesframe.hardware,[...PRODUCTS.timesframe.hardware]);
  assert.equal(registry.astrotoo.directory,PRODUCTS.astrotoo.resourceDir);
});
test("single-device precheck and patch remain adjacent",async()=>{
  const n=astro.state.calls.length;
  const results=await Promise.all([1,2].map(size=>call("watchface_patch_local",{target:astro.target,itemPatchList:[{index:0,patch:{size}}]})));
  results.forEach(data);
  const commands=astro.state.calls.slice(n).map(c=>c.Command).filter(c=>/LocalClockInfo$/.test(c));
  assert.deepEqual(commands,["Device/GetLocalClockInfo","Device/PatchLocalClockInfo","Device/GetLocalClockInfo","Device/PatchLocalClockInfo"]);
});
test("independent device queues run while another target is blocked; errors release queues",async()=>{
  let release;
  const gate=new Promise(r=>release=r);
  const order=[];
  const p=serial(astro.target,async()=>{order.push("a");await gate;order.push("a-end");throw Error("expected");});
  const p2=serial(astro.target,async()=>order.push("b"));
  await serial(frame.target,async()=>order.push("f"));
  assert.deepEqual(order,["a","f"]);
  release(); await assert.rejects(p); await p2;
  assert.deepEqual(order,["a","f","a-end","b"]);
});
test("multipart uses dedicated local asset route, local command, and explicit part lengths",async()=>{
  const file=path.join(temporary,"image.webp"); await writeFile(file,"RIFF1234WEBPpayload");
  data(await call("watchface_upload_file",{target:astro.target,filePath:file,metadata:{Command:"Cloud/Upload"}}));
  const upload=astro.state.calls.findLast(c=>c.path==="/upload_local_asset");
  assert.ok(upload);
  assert.ok(upload.raw.includes(Buffer.from('"Command":"Device/UploadLocalAsset"')));
  assert.equal([...upload.raw.toString().matchAll(/Content-Length:/g)].length,2);
  assert.equal(astro.state.calls.some(c=>c.path==="/upload"),false);
});
test("AstroToo asset upload requires firmware to advertise the dedicated route",async()=>{
  const file=path.join(temporary,"upgrade-required.webp"); await writeFile(file,"RIFF1234WEBPpayload");
  astro.state.assetPath=undefined;
  const before=astro.state.calls.length;
  const result=await call("watchface_upload_file",{target:astro.target,filePath:file,metadata:{}});
  assert.equal(result.isError,true);
  assert.match(result.content[0].text,/dedicated local asset upload route/);
  assert.equal(astro.state.calls.slice(before).some(c=>c.path==="/upload_local_asset"||c.path==="/upload"),false);
  astro.state.assetPath="/upload_local_asset";
});
test("TimesFrame generic upload is blocked before a file reaches the device",async()=>{
  const file=path.join(temporary,"frame-image.webp"); await writeFile(file,"RIFF1234WEBPpayload");
  const before=frame.state.calls.length;
  const result=await call("watchface_upload_file",{
    target:frame.target,filePath:file,metadata:{Command:"Device/UploadLocalAsset"},
  });
  assert.equal(result.isError,true);
  assert.match(result.content[0].text,/generic \/upload is disabled/);
  assert.equal(frame.state.calls.length,before+1);
  assert.equal(frame.state.calls.at(-1).Command,"Device/GetHardwareVersion");
});
test("AstroToo rejects archives and creates with sequential local asset references",async()=>{
  const archive=path.join(temporary,"clock_bg.tar.gz");
  await writeFile(archive,Buffer.from([0x1f,0x8b,0x08,0x00]));
  const beforeArchive=astro.state.calls.length;
  assert.equal((await call("watchface_create_local_clock",{
    target:astro.target,imagePath:archive,
    metadata:{DialAssets:"bundle",ItemList:[],ItemIdList:[]},
  })).isError,true);
  assert.ok(!astro.state.calls.slice(beforeArchive).some(c=>c.path==="/create_local_clock"));

  const background=path.join(temporary,"clock_bg.webp");
  await writeFile(background,"RIFF1234WEBPpayload");
  data(await call("watchface_create_local_clock",{
    target:astro.target,imagePath:background,
    metadata:{DialAssets:"image",ItemList:[{item_id:"hour",image_addr:"local://hour.bin"}],ItemIdList:["hour"]},
  }));
  const create=astro.state.calls.findLast(c=>c.path==="/create_local_clock");
  assert.ok(create.raw.includes(Buffer.from('"DialAssets":"image"')));
  assert.ok(create.raw.includes(Buffer.from('"image_addr":"local://hour.bin"')));
});
test("snapshot downloads the path returned by this capture",async()=>{
  const result=data(await call("watchface_get_screen_snapshot",{target:astro.target,waitMs:0}));
  assert.equal(result.ok,true);assert.equal(result.format,"bmp");assert.ok(result.snapshotHttpUrl.endsWith("/userdata/current.bmp"));
});
test("clock select keeps the legacy payload and isolates the TimesFrame schedule override",async()=>{
  const tools=await client.listTools();
  assert.ok(tools.tools.some(t=>t.name==="watchface_get_device_info"));
  const beforeFrame=frame.state.calls.length;
  data(await call("watchface_set_clock_select",{target:frame.target,clockId:24}));
  const frameSelects=frame.state.calls.slice(beforeFrame).filter(c=>c.Command==="Channel/SetClockSelectId");
  assert.equal(frameSelects.length,2);
  for(const request of frameSelects)
    assert.deepEqual(Object.keys(request).sort(),["ClockId","Command","ReturnCode"]);

  const beforeAstro=astro.state.calls.length;
  data(await call("watchface_set_clock_select",{target:astro.target,clockId:24}));
  assert.equal(astro.state.calls.slice(beforeAstro).filter(c=>c.Command==="Channel/SetClockSelectId").length,1);

  data(await call("watchface_set_clock_select",{target:frame.target,clockId:25,sysUpdateTime:123}));
  assert.equal(frame.state.calls.at(-1).SysUpdateTime,123);
  const tf=await client.readResource({uri:"divoom://watchface/example-minimal"});
  assert.equal(JSON.parse(tf.contents[0].text).ItemList[0].w,600);
});


test("raw patch obeys the same read precheck",async()=>{
  astro.state.empty=true;
  const n=astro.state.calls.length;
  assert.equal((await call("watchface_raw_command",{target:astro.target,command:"Device/PatchLocalClockInfo",payload:{ClockId:22}})).isError,true);
  assert.ok(!astro.state.calls.slice(n).some(c=>c.Command==="Device/PatchLocalClockInfo"));
  astro.state.empty=false;
});
test("missing capture path is an error, never a stale-file fallback",async()=>{
  astro.state.noSnapshot=true;
  assert.equal((await call("watchface_get_screen_snapshot",{target:astro.target,waitMs:0})).isError,true);
  astro.state.noSnapshot=false;
});
test("timed out writes are sent once and the target queue is released",async()=>{
  astro.state.timeoutWrite=true;
  const n=astro.state.calls.length;
  assert.equal((await call("watchface_patch_local",{target:{...astro.target,timeoutMs:75},itemPatchList:[{index:0,patch:{size:30}}]})).isError,true);
  assert.equal(astro.state.calls.slice(n).filter(c=>c.Command==="Device/PatchLocalClockInfo").length,1);
  astro.state.timeoutWrite=false;
  data(await call("watchface_get_brightness",{target:astro.target}));
});
