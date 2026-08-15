export const VIEW_MODE=Object.freeze({OWNER:'OWNER',VISITOR:'VISITOR'});

export function getPublicId(pathname){
  const match=/^\/reel\/([a-zA-Z0-9_-]{8,128})\/?$/.exec(pathname||'');
  return match?.[1]||null;
}

export function resolveViewMode({pathname,loginUserId,ownerId,boardPublicId}){
  const publicId=getPublicId(pathname);
  if(!publicId)return VIEW_MODE.OWNER;
  return loginUserId&&loginUserId===ownerId&&publicId===boardPublicId?VIEW_MODE.OWNER:VIEW_MODE.VISITOR;
}

export function toPublicBoard(state,ranked){
  return Object.freeze({
    publicId:state.board.publicId,
    ownerNickname:state.owner.nickname,
    castCount:ranked.length,
    cast:ranked.map(c=>Object.freeze({
      id:c.id,
      nickname:c.nickname,
      influenceScore:c.rankScore,
      influenceRank:c.rank,
      imagePath:`/assets/pillars/${c.analysis.character.dayPillarIndex}-${c.gender==='MALE'?'male':'female'}.jpg`,
    })),
  });
}
