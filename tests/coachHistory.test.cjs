const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./helpers/loadTs.cjs')();
const {buildHistoryOverview,lookupWorkoutHistory} = load('services/coachHistoryService.ts');
const records = Array.from({length:45},(_,i)=>({id:String(i),name:'Squat',date:`2020-01-${String(i%28+1).padStart(2,'0')}`,completed:false,sets:[{id:'s',completed:true,weight:i,reps:5,band:'red',time:0,notes:'local note'}]}));
test('overview covers old history and invalidates on immutable edits',()=>{
 assert.equal(JSON.parse(buildHistoryOverview(records)).activities,45);
 assert.equal(JSON.parse(buildHistoryOverview([...records,{...records[0],date:'2026-11-07'}])).lastDate,'2026-11-07');
});
test('lookup pages exact local sets and aggregates all matches including incomplete workouts',()=>{
 const a=lookupWorkoutHistory(records,{exercise:'squat'});
 assert.equal(a.totalActivities,45);assert.equal(a.records.length,20);assert.equal(a.completedSets,45);assert.equal(a.maxCompletedWeightLb,44);
 assert.equal(a.records[0].sets[0].band,'red');assert.equal(a.records[0].sets[0].time,0);
 const b=lookupWorkoutHistory(records,{offset:a.nextOffset});
 assert.equal(new Set([...a.records,...b.records].map(a=>a.id)).size,40);
});
test('inclusive date filters exclude deleted records and report empty matches',()=>{
 const a=lookupWorkoutHistory([...records,{...records[0],deleted_at:'now'}],{from:'2020-01-01',to:'2020-01-01'});
 assert.equal(a.totalActivities,2);assert.equal(lookupWorkoutHistory(records,{exercise:'bench'}).totalActivities,0);
 assert.ok(lookupWorkoutHistory(records,{from:'2026-02-01',to:'2020-01-01'}).error);
});
test('explicit all returns every match without trimming any sets or notes, including multiple exercises',()=>{
 const many=Array.from({length:1000},(_,i)=>({...records[i%45],id:String(i),name:i%3===0?'Running':i%2?'Bench Press':'Squat',notes:'n'.repeat(3000),sets:Array.from({length:110},()=>records[0].sets[0])}));
 const result=lookupWorkoutHistory(many,{all:true,exercises:['bench press','squat'],from:'2020-01-01',to:'2020-01-28'});
 assert.equal(result.complete,true);assert.equal(result.totalActivities,666);assert.equal(result.records.length,666);assert.equal(result.nextOffset,null);
 assert.equal(result.records[0].notes.length,3000);assert.equal(result.records[0].sets.length,110);
 assert.equal(lookupWorkoutHistory(many,{all:true}).records.length,1000);
});
