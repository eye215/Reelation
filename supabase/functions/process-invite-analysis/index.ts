import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { analyze, calculateSaju, RELATIONSHIP_CATEGORIES } from './engine.ts';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
});
const stems = ['갑','을','병','정','무','기','경','신','임','계'];
const branches = ['자','축','인','묘','진','사','오','미','신','유','술','해'];

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  if (req.headers.get('Authorization') !== `Bearer ${serviceKey}`) return json({ error: 'FORBIDDEN' }, 403);
  const { castMemberId } = await req.json().catch(() => ({}));
  if (!castMemberId) return json({ error: 'CAST_MEMBER_REQUIRED' }, 400);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey);
  const { data: job } = await admin.from('analysis_jobs').select('*').eq('cast_member_id', castMemberId).maybeSingle();
  if (!job) return json({ error: 'JOB_NOT_FOUND' }, 404);
  if (job.status === 'DONE') return json({ ok: true, status: 'DONE', cached: true });
  await admin.from('analysis_jobs').update({ status: 'PROCESSING', attempts: job.attempts + 1, updated_at: new Date().toISOString() }).eq('id', job.id);

  try {
    const { data: cast, error: castError } = await admin.from('cast_members').select('id,board_id,birth_profile_id,nickname').eq('id', castMemberId).single();
    if (castError) throw castError;
    const { data: board, error: boardError } = await admin.from('casting_boards').select('id,owner_user_id').eq('id', cast.board_id).single();
    if (boardError) throw boardError;
    const { data: owner, error: ownerError } = await admin.from('users').select('id,nickname,birth_profile_id').eq('id', board.owner_user_id).single();
    if (ownerError || !owner.birth_profile_id) throw new Error('OWNER_BIRTH_PROFILE_MISSING');
    const { data: births, error: birthError } = await admin.from('birth_profiles').select('*').in('id', [owner.birth_profile_id, cast.birth_profile_id]);
    if (birthError || births?.length !== 2) throw new Error('BIRTH_PROFILE_MISSING');
    const ownerBirth = births.find((x) => x.id === owner.birth_profile_id)!;
    const castBirth = births.find((x) => x.id === cast.birth_profile_id)!;
    const normalize = (birth: any, nickname: string) => ({ nickname, birthDate: birth.birth_date, birthTime: birth.birth_time_known ? birth.birth_time?.slice(0,5) : 'unknown', birthTimeKnown: birth.birth_time_known, calendarType: birth.calendar_type, gender: birth.gender });
    const ownerInput = normalize(ownerBirth, owner.nickname);
    const castInput = normalize(castBirth, cast.nickname);
    const ownerSaju = calculateSaju(ownerInput), castSaju = calculateSaju(castInput);
    const result = analyze(ownerInput, castInput);
    const characterImageKey = `pillars/${castSaju.dayPillarIndex}-${castInput.gender === 'MALE' ? 'male' : 'female'}.jpg`;
    const { error: imageKeyError } = await admin.from('cast_members').update({ character_image_key: characterImageKey }).eq('id', cast.id);
    if (imageKeyError) throw imageKeyError;
    const saveSaju = async (birthProfileId: string, saju: any) => {
      const { data, error } = await admin.from('saju_profiles').upsert({
        birth_profile_id: birthProfileId, engine_version: saju.engineVersion,
        year_stem: null, year_branch: null, month_stem: null, month_branch: null,
        day_stem: stems[saju.dayStemIndex], day_branch: branches[saju.dayBranchIndex],
        hour_stem: null, hour_branch: null, calculation_scope: 'DAY_PILLAR_MVP', structured_data: saju,
      }, { onConflict: 'birth_profile_id,engine_version' }).select('id').single();
      if (error) throw error; return data.id;
    };
    const [ownerSajuId, castSajuId] = await Promise.all([saveSaju(owner.birth_profile_id, ownerSaju), saveSaju(cast.birth_profile_id, castSaju)]);
    const s = result.scores;
    const { data: analysis, error: analysisError } = await admin.from('relationship_analyses').upsert({
      board_id: board.id, cast_member_id: cast.id, owner_saju_profile_id: ownerSajuId, cast_saju_profile_id: castSajuId,
      scoring_version: result.scoringVersion, overall_score: s.overall, attraction_score: s.attraction, stability_score: s.stability,
      impact_score: s.impact, growth_score: s.growth, longevity_score: s.longevity, cooperation_score: s.cooperation, conflict_score: s.conflict,
      global_role: result.lifeRole, cast_tier: result.castTier, life_role: result.lifeRole, relationship_genre: result.relationshipGenre,
      confidence: result.confidence, feature_codes: result.featureCodes, status: 'NARRATIVE_PENDING', updated_at: new Date().toISOString(),
    }, { onConflict: 'board_id,cast_member_id,scoring_version' }).select('id').single();
    if (analysisError) throw analysisError;
    for (const genre of RELATIONSHIP_CATEGORIES) {
      const category = result.categoryResults[genre];
      const { error } = await admin.from('genre_analyses').upsert({ relationship_analysis_id: analysis.id, genre: genre.toUpperCase(), score: category.score, role: category.role }, { onConflict: 'relationship_analysis_id,genre' });
      if (error) throw error;
    }
    const { error: rankingError } = await admin.rpc('recalculate_board_rankings', { p_board_id: board.id });
    if (rankingError) throw rankingError;
    await admin.from('analysis_jobs').update({ status: 'DONE', last_error: null, updated_at: new Date().toISOString() }).eq('id', job.id);
    return json({ ok: true, analysisId: analysis.id, status: 'DONE', calculationScope: 'DAY_PILLAR_MVP' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ANALYSIS_FAILED';
    await admin.from('analysis_jobs').update({ status: 'FAILED', last_error: message.slice(0, 500), updated_at: new Date().toISOString() }).eq('id', job.id);
    return json({ error: 'ANALYSIS_FAILED', detail: message }, 500);
  }
});
