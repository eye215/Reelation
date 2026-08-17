import { supabase, getVerifiedUser } from './supabase-client.js?v=public-invite-103';

const app = document.querySelector('#app');
let syncing = false;

async function syncOwnerUpdates() {
  if (
    syncing ||
    !app ||
    (!['/board', '/cast'].includes(location.pathname) && !location.pathname.startsWith('/cast/')) ||
    document.querySelector('.server-cast-updates')
  ) return;

  syncing = true;

  try {
    const user = await getVerifiedUser();
    if (!user) return;

    const { data: board, error: boardError } = await supabase
      .from('casting_boards')
      .select('id')
      .eq('owner_user_id', user.id)
      .maybeSingle();

    if (boardError || !board) return;

    const [memberResult, jobResult, analysisResult] = await Promise.all([
      supabase
        .from('cast_members')
        .select('id,nickname,source_type,status,created_at,character_image_key')
        .eq('board_id', board.id)
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false }),
      supabase
        .from('analysis_jobs')
        .select('cast_member_id,status')
        .eq('board_id', board.id),
      supabase
        .from('relationship_analyses')
        .select('id,cast_member_id,scoring_version,overall_score,attraction_score,stability_score,impact_score,growth_score,longevity_score,cooperation_score,conflict_score,cast_tier,life_role,relationship_genre,confidence,feature_codes,status,updated_at')
        .eq('board_id', board.id)
        .order('updated_at', { ascending: false })
    ]);

    if (memberResult.error || jobResult.error || analysisResult.error) return;

    let localCast = [];
    try {
      localCast = JSON.parse(localStorage.getItem('reelation-state') || 'null')?.cast || [];
    } catch {
      localCast = [];
    }

    const freshMembers = (memberResult.data || []).filter(
      (member) => member.source_type === 'INVITE' && !localCast.some((local) => local.id === member.id)
    );

    const jobStatus = new Map(
      (jobResult.data || []).map((job) => [job.cast_member_id, job.status])
    );
    const latestAnalysis = new Map();
    for (const analysis of analysisResult.data || []) {
      if (!latestAnalysis.has(analysis.cast_member_id)) latestAnalysis.set(analysis.cast_member_id, analysis);
    }
    const analysisIds = [...latestAnalysis.values()].map((analysis) => analysis.id);
    const genreResult = analysisIds.length
      ? await supabase.from('genre_analyses').select('relationship_analysis_id,genre,score,role').in('relationship_analysis_id', analysisIds)
      : { data: [], error: null };
    const narrativeResult = analysisIds.length
      ? await supabase.from('narratives').select('relationship_analysis_id,prompt_version,model_version,headline,summary,role_reason,relationship_pattern,conflict_pattern,long_term_pattern,status,updated_at').in('relationship_analysis_id', analysisIds).order('updated_at', { ascending: false })
      : { data: [], error: null };
    if (genreResult.error || narrativeResult.error) return;
    const genresByAnalysis = new Map();
    for (const genre of genreResult.data || []) {
      const key = genre.relationship_analysis_id;
      if (!genresByAnalysis.has(key)) genresByAnalysis.set(key, {});
      genresByAnalysis.get(key)[String(genre.genre).toLowerCase()] = { score: genre.score, role: genre.role };
    }
    const narrativeByAnalysis = new Map();
    for (const narrative of narrativeResult.data || []) {
      if (!narrativeByAnalysis.has(narrative.relationship_analysis_id)) narrativeByAnalysis.set(narrative.relationship_analysis_id, narrative);
    }
    const localById = new Map(localCast.map((member) => [member.id, member]));
    const syncedMembers = (memberResult.data || []).flatMap((member) => {
      const analysis = latestAnalysis.get(member.id);
      if (!analysis || jobStatus.get(member.id) !== 'DONE') return [];
      const narrative = narrativeByAnalysis.get(analysis.id) || null;
      const imageMatch = String(member.character_image_key || '').match(/pillars\/(\d+)-(male|female)\.jpg$/);
      const dayPillarIndex = Number(imageMatch?.[1] || 0);
      const synced = {
        id: member.id,
        nickname: member.nickname,
        gender: imageMatch?.[2] === 'male' ? 'MALE' : 'FEMALE',
        sourceType: 'INVITE',
        createdAt: Date.parse(member.created_at) || Date.now(),
        analysis: {
          scores: {
            overall: analysis.overall_score, attraction: analysis.attraction_score, stability: analysis.stability_score,
            impact: analysis.impact_score, growth: analysis.growth_score, longevity: analysis.longevity_score,
            cooperation: analysis.cooperation_score, conflict: analysis.conflict_score,
          },
          categoryResults: genresByAnalysis.get(analysis.id) || {},
          castTier: analysis.cast_tier,
          lifeRole: analysis.life_role,
          relationshipGenre: analysis.relationship_genre,
          character: { dayPillarIndex, stemIndex: dayPillarIndex % 10, branchIndex: dayPillarIndex % 12 },
          confidence: analysis.confidence,
          featureCodes: analysis.feature_codes || [],
          scoringVersion: analysis.scoring_version,
          sajuEngineVersion: 'saju-v2-gregorian',
          narrative: narrative ? {
            promptVersion: narrative.prompt_version,
            modelVersion: narrative.model_version,
            headline: narrative.headline,
            summary: narrative.summary,
            roleReason: narrative.role_reason,
            relationshipPattern: narrative.relationship_pattern,
            conflictPattern: narrative.conflict_pattern,
            longTermPattern: narrative.long_term_pattern,
            status: narrative.status,
            updatedAt: narrative.updated_at,
          } : { status: 'PENDING' },
          status: 'DONE',
        },
      };
      const local = localById.get(member.id);
      const localNarrative = local?.analysis?.narrative;
      const nextNarrative = synced.analysis.narrative;
      const changed = !local || localNarrative?.status !== nextNarrative.status || localNarrative?.updatedAt !== nextNarrative.updatedAt;
      return changed ? [synced] : [];
    });
    if (syncedMembers.length) window.dispatchEvent(new CustomEvent('reelation-server-cast-synced', { detail: { members: syncedMembers } }));

    if (!freshMembers.length || location.pathname.startsWith('/cast/')) return;

    const section = document.createElement('section');
    section.className = 'server-cast-updates';
    section.innerHTML = `
      <div class="server-cast-updates__head">
        <span>● 새 참여자</span>
        <b>${freshMembers.length}명이 내 관계 보드에 들어왔어요.</b>
      </div>
      <div class="server-cast-updates__list">
        ${freshMembers.map((member) => `
          <article>
            <b>${escapeHtml(member.nickname)}</b>
            <span>${jobStatus.get(member.id) === 'DONE' ? '분석 완료' : '관계 분석 중'}</span>
          </article>
        `).join('')}
      </div>
    `;

    const target = document.querySelector('.movie-home-feed') || document.querySelector('main.page');
    target?.prepend(section);
  } finally {
    syncing = false;
  }
}

function escapeHtml(value) {
  const node = document.createElement('span');
  node.textContent = String(value ?? '');
  return node.innerHTML;
}

const observer = new MutationObserver(syncOwnerUpdates);
if (app) observer.observe(app, { childList: true, subtree: true });
syncOwnerUpdates();
