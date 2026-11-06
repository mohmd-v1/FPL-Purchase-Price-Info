// Bridge Script running in MAIN world (shares cookies, session and React state with FPL site)
(() => {
  // دالة استخراج بيانات الـ 15 لاعب مع نسب التقدم والتوقعات مباشرة من شجرة React في الصفحة
  function extractProposedElementsFromReact() {
    try {
      const allDoms = Array.from(document.querySelectorAll('main *, section *, [role="region"] *'));
      for (const el of allDoms) {
        for (const k in el) {
          if (k.startsWith('__reactFiber$')) {
            let f = el[k];
            let depth = 0;
            while (f && depth < 25) {
              if (f.memoizedProps && f.memoizedProps.proposedElements) {
                return f.memoizedProps.proposedElements;
              }
              f = f.return;
              depth++;
            }
          }
        }
      }
    } catch (e) {
      console.warn('Bridge React extraction error:', e);
    }
    return null;
  }

  window.addEventListener('message', async (event) => {
    // Only accept messages from the same page
    if (event.source !== window || !event.data || event.data.type !== 'FPL_REQUEST_MY_TEAM') {
      return;
    }

    try {
      console.log('🌉 Bridge: Fetching /api/me/ from main page context...');
      const meRes = await fetch('/api/me/');
      if (!meRes.ok) throw new Error('Failed to fetch /api/me/: ' + meRes.status);
      const meData = await meRes.json();

      const entryId = meData.player ? meData.player.entry : null;
      if (!entryId) {
        window.postMessage({
          type: 'FPL_RESPONSE_MY_TEAM',
          success: false,
          error: 'No player entry found'
        }, '*');
        return;
      }

      console.log('🌉 Bridge: Found Entry ID:', entryId, 'Fetching /api/my-team/' + entryId + '/');
      const teamRes = await fetch('/api/my-team/' + entryId + '/');
      if (!teamRes.ok) throw new Error('Failed to fetch /api/my-team/: ' + teamRes.status);
      const teamData = await teamRes.json();

      // استخراج الـ Projections ونسب التقدم من React State
      const proposedElements = extractProposedElementsFromReact();
      const predictionsMap = {};

      if (proposedElements) {
        Object.values(proposedElements).forEach(p => {
          if (p && p.id) {
            const currentProgress = p.price_change_percent;
            const proj = p.price_change_projections && p.price_change_projections[0];
            const predictedProgress = proj ? proj.projected_percent : null;
            
            predictionsMap[p.id] = {
              currentProgress,
              predictedProgress
            };
          }
        });
      }

      window.postMessage({
        type: 'FPL_RESPONSE_MY_TEAM',
        success: true,
        entryId,
        picks: teamData.picks,
        predictions: predictionsMap
      }, '*');

    } catch (err) {
      console.error('🌉 Bridge Error:', err);
      window.postMessage({
        type: 'FPL_RESPONSE_MY_TEAM',
        success: false,
        error: err.message
      }, '*');
    }
  });
})();
