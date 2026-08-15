window.addEventListener('load',()=>{
  window.setTimeout(()=>{
    const ad=document.querySelector('.adsbygoogle');
    if(!ad)return;
    const script=document.createElement('script');
    script.async=true;
    script.crossOrigin='anonymous';
    script.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4262026322772164';
    script.onload=()=>{try{(window.adsbygoogle=window.adsbygoogle||[]).push({})}catch{}};
    document.head.append(script);
  },1200);
},{once:true});
