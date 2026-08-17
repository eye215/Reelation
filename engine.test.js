import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyze, calculateScores, calculateGenreScores, determineGlobalRole,
  determineRelationshipGenre, classifyCastTier, ranks, CAST_TIERS, LIFE_ROLES,
  RELATIONSHIP_GENRES, RELATIONSHIP_CATEGORIES, calculateSaju,
} from './engine.js';

const owner={birthDate:'1996-08-15',birthTime:'10:30',gender:'FEMALE',calendarType:'SOLAR'};
const cast={birthDate:'1995-11-02',birthTime:'unknown',gender:'MALE',calendarType:'SOLAR'};
const f=(dm,code)=>({dayMasterRelation:dm,interactions:[{code,weight:1.3}],featureCodes:[code]});

test('same input -> same result',()=>assert.deepEqual(analyze(owner,cast),analyze(owner,cast)));
test('all scores are 0..100',()=>{const a=analyze(owner,cast);Object.values(a.scores).forEach(n=>assert.ok(n>=0&&n<=100));Object.values(a.categoryResults).forEach(x=>assert.ok(x.score>=0&&x.score<=100))});
test('unknown birth time remains calculable',()=>assert.equal(analyze(owner,cast).confidence,'STANDARD'));
test('harmony and clash modifiers differ correctly',()=>{const h=calculateScores(f('NEUTRAL','SIX_HARMONY')),c=calculateScores(f('NEUTRAL','CLASH'));assert.ok(h.stability>c.stability);assert.ok(c.conflict>h.conflict);assert.ok(c.impact>h.impact)});
test('attraction high and conflict high can coexist',()=>{const x={dayMasterRelation:'CONTROLLED_BY_OTHER',interactions:Array(5).fill({code:'CLASH',weight:1.3}),featureCodes:[]},s=calculateScores(x);assert.ok(s.attraction>=75);assert.ok(s.conflict>=75);assert.ok(s.overall>0)});
test('category formula preserves raw floats',()=>{const s={attraction:80.5,stability:70.2,longevity:60.1,impact:90.4,growth:75.8,cooperation:66.6,conflict:50,overall:0},g=calculateGenreScores(s);assert.equal(g.romance.score,s.attraction*.35+s.stability*.2+s.longevity*.2+s.impact*.15+s.growth*.1)});
test('life role eligibility excludes romantic roles',()=>{const s={attraction:90,stability:65,impact:90,growth:75,longevity:70,cooperation:55,conflict:85,overall:70},r=determineGlobalRole(s);assert.ok(LIFE_ROLES.includes(r));assert.notEqual(r,'ROMANCE_LEAD');assert.notEqual(r,'DANGEROUS_SECOND_LEAD')});
test('ranking uses raw float then displays rounded integer',()=>{const make=(id,n,t)=>({id,createdAt:t,analysis:{scores:{overall:n},categoryResults:{}}}),r=ranks([make('b',88.21,1),make('a',88.44,2)],'overall');assert.deepEqual(r.map(x=>x.id),['a','b']);assert.deepEqual(r.map(x=>x.rankScore),[88,88])});
test('classification types stay distinct',()=>{assert.deepEqual(CAST_TIERS,['MAIN','SUPPORTING','FEATURED','CAMEO']);assert.equal(RELATIONSHIP_CATEGORIES.length,4);assert.equal(RELATIONSHIP_GENRES.length,9);assert.equal(new Set([...CAST_TIERS,...LIFE_ROLES,...RELATIONSHIP_GENRES,...RELATIONSHIP_CATEGORIES]).size,CAST_TIERS.length+LIFE_ROLES.length+RELATIONSHIP_GENRES.length+RELATIONSHIP_CATEGORIES.length)});
test('cameo is a high-impact low-longevity pattern, not the bottom rank',()=>{const s={overall:82,impact:95,longevity:34,attraction:80,stability:45,growth:70,cooperation:50,conflict:65};assert.equal(classifyCastTier(s,1,10),'CAMEO')});
test('relationship genre is independent from category',()=>{const s={overall:80,impact:88,longevity:55,attraction:84,stability:48,growth:65,cooperation:50,conflict:82};assert.equal(determineRelationshipGenre(s),'PSYCHOLOGICAL_THRILLER')});
test('saju profile exposes a deterministic 60-day-pillar character key',()=>{const a=calculateSaju(cast),b=calculateSaju(cast);assert.equal(a.dayPillarIndex,b.dayPillarIndex);assert.ok(a.dayPillarIndex>=0&&a.dayPillarIndex<60);assert.equal(a.dayStemIndex,a.dayPillarIndex%10);assert.equal(a.dayBranchIndex,a.dayPillarIndex%12)});
test('known Gregorian dates map to canonical sexagenary days',()=>{assert.equal(calculateSaju({...cast,birthDate:'2000-01-07'}).dayPillarIndex,0);assert.equal(calculateSaju({...cast,birthDate:'2024-02-10'}).dayPillarIndex,40);assert.equal(calculateSaju({...cast,birthDate:'2000-01-15'}).dayPillarIndex,8)});
test('lunar input is converted before saju calculation',()=>{
  const lunar=calculateSaju({...cast,birthDate:'2024-01-01',calendarType:'LUNAR'});
  const solar=calculateSaju({...cast,birthDate:'2024-02-10',calendarType:'SOLAR'});
  assert.equal(lunar.dayPillarIndex,solar.dayPillarIndex);
  assert.equal(lunar.fingerprint,solar.fingerprint);
});
