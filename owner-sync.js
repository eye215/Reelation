import { supabase, getVerifiedUser } from './supabase-client.js?v=auth-32';

const app = document.querySelector('#app');
let syncing = false;

async function syncOwnerUpdates() {
  if (
    syncing ||
    !app ||
    !['/board', '/cast'].includes(location.pathname) ||
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

    const [memberResult, jobResult] = await Promise.all([
      supabase
        .from('cast_members')
        .select('id,nickname,source_type,status,created_at')
        .eq('board_id', board.id)
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false }),
      supabase
        .from('analysis_jobs')
        .select('cast_member_id,status')
        .eq('board_id', board.id)
    ]);

    if (memberResult.error || jobResult.error) return;

    let localCast = [];
    try {
      localCast = JSON.parse(localStorage.getItem('reelation-state') || 'null')?.cast || [];
    } catch {
      localCast = [];
    }

    const localIds = new Set(localCast.map((member) => member.id));
    const freshMembers = (memberResult.data || []).filter(
      (member) => member.source_type === 'INVITE' && !localIds.has(member.id)
    );

    if (!freshMembers.length) return;

    const jobStatus = new Map(
      (jobResult.data || []).map((job) => [job.cast_member_id, job.status])
    );
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
