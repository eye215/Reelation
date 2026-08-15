import test from 'node:test';
import assert from 'node:assert/strict';
import {VIEW_MODE,getPublicId,resolveViewMode,toPublicBoard} from './view-mode.js';

test('public reel route parses only bounded opaque ids',()=>{assert.equal(getPublicId('/reel/abcDEF_123'),'abcDEF_123');assert.equal(getPublicId('/reel/../../board'),null)});
test('same public URL resolves owner only for matching authenticated owner',()=>{const base={pathname:'/reel/public_123',ownerId:'owner-1',boardPublicId:'public_123'};assert.equal(resolveViewMode({...base,loginUserId:'owner-1'}),VIEW_MODE.OWNER);assert.equal(resolveViewMode({...base,loginUserId:'friend-1'}),VIEW_MODE.VISITOR);assert.equal(resolveViewMode({...base,loginUserId:null}),VIEW_MODE.VISITOR)});
test('public projection excludes private analysis and birth fields',()=>{const state={board:{publicId:'public_123'},owner:{nickname:'유리'}},ranked=[{id:'c1',nickname:'민재',gender:'MALE',rank:1,rankScore:91,birthDate:'1990-01-01',analysis:{character:{dayPillarIndex:8},scores:{impact:99},lifeRole:'RIVAL'}}],p=toPublicBoard(state,ranked),row=p.cast[0];assert.deepEqual(Object.keys(row),['id','nickname','influenceScore','influenceRank','imagePath']);assert.equal(JSON.stringify(p).includes('birthDate'),false);assert.equal(JSON.stringify(p).includes('lifeRole'),false)});
