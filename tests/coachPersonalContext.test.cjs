const {test} = require('node:test');
const assert = require('node:assert/strict');
const load = require('./helpers/loadTs.cjs')();
const {buildCoachPersonalContext} = load('services/coachPersonalContext.ts');
const {lookupWorkoutHistory} = load('services/coachHistoryService.ts');
test('personal context preserves saved profile and inventory and separates planned from completed',()=>{
 const profile={goals:['get_stronger'],notes:'prefer short sessions',injuries:'entered limitation',equipment:['barbell']};
 const equipment={barbells:[{id:'bar',weight:35}],plates:[{weight:5,count:4}],selectedBarbellId:'bar'};
 const activities=[{id:'1',date:'2099-01-01',name:'Squat',completed:false,recurring:{pattern:'weekly'}},{id:'2',date:'2020-01-01',name:'Squat',completed:false},{id:'3',date:'2099-01-02',name:'Bench',completed:true}];
 const context=JSON.parse(buildCoachPersonalContext(profile,equipment,activities,'2026-11-07'));
 assert.deepEqual(context.coachProfile,profile);assert.deepEqual(context.equipmentInventory,equipment);
 assert.equal(context.schedule.plannedActivities,1);assert.equal(context.schedule.pastIncompleteActivities,1);
 const planned=lookupWorkoutHistory(activities,{status:'planned',all:true});
 assert.equal(planned.records.length,1);assert.equal(planned.records[0].recurring.pattern,'weekly');
 assert.equal(lookupWorkoutHistory(activities,{status:'incomplete',all:true}).records.length,2);
 assert.equal(lookupWorkoutHistory(activities,{status:'completed',all:true}).records.length,1);
});
test('missing inventory stays unknown rather than synthesizing defaults',()=>{
 const context=JSON.parse(buildCoachPersonalContext(null,null,[],'2026-11-07'));
 assert.equal(context.coachProfile,null);assert.equal(context.equipmentInventory,null);assert.equal(context.schedule.plannedActivities,0);
});
test('equipment access reads only saved inventory and never exposes fallback defaults',async()=>{
 let saved=null;
 const loader=require('./helpers/loadTs.cjs')({'@react-native-async-storage/async-storage':{getItem:async()=>saved},'../config/api':{API_URL:null,getApiEndpoint:p=>p}});
 const {getSavedCoachEquipment}=loader('services/equipmentService.ts');
 assert.equal(await getSavedCoachEquipment(),null);
 saved=JSON.stringify({barbells:[],plates:[],selectedBarbellId:null});
 assert.deepEqual(await getSavedCoachEquipment(),JSON.parse(saved));
 saved='bad JSON';assert.equal(await getSavedCoachEquipment(),null);
});
